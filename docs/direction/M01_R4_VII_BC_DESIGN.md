# M01 — R4: desenho dos atos VII-b («Norte, durante o dia») e VII-c («Ordem ~17:00 e retirada»)

**Data:** 2026-11-04 · **Branch:** `claude/dreamy-ramanujan-6v62vr` @ `57ba50f3` · **Tipo:** só desenho, sem código, nenhum teste corrido.
**Base:** `M01_R4_EXPANSION_PLAN.md` (§1, §2, §3, §5, §6 WP-3/WP-4), `HISTORICAL_RESEARCH.md`, `SOURCE_CHECK.md`, `research/SOURCES.md`, `missions/m01-tczew/acts.json`,
`areas/np/act.json` e `layout.json`, `src/game/m01-acts.js`, `m01-area-sim.js`, `m01-blast.js`, `src/render/m01-lighting.js`, prova do VII-a (`docs/verification/m01-runtime/acts-inc1-2026-10-25/README.md`).
**Implementa-se sobre:** o condutor de atos (`M01ActRunner`) e `M01AreaSimulation` (área NP, fatia x −620…−220, z −1350…−1050), por esta ordem: INC-2 = VII-b, INC-3 = VII-c.

## 0. O que muda no jogo e o que não muda

| Muda (só com `acts.enabled` ou `?acts=1` / `?act=vii-b|vii-c`) | Não muda |
|---|---|
| Depois do cartão de fim do VII-a segue-se o cartão «Mais tarde…» e o VII-b na mesma fatia NP; depois o cartão «~17:00» e o VII-c (anoitecer, retirada) | Ato BW 04:30–07:05, `mission.json`, `map-layout.json`, saves de esquema 2, golden 20: **byte a byte** |
| O debrief passa para o fim do VII-c e ganha 2 parágrafos (§4) | Texto dos parágrafos `db_01…db_07` e `db_np_01`; regra «sem vitória estratégica» |
| Artilharia com efeito por raio na área NP (granadas de artilharia, sem calibre) | VII-a: `layout.json` da NP, `areas/np/act.json`, golden `m01-act-vii-a-gameplay-baseline.json` e o actSave do VII-a (`check: identical` é critério de aceitação) |
| Luz da tarde e do crepúsculo na área (keyframes próprios do ato, apresentação) | O renderer continua sem decidir nada; `acts.enabled=false` por omissão até aceitação humana |

## 1. Factos e lacunas (só o que está no repositório)

**Nenhum ficheiro de fonte está guardado no repositório**: não existe `research/sources/`; T03, T08, T16 e H01-PDF são resumos/registos em `research/SOURCES.md`,
`HISTORICAL_RESEARCH.md` e `SOURCE_CHECK.md`. H01-PDF foi lida no PR #10 mas **não guardada**. C01 é um cálculo (algoritmo NOAA) com resultados registados; o script não está no repositório.
Os URLs de §5 do plano **não foram lidos** neste desenho («não guardada»). Cito só o que já está registado com ID.

