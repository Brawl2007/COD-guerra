# M01 — partida contínua no navegador

> Três partidas de M01, cada uma numa única sessão Chromium, do menu ao debrief. Não houve snapshots injectados nem continuação por trechos.
>
> **É um piloto automático, não um playtest humano.** O piloto:
> - usa teclado, cliques e captura do rato reais do navegador;
> - olha com eventos `mousemove` relativos, como os testes de navegador;
> - lê o estado apenas por `gameDiagnostics()` (`?debug=1`, só leitura) e pelo HUD.
>
> Não altera relógios, eventos, objectivos nem saves.

- **Ambiente:** Chromium 141 (SwiftShader), 1280×720, build de produção servido em `/COD-guerra/`.
- **Script:** [`tools/m01-browser-playthrough.mjs`](../../../../tools/m01-browser-playthrough.mjs).
- **Desempenho:** SwiftShader não mede o Chromebook. O relógio de jogo andou perto do tempo real (≈0,97 s de jogo por segundo).

## Resultado

| Partida | Código | Resultado | Duração real | Bloqueios / mortes / perdas de controlo | Bąk | Erros de página / pedidos falhados |
| --- | --- | --- | ---: | --- | --- | --- |
| 1 | `0cecb44` (estado entregue pelo Codex) | Debrief, 12 objectivos (resgate expirado) | 1276 s | 0 / 0 / 0 | `rescued_by_dudek` | 0 / 0 |
| 2 | Correcções 1–4 | Debrief, 12/12 | 1118 s | 0 / 0 / 0 | `rescued_by_player` | 0 / 0 |
| 3 | Correcções 1–5 | Debrief, 12/12 | **1083 s** | 0 / 0 / 0 | `rescued_by_player` | 0 / 0 |

Detalhes da partida 3:
- passou pelos quatro checkpoints (CP-A 04:30:44, CP-B 04:35:45, CP-C 05:34:01, CP-D 06:10:37);
- consumiu 25 eventos (o 26.º, Dudek a buscar Bąk, não ocorre quando o jogador o resgata);
- terminou com saúde 92.

Relatórios:
- [report.json](report.json) e [log.jsonl](log.jsonl): partida 3;
- [run1-before-fixes.report.json](run1-before-fixes.report.json): partida 1, antes das correcções;
- [run2-before-corridor-fix.report.json](run2-before-corridor-fix.report.json): partida 2, antes da correcção do corredor.

## Problemas encontrados e correcções

| # | Tipo | Encontrado na partida 1 | Correcção | Verificação |
| --- | --- | --- | --- | --- |
| 1 | Navegação (bloqueante para um humano) | "Leve a caixa aos sapadores": os sapadores ficavam em x≈−42, mas a entrega só era aceite em `repair_site_2` (x≈−120), onde não havia ninguém. Quem voltasse aos sapadores não via "E · entregar material". | Os sapadores (`ENGINEER`) seguem para o segundo corte quando o material é pedido. | Teste Node; [11-sappers-site2.png](11-sappers-site2.png) |
| 2 | Orientação | Sem indicação de rumo; em CP-B, os sapadores ficam 107 m **atrás** do jogador. Captura antes: [before-find-sappers.png](before-find-sappers.png). | Indicação de destino, distância e lado ("Sapadores no aterro: 87 m, em frente"). Aparece 4 s após cada objectivo de deslocação e repete a cada 15 s só se o jogador não se aproximar. | Teste Node; mensagens em `report.json` |
| 3 | Ritmo | Reparo concluído às 04:49; ordem às 05:30. Eram **4,5 min reais** com "Mantenha contacto com a secção" e nada para fazer. | `readyScale: 27` em `seg_repair`: com o gate pronto, o resto do segmento corre a 27×. Horários dos eventos inalterados. | Teste Node; espera desceu para **94 s** reais |
| 4 | Resgate / feridos | Bąk só saía às 06:00 de x=−82. Às 06:04 era ferido em x≈22, **atrás** do jogador, e não em `bak_wound_point`. Com 1 m de atraso não havia ferimento nem resgate. O objectivo opcional não aparecia no HUD. Antes: [before-bak-wounded.png](before-bak-wounded.png). | Bąk ocupa a posição no tabuleiro com a ordem das 05:30. O HUD acrescenta "· (Opcional) Leve Bąk até o socorrista" e a indicação de direcção aponta para ele. | Teste Node; [22](22-bak-wounded.png), [23](23-bak-found.png), [24](24-bak-carry.png), [26](26-bak-delivered.png) |
| 5 | Retardatários | O pelotão leste parava a 0,8 m de (−110, 40), em x≈−109,2, e a condição `x>-110` nunca mudava de etapa. "Conte os que passam": ninguém passava pelo posto de disparo ([before-empty-corridor.png](before-empty-corridor.png)). | Três etapas com limiares que não prendem; recuo a correr (5,5 m/s); lugar próprio no fim para cada soldado. | Teste Node: os 12 sobreviventes passam a <15 m do posto às ~06:33; [35-corridor-5.png](35-corridor-5.png) e [recorte](35-corridor-5-zoom.png) |

