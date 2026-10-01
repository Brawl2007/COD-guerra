# M01 — Verificação das pendências P1–P16

Data: 01/10/2026. Fontes: IDs de [`research/SOURCES.md`](../../research/SOURCES.md). Medições: [`MEASUREMENTS.md`](MEASUREMENTS.md).

## Acesso e revisão

Claude consultou resumos e mediu G01/G02; os bloqueios dessa sessão continuam registados em `research/SOURCES.md`.

**Revisão do PR #10, 01/10/2026 UTC:** H01-PDF pp. 120–152 lidas, incluindo bibliografia e anexos fotográficos; H30 e a página do IPN T23 lidas integralmente. H02 já fora lida no PR #8. A leitura não resolve automaticamente as perguntas que a própria fonte deixa em aberto.

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
| P1 | Ler H01 e decidir a cronologia e os sapadores | `RESOLVIDA` | H01-PDF completo. Adoptar **06:45**; incluir **05:30–05:34**. P. 127: 15.º Batalhão de Sapadores, 15.ª DI; 18 homens nos preparativos de março, Juchtman a partir de julho. | H01-PDF | Pilares: P13. Efetivos na batalha: P8. Ordem às 05:30 continua versão T01/T09; H01 descreve decisão às ~06:00. |
| P2 | 04:34 e nome do batalhão | `RESOLVIDA` | H02 confirma 04:34; H01-PDF identifica o **2.º Batalhão de Fuzileiros**. | H02, H01-PDF | — |
| P3 | Uniforme e equipamento (H30) | `PARCIAL` | H30 lida: wz.19 e wz.36, equipamento de couro e Mauser wz.98a/wz.29. Não identifica a dotação do 2.º Batalhão. Patches continuam baseados em T22 (resumo). | H30, T17, T22 | Dotação do batalhão e capas de capacete. |
| P4 | Posições reais: estação, aterro, quartel, margens, dique, ruas | `PARCIAL` | Ver **Achados que mudam o mapa**, abaixo. | T24, T25, T30, G01, G02 | Traçado das vias e desvios de 1939; contorno do edifício da estação; local do quartel (construído em 1928–1930, T30). **Exige mapa histórico** (Messtischblatt, WIG ou planta da cidade). |
| P5 | Azimute das pontes e alinhamento dos portais | `RESOLVIDA` | **Azimute:** 89,7° (ferroviária) e 89,9° (rodoviária). **Alinhamento:** pilares das duas pontes a menos de 3 m nos cinco primeiros. **Distância entre eixos:** 38,8 m medidos (40 m documentados). | G01 | — |
| P6 | Armamento do Panzerzug 7 em 1939 | `PARCIAL` | H01-PDF p. 133 descreve artilharia contra ambos os acessos. Calibres 2 × 7,5 cm e 2 × 2 cm vêm de T20 (resumo incerto). | H01-PDF, T14, T20 | Composição e calibres em Tczew. Só MGs nesta versão do jogo. |
| P7 | Uniforme e identificação do Grenzwacht | `ABERTA` | T08 cita Regimento 1; H01-PDF p. 125 cita 11. Não transferir detalhes de uma identificação à outra. | H01-PDF, T08 | Confirmar unidade e uniforme em documentação especializada. |
| P8 | Pelotão de Faterkowski: efetivo e baixas | `PARCIAL` | H01-PDF pp. 132–133: **ppor.** (subtenente), perdas significativas sem números. `db_05b` habilitado só para a identidade; 12–18 sobreviventes é dramatização. | H01-PDF, T26 | Relação nominal, efetivo e baixas específicos; não usar totais da batalha. |
| P9 | Local e direção do ataque das ~07:00 | `PARCIAL` | Veio do norte (direção Koźliny/Pszczółki): grupo do general Eberhardt / SS-Heimwehr Danzig, com uma companhia e veículos blindados; um veículo destruído por canhão AT. | T08, T16 | Topônimo exato ("Koźlin" × "Koźliny") e tipo dos blindados. |
| P10 | Szymankowo: vítimas e autores | `PARCIAL` | T23 lida: **21 poloneses**, sobretudo ferroviários e aduaneiros, mortos por combatentes alemães. `db_06` habilitado com este texto limitado. | T23 | SA/gendarmes, hora exacta e divisão das vítimas não constam nesta página. |
| P11 | Fotografias da explosão e licença | `ABERTA` | Candidato: postal alemão de 1939, *"Die Dirschauer Weichselbrücke im Augenblick der Sprengung durch die Polen"*, na Skarbnica Tczewska. | T18 | Licença e autoria. Até lá, só referência, nunca asset. |
| P12 | Local do posto de disparo | `PARCIAL` | **Dois postos:** um bunker na cabeça de ponte oeste e um abrigo no terreno da estação. Os cabos corriam pela encosta sul do aterro, entre a estação e a ponte. As cargas tinham ignição elétrica e por estopim; o jogo não mostra isso (Prompt §79). | T08, T27 | Posição exata dos dois postos. O jogo usa o abrigo da estação (`firing_point`). |
| P13 | Estruturas demolidas às 06:10 e 06:45 | `PARCIAL` | H01-PDF p. 134: acessos leste/oeste; totais divergentes de pilares (nota 86). Anexo visto; legendas não numeram os pilares. Pilar 6/1 continua reconstrução de T04/T07/G01. | H01-PDF, T04, T07, G01 | Georreferenciar fotografias, confirmar os dois pilares e o antigo portal em 1939. |
| P14 | Alavanca do ferrolho do wz.29 | `RESOLVIDA` | **Reta**, ao contrário da alavanca dobrada da Kar98k. Variantes dobradas não são confirmadas por pesquisa recente de fotos e exemplares. | T21 | — |
| P15 | Fuzil individual do 2.º Batalhão: wz.29 ou wz.98a | `ABERTA` | H30 confirma ambos no exército, sem inventário do batalhão. Jan mantém wz.29 por decisão do Prompt §79. | H30, T21 | Inventário específico da unidade. |
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
6. **Panzerzug 7:** fonte de artilharia registada em P6; calibres e composição continuam pendentes. O protótipo planeado usa só MGs.

## O que ler primeiro (para quem tem acesso às fontes oficiais)

| Prioridade | Documento | Conferir |
| --- | --- | --- |
| 1 | Mapas e documentos citados em H01-PDF | P8, P12, P13: medições e perguntas ainda sem resposta após a leitura |
| 2 | Investigação / arquivo do IPN | P10: autores específicos e detalhes não publicados em T23 |
| 3 | Inventário e fotos do 2.º Batalhão | P3, P15; H30 já foi lida |
| 4 | Literatura do Grenzwacht e dos comboios | P6, P7, P16 |
| 5 | pionier39.pl — *Pionier-Bataillon 41 w walce o Tczew* (T27) | P6, P7, P16, e o lado alemão do combate na cabeça de ponte leste |
| 6 | fotopolska.eu — mapa da estação antiga; Skarbnica Tczewska | P4, P11, P13 |