| # | Afirmação usada | Classe | Fonte / certeza | Onde entra |
|---|---|---|---|---|
| F1 | «Durante o dia», ataques vindos do norte (Pszczółki), SS-Heimwehr com apoio de artilharia, repelidos; **sem hora** | `DOCUMENTED` | T16, BAIXA (resumo) | VII-b cartão, fim, debrief |
| F2 | A guarnição repeliu ataques durante o dia e deixou Tczew à noite por ordem superior | `DOCUMENTED` | T03 (resumo; `HISTORICAL_RESEARCH.md` §9) | VII-b/VII-c debrief |
| F3 | Norte: «dois batalhões com artilharia, morteiros e armas AT, vinda de Pszczółki» (nota de coerência 2026-11-05: «dois batalhões» é número de HISTORICAL_RESEARCH.md; o VII-b mostra «ataques» sem esse número e a segunda posição está nas lacunas (`gaps`) de `h_npb_day_attacks`: o ecrã não afirma efetivos) | `DOCUMENTED` | BAIXA (`HISTORICAL_RESEARCH.md` tabela alemã) | Só contexto; nenhum número no ecrã |
| F4 | Posições de campo a norte/noroeste: 2.ª e 3.ª companhias, 2 pelotões de mtr, pelotão AT, morteiros, artilharia de infantaria | `DOCUMENTED` (composição); posições `RECONSTRUCTED` | T03 (MÉDIA), T08 | Flanco oeste do parapeito (VII-b) |
| F5 | Ordem por volta das **17:00** para deixar Tczew ao anoitecer rumo a Swarożyn–Starogard | `DOCUMENTED` | T03, MÉDIA (resumo) | Cartão «~17:00» |
| F6 | Retirada iniciada às 18:00 e concluída às 20:00 | `DOCUMENTED` | T03 (MÉDIA); `db_04` já diz «até às 20:00» com H01-PDF | VII-c fim, debrief |
| F7 | Pôr do sol 18:39; fim do crepúsculo civil 19:16 (CET) | `DOCUMENTED` (cálculo) | C01, ALTA | Luz do VII-c |
| F8 | Sol às 13:00 ≈ 42,1°/205°, 17:00 ≈ 13,5°/266°, 18:00 ≈ 4,7°/278°, 18:39 ≈ −0,9°/286°, 19:00 ≈ −3,8°/290°, 19:16 ≈ −6,0°/293° | `RECONSTRUCTED` (método C01 recalculado nesta sessão; reproduz 04:34 −3,2°, 06:10 10,6°, 07:05 18,6°/101° registados) | C01 (método) | Keyframes de luz; registar em `SOURCES.md` C01 ao implementar |
| R1 | Segunda posição no flanco oeste do mesmo parapeito, virada a noroeste | `RECONSTRUCTED` (de F4) | — | VII-b |
| G1 | Duas investidas no dia, cada uma precedida de fogo de artilharia; tempos, efetivos, impactos | `GAMEPLAY_DRAMATIZATION` | — (F1 não dá número nem horas) | VII-b |
| G2 | Maqueiros a evacuar feridos; caixa de munições; mensageiro com a ordem | `GAMEPLAY_DRAMATIZATION` (forma; a ordem é F5) | — | VII-b, VII-c |
| G3 | A secção de Zieliński sai como retaguarda, por lanços, ao crepúsculo (sem fogo da orla: ver «Desvios registados») | `GAMEPLAY_DRAMATIZATION` | — | VII-c |

**BLOQUEADO (sem fonte no repositório):** número, horas e setores dos ataques do dia; calibre, tipo e posição da artilharia alemã (nada de «10,5 cm», «7,5 cm» ou baterias);
baixas polacas ou alemãs; o que H01-PDF diz da tarde (só `db_04` registado; PDF não guardado); quem transmitiu a ordem das 17:00 e por onde; itinerário, ruas e ordem de marcha
da retirada (P4, sem mapa de 1939); localização do quartel (T30); qualquer contacto durante a retirada ou perseguição alemã; insígnias/nome da SS-Heimwehr no ecrã (D-2);
Bofors wz.36 funcional (WP-5, asset sem licença); fogo dos morteiros polacos como facto (T03 só dá composição); Lisewo (D-1, fora); Szpęgawa/Suchostrzygi (0 fontes).

## 2. VII-b — «Perímetro norte, durante o dia» (INC-2)

**Área:** a mesma fatia NP de 400 × 300 m, sem alterar `areas/np/layout.json` (o mundo do VII-a não muda). Destroço, crateras, parapeito x −520…−330 e ninho da ckm iguais.
Geometria nova (crateras de artilharia acumuladas, maca) vem do estado do ato, não do layout.
**Hora:** relógio interno `13:00:00` (só luz/som, `GAMEPLAY_DRAMATIZATION`); `clock.label` = `DURANTE O DIA` (nenhuma hora no ecrã). Duração alvo: **4–6 min** (VII-a mediu 128–213 s de combate).

