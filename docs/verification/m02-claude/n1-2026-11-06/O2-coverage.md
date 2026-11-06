# Cobertura da matriz O2 (PDF pp. 50–52) para o portão N1: 2026-11-06

Base: commit `f0815f61` + `6cead229` + `5ec62efe`. Fonte dos requisitos: PDF secção O2 (matriz de testes bloqueadores) e O3 (critérios numéricos). Auditoria anterior: `docs/m02/auditoria-2026-11-04/O.md` (feita sobre o checkout `03387a3`; os testes citados abaixo foram relidos neste checkout).

**Leitura obrigatória.** Esta tabela não aceita nenhum ID. Não há «PASS» como aceitação: O1 diz que o teste de estado não substitui percurso jogado e O6 que uma solução especificada não é uma correção testada no jogo.

Estados usados (e só estes):
- **COBERTO POR TESTE DE ESTADO**: há um teste Node/Playwright de estado sobre a simulação que exerce parte do que O2 pede. Não é aceitação.
- **EVIDÊNCIA GERADA**: há um artefacto reproduzível (registo, vídeo, captura) gerado por ferramenta, com comando e hash. Ainda precisa de leitura humana.
- **HUMANO**: só uma pessoa o pode decidir (leitura, playtest, aprovação).
- **PENDENTE**: nenhum teste nem artefacto cobre esta parte.

Cada linha pode ter vários estados, um por parte do requisito.

Evidência gerada nesta entrega:
- `n1-2026-11-06/n1-causal-log.json` e `n1-causal-summary.md`: `node tools/m02/n1-causal-log.mjs --commit 5ec62efe --date 2026-11-06` (4 sementes × 2 modos, cada corrida repetida e comparada por sha256).
- `routes-2026-11-06/`: vídeos das rotas vala e pomar (`tests/browser/m02-n0-route-videos.spec.js`), com manifesto e README.
- `n0-2026-11-05/`: seleção das capturas N0 (anterior).

## AI-01 — Piotr abrigado 60 s em EA1: aliados mudam situação por fogo/supressão/avanço causal; logs relacionam ação e efeito

| Teste (ficheiro:nome) | Evidência gerada | Estado |
|---|---|---|
| `tests/m02-02-combat-squad-ai.test.js`: «AI-01: 60 seconds with Piotr in cover produces real causal squad progress…» (1200 ticks agachado; exige ≥ 4 capturas de cobertura, ≥ 5 supressões, ≥ 2 acertos, saúde inimiga perdida) | `n1-causal-log.json`/`n1-causal-summary.md`: 4 sementes de 60 s com Piotr agachado e parado (`sheltered`) e 4 com Piotr a avançar pela vala. Ligações por tipo, com força (`direct`, `confounded`, `temporal`, `measured`) e sha256 por corrida; mesma semente ⇒ mesmo sha256 | COBERTO POR TESTE DE ESTADO + EVIDÊNCIA GERADA |
| `tests/m02-26-n1-causal-log.test.js`: «Piotr sheltered (60 s) links suppression -> hit -> down…», «Piotr advancing (ditch route + fire) links his shots…», «same seed => same log (sha256), different seed => different log», «buildCausalLog runs every (seed, mode) twice…» | | COBERTO POR TESTE DE ESTADO (valida o gerador, não o jogo) |

Lacunas honestas:
- O motor não grava a causa de cada decisão; as ligações são reconstruídas por chaves partilhadas e janelas fixas. As ligações `temporal` (ordem → aliado toma cobertura: 3, nenhuma `direct`; baixa → recuo/rendição: 9) são indícios, não prova.
- Em `sheltered` ocorrem ligações `direct` de supressão → hostil atingido (21), → baixa (13) e supressão hostil → aliado atingido (41). Em `sheltered` não há tiro de Piotr, por isso as ligações de alerta só existem em `advancing`.
- O3: «contar disparos ou animações não basta». O registo mostra a perda de saúde e as baixas ligadas ao mesmo alvo, mas a «melhoria causal da situação» continua a ser avaliada por contagem de efeitos; não há métrica de «situação melhorou».
- HUMANO: ver se o jogador percebe a ajuda dos aliados (O4).

## AI-02 — Esconder-se, produzir som, mudar para sala sem visão; o inimigo procura a posição provável e não segue através da parede

| Teste | Evidência gerada | Estado |
|---|---|---|
| `tests/m02-02-combat-squad-ai.test.js`: «AI-02: Honest enemy perception…» (memória visual, sem wallhack, expira) e «AI-02 (som): firing from behind a solid wall gives an AUDIO memory…» | No registo causal em `advancing`: 42 ligações `PLAYER_SHOT->HOSTILE_ALERTED` (memória de áudio escrita por um tiro de Piotr a ≤ 90 m) e 7 `HOSTILE_ALERTED->HOSTILE_FIRES_ON_PLAYER` (todas `direct`) | COBERTO POR TESTE DE ESTADO |

