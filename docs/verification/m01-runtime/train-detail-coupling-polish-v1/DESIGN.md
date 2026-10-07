# Composição do trem 963 — desenho do polish (apresentação)

TASK_ID `M01-TRAIN-DETAIL-COUPLING-POLISH-V1`. Só apresentação: o plano dos 65 vagões (`M01_TRAIN_WAGON_PLAN`: ids, tipos, x = 1090 + i·9,10 m, z = −2,5), a selecção de LOD com histerese, os proxies de fallback, a visibilidade `train963`, o save, a simulação, a locomotiva 963, o Panzerzug, o pátio e os eventos ficam como na base `99309d9`.

## O que estava errado na base (medido)

Ferramenta: `node tools/verification/m01-train-consist-audit.mjs` (GLB reais; piso da roda medido por fatia dos triângulos no plano da cabeça do carril). Dados em `audit-node.json`.

| Medida | Base `99309d9` | Agora |
|---|---|---|
| Piso da roda acima do topo do carril (−0,82 m, o da via leste e da locomotiva) | **+0,83 m** (LOD0) / +0,85…0,88 m (LOD1/2): vagões a flutuar | LOD0: 0 no centro da cabeça, ±6,5 mm nas arestas (cone do kit); LOD1/2: +1,6…4,3 cm (rodas de 8 lados) |
| Afastamento lateral ao eixo de uma via | −3,04 m (vagão 1) a −7,4 m da `rail_line_east`; **27 vagões sem carril nenhum** (troço > 1800 m não é desenhado) | 0 m: via própria em z = −2,5 |
| Espaço entre caixas (tampões) | LOD0 0; LOD1 0,04 m; LOD2 coberto 0,12 m; **LOD2 aberto 1,18 m** (sem tampões) | igual nos GLB (não tocados); silhueta de tampões só nas pontas LOD2 abertas |
| Sombra própria dos vagões | nenhuma (só `receiveShadow`) | batches GLB LOD0 projectam em Medium/High (≤ 8); sombra de contacto sob vagões LOD0/1 |
| Variação entre vagões | nenhuma (mesma cor, mesma orientação) | tom/sujidade, orientação de topo, tábuas substituídas e guias de papel por id |

Deslocamento de arte: `M01_TRAIN_ART_OFFSET_Y = −0,82 − 0,0125 = −0,8325 m`. O kit tem piso cónico (r 0,500 a 0,685 m do centro do eixo → 0,475 a 0,820 m); sobre o centro da cabeça (0,7525 m) o raio é 0,4875, 1,25 cm acima da origem «topo do carril» do kit. A locomotiva usa −0,82 com o seu próprio GLB. A âncora do plano (`first/last`) continua `[x, 0, −2,5]`. O Panzerzug está em z = +2,5 com −0,82: a cena já implica duas vias a 5 m; a do Panzerzug não foi tocada.

## Módulo novo `src/render/m01-train-consist-detail.js`

Ligado só por `src/render/m01-train-wagons.js`. Não cria colisores, não importa `src/game`/`src/world`, não usa `Math.random` nem o RNG da simulação. Variação = hash FNV‑1a do id autoritativo do vagão (memorizado).

- **Via própria** (no grupo `train963`, aparece com o trem): carris de bitola 1,435 m entre faces internas, topo a −0,82, 79 troços iguais (≈11,9 m) de 1062 a 2000 m (158 instâncias, 1 draw); 1250 travessas de 0,75 m com tom de creosote por instância (1 draw, material `wood` existente); balastro com textura de gravilha 64×64 gerada no código (1 draw, 1 textura nova). Carris e travessas só existem enquanto algum vagão está em LOD0/1; da área jogável (x ≤ 440, ≥ 622 m) só fica o balastro.
- **Tiers** (`m01DetailTier`, sobre o mais grosseiro entre o LOD desenhado e o LOD de distância): High/Medium → LOD0 *near*, LOD1 *mid*, LOD2 *far*; Low → LOD0 *mid*, LOD1/2 *far*. Proxy → nada. Cada intervalo usa o tier mais fino dos dois vizinhos.
  - *near*: estrado (travessas intermédias, longarinas do engate, diagonais), cilindro de freio, reservatório auxiliar e válvula pendurados do soalho, alavancas e tirantes até às vigas de freio, suspensões das sapatas, conduta geral, apoios das molas, porta-guias; entre vagões placas e mangas dos tampões, guia do gancho, engate de parafuso montado (manivela e estribo sobre o gancho vizinho), engate do outro vagão pendurado, mangueiras de freio unidas; pontas da composição com engate e mangueira pendurados; tábuas substituídas e guias de papel (material com polygon offset).
  - *mid*: travessas, cilindro/reservatório com suportes, tirantes; tampões, engate e mangueiras em barras.
  - *far*: nada sobre arte que já tem tampões; as pontas de vagões abertos desenhados em LOD2 recebem a silhueta dos tampões e do engate até ao plano de contacto.
  - Sombra de contacto (alfa por vértice) 5 mm acima das travessas, só em vagões *near/mid*.
- **Variação** (`m01WagonVariation`): tom `standard/faded/grimy/warm` ±4 % por `instanceColor` nas batches GLB existentes (mesma geometria e material partilhados); 31/65 vagões virados de topo (arte simétrica, mas pintura e freio fora do centro mudam de lado); 0–3 tábuas substituídas; guias de papel em 38/65; lado do engate montado por intervalo. Tipo autoritativo inalterado.
- **Sombras**: nenhum detalhe projecta no mapa de sombra 1024² (engates, mangueiras e tirantes são menores do que um texel); só os batches GLB LOD0 em Medium/High.
- **Orçamento**: 11 batches fixas (8 de detalhe + balastro, carris, travessas), limite declarado 12; nunca por vagão. Capacidades: 65 vagões, 64 intervalos, 2 pontas, 130 pontas sem tampões, 325 peças de desgaste.

Medidas genéricas estimadas (P16 continua aberta): engate de parafuso ≈0,8 m, mangueiras de freio a ar em todos os vagões (conduta geral), cilindro/reservatório como forma genérica de freio de ar de mercadorias. Sem inscrições, carga, garita de guarda-freio ou sinal de cauda.

## Limites conhecidos

- Locomotiva (fixa em 1075, tender até 1083,40) e vagão 1 (x 1090, tampão a 1085,45) ficam a **2,05 m** entre faces de tampão: a composição parece desengatada da locomotiva (`AFTER-locomotive-wagon1-high.png`). Fechar exige mudar a âncora do plano ou a da locomotiva, ambas proibidas; o vagão 1 mostra engate e mangueira pendurados.
- Proxies de fallback mantêm a âncora e as matrizes da base (como o proxy da locomotiva): com todos os GLB em falta, os blocos ficam acima da via nova (`AFTER-fallback-proxies-high.png`). Só com falha total de assets.
- Rodas LOD1/LOD2 (8 lados): até 4,3 cm acima da cabeça, < 0,7 px na distância mínima de LOD1 (31 m em Low).
- A via própria surge com o trem (grupo `train963`), tal como o trem aparece parado no evento. A `rail_line_east` existente continua desenhada a 2,9–7,4 m, como via divergente.
- Do tabuleiro da ponte às 04:50 o portal de Lisewo fechado esconde a composição; na área jogável (x ≤ 440) os 65 vagões estão sempre em LOD2. O pormenor *near* só se vê a curta distância na margem leste (capturas com o jogador reposicionado).
- Sem sol antes das ~04:55 (C01): nas capturas da chegada não há sombra directa; a sombra de contacto assenta os vagões. Às 06:13 há sombra do sol.
