# COD-guerra — Workflow V2 no Claude Code Web

Âmbito: somente infraestrutura nesta branch. Não inicia M01, Routine, nem segundo Capitão. Não altera main ou PRs #80/#84.

## Organização (inspirada nas quatro imagens)

Opus principal = único Capitão; Haiku-low = pesquisa curta de leitura; Sonnet implementer = edição isolada; Sonnet verifier = testes independentes; Sonnet reviewer = revisão independente; Jev = regras offline, sem TypeSafe.

Começar com UM trabalhador simultâneo. Não ligar Agent Teams, não confiar em comandos de esforço não documentados e não assumir que maxTurns é um limite de tokens. RTK permanece opcional e ausente na VM diagnosticada; não instalar automaticamente.

## Arranque real: uma única delegação Haiku de leitura

Em uma sessão Opus do Claude Code Web, com a branch confirmada, executar:

    git branch --show-current
    git rev-parse HEAD
    git status --short
    python3 .agent/tools/cloud_web_preflight.py
    python3 -m unittest discover -s .agent/tests -p 'test_cloud_web_workflow.py' -v
    python3 .agent/tools/cloud_web_workflow.py plan --task-id INFRA-V2-SMOKE --description "Identificar três regras de segurança Git e indicar ficheiros e linhas" --file .claude/hooks/git-safety.py --read-only --expect-sha "$(git rev-parse HEAD)"

A saída de plan apenas PREPARA a delegação. O Capitão deve fazer uma única chamada real a Agent(haiku-low), pedir até três evidências path:linha e encerrar, sem editar arquivos nem iniciar M01. Este script NÃO chama modelos.

## Modo de implementação (somente quando autorizado)

    python3 .agent/tools/cloud_web_workflow.py plan --task-id INFRA-V2-EXEMPLO --description "Correção de infraestrutura previamente aprovada" --file .agent/tools/exemplo.py --risk medium --token-stop 25000 --expect-sha "$(git rev-parse HEAD)"

Fases propostas em sequência: scan (Haiku leitura), edit (Sonnet), verify (Sonnet independente), review (Sonnet independente). Em risco alto, revisão do Capitão principal, sem outro Opus. Cada fase devolve apenas mudança, testes, evidência e bloqueios, nunca um log completo.

## Evidência e consumo

Depois da execução, produzir relatório JSON REAL fora do repositório, por exemplo /tmp/cod-v2-evidence.json. Campos obrigatórios: schema_version=1, task_id INFRA-..., branch, head, read_only (bool), token_stop (int), phases com agente, status PASS, tokens observados (int) e evidence não vazia. Para read_only só a fase scan; para implementação as quatro fases.

    python3 .agent/tools/cloud_web_workflow.py verify --report /tmp/cod-v2-evidence.json

O verificador é fail-closed contra checkout sujo, SHA/branch divergentes, fases sem prova, verificadores com identidade igual ao implementador e tokens acima do limiar. Valores de tokens são auto-declarados: NÃO constituem medição oficial nem limite rígido. Se a UI não permitir observar os tokens por fase, declarar medição indisponível e BLOQUEAR a certificação em vez de inventar números.

## Segurança e continuidade

O workflow NÃO instala RTK, NÃO inicia sessões Cloud, NÃO cria locks, NÃO executa TypeSafe, NÃO altera o projeto diretamente e NÃO integra commits. O PR #84 permanece PAUSED. Com conflito, FAIL ou consumo alto, interromper e registrar handoff curto: TASK_ID, BRANCH, SHA, PASS/FAIL, consumo, alterações, testes, blockers e próxima ação.

A sessão Web deve ser iniciada pelo operador; após isso, o único Capitão pode realmente delegar pelas ferramentas Agent da sua sessão, aplicando o plano.