Lacunas: o teste desloca o jogador por teleporte atrás da parede em vez de «mudar para outra sala»; o ramo «procura a posição provável» só é afirmado por `state === 'SEARCH_MEMORY'` e pela memória. HUMANO: não foi observado se a procura parece natural. PENDENTE: percurso real de mudança de sala com perseguição.

## AI-03 — Derrubar cobertura, bloquear portal, incapacitar líder; replaneamento/cedência, sem deadlock, liderança por regra

| Teste | Evidência gerada | Estado |
|---|---|---|
| `tests/m02-02-combat-squad-ai.test.js`: «AI-03: Narrow doorway single-file queue and automatic door opening prevent NPC bottlenecking» (bloqueio de portal) | n/a | COBERTO POR TESTE DE ESTADO (só o portal) |
| `tests/m02-d1-required-characters.test.js`, `tests/m02-d1-failure-panel.test.js` (Gruca incapacitado ⇒ falha, regra D1 visível) | n/a | COBERTO POR TESTE DE ESTADO (regra de falha por personagem exigida; não é sucessão de liderança) |
| `tests/m02-c09-section-advance.test.js`: «quem está ferido (< 55 de vida) não vai a uma faixa…» | n/a | COBERTO POR TESTE DE ESTADO (parcial: cedência por ferimento) |

PENDENTE: cobertura derrubada com replaneamento da secção; incapacitar o líder (Gruca) com a secção a mudar de liderança por regra (não encontrei teste que o afirme); ausência de deadlock num sítio estreito com vários atores além de dois aliados.

## AI-04 — Observar entradas/saídas da reserva; derrotar todos cedo; roster finito, sem spawn atrás do jogador nem reposição

| Teste | Evidência gerada | Estado |
|---|---|---|
| `tests/m02-02-combat-squad-ai.test.js`: «AI-04 & OBJ-01: Finite 10-man EA1 garrison, zero spawns, local reserve shift…» | `n1-causal-summary.md`, quadro de corridas: nas 8 corridas a guarnição fica em 10 hostis no total; nas 4 corridas `advancing` os 10 ficam inativos entre 10,2 s e 19,8 s simulados e a cena passa a C04 sem reposição | COBERTO POR TESTE DE ESTADO + EVIDÊNCIA GERADA |
| `tests/m02-d5-morale-and-contact.test.js` («EC2 só cede às suas próprias baixas…», «os grupos são independentes…»), `tests/m02-d2-ea0-retreat.test.js` (posto EA0 finito, recuo) | n/a | COBERTO POR TESTE DE ESTADO (Áreas A e C) |

Lacuna: «derrotar todos cedo» vem de um condutor automático (`MissionBot`) e do ensaio por abate direto no teste de AI-04; não é jogo humano. PENDENTE: reposição «para prolongar combate» não é testada na Área B.

## COM-01 — Disparar armas e esgotar a munição de ambos os lados; recuo/recarga sincronizados; nenhum tiro com arma indisponível

| Teste | Evidência gerada | Estado |
|---|---|---|
| `tests/m02-02-combat-squad-ai.test.js`: «COM-01 & COM-02: Weapon reload cycle…» (5 tiros, carregador vazio não dispara, recarga repõe 5/40) | Vídeos das rotas: `route-*.json` regista `firePresses` 6/5 e `reloadPresses` 1/1 enviados por teclado; o efeito da recarga não é verificado no manifesto | COBERTO POR TESTE DE ESTADO (lado do jogador) |

PENDENTE: esgotamento de munição do lado alemão (os testes só usam `reloadingUntil` como preparação), recuo/recarga sincronizados dos aliados, «nenhum tiro durante arma indisponível» para os atores. Não achei teste nem artefacto.

## COM-02 — Explosão em exposição, atrás de parede e perto de porta aberta; dano/oclusão/transformação coerentes; cobertura não é imunidade global

| Teste | Evidência gerada | Estado |
|---|---|---|
| `tests/m02-02-combat-squad-ai.test.js`: «COM-01 & COM-02…» (granada fere o exposto; parede de tijolo bloqueia o dano; vidro parte; porta de madeira fechada destruída; cerca aberta) | n/a | COBERTO POR TESTE DE ESTADO |
| `tests/m02-d2-explosion-warning.test.js`: «granada inimiga: quem sai do raio durante o aviso não é ferido; quem fica é…» | n/a | COBERTO POR TESTE DE ESTADO |

