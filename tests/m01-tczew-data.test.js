// Validação dos dados de roteiro/mapa de M01 (Tczew). Confere contratos e referências cruzadas;
// não substitui jogar a missão (Prompt §80).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RETIRED_CASEMATE } from './helpers/m01-retired-casemate.js';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const mission = JSON.parse(read('missions/m01-tczew/mission.json'));
const layout = JSON.parse(read('missions/m01-tczew/map-layout.json'));
const equipment = JSON.parse(read('research/equipment-timeline.json'));
const research = read('missions/m01-tczew/HISTORICAL_RESEARCH.md');
const sourcesDoc = read('research/SOURCES.md');
const sourceChecks = read('missions/m01-tczew/SOURCE_CHECK.md');
const measured = JSON.parse(read('missions/m01-tczew/measurements.json'));

const ids = list => new Set(list.map(item => item.id));
const objectiveIds = ids(mission.objectives), eventIds = ids(mission.events), cutsceneIds = ids(mission.cutscenes);
const checkpointIds = ids(mission.checkpoints), dialogueIds = ids(mission.dialogue), castIds = ids(mission.cast);
const sectorIds = ids(mission.sectors), featureIds = ids(layout.features), propIds = ids(layout.props);
const equipmentById = new Map(equipment.items.map(item => [item.id, item]));
const clockSeconds = hms => { const [h, m, s = 0] = hms.split(':').map(Number); return h * 3600 + m * 60 + s; };
const eventById = id => mission.events.find(e => e.id === id);
const missionDate = mission.dateStart.slice(0, 10);

// Percorre gatilhos/condições aninhados e devolve as referências nomeadas.
function refsIn(node, found = []) {
  if (Array.isArray(node)) node.forEach(child => refsIn(child, found));
  else if (node && typeof node === 'object') for (const [key, value] of Object.entries(node)) {
    if (['event', 'objective', 'cutscene'].includes(key) && typeof value === 'string') found.push([key, value]);
    else refsIn(value, found);
  }
  return found;
}
const known = { event: eventIds, objective: objectiveIds, cutscene: cutsceneIds };
const inBox = ([x, , z], b) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
const dist2d = ([ax, , az], [bx, , bz]) => Math.hypot(ax - bx, az - bz);

test('M01 declares the mission contract fields of Prompt §74', () => {
  for (const field of ['id', 'title', 'dateStart', 'dateEnd', 'location', 'operation', 'faction', 'formation', 'unit', 'protagonist', 'cast', 'sources', 'historicalCertainty', 'allowedEquipment', 'map', 'entry', 'exit', 'targetDurationMin', 'objectives', 'events', 'checkpoints', 'cutscenes', 'dialogue', 'sectors'])
    assert.ok(mission[field] !== undefined, `campo ausente: ${field}`);
  assert.equal(mission.dateStart, '1939-09-01T04:30:00+01:00');
  assert.ok(castIds.has(mission.protagonist));
  for (const objective of mission.objectives) assert.equal(typeof objective.required, 'boolean', objective.id);
});

test('M01 IDs are unique across the mission and every reference resolves', () => {
  const all = [...mission.objectives, ...mission.events, ...mission.cutscenes, ...mission.checkpoints, ...mission.dialogue, ...mission.sectors].map(x => x.id);
  assert.equal(new Set(all).size, all.length, 'IDs duplicados');
  const sources = [...mission.objectives, ...mission.events, ...mission.checkpoints, mission.entry, mission.exit, mission.phases, mission.clock];
  for (const [kind, id] of refsIn(sources)) assert.ok(known[kind].has(id), `${kind} desconhecido: ${id}`);
  for (const event of mission.events) assert.ok(sectorIds.has(event.sector), `${event.id}: setor ${event.sector}`);
  for (const cp of mission.checkpoints) {
    for (const id of cp.restore.eventsConsumed) assert.ok(eventIds.has(id), `${cp.id}: evento ${id}`);
    for (const id of [...(cp.restore.objectives.done ?? []), ...cp.restore.objectives.active]) assert.ok(objectiveIds.has(id), `${cp.id}: objetivo ${id}`);
    for (const [sector] of Object.entries(cp.restore.sectors)) assert.ok(sectorIds.has(sector), `${cp.id}: setor ${sector}`);
  }
  for (const objective of mission.objectives) if (objective.checkpoint) assert.ok(checkpointIds.has(objective.checkpoint), objective.id);
  for (const line of mission.dialogue) assert.ok(castIds.has(line.speaker), `${line.id}: falante ${line.speaker}`);
  for (const scene of mission.cutscenes) for (const beat of scene.timeline) {
    for (const id of [beat.line, ...Object.values(beat.lineVariants ?? {})].filter(Boolean)) assert.ok(dialogueIds.has(id), `${scene.id}: fala ${id}`);
  }
  const places = mission.objectives.flatMap(o => [o.completion?.reach, o.completion?.at, o.completion?.from, o.completion?.to]).filter(Boolean);
  const carried = mission.objectives.map(o => o.completion?.carry).filter(Boolean);
  for (const place of places) assert.ok(featureIds.has(place), `lugar desconhecido no mapa: ${place}`);
  for (const thing of carried) assert.ok(propIds.has(thing) || castIds.has(thing), `objeto carregado desconhecido: ${thing}`);
  for (const zone of layout.blastZones) assert.ok(eventIds.has(zone.event), zone.id);
  for (const id of [mission.entry.checkpoint]) assert.ok(checkpointIds.has(id));
});

