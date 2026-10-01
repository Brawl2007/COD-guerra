// Validação dos dados de roteiro/mapa de M01 (Tczew). Confere contratos e referências cruzadas;
// não substitui jogar a missão (Prompt §80).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const mission = JSON.parse(read('missions/m01-tczew/mission.json'));
const layout = JSON.parse(read('missions/m01-tczew/map-layout.json'));
const equipment = JSON.parse(read('research/equipment-timeline.json'));
const research = read('missions/m01-tczew/HISTORICAL_RESEARCH.md');
const sourcesDoc = read('research/SOURCES.md');
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
  assert.equal(at('evt_m01_west_demolition'), clockSeconds('06:40:00'));
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
  const cited = [...mission.sources, ...mission.events.flatMap(e => e.sources), ...layout.features.flatMap(f => f.sources ?? []), ...equipment.items.flatMap(i => i.sources)];
  for (const id of cited) assert.ok(knownSources.has(id), `fonte sem registro em research/SOURCES.md: ${id}`);
});

test('M01 checkpoints accumulate state and never save inside a demolition zone', () => {
  const [a, b, c, d] = ['cp_m01_a_orientacao', 'cp_m01_b_reorganizacao', 'cp_m01_c_engenheiros', 'cp_m01_d_retirada'].map(id => mission.checkpoints.find(cp => cp.id === id));
  for (const [earlier, later] of [[a, b], [b, c], [c, d]]) {
    for (const id of earlier.restore.eventsConsumed) assert.ok(later.restore.eventsConsumed.includes(id), `${later.id} perdeu ${id}`);
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
  for (const v of rail.supportsX.slice(0, 2)) assert.ok(Math.abs(v - west.center[0]) < west.radiusM, '06:40 cobre o encontro oeste e o 1.º pilar (T07)');
  const bounds = layout.bounds.playable;
  for (const node of layout.coverNodes) assert.ok(inBox(node.position, bounds) && node.position[0] <= layout.bounds.softWarningX, `${node.id} fora da área jogável`);
  assert.equal(new Set(layout.coverNodes.map(n => n.id)).size, layout.coverNodes.length);
});

test('M01 debrief keeps unconfirmed paragraphs disabled until their checks pass', () => {
  const pending = new Set(research.match(/^\| (P\d+) \|/gm).map(row => row.slice(2, -2)));
  for (const id of mission.historicalCertainty.pendingChecks) assert.ok(pending.has(id), `pendência ${id} sem registro`);
  for (const paragraph of mission.debrief.paragraphs) if (paragraph.requires?.length) {
    assert.equal(paragraph.enabled, false, `${paragraph.id} depende de ${paragraph.requires} e não pode estar habilitado`);
    for (const id of paragraph.requires) assert.ok(pending.has(id));
  }
});
