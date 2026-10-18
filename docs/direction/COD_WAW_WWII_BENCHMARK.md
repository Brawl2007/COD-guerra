# M01 — referência de sensação: Call of Duty: World at War (2008) e Call of Duty: WWII (2017)

Directiva do proprietário (2026-10-18): a M01 deve ter uma sensação **comparável** às duas referências, com implementação e assets **totalmente originais**
(nada de código, mapas, sons, animações ou assets extraídos; nenhum nome COD no código). Este documento compara sistemas, não copia conteúdo.
As colunas WaW/WWII descrevem por palavras próprias o comportamento de referência; quando a descrição depende de memória de jogo não confirmada nesta
sessão, está marcada **NÃO VERIFICADO**. A coluna COD-guerra cita medições reais do repositório (simulação determinista, piloto de testes), não playtest humano.

Secções por equipa (cada uma escrita na sua branch; os merges concatenam):
- **Ritmo e objetivos** — esta secção (branch `claude/busy-ritchie-3fkvk2-pacing`).
- **Combate e IA** — secção da equipa de combate (outra branch).

---

## Ritmo e objetivos

### Como foi medido

- Rotas reais: `tests/helpers/m01-route.js` (`route()`, rota de controlo: agachado nos sacos de areia) e `tests/helpers/m01-cover.js`
  (`coverRoute(seed,'help')` dispara sobre a MG dos portões e sobre os alemães no tabuleiro; `'ignore'` fica abrigado e deixa Bąk ao Dudek). Semente 19390901, tick 0,05 s.
- Script de medição (fora do repo, só leitura da simulação): por tick, escala do relógio (Δ battleClock / Δ real), objectivo obrigatório activo, texto e estado do
  painel, marcador; **batidas com significado** = mudança de objectivo, fala (legenda), mensagem não-repetitiva, explosão a < 250 m, bala a estalar perto do
  jogador, checkpoint, cena. Mensagens de continuidade e de orientação («X m, à sua direita») não contam como batida. **Parado** = piloto sem mover, disparar ou interagir.
- É um teste de estado e de controlo, **não** um playtest. Não mede FPS nem sensação.

### Linha temporal — antes (f6913a0) e depois (esta branch)

Rota de controlo (`route()`, sem apoio). Segundos reais desde o fim da introdução.

| Trecho (relógio de batalha) | Escala antes | Real antes | Escala depois | Real depois | Nota |
|---|---|---|---|---|---|
| 04:30:44–04:33:10 mensagem ao posto | 1× | 17,6 s | 1× | 17,6 s | snap 04:33:10 ao entregar (existente) |
| 04:33:10–04:34:00 aviões a aproximar | 1× | 50,0 s | 1× | 50,0 s | sem objectivo; agora painel «Mensagem entregue. Fique com o posto — aviões a norte». Não comprimido: a trajectória dos Stukas assume 1× (`m01StukaAnchor`) |
| 04:34–04:45 bombardeamento, sapadores, caixa | 3,5× | 188,5 s | 3,5× | 188,5 s | inclui 49 s à espera do comboio 963 (04:42–04:45) |
| 04:45–fim do reparo | 9× | 164,1 s | 9× | 164,1 s | rota de controlo não dispara: o reparo leva o tempo que o fogo deixa |
| fim do reparo–05:30 | 27× (readyScale) | 45,2 s | 27× | 45,2 s | agora com cartão «Mais tarde…» e painel «Reparo concluído. Aguarde a ordem com a secção» |
| 05:30–05:34:20 2.º raide | 8× | 32,5 s | 8× | 32,5 s | |
| 05:34:20–05:59 em posição no tabuleiro | 8× | ~185 s | **24×** | **61,6 s** | `seg_hold.compress`, só com o jogador no tabuleiro |
| 05:59–06:10 retirada do pelotão leste | 8× | ~82 s | 8× | 82,2 s | combate real; inalterado |
| 06:10–06:44 sair da ponte, corredor, Dudek leva Bąk à estação | 8,5× | 240,0 s | 8,5× | 240,0 s | inalterado: regra aprovada B4 (a carga espera Bąk entregue na estação) |
| 06:44–06:44:30 e gate oeste | 1× + 0× | 29,5 + 37,9 s | idem | 29,5 + 37,9 s | Dudek a 1,6 m/s com Bąk; **decisão humana pendente** (ver matriz) |
| 06:45–07:05 abrigo, fade 07:05 | 1× + salto | 14,9 s | idem | 14,9 s | |
| **Até às 06:00** | | **690,9 s** | | **567,6 s** | −123 s |
| **Missão completa** | | **1093,1 s** | | **969,8 s** | −123 s (−11 %) |

