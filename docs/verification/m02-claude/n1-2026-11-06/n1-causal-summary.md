# Registo causal N1 (AI-01): 2026-11-06

Gerado por `node tools/m02/n1-causal-log.mjs` no commit `5ec62efe`. Simulação Node da Área A (`M02BenchSimulation`), passo 0.05 s.
Sementes: 19390909, 19390910, 19390911, 19390912. Modos: `sheltered` (Piotr agachado e parado, 60 s) e `advancing` (Piotr joga com o `MissionBot` pela vala, ordens Z aos 0,2 s e X aos 12 s, até 120 s ou C04 ou falha).

**Isto é evidência gerada por simulação de estado, não é playtest nem aceitação de N1.** Cada efeito liga-se à causa mais recente que cumpre a chave da regra dentro da janela; a força da ligação diz se a chave é partilhada (`direct`), se havia causa alternativa anterior (`confounded`), se é só sucessão no tempo (`temporal`) ou uma comparação de contagens (`measured`).

## Contagens por tipo de ligação causal (todas as corridas)

| Ligação | Janela (s) | Total | direct | confounded | temporal | measured |
|---|---|---|---|---|---|---|
| INPUT_ORDER->ORDER_ACCEPTED | 0.5 | 7 | 7 | 0 | 0 | 0 |
| INPUT_ORDER->ORDER_REJECTED | 0.5 | 0 | 0 | 0 | 0 | 0 |
| ORDER->ALLY_TAKES_COVER | 12 | 3 | 0 | 0 | 3 | 0 |
| SUPPRESSION->HOSTILE_HIT | 8 | 28 | 28 | 0 | 0 | 0 |
| HIT->HOSTILE_DOWN | 8 | 17 | 17 | 0 | 0 | 0 |
| SUPPRESSION->ALLY_ADVANCES | 10 | 14 | 14 | 0 | 0 | 0 |
| HOSTILE_DOWN->ALLY_ADVANCES | 10 | 3 | 3 | 0 | 0 | 0 |
| ENEMY_SUPPRESSION->ALLY_HIT | 8 | 58 | 58 | 0 | 0 | 0 |
| ENEMY_HIT->ALLY_DOWN | 3 | 2 | 2 | 0 | 0 | 0 |
| ALLY_DOWN->RESCUE_WINDOW | 0.5 | 1 | 1 | 0 | 0 | 0 |
| PLAYER_SHOT->PLAYER_HIT | 0.5 | 20 | 20 | 0 | 0 | 0 |
| PLAYER_SHOT->HOSTILE_ALERTED | 0.5 | 42 | 42 | 0 | 0 | 0 |
| PLAYER_SHOT->HOSTILE_DOWN | 0.5 | 20 | 20 | 0 | 0 | 0 |
| HOSTILE_ALERTED->HOSTILE_FIRES_ON_PLAYER | 15 | 7 | 7 | 0 | 0 | 0 |
| HOSTILE_DOWN->HOSTILE_WITHDRAWS_OR_SURRENDERS | 10 | 9 | 0 | 0 | 9 | 0 |
| MG_SUPPRESSED->MG_FIRE_REDUCED | 8 | 11 | 0 | 0 | 0 | 11 |
| MG_DOWN->MG_SILENT | 8 | 2 | 0 | 0 | 0 | 2 |

## Corridas

