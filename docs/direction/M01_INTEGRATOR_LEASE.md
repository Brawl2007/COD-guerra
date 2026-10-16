# Integração única M01 — sessões horárias (v1)

**Missão:** a Routine Cloud corre a cada hora, mas tarefas e CI podem demorar várias horas. Só uma sessão pode alterar a candidata jogável de cada vez. Qualquer sessão (incluindo a que terminou a tarefa) pode ser integradora se adquirir a reserva exclusiva.

**Situação verificada em 2026-10-16:** PR #76 integrado na main; candidata atual PR #80, branch claude/quirky-heisenberg-9l4m7b. Revalidar antes de agir. Não assumir que um PR é a candidata para sempre.

## Estado durável, já inicializado no GitHub

Branch de coordenação: coordination/m01-integration-state
Ficheiro: .agent/coordination/m01-integrator.json

Este ficheiro guarda status (PAUSED/FREE/HELD), owner (session ID), token, candidate, candidate_sha, generation, updated_at e handoff.

O estado inicial foi colocado em PAUSED para **não disputar a candidata com sessões Claude antigas ainda ativas**. O processo só pode ser ativado depois de os antigos integradores pararem e fazerem handoff. A branch de coordenação NÃO é um jogo, NÃO é integrada na main e NÃO altera a candidata.

Cada transição lê o SHA do conteúdo atual e envia-o ao GitHub Contents API. Se a versão mudar por outra sessão, a atualização falha e o agente pára. Isto é uma reserva cooperativa, não uma substituição das permissões do GitHub.

## Inicio de cada execução horária

1. Ler o estado remoto, a candidata e o registo da issue #72 / tarefas.
2. Se estiver HELD, não alterar a candidata nem iniciar um segundo integrador. Continuar uma tarefa independente reservada ou terminar imediatamente para poupar tokens.
3. Se estiver PAUSED, não integrar: a migração das sessões antigas ainda não foi confirmada. Se estiver FREE e houver PRs completos prontos, tentar adquirir a reserva atomicamente. O mesmo chat que concluiu uma tarefa pode tornar-se integrador.
4. Uma hora decorrida NÃO torna a reserva inválida. Não a roubar só por idade.
5. Antes de cada push à candidata, confirmar owner/token e que o HEAD remoto ainda corresponde à SHA guardada. Se divergir, parar.

## Ativação única, após migração segura

Enquanto o PR #84 estiver pendente de revisão/testes e houver sessões anteriores sem esta regra, o estado fica PAUSED. **Não** se deve adquirir o lock nem escrever na candidata por este sistema.

Após os checks do #84 e confirmação verificável de que as antigas sessões que editavam a candidata já terminaram/fizeram handoff, atualizar PAUSED -> FREE na branch de coordenação usando o mesmo SHA CAS.

Com CLI autenticada:

    python3 .agent/tools/m01_integration_lease.py activate --confirm-no-old-writers --reason "CONFIRMACAO DOCUMENTADA: sessoes antigas terminadas, HEAD e handoff verificados"

Sem CLI, o Claude pode aplicar a mesma transição via GitHub MCP fetch_file/update_file, incluindo geração+1, a SHA atual da candidata e o motivo. Se a atividade das antigas sessões for incerta, manter PAUSED. Não confundir confirmação verbal genérica com evidência de término.

## Fila de entregas READY

Quando um agente concluir TODOS os critérios de aceitação da tarefa:
- manter código e testes no PR de origem com SHA exato e provas verificáveis;
- retirar draft e inserir no corpo uma linha exata: M01-INTEGRATION: READY; alternativamente, usar a label m01-ready-to-integrate;
- não declarar pronto um PR de uma fatia parcial, em CI vermelho ou com critérios em falta.

O script devolve a fila de PRs sinalizados; o integrador ainda precisa de rever CI, duplicações, conflitos, dependências e licenças. READY não equivale a integrado.

