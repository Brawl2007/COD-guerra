# PROPOSTA — envelope de save comum M01/M02

> **Estado: PROPOSTA, pendente da decisão D-M02-4** (`docs/direction/M02_BZURA_DESIGN.md` §6).
> Nada aqui está implementado. Este documento não altera `src/game/m01-*`, os saves da M01 nem a ponte M02→M03.
> Não atribui um número global de schema (PDF I5: «não atribuir um número de schema global unilateralmente»).
> Base: branch da M02-FIX-2, a partir de `03387a3`.

## 1. Situação atual: três formatos e dois gestores

| Formato | Onde | Chave de armazenamento | Forma | Carregamento |
|---|---|---|---|---|
| M01, ato BW (schema 2) | `M01Simulation.checkpoint` (`src/game/m01-simulation.js`) | `cod-guerra:checkpoint:m01:v2` (`src/game/game.js`) | Snapshot próprio da M01 | `M01Simulation.loadCheckpoint(texto)` |
| M01, atos novos (schema 3) | `M01ActRunner.envelope()` (`src/game/m01-acts.js`) | `cod-guerra:checkpoint:m01:acts:v3` | `{schema:3, missionId:'m01_tczew', act, carry, actSave}` com chaves exatas | `M01ActRunner.load(texto)` despacha por `schema` **antes** de chamar a simulação; valida `carry` (v1) e `actSave` |
| M02 (depois da FIX-2) | `M02BenchSimulation.snapshot()` + `M02SaveStore` (`src/game/m02-save-store.js`) | `cod-guerra:m02:bench:v2` (+ `:previous`, `:staging`) | Registo `cod-guerra-m02-bench-save` v2 com um snapshot `m02-bench-snapshot` v2 por checkpoint | `restoreCheckpoint` / `restorePersistedCheckpoint`; validação em fases |
| Ponte M02→M03 | `exportCampaignResultToM03` (`src/game/m02-acts-director.js`) | não é persistida; fica em `sim.m03ExportPackage` (e portanto dentro do snapshot) | `cod-guerra-campaign-bridge-m02-to-m03-v1` | Não há importador M03 |

O `carry` da M01 (`carryFrom`) é uma função pura: dificuldade, semente do ato seguinte derivada por `nextSeed(rng.state, actId)` sem consumir o gerador, eventos consumidos, flags `m01.*`, munição e granadas. A M02 não tem `carry`. A ponte M02→M03 é um pacote próprio e não segue este padrão. Este é o risco M6 «dois gestores de save»: `game.js` grava a M01 em `localStorage` com o seu protocolo e a M02 grava com `M02SaveStore`, cada um com o seu validador.

## 2. Campos comuns propostos

O envelope envolve o snapshot de cada missão **sem o alterar**. A missão continua dona do seu payload e do seu validador. O envelope só guarda o que um gestor de campanha precisa de ler sem abrir o payload.

| Campo | Significado | M01 hoje | M02 hoje |
|---|---|---|---|
| `schema` | Identificador do envelope comum. **Valor a decidir em D-M02-4**, coordenado com o dono do R4 | `3` (só atos novos) | — |
| `missionId` | Missão dona do payload | `'m01_tczew'` | `'M02'` (snapshot e ponte) |
| `actId` | Ato/célula dentro da missão | `act` (ex.: `act_vii_a_north`) | não existe; proposta: derivar de `activeCellId` (`A`/`B`/`C`) com IDs explícitos, p. ex. `m02_a_quinta`, `m02_b_leczyca`, `m02_c_lesmierz` |
| `sceneId` | Cena narrativa ativa (opcional) | implícita nos eventos consumidos | não existe como estado; só `objective.id` (`O00`…`O09`, `C04`, `T-AB`). **Lacuna**: C01–C12 não são estado explícito |
| `checkpointId` | Checkpoint semântico gravado | `actSave.checkpointsReached.at(-1)` | `snapshot.checkpointId` e `checkpointsReached` (FIX-2) |
| `rng` | `{algorithm, seed, state}` — cópia de leitura; o loader verifica que coincide com o payload | dentro de `actSave`; semente do ato em `carry.seed` | `snapshot.rng` (FIX-2), algoritmo `core-random-lcg32-v1` |
| `narrative` | `{date, dayPart, civilTime}`; `civilTime` só quando houver fonte (TIME-01 na M02) | horas do ato (04:30–07:05 no BW) | `snapshot.narrative` (FIX-2), `civilTime: null` |
| `difficulty` | Dificuldade da campanha | `carry.difficulty` | não existe (a M02 não implementa H9) |
| `carry` | O que a missão seguinte herda (S1): flags por namespace, recursos, sobreviventes, semente derivada | `carry` v1 | não existe; hoje é a ponte (ver §3) |
| `flags` | Flags de campanha S1 com namespace por missão (`m01.*`, `m02.*`), com domínios fechados (I4) | `m01.*` dentro de `carry.flags` | `snapshot.flags` (domínios ainda divergentes do I4; ver auditoria I.md item 11) |
| `payload` | Snapshot da missão, intacto e validado pelo validador da missão | `actSave` (ou o checkpoint schema 2) | snapshot `m02-bench-snapshot` v2 |
| `payloadSchema` | `{name, version}` do payload, para despacho antes de abrir | `actSave.schema` | `{name:'m02-bench-snapshot', version:2}` |

