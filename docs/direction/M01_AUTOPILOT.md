# M01-FINISH — protocolo permanente do Capitão Opus

**Missão:** concluir a M01 Tczew inteira; não esperar nova tarefa por hora.
**Backlog vivo e critérios:** https://github.com/Brawl2007/COD-guerra/issues/72
**Âmbito:** desenvolvimento do protótipo jogável, integração dos PRs de M01, validação e preparação para aceitação humana. Não substituir o objetivo permanente por uma sub-tarefa isolada (p. ex. #71).

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
