# COD Guerra

Leia `DEVELOPMENT_STATUS.md`, `RUNBOOK.md`, `IMPLEMENTATION_PLAN.md` e o sistema afectado antes de editar.
A especificação completa é `docs/PROMPT_MESTRE.txt`; o índice do produto é `PROJECT_SPEC.md`.

- Node >=22.12; usar Node 24 no CI. `npm ci`, `npm test`, `npm run build`, `npm run test:browser`.
- Dev: `npm run dev`, URL `/COD-guerra/` na porta 5173. Produção: `npm run preview`, porta 4173.
- Gameplay: x/y em unidades legadas; 32 unidades = 1 m. Three.js: x/z no solo, y altura em metros.
- `Simulation` guarda somente dados. Renderer nunca decide dano, visibilidade, eventos ou estado da missão.
- Preservar a bancada antiga. A aldeia francesa é ficcional; nunca renomeá-la para Tczew.
- Testar alterações proporcionais ao comportamento. Teste de estado não é playtest. Não inventar FPS.
- Assets finais precisam de autoria/licença, escala e animações verificadas. Não extrair conteúdo de COD.
- Trabalhar em branch própria; abrir PR para main. Actualizar status e evidências antes de terminar.
- Trabalho simultâneo com Claude Code: pesquisa/mapa/roteiro de M01 em branch própria, evitando alterações concorrentes em engine/combate/build.

## Regra permanente: integrar tarefas concluidas na versao jogavel

- Toda tarefa concluida e validada deve ser encaminhada automaticamente para integracao na branch de desenvolvimento jogavel, sem ficar indefinidamente isolada. Verificar primeiro o registo central e o Git para evitar duplicacoes.
- Integrar somente trabalho compativel e confirmado, preservar commits e evidencias, resolver conflitos sem sobrescrever outras entregas, e atualizar o estado de cada tarefa (concluida, integrada, validada, disponivel para jogar).
- Validar o comportamento real no jogo e executar testes proporcionais durante o desenvolvimento e todos os checks obrigatorios antes de promover a candidata. Nao disfarcar regressões com timeouts ou ignorar falhas.
- Manter uma candidata jogavel atualizada e identificar como a testar. Integracao na branch jogavel nao equivale a merge na main nem a deploy: ambos continuam a exigir autorizacao explicita, checks verdes e seguranca da main.
- Se houver conflito, regressao, check vermelho ou incerteza, bloquear a promocao, guardar o progresso e apresentar diagnostico curto; nunca force-push.
- Economizar utilizacao de IA: sem subagentes automaticos, sem paralelismo desnecessario, scripts e diffs primeiro, Sonnet para implementacao normal, Opus apenas para decisoes complexas. Nao chamar Fable, Jev ou APIs pagas sem nova autorizacao explicita.
- Prioridade imediata: integrar com seguranca o trabalho concluido da M01 e T24 na candidata jogavel, sem contornar os checks do PR #76.
