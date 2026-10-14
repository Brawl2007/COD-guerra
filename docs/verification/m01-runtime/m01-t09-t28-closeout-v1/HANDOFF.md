# T09 / T28 — handoff

- TASK_ID: `M01-T09-T28-MATERIALS-CLOSEOUT-V1`
- STATUS: ACCEPTED e INTEGRATED; duas tarefas concluídas.
- BASE_BRANCH: `claude/m01-integration`
- BASE_HEAD: `6edc3d6f90ea5e12b4d0f554555bac8499423acc`
- WORK_BRANCH: `codex/m01-t09-t28-materials-closeout-v1`
- ACCEPTED_HEAD: `c739b08549d5f08963984eb644b40bebcb91cfd8` (código verificado).
- PLAY_BRANCH: `claude/m01-integration`
- INTEGRATION_HEAD: `3bdcd994ab791547fb081a5ebff325f1563c33e7` (merge jogável; registo final posterior só altera documentação/provas).
- FILES_CHANGED: texturas/manifestações em `assets/textures/m01/`; gerador/galeria em `tools/assets/m01-materials/`; quatro módulos de materiais/render; testes focados e workflow; comparador prévio de reprodução dos props; documentação, memória e obrigações de regressão.
- IMPLEMENTED: 16 materiais originais albedo/normal/ORM, High1024/Low512, SHA/licença, gutters e mapas partilhados; terreno macro com caminhos, balastro, lama/margens húmidas, detalhe e projecção triplanar, Low macro-only; ownership seguro, incluindo loads parciais/stale; sem mudanças de modelos, física, simulação ou amostragem do mesh.
- TESTS: CI `38174455690`, Node 639/639 e tooling 173 PASS; geração local e CI exacta; autoridade protegida byte-idêntica à base. Verificador independente: terrain11, atlas5, props8 e regressão água/grading2 PASS.
- BUILD: PASS local e CI; 84 módulos, aviso de bundle acima de 500 kB.
- RUNTIME_OR_VISUAL_EVIDENCE: CI `38174455699`, terreno9/9 e galeria3/3; 96 capturas atlas e comparação terreno1/5/50m. Logs CI completos, relatórios e montagens nesta pasta e em `../m01-terrain-war-ground-v1/`. Artefacto CI11714853806.
- REVIEW: verifier PASS, reviewer ACCEPT independentes em `c739b08`; nenhum defeito de código restante.
- KNOWN_LIMITATIONS: M01 permanece PROTÓTIPO JOGÁVEL; sem FPS/VRAM de GPU real. High27MiB descodificados; shader ~9leituras/fragmento plano, até45na encosta antes da optimização. Biblioteca atlas opt-in, resto dos consumidores preservado. Galeria de autoria usa Vite.
- BLOCKERS: nenhum.
- INTEGRATION_VERIFICATION: merge sem conflitos, `npm test` 639/639 e `npm run build` PASS no resultado (`integration-node.log`, `integration-build.log`); CI de fecho da branch `38175685874` verde.
- PLAY: `.agent/tools/jogar.sh claude/m01-integration`
- NEXT_ACTION: nenhuma nesta entrega; T09 e T28 concluídas e integradas.

Origem: retomada selectiva de `7010f0f`, sem importar remoções de props/outros deltas do WIP. Pré-requisito: base/CI já falhava só nos resíduos NORMAL quase zero de dois carrinhos; comparador limita a normalização a abs<1e-12, com mutações dos restantes dados rejeitadas e todos os modelos/manifestos em disco intactos.

O workflow autónomo local separou implementação, verificação e revisão. Os nomes de modelos Claude da tabela do repositório não estão disponíveis nesta sessão; foram usados os agentes suportados e o encaminhamento determinístico, sem chamadas pagas ao Jev. Dados runtime em `.agent/runs/` não foram versionados.
