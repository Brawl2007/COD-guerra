# CAMPAIGN ATMOSPHERE & ART DIRECTION · Identidade visual por frente, luz por hora, materiais, uniformes

**Estado:** PROPOSTA DE DIREÇÃO DE ARTE (Fase 3/5). Herda o método de `M01-ATMOSPHERE-ART-DIRECTION.md` (PR #56): paleta mestra dessaturada, tabela de luz por hora sobre uniformes reais, névoa/fumo/poeira persistentes, materiais naturais, prova por capturas A/B. Nenhum asset é extraído de outro jogo; fotografias de arquivo são referência, não asset (Prompt §78).

---

## 1. Princípios transversais

1. **Cada luz é um lugar.** Nenhuma missão reutiliza a tabela de luz de outra; o Sol, a lua, o clima e a hora são dados (ver `CAMPAIGN-HISTORICAL-TIMELINE.md` §2).
2. **A cor é a consequência.** Fumo, poeira, cinza, lama e neve acumulam-se e **persistem** (como `sectors.damage` em M01); a paisagem no debrief não é a da abertura.
3. **Humanos primeiro.** Rostos, mãos, roupa molhada/suja/rasgada e postura contam mais do que partículas; variação de aparência por função e por ano (Soldier Visual Variation como base).
4. **Nada de postal.** Sem saturação de "ilha", sem azul de mar turístico, sem neve branca limpa, sem deserto amarelo uniforme.
5. **Silhuetas de lugar.** Cada mapa tem três silhuetas reconhecíveis a distância (M01: torres das pontes, estação, dique) classificadas `EXACT`/`RECONSTRUCTED`/`COMPRESSED_FOR_GAMEPLAY`.
6. **Violência configurável** sem perda de significado: sangue e ferimentos por nível; a versão reduzida conserva macas, postos médicos, roupa rasgada, posturas, silêncio.
7. **Prova:** capturas A/B com câmara fixa, estado congelado, hash igual; FPS só medido (Prompt §75).

---

## 2. Paleta e luz por frente

| Frente | Missões | Paleta | Luz | Materiais dominantes | Regra |
| --- | --- | --- | --- | --- | --- |
| Polónia 1939 | 01, 02, 03 | aço, azul-cinza, poeira, ocre de restolho, gesso | amanhecer rasante (01); meio-dia dourado e tarde longa (02); dia claro com fumo e pó de gesso (03) | madeira, tijolo, gesso, restolho, folhas de macieira | dessaturado; fumo acumulado; nunca Tczew noutra missão |
| Dunquerque / Inglaterra | 04, 05 | água cinza, areia pálida, fumo preto, verde de setembro | contraluz do mar com fumo; céu de setembro com cúmulos (05) | areia, lona, metal queimado, betão de molhe; alumínio/tela do Hurricane | o fumo dos tanques de petróleo é a assinatura de 04; o céu é o cenário de 05 |
| Deserto | 06, 11, 12 | ocre, pedra cinzenta, preto da noite, caqui desbotado | noite→amanhecer (06); noite de lua cheia e clarões (11); dia frio de fevereiro com lama (12) | calcário, areia compacta, lona, metal quente | calor por luz, não por filtro; 12 não é "deserto amarelo": é lama e pedra fria |
| Rússia | 07, 09, 10, 13 | branco sujo, cinza, laranja de fogo, ferrugem, verde-oliva | dia curto e baixo (07); noite com incêndios refletidos (09); dia de fumo (10); amanhecer e poeira (13) | neve compactada, lama gelada, madeira de isbá; água e aço; betão industrial; aço e óleo | a cor é o fogo (09/10); a neve é azul à sombra e amarela ao sol baixo (07) |
| Mediterrâneo | 14, 16 | ocre, pedra branca, oliveira cinzenta-verde, poeira | luz dura de julho (14); luz seca de maio sobre calcário (16) | pedra seca, estuque, terra batida; calcário, carvalho rasteiro | 16 é vertical; 14 é horizontal |
| Pacífico | 08, 15, 24, 26, 29 | verde-escuro, areia pálida (08), coral branco e água turquesa-suja (15), cinza preta (24), verde cultivado e telhado de telha (26), lama castanha e chuva (29) | manhã tropical (08); maré baixa e sol alto (15); manhã clara (24); manhã luminosa (26); chuva contínua (29) | coqueiro, capim kunai, lona; coral, cais de madeira, bunkers de palmeira; cinza, terraços; muros de pedra, túmulos; lama, lona molhada | humidade; sem saturação; 24 não é 18 pintada de preto |
| Europa 1944–45 | 17–23, 25, 27, 28 | noite azul e pomar (17); cinza de mar e seixos (18); verde de sebe (19); tijolo e pinheiro (20); castanho de lama e pinhal (21); neve, pedra e ardósia (22, 23); cinza de aço e água (25); lama e poeira (27); escombros e cinza (28) | ver timeline §2 | pedra normanda, seixos, taludes, pinhal, tijolo holandês, neve, ardósia, aço de ponte, escombros | cada luz é um lugar |
| Baía de Tóquio | 30 | cinza de navio, azul-aço do mar, branco de uniforme | manhã encoberta | aço pintado, teca do convés, pano verde | sem HUD de armas; sem triunfo visual |

---

## 3. A imagem única de cada missão (o plano que o jogador recorda)

| # | Imagem única | Classe de mapa do elemento |
| --- | --- | --- |
| 02 | a estrada vista do pomar, com a última carroça a voltar por onde se avançou | RECONSTRUCTED |
| 03 | o porão com a luz estreita, o balde e o teto a soltar poeira; mais pessoas no fim | RECONSTRUCTED |
| 04 | a fila de homens na água até à cintura e o barco que não espera; fumo preto no céu | RECONSTRUCTED (praia), EXACT (molhe se usado) |
| 05 | a asa do ala com um buraco de bala, à vista do cockpit, costa ao fundo | — |
| 06 | a linha do perímetro à luz rasante com a lâmpada de um posto a responder | RECONSTRUCTED |
| 07 | pegadas novas sobre pegadas antigas e o trenó a passar | RECONSTRUCTED |
| 08 | a tigela de arroz morna numa mesa de campanha abandonada | GAMEPLAY_DRAMATIZATION |
| 09 | fogo refletido na água e um barco a cruzar no sentido contrário com feridos | RECONSTRUCTED |
| 10 | a máquina da abertura ao fundo da área perdida, inalcançável | RECONSTRUCTED |
| 11 | o horizonte inteiro a acender-se às 21:40 | DOCUMENTED (hora) |
| 12 | o camião com o motor ligado e dois grupos a chegar por lados opostos | RECONSTRUCTED |
| 13 | o visor do condutor com um tanque vizinho a arder e homens a sair | RECONSTRUCTED |
| 14 | a estrada entre muros de pedra vista pelo pára-brisas, uma família à porta de uma casa sem telhado | RECONSTRUCTED |
| 15 | o cais de madeira sobre água rasa, LVTs já na areia, LCVP presas atrás | DOCUMENTED (recife/cais) |
| 16 | a carta a mudar de bolso com a abadia ao fundo, na altura certa | EXACT (silhueta) |
| 17 | o pomar escuro com uma luz de avião a desaparecer | RECONSTRUCTED |
| 18 | a praia vista de cima, com as mesmas embarcações agora entre destroços e macas | RECONSTRUCTED (Fox Green) |
| 19 | roupa num varal, uma quinta deserta, um homem ajoelhado de mãos erguidas | GAMEPLAY_DRAMATIZATION |
| 20 | remos na água escura sob chuva; o barco afasta-se | DOCUMENTED (chuva) |
| 21 | o mapa molhado e uma crista que mal se vê | RECONSTRUCTED |
| 22 | o posto de rádio com objetos de vida diária, abandonado | RECONSTRUCTED |
| 23 | luvas repartidas num buraco de neve; depois, Foy à luz de janeiro | RECONSTRUCTED |
| 24 | a encosta do Suribachi ao longe; areia preta com pegadas que se desfazem | EXACT (Suribachi) |
| 25 | a ponte inteira vista do acesso; depois, a mão no guarda-corpo a vibrar | EXACT (ponte) |
| 26 | uma porta que se abre e uma família que recua | GAMEPLAY_DRAMATIZATION |
| 27 | o panorama da barragem por vários eixos; depois, a ambulância a tentar atravessar a estrada | RECONSTRUCTED |
| 28 | a porta da oficina e um homem de mãos à vista; depois, uma porta de abrigo a abrir-se | GAMEPLAY_DRAMATIZATION |
| 29 | lona à chuva, macas, o castelo quase em silêncio | RECONSTRUCTED |
| 30 | o convés, a bandeira de Perry na antepara, a água | DOCUMENTED |

---

## 4. Método de luz por hora (herdado de M01)

Cada dossiê fornece uma tabela com, por hora/fase: cor do zénite, cor do horizonte, cor e azimute/elevação do Sol ou da Lua, skylight, névoa (cor/densidade/altura), exposição, haze de fumo (contagem de `damage.smokeVisible`), e o que isso faz aos uniformes reais (ex.: caqui ao luar; cinza de campanha sob clarões). Regras:

- Noite nunca é preto opaco: lua, clarões, incêndios, holofotes (27) dão legibilidade sem "visão noturna futurista" (§79 M11).
- O glare solar é um mecanismo (M01 ±25°): reaparece só onde é facto (06 ao amanhecer a leste; 13 nascer do sol às 05:02 — sem glare às 08:30).
- Chuva (20 em 25/9, 21, 29) escurece materiais, reflete luz e reduz alcance de visão de forma simétrica para IA e jogador.

---

## 5. Linguagem de destruição por frente

| Frente | O que muda com a batalha | O que persiste |
| --- | --- | --- |
| Polónia | crateras em restolho, macieiras partidas, carroças tombadas; gesso, vidro, mobília nas ruas | ruas obstruídas; porão mais cheio |
| Dunquerque | camiões queimados, pneus, equipamento largado na areia | fumo preto; barcos afundados |
| Deserto | veículos fumegantes a distância, posições abandonadas | poeira; marcas de lagartas |
| Rússia | isbás queimadas, trenós tombados; barcos partidos; galpões sem telhado; tanques a arder | fogo; aço; neve pisada |
| Pacífico | palmeiras decapitadas; LVT encalhados; cinza revolvida; muros caídos; lama | destroços; macas |
| Europa 44–45 | sebes abertas; casas usadas como postos; copas rebentadas; neve suja de fuligem; ponte com danos | tudo persiste até ao debrief |

Feridos, macas, cobertores, corpos cobertos e equipamento de quem não voltou seguem a regra de M01: oclusão, distância e transições coerentes; nunca desaparecimento à frente do jogador (Prompt §72).

---

## 6. Uniformes e equipamento (síntese para o Artista de Personagens; auditoria por historiador pendente)

| Força/data | Peças-chave | Variação visível |
| --- | --- | --- |
| Polónia 1939 | wz.36, wz.31, rogatywka, correame castanho | poeira (02) → gesso e rasgões (03) |
| BEF 1940 | battledress 1937, Mk II, webbing 1937, capote | molhado, areia, sem capacete em alguns (praia) |
| 1.ª Aerotransportada 1944 | Denison smock, capacete aerotransportado, webbing | 17/9 limpo → 25/9 enlameado e ensanguentado |
| 303 | fato de voo Irvin/Sidcot, Mae West, capacete B, óculos Mk IV | — |
| 9.ª Australiana | KD shorts/shirts (06), KD longos à noite (11), Mk II, slouch hat fora de combate | desbotado; areia nas rugas |
| Exército Vermelho 1941 | telogreika, valenki, ushanka/budenovka residual, SSh-40/39 | gelo nas sobrancelhas; vapor |
| Exército Vermelho 1942–43 | gimnastyorka M35, pilotka, SSh-40; tanquistas: capacete acolchoado, macacão | óleo (10, 13); humidade (09) |
| Exército Vermelho 1945 | gimnastyorka M43 com dragonas, SSh-40, PPSh | sujo de escombros; medalhas em alguns |
| USMC 1942 | P41 HBT, M1, Springfield, leggings | suor; sal |
| USMC 1943 | P41/P42 camo, M1 com capa, Garand | encharcado (15) |
| USMC 1945 | P44, M1 com capa, Garand/carbine, botas boondocker | cinza (24); limpo na manhã de 26; lama total (29) |
| Exército dos EUA 1943 (Tunísia/Sicília) | M41 jacket, HBT, M1, leggings | poeira; calor (14) |
| Exército dos EUA 1944 (Normandia) | M41/M43, assault jacket (18), M1 com rede, cinto de salva-vidas | molhado, areia (18); seco (19) |
| 82.ª/101.ª 1944–45 | M42/M43 jump uniform, M1C, botas de salto; inverno: capotes, mantas (23) | lama (17); frio e barba (23) |
| 28.ª DI 1944 | M43, capote, galochas | encharcado (21); gelo (22) |
| 9.ª Blindada 1945 | M43, tanker jacket, M1 | fuligem (25) |
| Alemães 1939–45 | por ano: M36/M40/M43, Stahlhelm M35/M40/M42, Zeltbahn; Fallschirmjäger (16, 20); Volkssturm (28) | nunca "monstros intercambiáveis"; rendidos com rosto |
| Japoneses 1942–45 | Tipo 98, capacete Tipo 90, polainas | 08: equipamento largado; 29: posições abandonadas |
| Civis | por país/época (ver continuidade §5) | revisão cultural obrigatória (26) |

---

## 7. Reutilização de assets entre missões (plano)

| Família | Origem | Reutilizada em | Nota |
| --- | --- | --- | --- |
| Kit polaco 1939 (soldados, armas, estação V2/V3, carris, vagões) | M01 | 02, 03 (estação de Varsóvia é outra: só sistema) | nunca a geografia de Tczew |
| Vegetação V1 (árvores sólidas, LOD) | M01 | 02 (macieiras), 19 (sebes), 21 (pinhal) com famílias novas | — |
| Pontes (Bridge Structural V2) | M01 | 25 (**estrutura diferente**: Ludendorff é arco de treliça em aço com torres de pedra) | só o sistema de dano persistente |
| Comboios/locomotiva | M01 | 09 (estação de Stalingrado), 22 (Clervaux) como cenário | — |
| Ju 87 V2 | M01 | 02, 03, 04 (Stukas), 09/10 (Ju 87/88) | variantes de pintura |
| Decals/FX V1/V3 | M01 | todas | perfis por material novo (neve, cinza, lama) |
| Humanos (clips, variação) | M01 | todas (novas nações) | Animation Resolver pré-requisito |

---

## 8. Civis e sinais de vida (regra de arte)

Sinais de que o lugar era habitado antes da guerra, por missão: quadro de horários (01), carroças e portões (02), roupa, mobília, fotografias (03), bicicletas e malas (04), pub/hangar (05), porto (06), isbás com fumo (07), plantação e caixas (08), cais e mercado (09), vestiário da fábrica (10), nada (11, deserto), oásis/aldeia ao longe (12), sovkhoz (13), olival e muros (14), aldeia nativa destruída (15), aldeia de Cassino em ruínas (16), igreja e praça (17), casas de veraneio nas falésias (18), varal e quinta (19), hotéis e casas burguesas (20), aldeia de Vossenack (21), hotel e castelo (22), quintas e igreja de Foy (23), nada (24), cidade de Remagen (25), aldeia okinawana com túmulos (26), quintas do Oderbruch (27), abrigos civis (28), castelo e túmulos (29), navio (30).
