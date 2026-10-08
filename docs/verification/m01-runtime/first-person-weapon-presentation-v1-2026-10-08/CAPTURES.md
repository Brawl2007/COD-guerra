# Capturas BASE / CANDIDATE

Ferramenta: `tools/verification/m01-weapon-presentation-capture.mjs` (fixture `m01-weapon-presentation-fixture.html`).
- **Ambiente:** Chromium/SwiftShader local, 1280×720, qualidade Baixa, `M01View`/`Renderer` de produção.
- **Simulação:** avança com controlos reais na página, a partir do início genuíno da rota.
- **Pares:** a mesma sequência de controlos corre na base `99309d9` e na candidata `d97329c`. Os 28 frames da candidata são idênticos píxel a píxel aos de `9827c73` e `dfb1572`, com o mesmo estado e os mesmos contadores: a pré-compilação não desenha nada. SHA-256 por frame em [`logs/capture-identity.txt`](logs/capture-identity.txt).
- **Âmbito:** são capturas encenadas, não um playtest.

Relatórios completos por frame (estado, apresentação, `calls`/`triangles`): [`BASE-report.json`](BASE-report.json), [`CANDIDATE-report.json`](CANDIDATE-report.json).

**Equivalência de gameplay nas capturas:** relógio, jogador (posição, ângulos, ADS) e arma (`mag`, `reserve`, `shotCount`, `lastShot`, estado) são **idênticos** em base e candidata nos 27 frames comuns. A pausa (frames repetidos sem ticks) é estável nas duas.

Cada imagem tem a base em cima e a candidata em baixo. As composições são feitas com [`logs/sheets.py`](logs/sheets.py) (`pairs`) a partir dos PNG da ferramenta.

| Par | O que mostra na candidata |
|---|---|
| [m01-01 hip idle](captures/m01-01-hip-idle.jpg) | Aço azulado legível (na base é preto), madeira acetinada. Luz do passe da arma ao amanhecer: enchimento 2,17, chave 0,60, ambiente 0,33 (base: constantes 2,7/2,0). |
| [m01-03 ADS idle](captures/m01-03-ads-idle.jpg) | Miras exactas em repouso (o mesmo enquadramento da base). |
| [m01-04 ADS shot flash](captures/m01-04-ads-shot-flash.jpg) | Clarão em camadas no socket da boca, visível à volta da massa de mira; luz curta na coronha e nas mãos. Na base não se vê clarão em ADS. |
| [m01-05 ADS recoil](captures/m01-05-ads-shot-recoil.jpg) | Recuo e fumo fino do cano 50 ms depois; o alvo continua visível. O frame do tiro não alimenta o atraso de olhar (`lookPitch` 0). |
| [m01-06 bolt + chamber smoke](captures/m01-06-bolt-chamber-smoke.jpg) | Curso do ferrolho fora do olho, com cant, e fumo da câmara a sair da janela. |
| [m01-07 ejected case](captures/m01-07-bolt-ejected-case.jpg) | Curso do ferrolho com a arma fora do olho (na base, o antebraço tapa a vista inteira). O invólucro, pequeno e dourado acima da manga, sai no marcador `eject` do GLB. |
| [m01-10 hip flash](captures/m01-10-hip-shot-flash.jpg) | Língua de chama longa à anca, com a estrela e a luz. |
| [m01-12 hip bolt eject](captures/m01-12-hip-bolt-eject.jpg) | Ferrolho depois do tiro à anca. O relatório conta 2 invólucros no mundo, 1 já em repouso. |
| [m01-15 clip ejected](captures/m01-15-reload-clip-ejected.jpg) | O clipe vazio sai aos 2,45 s (`clip_ejected`) e passa a objecto do mundo. |
| [m01-16 clip falling](captures/m01-16-reload-clip-falling.jpg) | O clipe a cair: tira de aço escura acima da coronha. O modelo do asset já não o mostra a desaparecer no ar. |
| [m01-19b ejecta probe](captures/m01-19b-ejecta-probe.jpg) · [zoom 4×](captures/m01-19b-ejecta-probe-zoom4x.png) | **Probe** (só passe do mundo, pose registada no relatório): cinco invólucros deitados de lado e o clipe deitado na chapa de base. O relatório dá, por peça: eixo do invólucro horizontal, centro 5,1 mm acima de `heightAt`; normal da chapa do clipe vertical, comprimento horizontal, 0,3 mm acima. |
| [bench-02 hip shot](captures/bench-02-hip-shot.jpg) | M1 Carbine: clarão maior do que o da wz.29 (cano curto), mais localizado do que a esfera laranja da base, e o invólucro .30 Carbine a sair com o tiro. |
| [bench-03 hip brass](captures/bench-03-hip-brass.jpg) | Invólucro em voo; retorno rápido do recuo. |
| [bench-04 ADS shot](captures/bench-04-ads-shot.jpg) | Tiro em ADS: recuo contido, clarão à frente da mira. Os 3 fios do tiro anterior continuam (antes eram cortados neste frame). |
| [bench-07 smoke](captures/bench-07-smoke.jpg) | Fumo depois de dois tiros seguidos: 7 fios (duas gerações + câmara) e 8 puffs no mundo; 3 invólucros, 1 em repouso. |

## Contadores de render (não são FPS)

O `engine.info.render` foi lido depois de cada frame:
- **Em repouso** (sem tiro activo, nada no chão): calls e triângulos **iguais** à base (M01: 247 calls, 407 099 triângulos; bancada: 206 calls, 27 976).
- **Invólucros/clipe pousados no mundo, sem tiro activo:** M01 +1 a +2 calls, +518 a +1 136 triângulos.
- **Com efeitos de tiro activos:** M01 +3 a +12 calls e +6 a +1 112 triângulos (camadas do clarão, fios, nuvem, invólucros/clipe instanciados); bancada +5 a +16 calls.
- O passe da arma M01 tem **uma** `PointLight`, partilhada entre o rig e o fallback, sempre presente com intensidade 0 em repouso.
- Valores por frame nos relatórios JSON.
