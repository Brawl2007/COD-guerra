# Auditoria M02 — Secção I (PDF pp. 33–35) vs origin/gemini/m02-01-quinta (56e98cbf)

Âmbito: leitura estática. Não executei testes. Repositório não editado.
Estados: OK, PARCIAL, AUSENTE, DIVERGENTE, NÃO GARANTIDO.

| # | Item | Estado | Evidência (src/game/m02-01-simulation.js = sim; m02-acts-director.js = dir) |
|---|---|---|---|
| 1 | TR01–TR05 e cartelas | OK (estrutura) | `M02_TR_CARTELAS` em dir l.7-12. Aplicados em `transitionIdsApplied`: TR01 dir l.163, TR02 l.392, TR03 l.478, TR04+TR05 l.772-773. Texto não validado literalmente (PDF dá resumos). |
| 2 | Checkpoints cp_m02_a/b/c/d presentes | OK (presença) | a: sim l.363, 431, 1186; b: sim l.1232, 1238 (com `if !has`); c: dir l.401 (TR02); d: dir l.530. Testes: m02-02 l.241-270 (SAVE-01); m02-04-05 l.47, 95, 165; m02-03 l.71. |
| 3 | Momento de gravação dos checkpoints | PARCIAL | cp_a grava-se após o posto EA0 tomado (sim l.1180-1186); PDF I3 diz «C01 terminada, antes do contacto»: confirmar. cp_b tem dois pontos: l.1232 (fim «Quinta consolidada») e l.1238 (C03 sem defensores). PDF diz «C03 resolvida»; o primeiro ponto pode não coincidir. |
| 4 | Checkpoints fora do PDF | DIVERGENTE (menor) | `cp_m02_manual` (F5) e F9 com cadeia de fallback em src/m02/m02-01-main.js l.66-80. Checkpoints de teste `cp_pre_artillery`, `cp_post_artillery`, `cp_pre_tab` só existem nos testes. |
| 5 | Persistência e saves (área temporária, substituir só após validação, falha mantém anterior) | AUSENTE | `checkpoints` é um Map em memória (sim l.159). `saveCheckpoint` escreve diretamente (sim l.1351-1356). Sem localStorage nem ficheiro em src/game e src/m02 (grep vazio). Sem commit transacional. |
| 6 | Schema do snapshot | PARCIAL | `snapshot()` emite só `m02-01-bench-snapshot-v1` (sim l.1368). `validateM02Snapshot` aceita também `m02-02-snapshot-v2`, que não é emitido. Sem identificador de missão nem versão de importação (`campaignImportVersion`: 0 ocorrências). |
| 7 | Conteúdo mínimo do snapshot (I5) | PARCIAL | Presentes: clock, célula, jogador, arma, aliados, inimigos, portas/janelas/cercas, transitionIdsApplied, flags, objective, horizon, audiovisual, areaB/areaC, carriedBy (aliados e carroça). Em falta: seed e estado do gerador (sem `rng` no snapshot), eventos/diálogos consumidos (`dialogueConsumed`: 0), `sectorEvents` (0), relógio local/data narrativa além de `clock`. |
| 8 | Validação em fases (validar → reconstruir → verificar relações → ativar) | PARCIAL | `validateM02Snapshot` (sim l.58-142) cobre schema, clock, jogador, slices principais e carregadores duplicados (m02-04-05 l.109-113, SAVE-02). `restoreSnapshot` valida antes de mutar (sim l.1404-1406); m02-02 l.258-261 confirma que snapshot inválido não altera `player.x`. Não valida `flags` nem enums. Sem rollback se a restauração falhar a meio após a validação. |
| 9 | Restauro determinístico | NÃO GARANTIDO | `rng` não entra no snapshot nem é restaurado (0 ocorrências de `rng` em `snapshot`/`restoreSnapshot`). É consumido na dispersão de tiro (sim l.855-856) e em `weapon.shotDirection(..., () => this.rng.next())` (sim l.972). Após restauro, o tiro seguinte pode divergir. m02-06 l.276-306 restaura pre/post artillery e verifica só a cratera e `artilleryDetonated`. Nenhum teste compara a continuação após restauro. O teste O3 (m02-06 l.308+) cobre a semente, não o restauro. |
| 10 | Flags legadas I4 (presença) | OK | Inicializadas em sim l.336-345: m02.completed, axis, lis_status, malek_status, wierzba_status, supply_reached, corridor_held, pomar_wounded_marked, fired_on_wounded, last_group_survivors. |
| 11 | Domínios das flags I4 | DIVERGENTE | malek_status usa `down`/`shaken` (sim l.1156); PDF pede fit, wounded, evacuated, dead, missing. lis_status inicial é `'active'` (sim l.338); PDF diz «nulo durante missão». wierzba_status usa `down` (não listado no PDF). Não há validação de enum. |
| 12 | Lis: wounded_evacuated / wounded_walking / missing (I6) | OK (presença) | `assistLisInC11` e modos em dir l.624-656. Falas M03 fora do âmbito. |
| 13 | Ponte M02→M03 e envelope de campanha | PARCIAL | `exportCampaignResultToM03` (dir l.786-799), schema `cod-guerra-campaign-bridge-m02-to-m03-v1`, validado em m02-06 l.381. PDF pede coordenação com R4 e não atribuir número global. Não há importação M03 neste branch. |
| 14 | Reuso do runner/envelope M01 | DUPLICA | M02 não importa m01-acts.js, m01-area-sim.js nem ACT_SAVE_SCHEMA (git grep vazio). Usa `M02BenchSimulation` e schema próprio. Partilha só m01-player-physics.js e m01-navigation.js. M01 em HEAD: `ACT_SAVE_SCHEMA=3`, envelope `{schema,missionId,act,carry,actSave}`, despacho por schema e rejeição de chaves extra (src/game/m01-acts.js l.14, 91, 104). M02 não tem envelope nem carregamento a partir de texto. |

## Conclusões
- Checkpoints cp_m02_a..d e TR01–TR05: presentes e com teste unitário. Não validados em jogo.
- Persistência e envelope: ausentes em M02 e não reutilizam o envelope M01. Decisão de envelope é do Capitão (R4).
- Restauro: não bit-determinístico por falta de `rng` no snapshot. Risco para saves e replays.
- Alegação de «SAVE-01/02 PASS» em docs/m02/M02_HANDOFF.md não verificada por mim.

## Próximas ações sugeridas (não executadas)
1. Confirmar pontos de gravação de cp_a e cp_b contra a secção I3 do PDF.
2. Decidir se o M02 entra no envelope M01 (schema 3) ou mantém schema próprio (R4).
3. Incluir `rng` e flags/enums no snapshot e teste de replay após restauro, se M02 avançar.
