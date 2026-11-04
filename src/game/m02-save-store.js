// M02-FIX-2 (SAVE-01/SAVE-02, PDF I2/I5): schema do snapshot M02 e armazenamento persistente dos checkpoints.
//   - Schema v2 do snapshot: identidade da missão, semente e estado do gerador, data narrativa, versão do layout da célula.
//     Um snapshot v1 (`m02-01-bench-snapshot-v1`, sem `rng`) é REJEITADO com erro explícito, sem migração: o estado do
//     gerador não pode ser reconstruído sem inventar uma continuação diferente, e nenhum save v1 foi alguma vez persistido
//     (os checkpoints v1 viviam só num Map em memória da sessão).
//   - M02SaveStore: adaptador de armazenamento injetável (getItem/setItem/removeItem). No browser usa localStorage quando existe
//     e responde; em Node usa memória (uma instância por loja, sem fugas entre simulações). Escrita em três passos:
//     slot `:staging` → reler e validar → promover (o save confirmado anterior passa a `:previous`). Dados corrompidos são
//     rejeitados sem apagar o save bom; uma falha de escrita mantém o save anterior. Nunca lança: devolve { ok, reason }.
// Sem DOM, sem renderer, sem relógio de parede.
import cellALayout from '../../missions/m02-bzura/m02-01-quinta-layout.json' with { type: 'json' };
import cellsBCLayout from '../../missions/m02-bzura/m02-cells-bc-layout.json' with { type: 'json' };
import { buildCellWorldLayout } from '../world/m02-zone-streamer.js';

export const M02_MISSION_ID = 'M02';
export const M02_SNAPSHOT_SCHEMA = 'm02-bench-snapshot';
export const M02_SNAPSHOT_SCHEMA_VERSION = 2;
export const M02_LEGACY_SNAPSHOT_SCHEMA_V1 = 'm02-01-bench-snapshot-v1';
/** O gerador de src/core/random.js (LCG 32 bits, constantes Numerical Recipes). Mudar o algoritmo invalida os saves. */
export const M02_RNG_ALGORITHM = 'core-random-lcg32-v1';

export const M02_CELL_IDS = Object.freeze(['A', 'B', 'C']);

/** Versão do layout de cada célula: um save só é compatível com a versão de layout com que foi gravado (PDF I5). */
export const M02_LAYOUT_SCHEMA_BY_CELL = Object.freeze({
  A: cellALayout.schema,
  B: cellsBCLayout.schema,
  C: cellsBCLayout.schema,
});

/**
 * Data narrativa por estado temporal (PDF I1). Sem hora civil: TIME-01 ainda não a fixou, por isso `civilTime` fica null
 * em vez de uma hora inventada.
 */
export const M02_NARRATIVE_CALENDAR = Object.freeze({
  T0: Object.freeze({ narrativeDate: '1939-09-09', dayPart: 'fim da tarde' }),
  T1: Object.freeze({ narrativeDate: '1939-09-09', dayPart: 'noite de 9 para 10 de setembro' }),
  T2: Object.freeze({ narrativeDate: '1939-09-10', dayPart: 'manhã' }),
  T3: Object.freeze({ narrativeDate: '1939-09-10', dayPart: 'tarde' }),
});

export function m02NarrativeStamp(temporalState) {
  const entry = M02_NARRATIVE_CALENDAR[temporalState];
  if (!entry) return null;
  return { temporalState, narrativeDate: entry.narrativeDate, dayPart: entry.dayPart, civilTime: null };
}

const interactiveIdsCache = new Map();

/** IDs de portas, janelas e cercas que existem na versão atual do layout da célula (dados derivados e imutáveis). */
export function m02CellInteractiveIds(cellId) {
  if (!M02_CELL_IDS.includes(cellId)) return null;
  let ids = interactiveIdsCache.get(cellId);
  if (!ids) {
    const cellLayout = buildCellWorldLayout(cellId);
    const doors = new Set();
    const windows = new Set();
    const fences = new Set();
    for (const b of cellLayout.buildings ?? []) {
      for (const d of b.doors ?? []) doors.add(d.id);
      for (const w of b.windows ?? []) windows.add(w.id);
    }
    for (const c of cellLayout.exteriorCovers ?? []) {
      if (c.destructibleFence) fences.add(c.id);
    }
    ids = Object.freeze({ doors, windows, fences });
    interactiveIdsCache.set(cellId, ids);
  }
  return ids;
}

/** Caminho do primeiro número não finito (NaN/±Infinity) — o JSON transformá-lo-ia em null e o restauro divergiria. */
export function findNonFiniteNumber(value, path = '$') {
  if (typeof value === 'number') return Number.isFinite(value) ? null : path;
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findNonFiniteNumber(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  for (const [k, v] of Object.entries(value)) {
    const hit = findNonFiniteNumber(v, `${path}.${k}`);
    if (hit) return hit;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Armazenamento

export const M02_SAVE_STORAGE_KEY = 'cod-guerra:m02:bench:v2';
export const M02_SAVE_RECORD_FORMAT = 'cod-guerra-m02-bench-save';
export const M02_SAVE_RECORD_VERSION = 2;

/** Armazenamento em memória com a interface de localStorage (Node, testes, browser sem localStorage). */
export function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial).map(([k, v]) => [k, String(v)]));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    keys() {
      return [...map.keys()];
    },
  };
}

