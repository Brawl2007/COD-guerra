# HANDOFF — M01 vegetação e folhagem (closeout de produção)

TASK_ID: `M01-VEGETATION-FOLIAGE-PRODUCTION-CLOSEOUT-V1`
BASE: `codex/m01-bridge-portal-material-detail-polish-v1 @ 99309d9cb023cc94a07d41ff863e1362e4460570`

M01 continua **PROTÓTIPO JOGÁVEL**. Alteração só de apresentação: sem mudanças em gameplay, pathing, colliders autoritativos, IA, RNG da simulação ou estado da missão.

## O que mudou para o jogador

| Área | Antes | Agora |
|---|---|---|
| Árvores | 6 perfis por `serial % 6` (repetição sistemática), copas de icosaedros lisos, troncos quase pretos | 8 espécies (carvalho, tília, choupo, bétula, pinheiro-silvestre, salgueiro, salgueiro podado, tronco morto) escolhidas por contexto; copas com lóbulos irregulares, textura de folhas projectada no mundo e contorno recortado; casca com cor própria por espécie (bétula clara, pinheiro avermelhado) |
| Distribuição | 68 árvores visuais uniformes em dois rectângulos | 195 árvores em 19 bosques com amostragem tipo Poisson, orlas, linhas irregulares de salgueiros podados em valas na várzea leste; espaçamento sem grelha (CV do vizinho mais próximo 0,41) |
| Arbustos | inexistentes | 716 arbustos (aveleira, sabugueiro, silvas, giesta, secos, mortos) em sub-bosque, orlas, margens ferroviárias e cerca norte; nunca em corredores, objectivos ou coberturas |
| Relva / vegetação baixa | 1 tufo de 4 triângulos repetido, quase invisível | 4 geometrias (prado, gramínea com espigas, folha larga, caniço), gradiente de cor base→ponta, manchas secas/verdes por campo de ruído, ervas entre travessas e no balastro, bases de muros/cerca/árvores |
| Dano | perfil "damaged" a cada 6.ª árvore | 19 copas danificadas (um lado arrancado, tom acastanhado) só junto da cabeça de ponte; 8 troncos mortos; arbustos secos/mortos nas zonas bombardeadas |
| Assentamento | troncos começam exactamente na cota do terreno | troncos enterrados com raiz alargada; lóbulos de arbustos parcialmente enterrados; sombra de contacto suave inclinada ao declive sob copas e arbustos |
| Vento | nenhum | balanço da relva no vertex shader pelo relógio da missão (frames reproduzíveis em pausa/restauro) |
| LOD / distância | árvores near/mid/far | árvores near/mid/far mantidas (com histerese); arbustos near (80 tri) / mid (2×20 tri) / descartados; relva transmitida só no raio de fade da qualidade e encolhida a zero no shader |
| Névoa / luz | — | todos os materiais usam a névoa da cena; folhagem com AO por vértice e textura que converge para a média de mip na distância |

## Implementação

- `src/render/m01-vegetation-layout.js` — dados puros (sem THREE, sem RNG da simulação): espécies, bosques, keep-outs (carris, estrada, linha de ignição, objectivos, coberturas, estação, abrigo, limites jogáveis), árvores visuais, arbustos, relva, intercalação determinística para a Baixa.
- `src/render/m01-vegetation-art.js` — geometrias e materiais procedurais: lóbulo irregular com AO, tronco com raiz, lâminas de relva, textura de folhas tileable, sombra de contacto, shader da copa (triplanar + recorte por ângulo rasante, desligado à distância) e shader da relva (vento + fade).
- `src/render/m01-environment.js` — descriptors por espécie com matrizes pré-compostas; a mudança de LOD só copia floats para os batches partilhados. Arbustos reutilizam os batches de copa/madeira (zero draw calls extra). O fluxo legado `this.random` é consumido exactamente como antes, por isso o entulho mantém as coordenadas aprovadas.
- `src/render/m01-view.js` — `sync` recebe `sim.clock` para o vento.

As 17 árvores sólidas aprovadas mantêm id, posição, altura, raio e caixa de colisão; só mudam de aparência.