**Encadeamento (carry):** VII-a `next` → `act_vii_b_north_day`. Herda dificuldade, munição, granadas, eventos BW e, novo, as flags `m01np.*` do VII-a. A linha é
reocupada (horas depois: o efetivo não passa, nenhum número inventado). A semente vem de `nextSeed` (padrão existente). Zieliński, Pawlak e Kowal presentes (no VII-a não morrem).

**Sequência:**
1. Cartão `cs_npb_entry` («Mais tarde…», 9 s, saltável) → **CP-I** no fim do cartão.
2. Objetivo `obj_npb_resupply` «Reabasteça-se e ocupe o flanco oeste do parapeito» (caixa de munições existente, `resupply`; marcador `west_post` ≈ (−505, −1159.2)).
3. **Barragem 1** (~40 s): aviso (fala «Artilharia! Ao chão!»), assobio 1,5 s antes de cada impacto, impactos na faixa z −1250…−1120; objetivo `obj_npb_take_cover`
   (agachado atrás do parapeito, `coverAt`). Um homem da linha fica ferido → «Maqueiro!» → dois maqueiros (fictícios) levam-no para sul, para fora da fatia.
4. **Investida 1**: reutiliza `stepEchelons` com faixas novas, a última a sair de noroeste para o flanco oeste. Repelida → **CP-I2**.
5. Pausa curta (≤ 30 s) com ckm a recarregar fita; **barragem 2** mais curta; **investida 2**; repelida → beat final → cartão `cs_npb_end` → transição para VII-c.

**Regras de ecrã:** nada de «1.º/2.º ataque», «vaga n.º», contagem de ataques nem de obuses. A linha de estado pode manter a contagem de jogo do VII-a («N na orla»),
que é retorno ao jogador e não história. Tropas «alemãs vindas do norte», sem insígnias. Jogador: como com as bombas da BW, **nunca morto nem ferido por artilharia**
(só atordoado, `CONCUSSION`), e nenhum impacto a menos de 30 m dele (`SAFE_IMPACT_M`); balas continuam a ferir pela tabela do nível.

**Textos (rascunho):**
- `cs_npb_entry`: «Mais tarde…» · «Perímetro norte · 1 de setembro de 1939, durante o dia» · «Os ataques vindos do norte continuaram, com apoio de artilharia (T16, certeza baixa) · quantos e a que horas: desconhecido» · «Posições, momentos, efetivos e o fogo representado: reconstrução e dramatização».
- `cs_npb_end`: «Ataques vindos do norte repelidos durante o dia» · «A guarnição manteve as posições até à ordem da tarde (T03)» · «Calibre e posição da artilharia alemã: desconhecidos».

