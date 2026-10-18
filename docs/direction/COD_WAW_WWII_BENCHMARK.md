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
| 06:10–06:32 sair da ponte, corredor, Dudek leva Bąk | 8,5× | 155 s | 8,5× | 155,4 s | |
| 06:32–06:44 todos a oeste | 8,5× + 1× + gate 0× | 240+29,5+37,9 s → até 1078 s | **30×** | **23,9 s** | carga oeste já não espera Bąk na estação; `seg_climax.compress` |
| 06:44–06:45 pré-roll da demolição | 8,5× | 3,5 s | 8,5× | 7,0 s | |
| 06:45–07:05 abrigo, fade 07:05 | 1× + salto | 14,9 s | idem | 14,9 s | |
| **Até às 06:00** | | **690,9 s** | | **567,6 s** | −123 s |
| **Missão completa** | | **1093,1 s** | | **845,2 s** | −248 s (−23 %) |

Rota com apoio (`coverRoute 'help'`): 06:00 aos 665,0 → 541,8 s; missão 1068,1 → 820,2 s. Rota `'ignore'`: igual à de controlo.

Trechos parados mais longos (piloto sem mover/disparar), rota de controlo: antes 262,0 s (05:35→06:10), 257,6 s (06:17→06:45), 240,7 s (04:43→05:30);
depois 240,7 s (escolha da rota: não dispara durante o reparo), 138,6 s (05:37→06:10, inclui os 82 s da retirada em que esta rota fica abrigada), 133,0 s (06:17→06:45).
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
| Corredor | Mantenha o corredor aberto até à demolição oeste — conte os que passam | Dudek com Bąk (enquanto a leste de x −90) | «Corredor · passaram X de N» → «Dudek leva Bąk para oeste · faltam N m…» → «Todos fora da ponte · os sapadores preparam a carga oeste» + «Mais tarde…» |
| Abrigo | Vá para o abrigo | Abrigo | Demolição oeste · siga para o abrigo (existente) |

Antes: o destino só aparecia como mensagem de texto quando o jogador **não** se aproximava (`updateGuide`, a cada 15 s); a defesa da ponte não tinha destino,
razão nem estado; Bąk tinha destino só por mensagem, e o painel não dizia onde estava o socorrista.

### Matriz

