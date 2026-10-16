# CAMPAIGN AUDIO DIRECTION · Assinaturas sonoras, silêncios, música, voz

**Estado:** PROPOSTA DE DIREÇÃO SONORA (Fase 3/5). Base real: `src/core/audio.js` (main) e Battlefield Audio V1 (`src/core/battlefield-audio.js`, V5, EM INTEGRAÇÃO): síntese Web Audio, buses, bandas de distância 45/220/950 m, `PHASE_ACTIVITY`, `planBridgeDemolition`, `planMetalStress`, `duck()`. Limites reais hoje: sem passos, sem água, sem VO, sem música. Herda `M01-AUDIO-MUSIC-DIRECTION.md` (PR #56): mapa sonoro por hora e distância, contrato de silêncio, política de música (um motivo, duas aparições), acessibilidade.

---

## 1. Princípios

1. **O som tem origem e distância** (atraso luz→som como em M01; C02). Nada é omnipresente.
2. **Silêncio é forma.** Cada missão tem janela(s) de silêncio obrigatório com `duck()` e sem falas ambientais; avisos de proteção têm prioridade máxima e são sempre legíveis.
3. **A guerra continua fora da câmara**: as bandas média/longa mantêm a agenda dos setores mesmo em interiores (filtradas pela oclusão).
4. **Música quase nunca**: um motivo por movimento, usado apenas em cartela de abertura e debrief; nunca sobre feridos, mortos, resgates ou rendições (Prompt §72).
5. **Voz no idioma original**, legendas em português; rádio com distorção moderada; sem sotaques caricatos; sem cópia de gravações de outros jogos.
6. **Acessibilidade**: legendas com nome do falante e contraste; indicação de sons relevantes; redução de zumbido/flash; volumes separados (§76).

---

## 2. Assinatura sonora por missão (ordem das camadas = ordem dramática)

| # | Assinatura (progressão) | Silêncio obrigatório | Som novo a construir |
| --- | --- | --- | --- |
| 02 | folhas ao vento → artilharia de preparação ao longe → tiros em vários planos → cascos na estrada → queda de intensidade no pomar → motores de avião a sudoeste → rodas da carroça | o pomar | cascos/carroça, macieiras, artilharia polaca de 75 mm |
| 03 | vidro a vibrar → passos em escada → chamas ao longe → sirene → bombas a cair por bairros → respiração no porão | o porão entre vagas | interiores de alvenaria (reverberação), sirenes de Varsóvia, bombardeiros He 111 a média altitude |
| 04 | motores parados → ordens abafadas → areia e vento → ondas → chamadas de embarque → Stukas (sirene e bombas na água) → hélice e motor de barco | o motor que engole as vozes | água de praia, barcos pequenos, multidão em fila |
| 05 | Merlin a arrancar → rádio direcional → vento no cockpit → alarme → 8×.303 → silêncio de motor reduzido → chave inglesa | o regresso | motor Merlin por regime, rádio TR9, Browning .303, flak distante |
| 06 | vento seco → estalos de areia no metal → telefone de campanha → Vickers (abastecida) → motores de blindados a 1 km → gritos de posições vizinhas → silêncio do posto que não responde | o posto mudo | telefone de campanha, Vickers, Pz III/IV à distância, artilharia do porto |
| 07 | respiração e tecido rígido → compressão da neve → eco de tiros entre árvores → trenó → artilharia ao longe → vento que apaga sons | o campo antes do assalto | neve (passos, trenó), isbás a arder, Mosin/DP, vento |
| 08 | motor marítimo → rampa → **nada** → insetos e aves → rádio → caixas descarregadas → silêncio da mata | a praia depois da rampa | selva tropical, Higgins boat, descarga logística |
| 09 | água próxima → motores fracos → sirene e explosões com atraso → vozes no barco → desembarque → interiores de pátio → o rio ao fundo durante a última conversa | o meio do rio | água de rio, barco a motor, Ju 87/88 noturnos, artilharia pesada em margens diferentes |
| 10 | eco metálico → correias/engrenagens residuais → ataque → fogo em galpões → zumbido de ouvido → o eixo que se cala | o zumbido da máquina que para | interiores industriais (metal, grandes volumes), tubagens, blindados em pátio |
| 11 | estalos secos no escuro → **21:40**: barragem que acende a frente inteira → passos e rádio intermitentes → fitas ao vento → vozes de curta distância | antes das 21:40 | barragem de 882 peças por setor, engenheiros, Bren/Vickers, 6-pdr |
| 12 | rádio com falhas → motor ao ralenti → explosões a deslocar-se de flanco → telefone mudo → camião a arrancar | o telefone mudo | telefone EE-8, camiões GMC/Dodge, panzers a média distância |
| 13 | diesel V-2 → engrenagem da torre → abafamento interno → choques metálicos localizados → "Torre lenta!" → motor desligado, metal a estalar | motor desligado | interior de T-34 (vibração, motor, canhão 76 mm, impactos por componente) |
| 14 | motor do jeep → poeira dos pneus → cigarras → aves rurais → disparos espaçados → dialeto siciliano | o olival | jeep Willys (regimes, caixa), estrada de terra, cigarras |
| 15 | motor de LCVP → encalhe no recife → água abafando tiros → respiração → ordens dos navios → rebentação → cais de madeira | o som abafado junto ao cais | água rasa (vadear), recife, LVT, fogo naval |
| 16 | vento da montanha → pedras → tiros com relevo → respiração de quem carrega → artilharia afastada → silêncio da abadia | a abadia vazia | pedra, vento de altitude, maca em encosta |
| 17 | motores de C-47 → vento do salto → paraquedas → silêncio do pomar → passos sobre lama → senha sussurrada → flak longe → amanhecer com aves | o pomar | C-47, paraquedas T-5, senha, pomar normando noturno |
| 18 | motor em caixa metálica → rampa → tiro aberto → água → seixos → vento do penhasco → vozes dissonantes a reorganizar-se → de cima: a praia abafada | atrás do banco de seixos (1–2 s) | surf, seixos, bangalore (abstrato), fogo naval |
| 19 | aves → vento na sebe → passos abafados → roupa no varal → disparos pontuais → pneus do camião → o nome lido do Soldbuch | a quinta deserta | sebes (oclusão), quinta, camião |
| 20 | 17/9: planadores a aterrar, confiança; 21/9: tiros entre casas, posto médico; 25/9: chuva, botas abafadas, remos, água, chamadas discretas | o rio à noite | planador Horsa, chuva forte, storm boat, remos |
| 21 | chuva em folhas → ecos por ravinas → assobio → rebentamento em copa → estilhaços e galhos → silêncio ocluso → maca na lama | depois do rebentamento | pinhal, chuva, artilharia com dano em árvores |
| 22 | rádio de rotina → interferência → barragem às 05:30 → estática → passos em interiores gelados → blindados na rua | a estática | rádio SCR-300/EE-8, barragem alemã (Nebelwerfer), Clervaux (pedra, hotel) |
| 23 | vento sobre madeira → neve → C-47 de largadas (23/12) → artilharia de transição → colunas blindadas (26/12) → combate de Foy (13/1) → silêncio após | a noite no buraco | neve, C-47 de largadas, Sherman em coluna |
| 24 | rebentação → cinza (passos que se afundam) → **o fogo começa** → tiros concentrados → sal e surf abafado → ordens entrecortadas | antes do fogo | cinza vulcânica, LVT-4, fogo japonês oculto (origem só por impacto) |
| 25 | vento sobre o Reno → espanto → passos metálicos → disparos de acesso → **15:40** (a ponte ergue-se) → maquinaria de engenharia → suprimentos a cruzar | os 2 s após 15:40 | ponte de aço (vibração, `planMetalStress` reutilizado), Reno, M26 Pershing |
| 26 | mar → rampa → aves → portas a fechar-se → japonês/okinawano com barreira real → ordens de curta distância → relatórios do sul | depois da rampa | aldeia okinawana, LVT-4, civis |
| 27 | barragem massiva por eixos → holofotes (zumbido elétrico) → vento no Oderbruch → silêncio depois das rajadas → ambulância | o zumbido após a barragem | barragem soviética (Katyusha, 152 mm), holofotes, lama |
| 28 | setores a diminuir → metal a cair → passos → choro → uma voz civil clara → "Posso sair?" | o cessar-fogo (nunca mute) | cidade em ruínas (reverberação de fachadas), cessar-fogo por setor, civis |
| 29 | chuva na lona → água nas valas → macas → tiros distantes → quase silêncio no castelo | as ruínas | chuva contínua, lama, lona |
| 30 | água → metal do convés → passos → cerimónia (vozes históricas **só** com fonte/licença) → passagem aérea → água | a água | navio (teca, aço), multidão em silêncio, aviões em formação |

---

## 3. Contrato de silêncio (vinculativo)

- Cada silêncio obrigatório tem início/fim por evento (não por timer): ex. M11 termina às 21:40:00 do relógio de batalha; M28 começa com `evt_m28_ceasefire_confirmed` e dura até o setor seguinte confirmar.
- Durante o silêncio: `duck()` na cama de batalha, nenhuma fala ambiental, nenhuma música; só a camada do lugar (vento, água, chuva, respiração).
- Avisos de proteção podem quebrar o silêncio (prioridade máxima); a quebra é sempre um acontecimento do mundo.
- Em M30 não há combate: o "silêncio" é a ausência de disparos; o navio continua a soar.

---

## 4. Música (política de campanha)

| Movimento | Motivo | Instrumentação sugerida (original, a licenciar/compor) | Aparições |
| --- | --- | --- | --- |
| I | "A distância" (de M01) | cordas graves, um clarinete | cartela de 01–03; debrief de 03 |
| II | "A água" | piano preparado, vento | cartela de 04; debrief de 07 |
| III | "O nome" | violoncelo solo | cartela de 08; debrief de 12 |
| IV | "A escala" | metais surdos, percussão seca | cartela de 13; debrief de 20 |
| V | "A lama" | cordas com sordina | cartela de 21; debrief de 26 |
| VI | "A água, outra vez" | o motivo II, mais lento, sem percussão | cartela de 27; créditos de 30 |

Nunca em combate, resgate, morte, rendição, cerimónia. A tensão vem do som do mundo.

---

## 5. Famílias de som a construir (ordem por reutilização)

1. **Passos por material** (todas; ausente hoje): terra, restolho, madeira, alvenaria, areia, água rasa, neve, cinza, lama, aço, teca.
2. **Água** (04, 09, 15, 18, 20, 24, 30): praia, rio, recife, chuva, remos.
3. **Interiores** (03, 10, 22, 28): reverberação por volume e material; oclusão por paredes.
4. **Veículos do jogador** (05, 13, 14): motor por regime, caixa, vibração interior, danos por componente.
5. **Armas por nação/data** (ver timeline §3): perfis por calibre e mecanismo; nunca "tiro genérico".
6. **Artilharia como personagem** (11, 21, 27): assobio, impacto por material, dano em copas.
7. **Civis** (03, 14, 19, 26, 28): vozes em idioma original, portas, objetos.
8. **Rádio** (05, 06, 12, 22, 27, 28): fraseologia de época, distorção, estática como silêncio.
9. **Clima** (07, 20, 21, 22, 23, 29): vento, chuva, neve.
10. **Cerimónia** (30): multidão silenciosa, aviões em formação.

---

## 6. VO e legendas (regras)

- Falas canónicas de §79 gravadas **literalmente**; falas propostas só depois da aprovação do Capitão e da decisão de registo linguístico.
- Rádio: distorção moderada, prioridade de aviação (05) e de ordens (12, 22, 28).
- Legendas: nome do falante; cor por bando (aliado/inimigo/civil/rádio) configurável; nunca cobrem a mira; fila com prioridade (N-10 de M01 aplicado à campanha).
- Em M30, as falas históricas da cerimónia **só** com fonte e licença; na ausência, a cerimónia é vista e ouvida à distância (vozes indistintas), nunca inventada.

---

## 7. Prova sonora (critério de aceitação)

- Equivalência de rota (snapshot igual com e sem camada nova), como nas entregas de áudio de M01.
- Escuta humana de cada silêncio e de cada assinatura (não só espetrogramas).
- Medição de custo (vozes simultâneas, nós Web Audio) por missão no equipamento de referência.
