# Relatório de Alterações — T24 (`M01-TRAIN-ARRIVAL-AND-LIFE-V1` / BX-07)

## 1. Resumo Executivo
Implementação completa da tarefa **T24 (`M01-TRAIN-ARRIVAL-AND-LIFE-V1`)** ao nível de produção **CoD: World at War**, re-baseada diretamente sobre os módulos reais da V7 (`src/render/m01-locomotive.js`, `src/render/m01-panzerzug.js`, `src/render/m01-train-wagons.js`, `src/render/m01-atmosphere.js` e `src/audio/m01-train-audio.js`).

## 2. Critérios de Aceitação Cumpridos e Verificados
- **`trainX(battleClock)` monótono e com paragem exata**: Decresce monotonamente de `1435 m` (`04:43:30`) até exatamente `1075 m` (`04:45:00`, `LOCOMOTIVE_PLACEMENT.position[0]`), com derivada nula na paragem (`speed = 0`).
- **`panzerzugX(battleClock)` monótono e com paragem exata**: Decresce monotonamente de `1359 m` (`04:51:00`) até exatamente `1119 m` (`04:52:00`, `PANZERZUG_PLACEMENT.position[0]`) na via paralela norte (`z = 2.5`).
- **65 vagões autoritativos intocados**: `M01_TRAIN_WAGON_PLAN` (`train963_wagon_01..65` em `x = 1090 + i * 9.1`) e `tests/m01-train-consist-polish.test.js` mantêm compatibilidade bit a bit; às `04:45:00` (ou sem `battleClock`), `arrivalOffset === 0`.
- **Continuações às `04:44:30` e `04:46:00`**: Determinísticas e idempotentes (`offset = 40 m` às `04:44:30`; `offset = 0 m` às `04:46:00`).
- **Lanterna frontal `fog: false` e Fornalha (`firebox`)**: Visíveis a >1 km na Vista 10 sem atenuação pelo nevoeiro matinal, fundidas num único mesh (1 draw call, mantendo o orçamento ferroviário `<= 12` draw calls).
- **Pool de fumo/vapor com tectos `12 / 18 / 24`**: Integrado em `M01Atmosphere` (0 draw calls adicionais), incluindo fumo de carvão e vapor de cilindros do 963, coluna do Panzerzug 7 e "manobra parada a oeste" (`x = -292, z = -18`).
- **Sons `veh.train.*` com atraso acústico**: Atraso físico `distance / 343 m/s` (`~4,06 s` desde Lisewo até à margem oeste).

## 3. Integração na candidata (port manual, `integ-t24`)
Origem: entrega T24 do Gemini/Argon (pacote descarregado; os ficheiros `src/` do pacote não assentam nos blobs reais da V7, por isso **nada foi copiado**:
só as adições foram portadas à mão para os ficheiros actuais da candidata).
- `m01-locomotive.js` / `m01-panzerzug.js`: cinemática de chegada, lanternas e fornalha fundidas num só mesh (`fog:false`); `update(player,battleClock=null,flagActive=true)`.
- `m01-train-wagons.js`: `update(player,quality,battleClock)` desloca o grupo (offset 0 sem relógio ou a partir das 04:45:00).
- `m01-atmosphere.js`: `RAILWAY_PUFF_BUDGET` 12/18/24 no pool existente. O fumo ferroviário só é emitido quando o estado traz `battleClock`
  (estado de render da simulação); fixtures só com `damage` ficam inalterados. O espaço do fumo ferroviário é reservado antes do dano, por isso o pool nunca passa de 256.
- `m01-view.js`: `battleClock = sim.battleClock ?? 16200 + time`; visibilidade = `isTrain963Visible/isPanzerzugVisible(battleClock, flag da simulação)`: os flags da simulação continuam a forçar visibilidade.
- `src/audio/m01-train-audio.js` (`M01TrainAudioController`, atraso 343 m/s) está **testado mas não ligado**: `src/core/audio.js` não tem `emit()` nem planos `veh.train.*`,
  e o `audio-director-m01.js` já toca o `railClank`/loops de comboio; ligar sem novos sons sintetizados seria duplicar áudio. Fica para um passo de áudio.
- Guarda de bytes: `tests/m01-train-consist-polish.test.js` ganhou deltas explícitos e limitados para `m01-train-wagons.js` (como os do T31); o resto continua igual à fonte original.
- Correcções feitas ao portar, depois de ver as capturas reais no jogo: (1) o cone do feixe de alvorada do pacote tinha o vértice a apontar para longe do farol e preenchimento opaco
  (um funil creme a tapar o ecrã de perto); agora o vértice fica no farol, alarga à frente e é apenas um véu (alpha 0,20 a 0). (2) As alturas das lanternas estavam em coordenadas do modelo
  mas o fixture vive no referencial da raiz (o GLB assenta a -0,82 m): subiam ~0,9 m acima do suporte real; agora ficam no suporte do farol (y 1,78) e na trave de choque (y 0,72). (3) A lanterna
  de fenda do Panzerzug flutuava 2 m à frente do casco; agora fica rente à face (z -7,2). (4) Halos com alpha radial por vértice (RGBA, mesma chamada de desenho) em vez de discos planos.
  Os brilhos da fornalha e das sapatas foram escurecidos (saturavam para creme com a exposição de alvorada). Helper partilhado: `src/render/m01-railway-light.js`.

## 4. Evidência visual (jogo real, não playtest)
`node tools/verification/m01-train-arrival-t24-shots.mjs <pasta>` constrói, serve o `npm run preview` e restaura estados M01 pausados (rota real da simulação até ao relógio pedido;
só a pose do jogador é escolhida). Os portões do leste (x≈1056) estão fechados: da ponte só se vê o fumo, por isso as câmaras ficam na cabeça de ponte leste (x≥1061) a olhar para leste (Lisewo).
Capturas 1280x720 (SwiftShader, sem medições de FPS): 04:44:29 locomotiva 963 a travar com lanternas e feixe; 04:45:02 parada em x=1075; 04:51:34 Panzerzug a chegar (z=2.5) ao lado do 963 parado; dois planos
próximos (lanternas frontais; fornalha e sapatas).
