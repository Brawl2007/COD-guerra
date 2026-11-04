// M02-FIX-2 (SAVE-01/SAVE-02, PDF I2/I5): schema do snapshot M02 e armazenamento persistente dos checkpoints.
//   - Schema v2 do snapshot: identidade da missão, semente e estado do gerador, data narrativa, versão do layout da célula.
//     Um snapshot v1 (`m02-01-bench-snapshot-v1`, sem `rng`) é REJEITADO com erro explícito, sem migração: o estado do
//     gerador não pode ser reconstruído sem inventar uma continuação diferente, e nenhum save v1 foi alguma vez persistido
//     (os checkpoints v1 viviam só num Map em memória da sessão).
//   - M02SaveStore: adaptador de armazenamento injetável (getItem/setItem/removeItem). No browser usa localStorage quando existe
//     e responde; em Node usa memória (uma instância por loja, sem fugas entre simulações). Escrita em três passos:
//     slot `:staging` → reler e validar → promover (o save confirmado anterior passa a `:previous`). Dados corrompidos são
//     rejeitados sem apagar o save bom; uma falha de escrita mantém o save anterior. Nunca lança: devolve { ok, reason }.
//   - FIX-2b: validação checkpoint a checkpoint (um incompatível não invalida o registo); commit abortado se `current`
//     existir mas não for legível/válido; compare-and-swap de `current` antes de promover (outro separador).
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

