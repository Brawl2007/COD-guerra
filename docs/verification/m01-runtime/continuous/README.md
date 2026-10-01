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
- **Sem ameaça nas tarefas de cobertura.** "Proteja o reparo" e "Cubra a retirada" não mostram ameaça legível. O reparo não foi suprimido em nenhuma partida, e os sobreviventes do pelotão leste chegaram sempre ao mínimo de 12: a supressão a ~650 m com alça aberta é improvável.
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
| Chamada: a câmara via a parede do abrigo. | Os presentes são posicionados no abrigo, de frente para Jan (pose sentada pendente), e ninguém sai do lugar durante a cena. Ausentes (Bąk/Dudek na estação, Nowicki) não são encenados. | [chamada](round2/54-roll-call-10s.png) |
| 45 cartuchos sem reabastecimento. | Kowal passa até 6 carregadores. O save valida `mag+reserve+shotCount = 45 + received`; saves antigos continuam válidos. | [Kowal](round2/20-kowal-ammo.png) |

\* Única captura encenada: continuação do CP-C real da rota, com o jogador entre as pontes, fora da treliça. De dentro da treliça rodoviária, o lattice tapa a coluna junto ao ponto de fuga; aí o aviso é o som, a vibração e a fala de Zieliński.

**Continua pendente:**
- ameaça legível em "Proteja o reparo" e "Cubra a retirada";
- "Abrigue-se!" pode não aparecer;
- arte do transporte (placeholder);
- playtest humano;
- Chromebook.

**Actualização posterior:** a chamada recebeu poses persistentes (`../poses/`). O fogo no reparo/retirada e o aviso de abrigo receberam a revisão descrita em [`../cover-combat/`](../cover-combat/README.md). Essa revisão tem comparação de simulação e verificações por continuação no navegador; os relatórios contínuos acima precedem-na e não comprovam a dificuldade actual. É necessário repetir a partida contínua e fazer playtest humano.
