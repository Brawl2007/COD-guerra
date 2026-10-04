# ckm wz.30 — revisão do orçamento #35

Kit provisório revisto, sem ligação à casamata. M01 continua **PROTÓTIPO JOGÁVEL**. Merge apenas em staging/candidato do PR #32.

- LOD0: **5004 → 3904 triângulos**, limite 4000, 364660 bytes e 9 draw calls. Redução de 22%; comprimento, bbox, peças, pivôs, sockets e alimentação preservados.
- LOD1, LOD2 e GLB dos clips da guarnição preservados byte a byte, hashes no manifesto e verificados no teste. Clips da arma no LOD0 conservam os tempos/valores dos restantes LODs.
- Inspeccionada a galeria original antes/depois `docs/assets/m01-ckm-wz30/ckm_lod0_budget.png`; não foram repetidas capturas/extracções. A suspeita inicial de orientação das pontas na fonte não se confirmou no GLB: as 94 faces planas e normais apontam para fora. O kit entregue foi mantido sem alterações.
- **154/154 Node**, zero falhas/skips, build passa (1034,23 kB / 268,17 kB gzip; aviso de chunk grande). Logs e hashes em `verification.json`, `node.log` e `build.log`.
- CI do candidato anterior **23c403b**, run [37071814929](https://github.com/Brawl2007/COD-guerra/actions/runs/37071814929): **153/153 Node**, build, **26/26 navegador** em 14,9 min; deploy skipped. Logs do job 111052769731 confirmam as contagens.
- Esta revisão não altera src/, testes de navegador, workflows ou Graphify; JS idêntico ao candidato anterior, SHA-256 **6e8d87a1653f4495add54fa4176c9da41cb1416c3362f2615b17cc16116c56fa**. Não atribuir nova execução local dos 26 ao kit. Novo CI do PR #32 será separado.

Guarnição ckm, altura da seteira e integração continuam pendentes; as transições do arrasto são a próxima tarefa do Claude. Galeria/testes não aprovam arte/historicidade final, playtest humano ou FPS no Chromebook. Não houve merge em main, publicação ou workflow_dispatch. Graphify permanece em pausa.
