# M01 — consequências do fogo de cobertura

Este relatório nasceu com o primeiro protótipo de cobertura do Codex (`0ab60d7`): traços `incoming-shot` e pressão de sete quase-acertos por baixa. Na fusão com a terceira ronda, esse modelo foi substituído pelo fogo alemão como dados, descrito em [`../continuous/README.md`](../continuous/README.md#terceira-ronda-ameaça-no-reparo-e-na-retirada) e em `missions/m01-tczew/ENGINE_CONTRACT.md`:
- tiros com origem nos portões de Lisewo, em voo e gravados no save;
- supressão a 3 m;
- baixas da retirada só por tiro real dos alemães do tabuleiro.

Os números abaixo foram regenerados com o modelo actual.

Comparação de duas rotas completas de **simulação**, com a mesma seed (19390901). O piloto usa movimento, mira por deltas, disparo, ferrolho e recarga. Não injecta eventos, RNG, objectivos ou relógios. A pontaria é automática e precisa. Não é playtest humano nem partida no navegador.

| Observação | Ignorar o fogo | Cobrir o reparo e a retirada |
| --- | ---: | ---: |
| Reparo, segundos activos desde a entrega | 217,5 | 173,4 |
| Tiros a menos de 3 m dos sapadores (cada um deita a equipa) | 48 | 8 |
| Tiros a menos de 3 m do pelotão em retirada | 277 | 146 |
| Tiros letais (baixas por ID) | 6 | 0 |
| Sobreviventes | 12 | 18 |
| Disparos do jogador / cartuchos restantes | 0 / 45 | 30 / 15 |
| Conclusão | Debrief, 26 eventos, CP-A..D | Debrief, 26 eventos, CP-A..D |

[report.json](report.json) conserva os valores e os IDs das baixas. O pelotão tem 18 homens activos; as seis posições de reserva do schema antigo ficam inactivas (`reserveSlots`). A comparação em 12 sementes está em [`../continuous/round3/cover-comparison.json`](../continuous/round3/cover-comparison.json).

Capturas do build de produção em Chromium/SwiftShader, 1280×720, por **continuação de snapshots alcançados pela rota de simulação** (testes `tests/browser/m01.spec.js`):

- [repair-under-fire.png](repair-under-fire.png): linha de estado "sapadores deitados sob fogo", igual à simulação, e o callout de Kowal.
- [withdrawal-under-fire.png](withdrawal-under-fire.png): primeira baixa real da retirada e contagem por ID no HUD.

Reproduzir com `node tools/verify-m01-cover.mjs` e, para as continuações, `npm run build` e `npm run test:browser`. Não houve medição de GPU/Chromebook nem playtest humano.
