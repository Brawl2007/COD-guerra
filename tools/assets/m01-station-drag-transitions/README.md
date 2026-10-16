# Gerador das transições do arrasto da estação (M01)

Gera `assets/models/provisional/m01/characters/station-drag-transitions/`: `m01_station_drag_transitions.glb` com `station_drag_medic_grab`, `station_drag_patient_grab`, `station_drag_medic_release` e `station_drag_patient_release` para o rig polaco actual (61 ossos), e `manifest.json`. Não gera malhas nem altera clips existentes.

- `src/fk.mjs`: leitura de GLB (nós, esqueleto, clips) e cinemática directa sem three.js.
- `src/rig.mjs`: rig a partir de `m01_soldier_pl_lod1.glb`, amostragem das poses reais (`crouched_idle`, `wounded`, `drag_wounded`) e extracção para os parâmetros do solver de `../m01-soldiers/src/pose.mjs`.
- `src/body.mjs`: cápsulas entre ossos (raios estimados com fardamento), distâncias, empurrão das mãos para fora do corpo do ferido e chão.
- `src/clips.mjs`: duração, eventos, offset do par, sockets nos ombros/sovacos, pose de arrasto do ferido e os frames do agarrar (a libertação é o inverso).
- `build.mjs`: GLB (GLTFExporter do three.js da raiz), eventos em `extras`, SHA-256 dos ficheiros reutilizados e verificações no `manifest.json`. Determinístico.
- `render/capture.mjs`: capturas de verificação e `import-report.json` em `docs/assets/m01-station-drag-transitions/`, no palco de `../m01-soldiers/render/`.

Reutiliza só funções exportadas por `../m01-soldiers/` (precisa de `npm ci` lá para o palco das capturas); nenhum gerador partilhado é editado.

```
node tools/assets/m01-station-drag-transitions/build.mjs
CHROME_EXECUTABLE=… node tools/assets/m01-station-drag-transitions/render/capture.mjs
```

Clips, ligação, sockets, contactos e limitações: [`docs/assets/m01-station-drag-transitions/README.md`](../../../docs/assets/m01-station-drag-transitions/README.md).