Rota com apoio (`coverRoute 'help'`): 06:00 aos 665,0 → 541,8 s; missão 1068,1 → 944,8 s. Rota `'ignore'`: igual à de controlo.
Medição com a regra B4 mantida. Uma variante testada nesta sessão (carga oeste a esperar só Bąk fora da zona, x < −90, + 30× no corredor) dava missão em 845,2 s, mas mudava o comportamento aprovado e pinado por `tests/m01-partials-correction-01.test.js`; foi retirada à espera de decisão.

Trechos parados mais longos (piloto sem mover/disparar), rota de controlo: antes 262,0 s (05:35→06:10), 257,6 s (06:17→06:45), 240,7 s (04:43→05:30);
depois 257,6 s (06:17→06:45, inalterado: espera da entrega de Bąk), 240,7 s (escolha da rota: não dispara durante o reparo), 138,6 s (05:37→06:10, inclui os 82 s da retirada em que esta rota fica abrigada).
Maior intervalo sem batida com significado: antes **88,1 s** (05:40:32→05:43:59, em posição no tabuleiro); depois **49,0 s** (04:42:08→04:45, à espera do comboio 963;
rota com apoio: 55,0 s, 05:40→06:00 já comprimido). Nenhum trecho > 60 s sem batida nas três rotas medidas.

### Objectivo, marcador e estado por fase (depois)

| Fase | Texto do painel | Marcador no ecrã (novo) | Estado / razão (novo ou existente) |
|---|---|---|---|
| Mensagem | Leve a mensagem e o café ao posto da ponte | Posto da ponte ferroviária | — |
| Aviões (04:33–04:34) | Mensagem entregue. Fique com o posto — aviões a norte | — | — |
| Abrigue-se / sargento | Abrigue-se! / Siga a voz do sargento | Sargento Zieliński (ponto de reunião) | mensagem «Zieliński chama-o…» (existente) |
| Sapadores / caixa | Encontre os sapadores… / Traga o material… | Sapadores no aterro → Barracão → Sapadores no 2.º corte | — |
| Reparo | Proteja o reparo da linha | Metralhadora no dique · V para alça 1000 m | Reparo N % · sapadores a trabalhar/deitados (existente) |
| Fim do reparo → 05:30 | Reparo concluído. Aguarde a ordem com a secção | — | cartão «Mais tarde…» + razão |
| Defesa da ponte | Defenda a ponte: tome posição no tabuleiro e mude de cobertura quando mandarem | Posição no tabuleiro rodoviário (até chegar) | «Tome posição… N m, lado» → «Em posição · o pelotão leste (N homens) segura a cabeça de ponte…»; salva real «mude de cobertura» (existente) |
| Retirada | Cubra a retirada do pelotão leste | Últimos homens do pelotão → Alemães no tabuleiro leste | Pelotão leste: N homens… (existente) |
| Bąk (opcional) | … · (Opcional) Leve Bąk até o socorrista | Bąk ferido → Socorrista Dudek | «A carregar Bąk · socorrista Dudek no posto de socorro, N m, lado · E junto dele»; ao levantar: «Bąk está consigo. Leve-o ao socorrista Dudek: N m, lado.»; ao entregar: «Bąk entregue. Dudek trata dele — volte à secção.» + aviso «Objectivo concluído» |
| Saia da ponte | Saia da ponte! Para o posto de disparo | Posto de disparo | Demolição leste · N m, lado (existente) |
| Corredor | Mantenha o corredor aberto até à demolição oeste — conte os que passam | Dudek com Bąk (enquanto o carrega) | «Corredor · passaram X de N» → «Dudek leva Bąk para a estação · a carga oeste espera por eles» → «Todos fora da ponte · os sapadores preparam a carga oeste» |
| Abrigo | Vá para o abrigo | Abrigo | Demolição oeste · siga para o abrigo (existente) |

Antes: o destino só aparecia como mensagem de texto quando o jogador **não** se aproximava (`updateGuide`, a cada 15 s); a defesa da ponte não tinha destino,
razão nem estado; Bąk tinha destino só por mensagem, e o painel não dizia onde estava o socorrista.

### Matriz

