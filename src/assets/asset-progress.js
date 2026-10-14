// Network asset progress reporting, isolated from simulation, rendering and RNG.
const items=new Map(),subscribers=new Set();
const emit=()=>{const state=getAssetProgressSnapshot();for(const fn of subscribers){try{fn(state);}catch{}}};
export function beginAsset(id,label){
  items.set(id,{id,label,status:'loading',loaded:0,total:0});
  emit();
}
export function progressAsset(id,event){
  const item=items.get(id);if(!item)return;
  if(Number.isFinite(event?.loaded))item.loaded=Math.max(item.loaded,event.loaded);
  if(Number.isFinite(event?.total)&&event.total>0)item.total=Math.max(item.total,event.total);
  emit();
}
export function finishAsset(id,success=true){
  const item=items.get(id);if(!item)return;
  item.status=success?'loaded':'failed';
  if(success&&item.total)item.loaded=item.total;
  emit();
}
export function clearAssetsForOwner(owner){
  for(const id of items.keys())if(id.startsWith(owner+':'))items.delete(id);
  emit();
}
export function getAssetProgressSnapshot(){
  let totalItems=0,completedItems=0,failedCount=0,bytesLoaded=0,bytesTotal=0,activeLabel=null,knownBytes=0;
  for(const item of items.values()){
    totalItems++;
    if(item.status==='loaded')completedItems++;
    if(item.status==='failed')failedCount++;
    if(item.status==='loading'&&!activeLabel)activeLabel=item.label;
    bytesLoaded+=item.loaded;
    bytesTotal+=item.total;
    if(item.total>0)knownBytes++;
  }
  const settled=completedItems+failedCount;
  // Item completion is authoritative. Partial bytes are advisory because
  // browsers often omit Content-Length; do not misreport bytesTotal as exact.
  let partial=0;
  for(const item of items.values())if(item.status==='loading'&&item.total>0)partial+=Math.min(.95,item.loaded/item.total);
  const ratio=totalItems?Math.min(1,(settled+partial)/totalItems):0;
  return Object.freeze({totalItems,completedItems,failedCount,bytesLoaded,bytesTotal,
    knownBytes,totalKnown:knownBytes===totalItems&&totalItems>0,activeLabel,ratio,settled});
}
export function subscribeAssetProgress(fn){
  if(typeof fn!=='function')return ()=>{};
  subscribers.add(fn);fn(getAssetProgressSnapshot());return ()=>subscribers.delete(fn);
}
