import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyProvenance,sha256,IMPOSTOR_MANIFEST,validateLedgerShape} from '../tools/verification/m01-bridge-authority-provenance.mjs';

// The authority-with-provenance check is tested on temporary git repositories; the real tree is only read.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const AUTHORITY='tools/verification/m01-bridge-finish-v2-authority.mjs';
const A='assets/a.bin',B='assets/b.bin',C='assets/c.bin';
const dirs=[];
test.after(()=>{for(const d of dirs)fs.rmSync(d,{recursive:true,force:true});});

const git=(cwd,...args)=>execFileSync('git',['-c','user.name=t','-c','user.email=t@example.invalid','-c','commit.gpgsign=false',...args],{cwd,encoding:'utf8'}).trim();
const write=(cwd,p,content)=>{fs.mkdirSync(path.dirname(path.join(cwd,p)),{recursive:true});fs.writeFileSync(path.join(cwd,p),content);};
const commit=(cwd,message)=>{git(cwd,'add','-A');git(cwd,'commit','-q','-m',message);return git(cwd,'rev-parse','HEAD');};
const manifest=extra=>JSON.stringify({version:1,parts:[1,2],...extra},null,1);

// pin: a, b, c, manifest(no author).  main: b changed, c deleted, manifest gains author.
function fixture(){
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'m01-authority-'));dirs.push(cwd);
  git(cwd,'init','-q','-b','main');
  write(cwd,A,'alpha-v1');write(cwd,B,'beta-v1');write(cwd,C,'gamma-v1');write(cwd,IMPOSTOR_MANIFEST,manifest({}));
  const pin=commit(cwd,'pin');
  write(cwd,B,'beta-v2');fs.rmSync(path.join(cwd,C));write(cwd,IMPOSTOR_MANIFEST,manifest({author:'COD-guerra project'}));
  const main=commit(cwd,'approved main change');
  const protectedPaths=[A,B,C,IMPOSTOR_MANIFEST];
  const ledger={schema:1,pins:{currentAuthority:pin,historical:pin},entries:[
    {mode:'currentAuthority',path:B,pinnedSha256:sha256('beta-v1'),approvedSha256:sha256('beta-v2'),approvingCommits:[main],reason:'Approved test change of b on main'},
    {mode:'currentAuthority',path:C,pinnedSha256:sha256('gamma-v1'),approvedSha256:null,approvingCommits:[main],reason:'Approved test deletion of c on main'}
  ]};
  const run=(over={})=>verifyProvenance({cwd,mode:'currentAuthority',pin,protectedPaths,ledger,ledgerBase:'HEAD',checkManifest:true,...over});
  return {cwd,pin,main,protectedPaths,ledger,run};
}
const reject=(fn,pattern)=>assert.throws(fn,error=>{assert.match(error.message,pattern);return true;});

test('positive: bytes equal to the pin or to ledger-approved bytes, recorded deletion, author-only manifest',()=>{
  const f=fixture();
  const stats=f.run();
  assert.equal(stats.viaPin,1);assert.equal(stats.viaLedger,1);assert.equal(stats.viaRecordedDeletion,1);assert.equal(stats.protected,3);
});

test('positive: PR mode passes when the protected paths are byte-identical to the PR base and the PR changes only other files',()=>{
  const f=fixture();
  write(f.cwd,'src/other.js','unprotected');commit(f.cwd,'pr work on an unprotected file');
  assert.equal(f.run({prBase:f.main}).prBaseIdentical,3);
});

test('positive: author-only impostor manifest change versus the PR base passes',()=>{
  const f=fixture();
  write(f.cwd,IMPOSTOR_MANIFEST,manifest({author:'Another non-empty author'}));commit(f.cwd,'pr changes author only');
  f.run({prBase:f.main});
});

test('negative: a byte change to a protected asset is rejected',()=>{
  const f=fixture();
  write(f.cwd,A,'alpha-tampered');
  reject(()=>f.run(),/Protected original changed without a ledger entry: assets\/a\.bin/);
});

test('negative: a ledger entry whose approving commit is not an ancestor of the base is rejected',()=>{
  const f=fixture();
  git(f.cwd,'switch','-q','-c','side',f.pin);write(f.cwd,B,'beta-v2');const side=commit(f.cwd,'side branch holds the same bytes');git(f.cwd,'switch','-q','main');
  f.ledger.entries[0].approvingCommits=[side];
  reject(()=>f.run(),/Approving commit [0-9a-f]{12} for assets\/b\.bin is not an ancestor/);
});

test('negative: a ledger approved hash that does not match the working tree is rejected',()=>{
  const f=fixture();
  f.ledger.entries[0].approvedSha256=sha256('beta-something-else');
  reject(()=>f.run(),/Ledger approvedSha256 mismatch for assets\/b\.bin/);
});

test('negative: a ledger pinned hash that does not match the real pin is rejected',()=>{
  const f=fixture();
  f.ledger.entries[0].pinnedSha256=sha256('not-the-pin');
  reject(()=>f.run(),/Ledger pinnedSha256 does not match the pin for assets\/b\.bin/);
});

test('negative: an approving commit that does not hold the approved bytes is rejected',()=>{
  const f=fixture();
  f.ledger.entries[0].approvingCommits=[f.pin];
  reject(()=>f.run(),/does not hold the approved bytes of assets\/b\.bin/);
});

