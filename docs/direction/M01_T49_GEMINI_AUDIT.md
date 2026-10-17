# T49 — auditoria da entrega Gemini (2026-10-17)

Pacote: `gemini-m01-t49-performance-budget-v1_1.zip` (partes 1 e 2 são subconjuntos idênticos).
Autoclassificação do autor: `PARTIAL` (medições em SwiftShader, sem GPU física).

## Base real

Os sete hashes `beforeSha256` coincidem todos em `af81657` (2026-10-11), não no main atual (`6697956`).
Os quatro módulos declarados "novos" (`m01-terrain-relief.js`, `m01-terrain-material.js`,
`m01-vegetation-runtime.js`, `m01-props-runtime.js`) não existiam nessa base, mas o main tem hoje
ficheiros diferentes com os mesmos nomes (T28, T13, T43). Aplicar o pacote substituiria esse trabalho.
O `m01-viewmodel.js` do pacote apagaria a lógica de transições de carregar o ferido do main.

## Reprodução (worktree isolada em `af81657` + pacote, mesmas dependências do main)

- Hashes `afterSha256`: 14/14 coincidem; o pacote é internamente coerente.
- `tests/m01-perf-budget-t49.test.js`: 3/9 passam (o relatório diz "8/8"). As 6 falhas são
  `document.createElementNS is not a function`: o teste cria um `WebGLRenderer` real em Node e o
  stub de DOM do próprio teste não o suporta.
- Suite completa: base 745/754, com pacote 748/763. As 9 falhas da base são as mesmas; as 6 novas
  são só os testes T49. Sem regressões nos testes existentes dessa base.

## Avaliação por pilar

| Pilar | Decisão | Motivo |
| --- | --- | --- |
| A terreno em blocos | Rejeitar | O main já tem relevo/material T28 com outro desenho; útil só a ideia do teste de costura. |
| B1 fusão estática do kit | Ideia | Vértices fixados em mundo no 1.º frame, perde atributos além de position/normal/uv, esconde originais sem restauro, reconstrói geometria quando uma peça cruza o raio de sombra. |
| B2 deduplicação GLB | Ideia | Assinatura de 6 amostras ao milímetro pode colidir; precisa de chave completa. |
| B3 carris por distância | Ideia | Reenvia todas as matrizes a cada frame, mesmo parado. |
| B4 culling de SkinnedMesh | Ideia | Esfera fixa de 2,8 m; medir antes. |
| C cache de texturas | Ideia | Rever contra a política de dispose atual de `m01-surfaces.js`. |
| D sombras por distância | Não portado | Three.js já descarta casters fora da câmara de sombra; com sol baixo de madrugada a estação a 85 m pode sombrear a cascata. Precisa de prova visual. |
| E scratch e uploads vazios | **Portado** | Ver abaixo. |
| F governor adaptativo | Rejeitar | Sem amostras reais devolve valores fixos (14,2 ms / 60 fps); nada fora do ficheiro consome as suas saídas; fase `BridgeBlown` não existe em `src/`. |

Os tempos SwiftShader (segundos por frame) não são evidência de FPS. A redução de triângulos
reportada vem quase toda do terreno em blocos, que o main resolve de outra forma.

## Portado para o main (branch `claude/trusting-euler-o7fcdd`)

Pilar E, só apresentação, em `three-renderer.js`, `m01-impostors.js` e `m01-viewmodel.js`:
vetores/cor temporários reutilizados em vez de alocados por frame, e uploads de instâncias saltados
quando não há instâncias. `m01-view.js` não foi tocado (fatia 4 da T43 em curso noutra branch).

## Pendente na T49

Orçamento medido no PC de referência (Intel HD 5500, 1366×768) e reescrita das ideias B1–B4/C
sobre os módulos atuais, com contadores reais de `renderer.info`. Sem FPS inventados.
