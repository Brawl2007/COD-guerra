# HANDOFF — M01 train detail / coupling polish

TASK_ID: `M01-TRAIN-DETAIL-COUPLING-POLISH-V1`
BASE: `codex/m01-bridge-portal-material-detail-polish-v1 @ 99309d9cb023cc94a07d41ff863e1362e4460570` (HEAD remoto confirmado antes de começar)
BRANCH: `claude/m01-train-detail-coupling-polish-dws18u` (branch designada desta sessão). O mesmo HEAD é publicado também em `claude/m01-train-detail-coupling-polish-v1`, o nome pedido, se o remoto o aceitar; ver a entrega final.
HEAD de código verificado: `09e58584931d37445e010a9429d74adfbf87abfa`. Os commits seguintes só acrescentam documentação/evidência e o script de pares; o SHA final é comunicado na entrega.

M01 continua **PROTÓTIPO JOGÁVEL**. Sem merge, sem main, sem deploy. Não toca em `src/render/m01-atmosphere.js`, FX, explosões, fumo, poeira, impactos, `src/render/m01-view.js`, `src/game/`, simulação, missões, estação/pátio, animação de soldados, locomotiva 963 nem Panzerzug.

## Ficheiros

| Ficheiro | Estado | Papel |
|---|---|---|
| `src/render/m01-train-consist-detail.js` | novo | via própria, conjuntos near/mid/far, variação por id, sombra de contacto |
| `src/render/m01-train-wagons.js` | alterado | deslocamento de arte −0,8325, orientação/tom por id (`instanceColor`), sombra só LOD0 em Medium/High, chama o detalhe; plano, LOD e proxies iguais |
| `tests/m01-train-consist-polish.test.js` | novo | 14 testes focados (abaixo) |
| `tests/m01-support-runtime.test.js` | 1 asserção | a matriz esperada do vagão 1 passa a incluir −0,8325 e a orientação por id (antes fixava y = 0) |
| `tests/browser/m01-train-consist-polish.spec.js` | novo | 9 vistas + fallback, modo baseline |
| `tools/verification/m01-train-consist-audit.mjs` | novo | contadores e ajuste roda/carril, base vs head, em Node |
| `tools/verification/m01-train-consist-gallery.mjs`, `m01-train-consist-fixture.html` | novos | galeria isolada |
| `tools/verification/m01-train-consist-pairs.py` | novo | pares lado a lado |
| `.github/workflows/m01-train-detail-coupling-polish-v1.yml` | novo | CI focado da branch (testes, auditoria, build, before/after, invariância) |
| `docs/verification/m01-runtime/train-detail-coupling-polish-v1/` | novo | esta evidência |

## Alterações

Desenho e medidas em [`DESIGN.md`](DESIGN.md). Resumo:

- **Roda/carril**: na base os vagões estavam a +0,83 m do topo do carril e 3,0–7,4 m ao lado da via existente (27 sem carril). Agora assentam numa via própria em z = −2,5 (bitola 1,435 m, topo −0,82 como a via leste e a locomotiva): piso LOD0 a 0 no centro da cabeça (±6,5 mm nas arestas), verdugos dentro da via, desvio lateral 0.
- **Acoplamentos**: placas e mangas dos tampões, guia do gancho, engate de parafuso montado com manivela e estribo sobre o gancho vizinho, engate do outro vagão pendurado, mangueiras de freio unidas; pontas da composição com engate e mangueira pendurados. Só visual; nenhum colisor.
- **Estrado**: travessas intermédias, longarinas, diagonais, cilindro/reservatório/válvula suspensos, alavancas e tirantes até às vigas de freio, suspensões das sapatas, conduta, apoios das molas, porta-guias.
- **Variação**: 4 tons ±4 %, 31/65 vagões virados de topo, 0–3 tábuas substituídas, guias de papel em 38/65, lado do engate por intervalo; tipo e estado autoritativos intactos.
- **Peso**: sombra dos corpos LOD0 (Medium/High), sombra de contacto, sem luz por baixo do estrado.
- **Espaços**: GLB não alterados; silhueta de tampões só nas pontas LOD2 abertas, que não têm tampões.

## Contagem, LODs, invariância

