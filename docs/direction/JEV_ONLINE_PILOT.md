# Jev real — utilização de até US$5 em decisões úteis (Claude Code Web)

Estado: código preparado; primeira chamada paga ainda não verificada. Autorização do utilizador em 2026-10-17: o Capitão pode utilizar todo o saldo de US$5 referido, mas apenas quando houver benefício real para o COD-guerra e sem interferir no desenvolvimento, na segurança ou na qualidade.

## Seis capacidades disponíveis

A infraestrutura já implementa seis decisões em .agent/tools/jev_decisions.py:
- priority — ordenação de tarefas existentes sem as duplicar;
- bug — classificação de erros e orientação de diagnóstico;
- branch — avaliação de branches sem executar merges;
- risk — classificação da criticidade e da necessidade de revisão Opus;
- verify — recomendação adicional de testes, preservando testes obrigatórios;
- cost — seleção do agente/modelo competente mais económico.

Jev só é consultado se as regras locais classificarem a decisão como ambígua. As respostas são pareceres não vinculativos; o Capitão mantém a última palavra e os agentes Sonnet/Haiku continuam a programar/investigar normalmente. Não reduzir gráficos, IA, simulação, animações nem requisitos para poupar tokens.

## Autorização e proteção financeira

- Preço direto oficial em 2026-10-17: US$0,042 por milhão de tokens de entrada de Jev 1.13 e 1.14; output gratuito. Fonte: https://docs.typesafe.ai/models
- Sem teto arbitrário de 20 chamadas: aplica-se um teto local estimado de US$5 por ledger da VM a todos os roteadores (jev_router.py e jev_decisions.py). O limite usa consumo declarado nas respostas e uma estimativa conservadora antes de enviar o pedido.
- ATENÇÃO: o ledger reinicia numa nova VM; não equivale a um limite de gastos da TypeSafe. O saldo real precisa ser verificado no painel, onde deve existir proteção de conta pré-paga ou limite financeiro. Confirmar que o proxy da VM cobra a conta que tem os US$5; isso ainda NÃO foi provado.
- Na Cloud Web, sem autorização explícita COD_JEV_WEB_PAID_APPROVED=1, o limite efetivo de chamadas pagas é zero, mesmo se o proxy tiver credenciais.
- APENAS o wrapper .agent/tools/jev_web_paid_pilot.py --online pode habilitar essa variável durante a chamada. Não exportar globalmente. O preflight, o dispatcher V2 e CI continuam offline.
- Não instalar ferramentas, não transmitir credenciais, não usar APIs adicionais, não acionar chamadas repetidas/loops, não repetir automaticamente após erro.
- Só uma sessão Capitão Opus. Apenas branch infra/claude-web-single-captain-v1. Sem M01, merge na main, mudanças em #80/#84 ou deploy durante esta migração.

## Pré-teste offline (sem custo)

    git branch --show-current
    git rev-parse HEAD
    git status --short
    python3 .agent/tools/cloud_web_preflight.py
    python3 -m unittest discover -s .agent/tests -p 'test_jev_web_paid_pilot.py' -v
    python3 .agent/tools/jev_web_paid_pilot.py --role implement --risk medium --complexity medium --description "Escolher especialista para uma correção de infraestrutura" --json

O último comando indica mode=offline_preview, sem TypeSafe.

## Primeira decisão paga após confirmar a conta

    python3 .agent/tools/jev_web_paid_pilot.py --role implement --risk medium --complexity medium --description "Escolher especialista para uma correção de infraestrutura" --online --json

Exigir source=jev e usage para afirmar que houve consulta real. Caso contrario registar a razão do fallback sem repetir automaticamente.

## Outras capacidades estruturadas (quando acrescentarem valor)

Preparar JSON curto e sem segredos num ficheiro em /tmp (limite 8 KiB). Exemplo:

    cat > /tmp/cod-jev-risk.json <<'EOF'
    {"files_changed":[".agent/tools/jev_router.py"],"change_type":"infrastructure","description":"Avaliar mudança no roteamento de agentes"}
    EOF

    python3 .agent/tools/jev_web_paid_pilot.py --capability risk --input /tmp/cod-jev-risk.json --online --json

O mesmo comando aceita priority, bug, branch, verify ou cost, com os campos JSON da respetiva capacidade. Pode retornar só a decisão local sem API; isso é normal, não é uma falha. Perguntas relacionadas podem ser avaliadas numa única chamada dentro de jev_decisions.py sem perder os filtros de segurança.

## Contabilidade e handoff

    python3 .agent/tools/jev_router.py usage --json

Registar tarefa, branch/SHA, capability, source, modelo, confiança, tokens, custo estimado e decisões; comparar com saldo real no painel TypeSafe. Se sem valor, se o resultado conflitar com critérios do jogo ou se houver risco de cobrança inesperada, interromper chamadas pagas e voltar à análise local. Reaproveitar decisões anteriores em vez de consultar Jev de novo para o mesmo estado.

Importante: os scripts não lançam a sessão Claude Code Web, não criam novos agentes, não validam a titularidade do saldo nem asseguram limites globais entre VMs. A primeira consulta real depende da sessão do Capitão com conta/billing confirmado.
