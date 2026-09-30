import { distance } from '../core/math.js';
export class Mission {
  constructor(checkpoint,radio){this.phase=0;this.checkpoint=checkpoint;this.radio=radio;this.complete=false;this.checkpointSaved=false;}
  get text(){return ['AVANCE PELA ALDEIA','ELIMINE A RESISTÊNCIA','ALCANCE O RÁDIO NA CAPELA','SETOR SEGURO'][this.phase];}
  update(player,enemies){if(this.phase===0&&distance(player,this.checkpoint)<75){this.phase=1;this.checkpointSaved=true;return 'checkpoint';}if(this.phase===1&&enemies.every(e=>!e.alive)){this.phase=2;return 'clear';}if(this.phase===2&&distance(player,this.radio)<70){this.phase=3;this.complete=true;return 'complete';}return null;}
}