test('negative: a ledger for a different pin is rejected',()=>{
  const f=fixture();
  f.ledger.pins.currentAuthority=f.main;
  reject(()=>f.run(),/Ledger pin for currentAuthority/);
});

test('negative: a missing protected file that is not a recorded deletion is rejected',()=>{
  const f=fixture();
  fs.rmSync(path.join(f.cwd,A));
  reject(()=>f.run(),/Protected path missing and not a recorded deletion: assets\/a\.bin/);
});

test('negative: a recorded deletion is not accepted while the file still holds other bytes',()=>{
  const f=fixture();
  write(f.cwd,C,'gamma-resurrected');
  reject(()=>f.run(),/Ledger approvedSha256 mismatch for assets\/c\.bin/);
});

test('negative: a ledger entry for a path that is not protected is rejected',()=>{
  const f=fixture();
  f.ledger.entries.push({mode:'currentAuthority',path:'assets/unprotected.bin',pinnedSha256:sha256('x'),approvedSha256:sha256('y'),approvingCommits:[f.main],reason:'entry outside the protected set'});
  reject(()=>f.run(),/not protected in currentAuthority mode: assets\/unprotected\.bin/);
});

test('negative: impostor manifest change in a non-author field is rejected',()=>{
  const f=fixture();
  write(f.cwd,IMPOSTOR_MANIFEST,manifest({author:'COD-guerra project',parts:[1,2,3]}));
  reject(()=>f.run(),/Impostor manifest changed beyond the author field versus pin/);
});

test('negative: impostor manifest with an empty or missing author is rejected',()=>{
  const f=fixture();
  write(f.cwd,IMPOSTOR_MANIFEST,manifest({author:''}));
  reject(()=>f.run(),/author must be a non-empty string in the working tree/);
  write(f.cwd,IMPOSTOR_MANIFEST,manifest({}));
  reject(()=>f.run(),/author must be a non-empty string in the working tree/);
});

test('negative: a PR that modifies a protected path versus the PR base is rejected even when the pin accepts those bytes',()=>{
  const f=fixture();
  // The reverted bytes equal the pin, so the pin rule alone would pass; only the PR base rule catches it.
  write(f.cwd,B,'beta-v1');commit(f.cwd,'pr reverts b to the pinned bytes');
  f.run();
  reject(()=>f.run({prBase:f.main}),/PR changes a protected path versus the PR base [0-9a-f]{12}: assets\/b\.bin/);
});

test('negative: a PR that deletes a protected path that exists at the PR base is rejected',()=>{
  const f=fixture();
  fs.rmSync(path.join(f.cwd,A));commit(f.cwd,'pr deletes a');
  reject(()=>f.run({prBase:f.main}),/Protected path missing and not a recorded deletion: assets\/a\.bin/);
});

test('negative: a PR that adds back a recorded-deleted path is rejected versus the PR base',()=>{
  const f=fixture();
  write(f.cwd,C,'gamma-v1');commit(f.cwd,'pr restores the pinned bytes of c');
  f.run();
  reject(()=>f.run({prBase:f.main}),/PR changes a protected path versus the PR base [0-9a-f]{12}: assets\/c\.bin/);
});

test('ledger shape: approved equal to pinned, missing reason or abbreviated commits are rejected',()=>{
  const f=fixture();
  const bad=patch=>({...f.ledger,entries:[{...f.ledger.entries[0],...patch}]});
  assert.throws(()=>validateLedgerShape(bad({approvedSha256:f.ledger.entries[0].pinnedSha256})),/approved equals pinned/);
  assert.throws(()=>validateLedgerShape(bad({reason:''})),/reason required/);
  assert.throws(()=>validateLedgerShape(bad({approvingCommits:[f.main.slice(0,7)]})),/full commit SHAs/);
});

// The real tree: read-only runs of the CLI against the real HEAD.
const cli=(...args)=>execFileSync(process.execPath,[AUTHORITY,...args],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
test('real tree: HEAD passes the bc8f6a2 protected set through the reviewed ledger',()=>{
  assert.match(cli('--provenance','--current-authority'),/PASS provenance currentAuthority: \d+ protected paths;.*ledger-approved bytes/);
});
test('real tree: every real ledger entry has a full-SHA approving commit that is an ancestor of HEAD',()=>{
  const ledger=JSON.parse(fs.readFileSync(path.join(root,'tools/verification/m01-bridge-authority-provenance.json'),'utf8'));
  validateLedgerShape(ledger);
  assert.ok(ledger.entries.length>0);
  for(const e of ledger.entries)for(const c of e.approvingCommits)execFileSync('git',['merge-base','--is-ancestor',c,'HEAD'],{cwd:root});
});
test('real tree: --pr-base, --ledger and --ledger-base are refused without --provenance',()=>{
  assert.throws(()=>cli('--current-authority','--pr-base','HEAD'),/only valid together with --provenance/);
});
test('real tree: the real working tree is rejected by --pr-base against the pin itself (the PR must equal its base)',()=>{
  // The pin bc8f6a2 differs from HEAD in ledger-approved paths, so using it as the "PR base" must fail.
  assert.throws(()=>cli('--provenance','--current-authority','--pr-base','bc8f6a21a57ccd926d4e0655481908d90d6b1978'),/PR changes a protected path versus the PR base/);
});
