# Encravamento da ckm wz.30 e falas 114/115 — 2026-10-22

Decisão do proprietário (2026-10-22): a ckm wz.30 do posto S2 encrava, e as falas `dlg_m01_114` («Travou! Recarregar!», atirador) e `dlg_m01_115` («Pronto. Atire!», municiador), que estavam por ligar com `NEEDS_EVENT`, passam a dizer-se nesses eventos.

Branch local `wp2-ckm-jam`, de `efb8eb0` (a árvore de jogo é a de `4e2588f`, a emenda 12: `efb8eb0` só mudou o workflow de CI). **Não publicada**, sem revisão crítica independente, **sem playtest humano** (nada disto foi jogado; os números são de rotas de teste da simulação, não de FPS nem de sensação).

## O que mudou

**Jogo.** A máquina do atirador da ckm (`updateCKMGunner`, `src/game/m01-simulation.js`) ganha uma quinta fase, `stoppage`, e uma tabela, `CKM_STOPPAGES`:

| Encravamento | Quando | Duração |
|---|---|---|
| 1 | o atirador ia disparar a **14.ª rajada** (já disparou 13) | **3,8 s** |
| 2 | ia disparar a **45.ª rajada** (já disparou 44) | **4,6 s** |

Nesse instante a rajada **não é disparada**: o atirador passa a `stoppage` até `clearAt`, a arma cala-se (nenhuma ronda, nenhum clarão, a fita não gasta cartuchos), o municiador e o terceiro homem copiam a fase e o `clearAt`. A apresentação reutiliza os clips `feed` já autorados (ponta da fita para dentro pelo municiador, atirador puxa a lingueta e arma duas vezes; `ready` aos 3,0 s de 3,2 s), colocados no **fim** do desencrave para o «Pronto» coincidir com o último fotograma, e nos 0,6 / 1,4 s antes disso a guarnição mantém a pose `aim` (o atirador chama o encravamento). Quando passa `clearAt`: evento `ckm_stoppage_cleared`, a fase volta a `aim` e a rajada que ia disparar segue **nesse mesmo tick** se o alemão ainda está à vista (a arma fica apontada mais 1 s).

**Janela.** Um encravamento só pode começar onde uma rajada podia começar: de 04:46:00 a 06:09:30 (`CKM_FIRE_FROM`, `CKM_CEASE_AT`). Um que já decorre ao fechar a janela desencrava pelo relógio, sem rajada a seguir; se a demolição leste chega a meio, a guarnição abandona a arma encravada (`abandon` → `retreat`) e ninguém diz que desencravou.

**Determinismo.** Nada é sorteado: nenhum fluxo aleatório (nem o principal nem o da ckm) se move, por isso cada rajada mantém a dispersão que tinha e a rota é idêntica à da emenda 12, tick a tick, até ao primeiro encravamento. A escolha é uma tabela por **contador de rajadas** (a pedido: «contador determinista de rondas disparadas»; cada rajada são 8 rondas), não uma lotaria: com uma lotaria uma rota podia ter 0 ou 5, e o contador deixa a contagem por rota ser um invariante testável. Os instantes e as durações são balanço de jogo, **sem fonte histórica**.

**Eventos** (`src/game/m01-audio-events.js`, nunca guardados): `ckm_stoppage {by, at, clearAt, origin, n}` ao falhar a rajada e `ckm_stoppage_cleared {by:'ckm_loader', at, origin, n}` ao desencravar (`n` = o encravamento da missão).

**Falas.** Duas regras `bark` em `mission.json` (gatilhos novos `ckm_stoppage`, `ckm_stoppage_cleared` em `src/game/m01-barks.js`): 114 (prioridade 2, jogador a ≤ 60 m do atirador, cooldown 20 s, máx. 3) e 115 (prioridade 3, jogador a ≤ 60 m do municiador, máx. 3, `after` 0–8 s depois de a 114 ir para o ecrã: sem 114 não há 115). Passam pelo realizador como qualquer outra fala: intervalo mínimo (6 s para a 114), orçamento de 60 s (7 para a 114, 5 para a 115, a própria 114 conta uma), 2 vozes.

## Estado guardado e saves antigos

- Fase `stoppage` com `clearAt` nos três homens da guarnição, e `ckmFire.jams` (quantas já bateram) no atirador. **Ambos só existem depois de o primeiro encravamento acontecer**: todo o save de uma versão anterior, e todo o save desta antes da 14.ª rajada, tem exactamente a forma antiga (cinco chaves em `ckmFire`, nenhum `clearAt`) e carrega sem migração.
- Um save antigo feito mais tarde (mais rajadas do que a tabela espera, sem `jams`) carrega e a **próxima** rajada é o encravamento; um save feito depois das duas rajadas apanha os dois, um a seguir ao outro (3,8 s e 4,6 s de silêncio) e a tabela fica gasta. Documentado e testado (`tests/m01-ckm-stoppage.test.js`, «older saves load»).
- O validador de `validateM01Snapshot` recusa, atomicamente, tudo o que a máquina não produz: `clearAt` fora de [3,2; 5] s do início ou já passado, sem `clearAt` numa fase `stoppage` (ou com `clearAt` noutra), `jams` ausente no atirador, a zero, fraccionário, acima da tabela ou com menos rajadas do que a tabela espera, a duração diferente da da tabela, um plano de rajada, um homem morto, antes das 04:46:00, o municiador ou o terceiro homem em `stoppage` sem o atirador igual.

## Os encravamentos nas duas rotas do golden

Medido por `tools/verification/m01-ckm-jam-audit.mjs` (`CKM_JAM_ROUTES.json`, este directório): as rotas reais do piloto de teste (`tests/helpers/m01-route.js`), controlo (semente 19390901) e piloto de apoio (semente 7).

