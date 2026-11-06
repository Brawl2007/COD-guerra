# M01 — Auditoria de fidelidade histórica V-1 (2026-11-06)

**Base:** `24fa571f` (plano aprovado `docs/direction/M01_VIBE_FIDELITY_PLAN.md`, secções «Princípio … 80 % fiel» e «V-1»).
**Branch:** `v-1-fidelity`. **Tipo:** só medição. Não muda nada no jogo.

## O que muda e o que não muda

| Muda | Não muda |
|---|---|
| Novo `missions/m01-tczew/history-context.json`, com 240 entradas classificadas. | `mission.json`, `areas/np/*.json`, `acts.json`, a simulação, o renderer e todos os goldens e os seus `inputsSha256`. |
| Novo `tools/verification/m01-fidelity-audit.mjs`, que valida e calcula a fidelidade (`--json`, `--measure`). | Nenhuma classificação existente foi alterada nos dados. As contradições ficam só sinalizadas (abaixo). |
| Novo `tools/verification/m01-fidelity-measure.mjs`, que mede os pesos nas rotas de controlo. Só lê o estado. | O jogo continua igual, byte a byte: nenhum ficheiro carregado pelo jogo foi tocado. |
| Novo `tests/m01-fidelity.test.js` (esquema, refs, cobertura e limiar). | — |

## Método

1. **Uma entrada por elemento**, com os campos `id`, `kind`, `act`, `layer`, `refs`, `classification`, `sources`, `certainty`, `playWeightSec`, `weightEstimated`, `weightBasis` e `note`. Há ainda `conflict` quando os dados e os documentos discordam.
   - **Cobertura obrigatória (o teste falha se faltar alguma coisa):** todos os eventos, objetivos, grupos, elenco, cenas, segmentos do relógio, setores, as 192 falas e as *callouts* da `mission.json`. Nas áreas, os eventos, objetivos, grupos, elenco, cartões, notas `history`, *callouts*, barragens e parágrafos do debrief.
   - **Falas:** classificadas por regra e por categoria. As que relatam um facto com fonte são RECONSTRUCTED. As dos sapadores, da ckm e da voz do pelotão leste herdam a classe do seu grupo. As ordens e os gritos táticos da secção fictícia são GAMEPLAY_DRAMATIZATION. Cada uma das 192 está numa só categoria.
2. **Classificação:** é reutilizada dos dados (`certainty` dos eventos do Ato I e `classification` dos atos VII).
   - Os objetivos do Ato I não tinham classe. Herdam a do evento a que respondem. O papel da secção segue `mission.json` → `historicalCertainty.summary`: «Personagens e ações da secção: GAMEPLAY_DRAMATIZATION».
   - **Classes mistas** dos dados, do tipo «DOCUMENTED (facto) / GAMEPLAY_DRAMATIZATION (papel do jogador)», dão duas entradas, `#facto` e `#jogo`, com metade do peso cada.
3. **Peso = segundos reais vividos na rota de controlo**, com ticks de 50 ms (`m01-fidelity-measure.mjs`, ~30 s de execução). As rotas são:
   - Ato I: `route(19390901)`, que é a rota do golden de jogo. Dura 1278 s.
   - VII-a: `actRoute` em modo *active*. Dura 201 s.
   - VII-b: `actBRoute` em modo *active*. Dura 238 s.
   - VII-c: `actCRoute` em modo *prompt*. Dura 189 s.

   Regras de peso:
   - **Eventos:** pesam min(30 s, tempo até ao evento seguinte).
   - **Objetivos:** contam os segundos em que estão ativos.
   - **Grupos:** contam os segundos com algum membro ativo e vivo.
   - **Falas:** contam os segundos de legenda.
   - **Vagas das áreas:** usam os tempos dos goldens dos atos.
   - **Pesos estimados** (`weightEstimated:true`):
     - as cenas e os cartões que a rota salta (`cs_m01_intro` 75 s, `cs_m01_roll_call` 110 s, cartões 6–9 s) entram com a duração que está nos dados;
     - os parágrafos do debrief entram com o tempo de leitura, a 3 palavras/s.
4. **Fatores de camada:** ação, falas e texto contam ×1. Presença (grupos, veículos, setores) e mostradores (relógio, rótulos) contam ×0,25, porque acompanham o ato inteiro mas não são o foco. A ferramenta mostra também o valor sem fatores.
   - Fidelidade = Σ peso·fator (DOCUMENTED + RECONSTRUCTED) / Σ peso·fator.

Comandos que corri (resultados reais):

