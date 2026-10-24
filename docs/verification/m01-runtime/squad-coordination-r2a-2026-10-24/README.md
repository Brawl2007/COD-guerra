# Coordenação da secção polaca no combate principal: avistar, avisar, reagir, receber ordens e mudar de posto — 2026-10-24 (R2-a)

Ramo local `claude/exciting-bohr-k8v5xm-r2a` (de `c66436d4`, candidata #80 + mãos / ADS / desempenho / clarões + R1-a). **Não publicada**, sem revisão crítica independente, **sem playtest humano**. Ordem do Capitão a partir da queixa do proprietário: «aliados e inimigos mostram pouca inteligência; os polacos fazem pouco para contrariar o ataque; os aliados só coordenam na retirada». Esta entrega é a parte aliada (os polacos); a IA alemã (R2-b) não foi tocada.

Resumo em duas linhas: entre a primeira bomba das 04:34 e a demolição leste das 06:10 a secção (Zieliński, Kowal, Pawlak, a voz do pelotão leste e Bąk) **avista, avisa, reage de maneira diferente de cada vez, recebe ordens do sargento e o par Pawlak / voz muda de posto**; os alemães, o jogador e o enredo ficam **byte a byte** como estavam (provado tick a tick, nas duas rotas do golden, e por 72 + 144 corridas de dificuldade e de perigo).

## 1. O que a simulação fazia antes (medido em `c66436d4`, 24 rotas)

- A secção ficava de joelhos nos lugares T38 atrás dos sacos de areia do posto (`cv_squad_post`). Só Kowal disparava (rkm, o seu fluxo de IA e a sua cadência); Pawlak, a voz do pelotão e Bąk nunca disparavam; ninguém mudava de posição antes das 06:10 (a fatia 3 só coordena **depois** da demolição).
- As falas reactivas que já existiam (110–111 ckm, 120–124 MG34, 128–135 portões e tabuleiro, 138–139, 143, 160) disparam por eventos de fogo alemão (`enemy-fire`, `round-impact`), não porque alguém viu alguma coisa: ninguém «avisava» nada a ninguém.
- Na janela 05:30–06:10 (por minuto de tempo **real** passado dentro dela): **2,07** falas reactivas de polacos por minuto, **0** chamadas de avistamento, **0** padrões de reacção, **0** mudanças de posto, e o maior intervalo sem **nenhuma** acção aliada a menos de 80 m do jogador era de **203 s** em média (mediana 210 s, máximo 225 s).

## 2. O que mudou no jogo

Módulo novo `src/game/m01-section.js` (a fatia 4, sobre as peças da fatia 3 de `m01-squad.js`: `moveActor` com o navegador A*, a regra de chegada, os `squadMove` do realizador de falas, um registo guardado, validado e ausente nos saves antigos) e três pontos de entrada em `src/game/m01-simulation.js` (`stepSection` antes de os homens andarem, `afterSection` depois do combate, `noteCasualty` quando um dos nossos é atingido). Janela: da primeira bomba das 04:34 (`evt_m01_bombing_0434`) à demolição leste (`evt_m01_east_demolition`); o contacto com os alemães começa com o comboio 963 (`evt_m01_train963_arrives`, 04:45).

1. **Avistar e avisar.** Os olhos da secção (Zieliński no ponto de reunião, Pawlak e a voz quando se levantam sobre os sacos, Bąk no tabuleiro) olham à vez, um por varrimento de 0,45 s. Um alemão que disparou nos últimos 2,4 s e que o vigia **vê** (a linha de visão do próprio mundo, a partir da postura que o vigia tem de facto: só quem está de pé ou fora dos sacos vê os portões) é uma ameaça **nova**, a não ser que a secção a tenha chamado há pouco (40 s para os MG34, 50 s por lado dos portões, 60 s o dique, 45 s uma posição sob fogo). O vigia emite um evento `section-callout` (`kind` `mg` / `gate` / `dike`; o `side` do portão **como o jogador o vê**; quem chama; o alvo; o marco `gate` / `dike` / `deck`). O tabuleiro lê-se pelas fases do ataque (`deck` à primeira vista, `advance` a cada novo lanço, `fallback`, `down` quando cai um); uma posição sob fogo chama-se a si mesma (`pinned`); um homem nosso atingido por uma bomba (R1-a) ou o ferimento de Bąk chama-se `casualty`, por quem estiver mais perto (≤ 70 m).
2. **Reacções variadas, não idênticas.** Cada homem ao alcance da voz (≤ 160 m) reage **uma vez** a cada chamada com um sorteio **do seu próprio fluxo**: o fuzileiro **dispara** no alemão chamado (1 a 3 tiros com o ferrolho do próprio fuzil, `boltSec` 1,7–2,8 s, de pé 0,5 s antes e 0,9 s depois de cada tiro), **olha** (levanta-se e volta-se para ele) ou **baixa-se**; Kowal e o sargento só se voltam. Os pesos mudam com o tipo de chamada (uma posição sob fogo faz baixar, o tabuleiro faz disparar). Kowal continua a disparar o rkm com o **seu** alvo e a **sua** cadência (a chamada aponta para o alemão que ele já tem, quando o tem). O par também se levanta sozinho de 6 a 12 s em 6 a 12 s para olhar por cima dos sacos (a partir do contacto).
3. **Ordens adaptativas de Zieliński** (`section-order`, no máximo uma de 7 em 7 s e só 1,6 s depois de uma chamada): `focus` quando há dois tipos de ameaça (um só alvo para todos: **todo o fuzileiro que pode dispara nele**, o rkm primeiro se foi chamado, senão o MG34), `hold` (cabeças baixas 20 s: ninguém se levanta sozinho), `shift` (o par Pawlak / voz muda de posto ao longo da trincheira de comunicação quando o seu posto levou 3,2 s de supressão em 18 s) e `return` (14 a 26 s depois), `deck` (às 06:00, na retirada do pelotão, o par sobe ao tabuleiro ao lado do posto do jogador para cobrir os últimos homens e o ataque alemão) e `sector` (um homem caiu: o mais próximo toma o lado dele e volta-se para ele, 2,2 a 4 s depois da chamada).
4. **Baixas.** Sem animação de arrasto nem de socorro no jogo, a reacção é a chamada («Homem caído! Sanitário!») por quem está perto, os outros voltam-se, e o sargento dá o sector ao homem mais próximo. Cobre as baixas da incursão (os homens da guarnição oeste que as bombas da R1-a matam ou ferem) e o ferimento de Bąk no tabuleiro.
5. **Mudar de posto.** O par anda entre «postos» autorados: 0 o lugar T38, 1 e 2 ao longo da trincheira (junto dos nós de cobertura `cv_trench_2` a 12 m e `cv_trench_1` a 27 m a leste), 3 o tabuleiro (sul da faixa do pelotão). Anda com `moveActor` e o A* do navegador, ao passo da fatia 3 (4,2 m/s), de pé enquanto anda e de joelhos quando chega. O bolso do posto (os sacos fecham os lugares T38 a leste, as cabanas a sul) tem uma única entrada, pelo norte: cada homem passa por um **ponto de passagem** próprio, a 1,5 m do outro (ver §6, achados). À demolição o registo acaba e a retirada da fatia 3 leva os homens de onde estiverem.
6. **Falas** (36 novas, `dlg_m01_164`–`199`, ver §10): uma por tipo de chamada (duas variantes), as ordens, as chegadas aos postos, e a «Esse é meu!» de Kowal depois de uma chamada de MG. Entram no realizador de falas por dois gatilhos novos (`section-callout`, `section-order`) e pelo `squadMove` que já existia.

**Fogo dos fuzileiros: de apresentação.** O tiro de um fuzileiro da secção é visto e ouvido (clarão, estampido, carregador, a animação do tiro de fuzil da retaguarda: `shot`, `firedAt`, `SUPPRESS`, evento `npc-shot` com `weapon: 'ally_rifle'` e `target`) mas **não traça ronda, não suprime nem fere nenhum alemão**. É a decisão que mantém os alemães e o jogador byte a byte iguais (o enunciado pedia «dentro de ±10 % do perigo para o jogador, salvo justificação»: ficou em 0 %). Para o tornar real basta trocar `shoot()` pelo que `squadCoverFire` já faz (traçar a ronda e supressão do alvo): move os alemães, exige nova emenda do golden e nova medição do perigo. **Não foi feito.**

## 3. O que fica igual

Cadência, alvo e postura de Kowal; a ckm; todas as decisões dos alemães e todos os sorteios de `this.rng` (a secção tem **cinco fluxos próprios**, índices 75–79, derivados do **estado** do fluxo principal quando o registo começa, lidos e nunca sorteados); a rota, a vida e o perigo do jogador; objectivos, B4, contagens de sobreviventes (12 / 18), o ataque ao tabuleiro, a retaguarda, a escolta SP-08, os encravamentos da ckm, os níveis recruta / soldado / veterano, os checkpoints, o esquema 2 dos saves (campo novo **opcional** e validado; save antigo carrega, recebe o registo no tick seguinte). O que os alemães vêem dos polacos (só Kowal é alvo) não muda.

## 4. Medido (24 rotas do piloto de teste: 12 sementes × controlo e apoio; janela 05:30–06:10, por minuto **real** dentro dela)

Ferramenta nova `tools/verification/m01-squad-coordination-metrics.mjs` (só lê; `--rev` mede qualquer commit com o mesmo piloto e a mesma contagem; `--summary` agrega). Antes = `c66436d4`, depois = esta árvore. Linhas: `metrics-before.jsonl`, `metrics-after.jsonl`, resumo `METRICS_SUMMARY.json`.

| Medida (média das 24 rotas) | Antes | Depois |
|---|---:|---:|
| Falas reactivas de polacos por minuto | 2,07 | **3,70** |
| … das quais chamadas (avisos de ameaça, de baixa, de posição sob fogo) | 1,22 | **2,87** |
| Respostas a ordens por minuto | 0 | 0,23 |
| Ids de fala reactiva distintos por rota (total nas 24) | 9,46 (17) | **17,17 (39)** |
| Eventos de chamada (`section-callout`) por minuto | 0 | **5,49** (4,33–6,57) |
| Padrões de reacção distintos por rota (total nas 24) | 0 | **24,9** (19–32) (110) |
| Tiros de fuzil polaco na janela | 34,0 | **60,8** (48–73) |
| … em alvos que um polaco chamou (≤ 25 s antes) | 0 | **45,3** (29–67) |
| Rajadas do rkm / da ckm na janela | 63,0 / 27,5 | 63,0 / 27,5 (iguais) |
| Mudanças de posto (episódios de marcha da secção) | 0 | **6,5** (2–14) |
| Maior intervalo sem acção aliada a ≤ 80 m do jogador | 203,2 s (mediana 209,6; máx. 224,8) | **26,3 s** (mediana 26,7; máx. 38,5) |
| Feridas do jogador / saúde mínima / rondas alemãs a < 25 m | 2,04 / 83,7 / 138,7 | 2,04 / 83,7 / 138,7 (iguais) |
| Duração real da rota, completação, 4 checkpoints, sobreviventes | 1169,98 s, 24 / 24, 24 / 24, 12 × 12 e 18 × 12 | iguais |

Nas duas rotas do golden: **controlo 19390901** (41 chamadas, 16 ordens, 32 padrões, 57 tiros, 50 em alvos chamados dos quais 24 de Kowal, 10 episódios de marcha, 219 m e 226 m andados por Pawlak e pela voz, intervalo sem acção 193,6 s → 17,0 s) e **apoio 7** (34 chamadas, 12 ordens, 23 padrões, 72 tiros, 52 em alvos chamados dos quais 19 de Kowal, 2 episódios, 96 m e 92 m, 210,3 s → 16,7 s). As 24 rotas, por tipo de chamada: pinned 247, gate 149, dike 135, advance 111, mg 73, fallback 40, down 36, deck 24, casualty 24 (Bąk); por quem chama: Pawlak 398, voz 240, Zieliński 155, Bąk 46; ordens: focus 159, hold 64, shift 25, return 27, deck 24, sector 24. As cronologias completas das duas rotas (cada chamada com o que cada homem fez, cada ordem, cada fala ouvida) estão em `TIMELINE_CONTROL_19390901.txt` e `TIMELINE_SUPPORT_7.txt`.

**Custo por tick** (medido com o relógio da máquina, partilhada: ordem de grandeza, não um orçamento): a secção gasta em média 33–34 µs por tick (3,2–3,3 % do tick) e, dentro da janela, 49–51 µs (4,2–4,3 %); mediana 11 µs, p99 0,75 ms, p99,9 2,5 ms; o pior tick isolado 7–9 ms (o tick de simulação tem 50 ms).

**Integridade** (`audit-24-routes.jsonl`, `tests/helpers/m01-clipping.js` em todos os homens e todos os sólidos, a cada tick, nas 24 rotas): **0 eventos de clipping e 0 pares de homens um dentro do outro**; as 24 completam com os 4 checkpoints e os mesmos 12 estados de objectivo. (Esta auditoria correu sobre a árvore de trabalho imediatamente antes do último ajuste do código, `q.say` passar a substituir o registo pendente de uma chegada em vez de o manter, que não toca em nenhuma posição; a auditoria do golden volta a correr sobre a árvore final nas duas rotas e em 3 e 7 com e sem apoio: 0 e 0.)

## 5. Prova de neutralidade (alemães, jogador e enredo iguais)

- **`tests/m01-section.test.js`, teste «what the section does cannot be felt…»**: a mesma rota, nas duas rotas do golden, com uma subclasse `NoSection` que anula `stepSection` / `afterSection` / `noteCasualty`, dá o mesmo resumo (sha256) de: todos os eventos (sem os da secção, sem os tiros de fuzil com alvo da própria secção, sem a lista de polacos a que uma ronda pôs supressão e sem a mensagem de HUD que substitui a ordem de mudar de cobertura quando o realizador não a pode dizer, como nas emendas 10 e 12) a cada tick, e, a cada 5.º tick, o relógio, o fluxo principal, o jogador, a arma, as granadas, o fogo em voo, os objectivos, as bandeiras, os eventos consumidos, os checkpoints e **todos os alemães**; do primeiro ao último tick antes da demolição leste.
- **Golden emenda 17, passo 2 da ferramenta oficial**: nas duas rotas e nas outras quatro (sementes 3 e 7, com e sem apoio) os 12 objectivos, os 4 checkpoints, os eventos consumidos, os sobreviventes e as bandeiras do enredo são os do predecessor, o relógio **real** de cada evento é o mesmo (`movedEvents` vazio nas duas rotas), os ticks são os mesmos (23 402 e 23 354) e as rondas alemãs por minuto real são as mesmas (92,2 e 62,48).
- **Varrimentos de dificuldade e de perigo** (`m01-difficulty-sweep.mjs`, 72 corridas: 3 níveis × 24 rotas; `m01-danger-sweep.mjs`, 144 corridas): **72 / 72 e 144 / 144 linhas idênticas** (todos os campos: morte, vida final, ticks, ferimentos, colisões, quem matou, tempo até à morte) entre `c66436d4` e esta árvore: 0 % de diferença no perigo, por nível. Para referência (iguais antes e depois, piloto de testes, não um jogador): recruta 0 mortes em 24; soldado 22 em 24; veterano 24 em 24.

## 6. Achados durante a medição (todos corrigidos antes do golden)

- **Clipping** (semente 3, rota de controlo, 05:03:06, `staszek_pawlak` contra `cv_squad_post`): o regresso do par à trincheira → lugar T38 fazia-o raspar a esquina nordeste do saco de areia (a rota do navegador contorna o saco pelo norte, junto do lugar de Kowal, e o homem passou a menos de 0,35 m da esquina, quando o corpo tem 0,30 m de raio). **Correcção**: ponto de passagem por homem a norte do saco (`SECTION.pocket.gates`: Pawlak (−70,2; 25,7), a voz (−71,7; 26,3), a 1,5 m um do outro) e regras sem estado que só lêem onde o homem está e para onde vai (`gateGoal`). O mesmo ponto único dava **pares empilhados** em 4 rotas (sementes 1, 2, 4 e 6, 0,34 m durante 1–2 ticks) quando os dois chegavam juntos. Teste de dados novo: o ponto é livre, a perna lugar → ponto é livre de sólidos ao raio do corpo e a recta lugar → trincheira não é.
- **`updateSquad` (fatia 3)**: o par passa a estar no tabuleiro à demolição, à vista do ataque alemão, e é suprimido nesse tick; a regra «suprimido antecipa o lanço» disparava então o 1.º lanço durante a cena do rebentamento e a fala 155 (a ordem guionada) deixava de ser dita. **Correcção** em `src/game/m01-squad.js` (uma cláusula): a supressão antecipa qualquer lanço **menos** o 1.º, o da ordem guionada. Nenhuma outra linha do módulo mudou.
- **Validador do registo**: o save do tick que consome a demolição ainda leva o registo (o tick seguinte apaga-o); o validador recusava-o. Agora aceita-o nesse tick e recusa-o a partir do seguinte.
- **Testes de postura**: `m01-combat-posture-staging` exigia toda a secção ajoelhada fora do rkm; o par agora levanta-se por pedido da própria secção (olhar, disparar). E um homem que chegava a um posto ficava ajoelhado no próprio tick em que ainda andava; a regra «anda, logo está de pé» do mesmo teste apanhou-o (corrigido: quem se moveu neste tick não leva postura da secção). Ver §8.
- **Falas de chegada (196–199)**: «melhor esforço»: tentadas durante 8 s; se o canal está ocupado (por exemplo pelo ferimento guionado de Bąk, 041–043, às 06:04) ou dentro do intervalo do realizador, perdem-se. Uma janela de 20 s foi experimentada e rejeitada: dizia «De volta aos sacos!» 18 s depois de o par já ter partido para o tabuleiro.

## 7. Golden: emenda 17 (`squad-coordination`)

Escrita **só** pela ferramenta oficial (`node tools/verification/m01-integration-golden-audit.mjs --amendment 17 --write`, x86), predecessor `c66436d444e94fa4a9f083c303a58185c4177d85` (a emenda 16, que passa a história com `after` = esse commit). Fixture `tests/fixtures/m01-squad-coordination-gameplay-baseline.json`, conta `GOLDEN_AMENDMENT_17.json`.

- **1.ª diferença**: tick 1356 (04:34:00), `$.state.timers.section` (o registo novo, ausente no predecessor), nas duas rotas; as duas simulações são idênticas, tick a tick, até lá (2 blocos de 512 ticks).
- **1.ª diferença de comportamento** (com o registo, o do realizador, o estado do diálogo, os eventos da secção e a mensagem de HUD da ordem de cobertura retirados dos dois lados): tick 1481 (04:34:22), `$.state.actors.0.facing`, Zieliński (−3,0406 contra 0,11): volta-se para quem chama o primeiro homem caído da incursão. Regex pinados: `^\$\.(state|checkpoint)\.timers\.section$` e `^\$\.(state|checkpoint)\.actors\.\d+\.(facing|crouched)$` (homens da secção).
- Ticks: controlo 23 402 → 23 402, apoio 23 354 → 23 354; **nenhum evento muda de relógio** (real ou de batalha); mesmos sobreviventes (12 / 18), mesma vida final (84 / 100); clipping 0 e empilhamento 0 nas duas rotas e nas outras quatro.
- Entradas que mudaram desde o predecessor: `m01-simulation.js`, `mission.json`, `m01-barks.js`, `m01-audio-events.js`, `m01-squad.js`, `m01-section.js` (novo).
- `check` (regerar sem `--write` e comparar byte a byte): ver §9.

## 8. Testes

- **Novos**: `tests/m01-section.test.js` (11 testes: dados dos postos, do ponto de passagem, dos fluxos e das regras; registo (janela, validado, recusado quando malformado); chamadas bem formadas e utilizáveis pelo realizador; reacções que diferem entre eventos e entre tipos, com o clip do próprio fuzil; o par muda de posto (deslocação, regresso, tabuleiro); as ordens cumprem-se (focus dispara, hold mantém cabeças baixas, sector volta o homem); neutralidade (ambas as rotas); save a meio de uma reacção (tiro à espera, deslocação, marcha para o tabuleiro, posto no tabuleiro, homem caído) com duas restaurações; saves antigos (sem registo, fluxos derivados do estado guardado, sem sorteios do principal); variedade dos fluxos (outros fluxos, outras respostas); baixas) e 36 casos em `tests/m01-barks.test.js` (um por fala nova, mais a «Esse é meu!»).
- **Alterados, com causa datada em cada ficheiro e nenhuma asserção apagada**:
  - `tests/m01-combat-posture-staging.test.js` (2026-10-24, emenda 17; a asserção foi alargada, não apagada): o ciclo da secção aceita um homem de pé (Pawlak, a voz, Bąk) só enquanto um olhar da secção está activo, um tiro dele está a menos de `fire.riseSec` ou disparou há menos de `fire.holdSec`; Kowal e o sargento como antes; contador novo `sectionUp`; asserção nova: de pé 3 a 9 % das vezes que ajoelhados (12 sementes), e `sectionKneel > 1000` mantida. A propriedade testada (ninguém está de pé no posto a não ser que algo o peça, e só por esse tempo) não mudou.
  - `tests/m01-animation-contract.test.js`: a emenda 16 passa a história (`sourceSha256` do `c66436d4` literal, `m01-blast.js`, `m01-garrison.js`, nível, retaguarda, tabuleiro e pátio iguais aos vivos, barks / audio-events / mission.json «moved with amendment 17»), a 14 deixa de exigir `m01-squad.js` igual ao vivo (moveu na 17, uma cláusula, ver §6) e a emenda 17 é o golden vivo com o seu teste (cadeia, bytes das entradas, 1.ª diferença, 1.ª de comportamento, ticks e eventos iguais).
  - `tests/m01-section.test.js` (próprio): o limite de 8 s entre a chamada e a ordem de sector passou a 4 + 7 + 1,6 s, o limite de projecto (dois homens caídos no mesmo tick dão ordens em sequência, 9,4 s na semente 19390901); a fala de chegada passou a «melhor esforço».
- **Pré-existente, não é desta entrega**: `tests/m01-t49-scratch-reuse.test.js` («C: impostor matrices, ink, shape, rim uniforms and diagnostics equal the pre-change golden») falha em `c66436d4` e nesta árvore, igual: o commit `468d2153` («VIS-a … DE impostor contrast margin») mudou a tinta dos impostores alemães e o golden desse teste (`tests/fixtures/m01-t49-scratch-golden.json`) ficou por regenerar. Ficheiros de renderização, fora do âmbito; não toquei.

## 9. Verificação

Tudo na árvore `d0a1c758` (último commit de código, dados, golden e testes é `74ea1907`; `d0a1c758` só acrescenta documentação e evidência), x86, máquina partilhada de 4 núcleos. Nada disto é playtest.

- **`npm test` completo, uma só corrida em `d0a1c758`** (54 min): **1654 testes, 1653 verdes, 1 vermelho**. O vermelho é o já descrito em §8, `m01-t49-scratch-reuse` «C: impostor matrices … equal the pre-change golden», que falha igual em `c66436d4` (verificado também sobre a árvore extraída do predecessor) e é anterior a esta entrega (golden da tinta dos impostores alemães ficou por regenerar no commit `468d2153`, VIS-a). **Não toquei nele.** Antes da corrida única, lotes focados serviram para triar: lote 1 (12 ficheiros do combate, 180 testes) achou os 13 vermelhos de postura e 7 da janela do registo / da ordem 155, lote 3 (79 ficheiros, 729 testes) só o do impostor; todos corrigidos antes do golden.
- **`npm run build`**: OK (`vite build`, aviso de tamanho de chunk que já existia).
- **Golden emenda 17**: escrita pela ferramenta oficial **uma vez sobre o código final** (`--amendment 17 --write`; duas tentativas anteriores abortaram: a 1.ª na guarda de clipping da semente 3, a 2.ª foi interrompida de propósito por eu ter mudado o código) e, depois, **`--amendment 17` sem `--write`: «check: identical»**; **`--amendment 16`** (agora história, `after` = `c66436d4`): **«check: identical»**. Teste de contrato `tests/m01-animation-contract.test.js`: 35 / 35 (as duas rotas do golden, tick a tick).
- **Testes novos e tocados, corridos sozinhos sobre o código final**: `tests/m01-section.test.js` 11 / 11; `tests/m01-barks.test.js` 145 / 145 (36 casos novos). Todos os outros ficheiros que esta entrega pode tocar (`m01-combat-posture-staging`, `m01-escort-coordination`, `m01-deck-assault`, `m01-german-retreat`, `m01-bomb-effects`, `m01-combat-ai`, `m01-cover-*`, `m01-east-front`, `m01-rearguard`, `m01-schema2-determinism`, `m01-fair-death`, `m01-difficulty-*`, …) passaram dentro da corrida completa.
- **Medições** (§4, §5): 24 rotas antes / depois, auditoria de clipping e empilhamento nas 24 (0 e 0), 72 + 144 corridas de dificuldade e de perigo idênticas às do predecessor, golden: nenhum evento muda de relógio.
- **Não corrido**: `npm run test:browser` (Playwright); inspecção visual de qualquer espécie; nenhum jogador humano.

Reproduzir: `node tools/verification/m01-squad-coordination-metrics.mjs --label after --jsonl <f>` (e `--rev c66436d4 --label before` para o predecessor, `--audit` para clipping e empilhamento, `--summary <f>` para a tabela do §4); `node tools/verification/m01-difficulty-sweep.mjs --jsonl <f>` e `node tools/verification/m01-danger-sweep.mjs --jsonl <f>` (uma vez sobre cada árvore, comparar linha a linha); `node tools/verification/m01-integration-golden-audit.mjs --amendment 17` (sem `--write` regera e compara byte a byte).

## 10. Falas para revisão por falante nativo (todas escritas por agente de IA; o polaco **não** foi revisto)

Cada fala leva em `note` o polaco, a data e a marca «polaco por rever por falante nativo» (o teste de dados exige-a). A legenda é a portuguesa. «Sanitário» e «tabuleiro» seguem o vocabulário das falas já existentes (100, 106, 107; tabuleiro do dique).

| Id | Falante | Legenda (PT) | Polaco (por rever) | Quando |
|---|---|---|---|---|
| 164 | Pawlak | Metralhadora à esquerda do portão! | Cekaem na lewo od bramy! | chamada `mg`, lado esquerdo |
| 165 | Bąk | A da esquerda acordou! Cabeças baixas! | Ten z lewej się obudził! Głowy nisko! | `mg`, esquerdo |
| 166 | Pawlak | Metralhadora à direita do portão! | Cekaem na prawo od bramy! | `mg`, direito |
| 167 | Bąk | A da direita começou! Abaixem-se! | Ten z prawej zaczął! Padnij! | `mg`, direito |
| 168 | voz do pelotão | Atiradores nos portões! | Strzelcy w bramach! | `gate` |
| 169 | Bąk | Mais um no portão! Vi o clarão! | Jeszcze jeden w bramie! Widziałem błysk! | `gate` |
| 170 | Bąk | Atiradores no dique! Cabeças baixas! | Strzelcy na wale! Głowy nisko! | `dike` |
| 171 | Pawlak | Dique! Atiram do dique! | Wał! Strzelają z wału! | `dike` |
| 172 | Pawlak | Alemães no tabuleiro! Estão a entrar! | Niemcy na przęsłach! Wchodzą! | `deck` (1.ª vista) |
| 173 | voz do pelotão | Vêm pelo tabuleiro! Aí vêm eles! | Idą po przęsłach! Są tutaj! | `deck` |
| 174 | Pawlak | Avançam! Mais um lanço! | Idą naprzód! Kolejny skok! | `advance` |
| 175 | voz do pelotão | Estão mais perto! Avançam! | Są bliżej! Idą! | `advance` |
| 176 | Pawlak | Recuam! Estão a recuar! | Cofają się! Odchodzą! | `fallback` |
| 177 | voz do pelotão | Largaram o tabuleiro! | Schodzą z przęseł! | `fallback` |
| 178 | Pawlak | Caiu um! Menos um! | Jeden padł! Jednego mniej! | `down` |
| 179 | voz do pelotão | Acertaram um! Continuem! | Trafiony! Dalej! | `down` |
| 180 | Pawlak | Apontam-nos! Cabeças baixas! | Mierzą w nas! Głowy nisko! | `pinned`, chama Pawlak |
| 181 | voz do pelotão | Estão em cima de nós! Abaixo! | Są na nas! Padnij! | `pinned`, chama a voz |
| 182 | Pawlak | Homem caído! Sanitário! | Człowiek na ziemi! Sanitariusz! | `casualty`, chama Pawlak |
| 183 | voz do pelotão | Atingiram o posto! Sanitário! | Trafili stanowisko! Sanitariusz! | `casualty`, chama a voz |
| 184 | Kowal | Um caído! Perto da trincheira! | Jeden leży! Przy rowie! | `casualty`, chama Kowal |
| 185 | atirador da ckm | Há um caído! Sanitário, depressa! | Ktoś leży! Sanitariusz, szybko! | `casualty`, chama a guarnição da ckm |
| 186 | Kowal | Esse é meu! | Ten jest mój! | depois de uma chamada `mg` (164–167), 1,2 s, até 3 vezes |
| 187 | Zieliński | Todos no da esquerda! Fogo! | Wszyscy na tego z lewej! Ognia! | ordem `focus`, esquerda |
| 188 | Zieliński | Todos no da direita! Fogo! | Wszyscy na tego z prawej! Ognia! | `focus`, direita |
| 189 | Zieliński | Mesmo alvo! Juntos! | Ten sam cel! Razem! | `focus`, sem lado |
| 190 | Zieliński | Mantenham as posições! | Utrzymać pozycje! | ordem `hold` |
| 191 | Zieliński | Ninguém sai do lugar. | Nikt się stąd nie rusza. | `hold` |
| 192 | Zieliński | Pawlak! Mudem de posição! Trincheira! | Pawlak! Zmiana pozycji! Rów! | ordem `shift` |
| 193 | Zieliński | Voltem aos sacos! Já! | Wracać za worki! Już! | ordem `return` |
| 194 | Zieliński | Pawlak! Ao tabuleiro! Cubram os nossos! | Pawlak! Na przęsła! Osłaniać naszych! | ordem `deck` |
| 195 | Zieliński | Tu! Assume o lado dele! | Ty! Przejmij jego sektor! | ordem `sector` |
| 196 | Pawlak | Em posição no tabuleiro! | Na pozycji na przęśle! | chegada ao tabuleiro |
| 197 | voz do pelotão | Daqui cobrimos! | Stąd osłaniamy! | chegada ao tabuleiro |
| 198 | Pawlak | Na trincheira! | W rowie! | chegada à trincheira |
| 199 | Pawlak | De volta aos sacos! | Z powrotem za workami! | chegada ao lugar T38 |

Todas com `near` ao falante (o jogador tem de estar a 90–150 m conforme o tipo de fala). Prioridade 1: 19 falas (a 1.ª variante de cada chamada, as chamadas de baixa, as ordens `focus`, `shift`, `deck` e `sector`); prioridade 2: 16 (as 2.ªs variantes, `hold`, `return`, a «Esse é meu!» e as chegadas); prioridade 3: a 179. Os limites globais do realizador (intervalos de 4 / 6 / 8 s, orçamentos de 8 / 7 / 5 por minuto, vida na fila de 2,5 / 5 / 8 s) mantêm-se. Nas duas rotas do golden dizem-se, ao longo da rota, 30 (controlo) e 28 (apoio) destas 36 (ver as cronologias).

## 11. Em aberto

- **Sem playtest humano.** Os números dizem que há avisos, reacções, ordens e marchas com variedade, e que nada mais se moveu; não dizem se **soa** inteligente. Os intervalos (varrimento 0,45 s, 2,4 s de aviso, repetições de 40 a 60 s, ordens de 7 em 7 s) são valores de partida.
- **O fogo dos fuzileiros é de apresentação** (§2). Os polacos vêem-se e ouvem-se a responder, mas só o rkm de Kowal e a ckm mexem nos alemães, como antes. É a escolha que dá neutralidade; o custo é que o proprietário não vê os alemães sofrer mais.
- **Polaco por rever** (§10); algumas falas de ordem usam o imperativo plural («Mantenham»), no polaco o tratamento pode querer outro registo militar.
- **Sem animação de socorro nem de arrasto**: a reacção a uma baixa é só a chamada, o olhar e a ordem de sector.
- **A fala de chegada é melhor esforço** (§6).
- **Pós-demolição**: o par chega à demolição no tabuleiro e a retirada da fatia 3 leva-o de lá; nas 6 rotas auditadas pelo golden nada se move em tempo (eventos, ticks), mas a marcha do par é mais longa que a de quem estava no posto (o 1.º lanço parte da ponte, não de x −71).
- **As baixas da incursão** (04:34–04:45) que a secção chama são as da guarnição oeste da R1-a (duas mortas e duas feridas nas rotas do golden); se a R1-a mudar esses números, o teste de baixas muda com eles.
