# Configuração do Claude Code e dos agentes (2026-10-09)

Fonte: docs oficiais em code.claude.com (advisor, sub-agents, model-config, settings-reference,
agent-teams). Itens marcados *não confirmado* não vêm dessas páginas.

## Plano adotado

| Papel | Agente | Modelo / esforço |
|---|---|---|
| Planeia, decide, integra | `captain` (sessão principal) | Opus 5.5, high |
| Aconselha em 3 momentos | Advisor | Fable 5.1 (`/advisor fable`) |
| Lê código | `explorer`, `Explore` (substitui o Explore de origem) | Haiku, low, só leitura |
| Lê documentação e fontes | `researcher` | Haiku, low, só leitura + web |
| Implementa | `implementer` / `implementer-deep` | Sonnet, medium / xhigh |
| Verifica e revê | `verifier`, `reviewer` | Sonnet, high |
| Revisão crítica | `reviewer-critical` | Opus, max (só simulação, saves, integração, arquitetura) |
| Encaminhamento consultivo | Jev (`.agent/tools/jev_*.py`) | regras locais primeiro, teto de 3 chamadas pagas |
| Força de trabalho | 20 agentes `<modelo>-<esforço>` com função própria (tabela abaixo) | escolhidos pelo Captain por função |

## Funções dos 20 agentes de combinação

O Captain escolhe pela função; a descrição de cada agente repete-a. Qualquer alteração de código passa
sempre pelo `verifier` e pelo `reviewer`, seja quem for que a implementou.

| Agente | Função no desenvolvimento do jogo | Escreve? |
|---|---|---|
| `haiku-low` | Inventário: ficheiros, símbolos, assets, eventos, testes ("onde está X") | não |
| `haiku-medium` | Ler handoffs, relatórios, `mission.json`, manifests, `ASSET_CREDITS.md` | não |
| `haiku-high` | Texto e dados: legendas, HUD, diálogos, tabelas de estado, fixtures JSON (sem lógica) | sim |
| `haiku-xhigh` | Triagem de logs longos (testes, CI, Playwright); classificar queixas de playtest | não |
| `haiku-max` | Auditoria de coerência: `mission.json` × `STORY_BIBLE` × dossiês × `SOURCE_CHECK` | não |
| `sonnet-low` | Edições pequenas e seguras: constantes, afinação, correções de uma linha, fixtures | sim |
| `sonnet-medium` | Funcionalidades normais: HUD, áudio, props, handlers de eventos, missão + testes Node | sim |
| `sonnet-high` | Renderer (materiais, LOD, FX, viewmodel) e testes Playwright; verificações | sim |
| `sonnet-xhigh` | Bugs difíceis: animação/rig, IA de caminhos, determinismo, testes instáveis, saves | sim |
| `sonnet-max` | Mecânicas de combate e armas na simulação (ckm, IA inimiga, veículos), após desenho Opus | sim |
| `opus-low` | Julgamento rápido: queixas → tarefas, Task Contracts, prioridades do backlog | não |
| `opus-medium` | Desenho de sistemas (destruição, veículos, director, cobertura/IA); narrativa × gameplay | docs |
| `opus-high` | Planos de arquitetura e integração (V7 → main, engine contract, refactors) | docs |
| `opus-xhigh` | Desenho de simulação e determinismo: schema de saves, RNG/relógio/tick, migrações | sim |
| `opus-max` | Revisão crítica pré-PR: simulação, saves, integração, segurança dos hooks | não |
| `fable-low` | Segunda opinião curta sobre um plano ou decisão | não |
| `fable-medium` | Revisão de campanha e missões (arco das 30, plausibilidade histórica, ritmo) | não |
| `fable-high` | Desbloqueio após duas tentativas falhadas de `sonnet-xhigh`/Opus | sim |
| `fable-xhigh` | Decisões estratégicas (Unreal vs web, refactors de motor, pipeline de assets) | docs |
| `fable-max` | Último recurso: bugs entre execuções sem solução, auditoria de marco completa | sim |

Escada: começar no agente mais barato cuja função sirva; subir só com evidência de dificuldade.
`fable-*` só quando o utilizador pede expressamente um agente Fable nessa tarefa (pode gastar créditos de uso).

