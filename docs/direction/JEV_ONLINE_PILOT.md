# Jev real — piloto de até 20 consultas (TypeSafe / Claude Code Web)

**Autorização do utilizador em 2026-10-17:** usar Jev real com uma conta onde o utilizador refere ter US$5 disponíveis. Isto autoriza **somente um piloto controlado** na branch de infraestrutura `infra/claude-web-single-captain-v1`, não gastos ilimitados e não prova de que o proxy cobra a conta pretendida.

## O que é e para que serve

- Jev é um modelo de **decisões estruturadas**, não um substituto do Opus ou do Sonnet para escrever código.
- Usar quando a classificação é realmente ambígua: delegação de tarefa difícil, priorização, risco, verificação proporcional. Para decisões evidentes, **regras locais sem consumo**.
- Usar descrição de tarefa curta e sanitizada, **sem segredos, tokens, credenciais ou dados pessoais**.
- O Capitão Opus permanece único; Jev não cria agentes, não modifica Git, não escolhe permissões e não autoriza deploy/merge.

## Segurança e orçamento

- Preço oficial consultado em 2026-10-17: **US$0,042 por milhão de tokens de entrada** para Jev 1.14/1.13; output gratuito. Confirmar preços da conta antes de ampliar: https://docs.typesafe.ai/models
- Primeira experiência: **20 chamadas pagas no máximo por ledger persistente da VM**, incluindo `jev_decisions.py` e `jev_router.py`, com guarda adicionada a `effective_limit()`. São chamadas, **não** um teto em dólares.
- Nas VMs efémeras o ledger pode reiniciar. Para um teto financeiro confiável, definir um **limite/bloqueio real no painel TypeSafe**, caso esteja disponível. Não prometer que o script protege os US$5 entre sessões.
- Cloud Web sem `COD_JEV_WEB_PAID_APPROVED=1`: limite efetivo **ZERO** para pedidos pagos mesmo com proxy que injeta credenciais.
- **Apenas** `.agent/tools/jev_web_paid_pilot.py --online` é autorizado a aplicar esse opt-in nesta etapa. Outras rotas continuam offline; não exportar `COD_JEV_WEB_PAID_APPROVED=1` na sessão global.
- Proxy `api.typesafe.ai` usado sem chave do utilizador, exclusivamente no Web; não instalar SDKs nem copiar credenciais. A associação do saldo de US$5 a esta rota precisa ser confirmada no painel da conta.
- O preço do modelo não inclui custos de outros modelos, ferramentas, serviços intermediários nem o próprio Claude.

## Passo 1: confirmação sem API paga

Na **única sessão** Opus Claude Code Web, checkout limpo da branch indicada:

```bash
git branch --show-current
git rev-parse HEAD
git status --short
python3 .agent/tools/cloud_web_preflight.py
python3 -m unittest discover -s .agent/tests -p 'test_jev_web_paid_pilot.py' -v
python3 .agent/tools/jev_web_paid_pilot.py \
  --role implement --risk medium --complexity medium \
  --description "Classificar alteração restrita de infraestrutura dos agentes" --json
```

A chamada acima é **offline**; deve devolver `mode=offline_preview` e **não** cobrir despesas reais.

## Passo 2: UMA consulta real, curta

Se o utilizador confirmou no painel TypeSafe que o proxy é da sua conta, continuar:

```bash
python3 .agent/tools/jev_web_paid_pilot.py \
  --role implement --risk medium --complexity medium \
  --description "Escolher implementador para pequena tarefa agentic de risco medio" \
  --online --json
```

Aceitação: `source=jev` com `usage.input_tokens`/modelo/confiança, ledger registado; caso contrário registar fallback `no_key`, `error`, `budget_exhausted` ou outra razão real. Não repetir automaticamente chamadas com falha. O CLI não envia credenciais explícitas nem publica segredos.

Conferir `python3 .agent/tools/jev_router.py usage --json` e o painel TypeSafe após esta chamada. **Só continuar** com novas consultas se a cobrança, os limites e a utilidade estiverem claros. Nunca lançar 20 chamadas só para gastar saldo.

## O que ainda não é automático

A ferramenta `cloud_web_workflow.py` mantém Jev offline de propósito; o piloto online é uma invocação separada, por decisão expressa do Capitão. Não alterar `main`, PR #80, PR #84 ou executar M01. Não iniciar nova sessão Capitão, Agent Teams ou Routine. Não ativar chamadas pagas em loops nem no preflight/CI.

Handoff: branch, SHA, decisão, `source`, modelo, confiança, tokens observados, custo **estimado**, chamadas acumuladas, saldo **confirmado na conta** (ou desconhecido), testes, riscos e próxima ação.
