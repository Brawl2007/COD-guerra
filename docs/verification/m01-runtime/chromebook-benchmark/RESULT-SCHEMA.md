# Estrutura do resultado

O ficheiro é JSON e usa `schemaVersion: 1`.

Exemplo **estrutural**; os números abaixo são apenas ilustrativos, não são medições do projeto:

```json
{
  "schemaVersion": 1,
  "kind": "M01 Chromebook benchmark instrument",
  "timestamp": "2026-10-03T00:00:00.000Z",
  "commit": "git-sha-or-null",
  "environment": "chromebook",
  "mode": "automated",
  "quality": "low",
  "requestedViewport": { "width": 1280, "height": 720 },
  "warmupSeconds": 5,
  "durationSeconds": 10,
  "scenarios": [
    {
      "name": "repair",
      "scenarioSource": "saved-snapshot",
      "sourceId": "route.combatSnapshots.repairThreat",
      "loading": {
        "pageLoadMs": 1000,
        "modelsReadyMs": 2000,
        "gameReadyMs": 3000
      },
      "sampling": {
        "warmupRequestedMs": 5000,
        "warmupActualMs": 5010,
        "measurementRequestedMs": 10000,
        "measurementActualMs": 10010
      },
      "metrics": {
        "frames": 600,
        "durationMs": 10000,
        "fpsAverage": 60,
        "frameTimeAverageMs": 16.667,
        "frameTimeMinMs": 12,
        "frameTimeMaxMs": 40,
        "p50Ms": 16.5,
        "p90Ms": 18,
        "p95Ms": 20,
        "p99Ms": 28,
        "framesOver16_67ms": 200,
        "framesOver33_33ms": 3,
        "framesOver50ms": 0,
        "framesOver100ms": 0,
        "largestStalls": [{ "frame": 123, "ms": 40 }]
      },
      "environment": {
        "browser": { "name": "Chromium", "version": "..." },
        "userAgent": "...",
        "platform": "Chrome OS",
        "resolution": { "width": 1366, "height": 768 },
        "viewport": { "width": 1280, "height": 720 },
        "devicePixelRatio": 1,
        "webgl": { "renderer": "...", "vendor": "..." },
        "softwareRenderer": false,
        "rendererClass": "hardware",
        "performanceMemory": null
      },
      "memory": { "before": null, "after": null },
      "diagnostics": { "before": {}, "after": {} },
      "warnings": []
    }
  ]
}
```

## Regras

- Números não finitos são rejeitados antes da serialização.
- `performanceMemory` e `memory.before/after` podem ser `null`.
- `softwareRenderer` pode ser `true`, `false` ou `null`.
- `scenarioSource` distingue `checkpoint` de `saved-snapshot`.
- Loading não entra no FPS médio.
- Warm-up não entra nos deltas medidos.
