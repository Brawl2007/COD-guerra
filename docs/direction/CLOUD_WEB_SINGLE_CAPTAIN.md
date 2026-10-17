# COD-guerra — Claude Code Web com Capitão único

Estado: migração **em PR draft**, não ativada no `main`. O objetivo é reutilizar o sistema do Linux no ambiente remoto; o Chromebook não executa a equipa.

## Modelo de execução

- **Uma única sessão principal Cloud Web por vez**, modelo Opus, como Capitão. O operador mantém a Routine antiga PAUSADA. Não criar outra sessão coordenadora. Sessões Cloud não são uma VM permanente, e uma sessão não transfere automaticamente subagentes entre VMs.
- Os agentes do projeto em `.claude/agents/` são carregados pelo Claude Code Web. `captain.md` governa o papel principal quando explicitamente selecionado; numa sessão Web comum, o `CLAUDE.md` e o prompt de arranque abaixo instruem o modelo principal a cumprir esse papel. **Nunca invocar `captain` como um subagente**.
- Todas as **30 definições originais** do Linux permanecem versionadas; o Capitão pode delegar aos **29 tipos de agentes** através da allowlist Agent(...). Isto é disponibilidade, NÃO autorização para os iniciar simultaneamente. Os 29 trabalhadores têm maxTurns apropriado à função (6–24); o Capitão não deve retomar automaticamente subagentes que atinjam o limite.
- Fluxo inicial seguro: Opus Captain -> no máximo um `implementer` Sonnet -> `verifier` Sonnet -> `reviewer` Sonnet, quando a verificação for suficiente. Haiku `explorer`/`researcher` apenas para leituras realmente necessárias; `reviewer-critical` Opus somente mediante evidência de risco elevado. Não ativar `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`.
- `maxTurns` estabelece limite por invocação e devolve trabalho parcial; **não é teto de tokens nem impede um Capitão de mandar retomar**. O protocolo exige inspeção e uma decisão justificada antes de qualquer retomada. A UI continua sendo o controlo imediato da quota.

## Estado e segurança do projeto

- Estado vivo: Git HEAD, PR, testes comprovados no SHA, issue https://github.com/Brawl2007/COD-guerra/issues/72 e `.agent/m01-task-registry.json`. O registo histórico pode estar desatualizado; conferir o GitHub.
- PR #76 foi integrado em `main`. Candidata atual: PR #80 **draft**, separada de main.
- PR #84 de integrador exclusivo: **PAUSED**; enquanto assim, não escrever na candidata #80.
- Entregas relevantes: T38 #82 parcial, T43 #81 parcial, T47 #85 parcial, T48 #86 com implementação reportada concluída mas integração pendente. Revalidar estados atuais antes de usar; não começar tudo outra vez.
- Só aceitar integração na candidata quando #84 estiver validado, reserva de integrador exclusiva realmente ativa e os critérios/testes necessários comprovados no HEAD. Nunca mexer em main, deploy, forçar Git, apagar trabalho ou publicar cloud-state sem autorização específica.
- Para diminuir a quota: contexto mínimo, comandos determinísticos e saída curta; não ler pastas inteiras; não mandar 2+ agentes examinar a mesma coisa; não fazer polling constante; não repetir teste caro com HEAD idêntico.

## RTK e ferramentas que eram do Linux

- Os ficheiros `CLAUDE.md`, `AGENTS.md`, `.claude/agents/`, `.claude/settings.json`, hooks, skills e scripts *versionados* viajam com o checkout Git, sem precisar de copiar `~/.claude`.
- Programas instalados apenas no Linux do Chromebook **não viajam**: RTK, ferramentas de shell, configurações globais, MCPs locais, caches, tokens e integrações. Não declarar RTK disponível apenas porque funcionava no terminal.
- Diagnóstico remoto, sem instalações nem alterações: `python3 .agent/tools/cloud_web_preflight.py`. Este script verifica agentes/ficheiros/modelos, remoto, branch, RTK no PATH e ferramentas. É apenas inspeção; a compatibilidade de qualquer filtro RTK com logs e comandos deve ser validada antes de integrar no hook.
- `.claude/hooks/session-start.sh` continua *read-only* por padrão; `COD_GUERRA_AUTOINSTALL_DEPS=1` e `COD_GUERRA_INSTALL_GIT_GUARDS=1` só com opt-in consciente. Não instalar RTK nem rodar `npm ci` automaticamente neste PR.

