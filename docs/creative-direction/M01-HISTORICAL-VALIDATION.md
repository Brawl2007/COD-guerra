# M01 — HISTORICAL VALIDATION · Tczew, 1 de setembro de 1939

**Função:** separar, para toda a direção criativa, o que é **FACTO DOCUMENTADO**, o que é **RECONSTRUÇÃO PLAUSÍVEL** e o que é **FICÇÃO DRAMÁTICA**; registar o que foi e não foi possível verificar nesta sessão; impedir que uma cena espetacular contradiga a história.
**Autoridade:** [`missions/m01-tczew/HISTORICAL_RESEARCH.md`](../../missions/m01-tczew/HISTORICAL_RESEARCH.md), [`SOURCE_CHECK.md`](../../missions/m01-tczew/SOURCE_CHECK.md), [`research/SOURCES.md`](../../research/SOURCES.md) e `mission.json → events[].certainty`. Este documento não os substitui; consolida-os e acrescenta o que a direção criativa precisa.

## 0. Como ler (correspondência com as classes do repositório)

| Classe desta biblioteca | Classe em `mission.json`/`HISTORICAL_RESEARCH.md` | Significado |
| --- | --- | --- |
| **FACTO DOCUMENTADO** | `DOCUMENTED` | Afirmado por fonte lida (INTEGRAL) ou por várias fontes concordantes. |
| **RECONSTRUÇÃO PLAUSÍVEL** | `RECONSTRUCTED` | Compatível com as evidências, inferido de factos (posições, horas aproximadas, comportamento típico), mas não documentado individualmente. |
| **FICÇÃO DRAMÁTICA** | `GAMEPLAY_DRAMATIZATION` | Criação original (secção de Zieliński, falas, objetos, pequenas ações). Nunca apresentada como facto. |

Regras herdadas que continuam a valer: fotografias de arquivo são referência, não assets; uma página geral não comprova um detalhe de subunidade; divergências ficam registadas e não se escolhe em silêncio a versão mais dramática; personagens históricos não recebem falas.

## 1. O que foi possível verificar nesta sessão (2026-10-08)

