# Capturas — o que a camada distante acrescenta ao frame

Ferramenta: `tools/verification/m01-distant-battlefield-capture.mjs` (fixture `m01-distant-battlefield-fixture.html`).
- **Ambiente:** Chromium/SwiftShader local, 1280×720, qualidade Baixa, `M01View` de produção.
- **Estado:** snapshots genuínos de uma rota pela simulação real (só controlos).
- **Âmbito:** são capturas encenadas, não um playtest.

Cada frame é **redesenhado uma segunda vez com a camada distante escondida** (mesmo relógio, mesma pose) e as duas imagens são comparadas.
- **changed**: píxeis com diferença ≥ 8/255.
- **strong**: píxeis com diferença ≥ 40/255.
- Em cada imagem, à direita fica a máscara: só os píxeis da camada, o resto escurecido.
- Relatório completo (estado, poses, diagnóstico, diff): [`CAPTURE-report.json`](CAPTURE-report.json), commit `24d2ed7`.

Tipos de frame:
- **player**: olho do jogador com o FOV do jogo (70°).
- **eye**: o mesmo olho, só rodado e com FOV mais estreito para um sector; pose registada, sem passe da arma.
- **probe**: pose explícita registada.

| Frame | changed / strong | O que se vê |
|---|---|---|
| [player-01 madrugada, a olhar para leste](captures/player-01-dawn-looking-east.jpg) | 7 / 2 | Um clarão/avião minúsculo no céu. A escaramuça de Lisewo (1,3–2 km a montante/jusante) não tem linha de vista a partir da estação. |
| [eye-02 clarão na planície](captures/eye-02-dawn-floodplain-flash.jpg) | 0 / 0 | Mesmo motivo: do pátio da estação o vale do rio a 1,3–2 km fica tapado (terreno, aterro, pontes). |
| [probe-04 planície sul](captures/probe-04-hold-floodplain-south.jpg) | 12 / 0 | Figuras/fumo na planície distante, na linha do horizonte. |
| [probe-05 planície, binóculo 10°](captures/probe-05-far-plain-squads-binocular.jpg) | 44 / 20 | Grupos na planície a leste (≥1,3 km): pontos escuros em lanços no horizonte. |
| [eye-06 frente norte, 60°](captures/eye-06-north-front-wide.jpg) | 238 / 0 | Impactos de morteiro/artilharia com poeira e fumo, clarões pequenos e aviões no céu. |
| [eye-07 frente norte, 24°](captures/eye-07-north-front-flash.jpg) | 1571 / 17 | O mesmo sector mais perto: nuvens de impacto, clarões, a coluna da quinta a começar. |
| [player-08 de costas para norte](captures/player-08-facing-south-north-still-runs.jpg) | 0 / 0 | Atrás do jogador nada aparece, mas o diagnóstico mostra 17 eventos activos fora da vista: a frente continua sem ser vista. |
| [eye-10 avião distante, 14°](captures/eye-10-distant-aircraft.jpg) | 38 / 23 | Elemento de aviões a ≥2 km. |
| [player-11 colunas de Koźliny](captures/player-11-kozliny-columns.jpg) | 389 / 0 | Do olho do jogador (70°), duas colunas finas de fumo distante sobem acima do horizonte (quinta, viatura atingida). As colunas grandes à esquerda **não** são desta camada: são o fumo existente do pátio da estação, e a máscara mostra-o. |
| [eye-12 ataque de Koźliny, 24°](captures/eye-12-kozliny-assault.jpg) | 4000 / 21 | As colunas com fogo na base e clarões no horizonte. |

**Linha de vista confirmada separadamente** (probe de rascunho, não incluído): a partir da planície a leste, com vista aberta para o vale, um clarão de Lisewo a ~1,4 km muda 25 píxeis (6 fortes). É um ponto quente de ~7×5 px no horizonte. A partir da treliça da ponte o mesmo clarão fica tapado pela própria treliça.

Leitura honesta:
- A 70° de FOV a camada é **subtil**: pontos e colunas finas no horizonte, como seria um combate a 1–3 km de madrugada.
- As colunas de fumo são o sinal mais visível; os clarões de espingarda/MG a 1–2 km são pontos de ~7 px.
- A escaramuça de Lisewo foi afastada para lá do raio de tiro (decisão da revisão). Por isso só se vê de pontos com linha de vista para o vale (margem leste, planície), não do pátio da estação.
- Com o mesmo snapshot e o mesmo frame, as colunas anteriores (≈20 × 48 m, commit `bdfbab7`) davam 87 changed em player-11 e 739 em eye-12. As actuais (100–300 m de altura, `24d2ed7`) dão 389 e 4000. Os outros frames não mudam.

Capturas do teste de navegador (build de produção, menu → continuar, pausa): [`captures/distant-east-low.png`](captures/distant-east-low.png), [`captures/distant-north-high.png`](captures/distant-north-high.png).