test('M01 keeps the documented chronology on the battle clock', () => {
  const at = id => clockSeconds(eventById(id).trigger.at ?? eventById(id).trigger.of.find(t => t.type === 'battleClock').at);
  assert.equal(at('evt_m01_bombing_0434'), clockSeconds('04:34:00'));
  assert.equal(at('evt_m01_train963_arrives'), clockSeconds('04:45:00'));
  assert.equal(at('evt_m01_order_demolish'), clockSeconds('05:30:00'));
  assert.equal(at('evt_m01_east_demolition'), clockSeconds('06:10:00'));
  assert.equal(at('evt_m01_west_demolition'), clockSeconds('06:45:00'));
  const secondRaid = eventById('evt_m01_bombing_0530');
  assert.equal(at(secondRaid.id), clockSeconds('05:30:00'));
  assert.deepEqual(secondRaid.window, { from: '05:30:00', to: '05:34:00' });
  assert.ok(secondRaid.idempotent && secondRaid.persist);
  const sky = mission.sectors.find(s => s.id === secondRaid.sector);
  assert.ok(sky.independentOfPlayer);
  assert.ok(sky.schedule.some(s => s.at === secondRaid.window.from && s.event === secondRaid.id));
  assert.ok(sky.schedule.some(s => s.at === secondRaid.window.to));
  for (const id of ['evt_m01_bombing_0434', 'evt_m01_train963_arrives', 'evt_m01_east_demolition', 'evt_m01_west_demolition']) assert.equal(eventById(id).certainty, 'DOCUMENTED', id);
  const segments = mission.clock.segments;
  assert.equal(segments[0].from, mission.clock.start);
  assert.equal(segments.at(-1).to, mission.clock.end);
  segments.slice(1).forEach((segment, i) => assert.equal(segment.from, segments[i].to, `lacuna entre ${segments[i].id} e ${segment.id}`));
  const [lo, hi] = [clockSeconds(mission.clock.start), clockSeconds(mission.clock.end)];
  for (const [, id] of refsIn(mission.events).filter(([kind]) => kind === 'event')) assert.ok(eventIds.has(id));
  for (const event of mission.events) for (const t of [event.trigger, ...(event.trigger.of ?? [])]) if (t.type === 'battleClock') {
    const s = clockSeconds(t.at);
    assert.ok(s >= lo && s <= hi, `${event.id} fora da janela da missão`);
  }
  for (const segment of segments.filter(s => !s.snap && !s.jump)) {
    const realMin = (clockSeconds(segment.to) - clockSeconds(segment.from)) / segment.scale / 60;
    assert.ok(Math.abs(realMin - segment.targetRealMin) <= 0.2, `${segment.id}: escala dá ${realMin.toFixed(2)} min, alvo ${segment.targetRealMin}`);
  }
  const target = segments.reduce((sum, s) => sum + s.targetRealMin, 0);
  assert.ok(target >= mission.targetDurationMin[0] && target <= mission.targetDurationMin[1], `duração-alvo somada: ${target} min`);
});

