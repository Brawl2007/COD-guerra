# M01 ViewModel Visual V2

TASK_ID: M01-VIEWMODEL-VISUAL-V2

Base fixa: `2cfa9520a09c68629e3d98d6e7f4dc0d8f9e6732`  
Branch: `codex/m01-viewmodel-visual-v2`

## Medição antes

A captura de produção foi feita em 1280x720, qualidade low, a partir do mesmo CP-A e orientação horizontal, sem mudar simulação ou estado da arma.

Defeitos observados no ViewModel anterior:

- ADS reutilizava a mesma profundidade de raiz (`z -= 0.16`) do enquadramento geral. O rig ficava demasiado perto da câmara e as mangas ocupavam grande parte do quadro.
- O recorte do corpo aceitava apenas vértices dominados por upperarm/lowerarm/hand/dedos. Triângulos de transição dominados por `clavicle_*` eram descartados, deixando um corte visual mais abrupto no topo das mangas.
- O reload real já tinha uma protecção de near plane e teste de frustum. Uma tentativa experimental de reduzir o pitch/offset da recarga piorou a visibilidade de `hand_r` e foi rejeitada/revertida, em vez de alterar a assertion.
- O rig existente continua a ser um rig de terceira pessoa; não existe malha first-person dedicada nem IK específico para as mãos.

Diagnóstico do browser antes: `armTriangles = 1603` no LOD0.

## Patch escolhido

Somente `src/render/m01-viewmodel.js` muda:

1. O recorte de braços inclui agora vértices dominados pelos ossos `clavicle_*`, além de upperarm/lowerarm/hands/fingers. Isso conserva mais da transição manga/ombro sem trazer hips/pernas/torso para o ViewModel.
2. Em ADS a raiz fica 8 cm mais afastada da near plane: `0.24 m` em vez de `0.16 m`. Hip/idle, bolt, reload, sprint, carry e gameplay mantêm os contratos anteriores.

Diagnóstico depois: `armTriangles = 1631` no LOD0 (+28 triângulos da transição de manga).

## O que foi deliberadamente preservado

- `reloadDown`, pitch e offset de recarga originais;
- animações `aim`, `fire_bolt`, `reload_clip`;
- representação da recarga parcial com um cartucho e clipe de cinco escondido;
- muzzle flash, arma, relógio da animação, pause/restore e fallback LOD1;
- simulação, Wz29, munição, dano, RNG, saves/schema 2 e todos os relógios/gates.

Nenhum estado de gameplay é decidido pelo ViewModel.

## Capturas

Foram produzidas capturas antes/depois no mesmo viewport/qualidade/CP para:

- idle / arma baixa;
- aim;
- tiro e fire_bolt;
- início/meio/fim do ferrolho;
- início de reload;
- clipe entrando;
- fim de reload;
- recarga parcial;
- sprint;
- pause e restore.

As capturas temporárias do browser não foram adicionadas como binários ao repositório para manter o patch pequeno; o HANDOFF e VALIDATION registam o protocolo e os resultados.

## Resultado visual

A alteração é pequena mas perceptível: ADS fica menos colado à câmara e a manga deixa de terminar exactamente no limite de influência do upperarm. O rifle continua próximo e legível como FPS; não foi empurrado para longe para esconder defeitos.

M01 continua **PROTÓTIPO JOGÁVEL**.
