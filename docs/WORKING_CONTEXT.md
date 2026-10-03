# Contexto de continuação — M01 / Tczew

Actualizado em 2026-10-02. Este resumo é um índice de continuação, não substitui a especificação ou as provas. Acrescentar mudanças por etapa; conservar identificadores, decisões e caminhos exactos.

## Intenção e limites

Concluir M01 antes de iniciar M02. M01 permanece **PROTÓTIPO JOGÁVEL**. Não declarar aprovação do marco 2, playtest humano, FPS no Chromebook ou arte final a partir de testes automatizados. Usar ferramentas gratuitas e arte original/licenciada; não extrair conteúdo de outros jogos.

Trabalhar em branch própria. Integrações em `codex/m01-runtime` e PRs estão autorizados. O utilizador decide o merge em `main` e a publicação; não usar `workflow_dispatch` (também publica). Preservar a bancada francesa com as suas coordenadas: 32 unidades = 1 m. M01/Three.js usam metros, +Y vertical e norte = −Z.

`Simulation` guarda dados, nunca objectos Three.js. O renderer lê estado e não decide dano, relógios, visibilidade de combate ou eventos. Preservar schema 2, checkpoints CP-A..D, RNG, eventos consumidos, destruição e baixas por ID. Alemães na margem leste; equipamento de 1939. Bombas a pelo menos 30 m do jogador; as demolições esperam pela segurança/escort do jogador.

## Referências de Git

| Referência | Estado observado | Conteúdo |
| --- | --- | --- |
| `main` | `72bbcdd156603c9399801c95d43d9365ba50fc82` | Publicação reservada ao utilizador. |
| `codex/m01-runtime` | Continuação de `dcffd4a`; código/merges até `83e2129`, tree `84462c0d08cd53533bd8332a9426d1a54c604eae`, seguidos de evidências/contexto | Ju 87, vagões/MG34 ligados; kits #31/#33/#34 preservados; main continua separado. Confirmar HEAD remoto antes de continuar. |
| PR #26 | Head `82dd3f06e383dfca0277e5416a27c7bb302fd931` | Revisão final da recarga, tiros de Kowal e provas reais. Tree `ca79370b443cf02d2bc7646d897b8819f0e75a4f`. |
| PR #25 | Conteúdo preservado `055da03e4461a13f844ff93c0dad8d54ffa0a1ac` (a branch foi reutilizada pelo #30) | Claude: rkm/wz.98a embutidas, 61 ossos e 25 clips. Já preservado no #26; não fazer merge separado em main automaticamente. |
| PR #27 | Head revisto `afdbe9e50b6f841c108cf250b2eef851213322bb` | Claude: kit **isolado** da rkm. Integrado em staging por `a07fcd9`; clips regenerados para o rig actual e galeria refeita. |

| PR #28 | Head observado `3fa1d0d4e62e5c48c300d1929ca5455ee6737563` | Claude: kit Ju 87 e primeira ligação. Esta revisão acrescenta LOD por distância, prova do raid genuíno e falha opcional. |
| PR #29 | Head `0667af008549f15947c10ab09b814338d701bf2c` | Kit de vagões genéricos revisto e integrado por `b880cd4`; 65 vagões do trem ligados em LOD2 instanciado; pátio/identificação P16 pendentes. |
| PR #30 | Head `ad0253e9e370c80b96163d01b061047750dd93df` | Kit MG34 revisto e integrado por `ded5d4b`; ligada a de_east_0/1, uma arma por rig; deitado/municiador pendentes na simulação. |
| PR #31 | Head `4170eea6ca5ed5f882727f9678bd2a763927e5b1` | Kit revisto/integrado por `ec87e3f`; guarnição/ligação pendentes; orçamento do LOD0 resolvido pelo #35. |
| `codex/m01-assets-review` | Código/merges em `ded5d4bd06e0790360698f05bfb4f6ee9e917627`, tree `c43075bd03dc7049658b872dd1a6bcb43928686e` | Handoff + kits #29/#30, preservando os históricos; commits seguintes só registam evidências/contexto. |

Continuação actual em `codex/m01-support-runtime`, também avançando o candidato `codex/m01-assets-review` do PR #32 e staging. #33 (`c6e5ed4`) integrado por `26c803c`; runtime `456d216` equivale à tree local testada `ec27af68ec9c25f9603a2329437ee4891ace8319`; #34 (`11554d9`) integrado por `e6f4bdc`. As linhas antigas são âncoras históricas.