test('M01 equips only gear available on 1 September 1939 and never the forbidden weapons', () => {
  const available = id => { const item = equipmentById.get(id); assert.ok(item, `item desconhecido: ${id}`); return item.availableFrom <= missionDate; };
  for (const id of mission.allowedEquipment) assert.ok(available(id), `${id} ainda não existia em ${missionDate}`);
  for (const id of ['m1_carbine', 'mp40', 'mg42']) {
    assert.ok(mission.forbiddenEquipment.includes(id), `${id} precisa estar proibido`);
    assert.ok(!available(id), `${id} não pode constar como disponível em 1939`);
    assert.ok(!mission.allowedEquipment.includes(id));
  }
  const loadouts = [...mission.cast.flatMap(c => c.loadout), ...mission.groups.flatMap(g => g.weapons ?? []), mission.player.loadout.primary.item, mission.player.loadout.grenades.item];
  for (const id of loadouts) assert.ok(mission.allowedEquipment.includes(id), `equipamento fora da lista permitida: ${id}`);
  assert.equal(mission.player.loadout.primary.item, 'kb_wz29');
  assert.equal(mission.player.loadout.primary.magazine, equipmentById.get('kb_wz29').specs.magazine);
});

test('M01 keeps the mandatory lines of the master script verbatim', () => {
  const lines = new Map(mission.dialogue.map(d => [d.text, d.speaker]));
  assert.equal(lines.get('Confira o homem do posto. Ele está sozinho.'), 'marek_zielinski');
  assert.equal(lines.get('Precisamos de espaço para trabalhar!'), 'pawel_krawiec');
  assert.equal(lines.get('Wrona, conte os nossos. Não conte os tiros.'), 'marek_zielinski');
});

test('M01 labels history and space only with the agreed vocabularies', () => {
  const history = new Set(['DOCUMENTED', 'RECONSTRUCTED', 'GAMEPLAY_DRAMATIZATION']);
  const space = new Set(['EXACT', 'RECONSTRUCTED', 'COMPRESSED_FOR_GAMEPLAY']);
  for (const event of mission.events) assert.ok(history.has(event.certainty), `${event.id}: ${event.certainty}`);
  for (const feature of layout.features) {
    assert.ok(space.has(feature.classification), `${feature.id}: ${feature.classification}`);
    if (feature.classification === 'COMPRESSED_FOR_GAMEPLAY') assert.ok(feature.realValue, `${feature.id} precisa registrar o valor real`);
  }
  const knownSources = new Set(sourcesDoc.match(/^\| (H\d{2}(?:-PDF)?|T\d{2}|C\d{2}|G\d{2}) \|/gm).map(row => row.slice(2, -2)));
  const cited = [...mission.sources, ...mission.events.flatMap(e => e.sources), ...mission.debrief.paragraphs.flatMap(p => p.sources ?? []), ...layout.features.flatMap(f => f.sources ?? []), ...equipment.items.flatMap(i => i.sources)];
  for (const id of cited) assert.ok(knownSources.has(id), `fonte sem registro em research/SOURCES.md: ${id}`);
});

test('M01 checkpoints accumulate state and never save inside a demolition zone', () => {
  const [a, b, c, d] = ['cp_m01_a_orientacao', 'cp_m01_b_reorganizacao', 'cp_m01_c_engenheiros', 'cp_m01_d_retirada'].map(id => mission.checkpoints.find(cp => cp.id === id));
  for (const [earlier, later] of [[a, b], [b, c], [c, d]]) {
    for (const id of earlier.restore.eventsConsumed) assert.ok(later.restore.eventsConsumed.includes(id), `${later.id} perdeu ${id}`);
  }
  assert.equal(c.savePolicy, 'deferUntilSafe', 'a ordem e o segundo raid não podem eliminar CP-C');
  for (const cp of [c, d]) {
    assert.ok(cp.restore.eventsConsumed.includes('evt_m01_bombing_0530'));
    assert.ok(cp.restore.flags.includes('m01.second_raid_state'));
  }
  const west = layout.blastZones.find(z => z.id === 'bz_west'), east = layout.blastZones.find(z => z.id === 'bz_east');
  for (const cp of mission.checkpoints) {
    if (cp.player.positionPolicy === 'current') { assert.ok(cp.neverSaveIf, `${cp.id} precisa de neverSaveIf`); continue; }
    assert.ok(inBox(cp.player.position, layout.bounds.playable), `${cp.id} fora da área jogável`);
    assert.ok(dist2d(cp.player.position, east.center) > east.radiusM, `${cp.id} dentro de bz_east`);
  }
  assert.ok(d.trigger.all.some(t => t.playerMaxX !== undefined && t.playerMaxX < west.center[0]), 'CP-D só depois de sair da ponte');
  const feature = id => layout.features.find(f => f.id === id).point;
  for (const safe of ['firing_point', 'shelter', 'rally_point']) assert.ok(dist2d(feature(safe), west.center) > west.radiusM, `${safe} dentro de bz_west`);
  assert.ok(eventById('evt_m01_west_demolition').readiness.some(r => r.includes('jogador fora de bz_west')));
});

