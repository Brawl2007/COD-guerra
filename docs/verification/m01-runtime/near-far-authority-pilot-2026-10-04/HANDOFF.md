# M01 — piloto de autoridade near/far

TASK_ID: `M01-NEAR-FAR-AUTHORITY-RUNTIME-PILOT-V1`  
MODELO / ESFORÇO solicitados: GPT-6.1 Sol / HIGH; execução sem delegação.  
BASE: `codex/m01-schema2-determinism-audit` @ `5f3cc34f53c61beec52255d67f8babd7194c9f7f`.  
BRANCH: `codex/m01-near-far-authority-runtime-pilot`.  
HEAD de runtime: `0b8a75ff2ada134c09a220179be2984d30a7a7e9`. HEAD de código/testes finais: `51436a614216a540195d68f29d2c08904ce582cd`; commits seguintes só acrescentam documentação/evidências, com os hashes preservados. **HEAD FINAL** remoto exacto está fixado na entrega e no [PR draft #39](https://github.com/Brawl2007/COD-guerra/pull/39), campo head_sha; um commit não pode conter o seu próprio hash. Confirmar esse tip antes de continuar.  
Estado: **PROTÓTIPO JOGÁVEL**, sem merge, deploy, main ou M02.

## Escopo e identidade

PILOT SECTOR: `m01_pilot_lisewo_dike`, sub-setor lógico isolado da geografia S2; os cinco setores históricos existentes mantêm horários/metadados. PILOT FORMATION: `m01_pilot_dike_riflemen`.

ACTOR IDS: `de_east_36`, `de_east_37`, `de_east_38`, `de_east_39`. Quatro riflemen anónimos já presentes na produção, com kar98k; roster de 89 preservado. Nenhum novo NPC vivo, cast, gate shooter, vítima polaca histórica, sapador, estação, MG34 ou CKM é transferido. Auditoria prévia e posições exatas: `docs/architecture/M01_NEAR_FAR_PILOT_AUDIT.md`.

## OWNER MODEL / RNG LOCK

Um ledger privado decide `AGGREGATED` ou `INDIVIDUAL`. Os quatro objetos do roster são projeções consultáveis por render/rays; `active` indica ativação na missão, não autoriza outro AI. Ambos os loops legados de movimento/combate excluem esses IDs; `burst` legado também os recusa. Kowal/salvas históricas escolhem os outros alemães, evitando mutação paralela. Dano/supressão do jogador e granadas passam pelo gateway do owner atual.

Assertions validam owner exclusivo e correspondência de todos os campos projetados. O resolver mutante inteiro do setor exige AGGREGATED. Em lease, o agregado e seu único LCG setorial permanecem exatamente congelados, incluindo revisão, posições, munição e draws. Fingerprint é uma serialização canónica completa de agregado + RNG; não é um hash criptográfico nem credencial. Nenhum RNG por formação foi criado. Cada membro possui stream xorshift32 individual persistido, derivado uma vez de seed/ID/algoritmo. O RNG global da missão continua para sistemas existentes; a ordem de consumo desses quatro NPCs mudou por passarem a ter autoridade própria. Não se promete equivalência de combate com a antiga branch; preserva-se determinismo da nova simulação.

## MATERIALIZATION / DEMATERIALIZATION

Acquire: revisão esperada → cópia integral dos quatro descriptors → preflight/validação → preflight de escrita nos quatro actors → publicação síncrona → INDIVIDUAL. O descriptor 3 inválido, callback que lança, promessa assíncrona, tentativa de snapshot intermediário e actor 3 não gravável rejeitam sem publicação parcial/RNG.

Return: token, generation, sourceRevision/fingerprint e payload completo da autoridade individual. O payload inclui IDs/ordinais, status/health, posições/facing, alive/dead derivado, clip/ciclo/prazo, reserva/spent separados, weapon IDs estáveis, RNG/observação/intent/timers, localProgress autorizado e retainedDead. Precisa corresponder exatamente ao ledger atual. Partial/altered/stale return rejeita antes do commit. Publicação troca owner e elimina lease; reaquisição usa nova generation e os mesmos homens/streams. Nenhum healer, refill ou respawn.

## CASUALTIES / AMMO / BODY PERSISTENCE

Produção inicia com zero mortos inventados. Fixture explícita contém cinco registos **já mortos**, sem publicar cinco NPCs vivos. Dois outros homens (`de_east_36/37`) morrem por tiros reais da wz.29 do jogador, usando controles, dispersão, hitboxes e colisão da produção. Return deriva **7 mortos**, não soma o resultado à origem. Alive formation move no agregado; posições dos corpos não acompanham anchor. Reaquisição conserva morte, identidade e posição. Os cinco retainedDead da fixture não representam um evento histórico observado.

Prova de reserva: clip inicial vazio explícito, 27 reload/fire válidos pelo gateway/ciclo → reserva **100→73**, loaded 15, spent 27, total inicial 115. Outro teste executa reload real no tick individual e compara 800 ticks futuros após save em RELOAD_CLIP; total de reset normal é 120 (100 reserva + 20 loaded). Não há WorldWeapon/feed, roubo/partilha de armas ou pickup novo. Estes números são contabilidade do piloto estimada, não pesquisa histórica.

## CLOCKS / HYSTERESIS / PAUSE

localClock é tempo ativo da missão; battleClock é histórico segmentado; nenhum wall time. Durante lease, a fronteira aggregate.updatedAt e o RNG congelam. Return rebasa updatedAt/nextAggregateAt e zera velocidade, impedindo catch-up de movimento/tiros/exposição/RNG/ammo. INTRO/OUTRO congelam combate do piloto sem interromper playback local da cena.

Banda física: acquire <=150 m / retain <=170 m; MID retém 130..820, FAR acima de 780, conforme contrato. Sequência **149,151,148,152: exatamente 1 aquisição**, ainda ativa a 170, return a 170,01. Host pause não chama tick; dt=0 e policy paused não movem clocks, bands, lease, RNG ou timers. Teste browser verifica congelamento da lease ativa.

Limite geométrico obrigatório: player não pode chegar a 150 m dos alemães (playable X<=440, falha X>401; membros X>=1076). Não alteramos bounds ou posições. Acquire alcançável usa a relevância de interação aprovada: LOS real + alcance existente de 1200 m, independente da câmera/qualidade. Caminho por controles desde CP/rota real abre LOS pela margem oeste. O browser deve mostrar AGGREGATED→INDIVIDUAL→AGGREGATED mantendo banda física FAR. Não é aproximação física ao corpo.

## SAVE/RESTORE / CHECKPOINT / DETERMINISM

Schema **2**; `authorityPilot` é opcional, aditivo e explicitamente validado, sem referência recursiva a saves. Estado privado só é publicado após validação completa do candidato M01. Legacy sem campo inicializa o piloto a partir dos quatro actors existentes, mantendo IDs/mortos/RNG global; não reconstrói um stream individual que o formato antigo nunca guardou. Saves modernos guardam streams originais, owner, serial/revisão/token, corpos, ammo, clocks e receipts.

Continuation mantém `resumeCheckpoint` plano do PR37; CP-A..D são snapshots planos. Save em lease → new simulation → restore/double restore mantém um owner. Restart regressa ao checkpoint anterior, não promove a continuação a CP nem duplica owner.

Metodologia PR37: comparar estado completo, checkpoint e eventos futuros por tick após restore em B; primeiro tick/path divergente diagnosticado. **10.100 ticks A/B**, incluindo 1.200 de lease/fire/reload/release/reentry, 800 após mid-reload real, 8.000 com dt variável/zero e duas janelas return/reacquire, 100 após 13 corrupções rejeitadas. Double loads em janelas especificadas. Sem divergência nos casos executados; não é prova matemática de todos os estados.

## CAMERA/QUALITY

Decisão usa distância/LOS do mundo e observações; orientação de câmera, quality e visibility do renderer não são entradas de ownership. Node compara futures com rotações; browser cobre giro real e LOW/MEDIUM/HIGH do mesmo save ativo.

## Validação

FOCUSED TESTS: **24/24**, zero skips; `focused-confirmed.log`, 44.109,36 ms; `pilot-audit-confirmed.json` é o resumo definitivo. Inclui guarda de clock para os 800 ticks e cópia imutável do relatório dessa janela. 19 iniciais passaram antes da ampliação. Execuções iniciais vermelhas preservadas, com fixtures/correções identificadas.
NODE: **266/266**, zero skips/falhas, `node-final.log`, 300.081,89 ms. Repetição final com a guarda adicional do relatório: **266/266**, zero skips/falhas, `node-confirmed.log`, 275.883,13 ms.  
BUILD: PASS (`build-final.log`); aviso Vite de chunk grande já conhecido.  
BROWSER focado final: **2/2**, 41,5 s, zero retries/skips/falhas/flaky; `browser-focused-final.json.gz` e log. BROWSER integral final: **38/38 PASS**, **797.924,22 ms** (13,3 min), exit 0, zero retries/skips/falhas/flaky. `browser.json.gz` é o relatório bruto; `browser-summary.json` lista todos os casos e cada retry/status. Todos os 38 casos possuem exatamente um resultado passed, retry0; errors globais vazios. Não há retry verde usado para esconder falha.

Relatórios `pilot-audit.json` / `pilot-audit-final.json` são preliminares e substituídos por `pilot-audit-confirmed.json`: o metadata de clock da janela mid-reload diferia do resultado da execução isolada; o registo definitivo usa cópia imutável e uma asserção explícita da duração. A prova definitiva regista essa janela em 46,99999999999947 s; 800 ticks avançam no máximo 40 s ativos. As comparações de estados/eventos não usam esse resumo como entrada.

Browser inicial: 1/2; restore e presets passaram, mas a fixture de Restart supunha CP-A quando a rota já tinha CP-B. Revisão 1: 1/2; o primeiro relativo após Pointer Lock foi descartado e a fixture não virou para oeste antes do return. Fixes apenas no teste: checkpoint anterior exato, capture pausada e espera do ângulo real após o sample inicial descartado. Revisão 2 também vermelha: espera de ângulo era inferior à quantização inteira de movementX; ajuste para um quantum de input (0,0022 rad), mantendo o ângulo real e todos os contratos. Nenhum timeout/retry ampliado; Revisão 3 manteve a falha de turn após novo lock; o steering final usa feedback limitado por controles/clock reais, como a rota Node, e arredonda pixels. Os quatro vermelhos são preservados; não contam como verde.

Falha Node inicial: 260/261; último caso legacy de flight removia enemyFire mas preservava burst plans modernos dependentes dele. A fixture foi tornada coerente com o formato antigo, removendo também mg34Prone. Asserções de roundtrip/future/corrupt flight conservadas e o caso focado passou; nenhuma alteração à lógica MG34.

## FILES CHANGED / LIMITATIONS / RISKS

Produção: novos `src/game/m01-authority-coordinator.js`, `src/game/m01-sector-runtime-adapter.js`; hooks pequenos em `src/game/m01-simulation.js`; diagnóstico read-only em `src/game/game.js`. Testes: `tests/m01-authority-runtime.test.js`, fixture legacy em `tests/m01-cover-threat.test.js`, `tests/browser/m01-authority-pilot.spec.js`. Docs/status/runbook e evidências desta tarefa.

Escopo limitado: um setor/uma formação/quatro actors; HOLD, observação, supressão, rifle/reload. Sem exposição/casualty aleatório agregado, coordenação tática completa, combate de toda guerra distante ou AI macro novo. Local progress permanece zero sem interação autorizada implementada. RetainedDead serve a fixture contratual, não cria corpos extras renderizados. Leases não têm expiry de wall time. Receipts de comandos têm limite explícito de 256, sem eviction que permita reaplicar duplicate; não são registrados para cada decisão autónoma. A munição disponível do piloto é finita.

Riscos: quatro riflemen ganham lógica própria e podem alterar resultados táticos locais; teste automático não substitui playtest humano nem desempenho em Chromebook físico. O alcance/LOS real pode causar transições por oclusão; histerese 150/170 é demonstrada numericamente, mas só interação ranged é alcançável no mapa. Loader/reload/feed MG34 e arco CKM continuam pendentes. Nenhuma migração para schema3, RNG de formação, arquitetura de render/áudio/animação/destruição, geometria, vagões, M02 ou Graphify.

Proteções byte a byte em `protected-scope.json`: core/world/render/assets/missões/workflows/manifestos/config browser/Graphify sem diffs; métodos MG34, estação/Bąk, relógio histórico, eventos, boundaries, rounds e chamada final preservados. Hooks no tick/consume/save e no routing de dano são explicitamente os diffs de integração.

RECOMMENDATION TO CAPTAIN: revisar este candidato isolado, especialmente limites geométricos e contabilidade/owner; as provas Node/build/browser integrais estão fechadas. Recomenda-se revisão técnica deste piloto isolado, com aprovação explícita dos limites de ranged relevance e da fixture casualty. Não integrar outra formação nem fazer merge automático. Tarefa encerrada para revisão; parar aqui.

## Proveniência e entrega

Base/main/contratos foram confirmados no GitHub antes da seleção e novamente na entrega. Main permanece `72bbcdd156603c9399801c95d43d9365ba50fc82`, base permanece `5f3cc34f53c61beec52255d67f8babd7194c9f7f`. A suíte final executou o código/testes de `51436a6`; somente documentação mudou enquanto corria. Build usado pelo preview tem SHA-256 registado, idêntico no fim. Chromium153/SwiftShader neste ambiente, Node24; não é benchmark de hardware físico nem resultado CI/GitHub Actions.

FILES CHANGED completo está em `MANIFEST.json`; entradas de evidência são artefactos git desta tarefa. Logs vermelhos e resumos preliminares continuam identificados; apenas os relatórios confirmed/final comprovam a entrega. Traces ZIP e screenshots de test-results transitórios não foram publicados; relatórios JSON brutos contêm diagnóstico/anexos textuais inline e referências originais, sem prometer disponibilizar ficheiros omitidos.