| Sistema | WaW | WWII | COD-guerra | Diferença | Gravidade | Causa | Correção | Estado | Prova | Próxima |
|---|---|---|---|---|---|---|---|---|---|---|
| Progressão dirigida pelo jogador | O nível avança quando o jogador chega a um ponto ou cumpre a tarefa; quase nunca espera por um relógio. | Igual; as passagens de tempo acontecem em cenas ou cortes, não em espera jogável. | Relógio de batalha histórico com segmentos de escala fixa; com a tarefa feita o jogador esperava o relógio (05:35→06:00). | Espera real de ~3 min sem tarefa no tabuleiro. | Alta | `advanceBattle` (`src/game/m01-simulation.js`, ~l. 357 antes): só `readyScale` em `seg_repair`; `seg_hold` a 8× fixo. | `clock.segments[].compress` (dados) + `activeCompression` (`src/game/m01-pacing.js`), reutilizando a escala por segmento existente: 24× em posição no tabuleiro após o raide. | Implementado na branch | `tests/m01-pacing.test.js` | Playtest humano no executável |
| Apresentação do tempo comprimido | Corte/fade com legenda de hora — NÃO VERIFICADO para WaW. | Cartão de hora/local entre segmentos — NÃO VERIFICADO. | Relógio acelerava sem qualquer sinal (já em `readyScale`). | O jogador não percebia que o tempo saltava. | Média | Nenhuma apresentação. | `sim.tempo` (calculado, não guardado) → cartão «Mais tarde…» com razão + relógio a pulsar (`src/ui/m01-hud.js`, `src/styles.css`). Sem fade: o combate continua visível. | Implementado | teste de estado; captura de browser única (ver Prova abaixo) | Avaliar fade curto opcional |
| Marcador de objectivo | Estrela na bússola para o objectivo — NÃO VERIFICADO se há ícone no ecrã. | Marcador no ecrã com distância; companheiros marcados — NÃO VERIFICADO detalhe. | Só mensagem de texto quando o jogador não progride. | Sem direcção persistente. | Alta | `updateGuide` emite texto, não há marcador. | `sim.objectiveMarker` (rótulo, ponto, distância, rumo; calculado) + marcador na faixa do horizonte, perspectiva correcta, preso à borda com seta quando atrás. | Implementado | `markerScreen` testado; teste de clareza | Ajustar altura/oclusão no playtest |
| Clareza: defesa da ponte | Ordem curta gritada + marcador de posição a defender — NÃO VERIFICADO. | Igual — NÃO VERIFICADO. | «Mantenha a cabeça de ponte — mude de cobertura quando mandarem», sem destino, sem razão, sem fim visível. | O jogador não sabia onde estar nem até quando. | Alta | Texto sem verbo de lugar; `guideTarget` sem caso `hold_access`; `threatStatus` vazio fora da salva. | Texto com verbo e lugar; marcador «Posição no tabuleiro rodoviário»; estado «Tome posição…»/«Volte à posição…»/«Em posição · o pelotão leste (N) segura…». | Implementado | teste de clareza | Fala gravada do Zieliński (asset de voz) |
| Clareza: Bąk → socorrista | Ferido a carregar com marcador do destino — NÃO VERIFICADO. | Interacção «arrastar ferido» com marcador e confirmação — NÃO VERIFICADO. | Mensagem genérica; destino só por texto ocasional; «socorrista» sem lugar. | O jogador não sabia para onde levar Bąk nem que havia prazo. | Alta | Mensagens sem lugar; nenhuma prioridade de estado ao carregar. | Marcador Bąk → Socorrista Dudek; estado ao carregar (prioritário) com distância/lado; mensagens de levantar e entregar com lugar e consequência; aviso de prazo (Dudek às 06:14). | Implementado | teste de clareza | Ícone de ferido no mundo |
| Batidas por progresso do jogador | Guiões disparam por gatilhos de posição. | Igual. | Maioria por relógio; algumas por posição (posto avançado, porta). | Esperas preenchidas só por mensagens repetidas. | Média | Pistas de continuidade a cada 55 s de relógio (a 27×/24× = cada 2 s reais) e fora do objectivo («Proteja o reparo» depois de concluído). | `continuityCues[].requires` + 20 s reais mínimos entre pistas (`continuityAllowed`). Compressão só com condição de jogador. | Implementado | teste de continuidade | Batidas novas com voz (asset) se o playtest pedir |
| Tempo morto ≤ 60 s | Raramente > 30 s sem estímulo — NÃO VERIFICADO número. | Idem — NÃO VERIFICADO. | Antes 88,1 s máx.; depois 49,0 s (espera do comboio 963). | Abaixo de 60 s. | Baixa | — | Nenhuma batida nova necessária. | Medido | script de medição (acima) | Comprimir 04:42–04:43:30 se o playtest sentir a espera |
| Prelúdio 04:33–04:34 | Construção de tensão com som antes do primeiro impacto. | Idem. | 50 s a 1× após entregar, 37 s sem fala. | Aceitável como tensão (áudio dos aviões). | Baixa | Stukas ancorados a 1× (`src/world/m01-aircraft-path.js` `m01StukaAnchor`). | Painel com razão; sem compressão para não quebrar a trajectória. | Mantido | — | Se comprimir, ancorar Stukas ao relógio real (renderer, outra equipa) |
| Corredor 06:17–06:45 | Ninguém espera 4 min parado; a retirada é uma corrida com contacto — NÃO VERIFICADO detalhe. | Idem. | O jogador espera 257,6 s no posto de disparo enquanto Dudek leva Bąk 430 m a 1,6 m/s até à estação. | Maior tempo parado da missão. | Alta | Regra aprovada B4: `readiness(west_demolition)` exige `!bak.carry&&!bak.carriedBy` (pinada por `tests/m01-partials-correction-01.test.js`). | Não alterada. Opções para decisão humana: (a) carga espera só Bąk fora da zona (x < −90) e a chamada conclui a entrega (medido: −125 s); (b) dar ao jogador a tarefa SP-08 (contar homem a homem, voltar à ponte, escoltar Dudek) dos documentos criativos (P3). | BLOQUEADA (decisão humana) | medição acima | Decisão do proprietário |

