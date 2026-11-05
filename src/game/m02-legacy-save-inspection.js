// Read-only discovery of saves created by the separate Codex M02 candidate.
// This does not validate gameplay compatibility or perform a migration.
export const M02_CODEX_LEGACY_SAVE_KEY = 'cod-guerra:checkpoint:m02:v1';

export function inspectCodexLegacySave(storage) {
  let raw;
  try { raw = storage.getItem(M02_CODEX_LEGACY_SAVE_KEY); }
  catch { return { status: 'unavailable' }; }
  if (raw === null) return { status: 'missing' };
  let value;
  try { value = JSON.parse(raw); }
  catch { return { status: 'invalid' }; }
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 ||
      typeof value.id !== 'string' || !value.id || !value.snapshot || typeof value.snapshot !== 'object' || Array.isArray(value.snapshot)) {
    return { status: 'invalid' };
  }
  if (value.snapshot.schema !== 'm02-01-bench-snapshot-v1') return { status: 'unsupported' };
  const rng = value.snapshot.rngState;
  if (rng !== undefined && (!Number.isInteger(rng) || rng < 0 || rng > 0xffffffff)) return { status: 'invalid' };
  // Do not claim that an envelope is loadable: the two simulation schemas,
  // layouts and mission flags must still be reconciled and validated.
  return { status: 'requires-review', checkpointId: value.id, hasRngState: rng !== undefined };
}
