// Provenance-aware authority check for the bridge-finish protected bytes.
//
// The historical pins in m01-bridge-finish-v2-authority.mjs (8a0c362, bc8f6a2) are untouched. After they were written,
// other approved work was merged to main and legitimately changed some of the protected paths. This module accepts a
// protected path only when
//   (a) its bytes equal the pinned bytes, OR
//   (b) its bytes equal the approved bytes of an explicit ledger entry (m01-bridge-authority-provenance.json) whose
//       pinned hash matches the real pin, whose approving commit(s) are ancestors of the PR base and whose tree at that
//       commit really holds the approved bytes (or lacks the path, for a recorded deletion).
// Anything else (byte change without ledger entry, ledger entry with a wrong hash, an approving commit that is not an
// ancestor, a missing file that is not a recorded deletion) fails. In PR mode (--pr-base) every protected path must
// additionally be byte-identical to the PR base, so the pull request itself can never alter a protected path.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

export const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
export const DEFAULT_LEDGER='tools/verification/m01-bridge-authority-provenance.json';
export const IMPOSTOR_MANIFEST='assets/models/provisional/m01/m01-bridges/impostors/manifest.json';
const SHA1=/^[0-9a-f]{40}$/,SHA256=/^[0-9a-f]{64}$/;
const git=(cwd,args)=>execFileSync('git',args,{cwd,maxBuffer:256*1048576,stdio:['ignore','pipe','pipe']});

export function resolveCommit(cwd,rev){
  const out=git(cwd,['rev-parse','--verify','--quiet',`${rev}^{commit}`]).toString().trim();
  assert.match(out,SHA1,`Cannot resolve commit ${rev}`);
  return out;
}
// Bytes of a path in a commit, or null when the path does not exist there. An unknown commit throws.
export function bytesAt(cwd,rev,p){
  const listed=git(cwd,['ls-tree','-r','--name-only',rev,'--',p]).toString().split('\n').filter(Boolean);
  if(!listed.includes(p))return null;
  return git(cwd,['show',`${rev}:${p}`]);
}
export function isAncestor(cwd,ancestor,descendant){
  try{git(cwd,['merge-base','--is-ancestor',ancestor,descendant]);return true;}
  catch(error){if(error.status===1)return false;throw error;}
}
function bytesOnDisk(cwd,p){
  try{return fs.readFileSync(path.join(cwd,p));}
  catch(error){if(error.code==='ENOENT')return null;throw error;}
}
const hashOrNull=b=>b===null?null:sha256(b);
const label=h=>h===null?'<absent>':h.slice(0,12);

// Impostor manifest: every field except `author` must equal the other side; `author` must be a non-empty string on the
// current side and, when present on the reference side, also a non-empty string (the bc8f6a2 pin predates the field).
export function checkAuthorOnlyManifest(cwd,reference,p=IMPOSTOR_MANIFEST,failures=[]){
  const parse=(b,where)=>{
    if(b===null){failures.push(`Impostor manifest missing ${where}: ${p}`);return null;}
    try{return JSON.parse(b);}catch(error){failures.push(`Impostor manifest not valid JSON ${where}: ${error.message}`);return null;}
  };
  const after=parse(bytesOnDisk(cwd,p),'in the working tree'),before=parse(bytesAt(cwd,reference.rev,p),`at ${reference.name}`);
  if(!after||!before)return failures;
  if(!(typeof after.author==='string'&&after.author.trim().length>0))failures.push(`Impostor manifest author must be a non-empty string in the working tree`);
  if('author' in before&&!(typeof before.author==='string'&&before.author.trim().length>0))failures.push(`Impostor manifest author must be a non-empty string at ${reference.name}`);
  const a={...after},b={...before};delete a.author;delete b.author;
  try{assert.deepEqual(a,b);}catch{failures.push(`Impostor manifest changed beyond the author field versus ${reference.name}: ${p}`);}
  return failures;
}

export function validateLedgerShape(ledger){
  assert.ok(ledger&&typeof ledger==='object','Ledger must be an object');
  assert.equal(ledger.schema,1,'Unsupported ledger schema');
  assert.ok(ledger.pins&&typeof ledger.pins==='object','Ledger needs pins');
  assert.ok(Array.isArray(ledger.entries),'Ledger needs entries[]');
  for(const e of ledger.entries){
    const where=`ledger entry ${e&&e.mode}:${e&&e.path}`;
    assert.ok(['historical','currentAuthority'].includes(e.mode),`${where}: bad mode`);
    assert.ok(typeof e.path==='string'&&e.path.length>0,`${where}: bad path`);
    assert.match(e.pinnedSha256??'',SHA256,`${where}: pinnedSha256 must be a sha256 (the pin has the file)`);
    assert.ok(e.approvedSha256===null||SHA256.test(e.approvedSha256),`${where}: approvedSha256 must be sha256 or null (recorded deletion)`);
    assert.notEqual(e.approvedSha256,e.pinnedSha256,`${where}: approved equals pinned, no ledger entry needed`);
    assert.ok(Array.isArray(e.approvingCommits)&&e.approvingCommits.length>0&&e.approvingCommits.every(c=>SHA1.test(c)),`${where}: approvingCommits must be full commit SHAs`);
    assert.ok(typeof e.reason==='string'&&e.reason.trim().length>=10,`${where}: reason required`);
  }
}