test('M01 runs at least two independent battle sectors on the clock', () => {
  const independent = mission.sectors.filter(s => s.independentOfPlayer && s.schedule.length >= 3);
  assert.ok(independent.length >= 2);
  for (const sector of mission.sectors) {
    const times = sector.schedule.map(step => clockSeconds(step.at));
    assert.deepEqual(times, [...times].sort((x, y) => x - y), `${sector.id}: agenda fora de ordem`);
    assert.equal(sector.schedule[0].at, mission.clock.start, `${sector.id} precisa existir desde o início`);
  }
  const clockDriven = mission.events.filter(e => e.trigger.type === 'battleClock' && e.sector !== 's1_west_bridgehead');
  assert.ok(new Set(clockDriven.map(e => e.sector)).size >= 2, 'eventos de outros setores dependem do relógio, não da proximidade');
});

test('M01 map geometry matches the documented bridges of 1939 and the measured piers', () => {
  const rail = layout.features.find(f => f.id === 'rail_bridge'), road = layout.features.find(f => f.id === 'road_bridge');
  assert.equal(road.polyline[0][2] - rail.polyline[0][2], 40, 'rodoviária 40 m ao sul da ferroviária (T05)');
  assert.ok(Math.abs(road.measuredAxisOffsetZ - 40) < 3, 'medição G01 coerente com os 40 m documentados');
  for (const bridge of [rail, road]) {
    const { supportsX: x, spansM } = bridge;
    assert.equal(spansM.length, 9, `${bridge.id}: 6 vãos originais + 3 da extensão de 1910–1912 (T25)`);
    assert.equal(x.length, spansM.length + 1, `${bridge.id}: um pilar/encontro por extremidade de vão`);
    assert.equal(bridge.polyline[1][0], x.at(-1), `${bridge.id}: polilinha termina no último pilar medido`);
    // Pilares medidos na geometria atual: tolerância de 15 % cobre encontros e vãos trocados depois de 1945.
    x.slice(1).forEach((v, i) => assert.ok(Math.abs(v - x[i] - spansM[i]) / spansM[i] < 0.15, `${bridge.id}: vão ${i + 1} mede ${(v - x[i]).toFixed(1)} m, documentado ${spansM[i]} m`));
    const [lo, hi] = bridge.lengthM['1912'];
    const total = x.at(-1) - x[0];
    assert.ok(total > lo * 0.98 && total < hi * 1.025, `${bridge.id}: ${total.toFixed(1)} m fora de ${lo}–${hi} m`);
  }
  const kept = measured.railBridge.supportsX.filter(v => !rail.postwarSupportsX.includes(v));
  assert.deepEqual(rail.supportsX, kept, 'pilares da ferroviária iguais a measurements.json, menos os pós-guerra');
  assert.deepEqual(road.supportsX, measured.roadBridge.supportsX);
  const east = layout.blastZones.find(z => z.id === 'bz_east'), west = layout.blastZones.find(z => z.id === 'bz_west');
  assert.ok(Math.abs(east.center[0] - rail.supportsX[6]) < 15, '06:10 no 6.º pilar (antigo encontro leste; T07, P13)');
  for (const v of rail.supportsX.slice(0, 2)) assert.ok(Math.abs(v - west.center[0]) < west.radiusM, '06:45 cobre o encontro oeste e o 1.º pilar (reconstrução T07/P13)');
  const bounds = layout.bounds.playable;
  for (const node of layout.coverNodes) assert.ok(inBox(node.position, bounds) && node.position[0] <= layout.bounds.softWarningX, `${node.id} fora da área jogável`);
  assert.equal(new Set(layout.coverNodes.map(n => n.id)).size, layout.coverNodes.length);
});

