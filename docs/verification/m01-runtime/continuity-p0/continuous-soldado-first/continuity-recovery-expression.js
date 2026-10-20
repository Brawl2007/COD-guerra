(()=>{
 const originalTick=tick;let recovering=false,handled=0;
 report.controllerRecovery={scope:'Node pilot only; real keyboard/mouse inputs; no game state writes',supportedCheckpoint:'cp_m01_c_engenheiros',attempts:[]};
 tick=async function(ms=120){
  const s=await originalTick(ms);
  if(recovering)return s;
  if(report.deaths.length<=handled)return s;
  handled=report.deaths.length;recovering=true;
  const attempt={deathCount:handled,checkpoint:s.checkpoints.at(-1),startedBattle:hms(s.battle),gameStateWrites:0};report.controllerRecovery.attempts.push(attempt);
  const check=()=>{if(report.deaths.length!==handled)throw Error('Checkpoint replay interrupted by another death; not counted as complete');};
  const crouch=async want=>{const st=await state();if(Boolean(st.player.crouched)!==want){await page.keyboard.press('KeyC');await originalTick(120);}};
  try{
   if(attempt.checkpoint!=='cp_m01_c_engenheiros')throw Error('Unsupported checkpoint for this bounded replay: '+attempt.checkpoint);
   await log('controller-replay-start',attempt);await releaseAll();await crouch(false);
   await path([[-30,40],[-10,40],[30,40]],'replay CP-C: posição no tabuleiro');check();
   await wait('replay CP-C: Bąk ferido',v=>active(v,'rescue_bak')||v.eventIds.includes('evt_m01_east_demolition'),{limitReal:600,faceAngle:0});check();
   let st=await state();
   if(active(st,'rescue_bak')){
    let found=false;
    for(const x of [55,50,45,40,35,30,25,60,65,70,75,80,85,90,95,100,105]){
     await walk(x,40,{label:'replay: procurar Bąk',tolerance:1.5});check();if((await state()).hud.interaction.includes('levar Bąk')){found=true;break;}
    }
    if(!found)throw Error('Replay did not find Bąk through the actual interaction prompt');
    await press('KeyE','levar Bąk');await path([[30,40],[12,40],[-10,40],[-10,46]],'replay: levar Bąk a Dudek');check();
    await press('KeyE','entregar Bąk');check();
   }
   st=await state();if(st.flags['m01.bak_status']!=='rescued_by_player')throw Error('Replay did not deliver Bąk; no completion claim');
   await shot('replay-bak-delivered','Entrega real de Bąk após restauro CP-C');
   await path([[-30,40],[-28,28]],'replay: cobertura oeste');check();await crouch(true);
   await wait('replay: demolição leste desde cobertura',v=>v.eventIds.includes('evt_m01_east_demolition'),{limitReal:900,faceAngle:0});check();
   await shot('replay-east-demolition','Demolição leste após replay; vista da cobertura oeste');
   await crouch(false);await path([[-30,40],[-15,40]],'replay: saída da ponte');check();
   attempt.completed=true;attempt.endedBattle=hms((await state()).battle);await log('controller-replay-complete',attempt);
   return await originalTick(0);
  }finally{recovering=false;}
 };
 return {installed:true,controllerOnly:true,gameStateWrites:0,recovery:'replay CP-C objectives by keyboard/mouse; crouch behind existing sandbags for withdrawal; no further death accepted'};
})()
