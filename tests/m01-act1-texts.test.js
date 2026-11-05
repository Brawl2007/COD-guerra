// Golden amendment 22 (2026-11-05): the act-1 consistency audit and the European Portuguese of the mission texts (missions/m01-tczew/mission.json, SCRIPT.md, HISTORICAL_RESEARCH.md). Data and text only: what the audit
// found is pinned here so that it does not come back, the Brazilian words that were replaced cannot slip back into the three files, and the Polish text of the notes keeps no Portuguese word of the pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation} from '../src/game/m01-simulation.js';

const text=name=>readFileSync(new URL(`../missions/m01-tczew/${name}`,import.meta.url),'utf8');
const dialogue=id=>definition.dialogue.find(l=>l.id===id);
/** Every string value of the mission data, with its path (keys are not texts). */
function strings(v,path=[],out=[]){
  if(typeof v==='string')out.push([path.join('.'),v]);
  else if(Array.isArray(v))v.forEach((x,i)=>strings(x,[...path,i],out));
  else if(v&&typeof v==='object')for(const k of Object.keys(v))strings(v[k],[...path,k],out);
  return out;
}
/** The Polish part of a note («PL: …», up to the next « | »): not Portuguese. */
const polish=note=>(/PL: ([^|]*)/.exec(note)?.[1]??'').trim();

test('Pawlak is a messenger: his role says what his roleNote says (the section has no radio, he carries the word on foot), in the data and in the simulation',()=>{
  const c=definition.cast.find(x=>x.id==='staszek_pawlak');
  assert.equal(c.role,'MESSENGER');assert.match(c.roleNote,/Sem rádio na secção/);assert.match(c.rank,/goniec \(mensageiro\)/);
  assert.equal(new M01Simulation(1).actor('staszek_pawlak').role,'MESSENGER');
  // nothing in the game reads the role by name (the roles the simulation, the renderer and the director test are those of the other men): no cast member keeps the word that contradicted the note
  assert.ok(!definition.cast.some(x=>x.role==='RADIO_OPERATOR'));
});

test('dlg_m01_118: the ckm reserve man speaks to Wrona, a strzelec, not to a corporal (the Polish is by an AI author, to be reviewed by a native speaker)',()=>{
  const l=dialogue('dlg_m01_118'),wrona=definition.cast.find(x=>x.id==='jan_wrona');
  assert.match(wrona.rank,/^strzelec/);
  assert.equal(l.text,'Wrona, pelo aterro para oeste?');assert.equal(polish(l.note),'Wrona, nasypem na zachód?');
  assert.doesNotMatch(l.text,/[Cc]abo/);assert.doesNotMatch(polish(l.note),/kapral/i,'the Polish line no longer says kapral');
  assert.match(l.note,/polaco escrito por agente de IA, por rever por falante nativo/,'and the note says it is AI-written and pending a native review');
  assert.equal(dialogue('dlg_m01_119').speaker,'ckm_gunner');   // the answer is the gunner's, untouched
});