A rota de simulação ([`../simulation-report.json`](../simulation-report.json)) continua a chegar ao debrief com os quatro checkpoints; agora em 937 s de jogo.

## Capturas da partida 3

| Imagem | Momento |
| --- | --- |
| [06-delivered.png](06-delivered.png) | Entrega da mensagem no posto da ponte ferroviária (04:31) |
| [11-sappers-site2.png](11-sappers-site2.png) | Com a caixa: sapadores ajoelhados no segundo corte da linha |
| [16-hold-access.png](16-hold-access.png) | Ponte rodoviária às 05:35; Bąk a caminho da posição |
| [19-withdrawal-1.png](19-withdrawal-1.png) | Pelotão leste a recuar pelo tabuleiro (06:01) |
| [22-bak-wounded.png](22-bak-wounded.png) | Bąk ferido à frente do jogador; HUD com o objectivo opcional |
| [23-bak-found.png](23-bak-found.png) | "E · levar Bąk" |
| [24-bak-carry.png](24-bak-carry.png) | Junto do socorrista: "E · entregar Bąk" |
| [26-bak-delivered.png](26-bak-delivered.png) | Bąk entregue; o objectivo opcional sai do HUD |
| [30-firing-point.png](30-firing-point.png) | Posto de disparo, fase do corredor |
| [35-corridor-5.png](35-corridor-5.png), [zoom](35-corridor-5-zoom.png) | Soldado do pelotão a chegar pelo corredor (06:31) |
| [41-west-demolition.png](41-west-demolition.png) | 06:45 visto do posto de disparo: o barracão tapa a ponte (ver pendências) |
| [44-roll-call.png](44-roll-call.png) | Chamada no abrigo (07:05) |
| [46-debrief.png](46-debrief.png) | Debrief |

## Pendências observadas (não corrigidas aqui)