## Protocolo de migração e teste de aceitação (apenas uma sessão)

1. Manter Routine antiga pausada e verificar que todas as sessões Opus antigas terminaram.
2. Rever este PR draft. Antes do merge, **arrancar sessão Web manual num checkout desta branch** (não assumir que um clone de `main` já contém os novos ficheiros).
3. Selecionar Opus. Executar `python3 .agent/tools/cloud_web_preflight.py` e guardar a saída sanitizada; não enviar segredos.
4. Ler `CLAUDE.md` e este documento. Verificar que os 30 ficheiros existem e a allowlist do Capitão cobre os 29 trabalhadores, incluindo as combinações especializadas. Testar só um Haiku de leitura curta (sem trabalho de gameplay), com handoff compacto.
5. Executar o diagnóstico de segurança e os testes Python da configuração, se existentes no checkout. Não iniciar nova T da M01 durante a migração.
6. Medir no UI utilização antes/depois e observar custo da execução; não comparar totais cumulativos exibidos como se fossem tokens cobrados.
7. Confirmar nenhum novo Capitão, nenhum Agent Teams, nenhum polling repetitivo, nenhum commit de gameplay, nenhum novo PR de candidata; recolher SHA/handoff.
8. Só depois da prova, decidir aprovar/mesclar **este PR de infraestrutura** com autorização separada. Rotina automática continua pausada até decisão distinta.

### Prompt curto para a sessão manual

> És a única sessão de Capitão Opus desta execução Cloud Web para COD-guerra. A Routine anterior continua pausada. Antes de qualquer implementação, consulta `CLAUDE.md`, `docs/direction/CLOUD_WEB_SINGLE_CAPTAIN.md`, issue #72, Git e `python3 .agent/tools/cloud_web_preflight.py`. Nesta primeira execução, faz SOMENTE o smoke test de agentes e configurações em modo leitura: confirma que os agentes reutilizados existem, que Haiku devolve uma resposta curta, que os hooks são seguros e que RTK está ou não disponível. Não trabalhes nas Txx. Não abras outras sessões de Capitão, não uses Agent Teams, não chames outros subagentes Opus/Fable/Jev. Não faças polling de tarefas. Não alteres main/#80/#84, nem deploy. Termina com relatório curto, SHA, testes executados, compatibilidades e limitações.

## Interrupção e handoff

- Ao detectar consumo anormal no UI, usar STOP nos subagentes ativos; a Routine pausada não para sessões antigas.
- Antes de sair, solicitar **um** checkpoint curto: `TASK_ID / STATUS / BRANCH / PR / SHA publicado / TESTES executados no SHA / BLOQUEIO / NEXT_ACTION`. Se houver diffs não guardados, publicar commit WIP na branch autorizada, distinguindo-o claramente de um commit validado.
- Se a VM expirar, trabalho de fundo ainda a decorrer não é restaurado. Um sucessor só retoma depois de confirmar que não existe outro Capitão ativo e de verificar Git e handoff.

## Lacunas conhecidas

- Não foi demonstrada compatibilidade de RTK na VM da nuvem.
- Não foi demonstrado um *hard cap* de tokens/quota; `maxTurns` sozinho não resolve isso.
- Exclusividade de Capitão nesta fase é **operacional** (uma sessão manual e Routine pausada), não um lease técnico distribuído implementado. Para automático simultâneo, seria indispensável um lease separado e testado; o lock do integrador #84 não serve para isso.
- Compatibilidade Cloud e execução de smoke test ainda exigem um arranque real em Claude Code Web. Nenhum teste local comprova consumo real.
