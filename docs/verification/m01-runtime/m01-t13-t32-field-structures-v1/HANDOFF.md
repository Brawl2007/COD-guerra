# T13 / T32 — handoff

- TASK_ID: `M01-T13-T32-FIELD-STRUCTURES-V1`
- STATUS: ACCEPTED e INTEGRATED; duas tarefas concluídas.
- BASE_BRANCH: `claude/m01-integration`
- BASE_HEAD: `a1dd76b8fd30467f9bb335411cf8f589a4fd829a`
- WORK_BRANCH: `codex/m01-t13-t32-field-structures-v1`
- ACCEPTED_HEAD: `cbbe0d7624d39e444f02ac0bd200037a71b3cf8e` (verifier PASS/reviewer ACCEPT e ambos os CI verdes).
- PLAY_BRANCH: `claude/m01-integration`
- INTEGRATION_HEAD: `80b04746db66a0e848c5c168292bd5bf003b878e` (merge jogável; registo posterior só altera documentação/provas).
- FILES_CHANGED: kit original/generator/viewer/15 GLBs e manifesto; controller novo e integração restrita em environment/view; testes e workflow focados; crédito, documentação, memória e obrigações de regressão.
- IMPLEMENTED: T13 barracão/abrigo/posto/casamata, 3 LODs, variante destruída; T32 residency atómica, LOD, estado/altura autoritativa, fallback, ownership parcial/late e proxies/cache em pausa. Porta oeste aberta; envelopes decorativos distintos dos bounds físicos.
- TESTS: CI38225594014 Node648/648 e tooling173 PASS; verificador independente9/9,16 ficheiros reproduzidos,83 colisores iguais, rota26 eventos/4 CP/saúde92. Core/game/world/mission/estação/config/modelos anteriores byte-idênticos à base.
- BUILD: PASS local e CI,86 módulos; aviso habitual bundle>500kB.
- RUNTIME_OR_VISUAL_EVIDENCE: produção3/3 PASS; CI38225594010 browser/galeria4/4 PASS;11 pares A/B,15 imagens de galeria e5 ângulos suplementares independentes. Plateau343 em3 restauros idênticos,4 roots/15 modelos. Logs e JSON originais nesta pasta.
- REVIEW: verifier PASS e reviewer ACCEPT independentes em `cbbe0d7624d39e444f02ac0bd200037a71b3cf8e`, sem fixes de código pendentes.
- FIX_ATTEMPTS: 1 (prova de GPU warmup/restauros e suplemento de câmara; runtime/assets não alterados nesta correcção).
- REVIEW_REJECTIONS: 0.
- REGRESSION: `.agent/regression/records/M01-T13-T32-FIELD-STRUCTURES-V1.json`, união validada.
- MEMORY: `.agent/memory/m01/field-structure-residency-and-proxy-ownership.md`.
- KNOWN_LIMITATIONS: reconstrução artística original CC0, decoração não sólida; sem FPS/VRAM medidos/playtest humano novo. M01 permanece PROTÓTIPO JOGÁVEL. Case casamata control28/51200 píxeis, explicitamente dentro do limite.
- BLOCKERS: nenhum.
- INTEGRATION_VERIFICATION: merge sem conflitos, `npm test`648/648 e `npm run build`86 módulos PASS no resultado (`integration-node.log`/`integration-build.log`).
- PLAY: `.agent/tools/jogar.sh claude/m01-integration`
- NEXT_ACTION: nenhuma nesta entrega; T13 e T32 concluídas e integradas.

Coordenação: reserva98a0551 publicada em2026-10-12 antes da implementação; branches recentes do Claude áudio/documentação excluídas do âmbito. Os presets Claude da tabela não estão disponíveis nesta sessão; agentes suportados herdaram o modelo da sessão. Jev user-level ausente; fallback local `no_key`, sem chamadas pagas. Runtime `.agent/runs/` não versionado.