```
node --test tests/m01-fidelity.test.js     # 14 testes: 9 pass, 0 fail, 5 todo
node tools/verification/m01-fidelity-audit.mjs        # validação ok, cobertura completa
node --test tests/m01-locomotive.test.js tests/m01-panzerzug.test.js tests/m01-soldier-visual-variation.test.js tests/assets-manifests.test.js   # 25 pass
```

## Fidelidade por ato (medida, não ajustada)

| Ato | Fidelidade | Sem fatores | Papel do jogador como tarefa reconstruída (sensibilidade) | ≥ 80 % |
|---|---|---|---|---|
| Ato I (04:30–07:05) | **64,6 %** | 72,7 % | 71,7 % | não |
| VII-a, norte, manhã | **46,1 %** | 56,3 % | 56,1 % | não |
| VII-b, norte, durante o dia | **40,7 %** | 52,4 % | 48,5 % | não |
| VII-c, ordem e retirada | **38,5 %** | 44,8 % | 46,1 % | não |
| **Total** | **59,2 %** | 68,7 % | 66,7 % | não |

Nenhum ato chega a 80 %. Em `tests/m01-fidelity.test.js` as cinco asserções do limiar estão como `todo`, com o valor medido. Um teste à parte confirma esse valor, para que qualquer mudança nos dados apareça. Não forcei nenhum dado.

Fidelidade por camada:

| Ato | Ação | Falas | Presença | Mostradores | Texto |
|---|---|---|---|---|---|
| Ato I | 40,6 % | 34,8 % | 75,3 % | 96,3 % | 91,8 % |
| VII-a | 27,7 % | 39,7 % | 66,8 % | 54,1 % | 100 % |
| VII-b | 22,9 % | 32,9 % | 63,4 % | 53,5 % | 100 % |
| VII-c | 22,6 % | 41,3 % | 47,6 % | 55,6 % | 100 % |

O que o jogador **faz** (camada de ação) é a parte menos fiel. Os cenários, as horas, os cartões e o debrief estão perto da fonte. O texto dos cartões e do debrief é honesto, mas o que se joga entre eles é sobretudo do jogo.

## Dramatizações por peso (segundos ponderados)

| # | Entrada | Ato | Peso | Nota |
|---|---|---|---|---|
| 1 | `obj_m01_rescue_bak` | I | 390,7 | Objetivo opcional no HUD durante toda a retirada (06:00 → 06:14). A rota não o cumpre: é Dudek quem recolhe Bąk. |
| 2 | `yard_life` | I | 319,5 | Figurantes e tarefas do pátio da estação (classe dos dados). Estão presentes o ato inteiro. |
| 3 | `obj_m01_cover_withdrawal#jogo` | I | 196,3 | O papel de Wrona durante a retirada do pelotão leste, que é documentada. |
| 4 | `grp_squad#jogo`, `grp_sappers#jogo`, `grp_railway_workers#jogo` | I | 159,8 cada | São homens com nome e destino fictícios. |
| 5 | `dlg_m01_section_combat` | I | 155,1 | Ordens e gritos táticos da secção. |
| 6 | `obj_m01_hold_corridor#jogo` | I | 128,1 | Contagem 12–18 e escolta de Dudek (SP-08). |
| 7 | `grp_east_platoon#jogo`, `grp_de_east#jogo` | I | 127,7 cada | Efetivos 24 e 40, que são números do jogo (P8; «valor de gameplay»). |
| 8 | `cs_m01_roll_call` | I | 110 (estimado) | Chamada no abrigo. |
| 9 | `obj_npc_cover` | VII-c | 101,4 | Cobrir uma saída sem contacto (D-5: não há inimigos). |
| 10 | `wave2_act_vii_a_north` | VII-a | 99,9 | Segunda vaga de 16 + 2 homens. Nenhuma fonte dá vagas. |
| 11 | `obj_np_hold_north#jogo` | VII-a | 89,3 | O papel do jogador. |
| 12 | `obj_npb_hold#jogo` | VII-b | 84,6 | O papel do jogador. |
| 13 | `wave2_act_vii_b_north_day` | VII-b | 68,4 | Segunda investida. |
| 14 | `obj_npb_take_cover` + `brg_npb_1` + `brg_npb_2` | VII-b | 56 + 46 + 20 | As barragens não têm fonte que mencione artilharia (ver contradição 9). |
| 15 | `lull_*` (pausas entre vagas) | VII-a / VII-b | 42,9 / 45,2 | — |

A lista completa sai com `node tools/verification/m01-fidelity-audit.mjs --json`, no campo `dramatizations`.

## Contradições encontradas (sinalizadas em `conflict`, sem mexer nos dados)