**Esqueleto de dados** (`missions/m01-tczew/areas/np/act-vii-b.json`, mesmas chaves do VII-a mais as marcadas NOVO):
```json
{ "schemaVersion": 1, "id": "act_vii_b_north_day", "area": "np", "title": "VII-b · Perímetro norte, durante o dia",
  "classificationLegend": {}, "history": [{"id":"h_npb_day_attacks","sources":["T16","T03"],"classification":"DOCUMENTED","certainty":"BAIXA"}],
  "profile": {"phasePrefix":"NPB","flagPrefix":"m01npb","markerLabel":"Flanco oeste","entryCard":"cs_npb_entry"},          "//": "NOVO (F1)",
  "clock": {"battleClockStart":"13:00:00","label":"DURANTE O DIA","sun":{"source":"C01 (método)","keyframes":[{"clock":"13:00","altitudeDeg":42.1,"azimuthDeg":205}]}},
  "cards": {"entry":{"id":"cs_npb_entry","seconds":9,"skippable":true,"lines":[]},"end":{"id":"cs_npb_end","seconds":9,"skippable":true,"lines":[]}},
  "objectives": [{"id":"obj_npb_resupply"},{"id":"obj_npb_take_cover"},{"id":"obj_npb_hold"}],
  "checkpoints": [{"id":"cp_npb_i_dia","label":"CP-I","trigger":{"type":"sceneEnd","scene":"cs_npb_entry"}},
                  {"id":"cp_npb_i2_pausa","label":"CP-I2","trigger":{"type":"echelonBroken","echelon":0}}],              "//c": "trigger NOVO (F4)",
  "barrages": [{"id":"brg_npb_1","from":"obj_npb_resupply","durationSec":40,"impacts":10,"intervalSec":[2.5,5],
                "band":{"minX":-560,"maxX":-320,"minZ":-1250,"maxZ":-1120},"warnSec":1.5,"spec":"SHELL_BLAST"},
               {"id":"brg_npb_2","from":{"echelonBroken":0,"afterSec":20},"durationSec":20,"impacts":6}],              "//b": "NOVO (F3)",
  "medics": {"ids":["np_maqueiro_0","np_maqueiro_1"],"from":[-425,-1062],"exit":[-425,-1052],"pace":2.2,"maxCasualties":2},  "//m": "NOVO (F5)",
  "groups": [{"id":"grp_np_line"},{"id":"grp_np_section"},{"id":"grp_np_ckm"},{"id":"grp_np_de","assault":{"echelons":[{},{}]}}],
  "callouts": [{"id":"npb_001","on":"barrage_warn"},{"id":"npb_002","on":"medic_call"}], "resupply": {"reachM":2.2,"reserveTo":40},
  "debrief": {"insertAfter":"db_np_01","paragraphs":[{"id":"db_npb_01","enabled":true,"sources":["T16","T03"],"text":"(§4)"}]} }
```

## 3. VII-c — «Ordem ~17:00 e retirada ao anoitecer» (INC-3)

**Área:** a mesma fatia NP. **Retirada para dentro dos limites existentes**: do parapeito (z −1159) para sul, até uma faixa de saída genérica no canto sudoeste
(x −600…−560, z −1068…−1056, dentro de `playable` z ≤ −1050). O canto sudoeste só indica a direção geral de Starogard (F5), **não é rua nem caminho real** (P4 bloqueado).
O ato termina ao entrar na faixa, antes de qualquer contagem de saída de limites. Duração alvo: **3–5 min**.

**Hora e luz:** cartão «~17:00» (F5, única hora no ecrã, com «~»). Depois, cartão curto «Ao anoitecer» e jogo com relógio interno a partir de `19:00:00`
(Sol −3,8°, azimute ≈ 290°, F8; dentro da janela 18:00–20:00 de F6; a escolha das 19:00 é `GAMEPLAY_DRAMATIZATION`). `clock.label` = `ANOITECER`.
A −3,8° o modelo de luz já tem a âncora `blue-hour` (−3,7°); só falta o **azimute a oeste**: keyframes próprios do ato (F8). Se o ato passar das 19:16 (−6°),
não há âncora noturna: limitar a duração ou acrescentar uma âncora `night` (fora do mínimo). Legibilidade: clarões de boca e silhuetas contra o céu a oeste; sem lanternas.

**Sequência:**
1. Cartão `cs_npc_order` (9 s): «Por volta das 17:00» · «Ordem do comandante do batalhão: deixar Tczew ao anoitecer, rumo a Swarożyn–Starogard (T03, resumo, certeza média)» ·
   «Quem a transmitiu, por onde e a ordem de marcha: desconhecidos» · «A retaguarda da secção e o caminho representado: dramatização».
   (Personagens históricos fora de cena; nenhuma fala de Janik/Juchtman.)
2. **CP-J** no fim dos cartões. Um mensageiro (fictício) chega ao posto de comando (−425, −1110) e fala a Zieliński; fala de Zieliński à secção.
3. A linha `grp_np_line` sai por lanços (equipas), para sul, até à faixa de saída; a ckm desmonta e sai com ela. A secção fica como **retaguarda** (objetivo
   «Cubra a saída da linha»): ~~fogo esparso da orla (overwatch existente, MG34) contra quem se mostrar~~ (desvio: ver abaixo, não construído). Uma sonda alemã de poucos homens (opção `probe`, `GAMEPLAY_DRAMATIZATION`,
   **desligada por omissão** até decisão do proprietário, D-5).
