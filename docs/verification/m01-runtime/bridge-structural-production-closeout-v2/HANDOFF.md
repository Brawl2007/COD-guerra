# HANDOFF — M01 bridge structural production closeout v2

TASK_ID: `M01-BRIDGE-STRUCTURAL-PRODUCTION-CLOSEOUT-V2`
BASE: `codex/m01-bridge-portal-material-detail-polish-v1 @ 99309d9cb023cc94a07d41ff863e1362e4460570`
BRANCH: `codex/m01-bridge-structural-production-closeout-v2` (nunca `main`)
Runtime verificado: `ce73304` (o commit seguinte só acrescenta este handoff, evidências e documentação).

M01 continua **PROTÓTIPO JOGÁVEL**. Sem merge, integração, deploy ou alteração em `main`.

## O que muda à vista

| Área | Antes | Depois |
|---|---|---|
| Treliça lenticular 1891 | barras quadradas lisas, todas iguais | banzos com chapas de cobertura e cantoneiras; montantes em H; gussets nos nós (no plano das almas); chapas no cruzamento real das diagonais; esquadros sob as escoras superiores |
| Vãos Pratt 1910–1912 | só escoras superiores, sem pórtico | contraventamento superior em X, pórticos nos montantes inclinados, esquadros, gussets, chapas de cobertura |
| Viga Lentze 1857 | banzos lisos | chapas de cobertura e cantoneiras nos banzos, montantes em T, gussets, esquadros e pórticos em V nos topos |
| Tabuleiro ferroviário | tábua contínua esticada sobre 129 m, carris planos | travessas abertas (0,62 m, com jitter determinístico), tábuas de 4 m entre vias e laterais, carris de patim (boleto/alma/patim), contracarris, longarinas e carlingas em I, contraventamento inferior, talas (High) |
| Tabuleiro rodoviário | laje + lancis | guarda-rodas em madeira, longarinas em I, banzos das carlingas, chapas de dilatação |
| Apoios | vão "pousado" no capitel | pedestais em pedra + chapas/sapatas de apoio |
| Pilares/encontros | blocos lisos | sapata escalonada à linha de água, cornija, cordão; pilastras/cornija/embasamento nos encontros |
| Carril → ponte | via única no aterro acabava antes do portal; ponte em via dupla | via dupla no aterro oeste (±2 m, alinhada com a ponte), via dupla balastrada sobre os encontros até aos carris da ponte; linha leste em ±2,5 m (onde já estavam o trem 963 e o Panzerzug) |
| Aço | `metal` genérico (metalness .68 sem envMap → silhueta preta) | `bridgeSteel`: tinta dieléctrica cinzento-esverdeada envelhecida, só no `steel_painted` das pontes e nas peças novas; carris mantêm o metal |
| Demolições | — | vãos `_collapsed` herdam a mesma estrutura; troços de carril sobre juntas seguem `world.joints` e desaparecem quando um vão vizinho cai |

Comparações lado a lado (base 99309d9 × depois) em [`pairs/`](pairs/): 17 vistas — tabuleiros, junção, nós, pórtico Pratt, pilares, média/longa distância, Medium/Low e demolição leste.

## Arquitectura e autoridade