- **Bąk transportado ou entregue não é representado.** Ao ser levado fica inactivo e desaparece; não há corpo ao ombro nem ferido junto de Dudek. Mostrá-lo activo junto do portal exige rever a prontidão da demolição oeste (aliados activos a x<−90) e a evacuação dos feridos.
- **A demolição oeste não se vê do posto de disparo.** O barracão (x −270…−250, z 14…26) tapa a linha de vista para as pontes. A demolição leste (06:10, ~810 m) só se ouve: o clarão só é desenhado abaixo de 500 m. Decidir entre mover posto/barracão no mapa (P12) e encenar o olhar.
- **Chamada final sem encenação.** A câmara mostra a parede do abrigo e as legendas; não há personagens em cena.
- **Munição.** 45 cartuchos sem reabastecimento em M01. Na partida 1, o piloto disparou a cada 6 s e ficou sem munição às 05:35, antes da retirada. O validador exige `mag+reserve+shotCount = 45`, por isso um reabastecimento precisa de mudar esse invariante.
- **Sem ameaça nas tarefas de cobertura.** "Proteja o reparo" e "Cubra a retirada" não mostram ameaça legível. O reparo não foi suprimido em nenhuma partida, e os sobreviventes do pelotão leste chegaram sempre ao mínimo de 12: a supressão a ~650 m com alça aberta é improvável. *Tratado na [terceira ronda](#terceira-ronda-ameaça-no-reparo-e-na-retirada).*
- **"Abrigue-se!" pode não aparecer.** O objectivo conclui-se logo se o jogador já estiver na cobertura do posto avançado.
- **Ainda falta:** playtest humano completo, medição no Chromebook e rotas adversas (morrer, sair dos limites, ignorar objectivos).

## Reproduzir

```sh
npm ci && npm run build
npm run preview &
CHROME_EXECUTABLE=/caminho/para/chromium node tools/m01-browser-playthrough.mjs --out test-results/m01-continuous
```

Cada partida demora ~18–21 min reais com SwiftShader.

## Segunda ronda: feridos, demolições, chamada, munição e rotas adversas

Partida contínua com `--adverse`, numa única sessão Chromium, do menu ao debrief:
- **Resultado:** 1308 s reais, 12/12 objectivos, CP-A..D.
- **Restauros:** dois, ambos intencionais (rotas adversas abaixo).
- **Sem incidentes:** 0 perdas de controlo, 0 erros de página, 0 pedidos falhados.
- Relatório: [round2/report.json](round2/report.json).

| Rota adversa | Resultado |
| --- | --- |
| Sair a leste pelo tabuleiro (x>401) | Aviso a x>270. Depois "Volte em 8…1 s", falha legível e restauro de CP-A em (−66, 22). |
| Cair no Vístula pela margem | "Você caiu no Vístula." e restauro de CP-A. |
| Ficar 2 min parado em "Siga a voz do sargento" | Zieliński continua a chamar; nada falha nem avança sozinho; o relógio corre 04:34→04:40. |
| Gastar a munição | "Pouca munição. Kowal tem carregadores: 46 m, em frente"; Kowal passa 30 cartuchos (reserva 10→40). |

**Problema encontrado nesta ronda e corrigido.** Na primeira tentativa da rota leste, o piloto contornou os sacos de areia e caiu do tabuleiro ao rio pelas aberturas da treliça. `TczewWorld.move` passa a impedir quedas de mais de 1,5 m a partir de um tabuleiro de vão:
- vale para a lateral e para um vão demolido, e não afecta as balas;
- da margem continua a cair-se ao Vístula, porque essa falha é intencional.

**Mudanças, todas com regressões em `tests/m01-continuous-fixes.test.js`:**

| Antes | Agora | Captura |
| --- | --- | --- |
| Bąk desaparecia ao ser levado ou entregue. | Na vista vêem-se as pernas ao ombro. Entregue, fica deitado junto de Dudek. Depois das 06:10, Dudek leva-o para a estação e volta à secção. No ramo Dudek (06:14), Dudek vai buscá-lo ao tabuleiro e ambos ficam na estação (`dlg_m01_056b/057b`). Nunca seguram a demolição oeste. | [carregar](round2/31-bak-carry-deck.png), [entregue](round2/34-bak-delivered.png) |
| Demolições sem clarão; coluna fraca; vibração só abaixo de 500 m. | Clarão no ponto real. Coluna de poeira de ~100 m que cresce em 12 s. Vibração quando chega o estrondo, até 1 km (`cs_m01_east_blast` t=2,1). | [oeste por cima do barracão](round2/51-west-demolition-6s.png), [leste fora da treliça](round2/east-blast-dust-9s.png)* |
| Chamada: a câmara via a parede do abrigo. | Os presentes sentam-se no abrigo, de frente para Jan, e ninguém sai do lugar durante a cena. Ausentes (Bąk/Dudek na estação, Nowicki) não são encenados. | [chamada](round2/54-roll-call-10s.png) |
| 45 cartuchos sem reabastecimento. | Kowal passa até 6 carregadores. O save valida `mag+reserve+shotCount = 45 + received`; saves antigos continuam válidos. | [Kowal](round2/20-kowal-ammo.png) |

\* Única captura encenada: continuação do CP-C real da rota, com o jogador entre as pontes, fora da treliça. De dentro da treliça rodoviária, o lattice tapa a coluna junto ao ponto de fuga; aí o aviso é o som, a vibração e a fala de Zieliński.

**Continua pendente:**
- ameaça legível em "Proteja o reparo" e "Cubra a retirada" (tratada na terceira ronda);
- "Abrigue-se!" pode não aparecer;
- arte do transporte (placeholder);
- playtest humano;
- Chromebook.

## Terceira ronda: ameaça no reparo e na retirada

**Pedido:**
- dar ao fogo alemão uma origem visível na margem leste, com sons, impactos e reacções dos aliados;
- verificar se a supressão interrompe de facto o reparo e se a cobertura do jogador muda a retirada;
- testar "jogador ajuda" e "jogador ignora".

### Porque não havia ameaça

| Causa | Evidência |
| --- | --- |
| Os sapadores em `repair_site_2` ficam abaixo do tabuleiro e atrás do poste sul do portal ferroviário. Nenhuma linha recta vinda da margem leste lhes chega. | Varrimento de linhas de visão com os colisores: 0/44 posições do dique viam os sapadores; os tiros em recta batiam no tabuleiro ou nas torres. |
| Os 40 alemães estavam atrás do portal de Lisewo (colisor sólido x 1058,7–1067,7, z −8…48). | `COL_portal_lisewo_1912` era o primeiro obstáculo de quase todas as linhas. |
| Dois terços do reparo terminavam antes de o trem 963 chegar (04:45). | Com a caixa entregue às 04:42, 75 s de trabalho a 3,5× davam 68 % antes de qualquer tiro. |
| O tiro do jogador só conta até 1200 m (perfil do wz.29), e as posições alemãs estavam a ~1210 m. | — |
| Na retirada, o pelotão corria pelo meio do tabuleiro, na linha de tiro do jogador ("Nos nossos, não!"). A contagem de 20 s começava às 06:00, por isso a primeira baixa caía no instante em que os alemães apareciam. | Instrumentação: 3 de 11 tiros bateram em soldados polacos; 4 baixas nos primeiros 7,5 s reais. |
| **Arte:** os dois arcos do portal ferroviário oeste (centros ±2 m, 4,4 m de largura) sobrepunham-se 0,4 m. A triangulação descartava os furos e o portal era um muro fechado: o jogador atravessava-o e não via a margem leste através dele. | Raios contra o GLB: face sólida em x = −6,5 em toda a passagem. |

### O que mudou

- **Origem visível.** Vistas da cabeça de ponte oeste, as treliças tapam o dique. Só a faixa dos portões de Lisewo, entre as pontes, se vê por cima da água (raios contra os GLB e contra os colisores).
  - Ficam lá as duas MG34 e 12 atiradores (`grp_de_east.firePositions`); só eles disparam sobre a margem oeste.
  - Os 26 do dique disparam sobre a cabeça de ponte leste e, depois das 06:00, sobre o pelotão.
- **Tiros como dados.** Cada tiro guarda origem, ponto visado, flecha e horas de partida e chegada, e entra no save. A flecha (≈9 m a 1,2 km) é uma aproximação de jogo, não balística medida. O impacto resolve-se à chegada.
- **Apresentação:**
  - clarão (~8 px mínimo no ecrã) e fumo da boca durante ~2 s;
  - um traçante por rajada de MG;
  - poeira na terra, faísca no metal;
  - estampido com atraso de 343 m/s;
  - estalo quando um tiro passa a menos de 6 m do jogador.
- **Reacções:**
  - sapadores ajoelhados a trabalhar e deitados sob fogo (a equipa toda);
  - Kowal responde ao clarão mais recente que vê e diz "Trocando carregador!" quando a rkm recarrega;
  - falas reais: `dlg_m01_022` (primeira supressão), `026`, `027`, `040`, e os callouts "Metralhadora no dique!" e "Deitaram! Continua!" (quando o tiro do jogador cala uma MG).
- **Reparo:**
  - 150 s de trabalho sem supressão;
  - um tiro a menos de 3 m pára 3,5 s;
  - a MG calada precisa de 2,5 s para voltar à arma;
  - tolerância de 120 s sem aviso.
- **Retirada:**
  - recuam os 18 sobreviventes por ID;
  - a contagem de 20 s começa às 06:05;
  - cada baixa é um tiro real de um alemão do tabuleiro que vê o último homem;
  - o pelotão corre junto à treliça norte e os alemães pela metade sul.
- **HUD.** Linha de estado sob o objectivo, lida só da simulação: "Reparo 47 % · sapadores deitados sob fogo da metralhadora do dique" ou "… a trabalhar · metralhadora do dique suprimida"; "Pelotão leste: 16 homens · alemães no tabuleiro suprimidos".
- **Correcções de arte e apresentação:**
  - arco único no portal ferroviário oeste e no antigo portal leste, com a largura da abertura dos colisores;
  - carris da linha sudoeste assentes no terreno, numa só instância (antes flutuavam até 3 m e passavam à altura dos olhos junto aos sapadores).

### "Jogador ajuda" e "jogador ignora"

**Comparação de estado** ([round3/cover-comparison.json](round3/cover-comparison.json), `node tools/m01-cover-comparison.mjs`).
- 12 sementes × 2 percursos completos até ao debrief, só com controlos e com o que o jogador vê (`threat.recentFire`).
- Não é partida no navegador.
- **Ajuda:** encosta ao lado dos sapadores, a calar a MG dos portões; carregadores de Kowal; lado sul do tabuleiro, a disparar sobre os alemães do tabuleiro.
- **Ignora:** atrás dos sacos de areia, sem disparar.

| | Ajuda | Ignora |
| --- | --- | --- |
| Reparo (s reais desde a entrega) | 168–207 | 206–248 |
| Fim do reparo | 05:02–05:08 | 05:08–05:14 |
| Vezes que os sapadores foram deitados | 9–27 | 42–81 |
| Tempo com a MG dos portões calada (reparo sob fogo) | 98 % | 4–9 % (só Kowal) |
| Sobreviventes do pelotão leste | 15–18 (18 em 11 sementes) | 12 em todas |
| Saúde final do jogador | 84–100 | 76–100 |
| Ordem de demolição / demolição leste / oeste | 05:30:00 / 06:10:00 / 06:45:00 | igual |

Nos dois percursos:
- CP-A..D, 12 objectivos e debrief;
- nenhum sobrevivente a leste de x = 660 na demolição;
- cada baixa do pelotão é um tiro que chegou (`round-impact` com vítima), por ID e de 20 em 20 s de relógio a partir das 06:05:20.

**Partidas contínuas no navegador**:
- uma sessão Chromium cada, do menu ao debrief, com input real;
- `--cover help` e `--cover ignore`, depois das correcções abaixo;
- relatórios em [round3/help/report.json](round3/help/report.json) e [round3/ignore/report.json](round3/ignore/report.json).

| | Ajuda | Ignora |
| --- | --- | --- |
| Resultado | Debrief, 12/12, CP-A..D, 1241 s reais | Debrief, 12/12, CP-A..D, 1223 s reais |
| Bloqueios / mortes / perdas de controlo / erros de página | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| Linha de estado do HUD diferente da simulação | 0 em 132 mudanças | 0 em 151 mudanças |
| Reparo (s reais desde a entrega; fim) | 214 s; 05:11:13 | 230 s; 05:13:12 |
| Vezes que os sapadores foram deitados | 29 | 54 |
| MG dos portões | guarnição abatida pelo jogador por volta das 04:47–04:49 (2 baixas alemãs nos portões) | calada 6 % do tempo, só por Kowal |
| Pelotão leste | **18** sobreviventes, nenhuma baixa | **12**: uma baixa a cada ~20 s de relógio, das 06:05:24 às 06:07:06 |
| Tiros do jogador | 18 | 0 |
| Bąk | levado depois das 06:10 e evacuado por Dudek; demolição oeste às 06:45 | levado às 06:09 |

**Observado na diferença:**
- **Reparo.** Calar a MG dos portões deixa menos supressões (29 contra 54) e acaba o reparo antes. A diferença é pequena no navegador (16 s), porque os atiradores dos portões continuam a disparar sobre os sapadores e o piloto só mira a MG. Na comparação de estado, com a MG viva e calada, a diferença é de ~40 s.
- **Retirada.** Aqui a diferença é decisiva: o fogo de cobertura sobre o tabuleiro mantém os alemães deitados, e os 18 homens chegam vivos. Sem ele, o pelotão cai até ao mínimo de 12, e cada queda é um tiro visível de um alemão do tabuleiro.

**Problemas encontrados pelas partidas e corrigidos nesta ronda:**
1. **Bąk entregue depois das 06:10 bloqueava a demolição oeste.** Ficava ferido junto ao portal (x≈−9), dentro da zona; a hora parou às 06:44:30 durante 997 s. Dudek passa a evacuá-lo logo; há uma regressão em `tests/m01-continuous-fixes.test.js`.
2. **Piloto a disparar contra uma posição calada.** Depois de abater a guarnição da MG, o piloto continuava a disparar sobre o último clarão e ficava sem munição. Passa a esperar por clarões (12 s), como um jogador.

**Capturas:**

| Imagem | Momento |
| --- | --- |
| [help/16-repair-help-flash-1.png](round3/help/16-repair-help-flash-1.png) | Clarão da MG dos portões, visto da encosta dos sapadores |
| [help/15-repair-help-2.png](round3/help/15-repair-help-2.png) | "Reparo 29 % · sapadores a trabalhar · metralhadora do dique suprimida" |
| [help/19-repair-help-3.png](round3/help/19-repair-help-3.png), [help/22-repair-help-6.png](round3/help/22-repair-help-6.png) | "sapadores deitados sob fogo da metralhadora do dique" |
| [help/33-withdrawal-help-flash-1.png](round3/help/33-withdrawal-help-flash-1.png) | Alemães no tabuleiro: clarão à mira, do lado sul |
| [help/36-withdrawal-help-1.png](round3/help/36-withdrawal-help-1.png), [help/41-withdrawal-help-6.png](round3/help/41-withdrawal-help-6.png) | "Pelotão leste: 18 homens · alemães no tabuleiro suprimidos" |
| [help/45-bak-carry-deck.png](round3/help/45-bak-carry-deck.png), [help/48-bak-delivered.png](round3/help/48-bak-delivered.png) | Bąk levado depois da demolição leste |
| [help/63-west-demolition-6s.png](round3/help/63-west-demolition-6s.png), [help/69-debrief.png](round3/help/69-debrief.png) | Demolição oeste às 06:45 e debrief |
| [ignore/19-repair-ignore-6.png](round3/ignore/19-repair-ignore-6.png), [ignore/23-repair-ignore-10.png](round3/ignore/23-repair-ignore-10.png) | Atrás dos sacos de areia, sem disparar; os portões ao fundo |
| [ignore/37-bak-carry-deck.png](round3/ignore/37-bak-carry-deck.png) | "Pelotão leste: 12 homens · alemães no tabuleiro a disparar sobre eles" |
| [staged/sappers-pinned.png](round3/staged/sappers-pinned.png)* | Sapadores deitados em primeiro plano; HUD igual |
| [staged/gate-mg-flash.png](round3/staged/gate-mg-flash.png)*, [zoom 4×](round3/staged/gate-mg-flash-zoom4x.png) | Clarão entre os portais oeste, na janela entre as pontes |
| [staged/withdrawal-deck.png](round3/staged/withdrawal-deck.png)* | Retirada vista do tabuleiro, a contagem a descer |

\* Continuações de saves gerados pela rota da simulação (estado real, sem injecção), carregados no build de produção. Não são partida contínua. O teste de navegador `German fire on the repair is drawn from the Lisewo gates…` faz o mesmo no CI e exige três coisas: clarão e poeira desenhados, os dois estados do reparo, e o HUD igual à simulação em todas as amostras.

**Continua pendente:**
- **Arte.** Humanos, MG e fumo são placeholders. O clarão tem tamanho mínimo no ecrã para ser legível a 1,2 km; falta validar isso num playtest humano.
- **"Mantenha a cabeça de ponte".** A salva de ajuste vem do dique, atrás das treliças: traçante e impactos à vista, origem não.
- **Balística.** A flecha do tiro alemão é aproximação de jogo; o wz.29 continua em recta.
- **Piloto.** No reparo só mira a MG dos portões; um jogador também pode calar os atiradores.
- **Validação.** Playtest humano e Chromebook. M01 continua **PROTÓTIPO JOGÁVEL**.

