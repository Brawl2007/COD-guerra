# Checkpoint V5 — inclusão dos clips de movimento dos soldados

**Estado:** novo candidato de integração para aprovação; **NÃO certificado nem publicado**.
**Base exata:** V4 `079ee53b48764272b1b2366a543fbbd0fbb9b3ae`.
**Fonte:** `codex/m01-soldier-motion-clips-production-v1` @ `075effaf72d3ceaf4dbda153f1221dc1541b8bef`.
**TASK_ID:** `M01-SOLDIER-MOTION-CLIPS-PRODUCTION-V1`, marcado `READY_FOR_CAPTAIN_REVIEW` no [PR #49](https://github.com/Brawl2007/COD-guerra/pull/49).

## Alterações incorporadas

- Biblioteca adicional de **6 clips originais** `sprint`, `crouch_walk`, `turn_left`, `turn_right`, `hit_front` e `near_miss_duck`, com ficheiro GLB de 415.724 bytes, manifesto, gerador, testes e evidência da revisão visual.
- **121 blobs exclusivos** da fonte, sem colisão com código da consolidação V4: todos preservados byte a byte através dos mesmos blobs Git.
- Os dois caminhos de histórico `DEVELOPMENT_STATUS.md` e `docs/NEXT_CHAT_CONTEXT.md` já continham as atualizações das integrações anteriores. Foram mantidos na V4 para evitar perda de estado; o handoff completo da nova tarefa foi mantido no caminho original e o commit de origem foi acrescentado como segundo pai.
- **Nenhum sistema de resolução/ativação dos clips foi inventado**: o pacote é de assets, ainda não dá animações novas aos soldados durante o gameplay.
- Nenhum ficheiro `src/game/`, `src/render/`, `mission.json`, `main` ou deploy foi alterado por esta integração.

## Validação da fonte e pendências

- Fonte: 27/27 testes focados, build aprovado, 36 configurações de loader/mixer, capturas e seis MP4 (dados relatados no próprio handoff). Isto **não** prova sucesso combinado.
- **Bloqueador já existente na V4:** 3 testes Playwright `m01-battlefield-fx-polish-v3.spec.js` falharam na CI [run 37749772664](https://github.com/Brawl2007/COD-guerra/actions/runs/37749772664). O test de comboios recebeu cancelamento de runner, não falha de asserção.
- Requer CI no **HEAD V5**, browser dos efeitos com evidência, validação integral de Node, checkpoint/RNG/schema2, capturas comparativas e medição no Chromebook.
- Os outros trabalhos ainda em progresso e a Station Visual Fidelity V3 permanecem excluídos até handoff e aprovação. A M01 continua **PROTÓTIPO JOGÁVEL**.

**Nenhum merge automático desta branch para V4 ou `main`.**
