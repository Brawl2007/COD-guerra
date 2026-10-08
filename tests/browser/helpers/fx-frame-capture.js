// Install before Continue. Observe each completed production frame, then use the
// existing blur/pause path synchronously so a remote Playwright poll cannot miss
// a short-lived effect. No simulation events, clocks or FX lifetimes are injected.
export async function armFxCapture(page,options){
  await page.addInitScript(options=>{
    const raf=window.requestAnimationFrame.bind(window);
    const probe={frames:0,first:null,last:null,max:{puff:0,spark:0,chip:0,core:0,fire:0,dust:0},roundConsumed:false};
    window.__fxProbe=probe;window.__fxCapture=null;
    window.requestAnimationFrame=callback=>raf(time=>{
      callback(time);
      if(window.__fxCapture)return;
      const d=window.gameDiagnostics?.();if(!d||d.paused)return;
      probe.frames++;probe.first??=d.clock;probe.last=d.clock;
      const f=d.m01.fireEffects,b=d.m01.battlefieldFx;
      for(const k of Object.keys(probe.max))probe.max[k]=Math.max(probe.max[k],f[k]??b.counts[k]??0);
      let match=false;
      if(options.round){
        const state=window.gameVerificationState?.().snapshot;
        probe.roundConsumed=Boolean(state&&!state.enemyFire.rounds.some(r=>r.id===options.round.id)&&d.clock>=options.round.arriveAt);
        const age=d.clock-options.round.arriveAt;
        const layer=options.material==='earth'?f.puff:f.chip;
        match=probe.roundConsumed&&age>=0&&age<.76&&layer>0;
      }else{
        const damage=d.m01.damage.find(x=>x.id===options.damageId&&x.started>=options.clock);
        match=Boolean(damage&&b.active>0&&(options.phase==='smoke'?
          b.counts.smoke>0&&b.counts.core===0&&b.counts.fire===0:
          b.counts.dust>0&&(b.counts.core>0||b.counts.fire>0)));
      }
      if(!match)return;
      window.dispatchEvent(new Event('blur'));
      window.__fxCapture={diagnostics:window.gameDiagnostics(),probe:structuredClone(probe)};
      document.exitPointerLock();
    });
  },options);
}
