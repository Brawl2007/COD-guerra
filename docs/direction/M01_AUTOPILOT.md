# M01-FINISH — protocolo permanente do Capitão Opus

**Missão:** concluir a M01 Tczew inteira; não esperar nova tarefa por hora.
**Backlog vivo e critérios:** https://github.com/Brawl2007/COD-guerra/issues/72
**Âmbito:** desenvolvimento do protótipo jogável, integração dos PRs de M01, validação e preparação para aceitação humana. Não substituir o objetivo permanente por uma sub-tarefa isolada (p. ex. #71).

## Antiduplicação executável e candidata única

- Registo canónico inicial: `.agent/m01-task-registry.json`, com T00–T52, evidências/branches e estados conservadores. **Um índice não é certificado de integração.**
- Antes de cada tarefa: `python3 .agent/tools/m01_task_registry.py check TXX --live` e ler a issue #72. Não criar outra tarefa já marcada `DELIVERED_BRANCH`, `DELIVERED_PR` ou `IN_CANDIDATE_UNVERIFIED`. Usar commits e PRs existentes.
- Apenas depois de verificar que TXX é `UNKNOWN` e sem dono: `python3 .agent/tools/m01_task_registry.py claim TXX --sha "$(git rev-parse HEAD)"`. A criação de `claims/m01-txx` é atómica; conflito = não implementar duplicado. Ver `AGENTS.md`.
- **PR #76 foi integrado na main**; em 2026-10-16 a candidata única posterior é o **PR #80**. Antes de trabalhar, revalidar no GitHub se o #80 continua ativo e qual a sua HEAD. Não criar candidata concorrente.
- O histórico do CI do #76 não deve ser usado como prova do HEAD atual. Verificar os checks da candidata atual no mesmo SHA, investigar falhas de autoridade com rigor e não afrouxar proteções. Não afirmar CI verde com base em 502 testes locais.

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

## Reserva exclusiva e passagem de turno entre sessões

**Obrigatório:** ler `docs/direction/M01_INTEGRATOR_LEASE.md` antes de integrar. O estado remoto único já existe em `coordination/m01-integration-state:.agent/coordination/m01-integrator.json`.

- **Migração:** a reserva começa PAUSED, não FREE. Não iniciar integrações novas por este protocolo até o PR #84 ser validado e confirmar que todas as sessões legadas saíram da candidata; ativar FREE por CAS com evidência.
- Cada execução horária começa por verificar o lock e as reservas de tarefas existentes. Se um chat já está a integrar, outros não modificam a candidata, mesmo que tenham passado várias horas; continuar só trabalho independente ou terminar sem gastar tokens.
- Quem termina uma tarefa totalmente concluída pode integrá-la diretamente **se conseguir a reserva exclusiva**. Caso contrário, sinaliza PR não-draft como READY após provas e deixa na fila única.
- O lock exige atualização atómica do ficheiro via SHA de conteúdo. Via GitHub CLI autenticado usar `.agent/tools/m01_integration_lease.py`; via MCP usar fetch_file/update_file para o mesmo ficheiro. Nunca criar locks paralelos.
- Antes de cada push, confirmar que a sessão ainda é proprietária e que o HEAD da candidata coincide com a SHA pinada; se mudou, parar e reconciliar. Sem force.
- No fim, registar código integrado, SHA, testes, CI pendente, próximos passos e libertar lock. O próximo horário **retoma** este estado, não reinicia tarefa nem reexecuta CI idêntico.
- Se a sessão anterior desaparecer, não roubar reserva apenas por timeout. Sem prova de encerramento, bloqueia-se a integração e mantém-se trabalho independente. Recuperação exige confirmação de inatividade e CAS.

## Regra anti-inatividade — continuidade produtiva sem duplicações

Se a primeira tarefa escolhida estiver bloqueada, **não terminar a hora automaticamente**. Verificar em sequência: (1) tarefas próprias incompletas e handoff, (2) PR completo READY para integração apenas com lock livre e ativo, (3) CI falhado do HEAD com correção isolada permitida, (4) tarefa parcial livre e recuperável sem violar claims, (5) TASK_ID novo realmente livre e independente. Preferir terminar tarefas existentes a abrir novas fatias. Não ficar à espera com Opus ativo de Sonnet ou CI; recolher o resultado/handoff e executar trabalho independente quando seguro.

Uma sessão da Routine pode executar vários passos úteis, mas não deve iniciar o mesmo trabalho que outra sessão ativa. Se todas as frentes estiverem ocupadas ou dependentes de aprovação humana, terminar rapidamente com uma única linha explicativa para poupar tokens. Seguir `docs/direction/M01_INTEGRATOR_LEASE.md`.

## Ação em cada execução da Routine

1. A sessão principal Opus é o Capitão; **não iniciar `captain` como subagente**, pois subagentes aninhados foram bloqueados na Cloud. Ler este protocolo e a issue #72.
2. Consultar estado real de main, PRs abertos, branches empilhadas, runs Actions, checkpoints read-only, últimos handoffs e Task Contracts. O HEAD, não a memória, determina o que foi feito.
3. Retomar primeiro o trabalho inacabado **da própria Routine** na mesma branch, desde que não esteja atualmente ocupado por outro executor. Se não existir trabalho próprio, escolher o próximo bloqueio no caminho crítico de conclusão da M01.
4. **Prioridade:** integrar/certificar cadeia V2→V7 e entregas dependentes; corrigir problemas concretos nos candidatos; completar gameplay e apresentação, testar performance, propor consolidação. Os PRs #65/#66/#70 e a issue #71 são itens de trabalho a avaliar, não ordens fixas permanentes.
5. Dividir internamente o objetivo em tarefas pequenas verificáveis, sem pedir ao utilizador uma nova tarefa a cada hora. Fazer mudanças reais (código, testes, integração isolada, evidência), com branch própria, PR e revisão independente. Se um PR depende de outro, usar base/stack correto, sem alterar o branch alheio.
6. Delegar leitura barata a Haiku; implementação/testes a Sonnet; decisões de arquitetura e revisão crítica a Opus. Maximizar velocidade sem gastar tokens em inspeções duplicadas nem diagnósticos intermináveis.
7. Não reexecutar testes caros quando o HEAD e evidência são idênticos. Quando um bloqueio requer aprovação humana, preparar proposta verificável e **passar a outra tarefa segura e independente**; não declarar «não há trabalho» apenas porque existem muitos PRs.
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

O agendamento horário abre **sessões separadas**, não um trabalhador ininterrupto. Quando houver quotas/erros externos, documentar e retomar no próximo horário. Não prometer 24/7 nem conclusão sem dependências humanas.

## Fonte de verdade

1. Estado Git e checks no HEAD correspondente;
2. issue #72 e PRs/commits efetivos (não apenas descrições);
3. `DEVELOPMENT_STATUS.md`, `IMPLEMENTATION_PLAN.md`, `PROJECT_SPEC.md`, `RUNBOOK.md`;
4. `.claude/agents/captain.md`, Task Contracts e handoffs estruturados;
5. checkpoint Cloud read-only, **não** estado automático restaurado.

Este protocolo sobrepõe **prioridades operacionais**, não revoga limites de segurança definidos noutros ficheiros.
