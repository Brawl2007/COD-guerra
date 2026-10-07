import test from 'node:test';
import assert from 'node:assert/strict';
import definition from '../missions/m01-tczew/mission.json' with { type: 'json' };
import { M01Simulation, clockText } from '../src/game/m01-simulation.js';
import { M01HudPresenter, INTRO_CARDS, HUD_TIMING, cinematicFrame, objectiveChanges, splitInteraction, splitObjective, lowHealthLevel, typedChars } from '../src/ui/m01-hud.js';
import { driver } from './helpers/m01-route.js';

// DOM mínimo: textContent é calculado a partir dos filhos, como no browser.
class FakeElement {
  constructor(tag='div',children=[]){
    this.tag=tag;this.children=children;this.own='';this.className='';this.dataset={};this.styles=new Map();this.classes=new Set();
    this.style={setProperty:(k,v)=>this.styles.set(k,String(v)),removeProperty:k=>this.styles.delete(k)};
    const c=this.classes;this.classList={toggle:(n,on=!c.has(n))=>{on?c.add(n):c.delete(n);return on;},add:n=>c.add(n),remove:(...n)=>n.forEach(x=>c.delete(x)),contains:n=>c.has(n)};
  }
  get textContent(){return this.children.length?this.children.map(c=>c.textContent).join(''):this.own;}
  set textContent(v){this.children=[];this.own=String(v);}
  replaceChildren(...children){this.children=children;this.own='';}
}
const fakeDocument={createElement:tag=>new FakeElement(tag)};
const KEYS=['root','objective','objectiveStatus','objectivePanel','objectiveUpdate','clock','checkpoint','checkpointName','interaction','subtitle','message',
  'health','healthBar','status','ammo','mag','reserve','weaponName','weaponState','grenades','lowHealth','fade','titleCard','resumeCard'];
function hud(){
  const el=Object.fromEntries(KEYS.map(k=>[k,new FakeElement()]));
  el.rounds=new FakeElement('div',Array.from({length:5},()=>new FakeElement('i')));
  return {el,presenter:new M01HudPresenter(el,{document:fakeDocument})};
}
const opacity=(node)=>Number(node.styles.get('opacity')??0);

test('intro cards and fade follow the cs_m01_intro beats in mission data',()=>{
  const intro=definition.cutscenes.find(c=>c.id==='cs_m01_intro').timeline,beat=prefix=>intro.find(b=>b.action?.startsWith(prefix)).t;
  assert.equal(beat('tela preta'),0);
  assert.equal(INTRO_CARDS[0].from,beat('cartela:'));assert.equal(INTRO_CARDS[1].from,beat('cartela 2'));
  assert.equal(INTRO_CARDS[1].to,beat('fade-in'));assert.equal(HUD_TIMING.introBlackUntil,beat('fade-in'));
  const at=t=>cinematicFrame({id:'cs_m01_intro',elapsed:t});
  assert.deepEqual([at(1).black,at(1).card],[1,null]);
  assert.equal(at(5).card.id,'place');assert.equal(at(5).card.opacity,1);assert.equal(at(5).black,1);
  assert.equal(at(9).card.id,'unit');assert.ok(at(12).black>0&&at(12).black<1);
  assert.equal(at(11+HUD_TIMING.introFade).black,0);assert.equal(at(30).card,null);assert.equal(at(30).locked,true);
  // A máquina de escrever avança com o relógio da cena e nunca excede o texto.
  assert.ok(at(3.5).card.elapsed<at(5).card.elapsed);
  const unit=INTRO_CARDS[1];assert.ok(unit.lines.every((line,i)=>typedChars(line,i,unit.to-unit.from-.8)===line.length),'cartela completa antes de desaparecer');
  for(const scene of ['cs_m01_bombing','cs_m01_order','cs_m01_east_blast','cs_m01_west_blast'])assert.equal(cinematicFrame({id:scene,elapsed:2}).locked,false);
  assert.equal(cinematicFrame(null).black,0);
});

test('roll call fades in with the 07:05 card from the battle clock and fades out at the debrief beat',()=>{
  const roll=definition.cutscenes.find(c=>c.id==='cs_m01_roll_call').timeline;
  assert.ok(roll[0].action.startsWith('fade com cartela 07:05'));assert.equal(roll.at(-1).t,HUD_TIMING.outroFadeOut[1]);
  const at=t=>cinematicFrame({id:'cs_m01_roll_call',elapsed:t},7*3600+5*60);
  assert.equal(at(0).black,1);assert.equal(at(2).card.lines[1],'Tczew — 07:05');assert.equal(at(10).black,0);assert.equal(at(10).card,null);
  assert.equal(at(60).black,1);assert.ok(at(58.5).black>0&&at(58.5).black<1);
});

test('objective transitions, interaction keys and optional objective split are presentation parsing only',()=>{
  const defs=definition.objectives;
  const changes=objectiveChanges({obj_m01_deliver_message:{state:'active'}},{obj_m01_deliver_message:{state:'done'},obj_m01_take_cover:{state:'active'}},defs);
  assert.deepEqual(changes.map(c=>`${c.kind}:${c.id}`),['done:obj_m01_deliver_message','new:obj_m01_take_cover']);
  const optional=objectiveChanges({},{obj_m01_rescue_bak:{state:'active'}},defs)[0];
  assert.equal(optional.optional,true);assert.equal(optional.text,'Leve Bąk até o socorrista');
  assert.equal(objectiveChanges({obj_m01_rescue_bak:{state:'active'}},{obj_m01_rescue_bak:{state:'expired'}},defs)[0].kind,'expired');
  assert.deepEqual(splitInteraction('E · entregar mensagem e café'),{key:'E',action:'entregar mensagem e café'});
  assert.deepEqual(splitInteraction('Espaço · saltar cena'),{key:'Espaço',action:'saltar cena'});
  assert.deepEqual(splitInteraction('Está a transportar Bąk'),{key:'',action:'Está a transportar Bąk'});
  const bak=defs.find(o=>o.id==='obj_m01_rescue_bak').text;
  assert.deepEqual(splitObjective(`Cubra a retirada do pelotão leste · ${bak}`,bak),{main:'Cubra a retirada do pelotão leste',optional:bak});
  assert.deepEqual(splitObjective('04:30 · Tczew, Polónia',null),{main:'04:30 · Tczew, Polónia',optional:''});
  assert.equal(lowHealthLevel(100),0);assert.equal(lowHealthLevel(45),0);assert.equal(lowHealthLevel(0),1);assert.ok(lowHealthLevel(20)>0);
});

