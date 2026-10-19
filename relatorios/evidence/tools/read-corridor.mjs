import fs from 'node:fs/promises';
import {chromium} from '/workspace/COD-guerra/node_modules/playwright-core/index.mjs';
const b=await chromium.connectOverCDP('http://127.0.0.1:9223'),p=b.contexts()[0].pages()[0];
const s=await p.evaluate(()=>{const d=window.gameDiagnostics();return {observedAt:new Date().toISOString(),clock:d.clock,player:d.player,eventIds:d.eventIds,quality:d.quality,viewModel:d.m01.viewModel,damage:d.m01.damage,weapon:d.m01.weapon,demolition:d.m01.demolition,battlefieldFx:d.m01.battlefieldFx,visiblePieces:d.m01.visiblePieces,scene:d.m01.scene,flags:d.m01.flags,hud:d.m01.hudPresentation};});
await fs.writeFile('/workspace/COD-guerra/docs/verification/m01-quality-inspector/evidence/corridor-presentation-diagnostic.json',JSON.stringify(s,null,2));console.log(JSON.stringify(s));process.exit(0);
