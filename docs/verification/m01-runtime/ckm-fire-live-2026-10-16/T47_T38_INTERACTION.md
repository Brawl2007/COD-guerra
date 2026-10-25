# T47 x T38: os três achados da D42 — causa, opções, escolha (2026-10-18)

Estado: **DECIDIDO E IMPLEMENTADO (D43, decisão do Captain de 2026-10-18 com autoridade delegada pelo proprietário): V3 na simulação e três mudanças do lado dos testes** — ver a secção 4. As secções 1–3 são a análise que levou à decisão (feita em `bc4523f`, antes de qualquer correcção). Branch `claude/busy-ritchie-3fkvk2-t47i`.

Tudo o que está abaixo são medições de simulação em Node (x86-64, Node 22.22), não playtest. Rotas: `tests/helpers/m01-cover.js` (`coverRoute`, «help»/«ignore») e `tests/helpers/m01-route.js` (`route`, com e sem apoio). «Staging» = `8c6328c` (sem arma), «T47 sozinha» = `602a5ee`.

## 1. Causas

### 1a. `m01-cover-threat` — cadência «uma baixa por 20 s» (defeito real, latente desde T23)
`updateActors` (bloco `cover_withdrawal`) re-arma `timers.withdrawalCasualty` **no disparo** do tiro letal e só proíbe outro tiro enquanto o primeiro voa. O voo dura ~0,6 s reais, que valem ~4,8 s de relógio a 8× e 0,6 s a 1×. Os dados da missão dizem o contrário (`mission.json`, `cover_withdrawal.mechanic`: «a baixa só conta quando o tiro chega, com intervalo mínimo de 20 s de relógio entre baixas»), e o próprio comentário do código diz «enquanto esse tiro voa, a contagem espera por ele». Quando dois tiros ficam de um lado e do outro das 06:09:00 (onde `advanceBattle` passa de 8× para 1×, a 60 s da demolição leste), as quedas ficam a 16 s (rota «help», semente 19390901, `bc4523f`: tiros 06:08:40 e 06:09:00, quedas 06:08:45 e 06:09:01). **A asserção está certa; o código está errado.** A T47 só mudou a trajectória ao ponto de expor o defeito.

Correcção correspondente (medida): enquanto houver tiro letal em voo, `withdrawalCasualty = battleClock` (a contagem recomeça na chegada). Efeito nas rotas «ignore»: o intervalo mínimo entre quedas passa de 20 s para 23 s (relógio arredondado ao segundo); os 12 sobreviventes mantêm-se nas 24 sementes medidas.

### 1b. `m01-cover-threat` — diferença do reparo help/ignore (equilíbrio, não asserção)
A arma suprime os MG34 pela zona batida (D41: desde a revisão crítica já não são imunes). Laçada sobre os atiradores ao lado do MG dos portões (`de_east_13` está a 0,6 m de `de_east_0`), a zona mantém esse MG em baixo na rota que o ignora. Medido em 24 sementes (`coverRoute`, semente 19390901 e 1–23):

| árvore | diferença média (s) | mediana | mín. | sementes «ignore» com MG suprimido > 20 % | máx. «ignore» | semente 19390901 |
|---|---|---|---|---|---|---|
| staging `8c6328c` | 33,1 | 34,6 | −25,0 | 0 | 14 % | 65,75 s |
| `bc4523f` (5 sementes: 19390901, 1–4) | 23,6 | — | 5,7 | 0/5 | 18 % | 5,7 s |
| V0: mira sem postura (¹) | 29,8 | 28,1 | −3,15 | 7/24 | 30 % | 17,2 s |
| V0 + `CKM_SUPPRESS_SEC` 1,5 s | 41,4 | 42,5 | −5,1 | 0/24 | 18 % | 38,7 s |
| V0 + a arma nunca suprime `de_east_0` | 40,2 | 38,8 | 8,8 | 0/24 | 12 % | 40,9 s |

(¹) Medido com a cadência corrigida; a cadência só actua depois das 06:05 e o reparo acaba antes das 05:15, por isso os números do reparo são os de V0. As duas últimas linhas são V0 + cadência + a variante indicada.

Uma só semente é caótica (variações pequenas da arma dão entre 11 s e 47 s nesta semente); só a média sobre muitas sementes é sinal. O limite `ignore.repairMgSuppressedPct<=20` do teste só é medido na semente 19390901, mas com 2,5 s é ultrapassado em 7 de 24 sementes.