- **65 vagões**; ids, tipos (49 cobertos / 16 abertos), x e âncora `[1090,0,−2,5]…[1672,4,0,−2,5]` iguais aos da base (comparação com o módulo da base importado do git).
- **LOD0/1/2** e histerese: `chooseWagonLod` igual ao da base em 4 qualidades × 4 LOD anteriores × 4801 distâncias; `M01_WAGON_LOD` e candidatos iguais; distribuição de LOD por vista igual nos dois browsers (fixada no spec). Mesmas 24/16 batches GLB, mesma geometria e material partilhados. Detalhe caro só em LOD0 (Medium/High); LOD1 recebe o conjunto mid; LOD2 nada além das silhuetas de tampões; Low nunca recebe o conjunto near.
- **Fallback**: com todos os GLB em falta as 65 caixas/rodas procedimentais têm matrizes iguais às da base; sem detalhe sobre elas. Falha parcial ou LOD2 em falta: escolhe o GLB mais próximo e mantém o tier de distância.
- **Gameplay**: `src`, `missions` e `assets` da base iguais byte a byte, excepto `m01-train-wagons.js` (teste). Simulação, RNG, save e mundo não são lidos nem escritos pelo módulo; visibilidade continua `state.train963` (tudo dentro desse grupo, incluindo a via). Intacto/queimado do pátio: o trem só pede os 6 GLB intactos; `yardWagonState` inalterado.

## Testes

- Focados Node: **87/87** em 13 ficheiros (`node-focused.tap`), 0 falhas, 0 skips. Inclui os 14 novos:
  1. 65 vagões, plano e selector de LOD iguais à base (exaustivo); 2. instâncias GLB no x/z do plano, −0,8325, sem escala, geometria/material partilhados; 3. roda/carril por fatia dos triângulos (todos os tipos/LODs, ambos os rodados e lados); 4. contagem e posição de cada batch de detalhe pelo tier, Low sem near, LOD2 sem near/mid, envios reais vs base (≤ +12 draws, sombras ≤ 8 e 0 em Low, +2 na área jogável), tom por vagão nas batches GLB; 5. fallback total/parcial com proxies iguais aos da base; 6. sem arte danificada e autoridade intacto/queimado do pátio; 7. save/reload e pausa sem mutação de estado/RNG, buffers iguais entre renderizador com histórico e novo, near incluído; 8. variação determinística e limitada; 9. nenhum colisor nem leitura do mundo; 10. dispose/recreate e reconstruções sem duplicar malhas nem libertar arte partilhada; 11. ficheiros de gameplay/missão/assets iguais à base; 12. tudo sob o grupo `train963`; 13. carris desenhados: topo, bitola, continuidade 1062–2000; 14. LOD2 em falta ao longe não traz o conjunto near.
- Mutantes da revisão (intervalo no centro do vagão, estrado 0,6 m acima, carris 3 cm acima) passaram a falhar 2 testes cada.
- Suíte Node integral não foi corrida no HEAD final (pedido: sem full Node). Durante a primeira revisão, um agente revisor correu `npm test` sobre o primeiro commit `f9ff6df`: **335/335**, 0 falhas. Esse resultado não cobre os commits de correcção seguintes, que só mudaram o módulo do trem e os testes focados.

## Build

`npm run build` PASS no HEAD de código (`build.log`): `index-LoLDAzav.js` 1.218,61 kB / 328,14 kB gzip (base 1.198,77 kB / 321,48 kB). Mantém-se o aviso de chunk > 500 kB que já existia.

## Browser focado

`tests/browser/m01-train-consist-polish.spec.js`: **AFTER 2/2** (`browser-after.log`, 4,4 min) e **BEFORE 2/2** na base exacta em modo baseline (`browser-before.log`, 4,3 min). Retries 0 (config), skips 0, sem falhas. Suíte de browser integral não corrida (pedido). Chromium 1194 local via `CHROME_EXECUTABLE`; Playwright 1.58.2.

## Performance

Contadores do frame inteiro no browser (cena + arma + sombra; `browser-counters.json`):

