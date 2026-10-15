# COD-guerra — arranque controlado do Capitão na Cloud

Estado: **proposta de configuração** (2026-10-15); não prova que uma Routine tenha sido criada ou iniciada.
Preparação feita sem executar Claude, TypeSafe ou Fable.

## Dependências e autorização

- PR #60 foi integrado na `main`; PR #67 (Jev proxy) e PR #68 (deploy manual) aguardam aprovação **explícita** para merge. Confirmar HEAD e CI antes de autorizar integração; não os integrar automaticamente.
- Esta alteração acrescenta `COD_GUERRA_INSTALL_GIT_GUARDS=1` ao `SessionStart`, apenas em cloud, sem mudar o diagnóstico inicial só de leitura.
- Nunca atualizar `main`, fazer merge ou deploy sem autorização humana específica. Não usar `git push --force`, `git reset --hard`, nem publicar checkpoints sem autorização separada.
- A existência do hook local não substitui branch protection/rulesets. O hook pode ser contornado (por exemplo com `--no-verify`); aplicar a proteção no GitHub quando as permissões o permitirem.

## Ambiente Claude Code Cloud (definir na interface do utilizador)

Abrir https://claude.ai/code > seletor de ambiente > editar ambiente cloud. Guardar as variáveis não secretas:

```dotenv
COD_GUERRA_INSTALL_GIT_GUARDS=1
COD_GUERRA_AUTOINSTALL_DEPS=1
COD_JEV_AUTH=proxy
COD_JEV_PILOT=1
```

Eliminar `COD_JEV_LIMIT=10` caso esteja definido, conforme autorização Jev sem teto de 2026-10-13. Não guardar `TYPESAFE_API_KEY` nem `ANTHROPIC_API_KEY` em variáveis visíveis, código ou Git. Se a configuração de faturação/subscrição Claude mudar, verificar `/status` antes de autorizar trabalho continuado.

Em **Network secrets**, confirmar segredo apenas para `api.typesafe.ai` com header `Authorization`, prefixo `Bearer`, e a chave TypeSafe como valor. Não colar a chave em tarefas, logs ou mensagens. Se estiver indisponível, manter o Jev desativado; o Capitão deve usar regras offline. Configurar acesso de rede apenas aos domínios necessários.

`COD_GUERRA_AUTOINSTALL_DEPS=1` permite executar `npm ci` com a flag remota. O hook tenta omitir a instalação quando o `package-lock` não mudou. Este passo tem efeitos locais e não deve ser ativado no diagnóstico inicial.

## Pré-voo numa nova sessão depois da configuração

1. Confirmar branch, HEAD, remoto e estado Git. Nunca trabalhar diretamente na `main`.
2. Confirmar o hook: `bash .agent/tools/install-git-guards.sh --check`. Se recusar instalar, **parar qualquer push** e investigar `core.hooksPath`.
3. `python3 .agent/tools/claude_setup_check.py` (sem chamadas de modelos adicionais).
4. `python3 .agent/tools/jev_router.py check-key` e `python3 .agent/tools/jev_router.py usage`. O resultado proxy não autentica a chave real. Evitar chamada Jev paga só para demonstração.
5. `python3 .agent/tools/cloud_checkpoint.py list` e `python3 .agent/tools/task_discovery.py`. Não publicar checkpoints.
6. Localizar PRs abertos e tarefas documentadas. Validar por Git/CI antes de assumir que uma tarefa ficou incompleta.
7. Só então executar uma pequena tarefa segura numa branch isolada, abrir PR e guardar handoff verificável.

## Routine Cloud

Abrir https://claude.ai/code/routines e criar Routine do tipo cloud, selecionando:

- Repositório: `Brawl2007/COD-guerra`
- Ambiente: o configurado acima
- Modelo da sessão principal: Opus como Capitão (não lançar `captain` como subagente, pois na validação não conseguiu criar outros agentes).
- Conectores: somente os indispensáveis; não ativar ferramentas pagas extra sem autorização.
- Inicialmente: `Run now` para confirmar delegação, branch/PR e hooks. Depois, se validar, ativar agendamento recorrente **hourly**, respeitando quotas e limites do serviço.
- Não criar Routines concorrentes com o mesmo escopo.

### Prompt sugerido para a Routine

> És a sessão principal e o Capitão Opus do COD-guerra. Lê CLAUDE.md, AGENTS.md, .claude/agents/captain.md e o estado Git real. Não atuas como subagente. Faz diagnóstico de segurança e continuidade antes de qualquer alteração. Consulta checkpoints e tarefas/PRs existentes; nunca repitas uma entrega já concluída, em curso ou pendente de revisão. Escolhe apenas uma tarefa ainda necessária de M01, com impacto concreto na jogabilidade e escopo contido. Para trabalho simples usa Haiku, para implementação e testes Sonnet, e reserva Opus para arquitetura/revisões críticas. Não reexecutar investigação quando Git ou testes podem decidir. Trabalha numa branch isolada e cria um PR; usa testes e revisão independente antes de afirmar sucesso. Não alterar main/master, fazer merge, deploy, force-push, reset --hard, publicar checkpoints nem comprar serviços sem autorização específica. Jev pago está autorizado segundo a política do projeto; Fable pago e outras APIs não estão. Se a tarefa precisa de autorização, para e entrega handoff. No fim reporta TASK_ID, BRANCH, HEAD completo, o que mudou e não mudou no jogo, testes/CI, evidências, bloqueios e ação seguinte. Otimiza velocidade, paralelização útil e tokens sem sacrificar qualidade.

Cada execução da Routine inicia uma sessão nova: checkpoints só de leitura não mantêm automaticamente todo o estado; usar HEAD, PRs, evidências e handoffs como fonte de verdade. O intervalo mínimo de uma Routine agendada é uma hora.

## Critérios para ativação recorrente

- [ ] PRs #67 e #68 aprovados e integrados separadamente, com checks vinculados ao HEAD atual; ou branch de execução definida explicitamente e segurança equivalente
- [ ] Ambiente e segredo Jev configurados sem expor credenciais
- [ ] Pre-push guard confirmado na sessão cloud e branch protection analisada
- [ ] Teste read-only da sessão principal, delegação Haiku/Sonnet e handoff aprovado
- [ ] Continuidade entre sessões validada, ou modo alternativo por PRs/handoffs sem repetição
- [ ] Routine criada pelo utilizador, sem permissão implícita para merge, deploy ou publicação de checkpoint

Documentação oficial: https://code.claude.com/docs/en/cloud-environments e https://code.claude.com/docs/en/routines.
