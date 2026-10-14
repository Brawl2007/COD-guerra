# Configuração do ambiente cloud: Jev/TypeSafe, limite e checkpoints (2026-10-14)

Complementa `CLOUD_VALIDATION_2026-10-14.md`. Estas alterações fazem-se na **configuração do ambiente cloud**
(claude.ai/code → menu do ambiente na barra de título da sessão → *Edit*), não no repositório. Fonte:
https://code.claude.com/docs/en/cloud-environments (secções "Add network secrets" e "Set environment variables").
Os valores são lidos quando a sessão é criada: depois de editar, abrir uma **sessão nova**.

## 1. Remover o limite `COD_JEV_LIMIT=10`

O ambiente cloud define `COD_JEV_LIMIT=10`. O `jev_router.py` aplica o menor entre esse valor e `--limit`, por isso
a autorização sem teto de 2026-10-13 fica limitada a 10 chamadas por ledger.

1. Editar o ambiente → *Environment variables* (formato `.env`, uma `KEY=value` por linha).
2. Apagar a linha `COD_JEV_LIMIT=10`. Para manter um teto opcional, mudar o valor em vez de apagar.
3. Guardar e abrir uma sessão nova.
4. Verificar (só leitura, sem chamada paga): `python3 .agent/tools/jev_router.py usage` mostra `calls N/unlimited`.

Não pôr segredos nas variáveis de ambiente: são legíveis por quem usa o ambiente.

## 2. Autenticação TypeSafe na cloud

Diagnóstico: a chave não existe no ambiente (`check-key` → `missing`). Uma chamada real em 2026-10-14 devolveu
HTTP 401. Na cloud, a chave deve vir de uma *Network secret*: o proxy de saída acrescenta o header ao pedido e a
chave nunca entra na sessão. O router passou a ter um modo para isso.

Passos do utilizador (uma vez):

1. Editar o ambiente → *Network secrets* (ou *API credentials* em apps antigas) → abrir ou criar o segredo de
   `api.typesafe.ai`.
2. Confirmar o host permitido: `api.typesafe.ai`.
3. Header: Name `Authorization`, Prefix `Bearer`, Value = a chave TypeSafe atual (substituir se houver dúvida
   sobre a validade). É o formato que o `jev_router.py` usa localmente.
4. Em *Environment variables*, acrescentar `COD_JEV_AUTH=proxy`. Nesse modo o router chama sem a chave e sem o
   header `Authorization`, para não colidir com o header do proxy.
5. Abrir uma sessão nova.

Verificação na sessão nova (por esta ordem):

```bash
python3 .agent/tools/jev_router.py check-key     # key: proxy (...)
python3 .agent/tools/jev_router.py usage         # mostra "auth: BLOCKED after http_401" se houver um 401 no ledger
python3 .agent/tools/jev_router.py route --role implement --risk medium --complexity medium \
  --description "teste de autenticacao" --enable-jev --dry-run --json   # headers sem Authorization, sem chamada
```

Só depois disso fazer **uma** chamada real (com `--retry-auth` se o ledger dessa máquina tiver um 401). Se der
401/403 outra vez, o travão do router bloqueia as chamadas seguintes; não repetir, rever o segredo.
O ledger fica em `~/.local/state/cod-guerra/jev_pilot_ledger.json` e o contentor cloud é efémero, por isso uma sessão nova começa sem o bloqueio.

### Consultas paralelas e segurança de autenticação

O router Jev e o suporte à decisão partilham um bloqueio local entre processos associado ao ledger.
Antes de cada chamada real, revalidam o histórico dentro desse bloqueio; só o libertam
quando a resposta HTTP e o seu resultado estão registados. Duas chamadas em paralelo na
mesma sessão não podem enviar a segunda antes de conhecer o 401/403 da primeira.
Não há teto adicional de chamadas e o modo proxy é preservado. O bloqueio é libertado
pelo sistema operativo após a terminação do processo. Sessões cloud distintas não
partilham o ledger local nem este bloqueio; não é um limite global de gastos.


## 3. Publicação de checkpoints a partir da cloud (pendente de autorização)

Estado em 2026-10-14: a ref `cod-guerra/cloud-state` **já existe** (commit `6487334`, autor Brawl2007,
21:34 UTC, checkpoint `CLOUD-STATE-SMOKE-20261014`, `ACCEPTED`, aponta para `5d97fd2` desta branch). Foi criada
fora desta sessão, por isso `--init` já não é preciso. Falta provar que a **sessão cloud** consegue escrever nessa ref.
Não executar sem autorização explícita do utilizador. O procedimento, testado contra remotos Git locais:

1. Trabalho real commitado e empurrado numa branch de trabalho (nunca `main`, `master` ou `cod-guerra/cloud-state`).
2. Escrever o JSON fora do repositório (scratchpad), com o SHA completo de `git rev-parse HEAD` empurrado:

   ```json
   {"schema_version": 1, "task_id": "CLOUD-ROLLOUT-1", "work_branch": "<branch>",
    "work_head": "<sha de 40 hex>", "status": "PENDING", "operation": "read_only",
    "next_action": "Rever a branch e o relatorio de validacao cloud",
    "evidence": ["commit:<sha>", "doc:docs/direction/CLOUD_VALIDATION_2026-10-14.md"]}
   ```

3. Validar sem escrever nada: `python3 .agent/tools/cloud_checkpoint.py validate --input <ficheiro>`.
   Deve dar `"valid": true`; `"requires_init"` é `false` enquanto a ref existir (verificado em 2026-10-14)
   e só seria `true` num remoto sem ela.
4. **Após autorização:** `python3 .agent/tools/cloud_checkpoint.py publish --input <ficheiro>` (com `--init`
   apenas se o `validate` disser `requires_init: true`). É este passo que prova a permissão real de escrita da
   cloud nessa ref; o `--dry-run` do Git não a prova.
5. Prova de continuidade (etapa 6 do checklist): numa sessão cloud nova, `cloud_checkpoint.py list` e
   `get --task-id CLOUD-ROLLOUT-1` devem devolver o checkpoint com `resume_allowed`.

Se o push for recusado pelo proxy (só a branch designada da sessão é gravável), o checkpoint não fica gravado.
Nesse caso a continuidade passa a depender de handoffs commitados na branch de trabalho.

## 4. Guarda `pre-push` em clones cloud

O contentor é efémero: a guarda instalada em `.git/hooks/pre-push` desaparece com ele. Em cada sessão nova
correr `.agent/tools/install-git-guards.sh` (recusa substituir um `pre-push` alheio) e
`.agent/tools/install-git-guards.sh --check`. Tornar isto automático no `SessionStart` é uma decisão em aberto.
