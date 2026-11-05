// R4 INC-1 (switch on only): which stored checkpoint "Continuar" opens. Pure, no storage access; game.js does the reads and writes.
// Rule: a valid act envelope (acts key) wins; an absent one means the schema 2 save; an invalid one falls back to the schema 2 save
// and is reported in `rejected` so the caller can keep it under the rejected key. New game moves the acts key to the backup key at once (see game.js).
export const ACT_SAVE_BACKUP_SUFFIX=':backup';
// The refused envelope has its own key: the backup key is rewritten by every new game, which would delete the refused copy.
export const ACT_SAVE_REJECTED_SUFFIX=':rejected';
export function chooseContinue(runner,actText,baseText){
  if(typeof actText!=='string'||!actText)return {source:'base',text:baseText,rejected:null};
  const result=runner.load(actText);
  if(result.ok)return {source:'acts',text:actText,result,rejected:null};
  return {source:'base',text:baseText,rejected:actText,error:result.error};
}