/** Tentativas de um commit quando outro separador grava entre a leitura e a promoção (compare-and-swap falhado). */
export const M02_SAVE_COMMIT_ATTEMPTS = 3;

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
    this.confirmedInfo = null;
  }

  #get(slotKey) {
    try {
      const raw = this.storage.getItem(slotKey);
      return { ok: true, raw: raw ?? null };
    } catch (error) {
      return { ok: false, raw: null, reason: `Leitura do armazenamento falhou (${slotKey}): ${errorText(error)}` };
    }
  }

  /** Estrutura do registo: formato, versão, missão, sequência, mapa de checkpoints e último checkpoint. Não valida snapshots. */
  validateRecordShape(record) {
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
    return { valid: true, reason: null };
  }

  /**
   * Valida checkpoint a checkpoint (FIX-2b): um snapshot incompatível (p. ex. gravado com outra versão do layout) fica em
   * `rejected` e não invalida os outros checkpoints do registo.
   */
  inspectRecord(record) {
    const shape = this.validateRecordShape(record);
    if (!shape.valid) return { valid: false, reason: shape.reason, loadable: {}, rejected: [] };
    const loadable = {};
    const rejected = [];
    for (const [id, snap] of Object.entries(record.checkpoints)) {
      if (!snap || typeof snap !== 'object' || snap.checkpointId !== id) {
        rejected.push({ id, reason: `Checkpoint ${id} com identificador inconsistente.` });
        continue;
      }
      const check = this.validateSnapshot(snap);
      if (check.valid) loadable[id] = snap;
      else rejected.push({ id, reason: `Checkpoint ${id}: ${check.reason}` });
    }
    return { valid: true, reason: null, loadable, rejected };
  }

  /** Registo utilizável: estrutura válida e pelo menos um checkpoint compatível. */
  validateRecord(record) {
    const info = this.inspectRecord(record);
    if (!info.valid) return { valid: false, reason: info.reason };
    if (Object.keys(info.loadable).length === 0) {
      return { valid: false, reason: `Nenhum checkpoint compatível: ${info.rejected.map((r) => r.reason).join(' | ')}` };
    }
    return { valid: true, reason: null };
  }

  /** Interpreta um valor cru (JSON → estrutura → checkpoints), com cache de uma entrada para o último valor aceite. */
  #interpret(raw) {
    if (raw === this.confirmedRaw && this.confirmedInfo) {
      return { ok: true, record: this.confirmedRecord, info: this.confirmedInfo };
    }
    let record;
    try {
      record = JSON.parse(raw);
    } catch (error) {
      return { ok: false, json: true, reason: `JSON: ${errorText(error)}` };
    }
    const info = this.inspectRecord(record);
    if (!info.valid) return { ok: false, reason: info.reason };
    this.confirmedRaw = raw;
    this.confirmedRecord = record;
    this.confirmedInfo = info;
    return { ok: true, record, info };
  }

  /**
   * Lê e valida um slot. Nunca lança. `ok` exige estrutura válida e pelo menos um checkpoint compatível; os checkpoints
   * incompatíveis vêm em `rejectedCheckpoints`.
   */
  readSlot(slot) {
    const slotKey = this.slots[slot];
    if (!slotKey) return { ok: false, reason: `Slot desconhecido: ${slot}.` };
    const got = this.#get(slotKey);
    if (!got.ok) return { ok: false, readError: true, reason: got.reason };
    if (got.raw === null) return { ok: false, empty: true, reason: `Slot ${slot} vazio.` };
    const parsed = this.#interpret(got.raw);
    if (!parsed.ok) {
      const what = parsed.json ? `corrompido em ${slot} (${parsed.reason})` : `rejeitado em ${slot}: ${parsed.reason}`;
      return { ok: false, corrupt: true, raw: got.raw, reason: `Save M02 ${what}` };
    }
    const { record, info } = parsed;
    if (Object.keys(info.loadable).length === 0) {
      return {
        ok: false,
        incompatible: true,
        raw: got.raw,
        record,
        rejectedCheckpoints: info.rejected,
        reason: `Save M02 rejeitado em ${slot}: nenhum checkpoint compatível — ${info.rejected.map((r) => r.reason).join(' | ')}`,
      };
    }
    return { ok: true, raw: got.raw, record, loadable: info.loadable, rejectedCheckpoints: info.rejected };
  }

  /**
   * O save confirmado: `current` se for utilizável, senão `previous`. Slots inválidos são relatados em `rejected`
   * e deixados intactos (nada é apagado na leitura).
   */
  load() {
    const rejected = [];
    for (const slot of ['current', 'previous']) {
      const res = this.readSlot(slot);
      if (res.ok) {
        return {
          ok: true,
          source: slot,
          raw: res.raw,
          record: res.record,
          loadable: res.loadable,
          rejectedCheckpoints: res.rejectedCheckpoints,
          rejected,
        };
      }
      if (!res.empty) rejected.push({ slot, reason: res.reason });
    }
    return { ok: false, source: null, record: null, rejected, reason: rejected[0]?.reason ?? 'Sem save M02.' };
  }

  /** O último checkpoint gravado, se for compatível com esta versão; senão null. */
  latestCheckpointId() {
    const loaded = this.load();
    if (!loaded.ok) return null;
    const id = loaded.record.latestCheckpointId;
    return loaded.loadable[id] ? id : null;
  }

  /** IDs dos checkpoints compatíveis do save confirmado. */
  checkpointIds() {
    const loaded = this.load();
    return loaded.ok ? Object.keys(loaded.loadable) : [];
  }

  /** Cópia independente do snapshot persistido (já validado): de `current`, senão de `previous`; ou null. */
  loadCheckpoint(checkpointId) {
    for (const slot of ['current', 'previous']) {
      const res = this.readSlot(slot);
      if (res.ok && res.loadable[checkpointId]) return structuredClone(res.loadable[checkpointId]);
    }
    return null;
  }

  /**
   * Grava `snapshot` como `checkpointId`. Passos (SAVE-02): validar o snapshot → ler `current` → escrever o registo novo
   * em `:staging` → reler e validar o que ficou escrito → compare-and-swap: `current` tem de ser ainda o que foi lido →
   * copiar o `current` confirmado para `:previous` → promover o novo para `current`.
   * FIX-2b: se `current` existir mas não puder ser lido ou não for um registo válido, o commit é abortado e relatado
   * (reconstruir a partir de `:previous` perdia os checkpoints só presentes em `current`, p. ex. o F5). Se outro separador
   * gravou entretanto, o commit recomeça sobre o registo novo (até M02_SAVE_COMMIT_ATTEMPTS vezes). Qualquer falha devolve
   * { ok:false } e deixa `current`/`previous` como estavam.
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
    let conflict = null;
    for (let attempt = 1; attempt <= M02_SAVE_COMMIT_ATTEMPTS; attempt++) {
      const res = this.#commitOnce(checkpointId, snapshot);
      if (!res.conflict) return res;
      conflict = res.reason;
    }
    return {
      ok: false,
      reason: `Gravação concorrente persistente (outro separador?); save não alterado depois de ${M02_SAVE_COMMIT_ATTEMPTS} tentativas: ${conflict}`,
    };
  }

  #commitOnce(checkpointId, snapshot) {
    const { current, previous, staging } = this.slots;
    const cur = this.#get(current);
    if (!cur.ok) {
      return {
        ok: false,
        reason: `Commit abortado, nada foi alterado: ${cur.reason}. O save atual não é reconstruído a partir de :previous.`,
      };
    }
    let baseRecord = null;
    let baseLoadable = {};
    let currentConfirmed = false;
    if (cur.raw !== null) {
      const parsed = this.#interpret(cur.raw);
      if (!parsed.ok) {
        return {
          ok: false,
          reason:
            `Commit abortado, nada foi alterado: save atual ilegível ou inválido (${parsed.reason}). ` +
            'O save atual não é reconstruído a partir de :previous.',
        };
      }
      baseRecord = parsed.record;
      baseLoadable = parsed.info.loadable;
      currentConfirmed = Object.keys(baseLoadable).length > 0;
    } else {
      // `current` vazio: o save confirmado anterior (se houver) é a base; nada se perde.
      const prev = this.readSlot('previous');
      if (prev.ok) {
        baseRecord = prev.record;
        baseLoadable = prev.loadable;
      }
    }

    const checkpoints = {};
    if (baseRecord) {
      let previousLoadable = null;
      for (const [id, snap] of Object.entries(baseRecord.checkpoints)) {
        if (baseLoadable[id]) {
          checkpoints[id] = snap;
          continue;
        }
        // Incompatível na base: usa a versão compatível de :previous, se existir; senão fica tal como estava (nunca é
        // carregado, mas não é apagado — uma migração futura pode recuperá-lo).
        if (previousLoadable === null) {
          const prev = cur.raw !== null ? this.readSlot('previous') : null;
          previousLoadable = prev?.ok ? prev.loadable : {};
        }
        checkpoints[id] = previousLoadable[id] ?? snap;
      }
    }
    checkpoints[checkpointId] = snapshot;
    const next = {
      format: M02_SAVE_RECORD_FORMAT,
      formatVersion: M02_SAVE_RECORD_VERSION,
      missionId: M02_MISSION_ID,
      seq: (baseRecord?.seq ?? 0) + 1,
      latestCheckpointId: checkpointId,
      checkpoints,
    };

    let raw;
    try {
      raw = JSON.stringify(next);
    } catch (error) {
      return { ok: false, reason: `Serialização do save M02 falhou: ${errorText(error)}` };
    }

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
    const recordCheck = this.inspectRecord(reparsed);
    if (!recordCheck.valid || !recordCheck.loadable[checkpointId]) {
      this.#discardStaging();
      const why = recordCheck.reason ?? recordCheck.rejected.find((r) => r.id === checkpointId)?.reason;
      return { ok: false, reason: `Slot temporário inválido: ${why}` };
    }

    // Compare-and-swap: `current` tem de ser ainda exatamente o que foi lido (mesma seq). O localStorage não tem escrita
    // atómica entre separadores; isto reduz a janela leitura→promoção ao intervalo entre esta releitura e o setItem.
    const again = this.#get(current);
    if (!again.ok) {
      this.#discardStaging();
      return { ok: false, reason: `Commit abortado, nada foi alterado: ${again.reason}` };
    }
    if (again.raw !== cur.raw) {
      this.#discardStaging();
      return { ok: false, conflict: true, reason: `current mudou entre a leitura (seq ${baseRecord?.seq ?? 0}) e a promoção.` };
    }

    try {
      // Só um `current` confirmado passa a `previous`: um `current` sem checkpoints compatíveis nunca substitui o anterior.
      if (currentConfirmed) this.storage.setItem(previous, cur.raw);
      this.storage.setItem(current, raw);
    } catch (error) {
      this.#discardStaging();
      return { ok: false, reason: `Promoção do save M02 falhou; mantido o save anterior: ${errorText(error)}` };
    }
    this.#discardStaging();
    this.confirmedRaw = raw;
    this.confirmedRecord = reparsed;
    this.confirmedInfo = recordCheck;
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
    this.confirmedInfo = null;
    return ok;
  }
}
