# Fontes históricas — COD-Guerra

Registro de fontes da campanha. Nesta primeira versão, o arquivo cobre apenas **M01 — Tczew, 1/9/1939**. As demais missões serão acrescentadas quando forem pesquisadas.

## Como ler este registro

| Campo | Significado |
| --- | --- |
| **ID** | `H01`–`H30` são as fontes de partida da seção 78 do Prompt Mestre. `T..` são fontes complementares de Tczew encontradas nesta pesquisa. |
| **Leitura** | `INTEGRAL`: documento lido por completo. `PARCIAL`: trechos do documento lidos directamente. `RESUMO`: conhecido apenas pelo resumo de um mecanismo de busca. `NÃO LIDO`: identificado, mas não aberto. |
| **Certeza** | `ALTA`: fato confirmado por fonte institucional ou primária lida, ou por várias fontes independentes concordantes. `MÉDIA`: fontes secundárias concordam, mas nenhuma foi lida por completo. `BAIXA`: fonte única, divergente ou não lida. |

> **Pesquisa original do Claude (30/09/2026).** O acesso directo às fontes ficou bloqueado; os factos vieram de resumos de busca. Na revisão do PR #8, foi possível ler a página H02 e trechos de H01-PDF. Isso não encerra a pesquisa: a leitura integral do artigo, as medições e verificações específicas continuam pendentes. A secção 78 proíbe tratar busca sem leitura como comprovação.
>
> **01/10/2026 (Claude):** sem acesso direto a `muzeum1939.pl`, `prezydent.pl`, `ipn.gov.pl`, `wikipedia.org`, arquivos de mapas e Sketchfab (desafio anti-bot). As novas entradas T20–T30 continuam `RESUMO`. As medições usam dados abertos acessíveis (G01, G02). O estado de cada pendência (P1–P16) está em `missions/m01-tczew/SOURCE_CHECK.md`.

> **Revisão do PR #10, 01/10/2026 UTC:** H01-PDF, H30 e T23 lidas. Decisões e limites em `missions/m01-tczew/SOURCE_CHECK.md`; resumos T.. restantes não passam automaticamente a leitura integral.

## M01 — Tczew, 1 de setembro de 1939

Data de consulta de todas as entradas: **30/09/2026**.

### Fontes de partida (Prompt Mestre, seção 78)

| ID | Título / instituição | URL | Fato que deve apoiar | Leitura | Certeza atual |
| --- | --- | --- | --- | --- | --- |
| H01 | Marcin Kłodziński, *The Battle for Tczew Bridges of 1 September 1939*, Muzeum II Wojny Światowej | https://www.muzeum1939.pl/en/publishing/war-and-remembrance/issues-of-the-periodical/war-and-remembrance-issue-3/the-battle-for-tczew-bridges-of-1-september-1939-preparations-the-course-of-events-and-meaning | Página editorial com resumo e acesso ao artigo; não contém a cronologia completa. | INTEGRAL (página editorial; artigo em H01-PDF) | ALTA para identificação do artigo |
| H01-PDF | Kłodziński, *Wojna i Pamięć* 3/2021, pp. 120–152 (33 páginas) | https://www.muzeum1939.pl/upload/2025/12/925f2e996b710392cf361d1aa7964f8128942.pdf | Cronologia, unidades e limites da pesquisa. | INTEGRAL (pp. 120–152; texto, anexos e bibliografia, revisão do PR #10) | ALTA para afirmações identificadas; divergências em SOURCE_CHECK |
| H02 | Chancelaria do Presidente da Polônia — cerimônia do 79.º aniversário em Tczew | https://www.prezydent.pl/kancelaria/archiwum/andrzej-duda/aktualnosci/wizyty-krajowe/w-tczewie-uroczystosci-upamietniajace-79-rocznice-wybuchu-ii-wojny-sw-,2531 | Confirma o ataque às 04:34; esta página não identifica o 2.º Batalhão. | INTEGRAL (texto da página) | ALTA para 04:34 |
| H30 | Muzeum II Wojny Światowej — *Umundurowanie i wyposażenie polskich żołnierzy we wrześniu 1939 roku* | https://www.muzeum1939.pl/aktualnosci/umundurowanie-i-wyposazenie-polskich-zolnierzy-we-wrzesniu-1939-roku--m2wswirtualnie-11339 | Uniforme e equipamento gerais; não é inventário do 2.º Batalhão. | INTEGRAL (revisão do PR #10) | ALTA para o geral; P3/P15 específicos pendentes |