4. Quando a linha sai: **CP-K**; a secção recua por lanços (`makeSquadPlan`, lanços já usados na BW); o jogador acompanha. Ficar para trás > `stallSec` → chamada; não falha.
5. Entrada na faixa de saída → beat final → `cs_npc_end` («O 2.º Batalhão deixou Tczew entre as 18:00 e as 20:00 (T03)» · «Pôr do sol às 18:39 (C01)» ·
   «Itinerário e ruas: desconhecidos (sem mapa de 1939)») → **debrief**.

**Esqueleto** (`areas/np/act-vii-c.json`): como VII-b, sem `barrages`/`medics`, com
```json
{ "id":"act_vii_c_withdrawal","clock":{"battleClockStart":"19:00:00","label":"ANOITECER","sun":{"source":"C01 (método)","keyframes":[
    {"clock":"18:39","altitudeDeg":-0.9,"azimuthDeg":286},{"clock":"19:00","altitudeDeg":-3.8,"azimuthDeg":290},{"clock":"19:16","altitudeDeg":-6.0,"azimuthDeg":293}]}},
  "cards":{"order":{"id":"cs_npc_order","lines":[]},"entry":{"id":"cs_npc_dusk","lines":["Ao anoitecer"]},"end":{"id":"cs_npc_end","lines":[]}},
  "checkpoints":[{"id":"cp_npc_j_ordem","label":"CP-J","trigger":{"type":"sceneEnd","scene":"cs_npc_dusk"}},
                 {"id":"cp_npc_k_retirada","label":"CP-K","trigger":{"type":"flag","flag":"m01npc.lineOut"}}],
  "messenger":{"id":"np_mensageiro","from":[-560,-1056],"to":[-425,-1110],"pace":4.5},
  "withdrawal":{"exit":{"minX":-600,"maxX":-560,"minZ":-1068,"maxZ":-1056},"lineTeams":[["pl_np_0","pl_np_1"],["pl_np_2","pl_np_3","pl_np_4"],["pl_np_5","pl_np_6"]],
                "boundPosts":[[-470,-1120],[-540,-1085],[-580,-1062]],"sectionMoves":[],"probe":{"enabled":false}},
  "debrief":{"insertAfter":"db_04","paragraphs":[{"id":"db_npc_01","enabled":true,"sources":["T03","C01"],"text":"(§4)"}]} }
```

## 4. Debrief (parágrafos novos; os existentes ficam intactos)

Ordem final: `db_01 … db_03`, `db_np_01` (VII-a), **`db_npb_01`**, `db_04`, **`db_npc_01`**, `db_05 … db_07`.
- `db_npb_01` (T16, T03): «Durante o dia, novos ataques vindos do norte, com apoio de artilharia, foram repelidos. As fontes do repositório não dizem quantos foram,
  a que horas, com que armas nem com que perdas; a segunda posição, as barragens, os maqueiros e as duas investidas são reconstrução para o jogo.»
- `db_npc_01` (T03, C01): «Por volta das 17:00 chegou a ordem de deixar Tczew ao anoitecer, rumo a Swarożyn–Starogard; o 2.º Batalhão retirou-se entre as 18:00 e as 20:00.
  O Sol pôs-se às 18:39. Quem transmitiu a ordem, o caminho e a ordem de marcha não estão confirmados; a retaguarda da secção é reconstrução.»
- Nada sobre ocupação, reféns ou quartel (§8.4; T30 fora da M01). `db_04` não é reescrito (diz «até às 20:00», H01-PDF; coerente com T03).

## 5. Funcionalidades novas (lista mínima para o implementador)