**O que muda no jogo:** −123 s reais de espera no tabuleiro (06:00 chega aos 567,6 s em vez de 690,9 s); marcador e estado claros na defesa da ponte, no corredor e
no transporte de Bąk; cartão «Mais tarde…» quando o relógio corre; pistas de continuidade sem inundar a legenda.
**O que não muda:** horários históricos dos eventos (relógio de batalha), 12 objectivos, CP-A..D, sobreviventes, 07:05, regra B4 da entrega de Bąk, combate, IA,
física, renderer (excepto a camada HUD), assets, saves antigos (o temporizador novo é opcional e validado).

**Pins e goldens que esta mudança move (re-baseline do Capitão no merge; nada regenerado nesta branch):**
- `tests/m01-animation-contract.test.js` — golden por tick `tests/fixtures/m01-t47-gameplay-baseline.json` (pina o sha256 de `m01-simulation.js` e o digest das duas rotas: o relógio e os textos mudam a partir de 04:33:10) e os testes que dependem da rota dele (CP-A..D resume, Bąk/CKM reload, legacy saves, presentation migration).
- `tests/m01-ckm-candidate-posts.test.js`, `tests/m01-ckm-fire-arc.test.js`, `tests/m01-ckm-live-fire.test.js` (S2 271) — contagens amostradas ao longo da rota (janela pós-reparo mais curta); medidas com a variante já retirada: 784→661 amostras, S2 271→266; recalcular com `tools/m01-ckm-fire-arc.mjs`. As asserções qualitativas mantêm-se.
- `tests/m01-ckm-live-fire.test.js` `rec.ticks>20000` — limite do comprimento da rota (~19 400 ticks agora).

---

## Combate e IA

### Medição (P1 do playtest: «o combate é aborrecido»)

Ferramenta: `tools/verification/m01-combat-ai-metrics.mjs` (só leitura; as duas rotas do golden de `tests/helpers/m01-route.js`: semente 19390901 sem apoio e semente 7 com o piloto de apoio). `--rev f6913a0` mede o predecessor com o mesmo piloto. Tempos em segundos reais (`sim.clock`), amostras a cada 0,5 s. «cv» = desvio-padrão / média dos intervalos entre os inícios de tiros ou rajadas de cada atirador (0 = metrónomo); «repetição» = parte dos intervalos iguais, a ±0,05 s, ao intervalo anterior do mesmo atirador.

