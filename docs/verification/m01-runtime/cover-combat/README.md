# M01 — consequências do fogo de cobertura

Comparação de duas rotas completas de **simulação**, com a mesma seed (19390901). O piloto usa movimento, mira por deltas, disparo, ferrolho e recarga; não injecta eventos, RNG, objectivos ou relógios. A pontaria é automática e precisa. Não é playtest humano nem uma nova partida contínua no navegador.

| Observação | Ignorar o fogo | Cobrir o reparo e a retirada |
| --- | ---: | ---: |
| Reparo, segundos activos desde a entrega | 107,5 | 77,5 |
| Tiros próximos dos sapadores | 13 | 1 |
| Tiros próximos do pelotão em retirada | 55 | 10 |
| Sobreviventes | 12 | 17 |
| Disparos do jogador / cartuchos restantes | 0 / 45 | 33 / 12 |
| Conclusão | Debrief, 26 eventos, CP-A..D | Debrief, 26 eventos, CP-A..D |

[report.json](report.json) conserva valores e IDs das baixas. Os 18 homens activos correspondem à contagem; seis slots antigos ficam reservados e inactivos. Uma perda exige pressão de sete impactos próximos, com pelo menos 20 s de batalha entre baixas. Tuning de gameplay, sem afirmação de efectivos históricos. Inimigos inactivos, suprimidos ou tapados por parede não causam perdas pelo simples avanço do relógio. Olhar para trás não suspende o combate. Save/reload conserva pressão e IDs.

Os sapadores trabalham junto ao cabo no ponto de entrega; a formação anterior ficava escondida pela crista do aterro. Impactos a menos de 3 m fazem-nos agachar e pausar. O HUD indica progresso, trabalho/supressão e rumo dos clarões. O aviso de abrigo fica visível por pelo menos 2,5 s mesmo quando o jogador já está em cobertura.

Os eventos de tiro incluem origem e impacto contra terreno/colisores. Traços e impactos usam dois lotes de até 48 instâncias, sem alterar a simulação. Velocidade visual de 750 m/s apenas ilustra o raio já resolvido; não implementa queda, arrasto, atraso de dano nem comprova uso histórico de munição traçante. Modelos e áudio continuam provisórios.

Capturas do build de produção em Chromium 153/SwiftShader, 1280×720, por **continuação de snapshots alcançados pela rota de simulação**:

- [repair-under-fire.png](repair-under-fire.png): HUD de supressão e efeitos de tiros recebidos.
- [withdrawal-under-fire.png](withdrawal-under-fire.png): perdas reais da simulação e contagem da retirada.

Reproduzir a comparação com `node tools/verify-m01-cover.mjs`; executar `npm run build` e `npm run test:browser` para as continuações. Não houve medição de GPU/Chromebook nem playtest humano. A partida contínua anterior do Claude precede esta mudança. Repetir a partida e afinar legibilidade/dificuldade com uma pessoa antes de aprovar M01.