| # | Funcionalidade | Onde | Tamanho | Guarda de não-regressão |
|---|---|---|---|---|
| F1 | **Perfil de ato**: tirar do código de `M01AreaSimulation` os ids fixos do VII-a (`obj_np_*`, `cs_np_*`, fases `NP_*`, flags `m01np.*`, `grp_np_*`, rótulo «Parapeito norte», etiquetas `M01 VII-a`) para `act.profile`/dados, com omissões = valores atuais; `AREA_ACTS` com 3 entradas | `m01-area-sim.js` | M (~150–250 linhas) | Golden VII-a `check: identical`; actSave VII-a igual |
| F2 | **Cadeia de atos**: `acts.json` (`order`, `entries`, VII-a `next`), `ACT_ALIASES` `vii-b`/`vii-c`; `carryFrom` área→área conserva as flags `m01np*`; `debriefWith` acumula os parágrafos de todos os atos de área jogados | `acts.json`, `m01-acts.js`, `m01-area-sim.js` | S (~60–100) | Testes `m01-acts` atualizados de forma intencional (VII-a deixa de terminar no debrief) |
| F3 | **Artilharia por raio**: `SHELL_BLAST` (valores de jogo, ex.: letal 4 m, ferido 9 m, abalado 20 m) e `blastOutcome({...,spec=BOMB_BLAST})`; `stepBarrage` com calendário dos dados, jitter de stream próprio (nunca o principal), ponto seguro ≥ 30 m do jogador, `cast` protegido, cratera em `sectors.damage`, evento `m01-blast` `kind:'shell'` (já existe em `BLAST_KINDS`), atordoamento `CONCUSSION` | `m01-blast.js`, `m01-area-sim.js` | M (~150–200 + testes) | `blastOutcome` sem `spec` ≡ atual (BW golden 20 idêntico); cobertura reduz efeito (teste) |
| F4 | **Checkpoint a meio do ato** com `trigger` de dados (`sceneEnd`, `echelonBroken`, `flag`) | `m01-area-sim.js` | S (~40) | VII-a mantém só CP-E |
| F5 | **Maqueiros**: dois NPC que vão ao homem da linha ferido e o levam para fora pela borda sul (inativos depois); máx. 2 por ato | `m01-area-sim.js` (+ animação de transporte existente se reutilizável) | S–M (~100–150) | Sem transporte pelo jogador (extração do SP-08 da BW = L, adiada) |
| F6 | **Retirada por lanços**: equipas da linha via `makeSquadPlan`; ckm desmonta; secção como retaguarda; fim por faixa de saída; sonda opcional desligada | `m01-area-sim.js`, `m01-act-factories.js` | M (~150–200) | 0 atravessamentos; faixa dentro de `playable` |
| F7 | **Cartão duplo + mensageiro**: `cards.order` antes de `entry`; NPC com caminho e fala | `m01-area-sim.js`, `m01-hud.js` (cartão existente) | S (~50) | — |
| F8 | **Sol por ato**: `act.clock.sun.keyframes` substitui `world.layout.sun` só nesse ato (apresentação) | `m01-area-world.js` | S (~30 + teste) | VII-a e BW: `lightingDiagnostics` iguais |
| F9 | **Guardas de texto**: nos cartões, falas e estado do VII-b/VII-c, nenhuma hora exata (`\d\d:\d\d:\d\d`), só «~17:00» no cartão de ordem; nenhum «n.º», contagem de ataques, calibre, insígnia, `SS`, nome de oficial histórico | `tests/m01-act-vii-b.test.js`, `-vii-c` | S | Espelha a guarda do VII-a |

**Saves:** envelope de esquema 3 inalterado; `actSave` mantém `AREA_SAVE_SCHEMA=2` se o actSave do VII-a não mudar. Os registos novos (`barrage`, `medics`, `withdrawal`) são
**exigidos** pelo validador quando o plano do ato os tem e **rejeitados** quando não os tem. Teste: save a meio de barragem e de retirada; save adulterado → mensagem.

**Testes/golden:** `tools/verification/m01-act-vii-b-golden.mjs` e `-vii-c-golden.mjs` (cópia do do VII-a), fixtures `tests/fixtures/m01-act-vii-b-gameplay-baseline.json`
e `-vii-c-…`, rotas passiva e ativa; testes unitários de F3 (raio/cobertura/postura/spec padrão) e F6; Playwright `?act=vii-b` / `?act=vii-c` (cartão, CP, debrief no fim).