Verificar refs antes de escrever no GitHub. Estes hashes são âncoras desta etapa, não uma promessa de que as branches nunca avançarão.

## Ficheiros e decisões preservados

| Ficheiro/sistema | Trabalho entregue / decisão |
| --- | --- |
| `src/render/m01-train-wagons.js` | 65 vagões (49 cobertos/16 abertos genéricos), 9,10 m, LOD2 partilhado/instanciado, fallback parcial/total. Cache possui geometria/material; módulo liberta buffers de instâncias. Sem velocidade/desembarque inventados. |
| `src/render/m01-characters.js` | `M01Characters.load/create/sample/update/release`: GLTFLoader, SkeletonUtils e AnimationMixer; esqueletos independentes, geometria/texturas partilhadas; 18/24/28 instâncias por qualidade. LODs e cache/fallback preservados. |
| `src/render/m01-characters.js` — Kowal | Usa a rkm **embutida** e os dez clips `rkm_*` do PR #25. Rajada/recarga derivam de `firedAt`, `rounds` e `cooldown`; não inventar novos relógios ou munição. Bąk saudável usa wz.98a. |
| `assets/models/provisional/m01/weapons/rkm_wz28/` | PR #27: geometria isolada com LODs 1476/744/234 triângulos, pivôs, sockets, texturas e manifesto; três clips próprios. Os nomes `rkm_aim` e `rkm_fire_burst` sobrepõem os dos soldados. **Não substituir os clips completos nem carregar duas armas em Kowal.** Não trocar a arma funcional por um kit alternativo sem necessidade concreta. |
| `tools/assets/m01-rkm-wz28/`, `docs/assets/m01-rkm-wz28/` | Fonte original e capturas isoladas. Medidas detalhadas estimadas identificadas; T31 consultada por resumos, sem declarar leitura integral das fontes. |
| `src/game/m01-simulation.js` | `stationEvacuation`: evento único de S3 às 04:35:30; Dudek aproxima-se da cabeça, arrasta o paciente no chão de costas a 0,65 m/s, entrega no posto da estação e regressa. Interrupção por morte/inactividade solta o paciente. Não prende a demolição oeste. |
| `src/render/m01-characters.js` — estação | Clip opcional `drag_wounded`; paciente usa `wounded` no chão. Bąk continua no `carry_socket` quando transportado. Rendering não escreve no save. |
| `tools/assets/m01-station/build.mjs` | Clip original de 1,4 s/30 Hz, 61 ossos. SHA-256 `504d4d84859149e3557da345e9572279a360d471e6c55c8550625ea5415ca9e5`. |
| `src/render/m01-viewmodel.js` | Mãos/arma do rig PL LOD0, LOD1 como fallback. Geometria própria recorta torso/pernas, conserva braços. Recarga: pivô `.25 × π` e posição `(.06,.07,−.38)`. Não repetir o recorte só dos antebraços: produzia braços soltos. Cortes das mangas ainda provisórios. |
| `src/game/game.js`, `src/game/m01-save-validation.js` | Diagnóstico só de leitura da evacuação, restauro atómico e compatibilidade com saves antigos/schema 2. Não alterar este contrato para integrar arte. |
| `tests/m01-station-evacuation.test.js`, `tests/m01-character-assets.test.js`, `tests/browser/m01.spec.js` | Regressões de apresentação, falhas de assets, transporte/entrega, restauro e combate com controlos reais. Usar os nomes existentes encontrados no repositório ao executar um teste. |
| `docs/verification/m01-runtime/characters/`, `station-evacuation/` | Relatórios, hashes e capturas reais; galerias isoladas e continuações de snapshots estão identificadas. Não são playtest humano nem uma nova partida contínua. |

Ficheiros de orientação lidos: `AGENTS.md`, `DEVELOPMENT_STATUS.md`, `QUALITY_REPORT.md`, `RUNBOOK.md`, `IMPLEMENTATION_PLAN.md`, `missions/m01-tczew/ENGINE_CONTRACT.md`, `ASSET_CREDITS.md`, `missions/m01-tczew/ASSETS.md` e o contrato dos soldados. Actualizar os documentos afectados quando a entrega avançar.

