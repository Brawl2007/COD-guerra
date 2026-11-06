// UI-only confirmation: no mission state changes until the second deliberate
// input. A new player object indicates checkpoint restore or a fresh session.
export class M02RetreatConfirmation {
 constructor(){this.key=null;this.player=null;}
 static keyFor(prompt){return prompt?`${prompt.count}:${prompt.lisUnsafe}`:null;}
 clear(){this.key=null;this.player=null;}
 sync(prompt,player,active){
  if(!active||!prompt||this.player!==player||this.key!==M02RetreatConfirmation.keyFor(prompt))this.clear();
 }
 request(prompt,player){
  if(!prompt){this.clear();return false;}
  const key=M02RetreatConfirmation.keyFor(prompt);
  if(this.key===key&&this.player===player){this.clear();return true;}
  this.key=key;this.player=player;return false;
 }
 get armed(){return this.key!==null;}
}
