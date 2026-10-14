# COD-guerra — checklist de prontidao cloud (PR #60)

Este documento regista o que pode ser verificado sem gastar tokens Claude.
A existencia de agentes, tests e workflows no GitHub **nao prova** que o Claude
Code Cloud aceita todos os nomes, parametros ou permissoes.

## Preparado na branch do PR

- Agent profiles, Skills, Hook de seguranca Git e configurações em .claude/.
- Task Graph, descoberta/recuperacao local, Context Packets e handoff curto.
- Cloud checkpoints em branch separada: list/get, publish explicito, testes
  contra remotos Git locais, e bloqueio de publish de main/HEAD detached.
- CI Python com unittest, verificacao de sintaxe Python/Bash e configuracoes
  JSON. Tambem reage a pushes na branch de preparacao; nao invoca modelos IA.
- CI do jogo via pages.yml em pull_request; nao realiza deploy de PR.
- SessionStart: `npm ci` apenas quando
  `CLAUDE_CODE_REMOTE=true` e `COD_GUERRA_AUTOINSTALL_DEPS=1`.
  O primeiro diagnostico nao instala nada.
- Jev/TypeSafe: autorizacao dada em 2026-10-13 para chamadas pagas sem teto de
  gastos/chamadas. Os scripts do checkout usam o ledger local, admitem limites
  opcionais e nao possuem chave no Git. Fable pago e outros fornecedores
  continuam sem autorizacao. O provedor tem regras proprias de creditos.
- Main nao deve ser alterada sem autorizacao especifica; sem merge automatico,
  force push, deploy ou gravacao automatica de checkpoints no rollout inicial.

## Validacoes por executar com Claude Code Cloud

1. Rever / confirmar manualmente o PR #60 antes de merge na main;
   nao fazer merge como parte do diagnostico.
2. Confirmar que uma Routine na cloud realmente usa o repo e commit
   esperados, carrega `.claude/agents/captain.md`, Skills e Hooks.
3. Confirmar o suporte real a `Agent(...)`, nomes de agentes, modelos e
   niveis de esforço. Nao assumir que 30 perfis implicam 30 agentes ativos.
4. Executar um teste read-only de delegacao de uma tarefa curta (Haiku) e
   verificar o handoff e o custo/consumo efetivo da sessao.
5. Verificar o `origin` e se a cloud tem permissao de criar/atualizar
   `refs/heads/cod-guerra/cloud-state`. Antes de permissao explicita para
   gravacao cloud, usar somente `cloud_checkpoint.py list/get`.
6. Somente depois de provar a recuperacao de duas sessoes e as regras Git,
   considerar ativar `publish` e agendamento recorrente.
7. Validar se a plataforma permite a cadencia pedida, retries e limites
   reais de quota do Max 5x. Nem o Jev ilimitado nem o GitHub Actions
   eliminam limites do Claude Max/servico.

## Regras para o diagnostico inicial

- Sem `npm ci` por Hook, sem alterar main, sem merge/deploy.
- Nao instalar outros servicos ou executar Fable pago.
- Nao gravar checkpoints sem a autorizacao separada e as permissoes testadas.
- Reportar resultados factuais de cada etapa, erros e o HEAD verificado.
- Testes verdes de CI nao substituem delegacao real nem revisao de seguranca.

## Provas automatizadas

Workflow de agentes: `.github/workflows/agentic-python-tests.yml`.
Workflow de jogo: `.github/workflows/pages.yml`.
Para qualquer alegacao de testes passados, citar o ID e o SHA da execucao
correspondente; o historico nao substitui os checks do HEAD atual.

## Ligacoes de validacao

- PR: https://github.com/Brawl2007/COD-guerra/pull/60
- CI Python: https://github.com/Brawl2007/COD-guerra/actions/workflows/agentic-python-tests.yml
- CI jogo: https://github.com/Brawl2007/COD-guerra/actions/workflows/pages.yml

A revisao da descricao do PR deve refletir os checks reais, nao apenas este
documento. O primeiro diagnostico Claude Cloud continua pendente.