### 2. `m01-east-front` — o gémeo T22 diverge (conflito de premissa, não defeito)
O teste corre ao lado uma `T22Logic` com `holdingEast()` falso e exige que «todos os outros homens» sejam iguais em cada tick. A T38 (regra fixada em `tests/m01-combat-posture-staging.test.js:230`) põe **de pé todos os atiradores dos portões** em cada salva de atrito da T23 (desde a hora fixa até `holdAfterSec` depois da queda); o gémeo não tem atrito, por isso fica de joelhos. Até à T47 nada dependia dessa postura nos 13 percursos do teste. Com a T47 dependem dela:
- a mira da arma (`ckmAim` lia `crouched`) e o teste de linha de vista (`ckmClearShot` usa o olho do alvo): é a divergência que a D42 descreve (tick 9070, `de_east_10`);
- **o impacto**: `ckmImpact` traça cada ronda contra as caixas de impacto da postura real (spatial.js: de joelhos = caixa 0,48 m mais baixa). Medido com V0 + 1,5 s, semente 2, tick 8971 (05:16:30, salva de atrito de `pl_east_21` às 05:16:00): a mesma ronda da mesma rajada (alvo `de_east_3`) acerta `de_east_2` de pé com multiplicador 0,7 (saúde 68,5) e no gémeo, de joelhos, com 1,0 (saúde 55).

O segundo ponto é física correcta (um homem de pé está mais exposto) e é uma consequência causal real da lógica T23 (T23 → postura T38 → impacto T47). Tirar a postura da mira (V0) resolve o primeiro ponto em todas as rotas do teste, mas o segundo só deixa de aparecer por acaso de trajectória: com 2,5 s as 13 rotas passam (30/30), com 1,5 s a semente 2 falha. Resolver de raiz exigiria (a) mudar o âmbito do teste (calar a arma no gémeo, opção A da D42), (b) mudar a regra de postura T38 fixada por teste, ou (c) traçar as rondas da ckm contra uma caixa que ignora a postura (ignora a cobertura dos sacos de areia: errado). Nenhuma é permitida nesta tarefa.

### 3. Invariantes T38 em 24 rotas — semente 3 com apoio acaba com 17 (margem de munição do piloto)
O piloto de apoio (`coverControls`) dispara sempre que a arma está pronta e nunca pede munição a Kowal; tem 45 cartuchos. Medido nas 12 rotas com apoio: só a semente 3 esvazia a arma antes da demolição já no staging (23 tiros no reparo + 22 na retirada, vazio às 06:09:49; sobrevive porque a contagem de 20 s, re-armada enquanto os alemães do tabuleiro estão suprimidos, não chega ao fim antes da demolição); nas outras 11 sobram cartuchos. Com a arma viva (V0) o piloto gasta 27 tiros no reparo e fica vazio às 06:09:00; na V3 (traçado tick a tick) os alemães do tabuleiro deixam de estar suprimidos às 06:09:25 e o tiro letal das 06:09:40 mata às 06:09:46. Acontece com `bc4523f`, V0, V0 + cadência e V0 + cadência + 1,5 s (as quatro deram 17). Não é a arma a matar ninguém: é uma rota de margem de 11 s que qualquer mudança de ritmo do reparo vira. Uma afinação que a desvirasse seria ajustar a simulação a uma semente.

## 2. Opções medidas

| opção (simulação) | cover-threat | east-front | ckm-live-fire (contagem 270) | invariantes 24 rotas | equilíbrio |
|---|---|---|---|---|---|
| `bc4523f` | FALHA (cadência) | 8 FALHAS | ok | 23/24 | mau (5,7 s; MG dos portões 16 % na «ignore» desta semente) |
| **V0** = mira e linha de vista no homem de pé que disparou | ok 10/10 | ok 30/30 | ok | 23/24 (3/apoio) | fraco (17,2 s; 7/24 > 20 %) |
| V1 = V0 + cadência contada na chegada | ok | ok 30/30 | **FALHA 271 ≠ 270** | 23/24 | como V0 |
| V3 = V1 + `CKM_SUPPRESS_SEC` 1,5 s | ok 10/10 | **FALHA semente 2** (29/30) | **FALHA 271 ≠ 270** | 23/24 | bom (38,7 s; 0/24 > 20 %) |

`npm test` completo com V0 aplicada (uma execução): 1028 testes, 1020 ok, 8 falhas, todas em `tests/m01-animation-contract.test.js` (a cadeia e os dois digests do golden da T47, e os 5 testes que usam a rota completa desse teste): é o golden que a emenda 03 teria de regenerar. As outras colunas foram medidas só nos ficheiros indicados.

A contagem 270 (`tests/m01-ckm-live-fire.test.js:68`, entradas visíveis de S2 ao longo da rota com a arma neutra, `tools/m01-ckm-fire-arc.mjs`) depende da simulação sem arma; a correcção da cadência muda a retirada e dá 271. É uma medida de trajectória que teria de ser re-medida (edição de valor de asserção), como foi re-medida na fusão (`a9bfa28`).

Comandos (todos com a árvore indicada aplicada em `src/game/m01-simulation.js`): `node --test tests/m01-cover-threat.test.js`, `node --test tests/m01-east-front.test.js`, `node --test tests/m01-ckm-live-fire.test.js tests/m01-ckm-fire-arc.test.js`, `M01_T47_AUDIT_OUT=<pasta temporária> node tools/verification/m01-combat-posture-staging-audit.mjs --live`; as tabelas de equilíbrio por guiões de medição sobre `coverRoute` (não fazem parte do repositório).

