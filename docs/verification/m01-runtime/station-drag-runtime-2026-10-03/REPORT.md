# S3 — ligação dos clips ao runtime

M01 permanece **PROTÓTIPO JOGÁVEL**.

## S3 — transições ligadas ao runtime (2026-10-03 UTC)

Continuação de `44ee7822a295ac840bce70c4ca9897c064becce9`, sem reconstruir sistemas. `M01Simulation.evacuateStation` guarda no paciente `stationDrag = {phase, startedAt, duration}`; fases `grab`/`release` duram 1,6 s estimados, e `drag` conserva 0,65 m/s e o offset de 0,92 m. O par fica imóvel durante as transições, chega ao ponto de entrega antes de soltar e só é entregue após a libertação. `moveActor` permanece byte a byte igual; a chegada exacta é limitada à evacuação de S3. Interrupção por baixa/inactividade/reatribuição limpa o par; nenhum clip decide transporte, dano ou sucesso.

`M01Characters.sample` usa o mesmo instante guardado para os dois papéis. No arrasto, segura o último frame real de `station_drag_patient_grab`; o médico usa `drag_wounded`. A falta de qualquer clip do kit causa fallback conjunto. Rig de 61 ossos, GLBs, clips anteriores e toda a produção fora dos dois ficheiros afectados permanecem idênticos. Saves/schema 2 conservados, saves antigos em trânsito retomam sem repetir a pega; validação de fases é atómica.

Validação: 165/165 Node e build; 5/5 casos focados de navegador (110,492 s), sem skips/retries/instáveis. A suíte integral passou 29/29 casos em 583.108 s, sem falhas, retries, skips, instáveis ou erros globais. Provas, capturas originais do navegador de produção e substituições literais: `docs/verification/m01-runtime/station-drag-runtime-2026-10-03/`. São continuações de snapshots alcançados por controlos reais, não playtest humano.

CI da base `44ee782`: run 37077052752, 158/158 Node, build e 26/26 browser em 21,3 min, deploy skipped. CI de `2ccd451`: run 37076161531 cancelled durante browser; não aprovado. Estas execuções pertencem aos commits anteriores. A CI do próximo head será acompanhada separadamente. Main continua `72bbcdd156603c9399801c95d43d9365ba50fc82`; PR #32 permanece draft; sem publicação/workflow_dispatch/M02. Graphify continua pausado, checkpoint SHA-256 54647d13cc9b860c18b777cbd3d4cdc693d4a2af0cb015082171c2667dd32e32 preservado. Claude continua em pausa; guarnição ckm, prone/loader MG34 e estado dos vagões exigem dados reais da simulação.

Âncora do código validado: `a83bd8c960e853278ffb0a2293776099e05d3d86`, tree `6885264ee93579bcabb9602813ee875d58421d66`. O commit seguinte só actualiza contexto; a produção testada permanece igual.