Protocolo de armazenamento comum (o da FIX-2, já testado na M02): escrever em `:staging` → reler e validar → copiar o `current` confirmado para `:previous` → promover. Um `current` corrompido nunca substitui o `previous` bom. Nenhuma leitura apaga dados.

## 3. Mapeamento da ponte `cod-guerra-campaign-bridge-m02-to-m03-v1`

| Campo da ponte | Destino no envelope | Observação |
|---|---|---|
| `schema` | `schema` do envelope + `carry.v` | A ponte deixa de ter schema próprio |
| `missionId` / `nextMissionId` | `missionId` / `carry.to` | `carry.from` = `'M02'` |
| `completed` | `flags['m02.completed']` | I4: só depois da conclusão transacional |
| `historicalDates` | **fora do save** | São dados fixos de campanha (cronologia), não estado do jogador. `generalRetreatOnMorningSept10:false` passa a teste de dados |
| `flags` | `carry.flags` (só `m02.*`) | Domínios do I4 têm de estar fechados antes de gravar (I4: «definir schema antes de gravar») |
| `supplies` | `carry.flags['m02.supply_reached']` + duas flags auxiliares (água, munição) | I4 pede as duas flags auxiliares; o número sozinho não chega |
| `transitionIdsApplied` | `carry.transitionIdsApplied` | Idempotência TR01–TR05 |
| `totalHostilesPlanned` | **fora do save** | Constante de design |
| `m03ImportState.*` | **derivado no importador M03**, não gravado | I6: a M03 recebe a condição narrativa por regras transparentes. `lisEntry`, `waterReserveBonus` e `lastGroupSurvivorsCount` derivam de `m02.lis_status`, das flags de abastecimento e de `m02.last_group_survivors` |
| (em falta) semente da M03 | `carry.seed = nextSeed(rng.state, 'm03_…')` | Mesmo padrão da M01: deriva do estado gravado sem consumir o gerador |

Correção necessária antes de migrar: `exportCampaignResultToM03` **escreve** em `sim.flags['m02.lis_status']` (força `wounded_evacuated` quando o valor não é válido, por exemplo `'active'`). Uma exportação tem de ser pura, como `carryFrom`. Se não for, uma Lis «ativa» passa a «evacuada» sem que nada o tenha decidido.

## 4. Migrações (todas explícitas; nenhum save antigo deixa de carregar)

1. **M01 schema 2 e schema 3**: continuam a carregar exatamente como hoje, com despacho por `schema` antes de qualquer simulação. O envelope comum só se aplica a **gravações novas** depois de D-M02-4. Para leitura, um adaptador `lift(raw)` embrulha o formato antigo no envelope em memória, sem reescrever os bytes guardados.
2. **M02 `cod-guerra-m02-bench-save` v2**: adaptador que embrulha cada snapshot: `missionId:'M02'`, `actId` a partir de `activeCellId`, `checkpointId`, cópias de `rng` e `narrative`, e o snapshot em `payload`.
3. **M02 snapshot v1** (`m02-01-bench-snapshot-v1`): sem suporte. Nunca foi persistido (os checkpoints v1 viviam só em memória). Sem o estado do gerador, um restauro v1 não é determinístico. A FIX-2 rejeita-o com um erro explícito.
4. **Ponte v1 → `carry`**: conversão num só sentido, só para pacotes gerados em memória (não há pacotes persistidos).
5. **Chaves**: proposta de um namespace de campanha (`cod-guerra:campaign:<slot>` + `:previous` + `:staging`). As chaves antigas ficam só para leitura, como alternativa. Nunca são apagadas automaticamente.