| Medida | Antes `f6913a0` (19390901 / 7 apoio) | Depois (fatia 1, `0fd2694`) |
|---|---|---|
| Kowal (rkm wz.28): intervalo médio, cv, repetição | 4,19 / 4,19 s, **0,083 / 0,082**, **72 % / 72 %** | 4,14 / 4,31 s, 0,233 / 0,238, 2,5 % / 5,5 % |
| ckm do pelotão leste (visual, `dp_east_pl_ckm`): média, cv | 10,4 / 9,8 s, 0,219 / 0,220 | 8,4 / 10,1 s, 0,868 / 0,818 |
| MG alemã visual do dique (`dp_east_de_mg`): média, cv | 11,2 / 10,8 s, 0,212 / 0,198 | 10,8 / 11,4 s, 0,872 / 0,788 |
| Atiradores dos portões (12): média por tiro, cv global, cv mediano por homem | 20,2 / 22,4 s, 0,69 / 1,00, 0,64 / 0,69 | 20,9 / 19,5 s, 1,22 / 0,85, 0,92 / 0,83 |
| Atiradores do dique (26): média, cv | 14,1 / 13,9 s, **0,29 / 0,30** | 14,5 / 14,1 s, 0,92 / 0,87 |
| MG34 (2): média por rajada, cv | 12,2 s, 0,59 (semente 7: 1 rajada) | 12,9 s, 1,01 (semente 7: nenhuma; o piloto suprime-a) |
| ckm wz.30 (T47, já respondia a alvos; não alterada) | 6,6 / 6,5 s, 0,20 | 6,6 / 6,4 s, 0,20 / 0,22 |
| Rondas de jogo apontadas a um homem real ou ao jogador (repair, player, squad, platoon, cover) | 744 / 268 | 734 / 279 |
| Rondas encenadas ou de área (`east` que nunca aterra, `attrition` a horas fixas, `area` no posto avançado) | 1205 / 975; `east` = **53 % / 78 %** das rondas de jogo | 1120 / 944; `east` = 53 % / 77 % |
| Rondas só visuais (display, T22) | 1555 / 1509 | 1651 / 1449 |
| Parte apontada de todas as rondas | **21,2 % / 9,7 %** | 20,9 % / 10,4 % |
| Alemão vivo mais próximo do jogador, por fase (mín–mediana) | FIRST_CONTACT 1082 / 1174 m; MAIN_COMBAT 1025–1167 / 1017–1173 m; SET_PIECE 964–1025 / 1013–1017 m; CLIMAX 976–1310 / 1019–1344 m | igual (mín. 963 / 1013 m: a fatia 1 não move ninguém) |
| Tempo com linha de visão a ≥ 1 alemão (e dentro de ±60° do olhar) | FIRST_CONTACT 53 / 50 %; MAIN_COMBAT 90 / 93 % (86 / 92 %); SET_PIECE 100 %; CLIMAX 98 % (0 %, a recuar de costas) | igual (±2 p.p.) |
| Tempo sem nenhum alemão a menos de 100 m | **100 % em todas as fases, nas duas rotas** | igual |
| Maior intervalo, do trem 963 à demolição leste, sem uma ronda a aterrar a ≤ 25 m do jogador nem a estalar junto dele | 252,5 / 102,9 s (1 / 5 intervalos > 30 s) | 238,5 / 102,9 s (1 / 5) |
| Reparo sob fogo (fim, tempo real; imobilizações dos sapadores) | 420,6 / 382,8 s; 44 / 8 | 406,6 / 374,9 s; 41 / 5 |

Leitura honesta: a fatia 1 tira o metrónomo ao fogo (Kowal deixa de repetir 4,05 s em 72 % dos intervalos; o dique e as duas MG visuais passam de cv ≈ 0,2–0,3 para 0,8–0,9) com o **mesmo intervalo médio** por atirador e o mesmo volume. O reparo fica 3 % / 2 % mais curto nestas rotas (uma rota isolada é ruidosa; afinar com várias sementes). Uma primeira versão em que a ameaça do jogador também encurtava as pausas e alongava as rajadas tornou o fogo de cobertura **mais lento** que ignorar a MG (`tests/m01-cover-threat.test.js`, `tests/m01-cover-combat.test.js`), porque o jogador cobre os sapadores ao lado deles; agora a ameaça muda só o alvo preferido. Não muda o que mais pesa na queixa: **o alemão mais próximo nunca está a menos de 963 m** e a parte apontada do fogo continua entre 10 e 21 %. Os tempos mortos são de ritmo e de geografia, não de IA.

### Matriz

