# M01 — R4: plano de expansão da batalha de Tczew (atos I–VII, várias áreas)

**Data:** 2026-10-23 · **Branch:** `claude/exciting-bohr-k8v5xm` (sobre a candidata #80 @ `9c1d7f2`; código = `40787b2`) · **Tipo:** só desenho, sem código.
**Decisão de origem:** proprietário, 2026-10-23, opção B de `M01_R0_REQUIREMENTS_MATRIX.md` §6.1: representar a batalha (duas pontes, cidade, Lisewo, frentes norte e oeste, margens do Vístula); a missão continua depois das 07:05, em novos atos e áreas, com cronologia preservada. Meta de intensidade: CoD World at War / WWII, com identidade própria e sem conteúdo copiado.
**Estado (2026-10-25):** **INC-1 (WP-0 + WP-1) CONCLUÍDO NA ORIGEM** no ramo local `claude/exciting-bohr-k8v5xm-r4inc1` (de `1d201f43`), atrás de `missions/m01-tczew/acts.json` `enabled:false`; sem playtest. Desvios: o bloco `acts` ficou em `acts.json` (não em `mission.json`, entrada fixada no golden 20); a fatia NP é x −620…−220 (80 m a leste, para não cortar a silhueta da cidade da paisagem distante); o checkpoint da chegada chama-se CP-E (ordem do Capitão); sem Bofors. Prova e QA: `docs/verification/m01-runtime/acts-inc1-2026-10-25/README.md`. Próximo: playtest do VII-a, depois WP-2.
**Base factual:** só o repositório (`HISTORICAL_RESEARCH.md`, `SOURCE_CHECK.md`, `research/SOURCES.md`, `MAP.md`, `map-layout.json`, `mission.json`). As fontes externas **não abrem** neste ambiente; nada foi confirmado de novo. Etiquetas: `DOCUMENTED`, `RECONSTRUCTED`, `GAMEPLAY_DRAMATIZATION` (eventos) e `EXACT`/`RECONSTRUCTED`/`COMPRESSED_FOR_GAMEPLAY` (espaço), como em `HISTORICAL_RESEARCH.md`.

## 0. O que muda no jogo e o que não muda

| Muda (quando os pacotes entrarem) | Não muda |
|---|---|
| A M01 passa a ter atos encadeados; depois do ato atual (04:30–07:05) segue-se uma transição e novas áreas jogáveis | O ato atual 04:30–07:05 (área de 900 × 220 m, CP-A…D, horas, golden) fica **idêntico byte a byte**, salvo emenda intencional e documentada |
| Novo envelope de save (esquema 3) para atos novos | Os saves de esquema 2 continuam a carregar exatamente como hoje |
| O debrief passa para o fim do último ato ativo | O texto e as regras do debrief (sem vitória estratégica, Szymankowo limitado a `db_06`) |
| Cada área nova tem layout, checkpoints e golden próprios | Origem e eixos (X+ leste, Z+ sul, norte = −Z, metros; origem no encontro oeste da ponte ferroviária) |
| Duração alvo cresce para lá de 18–24 min (`mission.json targetDurationMin`) — **decisão do proprietário** | Proibições: MP40, MG42, M1 Carbine; nenhuma atrocidade mostrada; personagens históricos fora de cena |

Interruptor: `mission.json → acts.enabled=false` por omissão até à aceitação humana; com ele desligado o jogo é o atual.

## 1. Cronologia depois das 07:05 (só fontes do repositório)

| Hora | Evento | Classe / certeza | Fonte | Lacuna |
|---|---|---|---|---|
| ~07:00 | Ataque vindo do norte (Koźlin/Koźliny): companhia com veículos blindados; um veículo destruído por canhão AT; infantaria repelida por metralhadoras | `DOCUMENTED`, fonte única (BAIXA) | T08; direção norte T16; P9 | Topónimo exato, tipo dos blindados, posição do canhão AT |
| ~02:00 (contexto) | ~1.200 homens da SS-Heimwehr Danzig chegam a norte de Dirschau | `DOCUMENTED`, baixa certeza | T16 | Efetivo no ataque, uniformes 1939 |
| «durante o dia» | Ataques vindos do norte (Pszczółki), SS-Heimwehr com artilharia, repelidos | `DOCUMENTED`, **sem hora** | T16 | Número de ataques, horas, setores, baixas |
| dia | Posições de campo a norte e noroeste: 2.ª e 3.ª companhias, reconhecimento, 2 pelotões de mtr, pelotão AT (Bofors wz.36 37 mm), morteiros, artilharia de infantaria | `DOCUMENTED` (composição); posições pendentes | T03, T08 | Traçado das trincheiras (P4) |
| ~17:00 | Ordem para deixar Tczew ao anoitecer rumo a Swarożyn–Starogard | `DOCUMENTED` (MÉDIA, resumo) | T03 | Quem transmitiu, por onde |
| 18:00–20:00 | Retirada do 2.º Batalhão | `DOCUMENTED` (MÉDIA, resumo) | T03 | Itinerário, ordem de marcha, retaguarda |
| 18:39 | Pôr do sol | `DOCUMENTED` (cálculo) | C01 | — |
| depois | Batalhão no Bzura e em Varsóvia; Juchtman morre a 22/9 perto de Łomianki | `DOCUMENTED` | T03, T09 | Fora da M01 (só debrief) |
| setembro | Ocupação, reféns, campo de trânsito no quartel | `DOCUMENTED` | T16, T30 | **Fora da M01** (`HISTORICAL_RESEARCH.md` §8.4) |

**Lacunas sem resposta no repositório:** o que se passou na margem oeste 07:05–17:00; novos raides aéreos durante o dia; fogo de artilharia sobre a cidade (só «apoio de artilharia» ao ataque norte, T16); localização do quartel (T30 só dá datas); ruas da retirada; qualquer combate a oeste/noroeste (Szpęgawa, Suchostrzygi: 0 ocorrências); qualquer travessia alemã do rio depois das demolições (§10 regista nenhuma). Regra: o que não está nesta tabela não aparece como facto; se for preciso para o ritmo, entra como `GAMEPLAY_DRAMATIZATION` e nunca com hora exata no ecrã.

## 2. Estrutura de atos e áreas

Coordenadas no sistema atual. Áreas: **BW** = área atual (x −460…440, z −80…140); **NP** = perímetro norte (`north_perimeter`, x −900…−100, z −1500…−800); **LE** = Lisewo/cabeça leste (x 640…1500, z −200…240); **CT** = cidade/quartel (por definir, bloqueada por P4).

| Ato | Janela | Área | O jogador faz | Acontece sem o jogador | Transição de entrada | Checkpoints | Reutiliza | Novo |
|---|---|---|---|---|---|---|---|---|
| I Antes das 04:34 | 04:30–04:34 | BW | Prelúdio, mensagem (existente) | Vida do pátio (`m01-yard-life`) | `cs_m01_intro` (existente) | CP-A | tudo | Só o que vier de R1-b; fora do âmbito R4 |
| II Bombardeamento | 04:34–04:45 | BW | Reorganização, seguir o sargento | 3 Ju 87, danos persistentes | contínua | CP-B | raides, danos | R1-a (consequências) fora do R4 |
| III Cabeça leste | ~04:45–06:00 | BW (vista) · **LE opcional** | Em BW: reparo (existente). Em LE (opção D-1): defender os portões com o pelotão de Faterkowski | Comboio 963, Panzerzug 7, fogo dos portões | Em LE: cartão + carga de área | BW: CP-B2; LE: CP-L1 portões, CP-L2 retirada | deck assault (invertido), rearguard, barks | Área LE, 2.º protagonista fictício |
| IV 04:50–06:00 | 04:50–06:00 | BW | Reparo, ordem 05:30, posição no tabuleiro | Raide 05:30 (`raid_0530*`), assalto do tabuleiro | contínua | CP-B2, CP-C | `seg_hold` 24×, deck assault | — |
| V Retirada e demolição | 06:00–06:45 | BW | Retaguarda, escolta SP-08, demolições | Retirada do pelotão leste ~06:00, 06:10, 06:45 | contínua | CP-D | squad, corridor, rearguard | — |
| VI Depois das pontes | 06:45–07:05 (+~07:20 em VI-b) | BW | Chamada no abrigo (existente). VI-b: vigiar a margem, levar feridos à estação, receber ordem de reforço | Ataque ~07:00 ouvido a norte (existente); fumo das pontes | contínua; saída por cartão «Perímetro norte — manhã» + carga | CP-E (fim da chamada) | barks, yard-life, pacing | VI-b curto, sem inimigo a oeste |
| VII-a Norte, manhã | «manhã», hora no ecrã só aproximada | NP fatia x −700…−300, z −1350…−1050 (400 × 300 m) | Chegar como reforço (`GAMEPLAY_DRAMATIZATION`), segurar a trincheira, apoiar a ckm e o Bofors contra um ataque vindo do norte | Destroço do blindado do ataque ~07:00 a arder (T08); fogo de morteiros alemães e polacos (T03, T16) | cartão + carga | CP-F chegada, CP-G 1.ª vaga, CP-H contra-ataque repelido | deck assault (generalizado a linha de aproximação), rearguard, squad, barks, display-fire, pacing (compressão) | Área NP, plano de assalto norte, Bofors wz.36 (asset), artilharia como pressão |
| VII-b Norte, dia | «durante o dia» (comprimido) | NP | Segunda posição/troca de setor; reabastecer; feridos | Ataques repetidos com artilharia (T16), sem número inventado no ecrã | cartão «Mais tarde…» (`interludeText`) | CP-I | idem | Artilharia com dano por raio (depende de R1-a) |
| VII-c Ordem e retirada | ~17:00 → 18:00–20:00 | NP → limite sudoeste (CT só quando houver mapa) | Receber a ordem (cartão/cena curta), retirar-se de noite como retaguarda da secção | Pôr do sol 18:39; batalhão em marcha | cartão «~17:00» (DOCUMENTED) | CP-J ordem, CP-K retirada | rearguard, squad (lanços), barks | Noite (iluminação), rota de saída; ruas reais **bloqueadas** (P4, §10) |
| Debrief | — | — | — | — | existente | — | `debrief` | Parágrafos novos só com fonte |

**Decisões do proprietário dentro desta estrutura:**
- **D-1 Lisewo jogável.** Implica 2.º ponto de vista (soldado fictício do 2.º pelotão da 1.ª companhia; Faterkowski fora de cena) e sobreposição temporal 04:45–06:00 com BW. Alternativa: Lisewo só observável de BW (binóculos, R1/VIS-1). Recomendação: adiar até T27, T26 e H01-PDF pp. 132–133 estarem no repositório.
- **D-2** VII com SS-Heimwehr próxima contraria a regra atual «só setor distante» (`HISTORICAL_RESEARCH.md` §5). Com a opção B, propõe-se «tropas alemãs vindas do norte», sem insígnias até fonte de uniformes de 1939.
- **D-3** Duração: estimativa 18–24 min (ato atual) + 10–14 min (VI-b, VII-a/b/c). Lisewo +8–10 min.
- **D-4** Szymankowo (J): manter a regra §8 (sem cena jogável). Só texto.

## 3. Arquitetura (vários atos sem partir a M01 atual)

### 3.1 Princípios
1. **O ato atual é uma caixa fechada.** `M01Simulation` e `missions/m01-tczew/map-layout.json` não mudam no incremento 0. Os atos I–VI continuam a ser a mesma simulação (as fases `INTRO…AFTERMATH` já existem); os novos atos são áreas com simulação própria.
2. **Um condutor de atos** (`src/game/m01-acts.js`, novo) possui a simulação ativa e faz as transições. `Game` cria `M01ActRunner` só com `acts.enabled`; desligado, `new M01Simulation()` como hoje (`src/game/game.js:25,52,126`).
3. **Dados por área:** `missions/m01-tczew/areas/<area>/layout.json` com o **mesmo esquema** de `map-layout.json` (`bounds`, `features`, `coverNodes`, `blastZones`, `sightlines`) e `missions/m01-tczew/areas/<area>/act.json` (relógio com `segments`, eventos, objetivos, checkpoints, setores, falas). `mission.json` ganha só `acts: {enabled, order:[…], entries:{id→{area, window, timeCertainty, transition, next}}}`.
4. **Parametrizar sem alterar o padrão:** `TczewWorld`, `m01-aircraft-path`, `m01-deck-assault`, `m01-rearguard`, `m01-squad`, `m01-pacing` importam hoje o layout ou têm constantes do tabuleiro (`DECK_SAFE_X`, `HOLD_AREA`, `WEST_SAFE_X`). Cada um ganha uma fábrica `make…(plan)`; a exportação atual fica `make…(planoAtual)`, com o mesmo objeto congelado. Teste: igualdade profunda com a exportação anterior.
5. **Simulação de área nova:** `M01AreaSimulation` (novo), com o mesmo contrato (`tick`, `drainEvents`, `snapshot`, `restoreSnapshot`, `checkpoint`), composta pelos módulos reutilizáveis (`m01-fire`, `m01-aim`, `m01-barks`, `m01-display-fire`, `m01-animation-presentation`, fábricas acima). **Não** copiar as 2562 linhas de `m01-simulation.js`; o que lá estiver embutido e for preciso (IA por homem `newAI`, `sees`, supressão) é extraído para módulo com teste de identidade de traço no ato atual.
6. **Herança entre atos:** função pura `carryFrom(snapshotFinal)` → `{difficulty, sobreviventes da secção (Kowal, Dudek, Zieliński…), Bąk evacuado, munição do jogador, flags m01.*}`. A semente do ato seguinte deriva do estado guardado sem consumir o RNG do ato anterior (padrão de `displaySeed`).
7. **Renderer:** uma área residente de cada vez; à transição, `dispose` da cena da área anterior, ecrã de carga (o `battleClock` já suspende em carga), far-landscape mostra a outra área como silhueta. O renderer continua sem decidir nada.

### 3.2 Saves
- **Esquema 2** (hoje): continua a ser o save do ato BW, plano e byte a byte igual. `validateM01Snapshot` não muda (rejeita ≠ 2).
- **Esquema 3** (novo, só para atos ≠ BW): `{schema:3, missionId:'m01_tczew', act:'act_vii_a_north', carry:{…}, actSave:{schema:1, area:'np', …}}`. O condutor despacha pelo campo `schema` **antes** de chamar a simulação. `resumeCheckpoint` segue o mesmo padrão de hoje, dentro de `actSave`.
- Um save de esquema 2 com `mission.complete=true` e `acts.enabled` abre a transição para o ato seguinte (o jogador não perde progresso).
- Testes: carregar os fixtures de esquema 2 existentes (`tests/fixtures/m01-*-baseline.json`) → estado igual; esquema 3 desconhecido/adulterado → rejeição com mensagem, como `loadCheckpoint`.

### 3.3 Golden e determinismo
- As rotas existentes (`tests/helpers/m01-route.js`, `driver()` sobre `M01Simulation`) e os baselines ficam intactos; a lista `m01-byte-guard-allowlist.js` não recebe entradas novas no incremento 0.
- Cada ato novo tem `driverAct(actId)` e baseline próprio (`m01-act-vii-a-gameplay-baseline.json`), com primeiras diferenças nomeadas quando houver emenda (como as emendas 08–16).
- Rota completa encadeada BW → VI-b → VII-a só verifica o `carry` e a ausência de falhas, não substitui os goldens por ato.

### 3.4 Incremento jogável mínimo
**INC-1 = WP-0 + WP-1:** condutor + esquema 3 + transição às 07:05 (cartão) + VII-a numa fatia de 400 × 300 m com uma vaga alemã vinda do norte, ckm e secção, destroço do blindado já a arder (sem modelo identificado), CP-F/G/H, e debrief no fim. Sem Bofors funcional se o asset não tiver licença (o tiro AT do ataque das 07:00 já aconteceu antes da chegada). É o mais pequeno que acrescenta jogo depois das 07:05 com um evento `DOCUMENTED` (T08/T16) e sem tocar no ato atual.

## 4. Conteúdo por setor (A–J)

| Setor | Geometria | Atores | Eventos | Classe | Não acrescentar sem fonte |
|---|---|---|---|---|---|
| A Cidade | Estação (existe, `RECONSTRUCTED`); posto de socorro junto da estação em VI-b; limite urbano como silhueta. Ruas jogáveis e quartel **só com mapa de 1939** | Civis (poucos, existentes), feridos, mensageiros | Feridos levados à estação (VI-b) | Estação `RECONSTRUCTED`; socorro `GAMEPLAY_DRAMATIZATION` | Localização do quartel (T30), ruas da retirada, central elétrica, bombardeamentos da cidade durante o dia |
| B Cabeça de ponte oeste | Existente; VI-b acrescenta só o percurso abrigo → estação | Secção, ckm, sapadores | Chamada, vigilância da margem | `RECONSTRUCTED` / existente | Combate de infantaria alemã na margem oeste |
| C Ponte ferroviária | Existente (`EXACT` vãos); estado pós-demolição | — | Fumo, destroços | `DOCUMENTED` (destruída) | Contagem de vãos no ecrã (P13) |
| D Ponte rodoviária | Existente | — | idem | `DOCUMENTED` | idem |
| E Lisewo | Área LE x 640…1500, z −200…240: dique 1075, portal 1052, comboio 963 (1065–1715), Panzerzug (1110–1215), paragem 1431 | Pelotão leste (efetivo desconhecido; 12–18 é dramatização, P8), pioneiros, Grenzwacht | Portões fechados ~04:45, combate, retirada ~06:00 | Factos `DOCUMENTED` (T01, T07, T08); posições `RECONSTRUCTED` | Efetivos e baixas (P8), uniformes do Grenzwacht (P7: regimento 1 vs 11), composição do 963 (P16), calibres do Panzerzug (P6, só MGs), traçado da aldeia |
| F Frente norte | Área NP; fatia VII-a; trincheira, posto de ckm, ninho AT, morteiros a retaguarda | 2.ª/3.ª companhias (nomes fictícios), pelotão AT; alemães «vindos do norte» | ~07:00 ataque repelido (T08); ataques durante o dia (T16) | Composição `DOCUMENTED` (T03); posições `RECONSTRUCTED`; chegada do jogador `GAMEPLAY_DRAMATIZATION` | Tipo/modelo dos blindados (P9), topónimo exato no ecrã, número de vagas ou baixas, insígnias SS |
| G Oeste/noroeste | Nada | — | — | — | **Szpęgawa, Suchostrzygi: nenhuma posição, nome ou combate** (0 fontes) |
| H Margens do Vístula | Existente; VI-b com posto de observação na margem | Vigias | Observação da margem leste; disparos dispersos a partir da margem leste só como `GAMEPLAY_DRAMATIZATION` rotulado | `RECONSTRUCTED` | **Travessias alemãs do rio depois das demolições** (nenhuma fonte; §10) |
| I Apoio e comando | Posto de comando de campanha (NP), depósito de munições, padiola | Mensageiro, maqueiros | Reabastecimento, ordem das ~17:00 por mensageiro | Ordem `DOCUMENTED` (T03); forma `GAMEPLAY_DRAMATIZATION` | Falas de Janik/Juchtman ou de qualquer oficial histórico |
| J Szymankowo | Nenhuma | — | Aviso (existente, dramatização) e `db_06` | `DOCUMENTED` limitado (T23) | Cena, mapa ou autores (P10) |

**Equipamento proibido até haver fonte no repositório:** FT-17 e TK-3 em via férrea; canhões de 76,2 mm (com ou sem munição); comboios blindados polacos em Tczew; camiões, motos e atiradores furtivos com identidade; calibres de 7,5 cm do Panzerzug em jogo (T20, fonte única e incerta). Permitido com fonte citada mas não relida: Bofors wz.36 (T03, T08), morteiros (T03).

## 5. Fontes que o proprietário deve fornecer (PDF/ficheiro no repositório)

Guardar em `research/sources/` com nome = ID (p. ex. `T08.pdf`). Sem isto, os itens indicados ficam `BLOQUEADA`.

| Prioridade | ID / documento | URL registado | Desbloqueia |
|---|---|---|---|
| 1 | H01-PDF — Kłodziński, *Wojna i Pamięć* 3/2021, pp. 120–152 | https://www.muzeum1939.pl/upload/2025/12/925f2e996b710392cf361d1aa7964f8128942.pdf | Lido em PR #10 mas não guardado; VII (o que H01 diz da tarde), E (pp. 132–133), P13 |
| 1 | T08 — Konflikty.pl, *Walka o tczewskie mosty 1 września 1939 roku* | https://www.konflikty.pl/historia/druga-wojna-swiatowa/walka-o-tczewskie-mosty-1-wrzesnia-1939-roku/ | VII-a (ataque ~07:00, blindados, canhão AT), P9 |
| 1 | T03 — *2 Batalion Strzelców (II RP)* (pl.wikipedia) e a bibliografia que cita | https://pl.wikipedia.org/wiki/2_Batalion_Strzelc%C3%B3w_(II_RP) | F, VII-b, VII-c (~17:00, 18:00–20:00, rumo) |
| 1 | T16 — *SS Heimwehr Danzig* (en.wikipedia) + fonte primária que cite | https://en.wikipedia.org/wiki/SS_Heimwehr_Danzig | F, VII-b (Pszczółki, artilharia), D-2 |
| 1 | Mapa topográfico de 1939 (Messtischblatt «Dirschau» ou WIG) — **sem URL no repositório** | — | A, F, CT, P4 (quartel, ruas, trincheiras, relevo) |
| 2 | T27 — pionier39.pl, *Pionier-Bataillon 41 w walce o Tczew* | https://pionier39.pl/pionier-bataillon-41-w-walce-o-tczew-1-wrzesnia-1939-r/ | E/D-1 (lado alemão em Lisewo), P6, P7, P16 |
| 2 | T26 — Fundação PKP, *kpt. Walenty Faterkowski* | https://www.pkp.pl/pl/fundacja-aktualnosci/2413-pamietamy-o-bohaterach-kpt-walenty-faterkowski | E (pelotão leste) |
| 2 | T30 — polskaniezwykla.pl, *Tczew, koszary wojskowe* | http://www.polskaniezwykla.pl/web/place/2298,tczew-koszary-wojskowe.html | A (quartel; localização) |
| 2 | T24 + fotopolska.eu (estação antiga) e T18 Skarbnica Tczewska | https://en.wikipedia.org/wiki/Tczew_railway_station · https://skarbnica.tczew.pl/1832/tczew-mosty-przez-wisle-widok-od-strony-zachodniej-portale-wjazdowe/ | A, P11 (licença das fotos) |
| 3 | T14 Wargameds; T20 (trens blindados) | https://wargameds.com/blogs/news/armored-trains-their-history-and-the-campaign-in-poland-in-1939 · https://en.wikipedia.org/wiki/%C5%9Amia%C5%82y_(armoured_train) | E (Panzerzug, P6); prova ou exclusão de comboios blindados polacos |
| 3 | Fonte da própria proposta do proprietário para FT-17/TK-3 ferroviários, 76,2 mm, Szpęgawa/Suchostrzygi, travessias, ~1.068 militares | **sem URL no repositório** | G, R5, H; sem ela ficam excluídos |

## 6. Pacotes de trabalho (por ordem)

| WP | Conteúdo | Depende de | Risco | Tamanho | Aceitação determinista | Aceitação humana |
|---|---|---|---|---|---|---|
| **WP-0** Condutor de atos e saves | `m01-acts.js`, `acts` em `mission.json` (desligado), esquema 3, fábricas parametrizadas com padrão idêntico, extração de IA por homem se necessária | — | Alto (saves, integração): `reviewer-critical` | M (≈600–900 linhas + testes) | Todos os goldens e baselines BW byte a byte; fixtures de esquema 2 carregam com estado igual; `acts.enabled=false` ⇒ traço igual ao de `M01Simulation`; esquema 3 adulterado rejeitado; igualdade profunda das constantes exportadas | — |
| **WP-1** VII-a Norte, manhã (INC-1) | Área NP 400 × 300 m, `act.json`, 1 linha de aproximação alemã (deck assault generalizado), ckm, secção com `carry`, destroço a arder, CP-F/G/H, cartão de entrada, debrief movido | WP-0; T08/T16 recomendados (sem eles: tudo rotulado e sem nomes) | Médio | L (área + plano + render) | Golden `act_vii_a`; 0 atravessamentos; distância ao inimigo < 300 m ≥ 40 % da janela; intervalo máx. sem contacto < 20 s; save/restore em cada CP; rota BW→VII-a sem falhas | Transição legível, intensidade, nada apresentado como facto sem fonte |
| **WP-2** VI-b Margem oeste depois das pontes | Percurso abrigo → estação, feridos, posto de observação da margem, ordem de reforço; nenhum inimigo a oeste | WP-0 | Baixo | S–M | Ato BW até 07:05 idêntico; VI-b com golden próprio; nenhum ator alemão com x < 265 | Ritmo da pausa depois das demolições |
| **WP-3** VII-b Norte durante o dia | Segunda vaga, artilharia com dano por raio, reabastecimento, compressão «Mais tarde…» | WP-1; R1-a (dano de explosão) | Médio | M | Dano por raio/cobertura testado; nenhuma hora exata no ecrã (só cartões aproximados); golden | Variedade sem ciclos |
| **WP-4** VII-c Ordem ~17:00 e retirada noturna | Cartão ~17:00 (DOCUMENTED), retaguarda e lanços em luz de crepúsculo/noite (C01), saída a sudoeste genérica | WP-1; mapa 1939 para ruas (sem ele: só limites do perímetro) | Médio | M | Iluminação por hora (18:39); golden; save noturno | Legibilidade de noite |
| **WP-5** Bofors wz.36 e morteiros | Asset com licença, escala, guarnição; tiro AT só como na fonte | Asset licenciado; T03/T08 relidos | Médio | M | Teste de manifest/licença; balística determinista | Inspeção visual |
| **WP-6** Lisewo jogável (D-1) | Área LE, 2.º protagonista fictício, portões, retirada ~06:00, CP-L1/L2 | D-1; T27, T26, H01-PDF | Alto | XL | Golden `act_iii_le`; coerência com o estado do pelotão leste em BW (mesma hora de retirada) | Ponto de vista e cronologia claros |
| **WP-7** Cidade/quartel (A) | Ruas e quartel reais | Mapa 1939, T30 | Médio | L | Medidas com classe espacial | — |
| **WP-8** Playtest integral | Missão completa com atos | todos os ativos | — | — | `npm test`, build, browser na candidata | Aprovação do proprietário (nada passa a VALIDADO sem ela) |

**Ordem:** WP-0 → WP-1 (INC-1 jogável) → WP-2 → WP-3 → WP-4 → WP-5; WP-6 e WP-7 só depois das fontes e de D-1. Cada WP numa branch própria a partir da candidata #80, merge `--no-ff` na candidata depois de testes focados; sem `main`, sem deploy. Antes de qualquer WP, verificar o registo M01 (`m01_task_registry.py check … --live`) e reservar só se `UNKNOWN`.

## 7. Incertezas deste plano
- Não se leu o renderer em detalhe: o custo real de descarregar/carregar uma área (e o impacto no Chromebook) está por medir em WP-0.
- Não se confirmou que toda a IA por homem é extraível de `m01-simulation.js` sem alterar o traço; se não for, WP-0 cresce ou VII-a usa uma IA mais simples.
- As horas de VII-a/VII-b são inventadas para o ritmo; o ecrã mostra só «manhã» / «durante o dia» até haver fonte.
- Nenhum teste foi corrido para este documento.