## 5. Riscos

- **Dois gestores de save** (M6): enquanto `game.js` (M01) e `M02SaveStore` coexistirem, há dois validadores, dois protocolos e duas fontes de verdade sobre o checkpoint mais recente. O envelope comum só resolve isto se houver **um único** gestor. Esse gestor tem de ser extraído de `game.js`, o que toca código M01 e exige autorização própria.
- **Chaves exatas do schema 3**: `M01ActRunner.load` rejeita qualquer chave além de `act,actSave,carry,missionId,schema`. Por isso o schema 3 não pode ser estendido para a M02 sem alterar o loader da M01. Usar `schema:3` com `missionId:'M02'` seria invasivo e partiria a garantia «schema 3 nunca chega à M01Simulation».
- **Domínios de flags por fechar**: `m02.malek_status` usa `down`/`shaken` e `m02.lis_status` começa em `'active'`, quando o I4 diz «nulo durante a missão». Gravar flags num envelope de campanha antes de fechar o I4 fixa valores errados para a M03.
- **Tamanho**: medido nesta branch, um snapshot v2 da M02 tem cerca de 25 000 caracteres no arranque e 73 000 depois de 120 s de combate na área A. O registo com os 5 checkpoints de uma passagem completa tem cerca de 328 000 caracteres (`current`) mais 249 000 (`previous`), e o `:staging` é temporário. Cabe no `localStorage` habitual, mas a gravação é síncrona e pode causar uma pausa num checkpoint. Isto ainda não foi medido no browser.
- **Estado inválido bloqueia o save**: o validador v2 recusa números não finitos. Encontrei um NaN pré-existente: na área B, `pl_gruca` fica com `x`/`z` NaN no 1.º tick depois de `enterAreaBC06` (verificado com a semente 19390909 e com as cenas de arranque C01 e C02). Por isso o `cp_m02_c_reorganizacao` gravado depois de ticks na área B não é persistido (`persisted:false`), e `restoreCheckpoint` recusa-o na validação. A correção pertence à IA de combate, não ao save.
- **Configuração gráfica no snapshot**: a acessibilidade (`audiovisual.accessibility`) é gravada e reposta com o checkpoint. O I5 pede a configuração gráfica separada do estado de jogo. No envelope, deve sair do payload.
- **Sem `difficulty` nem `sceneId` na M02**: o envelope comum expõe estas lacunas. Preenchê-las é trabalho de design, não de save.

## 6. Opções para D-M02-4

| Opção | O quê | Toca na M01? | Resolve «dois gestores»? |
|---|---|---|---|
| **A** | Envelope comum novo (valor de `schema` decidido com o R4), gestor único extraído de `game.js`, payloads intactos, adaptadores `lift` para os formatos antigos | Sim (`game.js`, leitura dos schemas 2/3 por adaptador) | Sim |
| **B** | Reutilizar o schema 3 da M01 com `missionId:'M02'` | Sim (loader e `ACTS.order` da M01) | Parcialmente; viola a garantia do despacho por schema |
| **C** | Manter gestores separados; só o `carry` M02→M03 segue o padrão `carryFrom` | Não | Não (aceita formalmente o risco M6) |

Esta proposta favorece **A**, faseada: primeiro o `carry` puro da M02 (corrige a exportação que muta flags), depois o gestor único. A decisão é do Capitão, com o dono do R4.

## 7. Testes necessários se for aprovada

- Saves M01 schema 2 e schema 3 existentes (os fixtures atuais) carregam bit a bit como hoje.
- Ida e volta do envelope para cada missão: `lift` → gravar → ler → restaurar → continuação igual tick a tick (o teste `tests/m02-09-save-restore-determinism.test.js` é o modelo).
- `carry` M02→M03 puro: chamar a exportação não altera `sim.flags` nem o estado do gerador.
- Envelope com `missionId`/`payloadSchema` desconhecido, chaves extra ou `rng` diferente do payload é rejeitado sem tocar no save bom.
