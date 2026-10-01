# M01 — Medições de Tczew

Dados brutos: [`measurements.json`](measurements.json) · Script: [`tools/measure_osm_overture.py`](tools/measure_osm_overture.py) · Aplicação no jogo: [`map-layout.json`](map-layout.json)

## 1. O que foi medido e com quê

Os arquivos de mapas históricos ficaram bloqueados nesta sessão (Messtischblatt e WIG em amzp.pl e mapywig.org, Polona, Geoportal). As medições usam, portanto, **geometria atual**:

| ID | Dados | Licença / atribuição | Uso |
| --- | --- | --- | --- |
| G01 | Overture Maps Foundation, release `2026-09-23.1`. Temas `transportation/segment`, `base/infrastructure` e `base/water`, derivados do OpenStreetMap. | **ODbL** — "© OpenStreetMap contributors, via Overture Maps Foundation". Usamos poucos valores derivados (distâncias e posições) num documento de projeto. Se o jogo publicar estes dados, manter a atribuição. | Pontes, pilares, rio, linhas férreas, estação atual, ruas, dique (proxy) |
| G02 | Copernicus DEM GLO-30 (DSM, 30 m), tile N54 E018 | Uso livre com atribuição ao programa Copernicus (ESA/UE). Confirmar o texto exato da atribuição antes de distribuir derivados. | Perfil aproximado de alturas |

**Isto não é um mapa de 1939.** Só é usado para estruturas que existem desde 1857/1891/1912 (pilares, eixos das pontes, rio, linhas principais), com as mudanças pós-guerra marcadas. Ruas, prédios e vias modernas servem apenas de pista para localizar o que existia (por exemplo, a rua 1 Maja como sítio da estação antiga).

## 2. Referencial

- **Origem:** pilar/encontro mais a oeste da ponte ferroviária (`18.803807 E, 54.093042 N`), ao nível dos trilhos (y = 0 no jogo).
- **Eixo X:** ao longo da ponte ferroviária (azimute medido 89,7°), positivo para leste. **Z:** perpendicular, positivo para sul.
- **Projeção:** equiretangular local, com erro < 0,3 % no raio de 2 km. É suficiente para o jogo; não serve como cadastro.
- **Reprodução:**
  ```bash
  pip install pyarrow shapely rasterio
  python3 missions/m01-tczew/tools/measure_osm_overture.py --dem
  ```
  O script lê só os blocos Parquet que cobrem Tczew.

## 3. Resultados

### 3.1 Pontes

| Medida | Ferroviária | Rodoviária | Documentado | Leitura |
| --- | --- | --- | --- | --- |
| Azimute do eixo | 89,7° | 89,9° | — | Leste–oeste. **P5 resolvida.** |
| Pilares/encontros, x (m) | 0 · 140,9 · 270,2 · 401,1 · 531,7 · 662,3 · ~~727,6~~ · 793,8 · 878,9 · 961,7 · 1049,2 | 2,4 · 140,9 · 270,9 · 400,9 · 531,7 · 662,1 · 807,5 · 879,0 · 962,0 · 1049,1 | 6 vãos de 129/130,9 m (1857/1891) + 3 vãos de 81,6 m (1910–1912) | Padrão de 1939 visível. O pilar em 727,6 é pós-guerra (divide o 6.º vão). |
| Vãos originais medidos | 140,9 · 129,3 · 130,9 · 130,6 · 130,6 · 131,5 | 138,5 · 130,0 · 130,0 · 130,8 · 130,4 · 145,4 | 129 / 130,9 | O primeiro vão inclui parte do encontro. O 6.º vão rodoviário (145 m) reflete troca de vãos depois de 1945. |
| Vãos da extensão | 85,1 · 82,8 · 87,5 | 71,5 · 83,0 · 87,1 | 81,6 | Coerente (±7 %), exceto um vão rodoviário trocado. |
| Comprimento entre pilares extremos | 1049 m | 1047 m | 1030–1037 m | +1,2 a +1,9 %, dentro do erro de digitalização e do ponto de medida do encontro. |
| Distância entre eixos | — | 38,8 m | 40 m | Coerente. O jogo mantém 40 m (documentado). |

### 3.2 Rio, margens e dique

| Medida | Valor | Observação |
| --- | --- | --- |
| Canal principal sobre os eixos | x 25–265 (≈ 240 m) | Águas baixas atuais. O canal fica junto à margem oeste; o resto das pontes cruza a planície de inundação leste. |
| Dique de Lisewo (proxy) | x 1057–1099 (estrada de serviço N–S) | Coerente com o fim das pontes prolongadas (x ≈ 1049). Em 1939 o dique já estava nessa posição (deslocado em 1910–1912, T25). |
| Parada de Lisewo (atual) | (1431, 5) | Os postos de fronteira de 1939 ficavam em Lisewo (T06); posição exata pendente. |

### 3.3 Margem oeste

| Medida | Valor | Observação |
| --- | --- | --- |
| Linha para Gdańsk (aterro principal) | (0, 0) → (−227, −6) → (−390, −17) → (−526, −61) → (−604, −128) | Curva para noroeste. |
| Linha para Bydgoszcz | sai em (−53, 4) → (−222, 68) → (−299, 105) → (−596, 208) | Curva para sudoeste. Linha original (Ostbahn). |
| Estação de 1939 ("Stara Stacja") | Sítio da rua 1 Maja e da rotunda, entre as duas linhas: **x ≈ −190 a −560**; no jogo, polígono x −470…−330, z 20…55 | Texto (T24) + geometria da rua (G01). Contorno do edifício pendente (P4). |
| Estação atual (anos 1940) | (−918, −463) | **Não existia em 1939.** Não usar. |

### 3.4 Alturas (G02 — baixa confiança)

O DSM de 30 m inclui estruturas e árvores, então os valores servem para relevo geral, não para cotas de projeto.

| x | No eixo ferroviário | 100 m a sul do eixo |
| --- | --- | --- |
| −500 | 20,1 m | 21,7 m |
| −300 | 17,7 m | 16,4 m |
| −200 | 18,5 m | 11,5 m |
| −100 | 17,4 m | 9,9 m |
| 0 | 11,2 m | 3,2 m |
| 100–200 (rio) | 0,5 m | 0,5 m |
| 300–1000 (planície) | 11–14 m (tabuleiro) | 5,6–7,3 m |

Leitura para o jogo, com y = 0 nos trilhos do portal oeste:
- **Água:** y ≈ −10.
- **Planície leste:** y ≈ −5.
- **Margem oeste:** sobe de forma marcada nos primeiros 300–500 m, numa escarpa de ~15–20 m acima da água, até o planalto da estação e da cidade velha.

Os valores de `map-layout.json` foram ajustados para isso: `waterY` −10, planície −5.

## 4. O que ainda exige mapa histórico (P4)

- Traçado das vias e dos desvios em 1939 entre a ponte e a estação.
- Contorno e orientação do edifício da estação.
- Local do quartel do 2.º Batalhão de Fuzileiros.
- Se havia restos do dique anterior a 1912 perto de x ≈ 800.
- Posição dos dois postos de disparo (P12).

**Protocolo sugerido:** georreferenciar a folha *Messtischblatt* 1:25.000 que cobre Dirschau ou a folha WIG 1:100.000 de Tczew com os pilares desta tabela como pontos de controle, já que eles não mudaram. Depois medir os itens acima no mesmo referencial e atualizar `map-layout.json` mudando a classificação de cada item.
