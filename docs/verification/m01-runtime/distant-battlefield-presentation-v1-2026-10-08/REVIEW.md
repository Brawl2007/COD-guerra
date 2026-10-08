# Revisão independente — resultados e resolução

Revisor: subagente independente, só leitura, sobre `git diff 99309d9` do commit `8c4367b` (com as ferramentas de captura por commitar). Correu os testes Node da branch e os relacionados, fez um merge de ensaio com `codex/m01-battlefield-fx-polish-v3` e mediu numericamente agendamento, distâncias e custo. Não encontrou nenhum caminho pelo qual a camada afecte autoridade (dano, missão, visibilidade, IA, objectivos). O plano é puro e determinístico.

| # | Gravidade | Constatação | Resolução |
|---|---|---|---|
| B1 | Bloqueador (prova) | `layerDiff` comparava os frames do jogador consigo próprios: `M01View.render` devolve o frame em cache no mesmo relógio, e a passagem «camada escondida» não desenhava nada. | **Corrigido.** O `redraw()` do fixture limpa `view.lastFrame` antes de desenhar. As ferramentas são commitadas antes das capturas, para `report.commit` ser o código capturado. |
| S1 | Deve corrigir | A regra de ≥0,3 s comparava o início do tiro, não o impacto. Na rota, dois tiros de artilharia caíram a 0,127 s um do outro, e o tiro posterior caiu primeiro. | **Corrigido.** A comparação usa a hora de impacto, com uma janela que cobre a diferença de tempos de voo. O teste cobre os dois sectores pesados. |
| S2 | Deve corrigir | `renderOrder=3` desenhava clarões e traçantes distantes por cima de fumo/poeira próximos. | **Corrigido.** Só os transparentes distantes recebem ordem −3/−2/−1 (o grupo não: as silhuetas opacas mantêm a ordem normal depois do céu). |
| S3 | Deve corrigir | A janela dos clarões dependia do histórico de frames e não era reposta num restore. | **Corrigido.** Um mundo novo ou um relógio anterior repõem 70 ms, sem tocar em `resetEffects` (linha que a FX V3 também altera). Teste novo. As afirmações do HANDOFF foram reescritas. |
| S4 | Deve corrigir | Atiradores da margem oeste a y = 7 sobre zona sem chão desenhado. | **Corrigido.** Desenhados 1 m acima de `heightAt` (−3) e documentados como clarões na margem distante. O buraco do terreno fica documentado como limitação do mundo. |
| S5 | Decisão | Atiradores ambiente do dique (x 960–1045, \|z\| 380–980) dentro do raio de 1200 m do tiro do jogador, junto aos atiradores autoritativos S2 e ao aviso «Salva do dique norte/sul». | **Decidido: afastar.** A escaramuça de Lisewo passa a 1,3–2 km a montante/jusante (\|z\| ≥ 1340), a ≥1250 m da área jogável, como as figuras. Teste por construção. |
| S6 | Deve corrigir | 259 `bucketEvent` por frame; envelope calculado mesmo com nível 0; HANDOFF dizia «sem alocação por frame». | **Corrigido.** Rejeição barata (nível e tecto do envelope) antes do envelope, com o mesmo resultado (teste de pureza/determinismo). Medição relativa em `EVIDENCE.md`. HANDOFF corrigido: pools de GPU fixos, JS aloca objectos pequenos por frame. |
| S7 | Testes | Asserções que não podiam falhar e lacunas. | **Corrigido.** Testes novos ou reforçados: <ul><li>pools nunca saturam (contagens pedidas, não as limitadas);</li><li>frentes activas em simultâneo;</li><li>sem repetição de local/rajada em vez da assinatura com floats;</li><li>escritas na simulação registadas por proxies;</li><li>A/B de gameplay em 400 ticks;</li><li>scan ≥ duração;</li><li>aviões a ≥2 km por construção;</li><li>trajectórias;</li><li>janela no restore;</li><li>espaçamento de impactos nos dois sectores.</li></ul> O no-op `late` foi removido. |
| S8 | Documentar | Sobreposição semântica com a FX V3: nomes de bandas, tabela de densidade, linhas de base de evidência, atributos `puffSpin/puffShape` reenviados, textura de poeira. | **Resolvido/documentado.** <ul><li>As bandas passam a `0-1.2km`/`1.2-2.6km`/`>2.6km`.</li><li>Densidade alinhada com o FX (0,78).</li><li>O fumo distante tem batch/material próprios: não depende dos atributos nem do material da V3 e só envia atributos que escreve.</li><li>Linhas de base e textura de poeira documentadas no HANDOFF.</li></ul> |
| S9 | HANDOFF | Afirmações contraditas pelo código. | **Corrigido.** <ul><li>EVIDENCE/REVIEW e o estado de desenvolvimento estão escritos.</li><li>Aviões ≥2 km por construção.</li><li>Frente norte a 0,85–1,5 km.</li><li>Colunas «até 3» e coluna longínqua mais cedo (+240 s).</li><li>Fumo longínquo visível graças à perspectiva aérea própria.</li><li>Silhuetas ≤1–1,4 px.</li><li>Redacção corrigida: 1–3 aviões, agacham-se, actividade a 12 %, câmara também amplia figuras.</li><li>Áudio existente descrito.</li><li>Curta distância declarada fora do âmbito.</li><li>Ressalvas históricas (dramatização, PARCIAL).</li></ul> |

Nits resolvidos:
- Baixa sem nuvens de tiro, como o comentário dizia.
- Scan de Lisewo com folga.
- A resposta espera a chegada das balas.
- Os tiros da peça anticarro têm voo e cadência irregular.
- Os carregadores do ferido andam juntos.
- Os pools de aviões/figuras cabem os picos, e as figuras entram por grupos inteiros.
- `trail` sem uso removido.
- A fonte ambiente nomeia o evento que a abre.
- Transformação própria para os aviões.
- Os 7 px são px CSS.

Não alterado: a luz do dia continua derivada de `skyLight.intensity` (cálculo exacto; passar o valor directamente tocaria uma linha que a branch da arma também muda).

Alterações depois da revisão, verificadas pelos mesmos testes e capturas:
- Cache dos eventos por balde (`bdfbab7`), com resultado igual ao recálculo (teste novo).
- Colunas de fumo à escala de 1,5–3 km (`24d2ed7`). Do olho do jogador, o contributo da camada no frame das colunas passou de 87 para 389 píxeis.
- As capturas antes/depois da cache são idênticas (eventos, instâncias e diff da camada nos 12 frames).
