# COD Guerra — Produção criativa da campanha M02–M30

**Entrega:** `COD-GUERRA-FULL-CAMPAIGN-M02-M30-CREATIVE-PRODUCTION-V1` · **Branch:** `codex/m02-m30-full-creative-production-v1` · **Estado de todas as missões M02–M30:** PLANEJADA (Prompt §80). M01 continua PROTÓTIPO JOGÁVEL e não é reescrita aqui.

Esta pasta é uma **biblioteca de proposta criativa**: nada aqui entra em código, em `main`, no deploy ou em `missions/` sem a aprovação do Capitão e sem a revisão histórica das fontes H01–H30 (ver limites em `COD-GUERRA-CAMPAIGN-CREATIVE-HANDOFF.md` §5).

## Ordem de leitura

1. `COD-GUERRA-CAMPAIGN-CREATIVE-HANDOFF.md` — o que M01 estabeleceu, a auditoria do plano canónico (§79/§73/PR #44), as convenções, as decisões pendentes, os limites honestos e o estado final da entrega.
2. `CAMPAIGN-MASTER-STORY-BIBLE.md` — logline, seis movimentos, oito regras, a tabela das 29 situações (situação · modo de contar · objeto · silêncio · tarefa · custo humano), curva de intensidade, cadeia de objetos, regras para prisioneiros e civis, vozes dos POV, contrato de cutscenes.
3. `CAMPAIGN-HISTORICAL-TIMELINE.md` — cronologia validada das 30 missões, luz/tempo, equipamento permitido/proibido, correções de §78, registo de pesquisa S-C01…S-C28 e pendências P-C02…P-C31.
4. `CAMPAIGN-CHARACTER-CONTINUITY.md` — os 20 protagonistas, registos de serviço ficcionais, elencos nomeados, civis, pessoas históricas fora de cena, matriz de transição de flags, evolução visual, regras dos epílogos de M30, línguas de VO; §11 com as adições da Fase 7.
5. `CAMPAIGN-GAMEPLAY-VARIETY-MATRIX.md` — verbos por missão, tipos de encontro, taxonomia de objetivos, pontos de decisão e flags, famílias anti-repetição, ritmo, regras de justiça, sistemas por missão.
6. `CAMPAIGN-ATMOSPHERE-ART-DIRECTION.md` e `CAMPAIGN-AUDIO-DIRECTION.md` — paletas e luz por frente, imagem única por missão, linguagem de destruição, uniformes, reutilização de assets; assinatura sonora e silêncio por missão, política de música (um motivo por movimento), famílias de som, regras de VO.
7. `CAMPAIGN-TECHNICAL-ROADMAP.md` — sistemas por classe [A]/[B]/[C]/[D] por missão, lotes de produção, ordem recomendada, dependências de V5/Animation Resolver, riscos e critérios de aceitação.
8. `CAMPAIGN-CRITICAL-REVIEW.md` — revisões histórica (Fase 6), de continuidade (Fase 7) e de gameplay (Fase 8), scorecard 0–10 × 15 critérios das 29 missões, e §7 com a validação executada (comandos e resultados).
9. `missions/MNN-*-PRODUCTION-DOSSIER.md` — um dossiê por missão, 12 secções cada.
10. `maps/MNN-*-MAP-BRIEF.md` — um roteiro de mapa por missão (M02–M30), derivado do dossiê: intenção de nível, sem medições.

## O que é um dossiê de missão

Cada ficheiro em `missions/` consolida os dez documentos pedidos pelo brief (story bible, roteiro cinematográfico completo, gameplay design, set pieces, environmental storytelling, diálogos, arte/atmosfera, áudio/cinema, validação histórica, handoff técnico) em **12 secções** com a mesma numeração em todos:

| § | Conteúdo |
| --- | --- |
| 0 | Ficha e preservação: id/ordem, datas com fuso, local com classificação, operação, unidade canónica → subunidade proposta, elenco, fora de cena, **intocável** (o que o canónico §79 fixa) |
| 1 | Story Bible: logline, as oito respostas, três motivos, temas, estrutura §54, arcos, "o que a missão recusa" |
| 2 | Roteiro cinematográfico completo: cenas com os 20 elementos numerados (hora, local, luz, presentes, o que acontece, porquê, jogador, decisões, aliados, inimigos, ambiente, falas, som, câmara, trigger de entrada, trigger de saída, consequências/flags, sistemas/fallback/skip, continuidade) |
| 3 | Gameplay design: objetivos (ID/texto/obrigatório/ativação/conclusão/falha/consequência/checkpoint), setores, checkpoints, justiça |
| 4 | Três set pieces com os 10 campos (contexto, preparação, experiência, companheiros, ambiente, evolução, clímax, consequências, requisitos técnicos, integração) |
| 5 | Environmental storytelling por setor/fase + objetos com origem |
| 6 | Diálogos (ID/falante/texto/gatilho/prioridade/cooldown; `001–003` = falas canónicas literais), callouts, silêncios |
| 7 | Arte e atmosfera (paleta, luz, materiais, silhuetas, destruição, humanos, violência reduzida, imagem única) |
| 8 | Áudio por fase (perto/médio/longe/silêncio), sons novos, música, VO |
| 9 | Validação histórica (asserção/classe/fonte/pendência), proibições, fora de cena |
| 10 | Handoff técnico: contrato `mission.json`, flags, sistemas por classe com fallbacks honestos, as disciplinas, testes |
| 11 | **Matriz Narrativa-Gameplay** (`Evento narrativo · Objetivo jogável · Ação do jogador · Comportamento dos NPCs · Transformação ambiental · Trigger · Consequência`) |
| 12 | Revisão crítica 0–10 nos 15 critérios + "Correções aplicadas" |

## O que é um roteiro de mapa

Cada ficheiro em `maps/` traduz o dossiê da missão num **brief de nível**: o documento que um level designer lê antes de medir o terreno e de escrever `missions/<id>/MAP.md`, `map-layout.json` e `MEASUREMENTS.md` no pipeline de M01 (`tools/measure_osm_overture.py --dem`, `render-map-svg.mjs`). Todos têm as mesmas 10 secções:

| § | Conteúdo |
| --- | --- |
| 1 | Ficha do mapa: lugar real, classe global (`EXACT` / `RECONSTRUCTED` / `COMPRESSED_FOR_GAMEPLAY`), o que medir depois, origem e eixos propostos, área jogável, compressões declaradas, relógio da missão |
| 2 | Planta esquemática em ASCII (topologia, não escala) |
| 3 | Setores e camadas (`sN_<slug>`), com o que cada setor mostra e onde está a cobertura |
| 4 | Rota principal: `# · De → para · Distância aproximada · Hora · Objetivo / checkpoint` |
| 5 | Rotas alternativas e decisões espaciais (onde o jogador escolhe e o que cada escolha custa) |
| 6 | Cobertura, linhas de visão e oclusão (longa, média, curta; o que o inimigo vê) |
| 7 | Zonas de segurança e perigo (`safeImpact`, artilharia, limites de setor, civis) |
| 8 | Encenação e objetos por zona (environmental storytelling com origem no dossiê §5) |
| 9 | Luz, tempo e som por fase, com tabela solar **calculada (NOAA) e marcada "a validar"** |
| 10 | Requisitos de produção do nível: tamanho, assets, sistemas do roadmap (S1–S17), risco, fallback, **o que medir primeiro** |

Os roteiros de mapa **não** contêm medições, coordenadas reais, `map-layout.json`, SVG nem código; as distâncias são intenções de ritmo e serão substituídas pelas medições Overture/OSM + DEM de cada missão.

## Convenções

- IDs (Prompt §74): `obj_mNN_<slug>`, `evt_mNN_<slug>`, `cp_mNN_<letra>_<slug>`, `cs_mNN_<slug>`, `dlg_mNN_NNN`, `co_mNN_<slug>`, setores `sN_<slug>`, grupos `grp_<slug>`, flags `mNN.<flag>`.
- Classificação histórica: `DOCUMENTED` / `RECONSTRUCTED` / `GAMEPLAY_DRAMATIZATION`; mapas `EXACT` / `RECONSTRUCTED` / `COMPRESSED_FOR_GAMEPLAY`.
- Classes técnicas: **[A]** reutiliza sistemas reais de M01 · **[B]** pequena extensão · **[C]** sistema novo · **[D]** alteração estrutural (exige aprovação).
- Falas marcadas `(§79)` são canónicas e literais; `(PR #44)` são propostas adotadas do PR #44; `(V1)` são propostas desta biblioteca.

## O que esta entrega não é

Não é código, não é playtest, não é homologação histórica. Nenhuma das fontes H01–H30 foi lida na íntegra nesta sessão (WebFetch bloqueado); as verificações S-C são resumos de busca com URL. Nenhum FPS foi medido. Ver `CAMPAIGN-CRITICAL-REVIEW.md` §7.