## Validação — conservar a origem de cada resultado

- `ef7d68a`: 126/126 Node, build e **21/21 navegador**, 453,8 s, sem retries; inclui a bancada francesa.
- Revisão final `82dd3f0`: 126/126 Node, build, **3/3 casos de equipamento**, 82,8 s. Inclui rajada/recarga real de Kowal e fallback LOD1. O conjunto final tem **22** casos; não chamar aos 21 anteriores uma execução integral desta revisão.
- Tree `8a77c66b6fd848e22b10b3ff192bf0775bf6d1a5` do PR #27/base staging: **128/128 Node**, build 1026,94 kB / 266,11 kB gzip e **22/22 navegador** em 502,8 s, zero retries/instáveis/erros globais.
- Handoff `f758daa`, revalidado em 2026-10-02: **132/132 Node**, build e **24/24 navegador** em **538,6 s**, zero retries/skips/instáveis/erros globais; inclui a regressão das nove pontes obrigatórias e a bancada francesa. Relatório bruto, casos e capturas em `docs/verification/m01-runtime/asset-review-2026-10-02/`.
- Integração dos kits #29/#30, código `ded5d4b`: **136/136 Node** e build. `src/`, testes de navegador e JS de produção idênticos ao handoff validado (SHA-256 no relatório); não foi atribuída uma segunda execução local do navegador à integração. Essa etapa precedeu a ligação dos kits. O CI #32 terminou com 136/136 Node, build e 24/24 browser (20,8 min), deploy ignorado.
- Runtime `bf59e6f` / remoto equivalente `456d216`: **148/148 Node**, build e **26/26 navegador**, **552,1 s**, zero retries/skips/instáveis/erros globais. Após #34: **153/153 Node** e build, JS idêntico (`6e8d87a1653f4495add54fa4176c9da41cb1416c3362f2615b17cc16116c56fa`). Relatório distingue os dois candidatos em `support-runtime-2026-10-02/`.
- #35 (e65ce73) integrado por 83e2129: ckm LOD0 3904/4000, **154/154 Node** e build, JS idêntico. CI anterior 23c403b / 37071814929 passou **153/153 Node, build e 26/26 browser** (14,9 min), deploy ignorado. Relatório em `ckm-budget-2026-10-02/`; novo CI separado.
- Não há medição no Chromebook nem playtest humano completo. As partidas contínuas históricas do Claude em `continuous/round1..3` pertencem a builds anteriores.

## Skills pedidas e contexto

Ponytail: reutilizar soluções existentes e corrigir a causa; não criar um segundo caminho de armas só porque há um novo kit. Graphify: mapa integral autorizado pelo utilizador, incluindo imagens; corpus inicial: 355 ficheiros (155 código, 49 documentos, 151 imagens); último scan: 378 (168 código, 55 documentos, 155 imagens). Graphify incompleto, com 120/151 imagens iniciais e 2 chunks de documentos concluídos. Checkpoint em `graphify-out/extraction-checkpoint.json.gz`; falta reextrair documentos alterados, terminar 31 imagens iniciais e quatro suplementares, e gerar o grafo/HTML. Código extraído por AST, documentação/imagens por análise com proveniência; consultar `graphify-out/` para as ligações e limitações. Não tomar uma imagem de teste como prova histórica.

Context-compression: resumo estruturado com intenção, caminhos, decisões, estado e próximos passos, actualizado por etapa. Context-compressor: medir antes de comprimir, usar uma pergunta concreta e guardar fontes completas/âncoras; a suficiência lexical não comprova todas as restrições. Headroom pode comprimir saídas locais e guardar originais; não intercepta automaticamente esta conversa no ChatGPT nem recupera tokens já gastos. Estatísticas locais não são faturação de ChatGPT.

## Próximos passos