test('M01 debrief keeps unconfirmed paragraphs disabled until their checks pass', () => {
  const pending = new Set(research.match(/^\| (P\d+) \|/gm).map(row => row.slice(2, -2)));
  const checks = new Map(sourceChecks.split('\n').filter(row => /^\| P\d+ \|/.test(row)).map(row => {
    const columns = row.split('|');
    return [columns[1].trim(), columns[3].trim().replaceAll('`', '')];
  }));
  assert.deepEqual([...mission.historicalCertainty.pendingChecks].sort(), [...checks].filter(([, state]) => state !== 'RESOLVIDA').map(([id]) => id).sort(), 'JSON e verificação documental discordam');
  const readSources = new Set(sourcesDoc.split('\n').filter(row => /^\| (H\d{2}(?:-PDF)?|T\d{2}) \|/.test(row) && row.split('|')[5]?.includes('INTEGRAL')).map(row => row.split('|')[1].trim()));
  for (const id of mission.historicalCertainty.pendingChecks) assert.ok(pending.has(id), `pendência ${id} sem registro`);
  for (const paragraph of mission.debrief.paragraphs) if (paragraph.requires?.length) {
    assert.equal(paragraph.enabled, false, `${paragraph.id} depende de ${paragraph.requires} e não pode estar habilitado`);
    for (const id of paragraph.requires) assert.ok(pending.has(id));
  }
  for (const paragraph of mission.debrief.paragraphs.filter(p => p.enabled && p.id !== 'db_07')) {
    assert.ok(paragraph.sources?.length, `${paragraph.id}: texto histórico sem fonte`);
    for (const id of paragraph.sources) assert.ok(readSources.has(id), `${paragraph.id}: ${id} ainda não lida`);
  }
});

// T05a (M01-AUDIO-DATA-FIELDS-V1): presentation-only audio data. Nothing in src/ reads these fields.
const audioLayout = JSON.parse(read('missions/m01-tczew/audio-layout.json'));
const CLOCK_RE = /^\d{2}:\d{2}:\d{2}$/;
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isBox = (b, y = false) => !!b && typeof b === 'object' && ['minX', 'maxX', 'minZ', 'maxZ'].every(k => isNum(b[k])) && b.minX < b.maxX && b.minZ < b.maxZ
  && ['minY', 'maxY'].every(k => b[k] === undefined || (y && isNum(b[k]))) && (b.minY === undefined || b.maxY === undefined || b.minY < b.maxY);
// Returns a list of problems (empty = valid). Exported shape is local to this test so the contract is checked without touching src/.
function audioEmitterProblems(e, { weapons, lo, hi }) {
  const p = [];
  if (typeof e?.id !== 'string' || !/^ae_s\d_/.test(e.id)) p.push('id');
  if (!weapons.includes(e?.weapon)) p.push('weapon');
  if (!Array.isArray(e?.position) || e.position.length !== 3 || !e.position.every(isNum)) p.push('position');
  if (typeof e?.activeFrom !== 'string' || !CLOCK_RE.test(e.activeFrom)) p.push('activeFrom');
  else if (clockSeconds(e.activeFrom) < lo || clockSeconds(e.activeFrom) > hi) p.push('activeFrom range');
  if (e?.activeUntil !== undefined) {
    if (typeof e.activeUntil !== 'string' || !CLOCK_RE.test(e.activeUntil)) p.push('activeUntil');
    else if (p.length === 0 && clockSeconds(e.activeUntil) <= clockSeconds(e.activeFrom)) p.push('activeUntil order');
    else if (clockSeconds(e.activeUntil) > hi) p.push('activeUntil range');
  }
  if (e?.certainty !== undefined && !['DOCUMENTED', 'RECONSTRUCTED', 'GAMEPLAY_DRAMATIZATION'].includes(e.certainty)) p.push('certainty');
  if (e?.displayOnly !== undefined && typeof e.displayOnly !== 'boolean') p.push('displayOnly');
  return p;
}
function audioLayoutProblems(l) {
  const p = [];
  const reverbs = ['A', 'B'], materials = ['earth', 'wood', 'metal', 'stone', 'brick', 'water'];
  if (l?.presentationOnly !== true) p.push('presentationOnly');
  if (l?.missionId !== mission.id) p.push('missionId');
  if (!Array.isArray(l?.zones) || !Array.isArray(l?.surfaces)) return [...p, 'zones/surfaces'];
  const zoneIds = l.zones.map(z => z?.id);
  if (new Set(zoneIds).size !== zoneIds.length || !['open', 'bridge', 'station'].every(id => zoneIds.includes(id))) p.push('zone ids');
  for (const z of l.zones) {
    if (!reverbs.includes(z?.reverb)) p.push(`${z?.id}: reverb`);
    if (!Number.isInteger(z?.priority)) p.push(`${z?.id}: priority`);
    if (z?.default === true ? z.box !== undefined : !isBox(z?.box)) p.push(`${z?.id}: box`);
  }
  if (l.zones.filter(z => z?.default === true).length !== 1) p.push('single default zone');
  const surfaceIds = l.surfaces.map(s => s?.id);
  if (new Set(surfaceIds).size !== surfaceIds.length) p.push('surface ids');
  if (!materials.includes(l.defaultSurface)) p.push('defaultSurface');
  for (const s of l.surfaces) {
    if (!materials.includes(s?.material)) p.push(`${s?.id}: material`);
    if (!Number.isInteger(s?.priority)) p.push(`${s?.id}: priority`);
    if (!isBox(s?.box, true)) p.push(`${s?.id}: box`);
  }
  return p;
}
const emitters = mission.sectors.flatMap(s => (s.audioEmitters ?? []).map(e => ({ sector: s.id, ...e })));
const emitterContext = { weapons: mission.allowedEquipment, lo: clockSeconds(mission.clock.start), hi: clockSeconds(mission.clock.end) };