| Sistema | WaW | WWII | COD-guerra | Diferença | Gravidade | Causa | Correção | Estado | Prova | Próxima |
|---|---|---|---|---|---|---|---|---|---|---|
| Cadência do fogo inimigo | Atiradores alternam aparecer, disparar 1–3 tiros e esconder-se; o ritmo de cada um é irregular e o conjunto ondula. | Igual, com mais reposicionamento entre tiros (NÃO VERIFICADO no detalhe). | Antes: cada tiro com espera uniforme própria (9–18 s espingarda, 6–13 s MG34), dique cv 0,29–0,30. Depois: espreitar 1–3 tiros a 1,7–2,8 s, cobertura log-normal; cv 0,85–1,22. | Antes, regularidade visível (cada homem um tiro, sempre o mesmo padrão levantar/disparar/ajoelhar). | Alta | `src/game/m01-simulation.js@f6913a0:879` (`9+r()*9`), `:875`, `:873` | Fatia 1: `aiFire` (espreitar / grupo de rajadas / cobertura) | FEITO (fatia 1) | Tabela acima; `tests/m01-combat-ai.test.js` | Ondas de intensidade por fase (director). |
| MG aliada (Kowal, rkm) | Metralhadoras aliadas respondem a ameaças com rajadas curtas desiguais. | Igual (NÃO VERIFICADO). | Antes: 3 tiros a cada 4 s exactos (72 % de repetições). Depois: 2–5 tiros, reacção 2,2–4,8 s a um clarão recente, 3,4–6,2 s à MG; média 4,2 s mantida. | Metrónomo audível. | Alta | `m01-simulation.js@f6913a0:1027` (`kowal.cooldown=4`) | `kowalFire` com fluxo próprio | FEITO | idem | Callout ao mudar de alvo / ao recarregar. |
| MG visuais (ckm do pelotão leste; MG alemã do dique) | — | — | Antes: rajadas a cada 6–14 s / 7–15 s uniformes, alvo ao acaso no grupo (cv 0,20–0,22). Depois: a ckm responde a quem disparou há ≤ 10 s; 45 % das rajadas têm seguimento a 1,2–2,6 s; médias ≈ 10 / 11 s mantidas (cv 0,80–0,87). | Laço repetido. | Média | `missions/m01-tczew/mission.json@f6913a0:284,314`, `m01-display-fire.js` | Chaves `respondSec`, `followUp` (opcionais; ausentes = comportamento antigo) | FEITO | `tests/m01-combat-ai.test.js` (display) | — |
| Fogo apontado vs encenado | Quase todo o fogo inimigo vai a alvos reais; encenação limitada a cenas. | Igual (NÃO VERIFICADO). | 21 % / 10 % das rondas apontadas; 53 % / 78 % do fogo de jogo é `east` (nunca aterra). Depois 21 % / 10 %; `east` 53 % / 77 % (os dados T23 ficam). | Muito fogo é espectáculo à distância. | Alta | `m01-simulation.js@f6913a0:1045` (`east` não aterra), `:881` | Parcial: alvo escolhido por linha de visão e ameaça; o `east` fica (dados T23) | PARCIAL | idem | Frente leste com alvos reais e feridos visíveis (decisão humana: T23). |
| Supressão e reacção | Fogo próximo faz o inimigo baixar-se, perder pontaria e voltar mais tarde. | Supressão mais explícita, inimigos encolhem-se e fogem de posições perigosas (NÃO VERIFICADO no detalhe). | Antes: supressão = só esperar `suppressedUntil` + 1,2 / 2,5 s. Depois: quebra o espreitar/grupo, recuperação sorteada (0,5–3 s / 0–1,5 s MG34), pontaria 1,9× mais larga durante 4 s. | Sem efeito na pontaria. | Média | `m01-simulation.js@f6913a0:828` | `aiPinned` | FEITO | `tests/m01-combat-ai.test.js` | Acumulador de supressão (várias quase-balas = mais tempo no chão; fuga). |
| Recarga | Inimigos recarregam atrás da cobertura; janelas para o jogador. | Igual (NÃO VERIFICADO). | Antes: o registo de recarga existia mas não travava o tiro. Depois: com o carregador vazio o atirador recarrega coberto (≥ 4 s) e a MG34 espera a troca de fita. | Recarga invisível ao ritmo. | Média | `m01-simulation.js@f6913a0:1019` | `aiFire` | FEITO | idem | — |
| Selecção de alvo e ameaça | Inimigos preferem o jogador quando ele se expõe e dispara. | Igual (NÃO VERIFICADO). | Antes: sorteio fixo (50 % leste, 45 % reparo, resto jogador). Depois: pesos por linha de visão; jogador que disparou há < 8 s pesa 3,7× (só muda o alvo, não o volume); alvo anterior pesa 3×. | Inimigo indiferente ao jogador. | Média | `m01-simulation.js@f6913a0:879-883` | `aiTarget` | FEITO | idem (`player who fires becomes the threat`) | — |
| Distância e visibilidade do inimigo | Tiroteios a curta e média distância (10–80 m) com silhuetas claras. | Igual, cobertura destrutível e inimigos visíveis (NÃO VERIFICADO no detalhe). | **Mais próximo ≥ 963 m em toda a missão**; 100 % do tempo sem alemão a < 100 m; LOS 50–100 % mas a 1 km. | O inimigo é um pixel. É a causa principal de «inimigos invisíveis» e de «aviões, clarões e tiros distantes». | **Crítica** | Geografia T38/T23: portões x≈1053–1058, dique x≥1076 (`m01-simulation.js@f6913a0:148-152`); `grp_de_spans` só até x 690 (`:769`) | Não é IA. Precisa de um encontro a curta/média distância. | ABERTO — **decisão humana** (rigor histórico de Tczew) | Tabela acima | Ver «Próximas fatias», 1. |
| Tempos mortos e ondas | Ondas: calma curta → pressão → pico → pausa, guiadas por gatilhos do jogador. | Igual, com set-pieces frequentes (NÃO VERIFICADO). | Maior intervalo sem fogo perto do jogador 252 / 103 s antes, 239 / 103 s depois. | Longos minutos sem perigo. | Alta | Ritmo (`advanceBattle`, espera atrás dos sacos), não a IA | Fora da fatia 1 | ABERTO | Tabela acima | Director de intensidade. |
| Coordenação aliada e callouts | Aliados gritam posições («MG à esquerda!»), avançam e trocam de cobertura. | Esquadra com papéis e pedidos (munição, etc.; NÃO VERIFICADO no detalhe). | Linhas pontuais (`combatCall`, `co_m01_*`); aliados fixos nos lugares T38. | Sem coordenação viva. | Alta | `m01-simulation.js@f6913a0:819` | Desenho abaixo (eventos `callout`) | ABERTO | — | Fatia 3. |
| Movimento entre coberturas, flanqueio, retirada | Inimigos correm entre coberturas, flanqueiam, fogem quando o grupo cai. | Igual, com flanqueios mais visíveis (NÃO VERIFICADO). | Só a retirada T48 (pós-demolição) e o avanço linear do tabuleiro. | Inimigos estáticos. | Alta | `m01-simulation.js@f6913a0:766-771` | Desenho abaixo (MOVE_TO_COVER / FLEE) | ABERTO | — | Fatia 2. |

