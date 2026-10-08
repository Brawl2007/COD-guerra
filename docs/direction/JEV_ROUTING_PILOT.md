# Piloto de roteamento Jev

Status: **PILOTO — NÃO OPERACIONAL até a primeira chamada real comprovada.**

## Propósito

`.agent/tools/jev_router.py` recomenda qual agente o Captain deve usar (explorer, implementer, implementer-deep, verifier, reviewer, reviewer-critical). É consultivo: nunca cria agentes; **o Captain mantém a decisão final**. Só biblioteca padrão do Python.

## O que as regras decidem localmente (sem rede)

- explore / somente leitura: haiku (explorer)
- verify: sonnet (verifier)
- review com flag crítica (persistence, architecture, integration, simulation, save) ou risco alto: opus (reviewer-critical); review comum: sonnet (reviewer)
- implement com `fix_attempts >= 2`: sonnet (implementer-deep)
- implement com risco e complexidade baixos: sonnet (implementer)

## Quando o Jev é consultado

Apenas nos casos ambíguos (implement com risco/complexidade médios ou altos, `fix_attempts == 1`; review com risco médio e complexidade alta) e somente se TODAS as condições valem: `COD_JEV_PILOT=1` (ou `--enable-jev`), chave disponível, orçamento restante e sem `--offline`. Caso contrário usa-se o padrão das regras (`source=rule_fallback`, com `reason`: disabled, no_key, insecure_key_file, budget_exhausted, offline, low_confidence, error).

Salvaguardas: nunca haiku para implement/verify/review (piso sonnet); confiança abaixo de 0,6 (`--min-confidence`) cai para a regra; opus em implement vira implementer-deep com o aviso `opus_suggested_escalate_to_captain`; qualquer erro cai para a regra, sem retentativa.

## Configurar a chave com segurança (localmente, sem colar no chat)

```bash
install -d -m 700 ~/.config/cod-guerra && ( umask 077; read -rs -p 'TYPESAFE_API_KEY: ' K; echo; printf 'TYPESAFE_API_KEY=%s\n' "$K" > ~/.config/cod-guerra/typesafe.env; unset K )
python3 .agent/tools/jev_router.py check-key
```

A chave também pode vir de `TYPESAFE_API_KEY` ou de `COD_JEV_KEY_FILE`. O arquivo é recusado se tiver permissão de grupo/outros ou estiver dentro do repositório. A chave nunca é impressa, registrada nem gravada.

## Ativação (em ordem)

1. Testes offline (stub local, nunca acessam a API real): `python3 -m unittest discover -s .agent/tests -p 'test_jev*.py' -v`
2. Simulação: `COD_JEV_PILOT=1 python3 .agent/tools/jev_router.py route --role implement --description "..." --dry-run` (nada é enviado nem consumido).
3. Uma chamada real: `COD_JEV_PILOT=1 python3 .agent/tools/jev_router.py route --role implement --description "..." --run-id <RUN_ID> --json`
4. Conferir: `python3 .agent/tools/jev_router.py usage`

Só depois da etapa 3 comprovada o piloto deixa de ser "não operacional".

## Desativar

`unset COD_JEV_PILOT` ou remover `~/.config/cod-guerra/typesafe.env`. Sem isso, nada é enviado.

## Orçamento e custo

- Teto do piloto: **3 chamadas pagas** no total (constante `PILOT_MAX_PAID_CALLS`); `--limit` e `COD_JEV_LIMIT` só podem reduzir.
- Ledger global fora do repositório: `~/.local/state/cod-guerra/jev_pilot_ledger.json` (`COD_JEV_LEDGER`), modo 0600. A vaga é reservada antes do envio; falhas (401/429/5xx, timeout) também contam. Sem retentativas.
- Preço: US$ 0,042 por 1M tokens de entrada; saída grátis (uma chamada típica ≈ 300 tokens, frações de centavo).

## Limites

- Teto de 3 chamadas no piloto; timeout de 15 s.
- O Jev funciona melhor em inglês; a descrição em português pode reduzir a confiança.
- O alias `jev-latest` muda de versão; o modelo usado é registrado no ledger.
- Apenas consultivo; não substitui a política em `.claude/agents/captain.md`.