test('the presenter never changes simulation state and keeps HUD text contracts on a real route',()=>{
  const {el,presenter}=hud(),seen=[];
  const plain=driver(),shown=driver(19390901,{onStep:({sim})=>{
    const before=JSON.stringify(sim.snapshot());presenter.update(sim);assert.equal(JSON.stringify(sim.snapshot()),before);
    // Textos lidos por testes e pelo piloto: iguais aos da simulação.
    assert.equal(el.objective.textContent,sim.mission.text);assert.equal(el.objectiveStatus.textContent,sim.mission.status??'');
    assert.equal(el.interaction.textContent,sim.interaction);assert.equal(el.clock.textContent,clockText(sim.battleClock));
    assert.equal(el.subtitle.textContent,sim.subtitle?`${sim.subtitle.speaker}: ${sim.subtitle.text}`:'');
    assert.equal(el.mag.textContent,sim.weapon.reloading?'—':String(sim.weapon.mag));assert.equal(el.reserve.textContent,String(sim.weapon.reserve));
    assert.match(el.weaponState.textContent,new RegExp(`${sim.weapon.sight} m`));
    const b=presenter.diagnostics.banner;if(b&&seen.at(-1)!==`${b.kind}:${b.id}`)seen.push(`${b.kind}:${b.id}`);
  }});
  presenter.reset('new',0);
  const introFrames=[];
  const run=d=>{
    for(let i=0;i<200;i++){d.step({});if(d===shown){introFrames.push({black:opacity(el.fade),card:presenter.diagnostics.titleCard,banner:presenter.diagnostics.banner});}}
    d.step({skip:true});d.walk(-66,26);d.walk(-15,26);d.walk(-15,2);d.walk(16,2);d.step({interact:true});
    d.until(()=>d.sim.active('follow_sergeant'),120);
  };
  run(plain);run(shown);
  // Mesmo percurso com e sem apresentação: estado idêntico.
  assert.equal(JSON.stringify(shown.sim.snapshot()),JSON.stringify(plain.sim.snapshot()));
  // Introdução: ecrã preto e cartela, sem avisos de objectivo por cima da cena.
  assert.equal(introFrames[30].black,1);assert.equal(introFrames[30].card,null);
  assert.match(introFrames[110].card,/^place\|TCZEW, POLÓNIA/);assert.match(introFrames[170].card,/^unit\|/);
  assert.ok(introFrames.every(f=>f.banner===null));assert.equal(el.root.classes.has('cinematic'),false);
  assert.deepEqual(seen.slice(0,1),['new:obj_m01_deliver_message']);
  assert.ok(seen.includes('new:obj_m01_take_cover')||seen.includes('new:obj_m01_follow_sergeant'),seen.join());
});

test('checkpoint feedback, restore fade and continue card are timed by the simulation clock',()=>{
  const {el,presenter}=hud(),d=driver();d.step({skip:true});
  presenter.reset('new',d.sim.clock);presenter.update(d.sim);
  presenter.checkpoint('CP-A · Orientação',d.sim.clock);
  for(let i=0;i<10;i++){d.step({});presenter.update(d.sim);}
  assert.equal(opacity(el.checkpoint),1);assert.equal(el.checkpointName.textContent,'CP-A · Orientação');
  for(let i=0;i<70;i++){d.step({});presenter.update(d.sim);}
  assert.equal(opacity(el.checkpoint),0);
  // Restauro: o relógio volta atrás; o HUD faz fade-in e relembra o objectivo actual.
  d.sim.restoreCheckpoint();presenter.update(d.sim);
  assert.equal(opacity(el.fade),1);assert.equal(presenter.diagnostics.banner.kind,'current');
  for(let i=0;i<20;i++){d.step({});presenter.update(d.sim);}
  assert.equal(opacity(el.fade),0);
  // Continuar: cartela com local, hora da batalha e checkpoint.
  presenter.reset('continue',d.sim.clock);d.step({});presenter.update(d.sim);
  for(let i=0;i<30;i++){d.step({});presenter.update(d.sim);}
  assert.match(presenter.diagnostics.resumeCard,/Tczew — pontes do Vístula\|1 de setembro de 1939 · 04:3\d\|CP-A · Orientação/);
  assert.ok(opacity(el.resumeCard)>.9);
  // Pausa: sem ticks, nada muda.
  const frozen=JSON.stringify([...el.fade.styles,...el.resumeCard.styles,presenter.diagnostics]);presenter.update(d.sim);
  assert.equal(JSON.stringify([...el.fade.styles,...el.resumeCard.styles,presenter.diagnostics]),frozen);
  presenter.clear();assert.equal(el.root.classes.has('m01'),false);assert.equal(el.checkpointName.textContent,'');assert.equal(el.ammo.classes.has('low'),false);assert.equal(el.interaction.textContent,'');assert.equal(el.fade.styles.has('opacity'),false);
});