/** localStorage do browser, se existir e aceitar escrita; null em Node ou quando o browser o bloqueia. */
export function detectBrowserStorage() {
  if (globalThis.process?.versions?.node) return null;
  try {
    const ls = globalThis.localStorage;
    if (!ls || typeof ls.getItem !== 'function' || typeof ls.setItem !== 'function' || typeof ls.removeItem !== 'function') {
      return null;
    }
    const probe = `${M02_SAVE_STORAGE_KEY}:probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

export function resolveDefaultStorage() {
  return detectBrowserStorage() ?? createMemoryStorage();
}

function errorText(error) {
  return error && typeof error.message === 'string' ? error.message : String(error);
}

export class M02SaveStore {
  /**
   * @param {object} options
   * @param {{getItem:Function,setItem:Function,removeItem:Function}} [options.storage]
   * @param {string} [options.key] chave base; os slots são `${key}`, `${key}:previous` e `${key}:staging`
   * @param {(snap:object)=>{valid:boolean,reason:string|null}} options.validateSnapshot validador do snapshot (validateM02Snapshot)
   */
  constructor({ storage = null, key = M02_SAVE_STORAGE_KEY, validateSnapshot } = {}) {
    if (typeof validateSnapshot !== 'function') {
      throw new Error('M02SaveStore precisa de validateSnapshot.');
    }
    this.storage = storage ?? resolveDefaultStorage();
    this.key = key;
    this.validateSnapshot = validateSnapshot;
    this.slots = Object.freeze({ current: key, previous: `${key}:previous`, staging: `${key}:staging` });
    this.confirmedRaw = null;
    this.confirmedRecord = null;
  }

  #get(slotKey) {
    try {
      const raw = this.storage.getItem(slotKey);
      return { ok: true, raw: raw ?? null };
    } catch (error) {
      return { ok: false, raw: null, reason: `Leitura do armazenamento falhou (${slotKey}): ${errorText(error)}` };
    }
  }

  /** Valida um registo já interpretado: formato, versão, missão e cada snapshot com o validador da simulação. */
  validateRecord(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      return { valid: false, reason: 'Registo de save M02 ausente ou não é um objeto.' };
    }
    if (record.format !== M02_SAVE_RECORD_FORMAT || record.formatVersion !== M02_SAVE_RECORD_VERSION) {
      return { valid: false, reason: `Formato de save M02 incompatível: ${record.format}@${record.formatVersion}.` };
    }
    if (record.missionId !== M02_MISSION_ID) {
      return { valid: false, reason: `Save de outra missão: ${record.missionId}.` };
    }
    if (!Number.isSafeInteger(record.seq) || record.seq < 1) {
      return { valid: false, reason: 'Sequência do save M02 inválida.' };
    }
    if (!record.checkpoints || typeof record.checkpoints !== 'object' || Array.isArray(record.checkpoints)) {
      return { valid: false, reason: 'Lista de checkpoints do save M02 inválida.' };
    }
    const ids = Object.keys(record.checkpoints);
    if (ids.length === 0) return { valid: false, reason: 'Save M02 sem checkpoints.' };
    if (typeof record.latestCheckpointId !== 'string' || !ids.includes(record.latestCheckpointId)) {
      return { valid: false, reason: `Último checkpoint do save M02 inexistente: ${record.latestCheckpointId}.` };
    }
    for (const id of ids) {
      const snap = record.checkpoints[id];
      if (!snap || snap.checkpointId !== id) {
        return { valid: false, reason: `Checkpoint ${id} com identificador inconsistente.` };
      }
      const check = this.validateSnapshot(snap);
      if (!check.valid) return { valid: false, reason: `Checkpoint ${id}: ${check.reason}` };
    }
    return { valid: true, reason: null };
  }

  /** Lê e valida um slot. Nunca lança. */
  readSlot(slot) {
    const slotKey = this.slots[slot];
    if (!slotKey) return { ok: false, reason: `Slot desconhecido: ${slot}.` };
    const got = this.#get(slotKey);
    if (!got.ok) return { ok: false, reason: got.reason };
    if (got.raw === null) return { ok: false, empty: true, reason: `Slot ${slot} vazio.` };
    if (got.raw === this.confirmedRaw && this.confirmedRecord) {
      return { ok: true, raw: got.raw, record: this.confirmedRecord };
    }
    let record;
    try {
      record = JSON.parse(got.raw);
    } catch (error) {
      return { ok: false, raw: got.raw, reason: `Save M02 corrompido em ${slot} (JSON): ${errorText(error)}` };
    }
    const check = this.validateRecord(record);
    if (!check.valid) return { ok: false, raw: got.raw, reason: `Save M02 rejeitado em ${slot}: ${check.reason}` };
    return { ok: true, raw: got.raw, record };
  }

  /**
   * O save confirmado: `current` se for válido, senão `previous`. Slots inválidos são relatados em `rejected`
   * e deixados intactos (nada é apagado na leitura).
   */
  load() {
    const rejected = [];
    for (const slot of ['current', 'previous']) {
      const res = this.readSlot(slot);
      if (res.ok) {
        this.confirmedRaw = res.raw;
        this.confirmedRecord = res.record;
        return { ok: true, source: slot, raw: res.raw, record: res.record, rejected };
      }
      if (!res.empty) rejected.push({ slot, reason: res.reason });
    }
    return { ok: false, source: null, record: null, rejected, reason: rejected[0]?.reason ?? 'Sem save M02.' };
  }

  latestCheckpointId() {
    const loaded = this.load();
    return loaded.ok ? loaded.record.latestCheckpointId : null;
  }

  checkpointIds() {
    const loaded = this.load();
    return loaded.ok ? Object.keys(loaded.record.checkpoints) : [];
  }

  /** Cópia independente do snapshot persistido (já validado), ou null. */
  loadCheckpoint(checkpointId) {
    const loaded = this.load();
    if (!loaded.ok) return null;
    const snap = loaded.record.checkpoints[checkpointId];
    return snap ? structuredClone(snap) : null;
  }

  /**
   * Grava `snapshot` como `checkpointId`. Passos (SAVE-02): validar o snapshot → escrever o registo novo em `:staging`
   * → reler e validar o que ficou escrito → copiar o `current` confirmado para `:previous` → promover o novo para `current`.
   * Qualquer falha devolve { ok:false } e deixa `current`/`previous` como estavam.
   */
  commitCheckpoint(checkpointId, snapshot) {
    if (typeof checkpointId !== 'string' || !checkpointId) {
      return { ok: false, reason: 'Identificador de checkpoint inválido.' };
    }
    const snapCheck = this.validateSnapshot(snapshot);
    if (!snapCheck.valid) return { ok: false, reason: `Snapshot recusado antes de gravar: ${snapCheck.reason}` };
    if (snapshot.checkpointId !== checkpointId) {
      return { ok: false, reason: `Snapshot com checkpointId ${snapshot.checkpointId} gravado como ${checkpointId}.` };
    }

    const base = this.load();
    const baseRecord = base.ok ? base.record : null;
    const next = {
      format: M02_SAVE_RECORD_FORMAT,
      formatVersion: M02_SAVE_RECORD_VERSION,
      missionId: M02_MISSION_ID,
      seq: (baseRecord?.seq ?? 0) + 1,
      latestCheckpointId: checkpointId,
      checkpoints: { ...(baseRecord?.checkpoints ?? {}), [checkpointId]: snapshot },
    };

    let raw;
    try {
      raw = JSON.stringify(next);
    } catch (error) {
      return { ok: false, reason: `Serialização do save M02 falhou: ${errorText(error)}` };
    }

    const { current, previous, staging } = this.slots;
    try {
      this.storage.setItem(staging, raw);
    } catch (error) {
      this.#discardStaging();
      return { ok: false, reason: `Escrita do slot temporário falhou: ${errorText(error)}` };
    }

    const readBack = this.#get(staging);
    if (!readBack.ok || readBack.raw !== raw) {
      this.#discardStaging();
      return { ok: false, reason: readBack.reason ?? 'Slot temporário relido não coincide com o escrito.' };
    }
    let reparsed;
    try {
      reparsed = JSON.parse(readBack.raw);
    } catch (error) {
      this.#discardStaging();
      return { ok: false, reason: `Slot temporário ilegível: ${errorText(error)}` };
    }
    const recordCheck = this.validateRecord(reparsed);
    if (!recordCheck.valid) {
      this.#discardStaging();
      return { ok: false, reason: `Slot temporário inválido: ${recordCheck.reason}` };
    }

    try {
      // Só um `current` confirmado passa a `previous`: um `current` corrompido nunca substitui o save bom anterior.
      if (base.ok && base.source === 'current') this.storage.setItem(previous, base.raw);
      this.storage.setItem(current, raw);
    } catch (error) {
      this.#discardStaging();
      return { ok: false, reason: `Promoção do save M02 falhou; mantido o save anterior: ${errorText(error)}` };
    }
    this.#discardStaging();
    this.confirmedRaw = raw;
    this.confirmedRecord = reparsed;
    return { ok: true, seq: next.seq, checkpointId, bytes: raw.length, reason: null };
  }

  #discardStaging() {
    try {
      this.storage.removeItem(this.slots.staging);
    } catch {
      // O slot temporário nunca é lido como save; deixá-lo ficar não afeta `current` nem `previous`.
    }
  }

  /** Apaga os três slots (novo jogo). Devolve false se o armazenamento recusar. */
  clear() {
    let ok = true;
    for (const slotKey of Object.values(this.slots)) {
      try {
        this.storage.removeItem(slotKey);
      } catch {
        ok = false;
      }
    }
    this.confirmedRaw = null;
    this.confirmedRecord = null;
    return ok;
  }
}