## Comandos (quando gh estiver autenticado)

    python3 .agent/tools/m01_integration_lease.py status
    python3 .agent/tools/m01_integration_lease.py queue
    python3 .agent/tools/m01_integration_lease.py acquire --candidate claude/quirky-heisenberg-9l4m7b --owner "SESSION_ID"
    python3 .agent/tools/m01_integration_lease.py guard --token "TOKEN_DO_ACQUIRE"

O dono integra apenas PRs completos em pequenos lotes compatíveis, na candidata, nunca na main; usa git push normal (não force) depois de verificar que não houve alteração concorrente.

Depois de cada avanço seguro da candidata:

    python3 .agent/tools/m01_integration_lease.py advance --token "TOKEN_DO_ACQUIRE" --sha "NOVO_SHA_HEAD_40_HEX"
    python3 .agent/tools/m01_integration_lease.py heartbeat --token "TOKEN_DO_ACQUIRE"

Depois da validação e handoff (incluir SHA, testes e CI pendente, se houver):

    python3 .agent/tools/m01_integration_lease.py release --token "TOKEN_DO_ACQUIRE" --handoff "TXX + PR + SHA; testes; CI; pendências"

O token identifica a posse da sessão, não é uma credencial secreta; não o usar como mecanismo contra colaboradores maliciosos.

## Alternativa sem gh: ferramentas GitHub MCP

Se a Claude Cloud não tiver gh autenticado, usar o MESMO estado via GitHub MCP, sem inventar um segundo lock:

1. Ler .agent/coordination/m01-integrator.json com fetch_file e ref=coordination/m01-integration-state. Guardar o campo sha do blob, além do conteúdo.
2. Consultar get_pr_info (#80 ou sucessor) para obter o HEAD verdadeiro da candidata. Nunca apontar para main.
3. Se estado FREE, gerar um identificador único de sessão/token, gravar HELD, owner, candidate_sha, generation+1 e updated_at por update_file na BRANCH DE COORDENAÇÃO, passando exatamente o SHA de blob lido.
4. Se GitHub rejeitar o update_file por conflito ou rede, parar. Um segundo agente pode ter ganho a reserva.
5. Para guard/heartbeat/advance/release, reler a versão do ficheiro, comprovar token e HEAD, atualizar com o SHA mais recente via update_file. Cada operação é atómica e revalida o dono.
6. Se a sessão anterior estiver HELD, não alterar a candidata; não basta o updated_at ser antigo para tomar a posse.

**Tanto o script como o MCP usam uma única fonte de verdade.** Nenhuma sessão deve atuar como integradora sem conseguir confirmar a reserva.

## Integrações longas, CI e falhas

- Não manter Opus a consumir tokens enquanto o CI corre. Guardar resultados do HEAD atual, sair com handoff e deixar a próxima execução verificar o mesmo HEAD.
- Se houver validação pendente, o próximo integrador não promove esse HEAD como verde até ver os checks obrigatórios. Se ficar vermelho, corrigir antes de integrar mais trabalho dependente.
- Se uma sessão cair sem libertar HELD, tentar primeiro confirmar oficialmente que ela terminou. Só depois um operador pode executar recover com owner e generation exatos e uma razão verificável. **Não há recuperação automática baseada em timeout.**
- Se não houver prova de que a sessão parou, bloquear a integração, mas permitir tarefas independentes.
- Falhas de API/credenciais/CI são bloqueios reais; não contornar testes ou proteções.

## Critérios para concluir e integrar

Uma tarefa é CONCLUÍDA só quando todas as fatias e critérios de aceitação estão completos e provados. É INTEGRADA só depois de existir no HEAD da candidata, com verificações apropriadas (testes Node, build, Playwright, checks obrigatórios e evidência funcional conforme impacto). Um CI verde de outro commit não valida o HEAD novo.

Apenas uma candidata ativa; sem branches de jogo concorrentes, força, reset destrutivo, merge em main ou deploy sem autorização.

Teste offline do coordenador:

    python3 -m unittest discover -s .agent/tests -p 'test_m01_integration_lease.py' -v