### Fontes complementares encontradas (Tczew)

| ID | Título / instituição | URL | Fato apoiado (segundo o resumo) | Leitura | Certeza |
| --- | --- | --- | --- | --- | --- |
| T01 | *Obrona mostów tczewskich* — Wikipédia (pl) | https://pl.wikipedia.org/wiki/Obrona_most%C3%B3w_tczewskich | Operação alemã com sapadores de trem de carga escoltado pelo trem blindado n.º 7, Kampfgruppe "Medem" (cel. Gerhard Medem). Trem com soldados alemães perto da ponte às 04:45. Ordem polonesa de demolição e retirada às 05:30. Início da demolição às 06:10 (ppor. Norbert Juchtman). Pontes fora de uso às 06:40. Ponte rodoviária e três vãos da ferroviária danificados. | RESUMO | MÉDIA |
| T02 | *Oddział Wydzielony „Tczew"* — Wikipédia (pl) | https://pl.wikipedia.org/wiki/Oddzia%C5%82_Wydzielony_%E2%80%9ETczew%E2%80%9D | OW "Tczew" subordinado diretamente ao comandante do Exército "Pomorze". Comandante: ppłk Stanisław Janik. Composição: 2.º Batalhão de Fuzileiros e um pelotão de sapadores do 15.º Batalhão de Sapadores (15.ª DI). Missão: defender e, se necessário, destruir as pontes. | RESUMO | MÉDIA |
| T03 | *2 Batalion Strzelców (II RP)* — Wikipédia (pl) | https://pl.wikipedia.org/wiki/2_Batalion_Strzelc%C3%B3w_(II_RP) | Batalhão sediado em Tczew. Fortificações de campo desde maio de 1939. Sem companhia antitanque (só um pelotão), mas com pelotão de artilharia de infantaria. 2.ª e 3.ª companhias, pelotão de reconhecimento, dois pelotões de metralhadoras, pelotão AT, de morteiros e de artilharia em posições que cobriam Tczew pelo norte e noroeste. Retirada ordenada por volta das 17:00, iniciada às 18:00 e concluída às 20:00 rumo a Swarożyn–Starogard. Depois: Bzura e Varsóvia. | RESUMO | MÉDIA |
| T04 | *Most drogowy w Tczewie* — Wikipédia (pl) | https://pl.wikipedia.org/wiki/Most_drogowy_w_Tczewie | Ponte Lentze, 1851–1857, 837,3 m, seis vãos de 130,9 m. Torres e portais de F. A. Stüler. Encontros de cerca de 32 m com casamatas sob o nível do tabuleiro. Por volta das 06:10, destruídos o encontro e o antigo portal do lado de Lisewo. Por volta das 06:40, o encontro do lado de Tczew e um pilar no leito. | RESUMO | MÉDIA |
| T05 | *Most kolejowy w Tczewie* — Wikipédia (pl) | https://pl.wikipedia.org/wiki/Most_kolejowy_w_Tczewie | Ponte ferroviária de via dupla, iniciada em 1888 e aberta em 28/10/1891, com seis vãos lenticulares de cerca de 129 m e dois portais. A ponte rodoviária fica **40 m ao sul** da ferroviária. | RESUMO | MÉDIA |
| T06 | *Granica polsko-gdańska* — Wikipédia (pl) | https://pl.wikipedia.org/wiki/Granica_polsko-gda%C5%84ska | A fronteira com a Cidade Livre de Danzig seguia pelo meio do Vístula. As pontes de Tczew pertenciam inteiramente à Polônia. Os marcos de fronteira ficavam junto aos encontros leste, perto de Lisewo (*Liessau*), onde também estavam as passagens ferroviária e rodoviária. | RESUMO | MÉDIA |
| T07 | *Angriff auf die Weichselbrücke bei Dirschau* — Wikipédia (de) | https://de.wikipedia.org/wiki/Angriff_auf_die_Weichselbr%C3%BCcke_bei_Dirschau | Trem de carga regular n.º 963, com 65 vagões e a unidade de pioneiros 41 escondida, seguido do trem blindado. Na cabeça de ponte de Liessau, o acesso estava bloqueado e os portões fechados. Às 06:10 foi demolido o pilar do lado de Liessau e às 06:40 o primeiro pilar; os dois primeiros vãos caíram no Vístula. | RESUMO | MÉDIA |
| T08 | *Walka o tczewskie mosty 1 września 1939 roku* — Konflikty.pl | https://www.konflikty.pl/historia/druga-wojna-swiatowa/walka-o-tczewskie-mosty-1-wrzesnia-1939-roku/ | Plano final alemão de 19/8. Composição do grupo de Medem: batalhão do 1.º Regimento de Guarda de Fronteira, batalhão de reserva de infantaria, duas baterias leves, 41.º Batalhão de Sapadores, trem blindado, batalhão SS-Heimwehr "Götze" e 3.ª esquadrilha do 1.º regimento aéreo. Os cabos de ignição corriam pela encosta **sul** do aterro ferroviário, entre a estação e a ponte. Trem de trânsito n.º 963 junto à ponte por volta das 04:45. Ataque vindo de Koźlin(y) por volta das 07:00, com companhia e veículos blindados, um deles destruído por canhão AT. | RESUMO | MÉDIA |
| T09 | Fundação PKP — *Hołd bohaterom: ppor. Norbert Juchtman* | https://www.pkp.pl/pl/fundacja-aktualnosci/2421-hold-bohaterom-ppor-norbert-juchtman | Juchtman (n. 27/3/1914) formou-se sapador em 1937 e serviu no 8.º Batalhão de Sapadores (Toruń). Em junho de 1939 foi com seu pelotão a Tczew; os sapadores, disfarçados de ferroviários, instalaram cargas nos pilares. Ordem às 05:30; encontro leste às 06:10 e oeste às 06:40. Morto em 22/9/1939 perto de Łomianki. | RESUMO | MÉDIA (diverge de T02 quanto à unidade) |
| T10 | Polskie Radio 24 — *1 września 1939. O godzinie 4.34 bomby spadły na Tczew* | https://polskieradio24.pl/artykul/2360661,1-wrzesnia-1939-o-godzinie-434-bomby-spadly-na-tczew | Bombardeio às 04:34 da estação, do quartel do 2.º Batalhão e da margem oeste junto às pontes. | RESUMO | MÉDIA |
| T11 | Tczewska.pl — *Najpierw był nalot na Tczew, a potem Westerplatte* | https://www.tczewska.pl/artykul/2548,najpierw-byl-nalot-na-tczew-a-potem-westerplatte | Decolagem às 04:26 perto de Elbląg. Versão com 6 bombardeiros e 6 caças. Ataque de cerca de 10 minutos. Estação, cabeça de ponte oeste e quartel bombardeados. | RESUMO | BAIXA (diverge de T12 no número de aviões) |
| T12 | *Sturzkampfgeschwader 1* — Wikipédia (en), e *Bruno Dilley* (Military Wiki) | https://en.wikipedia.org/wiki/Sturzkampfgeschwader_1 | Três Ju 87 B da 3./StG 1 (Oblt. Bruno Dilley, Lt. Horst Schiller e Uffz. Gerhard Grenzel), de Elbing. Ataque às 04:34–04:35 para cortar os cabos de detonação. Os tripulantes haviam reconhecido os cabos viajando de trem pela ponte. | RESUMO | MÉDIA |
| T13 | *Szymankowo* — Wikipédia (pl/en); Histmag — *II wojna światowa rozpoczęła się w Szymankowie* | https://histmag.org/II-wojna-swiatowa-rozpoczela-sie-w-Szymankowie-22796 | Ferroviários e aduaneiros poloneses em Szymankowo (território da Cidade Livre) desviaram o trem alemão e avisaram Tczew. Na mesma madrugada foram mortos por alemães. Os números variam: 21, 23 ou cerca de 40 pessoas, incluindo familiares. | RESUMO | MÉDIA para o fato; BAIXA para números e autores |
| T14 | Wargameds — *Armored Trains, their history & the campaign in Poland in 1939* | https://wargameds.com/blogs/news/armored-trains-their-history-and-the-campaign-in-poland-in-1939 | Panzerzug 7 com batalhão do Grenzwacht-Regiment 1. A Abwehr (K-Gruppe Post) não impediu o alerta da guarnição. Partida citada como Marienwerder, divergente de outras versões. | RESUMO | BAIXA |
| T15 | TwojaPogoda — *Gdy wybuchła II wojna światowa, takiej pogody…* | https://www.twojapogoda.pl/wiadomosc/2019-09-01/gdy-wybuchla-ii-wojna-swiatowa-takiej-pogody-na-ziemiach-polskich-nie-bylo-od-niemal-stulecia/ | Início de setembro de 1939 excepcionalmente seco e quente na Polônia. | RESUMO | MÉDIA (regional, não local) |
| T16 | *SS Heimwehr Danzig* — Wikipédia (en); *Execution of Tczew hostages* — Wikipédia (en) | https://en.wikipedia.org/wiki/SS_Heimwehr_Danzig | Cerca de 1.200 homens da SS-Heimwehr Danzig chegaram à área ao norte de Dirschau por volta das 02:00. Ataque vindo do norte (Pszczółki), repelido. Ações contra poloneses depois da ocupação. | RESUMO | BAIXA para detalhes táticos |
| T17 | Army 1914–1945 — *Strzelec piechoty polskiej 1939 r.* | https://army1914-1945.org.pl/polska/wojska-ladowe-ii-rp/uzbrojenie-wyposazenie-i-sprzet-wojsk-ladowych-ii-rp/ekwipunek-mundury-urzadzenia-i-sprzet-ii-rp/101-strzelec-piechoty-polskiej-1939-r | Kit do soldado polonês de 1939: rogatywka wz.37, capacete wz.31, túnica wz.36, máscara wz.32, bornal wz.33, cartucheiras de couro, cantil e baioneta. | RESUMO | MÉDIA (confirmar em H30) |
| T18 | Skarbnica Tczewska (biblioteca municipal de Tczew) — fotografias das pontes, portais e estação | https://skarbnica.tczew.pl/1832/tczew-mosty-przez-wisle-widok-od-strony-zachodniej-portale-wjazdowe/ | Referência visual: portais, torres, estação e pontes destruídas. **Imagens não são assets licenciados.** | NÃO LIDO | — |
| T19 | *Tczew* — Wikipédia (en) | https://en.wikipedia.org/wiki/Tczew | Afirma que as pontes foram destruídas às 05:30. Diverge de T01/T04/T07/T09, que dão 05:30 como hora da ordem e 06:10/06:40 como hora das demolições. Registrada só como versão divergente. | RESUMO | BAIXA |
| T20 | Artigos da Wikipédia (en) sobre trens blindados poloneses de 1939. O resumo de busca citou o duelo do trem polonês n.º 15 "Śmierć" com o trem alemão n.º 7 em Modlin; página exata a confirmar entre os resultados (p. ex. *Śmiały (armoured train)*). | https://en.wikipedia.org/wiki/%C5%9Amia%C5%82y_(armoured_train) | Em 19/9/1939, o trem blindado alemão n.º 7 é descrito como pequeno, com dois canhões de 7,5 cm e dois de 2 cm antiaéreos. | RESUMO | BAIXA (fonte única; página exata incerta) |
| T21 | *Karabinek wz. 1929* — Wikipédia (en); opisybroni.pl; dobroni.pl; Muzeum Zgierz | https://en.wikipedia.org/wiki/Karabinek_wz._1929 | Ficha do wz.29: 1100 mm, cano de 600 mm, 4,0 kg, ~745 m/s, 5 cartuchos, alça de 100–2000 m, alavanca do ferrolho reta, produção em Radom desde 1930. Distribuição na infantaria e retorno a fuzis longos (dobroni.pl). | RESUMO | MÉDIA |
| T22 | *Barwy broni i służb Wojska Polskiego II RP* — Wikipédia (pl) | https://pl.wikipedia.org/wiki/Barwy_broni_i_s%C5%82u%C5%BCb_Wojska_Polskiego_II_RP | Batalhões de fuzileiros: patches de gola azul-marinho com vivo verde-claro (seledyn). | RESUMO | MÉDIA |
| T23 | IPN Gdańsk — *84. rocznica wybuchu II wojny światowej (Malbork, Kałdowo, Szymankowo, Tczew)* | https://gdansk.ipn.gov.pl/pl2/aktualnosci/190140,84-rocznica-wybuchu-II-wojny-swiatowej-Malbork-Kaldowo-Szymankowo-Tczew-1-wrzesn.html | Alerta, atraso e 21 vítimas em Szymankowo; SA/gendarmes e divisão de vítimas não constam nesta página. | INTEGRAL (página do IPN, revisão do PR #10) | ALTA para o texto limitado de db_06 |
| T24 | *Tczew railway station* — Wikipédia (en); fotopolska.eu; kociewie24.eu; tcz.pl | https://en.wikipedia.org/wiki/Tczew_railway_station | A estação de 1939 (Stüler, 1856–57) ficava perto das pontes, no sítio da atual rua 1 Maja e da rotunda, entre as linhas para Gdańsk e Bydgoszcz. Danificada em 1/9/1939 e em fev./1945; queimada em março de 1945. A estação atual é posterior. | RESUMO | MÉDIA |
| T25 | mostytczewskie.pl (*Most kolejowy*); tcz.pl (*Tajemnice mostu kolejowego w Tczewie*) | https://mostytczewskie.pl/index.php/pl/historia/most-kolejowy | Em 1910–1912 o dique de Lisewo foi afastado do rio; as duas pontes ganharam três vãos de 81,6 m e passaram a ~1030–1037 m; portal comum do lado de Lisewo. | RESUMO | MÉDIA |
| T26 | Fundação PKP — *Pamiętamy o bohaterach: kpt. Walenty Faterkowski*; Dziennik Bałtycki; tczew.pl | https://www.pkp.pl/pl/fundacja-aktualnosci/2413-pamietamy-o-bohaterach-kpt-walenty-faterkowski | Faterkowski (1912–2013) comandava o 2.º pelotão da 1.ª companhia do 2.º Batalhão de Fuzileiros na cabeça de ponte leste. Cidadão honorário de Tczew; nome de rua. | RESUMO | MÉDIA |
| T27 | pionier39.pl — *Pionier-Bataillon 41 w walce o Tczew 1 września 1939 r.* | https://pionier39.pl/pionier-bataillon-41-w-walce-o-tczew-1-wrzesnia-1939-r/ | Combinado com T08: dois postos de disparo (bunker na cabeça de ponte oeste e abrigo no terreno da estação); cabos na encosta sul do aterro; ~10 t de TNT em câmaras nos encontros e pilares. | RESUMO | MÉDIA |
| T28 | *8 Batalion Saperów (1939)* — Wikipédia (pl) | https://pl.wikipedia.org/wiki/8_Batalion_Saper%C3%B3w_(1939) | ppor. Norbert Juchtman listado como comandante de pelotão do 8.º Batalhão de Sapadores; o 8.º mobilizou o 15.º Batalhão de Sapadores para a 15.ª DI. | RESUMO | MÉDIA |
| T29 | flugzeuginfo.net; airpages.ru — Ju 87 B-1 | https://www.flugzeuginfo.net/acdata_php/acdata_ju87_en.php | Ju 87 B-1: comprimento 11,10 m, envergadura 13,80 m, altura 4,24 m, vazio ~2760 kg. | RESUMO | MÉDIA |
| T30 | polskaniezwykla.pl — *Tczew, koszary wojskowe* | http://www.polskaniezwykla.pl/web/place/2298,tczew-koszary-wojskowe.html | Quartel construído em 1928–1930; o 2.º Batalhão chegou em 6/6/1930. Depois de setembro de 1939: campo de trânsito alemão (~1500 pessoas, ~100 mortos) e "Lützow-Kaserne". **Contexto pós-M01; não usar em M01.** | RESUMO | MÉDIA |
| T31 | *Rkm wz. 28* e *Karabin maszynowy Browning wz. 28* — Wikipédia (en/pl); opisybroni.pl; 1939.pl; ioh.pl; quartermastersection.com | https://en.wikipedia.org/wiki/Rkm_wz._28 | rkm wz.28: 1110 mm, cano 611 mm, 9,0 kg vazia, carregador de 20, ~600 tiros/min teóricos, tiro a tiro e contínuo. Alterações polacas ao BAR: bípode no tubo de gases atrás do regulador, patins em vez de espigões, punho de pistola e miras invertidas (alça em quadro, 300–1600 m). | RESUMO | MÉDIA |
| T32 | *Karabin wz. 98a* — Wikipédia (en/pl); dws-xip.com; muzeumwp.pl | https://en.wikipedia.org/wiki/Karabin_wz._98a | wz.98a: cópia da Gew 98 com alça tangente de 100–2000 m; 1250 mm, cano 740 mm, 4,4 kg; 5 cartuchos com clipe; alavanca recta; Radom, 1936–1939 (~44 500 ou ~70 000 unidades, divergente). | RESUMO | MÉDIA |
| T34 | *Ckm wz. 30* — Wikipédia (en/pl); muzeum.skarzysko.pl; opisybroni.pl; 1939.pl; dobroni.pl; mhki.kielce.eu e polski-kolekcjoner.pl (caixa de cinta); imfdb.org; comparação com o *M1917 Browning* (Wikipédia en; americanrifleman.org) | https://en.wikipedia.org/wiki/Ckm_wz._30 | ckm wz.30: cópia polaca, sem licença, da Browning M1917, 7,92×57 mm, arrefecida a água (manga de ~3 l); 1200 mm com o tapa-chamas cónico, cano 720 mm; 13,6 kg sem água; ~65 kg em combate com tripé, água e munição; 600 tiros/min teóricos (400–450 práticos); 845 m/s; fita de tecido de 330 cartuchos, alimentação pela esquerda; alça até 2000 m. Tripé wz.30 de 29,3 kg (altura máxima 880 mm) e wz.34 de 26,3 kg, com adaptação ao tiro antiaéreo; novo mecanismo do gatilho em 1938; produção 1931–1939 (>10 000). Caixa de aço caqui para a fita de 330: 355 × 175 × 85 mm, pegas em cima e nos lados (Huta Ludwików, Kielce). | RESUMO | MÉDIA |

