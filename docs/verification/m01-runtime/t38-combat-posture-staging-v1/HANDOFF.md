# HANDOFF T38 — `M01-COMBAT-POSTURE-STAGING-V1` (estado: ENTREGUE NA BRANCH, NÃO ACEITE)

Retoma de 2026-10-17 (sessão Sonnet) do trabalho parado do PR #82. Branch `claude/busy-ritchie-3fkvk2-t38` (local, não publicada), base = cabeça do PR #82 (`2bc623c`,
branch `claude/quirky-heisenberg-iytxsy`) fundida com a candidata #80 (`813f163`) e com a correcção de teste do #89 (`b449007`). Reserva `claims/m01-t38`.
Nada foi publicado: sem push, sem PR novo, sem comentário no GitHub (a issue #72 fica por actualizar pelo Capitão), sem merge, sem deploy.
Resultados e números: `README.md` (efeitos no jogo, golden, verificação, capturas) e `GOLDEN_AMENDMENT_01.json`.

## O que se fez, passo a passo (os passos 1–4 do handoff anterior)
1. **Testes focados** (`m01-combat-posture-staging`, `m01-east-front`, `m01-cover-threat`, `m01-animation-contract`) sobre `25ed12f`: 84 testes, 77 passam, 7 falham. As 7
   falhas eram todas do golden (os 2 testes por tick e 5 testes do mesmo ficheiro que dependem da variável `completed` que só o primeiro teste do golden preenche). Os
   itens 4, 5, 8 e 10 do handoff (secção atrás dos sacos por linha de visão; casos negativos, validação e «back rank» estrito; sapadores ajoelhados em x −170; saves
   antigos) já estavam verdes: **nenhuma alteração de código ou de asserção foi precisa**, nenhum teste foi enfraquecido ou saltado.
2. **Golden.** `src/game/m01-simulation.js` não mudou (o `sha256` fixado coincide), por isso não houve commit de simulação. O golden estava desactualizado por uma única razão:
   `4772b24` moveu os 12 lugares dos atiradores dos portões em `mission.json` sem o regenerar. Regenerado em x86 **só com a ferramenta do repositório**
   (`m01-combat-posture-staging-audit.mjs --write-golden --candidate 25ed12f`) contra o predecessor `ef35c7a`; as 24 rotas passaram todas as invariantes; segunda execução
   da ferramenta sem `--write-golden` reproduziu os dois percursos byte a byte; `m01-animation-contract` 21/21. Documentado em `GOLDEN_AMENDMENT_01.json` (valores
   exactos que mudam e porquê) e `GOLDEN_DIVERGENCE_01.json` (onde as duas simulações divergem primeiro); golden antigo guardado byte a byte e fixado por `sha256`.
3. **Build e specs de browser, capturas, `npm test`:** `npm run build` OK. `npm test`: **967/967**, exit 0. Browser (`CI=1`, sob `flock`), `m01.spec.js` + `m01-mg34-prone.spec.js`: 32 testes, **30 passam, 2 falham** (`m01.spec.js:50`, o carregador, e `m01.spec.js:426`, «German fire on the repair»; análise no `README.md`, secção Verificação). `m01-anim-resolver`, `m01-distant-front-impostors`, as capturas e a comparação do `:426` com a base `813f163` **ainda estavam na fila do `flock`** (com trabalhos de outros agentes à frente) quando isto foi escrito: ver o README, que diz o que já foi corrido.

## Os 10 defeitos da revisão crítica de `8bb0372`, verificados agora por testes (não pelo que o implementador disse ao parar)
| # | Defeito | Prova actual |
| --- | --- | --- |
| 1 | Kowal deitado partia `m01.spec.js:196` e `m01-mg34-prone.spec.js:45` | Kowal está de joelhos (`crouched`), levanta-se só para a rajada; teste `renderer: Kowal kneels…`, estatísticas da rota (`kowalUp`, `sectionKneel`) e as duas specs de browser passam: `m01.spec.js:196` e as 4 de `m01-mg34-prone.spec.js` (incluindo `:45`) |
| 2 | Specs de browser nunca corridas | corridas agora: 30/32; as 2 falhas não são do Kowal nem do deitado (ver README) |
| 3 | Envelope do terreno | `collisions: … terrain envelope protects every staged place` e `m01-terrain-envelope.test.js` |
| 4 | Secção atrás dos sacos, por linha de visão | `behind the sandbags the kneeling section is hidden from every German position…` (40 posições alemãs) |
| 5 | Casos negativos, validação de dados, «back rank» estrito | `stage data: … a data error stops the game` (≈30 casos) e `m01-east-front` (reservas atrás de todos) |
| 6 | Atirador de atrição de pé | a rota afirma que cada bala de atrição sai do olho de um homem de pé |
| 7 | Profundidade dos portões (x 1053,2–1058,3, mesmas linhas de visão) | `no row…` e `the gate riflemen keep their lines of sight…` |
| 8 | Sapadores ajoelhados em x −170 | estatística `sapperWest` da rota |
| 9 | README incompleto | README reescrito com os números novos, o golden, a verificação e as capturas |
| 10 | Saves antigos | `saves from before T38 load onto the new places…` |

## Por decidir / por fazer (nada disto foi decidido nesta sessão)
- **Decisão de design:** cobertura real vinda de oeste para os atiradores dos portões exige novos props de cobertura (o único colisor ali é o portal de 1912, atrás deles).
  Sem props, a melhoria é profundidade, alturas diferentes e postura; foi isso que se fez.
- Revisão crítica independente da versão final (a anterior, sobre `8bb0372`, foi REJECT), CI x86 completo (4 shards) e playtest humano. As capturas são SwiftShader, não medem
  FPS e não são playtest.
- `m01-postprocess-grading` (9 testes) exige `M01_GRADING_BEFORE_DIR` (ver `DEVELOPMENT_STATUS.md`, grupo A); não é T38 e não foi corrido.
- Registo T00–T52: T38 continua `DELIVERED_BRANCH` (nota actualizada). Issue #72: por actualizar pelo Capitão.

Sem merge na `main`, alterações na #80 nem deploy.