| Vista | Draw calls antes → depois | Triângulos antes → depois | Texturas | Geometrias |
|---|---|---|---|---|
| wagon-near High | 221 → 231 | 508.120 → 562.610 | 203 → 204 | 305 → 314 |
| coupling-pair High | 210 → 219 | 484.827 → 541.973 | 201 → 202 | 284 → 292 |
| underframe High | 215 → 222 | 484.941 → 537.319 | 198 → 199 | 272 → 278 |
| consist-medium High | 216 → 225 | 537.770 → 590.066 | 206 → 207 | 305 → 314 |
| consist-far High | 51 → 58 | 444.653 → 479.357 | 41 → 42 | 239 → 245 |
| coupling-pair Low | 157 → 164 | 447.299 → 471.307 | 141 → 142 | 267 → 273 |
| consist-medium Low | 156 → 162 | 441.709 → 464.425 | 141 → 142 | 266 → 272 |
| consist-daylight High (sol, sombras) | 306 → 324 | 779.763 → 871.397 | 207 → 208 | 335 → 344 |
| locomotive-wagon1 High | 217 → 227 | 571.011 → 622.001 | 205 → 206 | 304 → 313 |

Só o grupo do trem, em Node (`audit-node.json`; draws do passe principal, objectos no mapa de sombra, instâncias activas):

| Vista | Draws | Sombra | Triângulos | Instâncias |
|---|---|---|---|---|
| perto, High | 24 → 35 | 0 → 8 | ≈75–81k → 123–141k | 293 → ~1.890 |
| perto, Low | 24 → 31 | 0 → 0 | ≈49–55k → 73–79k | 293 → ~1.750 |
| ≈270 m, High | 16 → 23 | 0 → 0 | 59,5k → 94,2k | 293 → 1.857 |
| **área jogável (x ≤ 440), qualquer qualidade** | **8 → 10** | **0 → 0** | **31,1k → 32,3k** | 293 → 326 |

Batches de detalhe fixas (11, nunca por vagão). Novos: 1 textura (gravilha 64×64), 4 materiais (detalhe, desgaste, balastro, sombra de contacto), 10 geometrias. As instâncias a mais são sobretudo 1250 travessas e 158 troços de carril, que só existem perto da composição. Não foi medido FPS nem tempo de frame; Chromebook continua por medir.

## Screenshots

[`BEFORE_AFTER.md`](BEFORE_AFTER.md): 10 pares (vagão perto, dois vagões ligados High/Low, estrado, composição média High/Low, ao longe, com sol, locomotiva–vagão 1, fallback). Galeria isolada em `gallery/`.

## Revisão

Duas rondas de revisão multi-agente com verificação adversarial (correcção, invariância/testes, performance). Corrigido no código: medição do piso (afinal o kit ficava 1,25 cm acima: deslocamento −0,8325), carris 10 m além do balastro, z-fighting dos decals, via/sombra sub-pixel na área jogável (+5 → +2 draws), sombras dos detalhes, custo das reconstruções, troca de programa do material, tier com LOD de recurso, silhueta far a esconder tampões do LOD1 em Low, peças do freio a flutuar. Nos testes: medições por fatia, contagens e posições por batch, histórico vs restauro perto da composição, comparação exaustiva com a base, carris desenhados, tom nas batches, spec sem expirar a tolerância fora dos limites. Refutado: via ligada ao grupo `train963` não é regressão (antes não havia via); mantido e documentado.

## Limitações

- Locomotiva–vagão 1: 2,05 m entre tampões (âncoras fixas por regra da tarefa).
- Proxies de fallback com a âncora antiga, acima da via nova (só com falha total de GLB).
- LOD1/2: rodas até 4,3 cm acima da cabeça (< 0,7 px na distância mínima de LOD1).
- Via própria aparece com o trem; a `rail_line_east` existente fica a 2,9–7,4 m como via divergente.
- Na área jogável a composição está sempre em LOD2 e o portal de Lisewo fechado esconde-a do tabuleiro: o pormenor near vê-se a curta distância na margem leste.
- Medidas genéricas estimadas (P16 aberta); sem inscrições, carga ou garita.
- Sem playtest humano, sem FPS, sem Chromebook. Capturas são estados reais da rota com o jogador reposicionado.

## CI

Workflow `m01-train-detail-coupling-polish-v1.yml` corre no push destas branches (testes focados, auditoria, build, before na base, after, invariância). Estado do run: ver entrega final.

READY_FOR_CAPTAIN_REVIEW