1. Preservar Ju 87, vagões/MG34, fallback e os 26 casos. As nove pontes obrigatórias continuam a ser as únicas falhas de art que bloqueiam M01. Sem mudanças em saves/relógios/combate para ligar kits visuais.
2. Observar o novo CI do PR #32 após avançar staging/candidato; não apresentar o CI anterior de dcffd4a como validação remota da nova revisão. Main/publicação reservados ao utilizador.
3. Graphify permanece **em pausa**; checkpoint preservado, sem reextracções.
4. Claude: novo pedido em `docs/CLAUDE_NEXT_TASK.md`: ckm LOD0 até 4000 já entregue/revisto no #35; próxima entrega são os pares de agarrar/soltar no arrasto da estação. #31/#33/#34/#35 já revistos; não repetir kits. Guarnição ckm/deitado MG34, identificação de vagão/estado e altura das coberturas do pátio são dependências explícitas da integração futura.
5. Rever arte/transições/áudio, playtest humano e Chromebook; M02 espera pela aprovação de M01.

## Continuação sem Claude — 2026-10-02

O utilizador informou que Claude atingiu o limite semanal e pediu continuidade sem esperar cinco dias. Codex assume as tarefas pendentes. Encontrada entrega completa na branch `claude/m01-station-drag-transitions`, head `27353ef207c5d0d97102db5b60d1d4fd16943194`, sem PR. Kit de quatro clips revisto e integrado como asset: 158/158 Node e build, regeneração byte a byte idêntica, galeria original inspeccionada; rig/clips anteriores conservados. Provas em `docs/verification/m01-runtime/station-drag-review-2026-10-02/`. Sem alteração de src/browser/workflows/saves ou Graphify; JavaScript de produção idêntico. Os clips ainda não são tocados pelo runtime. Próximo passo do Codex: ligar entrada/saída e pose segura ao estado real da evacuação, com pausa/restauro/fallback; não inventar relógios ou sucesso do resgate no renderer. Claude está em pausa; as tarefas anteriores de orçamento e criação dos clips estão entregues.

## S3 — transições ligadas ao runtime (2026-10-03 UTC)

Continuação de `44ee7822a295ac840bce70c4ca9897c064becce9`, sem reconstruir sistemas. `M01Simulation.evacuateStation` guarda no paciente `stationDrag = {phase, startedAt, duration}`; fases `grab`/`release` duram 1,6 s estimados, e `drag` conserva 0,65 m/s e o offset de 0,92 m. O par fica imóvel durante as transições, chega ao ponto de entrega antes de soltar e só é entregue após a libertação. `moveActor` permanece byte a byte igual; a chegada exacta é limitada à evacuação de S3. Interrupção por baixa/inactividade/reatribuição limpa o par; nenhum clip decide transporte, dano ou sucesso.

`M01Characters.sample` usa o mesmo instante guardado para os dois papéis. No arrasto, segura o último frame real de `station_drag_patient_grab`; o médico usa `drag_wounded`. A falta de qualquer clip do kit causa fallback conjunto. Rig de 61 ossos, GLBs, clips anteriores e toda a produção fora dos dois ficheiros afectados permanecem idênticos. Saves/schema 2 conservados, saves antigos em trânsito retomam sem repetir a pega; validação de fases é atómica.

Validação: 165/165 Node e build; 5/5 casos focados de navegador (110,492 s), sem skips/retries/instáveis. A suíte integral passou 29/29 casos em 583.108 s, sem falhas, retries, skips, instáveis ou erros globais. Provas, capturas originais do navegador de produção e substituições literais: `docs/verification/m01-runtime/station-drag-runtime-2026-10-03/`. São continuações de snapshots alcançados por controlos reais, não playtest humano.

CI da base `44ee782`: run 37077052752, 158/158 Node, build e 26/26 browser em 21,3 min, deploy skipped. CI de `2ccd451`: run 37076161531 cancelled durante browser; não aprovado. Estas execuções pertencem aos commits anteriores. A CI do próximo head será acompanhada separadamente. Main continua `72bbcdd156603c9399801c95d43d9365ba50fc82`; PR #32 permanece draft; sem publicação/workflow_dispatch/M02. Graphify continua pausado, checkpoint SHA-256 54647d13cc9b860c18b777cbd3d4cdc693d4a2af0cb015082171c2667dd32e32 preservado. Claude continua em pausa; guarnição ckm, prone/loader MG34 e estado dos vagões exigem dados reais da simulação.

Âncora do código validado: `a83bd8c960e853278ffb0a2293776099e05d3d86`, tree `6885264ee93579bcabb9602813ee875d58421d66`. O commit seguinte só actualiza contexto; a produção testada permanece igual.
