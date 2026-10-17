# Ponytail 5 — piloto limitado e reversível (Claude Code Web)

Estado: **skill oficial copiada para o projeto; não significa que o Claude Code Web já a tenha executado**.
Escopo inicial: infraestrutura `INFRA-...` em `infra/claude-web-single-captain-v1`. **Sem tarefas M01 nesta fase.**

## Fonte e licença

- Origem oficial: https://github.com/DietrichGebert/ponytail
- Skill upstream: `skills/ponytail/SKILL.md`, blob SHA `d64edd32265ba21cbf5270158f04e97d96925f27`, copiado integralmente para `.claude/skills/ponytail/SKILL.md`.
- Licença MIT upstream preservada em `.claude/skills/ponytail/LICENSE`.
- **Não instalámos o plugin global** nem os hooks oficiais do Ponytail: esses hooks injetariam regras noutros subagentes e poderiam interferir com as proteções já existentes.
- A skill aparece no repositório, mas a ativação no Sonnet ainda depende da chamada real `Skill(ponytail)` no Claude Code Web.

## Regras inegociáveis

1. **Qualidade do jogo > linhas e tokens.** Não encurtar funcionalidades necessárias, gráficos, cenários, animações, IA, física, simulação ou narrativa para diminuir LOC.
2. Preservar requisitos, código aprovado, testes, acessibilidade, segurança, tratamento de erros e compatibilidade. Não modificar `main`, PR #80, PR #84 nem fazer deploy.
3. Capitão Opus único; Jev sempre offline; Haiku só para leitura; implementação Sonnet; verificador e revisor independentes.
4. Ativar Ponytail somente numa tarefa `INFRA-...` autorizada e explicitamente identificada no contrato como `PONYTAIL_PILOT=full`. Não ativar em `CLAUDE.md` globalmente.
5. Nenhuma poupança de 53%, 45% ou semelhante é presumida. Medir por execução e não confundir tokens de saída com custo total.

## Como preparar um despacho com Ponytail

Na sessão **única** do Capitão Opus, abrir esta branch e confirmar um checkout limpo:

```bash
git branch --show-current
git rev-parse HEAD
git status --short
python3 -m unittest discover -s .agent/tests -p 'test_cloud_web_workflow.py' -v
python3 .agent/tools/cloud_web_workflow.py plan \
  --task-id INFRA-PONYTAIL-PILOT \
  --description "Pequena correção de infraestrutura previamente autorizada" \
  --file .agent/tools/ficheiro-real-a-validar.py \
  --risk low \
  --ponytail \
  --expect-sha "$(git rev-parse HEAD)"
```

`--file` é **exemplo**: substituir pelo ficheiro real e permitido pelo contrato. Não iniciar trabalho a partir deste exemplo sozinho. O script só emite um plano; não chama agentes. O Capitão envia ao **mesmo implementer Sonnet** a instrução para carregar uma vez `Skill(ponytail)`, e depois passa por verificação e revisão independentes.

Para linha-base, usar exatamente o mesmo comando **sem `--ponytail`**, sobre uma base Git equivalente e num ambiente isolado. Não repetir uma tarefa de produção já concluída só para obter dados. Fazer um piloto pequeno e reversível sem código de jogo.

## Critérios de aceitação

- Com `--ponytail`, o plano indica `ponytail_mode=full`; sem flag, `off`.
- Skill só no passo `edit`; não é carregada no Capitão, Haiku, verificador ou revisor.
- `--read-only --ponytail`, branch errada, checkout sujo ou falta da skill bloqueiam a execução.
- Testes e revisão aprovados no SHA efetivamente executado.
- Relatório: TASK_ID, branch/SHA, alterações, resultados reais dos testes, número de tokens observados (entrada/saída e por agente quando visíveis), tempo, linhas alteradas, limitações e próxima ação.
- Se qualidade cair, se não houver medição confiável ou se hooks forem alterados inesperadamente: manter a skill desativada (omitir `--ponytail`), registar motivo e não alargar a adoção.

**Limitação:** nenhum script desta preparação instala o plugin, abre sessões Claude, executa um subagente, controla quotas de forma rígida ou substitui um teste visual real.

## Resultado do piloto 1 — INFRA-PONYTAIL-PILOT (2026-10-17)

Tarefa: `plan` escrevia `.agent/tools/__pycache__` no `--root` (import in-process do `jev_router.py`),
o que fazia `test_ponytail_is_opt_in_and_only_for_sonnet_edit` falhar com "dirty checkout".
Correção `d838af9` (+8/−1): `sys.dont_write_bytecode` só durante `exec_module`, restaurado em `finally`.

| Execução | Agente | Ponytail | Tokens | Ferramentas | Tempo | Diff | Testes |
|---|---|---|---|---|---|---|---|
| Linha-base (worktree isolado) | `implementer` Sonnet | não | 19 258 | 5 | 79,9 s | +8/−1 | 7/7, Jev 104/104 |
| Despacho `--ponytail` | `implementer` Sonnet | **não carregou** | 19 755 | 6 | 68,5 s | idêntico | 7/7, Jev 104/104 |
| Ativação real (worktree isolado) | `general-purpose` Sonnet | **sim**, `Skill(ponytail)` | 72 076 | 8 | 96,3 s | +8/−1 | 7/7, Jev 104/104, red/green |

Verificador independente: PASS (red/green contra `8ac528a`, 240/240 em `.agent/tests`). Revisor: ACCEPT.
Gate `verify`: 59 541 tokens reportados → BLOCKED com `--token-stop` padrão 25 000; PASS com 70 000.

Constatações:
- A sessão carrega `.claude/agents/*.md` no arranque. Uma sessão iniciada em `main` usa o `implementer`
  sem a ferramenta `Skill`, logo o despacho `--ponytail` executa sem Ponytail. A skill em si é recarregada
  e funciona. Para pilotar, a sessão tem de arrancar já nesta branch.
- A ativação real não é comparável 1:1 (tipo de agente diferente). Não houve poupança observável nesta
  tarefa: as três soluções são equivalentes em código e qualidade.
- O `--token-stop` padrão (25 000) é inferior ao custo de um ciclo completo de 4 fases.

Recomendação: manter Ponytail **opt-in e desligado por defeito**; repetir o piloto numa sessão arrancada
nesta branch, com uma tarefa INFRA maior que permita diferenças de diff, antes de alargar a adoção.
