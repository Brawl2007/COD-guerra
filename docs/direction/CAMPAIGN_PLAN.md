# Plano persistente das 30 missões

Este é o plano de execução do Captain. **Não duplica** os planos detalhados: indexa-os, ordena-os e diz
o que é preciso para cada missão avançar de estado.

| Plano detalhado | Onde | Estado |
|---|---|---|
| Especificação do produto | `docs/PROMPT_MESTRE.txt`, `PROJECT_SPEC.md`, `STORY_BIBLE.md` | Canónico |
| Lista das 30 missões | `missions/campaign-plan.json` | Canónico. Todas `PLANEJADA` no ficheiro; o M01 real é PROTÓTIPO JOGÁVEL. |
| Roadmap técnico do M01 (TOP 20 problemas, T00–T52, ondas 0–3) | `docs/M01_FINAL_ROADMAP.md` | Canónico para o M01. O estado por tarefa está em `M01_TASK_STATUS.md`. |
| Dossiês M02–M30 (12 secções), mapas, bíblia, cronologia, continuidade, roadmap técnico S1–S17 e lotes | PR #58, `codex/m02-m30-full-creative-production-v1` @ `7849522`, `docs/campaign-production/` | **Proposta**, fora do trunk. Ler com `git show 7849522:docs/campaign-production/<f>`. |
| Narrativa V3 das 30 missões | PR #44 @ `3fc04b2` | Proposta |
| Direção criativa do M01 | PR #56 @ `03b61a3` | Proposta |

## 1. Direção do jogo (resumo vinculativo)

FPS da Segunda Guerra Mundial, de 1939 a 1945, em 30 missões. As referências de **qualidade** são
CoD1, CoD2 e WaW, **sem copiar conteúdo**. A identidade é própria:

- gameplay sempre igual ao roteiro;
- custo humano mostrado sem glorificar atrocidades;
- historicidade com fontes;
- ficção assumida quando necessária (aldeia francesa ficcional, nunca "Tczew").

Regras de engenharia, todas de `AGENTS.md`:

- A simulação guarda dados. O renderer nunca decide nada.
- Coordenadas: 32 unidades = 1 m.
- Assets só com autoria, licença e escala.
- Não inventar FPS.
- Teste de estado não é playtest.

## 2. Escada de estado de uma missão

`PLANEJADA` → `BANCADA` (sistemas novos validados isoladamente) → `PROTÓTIPO JOGÁVEL`
→ `PRODUÇÃO` → `VALIDADA`.

Promoção só com evidência:

| Promoção | Evidência exigida |
|---|---|
| → PROTÓTIPO JOGÁVEL | `mission.json` schema 2, testes de estado por objetivo/evento, rota automática completa, build |
| → PRODUÇÃO | Assets finais licenciados, apresentação (luz, áudio, animação, FX) sem placeholders críticos, browser integral verde |
| → VALIDADA | **Playtest humano** registado + **FPS medido no Chromebook** de referência dentro do orçamento + revisão Reviewer ACCEPT. Nunca por testes técnicos apenas. |

## 3. Sistemas globais (um sistema, várias missões)

Os IDs S1–S17 vêm do roadmap técnico do PR #58, §2. As classes vão de [A] (reutiliza o M01 como dados)
a [D] (estrutural, **exige aprovação humana antes do código**).

