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