PENDENTE: explosão junto a uma porta **aberta** (só a porta fechada e destruída está coberta). HUMANO: a leitura visual da explosão e do aviso.

## COM-03 — Ferir/render o inimigo e aproximar-se depois; estado desarmado persistente, sem reativação nem recompensa por violência

| Teste | Evidência gerada | Estado |
|---|---|---|
| `tests/m02-02-combat-squad-ai.test.js`: «COM-03 & K2/K3…» (ferido C04 `WOUNDED_UNARMED` persistente, `nonCombatant`, giz, tiro no ferido marca `m02.fired_on_wounded` e a reação de Gruca) | `n1-causal-summary.md`: 9 ligações `HOSTILE_DOWN->HOSTILE_WITHDRAWS_OR_SURRENDERS`, todas `temporal` | COBERTO POR TESTE DE ESTADO |
| `tests/m02-c04-fired-on-withdrawn.test.js`: «a tabela: ferido desarmado, rendido e retirado; nunca o combatente nem o que ainda recua» | n/a | COBERTO POR TESTE DE ESTADO |
| `tests/m02-d5-morale-and-contact.test.js` (rendição por baixas do próprio grupo) | n/a | COBERTO POR TESTE DE ESTADO |

Lacunas: não encontrei teste de «aproximar-se depois» sem reativação arbitrária nem de «sem recompensa por violência» (o último é decisão de design, HUMANO). A ligação de rendição ao abate é só `temporal`.

## MAP-01 — Percorrer vala/pomar, portas e passagens nas posturas admitidas; sem atravessar paredes, cair no vazio ou ficar preso; vídeo e posição do defeito

| Teste | Evidência gerada | Estado |
|---|---|---|
| `tests/m02-01-quinta-geometry-ballistics.test.js`: «MAP-01 Rota A (Vala)…», «MAP-01 Rota B (Pomar) and route switching…», «MAP-01 Interiors…» (B01, B02, B04) | `routes-2026-11-06/route-vala.webm` (58,1 s) e `route-pomar.webm` (90,2 s), 960 × 540, SwiftShader, com teclado e rato (ponteiro bloqueado); `route-*.json` com traço de posição e manifesto; frames início/meio/fim | COBERTO POR TESTE DE ESTADO + EVIDÊNCIA GERADA |
| `tests/m02-26-n0-fixes.test.js`: «corrigido: a cápsula (raio 0,36 m, em pé e agachada) atravessa a porta em linha reta…», «o navegador dos NPC encontra caminho para dentro e para fora de B04 pela porta» | n/a | COBERTO POR TESTE DE ESTADO |

Lacunas: o vídeo mostra só as duas rotas até à quinta (a pé, sem agachar, com um condutor automático); não mostra portas nem interiores. HUMANO: ver os vídeos e decidir se há atravessamento ou encravamento visual. PENDENTE: percurso por todas as posturas admitidas (agachado, deitado, se existir) e pelas portas em jogo.

## MAP-02 — Atirar por janelas, bordas, paredes interiores e portas em três estados; oclusão visual/balística coerente; o alvo não recebe tiro impossível

| Teste | Evidência gerada | Estado |
|---|---|---|
| `tests/m02-01-quinta-geometry-ballistics.test.js`: «MAP-02 Ballistics & Materials…» (parede bloqueia; janela aberta passa; peitoril, verga e aro bloqueiam; porta fechada bloqueia e aberta deixa passar; vidro parte à 1.ª e passa à 2.ª; copa deixa passar, tronco bloqueia) | n/a | COBERTO POR TESTE DE ESTADO |
| `tests/browser/m02-01-quinta.spec.js` (portas fechada/aberta em B01 no browser) | | COBERTO POR TESTE DE ESTADO |
| `tests/m02-26-n0-fixes.test.js`: «evaluateMgLineOfFire ≡ traceShot + lineOfSight desde a boca, em SN1–SN5 e de 2 em 2 m nas duas rotas», «a tabela gerada não tem nenhuma amostra em que a avaliação e o disparo real discordem» e os testes da política de vista do vidro | n/a | COBERTO POR TESTE DE ESTADO |

Lacunas: os três estados da porta (fechada, aberta, destruída) estão distribuídos por testes diferentes; nenhum faz o tiro pelas três no mesmo teste, e a destruída só é verificada como estado. O3: «zero tiro através de sólido» é um critério determinístico, mas só nos casos definidos. HUMANO: coerência visual da oclusão no browser.