- Novo `src/render/m01-bridge-structure.js`: descritores puros `{p,s,q}` gerados a partir das constantes do gerador (`tools/assets/m01-bridges/src/bridges.mjs`) e do `lengthM`/`supportsX` dos extras GLB; `M01BridgeStructure` instancia-os nos nós existentes de cada ficheiro LOD.
- **GLB das pontes, manifesto, colliders GLB e `bridge-colliders.json` byte a byte idênticos** (blob SHA bloqueados em `tests/m01-bridge-structure.test.js`). Regenerar o gerador era possível (reprodução byte a byte confirmada), mas três testes existentes exigem os assets da base `5f3cc34` intactos; a estrutura entra por runtime, como o polish do portal.
- `src/game`, `src/world`, `src/core`, `missions`, `assets`, gerador, `m01-bridge-portal-polish.js` e `m01-surfaces.js`: sem alterações (verificado pelo workflow da branch). Zero colliders, zero RNG, zero estado no save. O renderer só lê `renderState` (troca intacto/colapsado) e `world.joints`.
- LOD/qualidade: Low = kit autoral sem nada novo; Medium = estrutura; High = + rebites (pirâmides de 4 triângulos) e talas até 140 m da câmara. LOD0 completo, LOD1 só silhueta (diagonais lenticulares/Pratt, esquadros, pórticos, chapas de banzo, apoios), LOD2 nada. Fiadas dos pilares permanentes numa só malha por ponte; pilares destrutíveis (00/01/06) por nó.
- Espaço de passagem: nada novo acima de y = 0,02 em |z| < 4,35 (ferroviária) / 2,76 (rodoviária) até 4,2 m, nem no gabarito de cada via (±1,6 m até 5,2 m). Testado.
- Ficheiros alterados: `src/render/m01-bridge-structure.js` (novo), `src/render/m01-view.js`, `src/render/m01-environment.js`, `tests/m01-bridge-structure.test.js` (novo), `tests/browser/m01-bridge-structural.spec.js` (novo), `.github/workflows/m01-bridge-structural-production-closeout-v2.yml` (novo).

## Verificação

| Etapa | Resultado |
|---|---|
| Node focado `m01-bridge-structure` | 7/7 (autoridade, envelopes, gabarito, níveis, determinismo, vias, runtime com GLB reais incl. juntas após demolição) |
| `npm test` | **331/331** (após as correcções da revisão) |
| `npm run build` | PASS (aviso de chunk > 500 kB já existente) |
| Browser focado (estrutura + portal) em `ce73304` | **4/4**, 7,3 min |
| Browser integral em `115333a` (antes das correcções da revisão) | **61/63**; 2 timeouts ver abaixo |
| Revisor independente | 1 defeito médio (chapas de cruzamento fora do cruzamento) + cosméticos/testes vazios → corrigidos em `ce73304` |

**Os 2 timeouts não são regressão desta tarefa.** Neste sandbox (Chromium 1194 SwiftShader) a **base 99309d9 falha os mesmos dois testes**: `m01-audio-production` (mesma linha 53, 3/3 na base) e `licensed character rigs` (base 3/3 em `fireRound`, linha 131; HEAD 2× na linha 114/138 e 1× na 131 — numa corrida o HEAD passou além do ponto onde a base sempre falha). São esperas de input/pointer-lock em renderização por software. Resumo bruto em `full-browser-115333a.json`. A suíte integral **não** foi repetida após `ce73304`; não declarar 63/63.

## Custo (renderer.info, SwiftShader 1280×720 — não é FPS)

Detalhe em `COUNTERS.json`. Low: −1 draw call, +2,4–2,5 % triângulos (segunda via do aterro). Medium (tabuleiro): +23 draw calls, +25 %. High perto das pontes: +21–27 draw calls, +23–30 % triângulos; longa distância +14 %. Chromebook físico continua por medir.

## Limites e pendências honestas

- Medidas de perfis, travessas, contracarris, guarda-rodas, fiadas e cor da tinta de 1939 são **estimativas**; o tipo de treliça 1910–1912 continua não documentado (P11/P13). Nada disto é levantamento histórico.
- A via dupla a leste (±2,5) junta-se à da ponte (±2) atrás dos portões fechados de Lisewo; a linha de Bydgoszcz continua simples e encosta à via sul junto a x≈−53.
- Sem playtest humano nem FPS em hardware real. Os vãos colapsados herdam a estrutura do vão intacto (a pose de queda continua provisória).
- CI da branch: workflow focado criado; resultado do GitHub Actions não foi acompanhado nesta sessão.