### Dados geográficos abertos (medição)

| ID | Dados | Acesso | Uso | Licença / atribuição |
| --- | --- | --- | --- | --- |
| G01 | Overture Maps Foundation, release `2026-09-23.1` (transportation/segment, base/infrastructure, base/water), derivada do OpenStreetMap | S3 público `overturemaps-us-west-2`, leitura parcial de Parquet; script `missions/m01-tczew/tools/measure_osm_overture.py` | Pontes, pilares, rio, linhas férreas, ruas, estação atual — ver `missions/m01-tczew/MEASUREMENTS.md` | ODbL — "© OpenStreetMap contributors, via Overture Maps Foundation" |
| G02 | Copernicus DEM GLO-30 (DSM, 30 m), tile N54 E018 | S3 público `copernicus-dem-30m` | Perfil aproximado de alturas (baixa confiança) | Uso livre com atribuição ao programa Copernicus (ESA/UE); confirmar o texto da atribuição antes de distribuir derivados |

### Cálculo próprio

| ID | Descrição | Método | Resultado | Certeza |
| --- | --- | --- | --- | --- |
| C01 | Posição do Sol em Tczew (54,09° N, 18,80° E) em 1/9/1939 | Algoritmo solar da NOAA. Hora legal em 1939 na Polônia e na Alemanha: CET (UTC+1), sem horário de verão (conferido com `zoneinfo`). | Início do crepúsculo náutico às 03:27. Crepúsculo civil às 04:14. Nascer do sol às 04:51, azimute ≈74°. Às 04:34, Sol a −3,2° (crepúsculo civil). Às 06:10, +10,6° a 90° (leste). Às 06:40, +15,0°. Pôr do sol às 18:39; fim do crepúsculo civil às 19:16. | ALTA (astronomia; lat/lon aproximados em ±0,01°) |
| C02 | Atraso do som na demolição leste vista da cabeça de ponte oeste | Distância até o pilar 6 (≈ 700–800 m conforme a posição de Jan) ÷ 343 m/s (ar a ~20 °C) | ≈ 2,0–2,4 s entre o clarão e o estrondo | ALTA (física); posição do pilar medida em G01 |

