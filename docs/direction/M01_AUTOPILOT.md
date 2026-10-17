# M01-FINISH — protocolo permanente do Capitão Opus (Cloud Web)

**Missão:** concluir a M01 Tczew inteira; não esperar nova tarefa por hora.
**Backlog vivo e critérios:** https://github.com/Brawl2007/COD-guerra/issues/72
**Âmbito:** desenvolvimento do protótipo jogável, integração dos PRs de M01, validação e preparação para aceitação humana. Não substituir o objetivo permanente por uma sub-tarefa isolada (p. ex. #71).

## Antiduplicação executável e candidata única

- Registo canónico inicial: `.agent/m01-task-registry.json`, com T00–T52, evidências/branches e estados conservadores. **Um índice não é certificado de integração.**
- Antes de cada tarefa: `python3 .agent/tools/m01_task_registry.py check TXX --live` e ler a issue #72. Não criar outra tarefa já marcada `DELIVERED_BRANCH`, `DELIVERED_PR` ou `IN_CANDIDATE_UNVERIFIED`. Usar commits e PRs existentes.
- Apenas depois de verificar que TXX é `UNKNOWN` e sem dono: `python3 .agent/tools/m01_task_registry.py claim TXX --sha "$(git rev-parse HEAD)"`. A criação de `claims/m01-txx` é atómica; conflito = não implementar duplicado. Ver `AGENTS.md`.
- **Situação atual (verificar novamente):** o PR #76 já foi integrado em main; a candidata de desenvolvimento é o PR #80, DRAFT. A reserva exclusiva de integração preparada no PR #84 permanece **PAUSED**. Enquanto estiver assim, não alterar #80 nem assumir posse da integração.
- **Provas:** T38 #82 parcial; T43 #81 parcial; T47 #85 parcial; T48 #86 implementação reportada completa mas ainda não integrada. Os estados requerem reconfirmação no HEAD e CI de cada tarefa.
- Não criar nova candidata. Não ocultar falhas de testes nem confundir rascunho/commit com aceitação.

## ENTREGA OBRIGATÓRIA — transformar TODO o trabalho existente em jogo utilizável

**Prioridade superior a criar novas funcionalidades:** aproveitar tudo o que já foi efetivamente produzido para a M01 (código, assets originais licenciados, animações, armas, efeitos, áudio, missões, correções e testes), sem deixar melhorias prontas esquecidas em PRs isolados.

1. Criar e manter **uma única branch candidata de integração/jogo M01** (se já existir, retomá-la), derivada da base adequada e sem tocar na `main`. Trabalhar com uma *staging branch* ou PR rascunho para aprovação. Não criar nova branch candidata a cada hora.
2. Analisar cada PR/branch M01 existente, **reutilizar os commits e funcionalidades válidos**, respeitar ordem de dependências V2–V7 e PRs filhos; resolver conflitos sem apagar melhorias anteriores nem reimplementar algo já feito. Evitar integrar duplicados (#61/#62) ou trabalho ainda falhado (#70) sem correção/verificação. Nunca integrar cegamente apenas porque um PR tem CI verde.
3. Fazer **integrações reais com código**, executar testes de unidade, build, Playwright, percurso M01 e avaliação visual/sonora no HEAD combinado; corrigir regressões na branch candidata com histórico rastreável. Conservar invariantes de saves, simulação determinística e direitos dos assets.
4. Manter um **inventário de entrega rastreável** para todo o trabalho identificado: origem (PR/commit), `INTEGRADO + VERIFICADO`, `PRONTO PARA INTEGRAR`, `EM CORREÇÃO`, `BLOQUEADO` ou `EXCLUÍDO COM JUSTIFICAÇÃO`; evidência e HEAD. Não confundir um documento, PR draft ou screenshot isolado com funcionalidade jogável integrada.
5. Em cada marco significativo entregar **um pacote jogável e reproduzível** a partir da branch candidata: comandos exatos de `npm ci`, `npm run dev`/`npm run build` e como iniciar M01, commit/PR, relatórios CI, screenshots e vídeo reais quando possíveis. Se uma preview Web exigir deploy/publicação, **pedir aprovação para esse deploy**; não inventar link público nem publicar sem autorização.
6. **No final de cada execução** mostrar claramente o acumulado entregue até ao momento, não só alterações da última hora: o que está integrado no jogo; o que foi apenas desenvolvido mas ainda não integrado; o que falta; como jogar a versão candidata; testes e HEAD; próxima operação concreta já escolhida. Atualizar o registo na issue #72 apenas quando houver evolução factual, não enviar relatórios duplicados.
7. Se um PR estiver bloqueado, **continuar integração das outras áreas independentes**. A M01 inteira é o objetivo; não ficar horas fazendo só inventário/diagnóstico ou tarefas novas quando existem entregas por consolidar.
8. O Capitão é responsável por preparar e **entregar a candidata completa** sem intervenção horária do utilizador. Pedir apenas autorizações realmente necessárias: merge para `main`, deploy/publicação, gastos não autorizados, autoria/licenças e playtest/decisões humanas.

**Aceitação:** uma branch/PR candidato único, funcional e validado, com mapa de proveniência e lacunas transparentes; não chamar «tudo entregue» se funcionalidades aprovadas permanecem dispersas. O merge final ou publicação continuam reservados à decisão humana.

## Ação na sessão única Claude Code Web

1. A sessão principal Opus é o único Capitão. **Não iniciar `captain` como subagente** nem lançar uma Routine concorrente. Ler este protocolo, `docs/direction/CLOUD_WEB_SINGLE_CAPTAIN.md` e a issue #72.
2. Consultar estado real de main, PRs abertos, branches empilhadas, runs Actions, checkpoints read-only, últimos handoffs e Task Contracts. O HEAD, não a memória, determina o que foi feito.
3. Retomar primeiro trabalho incompleto com reserva válida e HEAD conhecido, desde que não esteja atualmente ocupado por outro executor. Se não existir trabalho próprio, escolher o próximo bloqueio no caminho crítico de conclusão da M01.
4. **Prioridade:** verificar e concluir entregas pendentes em PRs existentes (incluindo T38/T43/T47/T48), corrigir problemas concretos, certificar regressões e preparar integração pela fila segura do PR #80 apenas quando o protocolo #84 estiver ativo.
5. Dividir internamente o objetivo em tarefas pequenas verificáveis, sem pedir ao utilizador uma nova tarefa a cada hora. Fazer mudanças reais (código, testes, integração isolada, evidência), com branch própria, PR e revisão independente. Se um PR depende de outro, usar base/stack correto, sem alterar o branch alheio.
6. Delegar leitura barata a Haiku; implementação/testes a Sonnet; decisões de arquitetura e revisão crítica a Opus. Maximizar velocidade sem gastar tokens em inspeções duplicadas nem diagnósticos intermináveis.
7. Não reexecutar testes caros quando HEAD e evidência são idênticos. Não usar polling contínuo para esperar CI/Playwright. Quando um bloqueio exigir aprovação humana ou houver um comando demorado, guardar handoff e terminar; outra tarefa só começa se houver orçamento e reserva segura.
8. Registar progresso durável na issue #72 somente após alterações reais: branch, SHA, PR, checks, estado, pendências e próxima ação. O contexto de cada execução Cloud pode desaparecer, por isso não confiar apenas em estado local ou narrativa de chat.
9. Respeitar limites de segurança do projeto: nunca push/merge em main, deploy, force-push, reset --hard, publicação de checkpoints, contas/compra de serviços sem autorização específica. Jev pago permitido segundo configuração, Fable pago e outros gastos proibidos sem aprovação.
10. Cada execução entrega: progresso da M01 (provas); trabalho implementado nesta rodada; o que mudou e não mudou no jogo; branch e SHA; PR; CI; próxima ação já escolhida. Não enviar notificações repetitivas se nada mudou.

## Critérios de conclusão

O Capitão **não** pode chamar M01 «concluída» até:
- Integração certificada de gameplay/arte/áudio aprovado numa base candidata única; a main só recebe por merge humano autorizado;
- 12/12 objetivos M01, checkpoints A–D, saves/restores, combate e debrief demonstrados numa sessão real, com regressões preservadas;
- testes unitários, `npm run build`, Playwright e evidências reais vinculadas ao HEAD;
- desempenho e compatibilidade avaliados (Chromebook; mobile conforme prioridade acordada);
- assets/licenças revistos e conteúdo provisório explicitamente identificado;
- playtest humano e decisão de aceitação final quando necessários.

A Routine antiga fica pausada. O Cloud Web executa uma única sessão principal com subagentes, não um processo eterno. Em limite de contexto/quota, guardar commits e handoff para uma sucessora única, sem relançamento automático. Não prometer 24/7 nem conclusão sem dependências humanas.

## Fonte de verdade

1. Estado Git e checks no HEAD correspondente;
2. issue #72 e PRs/commits efetivos (não apenas descrições);
3. `DEVELOPMENT_STATUS.md`, `IMPLEMENTATION_PLAN.md`, `PROJECT_SPEC.md`, `RUNBOOK.md`;
4. `.claude/agents/captain.md`, Task Contracts e handoffs estruturados;
5. checkpoint Cloud read-only, **não** estado automático restaurado.

Este protocolo sobrepõe **prioridades operacionais**, não revoga limites de segurança definidos noutros ficheiros.
