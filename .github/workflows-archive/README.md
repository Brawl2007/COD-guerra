# Workflows arquivados

Workflows de tarefas e consolidações já fechadas (V2–V7 e passes de polimento). Cada um só disparava na sua
própria branch, que guarda a sua cópia; aqui ficam como registo. O GitHub não executa nada fora de
`.github/workflows/`.

Hoje há dois workflows ativos:

- `ci.yml`: testes Node, testes das ferramentas dos agentes e build em todas as branches `claude/**` e
  `codex/**` e em PRs para `main`; a suíte de browser completa só por `workflow_dispatch`.
- `pages.yml`: validação completa e publicação do preview a partir de `main`.

Uma tarefa só acrescenta um workflow próprio quando precisa de specs de browser focadas ou de uma
verificação de autoridade (`git diff --exit-code`) que o `ci.yml` não faz.