1. **`evt_m01_cable_cut`.** HISTORICAL_RESEARCH §3.1 marca o reparo como DOCUMENTED (T12). Os dados, SOURCE_CHECK §3.3 e `db_01` dizem RECONSTRUCTED, «versão disputada».
2. **`evt_m01_order_demolish` 05:30.** HISTORICAL_RESEARCH §3.1 marca-o como DOCUMENTED (T01/T09). Os dados dizem RECONSTRUCTED. SOURCE_CHECK P1 regista que H01-PDF situa a decisão às ~06:00.
3. **`evt_m01_panzerzug_arrives`.** HISTORICAL_RESEARCH §5 dá a existência como DOCUMENTED. Os dados dizem RECONSTRUCTED, porque a hora 04:52 é do jogo.
4. **`evt_m01_north_contact_distant` (05:50).** É GAMEPLAY_DRAMATIZATION, mas cita T03/T16. **`evt_m01_railway_worker_report`** é GAMEPLAY_DRAMATIZATION e cita T13.
5. **`evt_m01_debrief`.** Cita T03/T09, mas os parágrafos citam H01-PDF/H02/T23.
6. **`westGarrison`.** Tem `presence` = RECONSTRUCTED e `certainty` = GAMEPLAY_DRAMATIZATION: o campo de certeza leva um valor de classe.
7. **`dlg_m01_037` «Perderam uma metralhadora».** Não tem fonte no repositório.
8. **VII-a/VII-b `grp_np_ckm`.** A classe cita «metralhadoras repelem a infantaria, T08» como DOCUMENTED. Mas `grp_np_de.echelonsNote` e `db_np_01` dizem que «metralhadoras é dramatização». O resumo de T08 em SOURCES.md não fala de metralhadoras; HISTORICAL_RESEARCH §3.1 fala.
9. **VII-b: «apoio de artilharia (T16)».** Aparece no cartão `cs_npb_entry`, em `h_npb_day_attacks` e em `evt_npb_wave`. Mas o resumo de T16 em SOURCES.md diz apenas «Ataque vindo do norte (Pszczółki), repelido», sem artilharia nem «durante o dia». A própria nota de `brg_npb_1` admite isto. Nesta auditoria o cartão desce para RECONSTRUCTED.
10. **`db_np_01`, `db_npb_01` e `db_npc_01`.** Chamam «reconstrução para o jogo» ao que os dados classificam como GAMEPLAY_DRAMATIZATION: as vagas, a pausa, as barragens, os maqueiros, o mensageiro e a retaguarda. O debrief subestima a dramatização perante o jogador.
11. **Tensão com a regra «nada de números inventados no ecrã».** O estado do HUD do VII-b mostra «Linha norte · 16 atacantes no campo». A contagem 12–18 do corredor do Ato I também é dita ao jogador.
12. **Método.** O plano define RECONSTRUCTED como «tarefas plausíveis». Os dados (`historicalCertainty.summary`) põem as ações da secção em GAMEPLAY_DRAMATIZATION. Esta auditoria seguiu os dados. A linha de sensibilidade mostra quanto vale a outra leitura: de +7 a +10 pontos por ato, insuficiente sozinha.

## Propostas (o proprietário decide caso a caso; nada foi aplicado)

O ganho de cada proposta foi calculado sobre `history-context.json` com a mesma ferramenta, sem correr o jogo.

### Ato I (64,6 %)

- **A1.** Mostrar `obj_m01_rescue_bak` só enquanto Bąk está ao alcance, e retirá-lo quando Dudek o recolhe (~30 s). Ganho: +3,1 → 67,7 %. Não precisa de fonte.
- **A2.** Trocar a «vida do pátio» por tarefas reais da defesa e dos ferroviários: munições, cabos, feridos, ligação a pé, como já prevê o plano. Ganho: +4,1 → 68,7 %.
  - Fontes: T07, T08 e T23 lidos por inteiro (ferroviários na estação), e H01-PDF pp. 127–134.
- **A3.** Decisão do proprietário: as tarefas do jogador ligadas a um facto (reparo, retirada, demolições) contam como «tarefa plausível» RECONSTRUCTED, como diz o plano? Ganho: +7,1 → 71,7 %.
- **A4.** Reescrever as falas táticas da secção para relatarem factos: o comboio, os aviões sobre os cabos, a ordem, os portões fechados. Ganho: +2,0 → 66,6 %. Fontes: T08, T12, H01-PDF.
- **A1 + A2 + A3 + A4 juntas: 81,6 %.**
- **A5.** Corrigir as contradições 1–7 nos dados, com uma emenda da `mission.json` e do golden. Por exemplo, decidir 05:30 ou ~06:00 para a ordem só depois de ter H01-PDF pp. 132–134 à mão.

### VII-a (46,1 %)