- **Lido no repositório:** H01-PDF (artigo de Kłodziński, lido integralmente na revisão do PR #10), H02, H30, T23 (INTEGRAL); T01–T30 (RESUMO); G01/G02 (medições); C01/C02 (cálculos próprios). Nada disto foi relido fora do repositório.
- **Acesso direto bloqueado:** nesta sessão, `pl.wikipedia.org`, `muzeum1939.pl`, `www.konflikty.pl`, `pionier39.pl`, `dzieje.pl` e `ipn.gov.pl` devolveram erro de resolução de nome através do proxy. **Nenhuma fonte nova passa a INTEGRAL.**
- **Resumos de busca obtidos (classe RESUMO, não leitura):** registados abaixo como S01–S08. Servem para orientar leituras futuras e para confirmar que a direção criativa não contradiz versões conhecidas. **Não autorizam mudar `mission.json`.**

| ID sessão | Fonte indicada pelo resumo | O que o resumo diz | Como afeta a direção |
| --- | --- | --- | --- |
| S01 | Artigo no periódico do IPN (`czasopisma.ipn.gov.pl`, Chinciński) citando um despacho do estado-maior do Exército "Pomorze" de 1/9 | Ataque aéreo às **04:45** à estação e aos correios de Tczew; "ataque fraco" à ponte a partir de Lisewo repelido; demolição às **06:00** com novo raid sobre a cidade | Confirma estação como alvo; hora diverge (04:45 vs 04:34 de H02). Mantém-se 04:34. Correios: possível prop/som distante, não usado sem leitura. |
| S02 | Waldemar Rezmer (Armia "Pomorze", 2004), citado no mesmo artigo | Primeiras bombas às 04:34 para cortar as linhas elétricas junto da ponte; ataques imprecisos; ligações dos detonadores sobreviveram; assalto dos sapadores alemães desfeito pelo fogo polaco | Coerente com a nota 67 de H01-PDF: o **corte dos cabos não é consensual**. O jogo mantém a versão "corte e reparo" como `RECONSTRUCTED` e o debrief já diz "versão disputada". |
| S03 | PAP 2010 citando o diretor do Arquivo Central Militar | Ataque aéreo às 04:43; sapadores iniciam a demolição às 06:00 e concluem às 07:30; a ponte de ~1 km fica destruída | Terceira hora para o raid (04:43). Reforça que a demolição foi um **processo** (06:00–07:30), não um instante: apoia a direção de duas detonações com trabalho entre elas e detritos a cair depois. |
| S04 | Stanisław Janik, "Obrona reduty Tczew", em *Ziemia Tczewska* (ed. J. Dylkiewicz); citado por Kłodziński | Relato do comandante sobre os primeiros momentos; homens da cabeça de ponte leste "alerta durante toda uma prova dura" | Fonte primária a obter (P8). **Não se inventam falas de Janik.** |
| S05 | Comunicado do IPN sobre o arquivamento do inquérito de Szymankowo | Vítimas: **13 ferroviários, 2 familiares, 5 aduaneiros** (20); KAS (2020) fala em 21; outras fontes 23 ou ~40 | Divergência de números confirmada. O debrief mantém "21" só porque é o texto da página do IPN **lida** (T23); registar a divergência no `SOURCE_CHECK` quando o comunicado for lido. |
| S06 | Monika Tomkiewicz (artigo) e inventário do IPN | Campo de reféns no antigo quartel do 2.º Batalhão a partir de 10/9/1939; fuzilamentos no terreno do quartel; cova exumada em 1945 | **Pós-M01.** Não usar na missão. Candidato a nota de epílogo da campanha com pesquisa própria. |
| S07 | *Polska Walcząca* (1943), texto narrativo | Nuvens baixas e escuras no horizonte entre as 4 e as 5 da manhã na noite da invasão (geral, não Tczew) | Não é registo meteorológico local. O clima continua: seco e quente na região (T15), **sem nevoeiro documentado**. Ver §3.3. |
| S08 | Szczepan Michmiel, livro sobre Szymankowo (2020), capítulo sobre a manhã na linha Kałdowo–Szymankowo–Tczew | Só índice visível | Leitura futura para P10. |

## 2. Cronologia validada (o que o jogo mostra vs o que as fontes dizem)

Hora legal CET (UTC+1), sem horário de verão (C01). Horas em **negrito** são gatilhos autoritativos do relógio de batalha e não mudam.

| Hora | O que acontece no jogo | Classe | Fontes | Nota de direção |
| --- | --- | --- | --- | --- |
| 03:27 / 04:14 | Crepúsculo náutico / civil | FACTO (cálculo) | C01 | Abertura em azul-cinza; faixa clara a ENE. |
| 04:26 | Ju 87 descolam de Elbląg (39,7 km, rumo 80°) | FACTO (fontes divergem no número) | T11, T12, farAnchors | 8–9 min de voo: o som pode surgir ~04:33. |
| **04:30** | Prelúdio: posto da secção, café, mapa, mensagem | FICÇÃO | Prompt §53/§79 | A secção é fictícia; o 2.º Batalhão e a cabeça de ponte são reais. |
| 04:31 | Lipski relata o telefonema de Szymankowo e a linha caída | FICÇÃO compatível | T13, T23 | Facto comunicado; sem descrever o destino dos ferroviários. |
| 04:33:10 | Motores ouvidos a leste; aproximação final pelo sul | RECONSTRUÇÃO | T12, C01, H01-PDF n.65 | 40 s de tensão sem tiros. |
| **04:34** | Três Ju 87 mergulham; bombas na cabeça de ponte oeste, encosta e pátio da estação; fumo na direção do quartel | FACTO (hora: H02; 04:35 em T12; 04:43/04:45 em S01/S03) | H02, T08, T10, T12 | A tela mostra só "04:34". Número de aviões não é afirmado. |
| 04:34–04:44 | Ataque de ~10 min; segunda passagem distante às 04:40 | FACTO (baixa certeza) | T11 | Sem aviões sobre o jogador na segunda passagem. |
| após 04:34 | Linha de ignição danificada e reparada pelos sapadores | **RECONSTRUÇÃO disputada** | T12, H01-PDF n.67, S02 | O debrief já declara "versão histórica disputada". Nada no jogo mostra procedimento de explosivos. |
| 04:35:30 | Um soldado arrasta um ferido do pátio para a estação | FICÇÃO plausível | Prompt §79 | Já implementado (`stationEvacuation`). |
| **04:45** | Trem 963 (65 vagões, pioneiros escondidos) para diante dos portões fechados de Lisewo; fogo do pelotão leste | FACTO | T01, T07, T08, H01-PDF | Portões, pioneiros e 65 vagões: facto. Posição exata do trem: reconstrução. |
| 04:51 | Nascer do Sol, azimute ~74° | FACTO (cálculo) | C01 | Primeira luz direta rasante sobre a água. |
| 04:52 | Panzerzug 7 para na via paralela; MGs sobre a cabeça de ponte leste e, esporadicamente, sobre a oeste | FACTO (presença) / RECONSTRUÇÃO (hora, posição, só MGs) | T01, T07, T14, T20, H01-PDF p.133 | Artilharia do trem contra os acessos é referida em H01-PDF; calibres pendentes (P6). **Nenhum tiro de canhão contra o jogador.** |
| 05:04–05:15 | Fim do reparo (depende do jogador) | FICÇÃO (tuning) | — | O relógio acelera depois do gate (`readyScale`). |
| **05:30** | Ordem de demolir e retirar, pelo mensageiro | FACTO (hora reconstruída de T01/T09; H01-PDF situa a decisão ~06:00) | T01, T09, H01-PDF | O comandante não aparece. |
| 05:30–05:34 | Raid de altitude (Do 17 Z) sobre a cidade | FACTO | H01-PDF n.76 | Sem mergulhos; sem impactos roteirizados perto do jogador. |
| 05:40 | Pawlak relata pressão no outro acesso; perda de uma metralhadora | RECONSTRUÇÃO | T01, T08, H01-PDF | "Perderam uma metralhadora" é dramatização compatível com "perdas significativas". |
| 05:50 | Contacto distante a norte | FICÇÃO (hora) / FACTO (direção) | T03, T16 | Até P9, a hora é dramatização. |
| **06:00** | Pelotão da cabeça de ponte leste recua pela ponte, com feridos | FACTO | T01, T08, H01-PDF pp.132–133 | Efetivos e baixas: desconhecidos (P8). 12–18 sobreviventes é tuning. |
| 06:04 | Bąk ferido no tabuleiro | FICÇÃO | — | Nunca mata Bąk. |
| 06:05 | Alemães entram pelo portal de 1912 e avançam até x≈690 | RECONSTRUÇÃO | T04, T07 | Baixas alemãs na demolição implicam presença no tabuleiro. |
| **06:10** | Demolição do lado leste (antigo encontro/pilar 6 e antigo portal de Lisewo) | FACTO (hora) / RECONSTRUÇÃO parcial (estruturas, P13) | T04, T07, T09, T25, G01, H01-PDF p.134 | Clarão a ~700 m; som ~2 s depois (C02). |
| 06:10+ | Alemães recuam com feridos; alguns ficam no chão | RECONSTRUÇÃO | T04 (baixas relatadas) | Vistos só a ~700 m. Sem close, sem humilhação. |
| 06:14 | Dudek vai buscar Bąk; fere-se no braço (ramo) | FICÇÃO | — | — |
| 06:20 | Reagrupamento alemão; fogo esporádico do dique | RECONSTRUÇÃO | T08 | — |
| 06:36 / 06:38:30 | Avisos da demolição oeste | FICÇÃO (procedimento plausível) | T27 (dois postos de disparo) | O oficial dos sapadores fica fora de cena. |
| **06:45** | Demolição do lado oeste (encontro de Tczew e pilar 1; os dois primeiros vãos caem) | FACTO (06:45 em H01-PDF; 06:40 em T01/T04/T07/T09; "06:00–07:30" em S03) | H01-PDF p.134, T04, T07 | O jogo adota 06:45. |
| ~07:00 | Ataque vindo do norte (Koźliny), companhia com blindados; um destruído por canhão AT | FACTO (fonte única) | T08 | Só som distante, no abrigo. |
| **07:05** | Chamada no abrigo | FICÇÃO | — | — |
| ~17:00 / 18:00–20:00 | Ordem e retirada do 2.º Batalhão para Swarożyn–Starogard | FACTO | T03, H01-PDF | Só no debrief. |

## 3. Geografia, luz, som e clima

### 3.1 Geografia (estado: medido, com pendências)
- Pontes de ~1030–1037 m em 1939 (837 m originais + extensão de 1910–1912): **EXACT** (T04, T05, T25, G01). Cabeça de ponte leste a ~1,05 km da secção: consequência direta.
- Estação de 1939 (Stüler) a ~330–470 m a oeste, entre as linhas para Gdańsk e Bydgoszcz: sítio **DOCUMENTED**, contorno **RECONSTRUCTED** (T24, G01, Station V2 com referências fotográficas Poczt226/Poczt734).
- Casamatas sob o tabuleiro no encontro oeste: existência **DOCUMENTED** (T04, resumo), interior **RECONSTRUCTED**. A guarnição da ckm aí posta (`grp_ckm_crew`, 24, −3, 43) é **FICÇÃO plausível** (T03: pelotões de metralhadoras no batalhão; alocação real na cabeça de ponte não confirmada).
- Dois postos de disparo (bunker na cabeça de ponte oeste; abrigo no terreno da estação): **DOCUMENTED** (T08, T27), posições **pendentes** (P12). O jogo usa o abrigo da estação (`firing_point`).
- Quartel do 2.º Batalhão (1928–1930): só direção (T30). O fumo "na direção do quartel" é a única representação permitida.

### 3.2 Luz (C01, cálculo próprio, certeza ALTA)
| Hora | Altitude | Azimute | Uso |
| --- | --- | --- | --- |
| 04:30 | −3,7° | 70° | Céu azul-escuro, faixa clara ENE, margem oeste escura |
| 04:34 | −3,2° | 71° | Silhuetas dos Stukas contra a claridade a leste; mergulho pelo sul |
| 04:51 | −0,8° → 0° | 74° | Nascer; luz rasante sobre a água, contraluz dos portões de Lisewo |
| 05:30 | +4,8° | 82° | Sol baixo atrás do inimigo; ofuscamento |
| 06:10 | +10,6° | 90° | Explosão leste **contra o sol** |
| 06:40 | +15,0° | 96° | Sombras longas para oeste; poeira iluminada por trás |
| 07:05 | +18,6° | 101° | Luz clara e baixa no abrigo |

### 3.3 Clima (decisão de direção)
- Região: início de setembro de 1939 seco e quente (T15, certeza MÉDIA, regional).
- Local: **nenhum registo meteorológico de Tczew foi lido** (S07 é narrativa geral sobre nuvens baixas). Consequências para a direção de arte: céu limpo a pouco nublado; **sem chuva, sem tempestade, sem nevoeiro denso**. A névoa baixa sobre o rio às 04:30 continua uma **escolha artística leve e reversível** (`GAMEPLAY_DRAMATIZATION`, já declarada em `HISTORICAL_RESEARCH.md` §6.2); deve dissipar-se com o Sol (05:00) e **nunca** esconder os clarões a 1,2 km nem o trem 963.
- A "atmosfera sombria" pedida pelo brief obtém-se por **dessaturação, luz rasante, contraluz, poeira e fumo acumulados**, não por meteorologia inventada. Ver [`M01-ATMOSPHERE-ART-DIRECTION.md`](M01-ATMOSPHERE-ART-DIRECTION.md).

### 3.4 Som (C02)
Atraso físico clarão→som: ~2,0–2,4 s para a demolição leste vista do tabuleiro; ~0,6 s para a oeste a 210 m; ~3 s para MGs a 1,05–1,2 km. Já implementado como `soundAt`. A direção sonora usa-o como motivo dramático, não só como física ([`M01-AUDIO-MUSIC-DIRECTION.md`](M01-AUDIO-MUSIC-DIRECTION.md)).

## 4. Forças e pessoas

### 4.1 Polónia
| Elemento | Classe | Uso |
| --- | --- | --- |
| Exército "Pomorze" → OW "Tczew" → 2 Batalion Strzelców | FACTO | Cartela, debrief |
| Comandante Stanisław Janik (ppłk/mjr diverge) | FACTO (pessoa) | Fora de cena; "ordem do comandante do batalhão"; nome só no debrief (`db_05`) |
| Pelotão de sapadores (15.º Btl. Sapadores, 15.ª DI; Juchtman desde julho; preparação desde março com 18 homens; disfarçados de ferroviários; ~10 t de TNT segundo T09) | FACTO (H01-PDF p.127, T09, T28) | Krawiec e os seus são fictícios dentro deste pelotão real; **nenhuma cena ensina explosivos** (Prompt §79) |
| Pelotão da cabeça de ponte leste, 2.º pelotão da 1.ª companhia, ppor. Walenty Faterkowski, com metralhadoras pesadas; perdas significativas sem números | FACTO (H01-PDF pp.132–133, T26) | "O pelotão do outro lado"; Rusek é fictício, membro anónimo desse pelotão |
| Pelotões de metralhadoras, AT (Bofors 37 mm), morteiros, artilharia de infantaria em posições a norte/noroeste | FACTO (T03) | Setor S4 distante; canhão AT só como som às ~07:00 |
| Uniformes: wz.36 e modelos anteriores coexistem; wz.31, rogatywka wz.37, correame de couro | FACTO geral (H30), dotação do batalhão pendente (P3) | Variação visual: misturar wz.36 e anterior |
| Fuzil individual: wz.29 ou wz.98a | ABERTO (P15) | Jan mantém o wz.29 por decisão do Prompt §79; Bąk usa wz.98a (variação) |

### 4.2 Alemanha
| Elemento | Classe | Uso |
| --- | --- | --- |
| Gruppe Medem (Oberst/Oberstleutnant Gerhard Medem) | FACTO | Só no debrief/contexto; sem modelo |
| Trem 963, 65 vagões, Pionier-Bataillon 41 escondido | FACTO | Trem parado diante dos portões; pioneiros desembarcam |
| Panzerzug 7 | FACTO (presença) / composição e calibres pendentes (P6) | Silhueta e MGs; **sem canhões contra o jogador** |
| Grenzwacht (Regimento 1 em T08; 11 em H01-PDF p.125) | FACTO com divergência (P7) | Atiradores anónimos nos portões e no dique; uniforme pendente |
| 3./StG 1, três Ju 87 B (Dilley, Schiller, Grenzel) | FACTO (T12) | Aviões sem nomes nem códigos visíveis |
| SS-Heimwehr Danzig a norte | FACTO (baixa certeza) | Só setor distante; **nenhuma atrocidade atribuída** |

### 4.3 Regra de representação do inimigo (Prompt §72, preservada)
Os alemães de M01 são pioneiros e guardas de fronteira. Podem ter medo, recuar, carregar feridos, hesitar e ficar no chão. Não são monstros intercambiáveis nem alvos de galeria. Depois das 06:10, os que recuam com feridos são a imagem; os que ficam são a consequência.

## 5. Divergências e decisões (consolidado)

| Tema | Versões | Decisão (inalterada) | Novo nesta sessão |
| --- | --- | --- | --- |
| Hora do primeiro raid | 04:34 (H02, T10) · 04:35 (T12) · 04:43 (S03) · 04:45 (S01) · 04:30 (en.wiki Chojnice) | **04:34** | Registar S01/S03 como divergentes após leitura |
| Alvo e efeito das bombas | Cabos cortados e reparados (T12) · ligações sobreviveram, ataques imprecisos (S02, H01-PDF n.67) | Reparo mantido como `RECONSTRUCTED`; debrief já diz "disputada" | A direção **não** reforça o corte como facto: Krawiec nunca diz "cortaram tudo"; diz "cortaram a linha em dois lugares" (já canónico) e o jogo nunca mostra o mecanismo |
| Hora da segunda demolição | 06:40 (T01, T04, T07, T09) · 06:45 (H01-PDF) · processo 06:00–07:30 (S03) | **06:45** | A direção trata a demolição como processo: trabalho entre 06:10 e 06:45, detritos, fumo persistente |
| Unidade dos sapadores | 15.º (T02, H01-PDF) · 8.º (T09) | "Pelotão de sapadores destacado em Tczew" | — |
| Patente de Janik | ppłk (T02) · mjr (T03) | Fora de cena | — |
| Szymankowo: número de vítimas | 21 (T23 lida) · 20 (S05: 13+2+5) · 23 · ~40 | `db_06` mantém o texto da página lida | Anotar divergência no `SOURCE_CHECK` quando S05 for lido |
| Nevoeiro/clima | Sem registo local | Seco; névoa leve opcional | Confirmado por ausência: nada apoia nevoeiro denso |

## 6. Szymankowo e crueldade: o que a direção pode e não pode fazer

**Pode:** o aviso telefónico como facto comunicado (Lipski, `dlg_m01_008`); a linha "caída"; o parágrafo sóbrio do debrief (`db_06`); a tensão de quem sabe que "a linha caiu" sem saber porquê; uma segunda fala de Lipski depois do bombardeio ("Szymankowo continua sem responder.") como **FICÇÃO compatível**.
**Não pode:** encenar Szymankowo; mostrar ou descrever as mortes; atribuí-las a unidade ou pessoa identificável; usar os números divergentes; transformar o episódio em motivação de vingança para a secção (ninguém em Tczew sabia, àquela hora, o que acontecera).

**O momento moral de M01** (ver Story Bible §5.3) é **FICÇÃO DRAMÁTICA** construída sobre dois factos: houve baixas alemãs na demolição das 06:10 (T04) e a ponte tinha ~1 km (G01). O impulso de Rusek e a contenção de Zieliński não são atribuídos a ninguém real. O jogador nunca é recompensado por disparar sobre homens caídos.

## 7. Matriz de asserções do conteúdo criativo novo

Tudo o que esta direção acrescenta, com a sua classe e o risco histórico associado.

| Elemento novo | Classe | Base | Risco | Mitigação |
| --- | --- | --- | --- | --- |
| Nomes e biografias de Rusek, Hajduk, Cyra, Piszczek, Wąs, Lenc | FICÇÃO | Vagas dos atores já existentes (`east_platoon_voice`, `grp_ckm_crew`, `sapper_2/3`) | Nenhum (nomes comuns, sem homónimos célebres conhecidos) | Verificar que nenhum coincide com nomes nas listas de vítimas reais de Tczew/Szymankowo antes da gravação (P-NOVA-1) |
| Krawiec trabalhou na oficina ferroviária e conhece as pontes "por dentro"; sapadores disfarçados de ferroviários | FICÇÃO sobre FACTO (T09: disfarce documentado) | T09, H01-PDF p.127 | Baixo | Não afirmar que a oficina era a de Tczew; dizer "oficina da linha" |
| Hajduk veterano de 1920 | FICÇÃO plausível (idade 40) | Conhecimento geral | Baixo | Sem detalhes de batalhas específicas |
| Lipski: o avô e a feira; quadro de horários com o trem de Malbork "atrasado" | FICÇÃO | Linha Berlim–Königsberg via Malbork (T07) | Baixo | Não nomear um trem real com número |
| Relógio de bolso de Zieliński; caderno de Dudek | FICÇÃO (objetos) | — | Nenhum | — |
| Alemães a carregar feridos e a rastejar depois das 06:10 | RECONSTRUÇÃO | T04 (baixas), Prompt §72 | Baixo | Só a ~700 m; sem close |
| Impulso de disparar sobre caídos; contenção | FICÇÃO | §6 | Médio (tom) | Sem recompensa, sem repetição, uma única reação |
| Guarnição da ckm a sair da casamata com a arma antes das 06:45 | RECONSTRUÇÃO (procedimento plausível) / FICÇÃO (pessoas) | T04 (casamatas), T03 | Baixo | A ckm nunca dispara no jogo até a simulação o decidir (pendente) |
| Carroças de feridos na estação às 05:40 | RECONSTRUÇÃO | Agenda S3 já existente | Baixo | Representação [C] |
| Som de canhão AT às 07:00 | FACTO (T08, fonte única) | Já no jogo | — | Sem blindados visíveis |
| Zumbido alto dos Do 17 às 05:30 | FACTO (H01-PDF n.76) | Já no jogo como "raid_0530" | — | Sem mergulhos, sem Stukas |
| Névoa leve sobre o rio às 04:30 | FICÇÃO (ambiente) | §3.3 | Baixo | Dissipar até 05:00; nunca tapar S2 |
| "Era só para levar o café." (Jan) | FICÇÃO (proposta do PR #44, adotada) | — | Nenhum | Só em momento seguro; opcional |
| Terceira cartela de abertura ("duas pontes, 1.030 metros, do outro lado a Cidade Livre de Danzig") | FACTO | T04, T05, T06, T25 | Nenhum | Texto exato em [`M01-COMPLETE-CINEMATIC-SCREENPLAY.md`](M01-COMPLETE-CINEMATIC-SCREENPLAY.md) |

## 8. O que a direção criativa não faz (lista de proibições)

1. Não altera 04:34, 04:45, 05:30, 06:10, 06:45, 07:05 nem a ordem dos 12 objetivos.
2. Não mostra alemães na margem oeste antes, durante ou depois das demolições.
3. Não dá falas, rostos ou modelos a Janik, Juchtman, Faterkowski, Medem, Dilley.
4. Não afirma número de aviões, de mortos polacos em Tczew, de vítimas de Szymankowo além do texto lido, nem calibres do Panzerzug.
5. Não usa o *Schleswig-Holstein* como som audível.
6. Não diz "o primeiro ataque da Segunda Guerra"; formulação segura: "minutos antes do ataque a Westerplatte".
7. Não ensina preparação, ligação ou disparo de explosivos.
8. Não inventa chuva, tempestade ou nevoeiro denso.
9. Não ressuscita Nowicki, não mata Bąk, não mata o jogador com a demolição polaca.
10. Não transforma Szymankowo em motivação de vingança.

## 9. Pendências (P1–P16 mantidas) e novas (P-NOVA)

As pendências P1–P16 continuam como em `SOURCE_CHECK.md` (resolvidas: P1, P2, P5, P14). Novas pendências criadas por esta direção:

| ID | Pergunta | Afeta | Prioridade |
| --- | --- | --- | --- |
| P-NOVA-1 | Os nomes fictícios novos coincidem com vítimas reais de Tczew/Szymankowo (listas do IPN/MBP Tczew)? | Character Bible, gravação | Alta (antes de gravar vozes) |
| P-NOVA-2 | Ler S01–S03 (IPN/Chinciński, Rezmer, PAP) para registar formalmente as horas divergentes do raid e da demolição | SOURCE_CHECK §3.2 | Média |
| P-NOVA-3 | Ler S05 (comunicado IPN) e harmonizar `db_06` com a divergência 20/21/23 | Debrief | Média |
| P-NOVA-4 | Obter "Obrona reduty Tczew" (Janik, *Ziemia Tczewska*) para P8/P12/P13 | S2, postos de disparo, pilares | Alta (histórica) |
| P-NOVA-5 | Existência de um quadro de horários/relógio na fachada da estação de Stüler (fotografias Poczt226/734) | Prop proposto | Baixa |
| P-NOVA-6 | Registo meteorológico de Tczew/Gdańsk para 1/9/1939 (IMGW ou anuários) | Art direction (névoa) | Baixa |
| P-NOVA-7 | Procedimento polaco de 1939 para retirar uma ckm wz.30 de casamata (quem leva o quê) | Set piece da guarnição | Média (antes de animar) |

## 10. Gate histórico para cada cena nova

Antes de implementar qualquer proposta desta biblioteca, confirmar:

- [ ] A cena tem classe declarada (FACTO / RECONSTRUÇÃO / FICÇÃO) nos documentos 2, 4 e 7.
- [ ] Não contradiz nenhum evento `DOCUMENTED` de `mission.json`.
- [ ] Não acrescenta pessoa histórica em cena.
- [ ] Não requer número, calibre, unidade ou topónimo pendente (P6, P7, P8, P9, P13, P16).
- [ ] Se envolve crueldade: tem causa, duas reações humanas plausíveis e consequência, sem recompensa (checklist WAW-INTENSITY do PR #44, `docs/campaign/MOMENTOS_MEMORAVEIS_CRUELDADE_30_MISSOES_V3.md`).
- [ ] O texto do debrief não muda sem fonte lida.
