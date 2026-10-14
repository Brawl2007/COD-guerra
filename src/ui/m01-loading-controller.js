import {subscribeAssetProgress,getAssetProgressSnapshot} from '../assets/asset-progress.js';

// Monitors *all* V7 AssetManager instances. Mission readiness is decided
// exclusively by M01View.ready, never by a guessed byte count or a mock manifest.
export class M01LoadingController{
  constructor(root=document){
    this.root=root;this.phase='loading';this.percent=0;this.visible=true;
    this.unsubscribe=subscribeAssetProgress(s=>this.update(s));
    this.root.querySelector('#m01-loading-retry')?.addEventListener('click',()=>location.reload());
  }
  begin(){this.phase='loading';this.visible=true;this.percent=0;this.update(getAssetProgressSnapshot());}
  selectMission(isM01){
    this.visible=Boolean(isM01);
    if(this.visible){this.phase='loading';this.percent=0;}
    this.update(getAssetProgressSnapshot());
  }
  ready(){if(!this.visible)return;this.phase='ready';this.percent=100;this.update(getAssetProgressSnapshot());}
  fail(message){this.phase='error';this.message=String(message?.message??message);this.update(getAssetProgressSnapshot());}
  update(snapshot){
    if(!this.root)return;
    const panel=this.root.querySelector('#m01-loading');
    if(!panel)return;
    panel.classList.toggle('hidden',!this.visible);
    panel.dataset.phase=this.phase;
    if(!this.visible)return;
    // Denominator grows as the existing V7 loaders discover models; reflect the real
    // observed fraction even if it temporarily falls, instead of faking 92% for 15/48.
    if(this.phase==='loading')this.percent=Math.min(95,Math.round(snapshot.ratio*95));
    const percent=this.root.querySelector('#m01-loading-percent');
    const bar=this.root.querySelector('#m01-loading-bar');
    const stage=this.root.querySelector('#m01-loading-stage');
    const footer=this.root.querySelector('#mission-status');
    const retry=this.root.querySelector('#m01-loading-retry');
    if(percent)percent.textContent=this.percent+'%';
    if(bar){bar.style.width=this.percent+'%';bar.setAttribute('aria-valuenow',String(this.percent));}
    let text;
    if(this.phase==='ready')text='M01 pronta — modelos críticos confirmados';
    else if(this.phase==='error')text='Falha de carregamento: '+(this.message??'verifique a ligação');
    else text=snapshot.activeLabel?'A transferir '+snapshot.activeLabel:
      snapshot.totalItems?snapshot.completedItems+' de '+snapshot.totalItems+' recursos carregados':'A carregar motor 3D…';
    if(stage)stage.textContent=text;
    if(footer)footer.textContent=this.phase==='ready'?'PRONTO PARA INICIAR · TCZEW 04:30':
      this.phase==='error'?'FALHA DE CARREGAMENTO · RECUPERAÇÃO DISPONÍVEL':
      'A CARREGAR M01 · '+this.percent+'% · '+snapshot.completedItems+'/'+snapshot.totalItems+' MODELOS';
    retry?.classList.toggle('hidden',this.phase!=='error');
  }
  dispose(){this.unsubscribe?.();}
}
