# Auditoria M02 — secção M (Arquitetura técnica), PDF pp. 44–46 vs origin/gemini/m02-01-quinta @ 56e98cbf
(transcrito pelo Capitão a partir do relatório do auditor; repo não editado; testes não executados pelo auditor)
- M1 M01 intacta: OK (0 bytes em src/*m01* desde 3c8e576d; game.js intacto).
- M1 Reutilização/fronteira: PARCIAL — reutiliza M01Navigator, m01-player-physics, m01-collision-layout, m01-lod-policy, spatial/traceShot, wz29, core/random; não copia M01Simulation (sim M02 = 1458 linhas, ~12 imports diretos).
- M2 Mission adapter/registry: AUSENTE como módulo.
- M2 Estado/encontros, política de materiais, squad/nav, horizonte (sem imports, sem Math.random), streamer (MAX_RESIDENT_CELLS=2), contrato de snapshot (validateM02Snapshot): OK.
- M2 Ponte de campanha: PARCIAL — exportCampaignResultToM03 dentro da sim, sem módulo próprio nem envelope R4.
- M2 Renderer não decide: PARCIAL — só lê sim.*, mas nenhum teste de fronteira referencia m02-01-renderer.
- M3 Dados data-driven: PARCIAL — layouts JSON (schema m02-01-quinta-bench-v1) sem validação de schema; ~400 literais numéricos na sim/combat-ai/acts-director.
- M4 Act runner M01: NÃO reutilizado (acts-director próprio).
- M4 Navegação/combate/IA com histerese: PARCIAL (não verificado em código).
- M5 Métricas sem FPS inventado: NÃO CONFORME — handoff PERF-01 «PASS (62.5 FPS)» sem artefacto; o spec só asserta drawCalls>0 e triangles>0.
- M5 Orçamento p50/p95/p99 e memória: NÃO IMPLEMENTADO.
- M6 Determinismo: PARCIAL — semente fixa 19390909, Random(seed), guardas contra Math.random em 5 testes; replay/golden por verificar.
- M6 Testes: 6 node + 1 browser; sem testes de renderer nem de desempenho real.
Próximas ações: corrigir PERF-01 no handoff; teste de fronteira do renderer e validação de schema dos JSON; registar a não reutilização do act runner.