test('the debrief says the sappers were a platoon (HISTORICAL_RESEARCH.md section 4) and the offscreen Janik is not said to have had his orders carried by «the messenger» (nobody knows who transmitted them)',()=>{
  const db5=definition.debrief.paragraphs.find(p=>p.id==='db_05');
  assert.equal(db5.text,'Stanisław Janik comandava o 2.º Batalhão de Fuzileiros. O pelotão de sapadores era comandado pelo subtenente Norbert Juchtman.');
  assert.match(text('HISTORICAL_RESEARCH.md'),/pelotão de sapadores/,'the research folder speaks of the platoon');
  const janik=definition.historicalPersonsOffscreen.find(h=>h.id==='hist_janik');
  assert.doesNotMatch(janik.appearsAs,/transmitidas pelo mensageiro/);assert.match(janik.appearsAs,/quem as transmitiu é desconhecido/);
  assert.match(janik.appearsAs,/nome só no debrief/,'his name is still only in the debrief');
  // the Act VII-c data says the same: who transmitted the order is not known
  assert.match(readFileSync(new URL('../missions/m01-tczew/areas/np/act-vii-c.json',import.meta.url),'utf8'),/quem a transmitiu[^"]*desconhecidos/);
});

// The Brazilian words the audit replaced (whole words). The spelling of the silent consonants (objectivo / objetivo, activo / ativo, sector / setor, ...) is mixed in the three files and is NOT part of this pass: both are
// valid in Portugal since the Agreement.
const BRAZILIAN=[[/\bPol[oô]nia\b/i,'Polônia'],[/\bpolon[êe]s(?:a|as|es)?\b/i,'polonês'],[/\bcontatos?\b/i,'contato'],[/\bfatos?\b/i,'fato'],[/\bvoc[êe]s?\b/i,'você'],[/\btrens?\b/i,'trem'],[/\btelas?\b/i,'tela'],
  [/\bfuma[çc]a\b/i,'fumaça'],[/\bc[âa]meras?\b/i,'câmera'],[/\bcontroles?\b/i,'controle'],[/\bplanej\w+\b/i,'planejar'],[/\bregistra(?:do|dos|da|das|m)?\b/i,'registra'],[/\btrilhos?\b/i,'trilho'],[/\bTop[ôo]nimos?\b/i,'Topônimo'],
  [/\bb[ôo]nus\b/i,'bônus'],[/\bPegou\b/,'Pegou'],[/\bTrocando carregador\b/,'Trocando carregador'],[/\bestão (?:atirando|acertando)\b/,'estar + gerúndio'],[/\bsair correndo\b/,'sair correndo'],
  // review of 2026-11-05: the leftovers of the first pass (bombardeamento, toda a gente, chegar a, porque é que, puxa-o, até à / até ao before a noun)
  [/\bbombardeios?\b/i,'bombardeio'],[/\btodo mundo\b/i,'todo mundo'],[/\bchegar em\b/i,'chegar em'],[/\bPor que (?!(?:raz|motiv))/,'Por que'],[/\be o puxa\b/i,'e o puxa'],
  [/\baté (?:a|as) (?:estação|ponte|ordem|prontidão|20:00)\b/i,'até a(s) + nome'],[/\baté o (?:socorrista|pilar|portal|fim|mínimo|Dudek|bombardeio)\b/i,'até o + nome']];
test('the three files no longer use the Brazilian words the audit replaced (comboio, ecrã, fumo, facto, contacto, Polónia, polaco, controlo, câmara, regista, carris, bombardeamento, toda a gente, até ao / até à)',()=>{
  const prose=[...strings(definition).filter(([path])=>!/(^|\.)id$/.test(path)).map(([path,v])=>[`mission.json:${path}`,v]),['SCRIPT.md',text('SCRIPT.md')],['HISTORICAL_RESEARCH.md',text('HISTORICAL_RESEARCH.md')]];
  const found=[];
  for(const [where,v] of prose){
    const pt=v.replace(/PL: [^|\n]*/g,'');   // the Polish part of a note is not Portuguese
    for(const [rx,label] of BRAZILIAN){const m=rx.exec(pt);if(m)found.push(`${where}: «${m[0]}» (${label})`);}
  }
  assert.deepEqual(found,[]);
});

test('the lines the audit touched say what the Captain asked, by id',()=>{
  const said={dlg_m01_005:'Café de verdade hoje. Mau sinal.',dlg_m01_006:'Dudek, se eu desmaiar, carregas-me?',dlg_m01_012:'Ouve isso? Não é comboio.',dlg_m01_029:'A trocar o carregador!',dlg_m01_030:'Cubro-o!',
    dlg_m01_112:'A fita está a acabar!',dlg_m01_140:'Acertou. Mude de posição.',dlg_m01_150:'{n}. Continuo a contar.',
    // review of 2026-11-05
    dlg_m01_014:'Para o chão! Toda a gente no chão!',dlg_m01_043:'Wrona! Traga o Bąk até ao Dudek. Eu cubro!',dlg_m01_145:'Seguramos esta cabeça de ponte. Até à ordem.'};
  for(const [id,t] of Object.entries(said))assert.equal(dialogue(id).text,t,id);
  assert.equal(definition.callouts.lines.filter(l=>l.text==='Cubro-o!').length,1,'the callout of the director says it too');
  assert.equal(definition.callouts.lines.find(l=>l.event==='npc_reloading').text,'A recarregar!');
  assert.equal(definition.objectives.find(o=>o.id==='obj_m01_leave_bridge').failure.message,'Afastou-se da sua secção.');
  assert.ok(definition.objectives.some(o=>o.text==='(Opcional) Leve Bąk até ao socorrista'),'the optional objective of Bąk');
  assert.match(definition.events.find(e=>e.id==='evt_m01_west_demolition').tolerance.onTimeout,/Zieliński vai até ele e puxa-o \(animação de agarrar\)/);
  assert.match(definition.events.find(e=>e.id==='evt_m01_wounded_dragged').results[0],/até à estação/);
  assert.match(text('SCRIPT.md'),/\*\*KOWAL:\*\* Cubro-o! \(030\)/,'SCRIPT.md credits line 030 to Kowal, as the data do since 2026-10-19');
  assert.match(definition.dialogue.find(l=>l.text.startsWith('Comboio blindado!')).text,/^Comboio blindado! Na outra via, atrás dos vagões!$/);
});

test('the Polish of the notes keeps no Portuguese word of the pass, and the Polish lines are still there',()=>{
  const pl=definition.dialogue.filter(l=>/PL: /.test(l.note??''));
  assert.ok(pl.length>100,`the Polish notes are there (${pl.length})`);
  for(const l of pl)assert.doesNotMatch(polish(l.note),/\b(comboio|ecrã|fumo|facto|contacto|polaco|controlo|câmara|carris)\b/i,`${l.id}: nothing Portuguese crept into the Polish of the note`);
  // the quoted source titles of the research (H01-PDF, the T-sources) are not touched: the ids are still cited in the debrief paragraphs
  assert.deepEqual(definition.debrief.paragraphs.filter(p=>p.sources).map(p=>p.sources).flat().sort().filter((v,i,a)=>a.indexOf(v)===i),['H01-PDF','H02','T23']);
});
