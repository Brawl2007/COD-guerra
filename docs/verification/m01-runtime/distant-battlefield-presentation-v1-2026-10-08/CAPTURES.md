# Capturas — o que a camada distante acrescenta ao frame

Ferramenta: `tools/verification/m01-distant-battlefield-capture.mjs` (fixture `m01-distant-battlefield-fixture.html`).
- **Ambiente:** Chromium/SwiftShader local, 1280×720, qualidade Baixa, `M01View` de produção.
- **Estado:** snapshots genuínos de uma rota pela simulação real (só controlos).
- **Âmbito:** são capturas encenadas, não um playtest.

Cada frame é **redesenhado com a camada distante escondida** (mesmo relógio, mesma pose) e as duas imagens são comparadas.
- **changed**: píxeis com diferença ≥ 8/255.
- **strong**: píxeis com diferença ≥ 40/255.
- **xray**: o mesmo frame redesenhado com o teste de profundidade da camada desligado, ou seja, o que ela acrescentaria se nada do mundo estivesse à frente. `changed` 0 com `xray` > 0 quer dizer que a camada está lá, mas tapada (aterro, edifícios, pontes). Não quer dizer que falta.
- Em cada imagem, à direita fica a máscara: só os píxeis da camada, o resto escurecido. As composições são feitas com [`logs/sheets.py`](logs/sheets.py) a partir dos PNG da ferramenta: `layers` para as folhas e `zoom` para os recortes 4× (probe-13: 560,320–780,400; eye-15: 520,320–700,400). Regenerados com `zoom`, os dois recortes saem idênticos byte a byte aos commitados.
- Relatório completo (estado, poses, diagnóstico, diff, xray): [`CAPTURE-report.json`](CAPTURE-report.json), commit `5c5eed1` (runtime `6ffa820`).

Tipos de frame:
- **player**: olho do jogador com o FOV do jogo (70°).
- **eye**: o mesmo olho, só rodado e com FOV mais estreito para um sector; pose registada, sem passe da arma.
- **probe**: pose explícita registada.

Pontos de vista:
- A madrugada (01–03) e o surto (09–10) estão no olho do jogador na **cabeça de ponte oeste**, entre os aterros ferroviário (z ≈ 0) e rodoviário (z ≈ 30–50). Não é o pátio da estação.
- O norte (06–08, 14) está sobre o aterro rodoviário, ~12 m a leste e ~12 m a sul do olho do bolso (chão a −0,35 m, contra −3 m no bolso). É essa altura que deixa ver a frente norte por cima do aterro ferroviário.
- A espera (15) está na ponte rodoviária.
- Koźliny (11–12) está a oeste, junto à estação.