## SAVE-01 — Restaurar cada checkpoint com mortos, portas, cerca e carga alterados; mesmos IDs/estados/objetivos; sem ressurreição, respawn nem cenário reparado

| Teste | Evidência gerada | Estado |
|---|---|---|
| `tests/m02-09-save-restore-determinism.test.js`: «M02-09 — SAVE-01: restauro determinístico com semente e estado do gerador (schema v2)» («rota … semente …: continuação restaurada é igual tick a tick», controlo negativo, «fechaduras de porta ativas no snapshot…»), «checkpoint restaurado volta a gravar os checkpoints seguintes…» | n/a | COBERTO POR TESTE DE ESTADO |
| `tests/m02-02-combat-squad-ai.test.js`: «SAVE-01 & SAVE-02…» (restaura `cp_m02_a_preparacao`: jogador, porta, cerca e inimigo morto) | n/a | COBERTO POR TESTE DE ESTADO (só cp_a) |
| `tests/m02-12-save-hardening.test.js`: «fluxo canónico B→C: cp_m02_c_reorganizacao e cp_m02_d_cobertura_retirada persistem e restauram…», «cp_m02_b_acesso pelo caminho C04…», «Área C: cp_m02_d_cobertura_retirada…»; `tests/m02-13-save-hardening-2c.test.js` | n/a | COBERTO POR TESTE DE ESTADO |

Lacunas: não encontrei um teste que restaure cada um dos quatro checkpoints com mortos, portas, cerca e carga **ao mesmo tempo** alterados e compare o estado semântico completo; os restauros de cp_b/c/d reproduzem a continuação, sem as quatro alterações combinadas. PENDENTE: o mesmo percurso no browser (F5/F9 numa página recarregada): o spec de browser não grava nem restaura.

## SAVE-02 — Guardar durante transporte e transição; fornecer save inválido/antigo; relações corretas ou rejeição segura; save anterior preservado; sem estado parcial

| Teste | Evidência gerada | Estado |
|---|---|---|
| `tests/m02-09-save-restore-determinism.test.js`: «SAVE-02: checkpoints persistidos com escrita atómica (M02SaveStore)» (save anterior em `:previous`, JSON corrompido, snapshot v1 rejeitado, armazenamento a lançar, falha na promoção, escrita truncada), «snapshot v1 (sem rng) é rejeitado…», «rejeita IDs inexistentes… relações quebradas», «restauro inválido não toca no estado vivo» | n/a | COBERTO POR TESTE DE ESTADO |
| `tests/m02-12-save-hardening.test.js` (loja com `current` ilegível, dois separadores, validador de enums e relações), `tests/m02-13-save-hardening-2c.test.js` (loja bloqueada, ação composta de API, F9 salta incompatíveis) | n/a | COBERTO POR TESTE DE ESTADO |
| `tests/m02-04-05-areas-bc-completion.test.js` (portador duplicado recusado, volume carregado) e `tests/m02-26-n0-fixes.test.js` («um save v2 gravado com o layout v1 é recusado… sem apagar e sem tocar no estado vivo») | n/a | COBERTO POR TESTE DE ESTADO |

Lacunas: guardar **durante** o transporte da carroça e **durante** uma transição (TR02..TR05) só está coberto onde os testes citados o fazem (cp em C06/C10 e ação composta); não vi um caso por cada tipo de transição. PENDENTE: leitura de um save antigo de outra versão do jogo no browser (só a recusa por versão de layout/formato em Node). HUMANO: a mensagem de aviso na bancada.

## Resumo

| ID | Teste de estado | Evidência gerada | Humano | Pendente |
|---|---|---|---|---|
| AI-01 | sim | sim (`n1-causal-log`) | leitura da melhoria causal | métrica de «situação melhorou» |
| AI-02 | sim (visão e som) | parcial (alertas por tiro) | naturalidade da procura | mudança real de sala |
| AI-03 | só portal e regra de falha | não | — | cobertura derrubada, líder incapacitado |
| AI-04 | sim | parcial (10 hostis, sem reposição) | — | reposição em B |
| COM-01 | lado do jogador | parcial (entradas de recarga no vídeo) | — | munição alemã, sincronia |
| COM-02 | sim (porta fechada) | não | leitura visual | porta aberta |
| COM-03 | sim | parcial (ligação temporal) | recompensa por violência | aproximação sem reativação |
| MAP-01 | sim | sim (2 vídeos) | ver os vídeos | posturas, portas em jogo |
| MAP-02 | sim | não | oclusão visual | três estados no mesmo teste |
| SAVE-01 | sim | não | — | 4 checkpoints combinados; browser |
| SAVE-02 | sim | não | aviso na bancada | save antigo no browser; transições |
