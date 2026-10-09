@AGENTS.md

## Claude Code neste repositório

- Arranque recomendado: `claude --agent captain` (Opus 5.5, esforço alto) com `/advisor fable`.
  Guia, verificação local e correção do Advisor: `docs/direction/AGENT_SETUP.md`.
- Opus planeia e decide; Sonnet implementa, verifica e revê; Haiku lê código (`explorer`/`Explore`)
  e documentação (`researcher`). Opus `reviewer-critical` só para simulação, saves, integração e arquitetura.
- Advisor (Fable 5.1): consultar antes de fixar um plano grande, quando o mesmo erro aparece duas vezes
  e antes de declarar concluída uma tarefa longa. Fora disso, não chamar.
- O Advisor lê a transcrição inteira: manter o contexto pequeno. Delegar leituras pesadas, não colar logs
  longos, usar `/compact` antes de decisões importantes.
- Jev: só pelos scripts em `.agent/tools/`, teto de 3 chamadas pagas. Nunca comprar créditos, planos,
  assets ou serviços sem autorização expressa do utilizador.