### Fontes a obter (ainda não identificadas com URL)

- Mapa topográfico prussiano *Messtischblatt* 1:25.000 da folha que cobre Dirschau, e mapa polonês WIG 1:100.000 da folha que cobre Tczew (anos 1930). Servem para posição exata da estação, do aterro, do quartel, das ruas e da margem.
- Fotografias aéreas alemãs ou aliadas de Dirschau (1939–1945), com referência de arquivo.
- Relatório ou diário de combate (*Kriegstagebuch*) da Gruppe Medem e do Panzerzug 7 (Bundesarchiv-Militärarchiv, Freiburg).
- Relação de baixas polonesas de Tczew em 1/9/1939 (Centralne Archiwum Wojskowe).
- OpenStreetMap, para medir a geometria atual das pontes, da estação e das margens. Licença ODbL: exige atribuição se dados derivados forem distribuídos.

## Regras de uso

1. Uma página geral sobre a batalha não comprova sozinha uma rua, um uniforme de subunidade ou um acontecimento pessoal (seção 78).
2. Fotografias de arquivo são referência visual, não assets. Não podem ir para `assets/` sem licença documentada em `ASSET_CREDITS.md`.
3. Divergências entre fontes ficam registradas. Não se escolhe silenciosamente a versão mais dramática (ver `missions/m01-tczew/HISTORICAL_RESEARCH.md` §3.2).

## Fontes técnicas consultadas na fundação

| Fonte primária | URL | Aplicação |
| --- | --- | --- |
| Vite — Static Deploy | https://vite.dev/guide/static-deploy.html | Build/preview, prefixo de project Pages e publicação de dist |
| Three.js — WebGLRenderer | https://threejs.org/docs/pages/WebGLRenderer.html | Renderer e configuração WebGL2 |
| Three.js — GLTFLoader | https://threejs.org/docs/pages/GLTFLoader.html | Loader oficial, scene graph e clips |

Consulta na sessão de 30/09/2026. A especificação integral e as fontes de partida H01–H30 permanecem em `docs/PROMPT_MESTRE.txt`; uma URL fornecida não equivale a leitura realizada.