| Frame | changed / strong | xray | O que se vê |
|---|---|---|---|
| [player-01 madrugada, a olhar para leste](captures/player-01-dawn-looking-east.jpg) | 7 / 2 | 8 | Um avião/clarão minúsculo no céu. A escaramuça de Lisewo está a 1,3–2 km a montante/jusante, fora deste enquadramento. |
| [eye-02 clarão na margem oeste](captures/eye-02-dawn-floodplain-flash.jpg) | 0 / 0 | 34 | Clarão de resposta na margem oeste a 1,76 km, a norte. **Tapado** pelo aterro ferroviário logo a norte do olho. |
| [eye-03 traçante sobre o rio](captures/eye-03-dawn-tracer-across-river.jpg) | 0 / 0 | 54 | Traçante e clarão de Lisewo a nordeste: **tapados** pelo mesmo aterro (o raio cruza z = 0 junto à cabeça de ponte). |
| [probe-04 planície sul](captures/probe-04-hold-floodplain-south.jpg) | 12 / 0 | 12 | Figuras na planície distante, na linha do horizonte. |
| [probe-05 planície, binóculo 10°](captures/probe-05-far-plain-squads-binocular.jpg) | 44 / 20 | 44 | Grupos na planície a leste (≥1,3 km): pontos escuros em lanços no horizonte. |
| [eye-06 frente norte, 60°](captures/eye-06-north-front-wide.jpg) | 253 / 0 | 269 | Impactos de morteiro/artilharia com poeira e fumo, clarões pequenos, aviões no céu. |
| [eye-07 frente norte, 24°](captures/eye-07-north-front-flash.jpg) | 1671 / 20 | 1732 | O mesmo sector mais perto: nuvens de impacto, clarões, a coluna da quinta a começar. |
| [player-08 de costas para norte](captures/player-08-facing-south-north-still-runs.jpg) | 0 / 0 | 0 | Atrás do jogador nada aparece, mas o diagnóstico mostra 17 eventos activos fora da vista: a frente continua sem ser vista. |
| [eye-09 surto a leste](captures/eye-09-east-reaction-surge.jpg) | 0 / 0 | 51 | Surto de Lisewo depois das 06:10, a nordeste: **tapado** pelo aterro ferroviário (olho 85 m mais a oeste, mesma linha). |
| [eye-10 avião distante, 14°](captures/eye-10-distant-aircraft.jpg) | 38 / 23 | 38 | Elemento de aviões a ≥2 km. |
| [player-11 colunas de Koźliny](captures/player-11-kozliny-columns.jpg) | 389 / 0 | 422 | Do olho do jogador (70°), duas colunas finas de fumo distante sobem acima do horizonte (quinta, viatura atingida). As colunas grandes à esquerda **não** são desta camada: são o fumo existente do pátio da estação, e a máscara mostra-o. |
| [eye-12 ataque de Koźliny, 24°](captures/eye-12-kozliny-assault.jpg) | 4000 / 21 | 4055 | As colunas com fogo na base e clarões no horizonte. |
| [probe-13 traçante, a norte do aterro](captures/probe-13-floodplain-tracer-north-of-embankment.jpg) · [zoom 4×](captures/probe-13-floodplain-tracer-north-of-embankment-zoom4x.png) | 33 / 7 | 46 | O mesmo traçante do eye-03, visto de um ponto alcançável da área de movimento a norte do aterro (x −40, z −70, olho a 1,6 m). Um traço laranja e um clarão na linha da planície de Lisewo. |
| [eye-14 traçante da linha norte, 40°](captures/eye-14-north-line-tracer.jpg) | 620 / 7 | 648 | Do olho do jogador: traçante (quase na linha de vista, por isso um ponto), clarões e nuvens de impacto na frente norte. |
| [eye-15 traçante visto da ponte rodoviária](captures/eye-15-road-bridge-south-floodplain-tracer.jpg) · [zoom 4×](captures/eye-15-road-bridge-south-floodplain-tracer-zoom4x.png) | 42 / 18 | 55 | **Olho do jogador numa posição genuína da rota** (snapshot da espera, na ponte rodoviária): um traçante de MG e o seu clarão na linha sul de Lisewo, a ~1,7 km. |

Leitura honesta:
- A 70° de FOV a camada é **subtil**: pontos, traços e colunas finas no horizonte, como seria um combate a 1–3 km de madrugada.
- As colunas de fumo e as nuvens de impacto do norte são o sinal mais visível. Os clarões de espingarda/MG e os traçantes a 1–2 km são pontos e traços de poucos píxeis.
- A escaramuça de Lisewo fica além do raio de tiro (decisão da revisão) e é baixa (planície a y −5). Do bolso da cabeça de ponte entre os dois aterros, o aterro ferroviário tapa-a a norte e nordeste (xray dos frames 02/03/09). Nas capturas vê-se da ponte rodoviária (eye-15) e de um ponto a norte do aterro ferroviário (probe-13).
- Sem captura (inferência geométrica sobre o campo de alturas do gameplay, `traceTerrain`): do bolso, o aterro rodoviário tapa também a linha sul, e a frente norte só mostra a parte alta das colunas; da margem leste vê-se a linha sul a partir da planície e a linha norte só do tabuleiro da via férrea. Ver o HANDOFF.

Histórico dos números:
- **Cache dos eventos** (`bdfbab7`): nos 12 frames de então, eventos, instâncias e diff da camada são iguais aos de `3e0d8e7` ([`logs/CAPTURE-report-3e0d8e7.json`](logs/CAPTURE-report-3e0d8e7.json), [`logs/CAPTURE-report-bdfbab7.json`](logs/CAPTURE-report-bdfbab7.json)).
- **Colunas à escala de 1,5–3 km** (`24d2ed7`, [`logs/CAPTURE-report-24d2ed7.json`](logs/CAPTURE-report-24d2ed7.json)), com as mesmas instâncias:
  - player-11 passou de 87 para 389 changed;
  - eye-12 passou de 739 para 4000;
  - eye-06 passou de 189 para 238 e eye-07 de 1193 para 1571 (a coluna da quinta está nesses frames).
- **Impactos das peças nas obras de campo polacas** (`6ffa820`): eye-06 passou de 238 para 253 e eye-07 de 1571 para 1671. Os outros 10 frames comuns dão os mesmos números.

Capturas do teste de navegador (build de produção, menu → continuar, pausa): [`captures/distant-east-low.png`](captures/distant-east-low.png), [`captures/distant-north-high.png`](captures/distant-north-high.png).