## Validação

| Verificação | Resultado |
|---|---|
| `npm test` | ver secção "Resultados finais" abaixo |
| `npm run build` | PASS |
| `tests/m01-vegetation-layout.test.js` (novo) | determinismo, pureza (obstáculos inalterados), orçamentos, variedade/sem clones/sem grelha, keep-outs, e **nenhum arbusto/árvore visual em pontos percorridos** por jogador, aliados ou inimigos na rota completa da missão |
| `tests/browser/m01-vegetation-lod.spec.js` (actualizado) | 2/2: contagens vindas do mesmo layout, Baixa mais barata em relva/arbustos/triângulos, estado do jogador idêntico entre qualidades |
| Capturas fixas BASE vs CANDIDATE | 15 pares (5 câmaras × Média/Alta/Baixa), **SHA-256 do estado completo da simulação igual em todos** (`STATE_EQUIVALENCE.json`) |

Capturas: `screenshots/BASE-*.png`, `screenshots/CANDIDATE-*.png`, pares `screenshots/PAIR-*.jpg`. Câmaras em `camera-fixtures.json` (gerado por `tools/verification/m01-vegetation-fixtures.mjs`; estados genuínos da rota com câmara posicionada — não é playtest humano). Mapa de cima: `vegetation-layout.png`.

## Performance

`PERFORMANCE.md` tem os contadores por câmara. Resumo (renderer.info, SwiftShader, sem FPS):

| Qualidade | Draw calls | Triângulos do frame |
|---|---|---|
| Baixa | +3/+4 | +3,4% a +6,3% |
| Média | +3/+4 | +5,5% a +11,5% |
| Alta | +3/+4 | +10,2% a +18,8% |

+2 texturas (folhas da copa 128², sombra 64²). Nenhuma medição em Chromebook; o custo de fragmentos da copa (3 amostras de textura + 1 ruído) não está medido em GPU real.

## Revisão independente

Um revisor separado leu o diff contra three r186. Sem erros nos shaders, capacidades dos batches, determinismo ou consumo do fluxo aleatório legado (confirmado chamada a chamada). Corrigido a seguir: batch vazio deixou de reenviar o buffer inteiro (intervalo de upload de comprimento 0), sombras de contacto desenhadas antes do fumo (`renderOrder=-1`), cópia da relva sem alocações por tufo, guarda `FLAT_SHADED` no shader, arbustos médios recebem sombra (sem salto de luz entre LODs) e limites de altura dentro da área jogável.

## Limitações

- Arte procedural original e estilizada; não é levantamento histórico da vegetação de 1939.
- Arbustos e relva não são sólidos nem bloqueiam linha de visão da IA. Por isso ficam fora dos caminhos/zonas de combate e, dentro da área jogável, limitados a 1,1 m (arbustos) e 0,8 m (relva): não escondem um actor que a simulação vê. Testado em `tests/m01-vegetation-layout.test.js`.
- O `discard` da copa está no programa partilhado pelos LOD médio/longe; perde early-Z também à distância, onde o recorte já não actua. Custo de GPU não medido.
- A relva e o LOD seguem a posição do jogador; câmaras cinematográficas afastadas do jogador mostram a relva à volta do jogador.
- Sem playtest humano nem medição de FPS.

## Resultados finais

Executados sobre o runtime final (depois das correcções da revisão):

- `npm test`: **329/329** (324 anteriores + 5 novos), 0 falhas/skips.
- `npm run build`: PASS.
- Browser focados (SwiftShader, `CHROME_EXECUTABLE=/opt/pw-browsers/chromium`): **6/6** — `m01-vegetation-lod.spec.js` (2), `m01-environment-prop-density.spec.js` (3) e `m01.spec.js` "textured atmosphere survives checkpoint restart…; low quality reduces vegetation".
- Capturas CANDIDATE refeitas: 15/15 sem erros de página; SHA-256 de estado igual ao BASE em todos os pares.
- Suite de navegador integral (`npm run test:browser`) **não** executada nesta entrega.