### Desenho: camada determinística de IA de combate

- **Máquina de estados por soldado** (derivada dos dados, nunca do renderer): `IDLE` (sem alvo) → `COVER` ⇄ `PEEK_FIRE` (1–3 tiros ou 1–3 rajadas) → `RELOAD` (sempre em cobertura) ; qualquer estado → `SUPPRESSED` (no chão; recuperação sorteada; depois «abalado») ; `MOVE_TO_COVER` (salto entre nós de `map-layout.coverNodes` com linha de visão ao objectivo) ; `FLEE` (moral: baixas no grupo, supressão acumulada; reutiliza o plano `fallBack` da T48). Guardado: `actor.ai = {rng, peek, shakenUntil, pinnedUntil, recover, target, seen}`; a fase mostra-se derivada (`suppressedUntil`, `reload`, `crouched`, `cooldown`).
- **Alvo:** candidatos com `world.lineOfSight`; peso do objectivo + ameaça (o jogador disparou há < 8 s) + viscosidade (×3 ao alvo anterior). Busca: a MG dispara onde viu a ameaça há ≤ 60 s.
- **Rajadas e pausas:** fluxo LCG próprio por homem, derivado da semente da missão como o da ckm (T47); pausa log-normal (σ 0,5, média preservada) com limites; ferrolho 1,7–2,8 s; grupos MG34 1–3 rajadas a 0,45–1,35 s; rajadas 4–7 tiros conforme o alvo (os clips autorizados). A dispersão de cada tiro continua no RNG principal.
- **Supressão:** quase-bala a 3 m de qualquer fonte (jogador, Kowal, ckm) → quebra o espreitar, recuperação, pontaria 1,9× durante 4 s. Seguinte: acumulador (n quase-balas em t s → mais tempo no chão; limiar → `FLEE`).
- **Callouts como eventos:** novo tipo `callout` `{speaker, cue, at, point}` (ex.: `mg_on_us`, `reloading`, `moving`, `target_down`), emitido pela simulação com intervalo por falante; o director de áudio escolhe a linha `co_m01_*`; o HUD pode legendar. Exige o esquema de `m01-audio-events.js` e linhas de voz — fora da fatia 1.
- **Ondas de intensidade:** multiplicador determinístico das médias de pausa por fase do relógio de batalha (calma → pressão → pico), sem mexer nos tempos históricos.

### Fatia 1 (implementada nesta branch)

Atiradores dos portões e do dique e as duas MG34 (`grp_de_east`, antes da demolição leste), Kowal e os perfis visuais `dp_east_pl_ckm` e `dp_east_de_mg`. Simplificações deliberadas marcadas `ponytail:` no código. Reutiliza `cooldown`, `suppressedUntil`, `reload`, a regra de postura T38 e o caminho `burst()`; só acrescenta `actor.ai` (fluxo próprio, espreitar/grupo aberto, episódio de supressão, última avistagem). Saves sem `ai` migram no restauro sem sorteio no RNG principal. A retirada pós-demolição (T48), a ckm wz.30 (T47), as baixas a horas fixas (T23) e os atiradores do tabuleiro não mudam.