Opus 5.5 como principal aceita o Fable 5.1 como advisor. Os subagentes herdam o advisor e aplicam a
mesma regra de pares contra o seu próprio modelo.

Não adotado: agent teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`). Cada colega é uma instância completa,
gasta muito mais do plano, partilha a pasta de trabalho sem worktree automática e não é restaurado
pelo `/resume`. Também não adotados: routers para outros fornecedores (claude-code-router, litellm),
porque passam a faturação para chaves de API.

## Arranque

```bash
claude update                 # Fable advisor >= 2.1.257; Haiku 5.5 >= 2.1.293
cd <checkout com .claude/agents>
python3 .agent/tools/claude_setup_check.py   # só leitura, nunca mostra segredos
claude --agent captain
```

Dentro da sessão: `/status` (deve mostrar a conta Max, não uma chave de API), `/advisor fable`, `/usage`.
Opcional em `~/.claude/settings.json`: `"modelSettings": {"claude-opus-5-5": {"effortLevel": "high"}}`
(o `effortLevel` de topo nas definições do utilizador é ignorado pelo Opus 5.5).

## Agentes em todas as pastas e sessões da máquina

Os agentes de projeto só existem nas pastas cuja branch tem `.claude/agents/`. Para os ter em qualquer
worktree (`COD-guerra`, `COD-guerra-v7-cert`, ...) e em qualquer sessão nova do Claude Code:

```bash
.agent/tools/install-user-agents.sh          # copia os 29 para ~/.claude/agents
.agent/tools/install-user-agents.sh --hook   # também instala o git-safety em ~/.claude (com cópia .bak do settings.json)
.agent/tools/install-user-agents.sh --check  # confirma que estão iguais ao repositório
```

Regras do Claude Code: carrega os agentes no arranque da sessão (abrir sessão nova depois de instalar);
se a pasta tiver um `.claude/agents/` próprio, os nomes repetidos aí têm prioridade sobre os de utilizador.
Por isso, numa pasta cuja branch ainda tem o `captain.md` antigo (lista de 6 agentes, que bloqueia os
outros com `--agent captain`), arrancar com **`claude --agent captain20`**: é o mesmo Captain, instalado a
nível de utilizador com a lista completa, e os 20 `<modelo>-<esforço>` vêm também do utilizador. As skills
e o `.agent/` continuam a ser os da pasta; ferramentas em falta são saltadas com aviso no handoff.
Depois de alterar agentes no repositório, repetir o instalador. O guarda `pre-push`
é por clone e já cobre todos os worktrees; o relatório `agent_models_report.py` lê `~/.claude/projects`,
logo cobre todas as pastas e sessões.

## Ver que modelo e esforço cada agente usou de facto

O Claude Code grava em cada resposta o modelo servido (`message.model`), o pedido (`requestedModel`),
o esforço (`effort`) e os tokens, em `~/.claude/projects/<pasta>/<sessão>.jsonl` (sessão principal) e
`~/.claude/projects/<pasta>/<sessão>/subagents/agent-<id>.jsonl` (subagentes, com `attributionAgent`
= nome do agente). O relatório lê só esses metadados, nunca o conteúdo:

```bash
python3 .agent/tools/agent_models_report.py            # últimas 24 h
python3 .agent/tools/agent_models_report.py --hours 2  # só a sessão atual
```

Uma linha por transcrição: agente, modelo×respostas, esforço×respostas, tokens. Um agente certo mostra um
só modelo e um só esforço, iguais ao seu ficheiro em `.claude/agents/`. Avisos no fim: transcrições que
mudaram de modelo/esforço a meio (`/model` ou fallback) e respostas servidas por modelo diferente do pedido.
Em tempo real, `/tasks` mostra o modelo de cada subagente a correr.

### Evidência: teste de fumo dos 20 agentes (2026-10-09, autorizado pelo utilizador)

Cada agente `<modelo>-<esforço>` recebeu a mesma tarefa mínima só de leitura (identificar-se e listar 3
ficheiros de `src/game`). Resultado em `agent_models_report.py --coverage`: **20/20 usados, cada um com
exactamente o modelo e o esforço do seu ficheiro** (haiku/sonnet/opus/fable × low/medium/high/xhigh/max),
sem fallback nem mudança a meio. Custo aproximado: 8–11 k tokens por agente. Os `fable-*` só correram
porque o utilizador pediu expressamente.

## Advisor: `Advisor unavailable (execution_time_exceeded)`

Significa que a consulta ao Fable excedeu o tempo no servidor. A tarefa continua sem o conselho; não há
definição no Claude Code para aumentar esse tempo. O que reduz a probabilidade:

1. Versão >= 2.1.257 (`claude update`).
2. Sessão principal em Opus 5.5 via `captain`, com leituras pesadas delegadas: o advisor relê a
   transcrição inteira, sem cache, em cada chamada.
3. `/compact` antes de decisões grandes; não colar logs longos no chat principal.
4. Desligar no `/mcp` os conectores sem uso neste projeto. *Não confirmado:* relatos não oficiais ligam
   falhas do advisor a sessões com muitas ferramentas MCP diferidas.
5. Se persistir, `/feedback` com a linha do erro.

Se o `claude_setup_check.py` avisar `DISABLE_TELEMETRY`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` ou
`CLAUDE_CODE_DISABLE_ADVISOR_TOOL`, o advisor fica desligado (isso é outro sintoma, não o timeout).