| Sistema | Classe | Primeiro uso | Dependência |
|---|---|---|---|
| S17 Animation Resolver | [C] | transversal | Contrato de animação (feito na V6). **Pré-requisito** de quase todos os [C] de animação. |
| S1 Flags de campanha no save | **[D]** | M03/M04 | Saves schema 2. Migração. |
| S2 Data/relógio por segmentos | [B]/**[D]** | M02 (2 datas), M20/M23 (3 atos) | `battleClock`, `restore` |
| S3 Rendição/custódia | [C] | M25/M06 | Estados de ator, IA aliada, save |
| S4 Civis não-combatentes | [C] | M03 | S3 |
| S5 Superfícies (neve/lama/cinza) | [C] | M07 | Terreno |
| S6 Água + barcos NPC | [C] | M04 | S5 |
| S7 Veículos NPC com agenda | [C] | M02 (carroça) | `battleClock` |
| S8 Veículos jogáveis (avião/tanque/jeep) | [C]/[D] | M05/M13/M14 | **Bancada aprovada obrigatória**; FPS no Chromebook |
| S9 Interiores verticais | [C] | M03 | Oclusão por material |
| S10 Artilharia legível + oclusão por relevo | [B]/[C] | M11/M21 | `safeImpact` |
| S11 Fogo oculto por impacto | [B] | M24 | Fogo como dados |
| S12 Cessar-fogo por setores | [C] | M28 | S3 |
| S13 Limite de setor | [B]/[C] | M29 | `safeImpact` |
| S14 Aeronaves/panoramas de escala | [A]/[C] | M02 (Ju 87 já existe) | — |
| S15 Paraquedas/planador | [C] | M17 | — |
| S16 Cerimónia + epílogos | [C] | M30 | S1 |

Regra anti-duplicação: antes de criar um sistema, o Explorer procura o equivalente no M01 (ex.:
`carriedBy`, `stationDrag`, supressão, `safeImpact`, Ju 87, ponte/`planMetalStress`). Um sistema novo
só nasce numa bancada isolada, nunca dentro do código de uma missão.

## 4. Fases e ordem de execução

| Fase | Conteúdo | Portão de saída |
|---|---|---|
| **F0** Base | V7 validada → nova base Captain (V7 + infra V3). Correção da documentação desatualizada. | CI integral V7 verde e relatório fechado (humano fornece o HEAD) |
| **F1** M01 de protótipo a produção | Tarefas T00–T52 ainda abertas, por ondas. Prioridades em `PROGRAM_GRAPH.json`. | M01 em PRODUÇÃO |
| **F2** M01 validada | T01 baseline Chromebook, T49 orçamento de performance, T52 playtest humano | **Humano + aparelho**. M01 VALIDADA = Marco 2. |
| **F3** Infra de campanha | S17 Resolver, S1 flags [D], S2. Fusão dos dossiês do PR #58 no trunk (decisão humana: são proposta). | Aprovação humana dos [D] |
| **F4** Lote 1 | M02 Bzura → M03 Varsóvia (S7 carroça, S2, S9, S4) | Por missão: escada §2 |
| **F5** Lote 2 | M25 Remagen como bancada (espelho técnico do M01: ponte; S3) | idem |
| **F6** Marco 4 (em paralelo) | Bancadas de veículo: avião M05, tanque M13, jeep M14 | Bancada + FPS no Chromebook |
| **F7** Lotes 4–10 | M06→M07→M04; M08→M15→M18→M24→M26; M09→M12; M16→M17→M19; M21→M22→M23→M20; M27→M29; M30 | idem |

Entre lotes: `npm test` + `test:browser` da bancada + playtest humano da missão nova + Chromebook.
**Não se começa uma missão nova enquanto o M01 não estiver em PRODUÇÃO.** A qualidade do M01 define a
fasquia, e os sistemas novos devem nascer reutilizáveis.

## 5. Missões

O estado real fica neste quadro. O `campaign-plan.json` só é atualizado quando houver evidência.

| ID | Local, data | Título | Estado | Lote | Risco¹ | Sistemas novos principais | Bloqueio |
|---|---|---|---|---|---|---|---|
| M01 | Tczew, 1/9/1939 | A primeira manhã | **PROTÓTIPO JOGÁVEL** | — | — | ckm (fogo), resolver | V7 CI; playtest; Chromebook |
| M02 | Bzura, 9–10/9/1939 | Contra-ataque | PLANEJADA | 1 | 2 | S7 carroça, S2 | F1–F3 |
| M03 | Varsóvia, 25/9/1939 | Cidade cercada | PLANEJADA | 1 | 4 | S9, S4, S1 leve | F4 M02 |
| M04 | Dunquerque, 31/5/1940 | Até o mar | PLANEJADA | 4 | 4 | S6 água + barcos | S5/S6 |
| M05 | Inglaterra, 15/9/1940 | Céu em chamas | PLANEJADA | 3 | 5 | **S8 avião** | Bancada |
| M06 | Tobruk, 14/4/1941 | Perímetro | PLANEJADA | 4 | 3 | S7 proxies, S3 | S3 |
| M07 | Kryukovo, 7–8/12/1941 | Inverno | PLANEJADA | 4 | 4 | S5 neve, trenó | S5 |
| M08 | Guadalcanal, 7–8/8/1942 | Watchtower | PLANEJADA | 5 | 2 | proxies frota | — |
| M09 | Stalingrado, 14–15/9/1942 | O Volga | PLANEJADA | 6 | 4 | S6 barco controlo limitado | S6 |
| M10 | Stalingrado, 14/10/1942 | Fábrica | PLANEJADA | 6 | 3 | S9 industrial | S9 |
| M11 | El Alamein, 23/10/1942 | Noite no deserto | PLANEJADA | 6 | 3 | S10 leve | — |
| M12 | Kasserine, 20/2/1943 | Primeiro sangue | PLANEJADA | 6 | 2 | S7 camião | S7 |
| M13 | Prokhorovka, 12/7/1943 | Aço | PLANEJADA | 3 | 5 | **S8 tanque** | Bancada |
| M14 | Gela–Niscemi, 14/7/1943 | Estradas sicilianas | PLANEJADA | 3 | 5 | **S8 jeep**, S4 | Bancada |
| M15 | Tarawa, 20/11/1943 | Além do recife | PLANEJADA | 5 | 4 | S6 vadear, LVT | S6 |
| M16 | Monte Cassino, 17–18/5/1944 | Montanha | PLANEJADA | 7 | 3 | Terreno vertical, eco | — |
| M17 | Sainte-Mère-Église, 6/6/1944 | Antes do amanhecer | PLANEJADA | 7 | 3 | S15 | — |
| M18 | Omaha, 6/6/1944 | Overlord | PLANEJADA | 5 | 4 | S6 (reuso M04) | S1 |
| M19 | Caumont, 13/6/1944 | Bocage | PLANEJADA | 7 | 4 | S3 completo | S3 |
| M20 | Oosterbeek, 17–25/9/1944 | Uma ponte longe demais | PLANEJADA | 8 | 5 | S2 [D] 3 atos, S15, S6 | S2 [D] |
| M21 | Vossenack, 2/11/1944 | Floresta | PLANEJADA | 8 | 3 | S10 completo | — |
| M22 | Clervaux, 16–17/12/1944 | Ofensiva | PLANEJADA | 8 | 3 | S2 snapshot, S7 | S2 |
| M23 | Bastogne/Foy, 12/1944–1/1945 | Cercados | PLANEJADA | 8 | 5 | S5 neve, S14, S3 lote, S2 [D] | S2 [D] |
| M24 | Iwo Jima, 19/2/1945 | Areia negra | PLANEJADA | 5 | 4 | S5 cinza, S11 | S5 |
| M25 | Remagen, 7/3/1945 | Ponte ainda de pé | PLANEJADA | 2 | 2 | S7, S3 (reuso da ponte M01) | F1 |
| M26 | Hagushi, 1/4/1945 | L-Day | PLANEJADA | 5 | 3 | S4 maduro | S4 |
| M27 | Seelow, 16/4/1945 | Portões de Berlim | PLANEJADA | 9 | 4 | S14 holofotes, S7, S5 | — |
| M28 | Berlim, 1–2/5/1945 | Últimos quarteirões | PLANEJADA | 9 | 4 | **S12** | S3 |
| M29 | Shuri, 28–29/5/1945 | Shuri | PLANEJADA | 9 | 3 | S13 | S5 |
| M30 | Baía de Tóquio, 2/9/1945 | Silêncio | PLANEJADA | 10 | 4 | **S16** epílogos | S1 (todas as flags) |

¹ Risco 1–5 do roadmap técnico do PR #58, §3. Os detalhes por missão estão no dossiê `MNN-*-PRODUCTION-DOSSIER.md`.

## 6. Produção de assets

Pipeline existente: `tools/assets/<kit>/` gera GLB determinísticos, com manifesto (SHA, licença,
escala), teste `tests/*-glb.test.js` e galeria `docs/assets/<kit>/`. Reutilizar este padrão, sem
criar outro. Cada kit: orçamento de triângulos por LOD, autoria original, nunca extraído de CoD.
Primeiro os kits partilhados entre missões (uniformes por exército, armas por nação, veículos genéricos),
só depois os kits específicos de uma missão.

## 7. Integração e QA

- Uma branch por tarefa a partir da base validada. Draft PR para a branch de consolidação, **nunca para a `main`**.
- O merge para a `main` e o deploy são **sempre do utilizador**.
- Ciclo por tarefa: Implementer → Verifier PASS → Reviewer ACCEPT, com orçamentos do Task Contract.
- Browser integral: no CI do GitHub (o local é SwiftShader e pesado).
- Saves: qualquer mudança de schema é [D] e exige migração, testes legacy e aprovação humana.
- Obrigações de regressão: `.agent/regression/`, validadas com `regression_union.py`.
