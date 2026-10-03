# HANDOFF — M01-VIEWMODEL-VISUAL-V2

Branch: `codex/m01-viewmodel-visual-v2`  
Base: `2cfa9520a09c68629e3d98d6e7f4dc0d8f9e6732`

## Alteração

Patch intencionalmente pequeno em `src/render/m01-viewmodel.js`:

- inclui `clavicle_*` no recorte first-person para reduzir o corte abrupto manga/ombro;
- usa profundidade `0.24 m` em ADS, mantendo `0.16 m` fora de ADS.

Não foi criado segundo sistema, IK novo, asset novo ou lógica de gameplay.

## Revisões rejeitadas

Foi testada uma alteração adicional de pitch/offset de reload. Ela empurrou `hand_r` para fora do frustum no teste real do rig. A mudança foi revertida e a assertion legítima foi preservada.

## Integração

A alteração é isolada do trabalho MG34 prone: não toca em:
- `src/game/m01-simulation.js`;
- `src/world/spatial.js`;
- `src/render/m01-characters.js`;
- MG34, CKM, train/wagons, saves/schema, RNG ou clocks.

Antes de integrar, rever as capturas comparativas. O ganho esperado é enquadramento ADS menos invasivo e manga menos truncada sem afastar grosseiramente a arma.

## Limitações restantes

O ViewModel continua derivado do rig de terceira pessoa. Ainda podem existir:
- silhuetas de manga demasiado largas em alguns frames;
- dedos não perfeitamente conformes à madeira/ferrolho;
- recarga parcial reutilizando a animação `reload_clip` comprimida no tempo;
- ausência de uma malha/IK first-person dedicada.

Corrigir esses pontos de forma substancial provavelmente exige autoria de asset/clip, não mais offsets arbitrários no runtime.

M01 continua **PROTÓTIPO JOGÁVEL**.
