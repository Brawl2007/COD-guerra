# M01 — Verificação das pendências P1–P16

Data: 01/10/2026. Fontes: IDs de [`research/SOURCES.md`](../../research/SOURCES.md). Medições: [`MEASUREMENTS.md`](MEASUREMENTS.md).

## Situação de acesso nesta sessão

A rede do ambiente continua a bloquear `muzeum1939.pl` (H01, H30), `prezydent.pl` (H02), `wikipedia.org`, `ipn.gov.pl`, arquivos de mapas históricos e o Sketchfab (desafio anti-bot).

O que funcionou:
- pesquisa web (resumos);
- dados abertos em S3: Overture Maps/OpenStreetMap (G01) e Copernicus DEM (G02).

Por isso:
- **nenhuma fonte institucional foi lida por completo**;
- o que foi resolvido aqui vem de **medição** ou de **várias fontes secundárias concordantes**;
- as dúvidas restantes ficam explícitas abaixo.

## Legenda de estado

| Estado | Significado |
| --- | --- |
| `RESOLVIDA` | Respondida por medição ou por fontes concordantes. Os dados do jogo já foram atualizados. |
| `PARCIAL` | Parte respondida. A coluna "Falta" diz exatamente o quê. |
| `ABERTA` | Sem resposta suficiente. |

Uma pendência só deixa de constar em `mission.json → historicalCertainty.pendingChecks` quando está `RESOLVIDA`.

## Tabela

| # | Pergunta | Estado | O que foi encontrado | Fontes | Falta |
| --- | --- | --- | --- | --- | --- |
| P1 | Ler H01 por completo; conferir cronologia, vãos destruídos e unidade dos sapadores | `PARCIAL` | **Sapadores:** Juchtman aparece como comandante de pelotão do 8.º Batalhão de Sapadores (Toruń). Na mobilização, o 8.º formou o 15.º Batalhão de Sapadores (tipo IIa) da 15.ª DI. As duas versões (T02 × T09) são compatíveis. **Vãos destruídos:** ver P13. | T02, T09, T28 | Leitura de H01/H01-PDF; confirmar horários (06:10/06:40 × 06:45) e o pelotão exato. |
| P2 | 04:34 e nome do batalhão em H02 | `PARCIAL` | 04:34 e "2 Batalion Strzelców" confirmados por várias fontes independentes. | T08, T09, T10, T11 | Ler H02 (a fonte citada pelo prompt). |
| P3 | Uniforme e equipamento (H30) | `PARCIAL` | Kit de 1939 (T17). **Batalhões de fuzileiros: patches de gola azul-marinho com vivo verde-claro (seledyn)**, que os distinguem da infantaria de linha (T22). Túnica wz.36 sem cobertura total da tropa (T17). | T17, T22 | Ler H30; confirmar se o 2.º Batalhão tinha wz.36 para todos e capas de capacete. |
| P4 | Posições reais: estação, aterro, quartel, margens, dique, ruas | `PARCIAL` | Ver **Achados que mudam o mapa**, abaixo. | T24, T25, T30, G01, G02 | Traçado das vias e desvios de 1939; contorno do edifício da estação; local do quartel (construído em 1928–1930, T30). **Exige mapa histórico** (Messtischblatt, WIG ou planta da cidade). |
| P5 | Azimute das pontes e alinhamento dos portais | `RESOLVIDA` | **Azimute:** 89,7° (ferroviária) e 89,9° (rodoviária). **Alinhamento:** pilares das duas pontes a menos de 3 m nos cinco primeiros. **Distância entre eixos:** 38,8 m medidos (40 m documentados). | G01 | — |
| P6 | Armamento do Panzerzug 7 em 1939 | `PARCIAL` | Dois canhões de 7,5 cm e dois de 2 cm antiaéreos (descrição do duelo em Modlin, 19/9/1939). Partida de Marienwerder (T14). | T14, T20 | Número de MGs e composição dos vagões; se usou canhões em Tczew. O jogo **não** usa os canhões contra a margem oeste. |
| P7 | Uniforme do Grenzwacht-Regiment 1 | `ABERTA` | Só o geral: capacete de aço e carabina; uniforme cinza-campo padrão. | (resumo geral) | Literatura especializada sobre o *Grenzschutz Ost/Grenzwacht* em 1939. |
| P8 | Ocupantes da cabeça de ponte leste | `PARCIAL` | **2.º pelotão da 1.ª companhia do 2.º Batalhão, comandado por Walenty Faterkowski**, com metralhadoras pesadas. Faterkowski sobreviveu (1912–2013), foi cidadão honorário de Tczew e dá nome a uma rua junto às pontes (visível em G01). | T08, T26, G01 | Efetivo, baixas e patente em 1939 (ppor./por.). O debrief `db_05b` segue desativado. |
| P9 | Local e direção do ataque das ~07:00 | `PARCIAL` | Veio do norte (direção Koźliny/Pszczółki): grupo do general Eberhardt / SS-Heimwehr Danzig, com uma companhia e veículos blindados; um veículo destruído por canhão AT. | T08, T16 | Topônimo exato ("Koźlin" × "Koźliny") e tipo dos blindados. |
| P10 | Szymankowo: vítimas e autores | `PARCIAL` | **21 mortos** por volta das 04:30: 14 ferroviários, 2 familiares e 5 aduaneiros, incluindo duas mulheres. Autores: gendarmes da Cidade Livre e membros da SA. O IPN de Gdańsk identificou a maior parte dos autores e encerrou a investigação por mortes e falta de provas. | T23 | Ler a página do IPN por completo. O parágrafo `db_06` já tem texto, mas segue **desativado** até lá. |
| P11 | Fotografias da explosão e licença | `ABERTA` | Candidato: postal alemão de 1939, *"Die Dirschauer Weichselbrücke im Augenblick der Sprengung durch die Polen"*, na Skarbnica Tczewska. | T18 | Licença e autoria. Até lá, só referência, nunca asset. |
| P12 | Local do posto de disparo | `PARCIAL` | **Dois postos:** um bunker na cabeça de ponte oeste e um abrigo no terreno da estação. Os cabos corriam pela encosta sul do aterro, entre a estação e a ponte. As cargas tinham ignição elétrica e por estopim; o jogo não mostra isso (Prompt §79). | T08, T27 | Posição exata dos dois postos. O jogo usa o abrigo da estação (`firing_point`). |
| P13 | O que foi demolido às 06:10 e às 06:40 | `PARCIAL` | **06:10:** "6.º de 8 pilares" (T07) e "encontro e antigo portal do lado de Lisewo" (T04). Com a extensão de 1912 (9 vãos, 8 pilares intermediários), o 6.º pilar é o **antigo encontro leste de 1857/1891** (x ≈ 794–808). Na ponte ferroviária atual, o 6.º vão foi refeito com um pilar extra, coerente com dano ali. **06:40:** encontro oeste e 1.º pilar (x ≈ 141); os dois primeiros vãos caem no rio. | T04, T07, T25, G01 | Confirmar com H01 e fotografias se o antigo portal leste ainda existia em 1939 e se as duas pontes foram cortadas no mesmo pilar. |
| P14 | Alavanca do ferrolho do wz.29 | `RESOLVIDA` | **Reta**, ao contrário da alavanca dobrada da Kar98k. Variantes dobradas não são confirmadas por pesquisa recente de fotos e exemplares. | T21 | — |
| P15 | Fuzil individual do 2.º Batalhão em 1939: wz.29 ou wz.98a | `ABERTA` | O wz.29 chegou a cerca de metade da infantaria no início dos anos 1930. Depois a infantaria voltou a fuzis longos, e o wz.29 ficou sobretudo com sapadores, transmissões, artilharia e parte da cavalaria. | T21 | Fonte sobre o armamento do batalhão. **Decisão de jogo:** Jan mantém o wz.29 (Prompt §79), com mistura de wz.98a na secção. Krawiec (sapador) com wz.29 é o caso mais seguro. |
| P16 | Composição do trem 963 (locomotiva e vagões) | `ABERTA` | Só o número e os 65 vagões. | T07, T08 | Classe da locomotiva e tipos de vagão. Até lá, modelos genéricos da época, sem afirmar classe na tela. |

