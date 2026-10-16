// Prints a DRAFT of the provenance ledger entries for the drift between the authority pins and a main-based commit.
// Never run in CI: the output must be reviewed by a human (reason text, one approving commit per entry) before it is
// committed as m01-bridge-authority-provenance.json. Usage: node m01-bridge-authority-ledger-draft.mjs <main-commit> > draft.json
import {execFileSync} from 'node:child_process';
import {sha256,bytesAt,resolveCommit} from './m01-bridge-authority-provenance.mjs';
const cwd=process.cwd(),git=(...a)=>execFileSync('git',a,{cwd,encoding:'utf8',maxBuffer:256*1048576}).trim();
const target=resolveCommit(cwd,process.argv[2]??'HEAD'),pins={},entries=[];
for(const [mode,flag] of [['historical',[]],['currentAuthority',['--current-authority']]]){
  const {pin,protectedPaths}=JSON.parse(execFileSync(process.execPath,['tools/verification/m01-bridge-finish-v2-authority.mjs','--list-protected',...flag],{cwd,encoding:'utf8'}));
  pins[mode]=pin;
  for(const p of protectedPaths){
    const pinned=bytesAt(cwd,pin,p),approved=bytesAt(cwd,target,p),ph=sha256(pinned),ah=approved===null?null:sha256(approved);
    if(ph===ah)continue;
    // Introducing commit: the earliest commit (topological) in the history of the target that holds the approved state
    // of the path; for a deletion, the earliest commit containing the pin that no longer has the path.
    const candidates=git('rev-list','--full-history','--topo-order','--reverse',target,'--',p).split('\n').filter(Boolean);
    let commit=null;
    for(const c of candidates){
      const here=bytesAt(cwd,c,p),hh=here===null?null:sha256(here);
      if(hh!==ah)continue;
      if(ah===null){try{git('merge-base','--is-ancestor',pin,c);}catch{continue;}}
      commit=c;break;
    }
    if(!commit){commit=git('rev-list','--topo-order','--reverse',`${pin}..${target}`).split('\n').find(c=>{const b=bytesAt(cwd,c,p);return (b===null?null:sha256(b))===ah;});}
    const subject=commit?git('show','-s','--format=%s',commit):'UNKNOWN';
    entries.push({mode,path:p,pinnedSha256:ph,approvedSha256:ah,approvingCommits:[commit],reason:`DRAFT: ${ah===null?'deleted':'changed'} on main by ${commit?.slice(0,7)} "${subject}"`});
  }
}
console.log(JSON.stringify({schema:1,pins,approvedAt:target,entries},null,1));
