# Auditoria M02 — Secção O (PDF pp. 50–52) vs checkout atual (03387a3)

Fonte: `docs/m02/preproducao/M02-BZURA-PRE-PRODUCAO.pdf`, secção O «Testes e aceitação» (O1–O6, matriz O2).
Âmbito: leitura estática de `src/game/m02-*`, `src/world/m02-*`, `src/render/m02-*`, `src/m02/*`, `m02-01.html`, `missions/m02-bzura/*.json`, `tests/m02-*.test.js`, `tests/browser/m02-01-quinta.spec.js` e `docs/m02/M02_HANDOFF.md`. Não executei testes nem browser. Repositório não editado (só este ficheiro).
Estados: IMPLEMENTADO / PARCIAL / AUSENTE / CONTRADIZ / NÃO VERIFICÁVEL. «Teste de estado» = asserção sobre a simulação Node; não é aceitação nem playtest (O1).

## Requisitos gerais (O1, O3, O4, O5, O6)

| # | Requisito / afirmação de O | Estado | Evidência (ficheiro:linha / pesquisa) |
|---|---|---|---|
| 1 | O1: «Não declarar 100% pela contagem de testes unitários se o percurso não foi jogado» | CONTRADIZ | `M02_HANDOFF.md:106-132` marca cada ID com «PASS (100%)», todos derivados de testes Node/estado. Sem percurso jogado nem registo. |
| 2 | O1: cada prova regista ID, hash, layout, seed, navegador, máquina/GPU, resolução, passos, observado, evidência | AUSENTE | Nenhum registo estruturado de execução em `docs/m02/` (a tabela do handoff só tem ID/teste/«PASS»). Sem hash, máquina ou GPU. |
| 3 | O3: 1.º contacto ≤ 60 s; trecho obrigatório sem ação > 45 s a investigar | AUSENTE | Pesquisa por 60 s/45 s de ritmo em `tests/m02-*` e `src/game/m02-*`: nenhum teste ou métrica. Só AI-01 usa 60 s de outra coisa (`m02-02:22`). |
| 4 | O3: 12 sementes de stress no clímax | PARCIAL | `m02-06:308-380` itera 12 sementes 19390909..19390920 mas cada uma segue o mesmo guião e abate EA0/EA1 por `e.alive=false` (l.327-337); não corre o combate do clímax nem compara duas execuções. A afirmação «100% determinismo» não é verificada (sem repetição/hash). |
| 5 | O3: sementes dirigidas (3 desfechos de Lis, falhas de carga, morte de auxiliares, ordem de ações diferente) | PARCIAL | 3 desfechos de Lis: `m04-05:~195-210`. Falhas de carga: snapshot inválido único (`m02-02:241+`). Morte/evacuação de auxiliares e ordens alternativas: sem teste. |
| 6 | O3: cobertura de pares luz/dificuldade/seed | AUSENTE | Sem matriz pairwise nem dificuldades M02 nos testes. |
| 7 | O4: playtest com 5 pessoas, sessões observadas, vídeo/logs | AUSENTE / HUMANO | Nenhum registo, vídeo ou notas em `docs/m02/`. Não pode ser coberto por código. |
| 8 | O5: 18 rejeições absolutas ligadas a provas | PARCIAL | Cobertas só por teste de estado: 8 (AI-01), 9 (MAP-02/AI-02), 10 (COM-02), 11 (OBJ-01 parcial), 12 (HIST-TEST-01 parcial), 14 (NAR-01/SAVE). Dependem de humano/arte: 1-5, 7, 13, 15, 16. Item 17 (duplicar #58) sem comparação de contratos no repo. Item 18: ver Q (fora de O). |
| 9 | O6: P0/P1/P2 e «sem known issue em P0» | AUSENTE | Sem registo de defeitos nem classificação de severidade em `M02_HANDOFF.md`. «PASS» sem lista de P0/P1 abertos. |
| 10 | O6: «solução especificada ≠ correção testada no jogo» | CONTRADIZ | O handoff trata testes de estado como correções verificadas («PASS (100%)»). |

## Matriz de testes O2 (por ID)

| # | ID / requisito | Estado | Evidência e leitura do «PASS» do handoff |
|---|---|---|---|
| 11 | HIST-TEST-01 (cartelas/debrief sem retirada geral; aprovação histórica assinada) | PARCIAL | Teste: `m02-04-05:216-229` verifica `generalRetreatOnMorningSept10===false`, regex «retirada geral» em TR02 e `bz39_c07_01..03`, e TR04 contém «12–13 de setembro». É um teste de strings. Não há classificação de unidades/locais nem aprovação histórica assinada. PASS do handoff = teste de estado verde, não aceitação. |
| 12 | HIST-TEST-02 (anacronismos de modelo, uniforme, armas, letreiros; fonte/licença por asset) | CONTRADIZ | O handoff `l.107` atribui-lhe o mesmo ficheiro mas o teste cobre cartelas/datas (outro objeto: HIST-TEST-01). Pesquisa `HIST-TEST-02` em `tests/m02-*`: 0 ocorrências. Sem comparação de assets com referências. Não sustentado. |
| 13 | MAP-01 (percorrer vala/pomar, portas, passagens; sem atravessar/cair/prender) | PARCIAL | `m02-01-geometry:72,117,146` percorrem Rota A, Rota B e interiores B01/B02/B04 por simulação. Cobertura de «posturas admitidas» e vídeo ausentes. Teste de estado válido para colisão; sem percurso jogado. |
| 14 | MAP-02 (tiro por janelas, bordas, paredes, portas em 3 estados; zero tiro através de sólido) | PARCIAL | `m02-01-geometry:216` (paredes bloqueiam, aberturas passam, ombreiras/peitoris bloqueiam, vidro parte). Browser: portas fechada/aberta em `quinta.spec.js:57-73`. «Três estados» de porta (aberta/fechada/entreaberta) não confirmados por pesquisa. Determinístico, forte para o critério numérico de O3. |
| 15 | MAP-03 (B01/B02 funcionais; maca B09/B12; sem interior prometido em falta) | PARCIAL | `m02-06:186` raycast ±0,45 m na rota de maca. Funcionalidade/escala dos objetos B01/B02 e animações: sem teste. |
| 16 | AI-01 (60 s abrigado; melhoria causal; logs ligam ação e efeito) | IMPLEMENTADO | `m02-02:22-50`: 1200 ticks agachado; exige ≥6 capturas de cobertura, ≥5 supressões, ≥2 acertos, saúde inimiga perdida; `combatLog`. Cumpre «causal» mas por contagem de eventos: O3 diz que contar disparos não basta; só a perda real de saúde é causal, e é verificada só como `> 0`. |
| 17 | AI-02 (esconder, som, mudar de sala; inimigo não segue através da parede) | PARCIAL | `m02-02:52-84`: visão e memória por parede. Falta o ramo «produzir som» (a memória auditiva é descrita no handoff, não testada aqui) e as asserções finais estão sob `if` (l.~76), logo podem passar vacuamente. |
| 18 | AI-03 (derrubar cobertura, bloquear portal, incapacitar líder; replaneamento; liderança por regra) | PARCIAL | `m02-02:86` cobre fila no portal e abertura de portas. Derrubar cobertura e incapacitar líder (liderança por regra): sem teste. |
| 19 | AI-04 (reserva finita; derrotar todos cedo; sem spawn atrás/reposição) | IMPLEMENTADO | `m02-02:116` (10 defensores, zero spawns, reserva local, objetivo). «Derrotar todos cedo» coberto parcialmente (O3 mata todos). |
| 20 | COM-01 (esgotar munição de ambos os lados; recuo/recarga sincronizados) | PARCIAL | `m02-02:150` cobre recarga e dispersão do lado polaco. Esgotamento de munição alemã e «nenhum tiro com arma indisponível» não confirmados. |
| 21 | COM-02 (explosão exposta, atrás de parede, junto de porta aberta) | PARCIAL | `m02-02:150`: granada fere exposto, bloqueada por parede, brecha na cerca. Porta aberta: sem caso. |
| 22 | COM-03 (ferir/render, aproximar-se; desarmado persistente; sem recompensa) | PARCIAL | `m02-02:194`: ferido C04 persistente, giz, fala literal. Aproximação posterior sem reativação e ausência de recompensa: não confirmadas. |
| 23 | OBJ-01 (resolver depressa, recuar, perder carga, 0/1/2 volumes, alternativas) | PARCIAL | `m02-02:116` (objetivo imediato por estado) e C06 com 0/1/2 volumes descrito no handoff `l.63`; teste do cenário «recuar» e «perder carga» não identificado. |
| 24 | NAR-01 (ver e saltar cada transição do mesmo snapshot; sem duplicar consumo/ferimento) | PARCIAL | `m02-03:171` só T-AB. TR02..TR05 sem teste de equivalência ver/saltar. Não parte de um snapshot comum explícito. |
| 25 | NAR-02 (3 resultados de Lis importados em M03; ausente não fala nem reaparece) | PARCIAL | `m04-05:~195-215` cobre 3 desfechos e Wierzba «Lis…». «Importar em M03»: não existe importador M03 no repo M02 (só `exportCampaignResultToM03`); a importação em M03 não é testável aqui. |
| 26 | SAVE-01 (restaurar cada checkpoint com mortos/portas/cerca/carga alterados; mesmos IDs; sem ressurreição) | PARCIAL | `m02-02:241-275` restaura só `cp_m02_a_preparacao` (porta, cerca, 1 inimigo morto, jogador). Sem teste de `cp_m02_b/c/d` com carga alterada, sem comparação semântica completa. Handoff diz «restauro exato»: sustentado só para cp_a. |
| 27 | SAVE-02 (guardar em transporte/transição; save inválido/antigo; save anterior preservado) | PARCIAL | `m02-02:~262` rejeita snapshot inválido sem mutar; `m04-05` rejeita portador duplicado. Persistência real inexistente: `checkpoints` é Map em memória, sem localStorage em `src/m02` e `src/game/m02-*` (pesquisa). «Save anterior preservado» e save «antigo» (outra versão) não aplicáveis/testados. |
| 28 | HZ-01 (capturas nos 5 pontos × luz × perfil; sem grelha/borda) | PARCIAL | `m02-03:74` testa 8 setores de 45° na simulação. Capturas visuais: `quinta.spec.js` grava screenshots num diretório fora do repo (`/home/joiceiscee/...`, l.5) e não compara. A afirmação geométrica não prova ausência de grelha. |
| 29 | HZ-02 (LOD/promoção sem salto, duplicação, perda de dano/munição) | PARCIAL | `m02-03:74` promoção/demoção L2↔L1 com histerese preserva id/saúde/carregador. Aproximar/recuar repetido e salto visual: não testados. |
| 30 | HZ-03 (esperar, virar câmara, restaurar; eventos remotos não reiniciam; fumo persiste) | PARCIAL | `m02-03:128` e `m02-06:253` (HS-A2 sem loop; artilharia idempotente após restauro). Virar câmara e fumo persistente visual: não testados. |
| 31 | AV-01 (mãos/arma/corpo sem atravessamentos; áudio por origem/material) | PARCIAL | `m02-06:28,67` cinemática de desobstrução e mapa de áudio por material. Atravessamentos visuais e socorro junto de obstáculos: sem prova visual. |
| 32 | AV-02 (legendas, som reduzido, violência reduzida, câmara estável; resultados inalterados) | PARCIAL | `m02-06:144` (opções não mudam estado de combate). Legendas/violência reduzida dependem de UI não verificada aqui. |
| 33 | PERF-01 (trajeto fixo + stress nos 3 perfis; tempos medidos com equipamento) | CONTRADIZ | Handoff `l.129`: «PASS (62.5 FPS)», «draw calls < 700», «triângulos < 140k». `quinta.spec.js:238-256` só afirma `drawCalls > 0` e `triangles > 0` em 3 perfis, 10 frames sintéticos de `renderFrame(0.016, 0.5)`; nenhum limite de FPS, nenhuma máquina/GPU registada, sem artefacto de telemetria no repo (saída vai para caminho externo `l.5-6`). NÃO MEDIDO com prova. O3 proíbe universalizar 60 FPS. |
| 34 | PERF-02 (A→B→C→restore repetido; sem crescimento/vazamento) | CONTRADIZ | Handoff `l.130` usa PERF-02 para «p50 < 4 ms (0,5 ms)», outro critério. Teste associado `m04-05:25` (STREAM-01) verifica ≤2 células residentes, não repetição nem memória. Sem medição de vazamento: NÃO MEDIDO. |
| 35 | REG-01 (fluxo M01 após integração futura; zero regressão de seleção/save) | NÃO VERIFICÁVEL | Handoff `l.131`: «git diff --stat, 0 bytes M01». É só ausência de edição; REG-01 pede comparar o fluxo M01 após integração, que ainda não existe. Não é teste. |

## Desvios prioritários

1. PERF-01/02: «PASS (62.5 FPS)», «0.5 ms», «draw calls <700» no handoff não têm sustentação no spec (só `>0`) nem artefacto no repo. Reclassificar como NÃO MEDIDO.
2. HIST-TEST-02 está mapeado para um teste que não verifica anacronismos de assets; O1 e O5.12/13 exigem aprovação histórica e fontes por asset.
3. O3 «12 sementes / 100% determinismo» não compara repetições e abate os inimigos por atribuição direta: não é teste de clímax nem de determinismo.
4. SAVE-01 testa um só checkpoint (cp_a); SAVE-02 sem persistência real. Ver I.md (rng fora do snapshot, restauro não bit-determinístico).
5. O handoff usa «PASS (100%)» para tudo, em contradição com O1 e O6 (sem registo P0/P1).

## Lacunas de prova

- Nenhum playtest humano (O4), captura visual comparada (HZ-01, AV-01) ou medição em equipamento declarado (PERF).
- Registo de prova O1 (hash, máquina, GPU, resolução, seed, observado) inexistente; artefactos do browser são escritos fora do repo.
- Casos em falta: AI-03 (líder/cobertura), COM-02 (porta aberta), NAR-01 (TR02..TR05), SAVE-01 (cp_b/c/d), OBJ-01 (perda de carga/recuo), AI-02 (som), O3 (ritmo 60 s/45 s, pares, auxiliares mortos).
- REG-01 e importação M03 só verificáveis após integração autorizada.
- Não executei os testes: o estado verde dos IDs acima é o que o handoff declara, não o que verifiquei.
