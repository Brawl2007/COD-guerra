// Test-only module customization hook (node:module register, see m01-safex-child.mjs). It serves missions/m01-tczew/mission.json with grp_de_spans.deckAssault.safeX replaced by `data.safeX`, so that a
// child process loads the WHOLE game (the deck plan, the simulation and its validators) under another safeX, in memory: the file on disk is never written. Package 2 critical review, 2026-11-04: safeX
// shapes the node indices that a saved deck record holds (`lim`, `node`), so a save made under one safeX has to load under any other.
let safeX=null;
export function initialize(data){safeX=data?.safeX??null;}
export async function load(url,context,nextLoad){
  const result=await nextLoad(url,context);
  if(safeX===null||!url.endsWith('/missions/m01-tczew/mission.json'))return result;
  const mission=JSON.parse(Buffer.from(result.source).toString('utf8'));
  const g=mission.groups.find(x=>x.id==='grp_de_spans');
  g.deckAssault.safeX=safeX;
  return {...result,source:JSON.stringify(mission)};
}
