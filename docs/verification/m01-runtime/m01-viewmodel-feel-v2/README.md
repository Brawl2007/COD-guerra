# M01-VIEWMODEL-FEEL-V2 (T39) — prova de aceitação

Estado: **ACEITE** em 2026-10-10 (D22). M01 continua **PROTÓTIPO JOGÁVEL**.

| Campo | Valor |
|---|---|
| Tarefa | T39 `M01-VIEWMODEL-FEEL-V2` (sensação do viewmodel V2) |
| Branch | `claude/m01-viewmodel-feel-v2` |
| Commit de código aceite | `29ba3cf70479a8c2bd3c304af07d424cb2d4b9a3` (`29ba3cf`) |
| Base | `304b90f` (T35 aceite + documentação) |
| CI x86 que prova a aceitação | run [38045111352](https://github.com/Brawl2007/COD-guerra/actions/runs/38045111352) |
| Tentativas de correção | 0 (a primeira tentativa de implementação foi parada pelo utilizador antes de editar, em 2026-10-09) |
| Rejeições de revisão | 0 |

## O que muda no jogo

- Mirar (ADS) demora 0,30 s a entrar e 0,22 s a sair, com curva suave. Antes a transição era de 55 ms.
- O FOV da câmara passa de 70 para 48 na mesma curva da arma.
- A respiração e o balanço de andar, correr e agachar seguem o relógio da simulação. Em pausa tudo congela.
- Com a mira ativa a arma fica estável (sem balanço).
- A arma baixa-se perto de paredes, árvores ou cobertura. A sonda que decide isto é só de leitura: não altera a simulação.
- O recuo não muda.

Presentation only: sem alterações à simulação, ao mundo nem ao núcleo.

## Desvio ao plano

- O FOV é escrito por `M01ViewModel.applyFov()` na câmara M01. A linha de lerp em `m01-view.js:660-662` ficou no código e é sobrescrita. Um follow-up pode apagá-la.

## Evidência

### Testes e CI

- Run CI x86 `38045111352`:
  - autoridade: **OK**;
  - `npm test`: **574/574**;
  - `npm run build`: **OK**;
  - `npm run test:browser`: **9/9**, com `--workers=1 --retries=0`.
- Verificador local (Node), resultados reportados no ciclo de aceitação:
  - sensação do viewmodel (`tests/m01-viewmodel-feel.test.js`): 15/15;
  - `wz29-viewmodel`: 15/15;
  - apresentação da arma (weapon-presentation): 27/27;
  - feedback de tiro do jogador (player-shot-feedback): 6/6;
  - arquitetura da estação (station-architecture): 11/11;
  - build: OK.
- Veredicto do verificador: PASS WITH GAPS (lacunas listadas abaixo).
- Revisor: ACEITE. Consulta ao Jev: revisor sonnet, confiança 0,98, chamada 3 de 100.
- Esta documentação não repetiu testes. Os números acima são os reportados pelo CI e pelo verificador.

### Ciclo de agentes

- Preparação: haiku-medium.
- Implementação: sonnet-xhigh.
- Verificação: PASS WITH GAPS.
- Revisão: ACEITE.

### Capturas (nomes mantidos)

Copiadas da pasta de artefactos de teste de `29ba3cf` (`test-results/`). Não foi confirmado por run id que estas capturas vêm do run `38045111352`.

| Ficheiro | O que mostra (pelo nome) |
|---|---|
| `viewmodel-feel-hip.png` | Arma na anca (sem mira) |
| `viewmodel-feel-mid-ads.png` | Meio da transição para a mira |
| `viewmodel-feel-ads.png` | Mira totalmente ativa |
| `viewmodel-feel-near-wall-lowered.png` | Arma baixada junto a parede |
| `viewmodel-feel-clear-raised.png` | Arma levantada em espaço livre |

Limitação: as capturas são pequenas e só mostram o estado pelo nome. A prova numérica são os testes de curva, FOV e pausa.

### Limitações conhecidas

- Pose baixa perto de parede: a manga aparece grande na vista e a mão fica visível pela manga aberta. Este problema da manga pertence a **T40** (Braços FP e transporte).
- Encostado a uma parede (menos de 0,8 m) a arma desenha por cima da parede, porque a passagem da arma limpa a profundidade.
- **H8 PENDENTE HUMANO**: disparar com a arma baixada mantém a precisão de ADS. Bloquear o disparo seria uma alteração à simulação, por isso não foi feito.
- Não foi medido FPS. Não há alegação de desempenho.

## Reprodução

- Repetir a CI da branch `claude/m01-viewmodel-feel-v2` no commit `29ba3cf`: `npm ci`, `npm test`, `npm run build`, `npm run test:browser` com `--workers=1 --retries=0`.
- Obrigações de regressão: `.agent/regression/records/M01-VIEWMODEL-FEEL-V2.json`.
- Comandos focados:
  - `node --test tests/m01-viewmodel-feel.test.js`;
  - `npx playwright test tests/browser/m01-viewmodel-feel.spec.js --workers=1 --retries=0`.