Invariantes verificados numa execução local com `tools/verification/m01-combat-ai-golden.mjs` (commit `598a159`, depois revertido por `a580b09`: o Capitão re-baseia os goldens uma vez por passo de fusão) contra `f6913a0` nas duas rotas: 12 objectivos, 4 checkpoints, mesmos eventos consumidos, mesma hora de batalha de cada evento de hora fixa (04:34, 04:45, 04:52, 05:30, 06:00, 06:05, 06:10, 06:45…), sobreviventes 12 / 18, flags e 07:05:00. Esse ensaio é anterior à correcção da ameaça (`0fd2694`), que só reduz fogo.

Pins que esta mudança move (a re-basear pelo Capitão; valores medidos em `598a159`, a repetir sobre a árvore fundida):
- `tests/m01-animation-contract.test.js`: o golden por tick da T47 (duas rotas; `actor.ai` existe desde o tick 1, por isso nenhum bloco de 512 ticks é igual), a asserção «the golden pins the live simulation» e, em cascata, os testes que usam a rota completa (`gait and bodyYaw … CP-A..D`, `Bąk carry …`, `legacy 86/89 …`, `optional partial migration …`, `corrupt presentation …`).
- `tests/m01-ckm-candidate-posts.test.js` (janela 784 → 758 amostras, inimigos 21460 → 20420, reparo 7560 → 6040, pós-reparo 12000 → 12480; S1 270/396 → 255/381; S2 271 → 256), `tests/m01-ckm-fire-arc.test.js` (varrimento 1110 → 1085, 784 → 758, 36456 → 35462, 21460 → 20420) e `tests/m01-ckm-live-fire.test.js` (S2 271 → 256): contagens que dependem da duração da rota (o reparo da rota neutra encurta); quem é visto de cada posto não muda.
- `tools/verification/m01-t47-ckm-fire-audit.mjs` e `m01-t47-golden-amendment-audit.mjs` deixam de passar em modo de verificação na árvore viva (afirmam que o golden da T47 fixa a simulação viva).

### Próximas fatias (por impacto)

1. **Ameaça a curta/média distância (decisão humana).** Sem isto, nenhuma IA torna o inimigo visível: todo o combate é a ~1 km (o render mostra-os como impostores de 3×2 px). Os 50–300 m pedidos chocam com três restrições fixadas: o save rejeita qualquer alemão a oeste de x 690 (`validateM01Snapshot`, «elenco»), o jogador não passa de x 401 (`map-layout.json` `outOfBoundsX`), e a demolição leste corta os vãos em x ≈ 800, por isso um alemão a oeste dela estaria na ponte que sobrevive (historicamente não atravessaram antes da demolição). O mínimo hoje possível é ≈ 290 m (jogador no limite, `grp_de_spans` em x 690). Proposta para a fatia 2, por ordem de risco: (a) **destacamento de cobertura a meio do tabuleiro** durante a retirada (06:05–06:10): o jogador e Zieliński avançam até x ≈ 450–600 atrás dos montantes da treliça para cobrir os últimos homens; `grp_de_spans` avança por saltos entre nós de cobertura do tabuleiro (x 1050 → 690) sob fogo da MG34 e recua sob supressão — distâncias 90–600 m, sem mexer no limite x 690 dos alemães nem nos tempos 06:05/06:10; exige alargar `outOfBoundsX` só nessa janela, novos nós de cobertura e rever `readiness(east_demolition)` (jogador a oeste de x 660); (b) patrulha de reconhecimento no aterro leste (x 700–760) visível a 300–400 m do jogador no limite; (c) mira com ampliação (2–4×) no `kb wz.29` para os 1 km actuais. (a) muda objectivos e mapa: decisão do proprietário sobre o rigor de Tczew.
2. **Movimento entre coberturas e fuga** para `grp_de_spans` (já estão a 300–650 m do jogador na retirada): `MOVE_TO_COVER` nos nós do tabuleiro, `FLEE` por moral.
3. **Callouts e aliados que mudam de posição** (eventos `callout`, Kowal muda de seteira, Zieliński aponta alvos).
4. **Director de intensidade** para os intervalos longos (168 / 103 s sem perigo perto do jogador).
5. **Afinação do reparo com várias sementes** (24, como na T47): repor a pressão das rajadas em grupo sobre os sapadores (duração e imobilizações) e confirmar o equilíbrio ajuda/ignora.