## 3. Escolha recomendada (para decisão)
Nenhuma opção satisfaz as três condições. Recomendação, por ordem:
1. **V3 como simulação** (mira no homem de pé que disparou; `CKM_SUPPRESS_SEC` 1,5 s = os 1,5 s que um quase-acerto alemão prende um aliado que não trabalha, abaixo dos 2 s de Kowal; cadência contada na chegada, como os dados da missão dizem), com três decisões humanas: (i) `m01-east-front`: calar a arma no gémeo T22 (a premissa «só a lógica T23 difere» deixou de ser verdadeira desde que a T38 ligou a postura dos portões ao atrito); (ii) re-medir a contagem 270 → 271; (iii) aceitar 17 na semente 3 com apoio, ou corrigir o piloto (não gastar tiros num MG já suprimido, como o piloto `coverRoute` já faz), ou passar a invariante de «igual ao predecessor» para o intervalo da missão (12–18).
2. **V0 sozinha**, se a regra é não tocar em testes: resolve os achados 1 e 2 da D42 sem mexer em nenhuma asserção (o defeito da cadência fica latente; a semente 3 com apoio fica 17) e precisa da emenda 03 do golden da T47; o equilíbrio fica abaixo do pretendido (17,2 s nesta semente, MG dos portões > 20 % em 7 de 24 sementes).

Em qualquer dos casos é preciso regenerar o golden da T47 (emenda 03: cópias de `bc4523f` guardadas byte a byte, `GOLDEN_AMENDMENT_03.json`, a auditoria por tick contra `8c6328c` com o delta nomeado `cadence` se a cadência entrar) e re-fixar a cadeia em `tests/m01-animation-contract.test.js`. A preparação das ferramentas para isso existe como patch fora do repositório (ver o relatório ao Captain); não foi corrida.

Reversível: sim, tudo. Não é playtest; nada foi ouvido nem jogado.

## 4. Decisão do Captain (D43) e implementação

**Decisão do Captain, 2026-10-18** (o proprietário delegou autoridade total no Captain; registada como D43 em `docs/direction/DECISIONS.md`): implementar V3 — mira e linha de vista no homem de pé que disparou, cadência contada na chegada (como diz `mission.json`), `CKM_SUPPRESS_SEC` 1,5 s — e só estas mudanças de teste, sem retirar nem afrouxar nenhuma asserção:
- (a) `tests/m01-east-front.test.js`: ckm calada nos dois lados da comparação com o gémeo T22 (`CkmNeutralSimulation`; o gémeo verifica a lógica de atrito da T23, não impactos da ckm).
- (b) contagem de S2 re-medida com a ferramenta do repositório: `tests/m01-ckm-live-fire.test.js:68` 270 → 271. A mesma medida (a mesma janela, as mesmas funções) está fixada em `tests/m01-ckm-candidate-posts.test.js`, que também foi re-medida: S1 269/395 → 270/396, S2 270/270 → 271/271 (e 270 → 271 às alturas de boca 0,6 e 0,9 m); todos os outros números da janela ficam iguais. Medição registada em `GOLDEN_AMENDMENT_03.json` (`s2Visibility`, antes e depois).
- (c) piloto de apoio (`tests/helpers/m01-route.js`): depois do reparo, com reserva ≤ 25 e Kowal com carregadores, vai ter com ele por trás (oeste) e pede munição pela interacção do jogo (`E`, a mesma de `updateObjectives`). Nas rotas com apoio, dispara nas sementes 3, 6 e 9 (reserva 15, 20, 20); a rota golden 7 tem 30 e não muda.
- A regra de postura T38 de `tests/m01-combat-posture-staging.test.js:230` não mudou.

Resultados na árvore final (x86-64, Node 22.22):
- Semente 19390901 (`coverRoute`): reparo «help» 174,5 s, «ignore» 213,2 s (diferença **38,7 s**; staging 65,8 s, T47 sozinha 34,7 s, `bc4523f` 5,7 s); MG dos portões suprimido 10 % do reparo na «ignore» (limite 20 %); baixas da «ignore» às 06:05:23, :46, 06:06:10, :34, :57, 06:07:21 (23–24 s); «help» sem baixas.
- Invariantes T38 em 24 rotas (`m01-combat-posture-staging-audit.mjs --live`, `INVARIANTS_24_ROUTES.json`): **24/24**, sem violações; semente 3 com apoio 18.
- Golden T47 emenda 03: `m01-t47-ckm-fire-audit.mjs --write` (EXIT 0; A == G com os deltas nomeados, incluindo `cadence`, cuja primeira diferença é `timers.withdrawalCasualty` nas duas rotas, 06:05:20,4), `m01-t47-golden-amendment-audit.mjs --amendment 03 --write` (EXIT 0; cópias de `bc4523f` byte a byte) e `--amendment 02` em modo de verificação (EXIT 0, `GOLDEN_AMENDMENT_02.json` igual byte a byte, com a simulação e o piloto de `bc4523f` extraídos do git). Na rota de referência a arma fere 3 alemães e não mata ninguém; na rota 7 com apoio fere 5.