test('M01 audio emitters require activeFrom and keep valid windows; T47 retired the display-only casemate ckm (the real gun of post S2 is the only ckm of the west bridgehead)', () => {
  assert.deepEqual(emitters.map(e => e.id).sort(), ['ae_s2_ckm_east', 'ae_s2_mg_dike', 'ae_s2_mg_train']);
  for (const e of emitters) assert.deepEqual(audioEmitterProblems(e, emitterContext), [], e.id);
  assert.deepEqual(mission.sectors.find(s => s.id === 's1_west_bridgehead').audioEmitters, [], 'no dramatized ckm at the old casemate: it would double the real gun of post S2');
  assert.ok(emitters.every(e => e.displayOnly !== true && e.certainty !== 'GAMEPLAY_DRAMATIZATION'), 'no display-only emitter is left in the authored data');
  // The data the audio tests put back into a copy of the mission (tests/helpers/m01-retired-casemate.js) is still valid under the same validator and the same clock bounds,
  // so the crew gate and the scheduling tests keep exercising a real, valid dramatized emitter.
  assert.deepEqual(audioEmitterProblems(RETIRED_CASEMATE, emitterContext), []);
  assert.ok(clockSeconds(RETIRED_CASEMATE.activeUntil) <= clockSeconds(eventById('evt_m01_west_demolition').trigger.at), 'tripulação sai antes da demolição oeste');
  assert.equal(emitters.find(e => e.id === 'ae_s2_ckm_east').activeUntil, '06:00:00', 'valor anterior preservado');
  const sectorEvents = id => mission.sectors.find(s => s.id === id).schedule.map(s => s.at);
  assert.ok(sectorEvents('s2_east_bridgehead').includes(emitters.find(e => e.id === 'ae_s2_mg_train').activeFrom), 'ae_s2_mg_train começa num passo da agenda de s2');
});

test('M01 audio emitter validator rejects malformed entries', () => {
  const good = emitters.find(e => e.id === 'ae_s2_ckm_east');
  const bad = patch => audioEmitterProblems({ ...good, ...patch }, emitterContext);
  const { activeFrom, ...noFrom } = good;
  assert.deepEqual(audioEmitterProblems(noFrom, emitterContext), ['activeFrom']);
  assert.deepEqual(bad({ activeFrom: '4:46' }), ['activeFrom']);
  assert.deepEqual(bad({ activeFrom: '04:00:00' }), ['activeFrom range']);
  assert.deepEqual(bad({ activeUntil: '04:45:00' }), ['activeUntil order']);
  assert.deepEqual(bad({ activeUntil: '09:00:00' }), ['activeUntil range']);
  assert.deepEqual(bad({ weapon: 'mg42' }), ['weapon']);
  assert.deepEqual(bad({ position: [1, 2] }), ['position']);
  assert.deepEqual(bad({ position: [1, 2, NaN] }), ['position']);
  assert.deepEqual(bad({ id: 'x' }), ['id']);
  assert.deepEqual(bad({ certainty: 'GUESS' }), ['certainty']);
});