Custo: no plano, o advisor conta para os limites de uso; um advisor Fable é cobrado em créditos de uso
nos planos onde o Fable também é. Confirmar no `/usage`. Nunca aceitar créditos pagos sem autorização.

## Proteção da `main`: três camadas

1. **Hook do Claude Code** (`.claude/hooks/git-safety.py`, PreToolUse em Bash/Edit/Write): bloqueia push para
   `main`/`master` em qualquer grafia (incluindo `git -C <pasta> push`), force push, `reset --hard`, `clean -f`,
   `branch -D` e edições/commits com `main` em checkout. Falha fechado: um erro interno bloqueia.
   Testes: `.agent/tests/test_git_safety_hook.py`.
2. **Guarda `pre-push` do Git** (`.agent/tools/install-git-guards.sh`, instalado em `.git/hooks/pre-push` do clone,
   partilhado por todos os worktrees): recusa qualquer push para `refs/heads/main|master`, venha de agente ou
   de humano. Não depende do Claude Code. `captain.sh` avisa se faltar. Testes: `.agent/tests/test_git_guards.py`.
3. **Proteção no GitHub** (Settings → Branches/Rulesets → `main`: exigir PR, proibir push direto): a única que
   nenhum cliente consegue contornar. Ativar pelo utilizador.

Observação 2026-10-09: num teste no Chromebook, um subagente correu `git push --dry-run origin main` sem
ser bloqueado pela camada 1. Causa encontrada e corrigida: a regra "push para main" só aceitava fim de linha,
espaço ou `:` depois de `main`; com `;`, `"` ou `)` a seguir (ex.: `git push origin main; echo $?`) não casava.
Os testes seguintes provaram que o hook corre nos subagentes (bloqueou o `sonnet-low` em
`git push --dry-run origin HEAD:main`) e que o hook de utilizador `rtk hook claude` não interfere.
A camada 2 continua obrigatória em cada clone: cobre `git push origin $BRANCH`, que nenhuma regex apanha.

## Revisão da configuração anterior (Codex V1 + Captain V3)

- Correto: contratos de tarefa, grafo de estado, recuperação, hook `git-safety.py` (bloqueia push para
  main, `reset --hard` e force push; testado), separação implementer/verifier/reviewer, Jev com teto.
- Corrigido: seis instruções mandavam ler `CLAUDE.md`, que não existia. Criado `CLAUDE.md` que importa
  `AGENTS.md`.
- Corrigido: `captain` com `model: inherit` corria no modelo que estivesse aberto (Fable incluído).
  Agora `opus`/`high`.
- Acrescentado: `researcher` e `Explore` (o Explore de origem corria no modelo principal).
- Limitação conhecida: a lista `Agent(...)` do Captain só é aplicada com `claude --agent captain`;
  chamado como subagente comum, a lista é ignorada.