| Sistema | WaW | WWII | COD-guerra | Diferença | Gravidade | Causa | Correção | Estado | Prova | Próxima |
|---|---|---|---|---|---|---|---|---|---|---|
| Progressão dirigida pelo jogador | O nível avança quando o jogador chega a um ponto ou cumpre a tarefa; quase nunca espera por um relógio. | Igual; as passagens de tempo acontecem em cenas ou cortes, não em espera jogável. | Relógio de batalha histórico com segmentos de escala fixa; com a tarefa feita o jogador esperava o relógio (05:35→06:00, 06:32→06:45). | Espera real de 3–4 min sem tarefa duas vezes por missão. | Alta | `advanceBattle` (`src/game/m01-simulation.js`, ~l. 357 antes): só `readyScale` em `seg_repair`; `seg_hold`/`seg_climax` a 8×/8,5× fixos; gate oeste esperava Bąk na estação (`readiness`, l. 353 antes). | `clock.segments[].compress` (dados) + `activeCompression` (`src/game/m01-pacing.js`): 24× em posição no tabuleiro após o raide, 30× com todos a oeste; carga oeste espera Bąk fora da zona (x < −90). | Implementado na branch | `tests/m01-pacing.test.js`; GOLDEN_AMENDMENT_04 | Playtest humano no executável |
| Apresentação do tempo comprimido | Corte/fade com legenda de hora — NÃO VERIFICADO para WaW. | Cartão de hora/local entre segmentos — NÃO VERIFICADO. | Relógio acelerava sem qualquer sinal (já em `readyScale`). | O jogador não percebia que o tempo saltava. | Média | Nenhuma apresentação. | `sim.tempo` (calculado, não guardado) → cartão «Mais tarde…» com razão + relógio a pulsar (`src/ui/m01-hud.js`, `src/styles.css`). Sem fade: o combate continua visível. | Implementado | teste de estado; captura de browser única (ver Prova abaixo) | Avaliar fade curto opcional |
| Marcador de objectivo | Estrela na bússola para o objectivo — NÃO VERIFICADO se há ícone no ecrã. | Marcador no ecrã com distância; companheiros marcados — NÃO VERIFICADO detalhe. | Só mensagem de texto quando o jogador não progride. | Sem direcção persistente. | Alta | `updateGuide` emite texto, não há marcador. | `sim.objectiveMarker` (rótulo, ponto, distância, rumo; calculado) + marcador na faixa do horizonte, perspectiva correcta, preso à borda com seta quando atrás. | Implementado | `markerScreen` testado; teste de clareza | Ajustar altura/oclusão no playtest |
| Clareza: defesa da ponte | Ordem curta gritada + marcador de posição a defender — NÃO VERIFICADO. | Igual — NÃO VERIFICADO. | «Mantenha a cabeça de ponte — mude de cobertura quando mandarem», sem destino, sem razão, sem fim visível. | O jogador não sabia onde estar nem até quando. | Alta | Texto sem verbo de lugar; `guideTarget` sem caso `hold_access`; `threatStatus` vazio fora da salva. | Texto com verbo e lugar; marcador «Posição no tabuleiro rodoviário»; estado «Tome posição…»/«Volte à posição…»/«Em posição · o pelotão leste (N) segura…». | Implementado | teste de clareza | Fala gravada do Zieliński (asset de voz) |
| Clareza: Bąk → socorrista | Ferido a carregar com marcador do destino — NÃO VERIFICADO. | Interacção «arrastar ferido» com marcador e confirmação — NÃO VERIFICADO. | Mensagem genérica; destino só por texto ocasional; «socorrista» sem lugar. | O jogador não sabia para onde levar Bąk nem que havia prazo. | Alta | Mensagens sem lugar; nenhuma prioridade de estado ao carregar. | Marcador Bąk → Socorrista Dudek; estado ao carregar (prioritário) com distância/lado; mensagens de levantar e entregar com lugar e consequência; aviso de prazo (Dudek às 06:14). | Implementado | teste de clareza | Ícone de ferido no mundo |
| Batidas por progresso do jogador | Guiões disparam por gatilhos de posição. | Igual. | Maioria por relógio; algumas por posição (posto avançado, porta). | Esperas preenchidas só por mensagens repetidas. | Média | Pistas de continuidade a cada 55 s de relógio (a 27×/24× = cada 2 s reais) e fora do objectivo («Proteja o reparo» depois de concluído). | `continuityCues[].requires` + 20 s reais mínimos entre pistas (`continuityAllowed`). Compressão só com condição de jogador. | Implementado | teste de continuidade | Batidas novas com voz (asset) se o playtest pedir |
| Tempo morto ≤ 60 s | Raramente > 30 s sem estímulo — NÃO VERIFICADO número. | Idem — NÃO VERIFICADO. | Antes 88,1 s máx.; depois 49,0 s (espera do comboio 963). | Abaixo de 60 s. | Baixa | — | Nenhuma batida nova necessária. | Medido | script de medição (acima) | Comprimir 04:42–04:43:30 se o playtest sentir a espera |
| Prelúdio 04:33–04:34 | Construção de tensão com som antes do primeiro impacto. | Idem. | 50 s a 1× após entregar, 37 s sem fala. | Aceitável como tensão (áudio dos aviões). | Baixa | Stukas ancorados a 1× (`src/world/m01-aircraft-path.js` `m01StukaAnchor`). | Painel com razão; sem compressão para não quebrar a trajectória. | Mantido | — | Se comprimir, ancorar Stukas ao relógio real (renderer, outra equipa) |
| Dudek e Bąk depois da carga | — | — | A carga esperava Dudek percorrer 430 m a 1,6 m/s até à estação. | ~150 s sem tarefa. | Alta | `readiness(west_demolition)` exigia `!bak.carry`. | Gate: todos (Bąk incluído) a oeste de x −90; a chamada 07:05 conclui a evacuação (`completeEvacuation`). | Implementado | `tests/m01-continuous-fixes.test.js` (testes actualizados), `tests/m01-pacing.test.js` | — |

**O que muda no jogo:** menos 4 min reais de espera; marcador e estado claros na defesa da ponte, no corredor e no transporte de Bąk; cartão «Mais tarde…» quando o
relógio corre; pistas de continuidade sem inundar a legenda; a carga oeste já não espera a caminhada até à estação.
**O que não muda:** horários históricos dos eventos (relógio de batalha), 12 objectivos, CP-A..D, sobreviventes, 07:05, combate, IA, física, renderer
(excepto a camada HUD), assets, saves antigos (o temporizador novo é opcional e validado).