| Rota | Encravamento | Relógio de batalha | Relógio real (s) | Duração (s) | Rajadas antes | Jogador ao atirador (m) | Fala 114 | Fala 115 |
|---|---|---|---|---|---|---|---|---|
| controlo | 1 | 04:58:43 | 347,85 | 3,8 | 13 | 35,5 | dita aos 347,85 s | não dita |
| controlo | 2 | 05:54:40 | 542,15 | 4,6 | 44 | 26,5 | dita aos 542,15 s | não dita |
| apoio | 1 | 04:59:03 | 350,10 | 3,8 | 13 | 127,3 | não dita (fora dos 60 m) | não dita |
| apoio | 2 | 06:01:07 | 551,05 | 4,6 | 44 | 34,8 | dita aos 551,05 s | não dita |

Duas por rota, as duas dentro da janela, cada uma desencravada ao fim da duração da sua entrada na tabela (a granularidade do tick é 0,05 s: 8,45 s de arma calada por rota para 8,4 s de tabela). Nas outras 12 rotas medidas (sementes 1 a 6, controlo e apoio) o mesmo: 28 encravamentos em 14 rotas, nenhum fora da janela, nenhum sem desencravar, **nenhum disparo, nenhuma ronda da fita e nenhum clarão entre o encravamento e o desencrave** (também verificado tick a tick em `tests/m01-ckm-stoppage.test.js`).

### Falas

| | Encravamentos | Com o jogador a ≤ 60 m do falante | 114 dita | 115 dita |
|---|---|---|---|---|
| Duas rotas do golden | 4 | 3 | 3 | **0** |
| As 14 rotas | 28 | 21 | 11 | **0** |
| *E se a 115 tivesse prioridade 2* (duas rotas do golden; só o que se diz, nada do que acontece) | 4 | 3 | 3 | 2 |

A 114 (prioridade 2) ouve-se em cerca de metade das vezes em que o jogador está ao alcance (11 de 21): o realizador só deixa passar uma fala se a última começou há ≥ 6 s e se o último minuto tem menos de 7 falas, e um evento é de um só instante, por isso quando o canal está ocupado perde-se. A **115 não se ouviu nunca** (0 de 21): é prioridade 3 (orçamento de 5 falas em 60 s, e a própria 114 conta uma), e o minuto de combate traz quase sempre mais de 3 falas. A 113 («Fita nova! Pronto!», também prioridade 3) está na mesma situação (não se ouviu em nenhuma das duas rotas do golden da emenda 12, medido antes desta alteração). A fila funciona (os testes encenados provam 114 → 115, o limite de duas vozes, o intervalo, o orçamento e que nenhuma das duas desloca uma fala mais urgente); o que falta é uma **decisão do proprietário**: subir a 115 para prioridade 2 (um número em `mission.json`; na variante de teste acima a 115 passa a ouvir-se em 2 das 4 vezes, e o ouvinte teria o par «Travou! Recarregar!» / «Pronto. Atire!»), ou dar uma pequena tolerância aos eventos de um só instante no realizador (a fala espera uns segundos pela sua vez). Não toquei na prioridade (é dado da fala) nem no realizador (é de todas as falas).

## Efeito medido nas rondas e nas mortes da ckm

Cada rota foi corrida duas vezes com o mesmo piloto: com a tabela (a simulação viva) e sem ela (a mesma classe com `ckmJamDue()` desligado, que é a simulação da emenda 12: as duas rotas do golden dão os seus 23 746 e 21 660 ticks). 14 rotas = as duas do golden e as sementes 1 a 6 (controlo e apoio). Média das diferenças emparelhadas (com − sem), desvio-padrão e erro-padrão:

| | Sem | Com | Diferença média | dp | erro-padrão |
|---|---|---|---|---|---|
| Rajadas da ckm | 57,07 | 56,50 | **−0,57** | 1,70 | 0,45 |
| Rondas da ckm (8 por rajada) | 456,6 | 452,0 | **−4,6** (−1 %) | 13,6 | 3,6 |
| Acertos em alemães | 1,93 | 2,14 | +0,21 | 1,81 | 0,48 |
| Mortes por rondas da ckm | 0,29 | 0,14 | −0,14 | 0,53 | 0,14 |
| Rondas que fixaram (supressão) um alemão | 436,2 | 431,1 | −5,1 | 47,7 | 12,8 |
| Duração da rota (s reais) | 1155,9 | 1146,7 | −9,2 | 34,1 | 9,1 |

Nada passa de 1,3 erros-padrão: **o efeito é pequeno e não se distingue do ruído**, como é de esperar de 8,4 s de silêncio numa arma que dispara 8 rondas a cada ≈ 6 s. As duas rotas do golden, uma a uma: controlo 58 → 58 rajadas, acertos 4 → 4, mortes 1 → 0, fixações 529 → 429, 23 746 → 23 557 ticks; apoio 56 → 56 rajadas, acertos 2 → 4, mortes 1 → 0, fixações 413 → 423, 21 660 → 23 030 ticks. Uma rota é caótica (qualquer mudança de tempo move todos os sorteios seguintes dos alemães), por isso uma só rota nada prova: as diferenças por rota vão de −16 a +24 rondas e de −65 a +69 s. **Os invariantes do enredo mantêm-se nas 14 rotas** (`plotEqual`: os mesmos 12 estados de objectivo, CP-A..D, eventos consumidos, bandeiras do enredo, sobreviventes 12 / 18 e 07:05:00 com e sem encravamentos; todas completam).

{{GOLDEN}}