test('M01 audio-layout.json declares the open, bridge and station zones and surfaces, and is not part of map-layout.json', () => {
  assert.deepEqual(audioLayoutProblems(audioLayout), []);
  assert.equal(layout.audioZones, undefined);
  assert.equal(layout.surfaces, undefined);
  const zone = id => audioLayout.zones.find(z => z.id === id);
  assert.equal(zone('open').default, true);
  assert.equal(zone('open').reverb, 'A');
  assert.equal(zone('bridge').reverb, 'B');
  assert.equal(zone('bridge').occlusion, null, 'ponte semiaberta: sem oclusão');
  assert.equal(zone('station').reverb, 'B');
  assert.ok(zone('station').priority > zone('bridge').priority && zone('bridge').priority > zone('open').priority);
  const rail = layout.features.find(f => f.id === 'rail_bridge'), road = layout.features.find(f => f.id === 'road_bridge');
  const b = zone('bridge').box;
  assert.ok(b.minX <= rail.polyline[0][0] && b.maxX >= rail.polyline[1][0] && b.minZ < rail.polyline[0][2] && b.maxZ > road.polyline[0][2], 'zona bridge cobre as duas pontes');
  const polyBox = poly => ({ minX: Math.min(...poly.map(p => p[0])), maxX: Math.max(...poly.map(p => p[0])), minZ: Math.min(...poly.map(p => p[1])), maxZ: Math.max(...poly.map(p => p[1])) });
  const station = layout.features.find(f => f.id === 'tczew_station');
  assert.deepEqual(zone('station').box, polyBox(station.polygon), 'zona station = polígono da estação');
  assert.deepEqual(audioLayout.surfaces.find(s => s.id === 'tczew_station').box, polyBox(station.polygon));
  assert.deepEqual(audioLayout.surfaces.find(s => s.id === 'rail_hut').box, polyBox(layout.features.find(f => f.id === 'rail_hut').polygon));
  assert.deepEqual(new Set(audioLayout.surfaces.map(s => s.material)), new Set(['metal', 'water', 'stone', 'brick', 'wood']));
  assert.equal(audioLayout.defaultSurface, 'earth');
  for (const s of audioLayout.surfaces) assert.ok(s.material !== audioLayout.defaultSurface, s.id);
});

test('M01 audio-layout validator rejects malformed zones and surfaces', () => {
  const clone = () => structuredClone(audioLayout);
  const mutate = fn => { const l = clone(); fn(l); return audioLayoutProblems(l); };
  assert.ok(mutate(l => { l.zones = l.zones.filter(z => z.id !== 'bridge'); }).includes('zone ids'));
  assert.ok(mutate(l => { l.zones.push({ ...l.zones[1] }); }).includes('zone ids'));
  assert.ok(mutate(l => { l.zones[1].reverb = 'C'; }).includes('bridge: reverb'));
  assert.ok(mutate(l => { delete l.zones[2].box; }).includes('station: box'));
  assert.ok(mutate(l => { l.zones[2].box = { minX: 5, maxX: 1, minZ: 0, maxZ: 1 }; }).includes('station: box'));
  assert.ok(mutate(l => { l.zones[0].box = l.zones[1].box; }).includes('open: box'));
  assert.ok(mutate(l => { l.zones[1].priority = 'hi'; }).includes('bridge: priority'));
  assert.ok(mutate(l => { l.zones[1].default = true; }).includes('single default zone'));
  assert.ok(mutate(l => { l.surfaces[0].material = 'glass'; }).includes('bridge_deck: material'));
  assert.ok(mutate(l => { l.surfaces[0].box.minX = 'x'; }).includes('bridge_deck: box'));
  assert.ok(mutate(l => { l.surfaces[1].box.minY = 3; l.surfaces[1].box.maxY = 1; }).includes('vistula_channel: box'));
  assert.ok(mutate(l => { l.surfaces[1].id = l.surfaces[0].id; }).includes('surface ids'));
  assert.ok(mutate(l => { l.defaultSurface = 'lava'; }).includes('defaultSurface'));
  assert.ok(mutate(l => { l.presentationOnly = false; }).includes('presentationOnly'));
  assert.ok(mutate(l => { l.missionId = 'm02'; }).includes('missionId'));
  assert.deepEqual(audioLayoutProblems({}), ['presentationOnly', 'missionId', 'zones/surfaces']);
});
