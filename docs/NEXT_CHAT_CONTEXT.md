# Contexto para continuar COD-guerra

Continuar sem reiniciar. Ler primeiro este ficheiro, `AGENTS.md` e `docs/WORKING_CONTEXT.md`; consultar apenas o sistema afectado. Repo Brawl2007/COD-guerra. Branch actual `codex/m01-support-runtime`; candidato do PR #32 em `codex/m01-assets-review`, entregue em staging `codex/m01-runtime`. Âncora de código/merges `83e2129c15f3a4c8805e954e7b3b5bf22450a987`, tree `84462c0d08cd53533bd8332a9426d1a54c604eae`; commits seguintes apenas registam provas/contexto/tarefas. Confirmar refs antes de escrever.

## Intenção e limites

M01 — Tczew permanece **PROTÓTIPO JOGÁVEL**, marco 2 não aprovado. Integrações em staging e PRs autorizados; merge em main/publicação pertencem ao utilizador. Não usar workflow_dispatch. Preservar bancada francesa (32 unidades/m), schema 2, CP-A..D, RNG, baixas por ID, relógios/gates e segurança das demolições. Renderer lê dados e não decide combate. Playtest humano e FPS no Chromebook continuam pendentes.

## Validação e integração concluídas

- Handoff original f758daa preservado: **132/132 Node**, build e **24/24 navegador**, 538,6 s, sem retries. #29/#30 integrados anteriormente: 136/136 Node e build. Provas em `docs/verification/m01-runtime/asset-review-2026-10-02/`.
- CI anterior do PR #32, head dcffd4a, run 37063392650: **136/136 Node**, build e **24/24 browser**, 20,8 min, deploy ignorado. Este resultado pertence à revisão anterior; novo CI será separado.
- Nesta continuação: #31 ckm (head 4170eea) revisto/integrado por ec87e3f; #33 MG34 deitada (c6e5ed4) por 26c803c. Runtime local bf59e6f / remoto equivalente 456d216, tree ec27af68ec9c25f9603a2329437ee4891ace8319, passou **148/148 Node**, build e **26/26 navegador**, **552,1 s**, zero retries/skips/instáveis/erros globais.
- #34 vagões queimados/danificados (11554d9) revisto/integrado por e6f4bdc. Após esse kit isolado: **153/153 Node** e build; src/, browser tests, workflows e Graphify conservados; JS de produção idêntico ao runtime testado, SHA-256 **6e8d87a1653f4495add54fa4176c9da41cb1416c3362f2615b17cc16116c56fa**. Não declarar outra execução dos 26 no candidato com assets. Build 1034,23 kB / 268,17 kB gzip, aviso de chunk grande.
- Provas, relatório bruto comprimido, snapshots de diagnóstico e capturas originais do build em `docs/verification/m01-runtime/support-runtime-2026-10-02/`. Capturas novas são continuações de estados alcançados por controlos na simulação, vista da margem oeste; contagens/modelos confirmados também por diagnóstico/testes. Galerias dos kits são entregas originais, não novas extracções/playtests.

- Continuação #35: ckm LOD0 **5004 → 3904**, orçamento 4000; LOD1/2 e clips intactos. Merge 83e2129, **154/154 Node** e build; src/browser/workflows/Graphify/JS idênticos ao candidato anterior. Evidências em `docs/verification/m01-runtime/ckm-budget-2026-10-02/`. CI anterior de **23c403b**, run **37071814929**, terminou com **153/153 Node, build e 26/26 navegador** (14,9 min), deploy ignorado. Novo CI após esta entrega é separado.

## O que já aparece no runtime

- Ju 87: três aviões, LODs, hélices/pausa, cache/fallback e trajectórias preservados; SC 250 oculta. Segundo raid conservado. Somente as nove pontes obrigatórias bloqueiam M01.
- Trem 963: **65 vagões**, passo **9,10 m**, LOD2 instanciado com geometria/material partilhados, fallback por tipo ou total. Composição genérica provisória de 49 cobertos/16 abertos; P16 aberta. Locomotiva placeholder preservada. Sem inventar velocidade/portas/fogo.
- MG34: **de_east_0/1**, uma arma presa antes do mixer, Kar98k/clipe escondidos, boca real, LOD e reserva dentro dos mesmos 18/24/28 actores. Rajada lê firedAt/shot e corta aos 4–7 tiros reais; pausa/restauro/supressão/baixa e fallback preservados. Sem recarga ou deitado inventados no renderer.
- Não mudou src/game, src/world, src/core, saves, RNG, horários/gates, trajectórias de demolição ou bancada francesa.

## Trabalho do Claude e pendências

O utilizador pediu mais trabalho depois do #34. `docs/CLAUDE_NEXT_TASK.md` dá **duas novas tarefas independentes**: (1) reduzir apenas ckm LOD0 de 5004 para no máximo 4000 triângulos, preservando LOD1/2 e clips; (2) quatro clips emparelhados de agarrar/soltar no arrasto de S3, preservando os 61 ossos e clips existentes, sem src/. Especificações anteriores em `docs/CLAUDE_CKM_TASK_REFERENCE.md` e `docs/CLAUDE_MG34_WAGON_TASK_REFERENCE.md`. A tarefa (1) chegou no **#35**, head e65ce73, foi revista e integrada; não repetir. A tarefa (2), transições do arrasto, continua pendente com Claude. Não repetir os kits entregues nem enviar mensagens ao Claude por ferramentas.

Pendências: guarnição ckm ainda não cria actores na simulação; MG34 deitada/municiador também precisam de dados de postura/guarnição; pátio oeste exige rever alturas do kit versus cv_wagon_1/2 sem inferir colisão; estado/vagão danificado ou incendiado precisa de identificação da simulação. Arte, transições, áudio, fontes históricas, playtest humano e Chromebook continuam pendentes. Não iniciar M02.

## Graphify pausado

Ordem explícita do utilizador. Preservar `graphify-out/extraction-checkpoint.json.gz`, SHA-256 54647d13cc9b860c18b777cbd3d4cdc693d4a2af0cb015082171c2667dd32e32. AST 1537 nós/3558 edges; dois chunks de documentos e 120/151 imagens iniciais extraídos. Faltam 31 iniciais + quatro imagens suplementares e documentos novos/alterados, merge/diagnóstico/grafo/HTML/benchmark. Não repetir extracções nem declarar grafo completo. Headroom/context-compressor só têm medições locais, não poupança/facturação do ChatGPT.