| Modo | Semente | Fim | Cena | Piotr (vida) | Aliados vivos | Hostis ativos | Nós | Arestas | sha256 (corrida) | Repetição igual |
|---|---|---|---|---|---|---|---|---|---|---|
| sheltered | 19390909 | time-limit (60 s) | C03 | 41 | 5/7 | 7/10 | 562 | 33 | `fffb06a1bad03ded` | sim |
| sheltered | 19390910 | time-limit (60 s) | C03 | 83 | 7/7 | 5/10 | 375 | 22 | `c60c7e09c6ab39fb` | sim |
| sheltered | 19390911 | time-limit (60 s) | C03 | 66 | 7/7 | 7/10 | 515 | 27 | `202777f2d2b783cc` | sim |
| sheltered | 19390912 | time-limit (60 s) | C03 | 83 | 7/7 | 7/10 | 426 | 22 | `bfb2ea26d1abc487` | sim |
| advancing | 19390909 | reached-C04 (18.75 s) | C04 | 69 | 7/7 | 0/10 | 227 | 38 | `ce58ac709ec83919` | sim |
| advancing | 19390910 | reached-C04 (16.6 s) | C04 | 41 | 7/7 | 0/10 | 215 | 36 | `3e851e6755fecde5` | sim |
| advancing | 19390911 | reached-C04 (10.15 s) | C04 | 44 | 7/7 | 0/10 | 157 | 30 | `8e2eb43a483ac982` | sim |
| advancing | 19390912 | reached-C04 (19.75 s) | C04 | 68 | 7/7 | 0/10 | 237 | 36 | `6b2ee8d61cb8dce0` | sim |

Sementes diferentes dão registos diferentes: 8 sha256 distintos em 8 corridas.

Determinismo: cada par (semente, modo) correu duas vezes e produziu o mesmo sha256 do registo canónico. O sha256 completo de cada corrida está em `n1-causal-log.json`.

## Contagens por tipo de ligação e por modo

| Ligação | sheltered (total/direct) | advancing (total/direct) |
|---|---|---|
| INPUT_ORDER->ORDER_ACCEPTED | 0/0 | 7/7 |
| INPUT_ORDER->ORDER_REJECTED | 0/0 | 0/0 |
| ORDER->ALLY_TAKES_COVER | 0/0 | 3/0 |
| SUPPRESSION->HOSTILE_HIT | 21/21 | 7/7 |
| HIT->HOSTILE_DOWN | 13/13 | 4/4 |
| SUPPRESSION->ALLY_ADVANCES | 11/11 | 3/3 |
| HOSTILE_DOWN->ALLY_ADVANCES | 3/3 | 0/0 |
| ENEMY_SUPPRESSION->ALLY_HIT | 41/41 | 17/17 |
| ENEMY_HIT->ALLY_DOWN | 2/2 | 0/0 |
| ALLY_DOWN->RESCUE_WINDOW | 1/1 | 0/0 |
| PLAYER_SHOT->PLAYER_HIT | 0/0 | 20/20 |
| PLAYER_SHOT->HOSTILE_ALERTED | 0/0 | 42/42 |
| PLAYER_SHOT->HOSTILE_DOWN | 0/0 | 20/20 |
| HOSTILE_ALERTED->HOSTILE_FIRES_ON_PLAYER | 0/0 | 7/7 |
| HOSTILE_DOWN->HOSTILE_WITHDRAWS_OR_SURRENDERS | 0/0 | 9/0 |
| MG_SUPPRESSED->MG_FIRE_REDUCED | 10/10 | 1/1 |
| MG_DOWN->MG_SILENT | 2/2 | 0/0 |

## Limitações

- O motor não grava a causa de cada decisão: as ligações são reconstruídas a partir de chaves partilhadas (alvo, atirador, ator) e de janelas fixas. `temporal` e `confounded` são indícios.
- `PLAYER_SHOT->PLAYER_HIT` descreve o resultado balístico do próprio tiro (acertou num ator), não um efeito posterior.
- A MG34 (DE-A05) é medida por contagem de rajadas antes/depois (janela fixa); `MG_SUPPRESSED->MG_FIRE_REDUCED` só é registada quando há rajadas antes e menos depois. A ausência de aresta não prova que a supressão não funciona.
- Ligações a `HOSTILE_ALERTED` dependem de a memória de áudio do hostil ter sido escrita pelo tiro de Piotr; só existem no modo `advancing` (em `sheltered` Piotr não dispara).
- Sem sinal de «rota livre» no motor: só se mede o fogo da MG34. Moral/recuo é `temporal`.
- Resultados de uma bancada com 7 aliados e 10 hostis; não generalizam para as Áreas B e C.