export function verifyProvenance({cwd=process.cwd(),mode,pin,protectedPaths,ledger,prBase=null,ledgerBase='HEAD',checkManifest=false}){
  assert.ok(['historical','currentAuthority'].includes(mode),'bad mode');
  validateLedgerShape(ledger);
  const pinSha=resolveCommit(cwd,pin),baseSha=resolveCommit(cwd,ledgerBase),prSha=prBase===null?null:resolveCommit(cwd,prBase);
  const failures=[],ancestorCache=new Map();
  assert.equal(ledger.pins[mode],pinSha,`Ledger pin for ${mode} (${ledger.pins[mode]}) differs from the script pin ${pinSha}`);
  const ancestorOfBase=c=>{if(!ancestorCache.has(c)){let ok=false;try{ok=isAncestor(cwd,c,baseSha);}catch{ok=false;}ancestorCache.set(c,ok);}return ancestorCache.get(c);};
  const entries=new Map(),protectedSet=new Set(protectedPaths);
  for(const e of ledger.entries.filter(x=>x.mode===mode)){
    if(entries.has(e.path))failures.push(`Duplicate ledger entry: ${e.path}`);
    if(!protectedSet.has(e.path))failures.push(`Ledger entry for a path that is not protected in ${mode} mode: ${e.path}`);
    entries.set(e.path,e);
  }
  // The manifest is checked by its author-only rule, not by exact bytes.
  const exact=checkManifest?protectedPaths.filter(p=>p!==IMPOSTOR_MANIFEST):protectedPaths;
  const stats={mode,pin:pinSha,ledgerBase:baseSha,prBase:prSha,protected:exact.length,viaPin:0,viaLedger:0,viaRecordedDeletion:0,prBaseIdentical:0};
  for(const p of exact){
    const pinned=bytesAt(cwd,pinSha,p);
    if(pinned===null){failures.push(`Protected path does not exist in the pin: ${p}`);continue;}
    const current=bytesOnDisk(cwd,p),pinnedHash=sha256(pinned),currentHash=hashOrNull(current);
    if(currentHash===pinnedHash)stats.viaPin++;
    else{
      const e=entries.get(p);
      if(!e)failures.push(current===null?`Protected path missing and not a recorded deletion: ${p}`:`Protected original changed without a ledger entry: ${p}`);
      else if(e.pinnedSha256!==pinnedHash)failures.push(`Ledger pinnedSha256 does not match the pin for ${p} (ledger ${label(e.pinnedSha256)}, pin ${label(pinnedHash)})`);
      else if(e.approvedSha256!==currentHash)failures.push(`Ledger approvedSha256 mismatch for ${p} (ledger ${label(e.approvedSha256)}, working tree ${label(currentHash)})`);
      else{
        let good=true;
        for(const c of e.approvingCommits){
          if(!ancestorOfBase(c)){failures.push(`Approving commit ${c.slice(0,12)} for ${p} is not an ancestor of ${prSha?'the PR base':'HEAD'} ${baseSha.slice(0,12)}`);good=false;continue;}
          const atCommit=hashOrNull(bytesAt(cwd,c,p));
          if(atCommit!==e.approvedSha256){failures.push(`Approving commit ${c.slice(0,12)} does not hold the approved bytes of ${p} (has ${label(atCommit)})`);good=false;}
        }
        if(good){if(current===null)stats.viaRecordedDeletion++;else stats.viaLedger++;}
      }
    }
    if(prSha!==null){
      if(hashOrNull(bytesAt(cwd,prSha,p))!==currentHash)failures.push(`PR changes a protected path versus the PR base ${prSha.slice(0,12)}: ${p}`);
      else stats.prBaseIdentical++;
    }
  }
  if(checkManifest){
    checkAuthorOnlyManifest(cwd,{rev:pinSha,name:`pin ${pinSha.slice(0,12)}`},IMPOSTOR_MANIFEST,failures);
    if(prSha!==null)checkAuthorOnlyManifest(cwd,{rev:prSha,name:`PR base ${prSha.slice(0,12)}`},IMPOSTOR_MANIFEST,failures);
  }
  assert.equal(failures.length,0,`Bridge authority provenance FAILED (${failures.length}):\n - ${failures.join('\n - ')}`);
  return stats;
}

const option=(argv,name)=>{const i=argv.indexOf(name);if(i<0)return null;assert.ok(i+1<argv.length&&!argv[i+1].startsWith('--'),`${name} needs a value`);return argv[i+1];};
export function runProvenanceCli({argv,mode,pin,protectedPaths,cwd=process.cwd()}){
  const ledgerPath=option(argv,'--ledger')??DEFAULT_LEDGER,prBase=option(argv,'--pr-base'),ledger=JSON.parse(fs.readFileSync(path.join(cwd,ledgerPath),'utf8'));
  const stats=verifyProvenance({cwd,mode,pin,protectedPaths,ledger,prBase,ledgerBase:option(argv,'--ledger-base')??'HEAD',checkManifest:mode==='currentAuthority'});
  console.log(`PASS provenance ${mode}: ${stats.protected} protected paths; ${stats.viaPin} equal the pin ${stats.pin.slice(0,12)}, ${stats.viaLedger} equal ledger-approved bytes, ${stats.viaRecordedDeletion} recorded deletions; ${stats.prBase?`all byte-identical to PR base ${stats.prBase.slice(0,12)} (${stats.prBaseIdentical})`:'no PR base given (local audit)'}`);
  return stats;
}