- **B1.** Uma só vaga, ancorada em T08: uma companhia com veículos blindados, um veículo destruído por canhão AT, a infantaria detida. Retirar a pausa e a 2.ª vaga. Ganho: +11,0 → 57,1 %.
  - Faltam ainda o T08 completo (efetivo, papel das metralhadoras, sítio do canhão) e o mapa de 1939 (P4/P9).
- **B4.** Reancorar a luta no relato T08 completo: se T08 confirmar as metralhadoras, a ckm passa de facto a DOCUMENTED. Corrigir também o debrief (contradição 10).

### VII-b (40,7 %)

- **B2.** Uma só investida e uma só barragem. Ganho: +7,3 → 48,0 %.
  - **Sem T16 lido não há base para «artilharia» nem para «durante o dia»** (contradição 9). Se T16 não confirmar a artilharia, as barragens saem, ou ficam assumidas como dramatização no cartão.
  - Alternativa a considerar: fundir o VII-b no VII-a até haver fonte.

### VII-c (38,5 %)

- **B3.** Retirar `obj_npc_cover`, que é cobrir uma saída sem contacto, e trocar o mensageiro pelo cartão da ordem das ~17:00 (T03). Ganho: +11,3 → 49,8 %.
  - Com T03 completo, o caminho e a ordem de marcha podem passar a RECONSTRUCTED.

### Teto e conclusão

- **Teto com tudo o que está acima** (A1–A4, B1–B3 e o papel do jogador como tarefa): Ato I 81,6 %, VII-a 69,6 %, VII-b 57,2 %, VII-c 59,6 %, total 77,4 %.
- Só passam os 80 % nos atos VII se a secção, a linha, os alemães e as falas do combate também passarem a reconstrução com fonte. Nesse cenário ficaria VII-a 91,9 %, VII-b 76,9 %, VII-c 82,7 %, total 81,9 %, o que exige T03, T08 e T16 completos e o mapa de 1939.
- **Conclusão:** os atos VII não chegam a 80 % só com cortes. Precisam das fontes.

## Fontes em falta e o que cada uma desbloqueia

| Fonte | Estado | Desbloqueia |
|---|---|---|
| **H01-PDF** (Kłodziński, *Wojna i Pamięć* 3/2021, pp. 120–152) | Lida no PR #10, **não guardada** no repositório; muzeum1939.pl não abre nesta cloud. | Ordem às 05:30 ou ~06:00 (contradição 2). Reparo dos cabos (contradição 1, p. 127 e seguintes). Pelotão leste e perdas (pp. 132–133, P8). Artilharia contra os acessos (p. 133, P6). Demolições (p. 134, P13). Citações de página nos cartões V0. |
| **T03** (*2 Batalion Strzelców*, wiki pl) | Só resumo. | Posições a norte e noroeste, efetivos das companhias, ordem das ~17:00, retirada 18:00–20:00. Base para reancorar o VII-c e a linha do VII-a/VII-b. |
| **T08** (Konflikty.pl) | Só resumo. | Ataque das ~07:00: companhia, veículos, canhão AT e se as metralhadoras detiveram a infantaria (contradição 8). Luta nos portões de Lisewo. Comboio 963. Base para a vaga única do VII-a (B1/B4). |
| **T16** (SS-Heimwehr Danzig, wiki en) | Só resumo. | Se houve ataques «durante o dia» e com artilharia (contradição 9). Sem T16 o VII-b não tem base. |
| **Mapa de Tczew de 1939** (Messtischblatt 1:25 000 ou WIG 1:100 000, ver SOURCES.md) | Não identificado com URL. | P4 (estação, aterro, quartel, ruas), P9 (sítio do ataque das 07:00), P12 (posto de disparo), trincheiras do perímetro norte. Passa as posições de «reconstrução sem mapa» a RECONSTRUCTED com fonte. |

**Pedido ao proprietário:** fornecer os PDFs (H01-PDF; T03, T08 e T16 guardados em PDF ou HTML), ou autorizar `muzeum1939.pl` e `wikipedia.org` nas definições de rede do ambiente. Até lá, o que depende destas fontes fica BLOQUEADO e não entra como facto.

## Limites desta auditoria

- **Teste de estado, não playtest.** Os pesos vêm de uma rota automática. Um jogador humano vê as cenas saltadas e demora mais nos objetivos.
- **Convenções arbitrárias, mas visíveis e ajustáveis em `weighting`:**
  - os fatores de camada;
  - a divisão 50/50 das classes mistas;
  - o limite de 30 s por evento.
- **Gerador fora do repositório.** O `history-context.json` foi gerado a partir das medições e das regras acima por um script de trabalho que não está no repositório. Daqui em diante, o ficheiro é a fonte e edita-se à mão.
- **`--measure`** volta a correr as rotas e mostra a duração de cada uma. Ainda não compara os pesos um a um.