## Achados que mudam o mapa

Já aplicados em `map-layout.json` e `mission.json`.

1. **Pontes com ~1030–1037 m em 1939, não 837 m.**
   - Em 1910–1912 o dique de Lisewo foi afastado do rio e cada ponte ganhou três vãos de ~81,6 m, além de um portal comum do lado de Lisewo (T25).
   - Os 837 m são o comprimento de 1857/1891.
   - Consequências no jogo:
     - a cabeça de ponte leste, o trem 963 e o Panzerzug ficam a **~1,05–1,2 km** da secção de Jan;
     - a demolição das 06:10 acontece a **~800 m**, no antigo encontro (P13).
2. **A estação de 1939 era a "Stara Stacja" de Stüler, a ~300–500 m a oeste da ponte**, entre as linhas para Gdańsk e Bydgoszcz.
   - Fica no sítio da atual rua 1 Maja e da rotunda (T24).
   - A estação atual, a ~1 km a oeste-noroeste, é posterior. A estimativa anterior de "~1 km" estava errada.
   - A estação deixou de ser `COMPRESSED_FOR_GAMEPLAY`.
3. **A linha para Bydgoszcz sai para sudoeste a ~50 m da ponte.** Por isso o ponto de reunião passou para a cunha entre as duas linhas: CP-B em (−148, −3, 14).
4. **Posto de disparo** no terreno da estação (P12): `firing_point` em (−290, −3, 22).
5. **Zonas de demolição revistas:**
   - `bz_east`: centro x = 800, no pilar 6;
   - `bz_west`: centro x = 70, cobrindo o encontro e o pilar 1; agora seguro com x < −90.
6. **Panzerzug 7:** canhões registrados, mas não usados contra a margem oeste sem fonte.

## O que ler primeiro (para quem tem acesso às fontes oficiais)

| Prioridade | Documento | Conferir |
| --- | --- | --- |
| 1 | H01 / H01-PDF (*Wojna i Pamięć* 3/2021) | P1, P8, P12, P13: horários, pilares e vãos destruídos, postos de disparo, efetivos, pelotão de sapadores |
| 2 | IPN Gdańsk — página do 84.º aniversário (T23) | P10: números e autores, para liberar `db_06` |
| 3 | H30 (museu, uniformes) | P3, P15 |
| 4 | H02 (Presidência) | P2 |
| 5 | pionier39.pl — *Pionier-Bataillon 41 w walce o Tczew* (T27) | P6, P7, P16, e o lado alemão do combate na cabeça de ponte leste |
| 6 | fotopolska.eu — mapa da estação antiga; Skarbnica Tczewska | P4, P11, P13 |