## 6. Incrementos e aceitação

**INC-2 = VII-b** (F1, F2, F3, F4, F5, F9 + F8 só com keyframe das 13:00). Branch própria a partir da candidata (topo de `M01_INTEGRATION_LEDGER.md`), merge `--no-ff`.
- Determinista: golden BW (emenda 20) e golden VII-a `identical`; golden VII-b novo; 0 atravessamentos; jogador nunca morto por artilharia nem impacto < 30 m; homem abrigado
  sobrevive onde um de pé morre (teste); save/restore em CP-I, CP-I2 e a meio da barragem; rota BW → VII-a → VII-b sem falhas, `carry` válido; guardas F9 verdes.
- Humano (playtest, nada passa a VALIDADO sem ele): legibilidade do aviso de artilharia, variedade sem ciclos, duração 4–6 min.

**INC-3 = VII-c** (F6, F7, F8 completo + debrief final).
- Determinista: goldens BW, VII-a, VII-b `identical`; golden VII-c; luz: `sunState` às 19:00 dá −3,8°/290° e a fase `blue-hour`; save a meio da retirada; fim pela faixa
  de saída sem falha de limites; debrief na ordem de §4 com `db_01…db_07` iguais.
- Humano: legibilidade ao crepúsculo, clareza da ordem e do sentido da saída.

**Continua bloqueado / à espera do proprietário:** D-1 Lisewo (fora); D-2 insígnias; D-3 duração total (`mission.json targetDurationMin` não se toca); **D-5 (novo)**: sonda alemã
na retirada sem fonte (ligar ou não); ruas reais, quartel e itinerário (mapa de 1939, P4); Bofors e morteiros polacos (WP-5); calibres da artilharia alemã; o conteúdo de
H01-PDF/T03/T08/T16 sobre a tarde até os ficheiros estarem em `research/sources/` — quando entrarem, rever §1 e os textos dos cartões antes de ligar o interruptor.

## 7. Incertezas deste desenho
- Não se mediu o custo de F1: se a generalização mexer no traço do VII-a, VII-b passa a subclasse em vez de dados (decidir pelo golden).
- Valores de `SHELL_BLAST`, número de impactos e durações são de jogo, a afinar no playtest.
- F8 assume que `applyLighting` só lê `sim.world.layout.sun`; confirmado por leitura, não por teste.
- As letras CP-I/J/K seguem o plano (CP-F/G/H ficam reservadas para checkpoints futuros do VII-a, que hoje só tem CP-E).

## Desvios registados (auditoria de coerência 2026-11-05)

- **VII-c sem «fogo esparso da orla»:** o desenho (G3 e passo 3) previa fogo da orla contra quem se mostrasse. Foi retirado com a sonda alemã (D-5, BLOQUEADO): sem alemães no ato não há a quem disparar, e a ckm fica no ninho na pose de abandono. O ato fica sem inimigos; a secção só recua. Estado: desvio aceite até decisão do proprietário sobre D-5.
- **Debrief do VII-c depois de `db_npb_01`:** `db_npc_01` (ordem das ~17:00, retirada 18:00–20:00) passou de `insertAfter: db_04` para `db_npb_01`. `db_04` diz que o batalhão já tinha deixado Tczew até às 20:00, o que punha a ordem das 17:00 depois do desfecho; assim a ordem e a retirada vêm depois dos ataques do dia (`db_npb_01`) e a cadeia VII-a, VII-b, VII-c lê-se por ordem de tempo.
- **Efetivo da linha no VII-c:** seis fuzileiros e a ckm (pl_np_3 foi levado ferido pelos maqueiros no VII-b).
- **Secção no posto de comando:** o VII-c começa com a secção no posto de comando, embora o cartão de fim do VII-b diga que a guarnição manteve as posições: dramatização, anotada nos dados (`grp_np_section.note`).
- **Papel de Pawlak:** `MESSENGER` em vez de `RADIO_OPERATOR` nos elencos de VII-a/b/c.
