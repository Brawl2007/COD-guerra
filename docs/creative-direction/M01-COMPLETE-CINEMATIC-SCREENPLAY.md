# M01 — COMPLETE CINEMATIC SCREENPLAY · "A Primeira Manhã"

**Estado:** ROTEIRO DE PRODUÇÃO (proposta de direção sobre a estrutura aprovada). Cada cena indica o que **já existe** na simulação/apresentação (V5) e o que se **propõe**, com classe [A]/[B]/[C]/[D]. Falas canónicas por ID (texto em `mission.json`); falas novas por ID `1NN` (texto em [`M01-DIALOGUE-PRODUCTION-SCRIPT.md`](M01-DIALOGUE-PRODUCTION-SCRIPT.md)). Planos e câmaras em [`M01-CINEMATIC-SHOT-BIBLE.md`](M01-CINEMATIC-SHOT-BIBLE.md); ambiente em [`M01-ENVIRONMENTAL-WAR-STORYTELLING.md`](M01-ENVIRONMENTAL-WAR-STORYTELLING.md).

**Formato de cada cena** (brief §27): Identificador · Setor · Objetivo · Evento existente · Contexto histórico · Propósito narrativo · Personagens · Diálogos · Ações · Comportamentos militares · Interação do jogador · Elementos ambientais · Animações · Sons · Música · Direção visual · Transições · Consequências · Estados persistentes · Dependências · Fallbacks · Critérios de aceitação.

**Regra de controlo:** só duas cenas retiram o controlo (`cs_m01_intro`, `cs_m01_roll_call`), ambas puláveis, ambas com olhar livre. Tudo o resto é jogável.

---

## CENA 0 — Ecrã de carregamento

- **ID** `scr_m01_000` · **Setor** — · **Objetivo** — · **Evento** `evt_m01_intro_card` (missionStart)
- **Texto (canónico, SCRIPT.md §1, inalterado):** *"Tczew, Polônia. 1 de setembro de 1939. Duas pontes de ferro cruzam o Vístula em Tczew: uma ferroviária e uma rodoviária, 40 metros uma da outra. Do outro lado começa a Cidade Livre de Danzig. Por elas passa a ferrovia que liga a Prússia Oriental ao resto da Alemanha. Os sapadores poloneses prepararam as pontes para a demolição. A ordem é defendê-las e, se a guerra vier, não deixá-las intactas nas mãos do inimigo. Você é Jan Wrona, do 2.º Batalhão de Fuzileiros. É seu turno na cabeça de ponte."*
- **Proposta [B] (HUD):** fundo preto com o som do rio já a correr por baixo do texto (o áudio V1 tem loop de vento; propõe-se loop de água, ver doc 9). Sem imagem da ponte: a primeira vez que o jogador a vê deve ser em jogo.
- **Critério:** o jogador sabe onde está, quem é e por que a posição importa antes de ver um pixel.

---

## CENA 1 — O posto (04:30) · INTRO/SETUP

- **ID** `scr_m01_001` · **Setor** S1 (posto da secção, −70, −3, 22) · **Objetivo** ativa `obj_m01_deliver_message` no fim · **Evento** `cs_m01_intro` (first_person_intro, pulável, 44 s)
- **Contexto histórico:** FICÇÃO sobre unidade e lugar reais (2 Batalion Strzelców; cabeça de ponte oeste; crepúsculo civil, Sol a −3,7°, C01).
- **Propósito:** estabelecer rotina, intimidade e a relação café/caneca antes de qualquer ameaça; apresentar quatro vozes (Kowal, Zieliński, Krawiec, Bąk/Dudek) e uma mão (a de Jan a receber a caneca).
- **Personagens:** Jan (sentado), Zieliński, Krawiec, Kowal, Bąk, Dudek, Pawlak (de pé, afastado), Wąs e Lenc (vistos na encosta, a 40 m), Lipski (lanterna, a 120 m na linha).

**Timeline (cartelas e beats; o que existe no HUD V1 em negrito, o proposto em itálico):**

| t | Ação |
| --- | --- |
| 0,0 | **Ecrã preto.** Som: vento, água sob ferro, um apito de manobra longe (áudio: loop de vento existe; água e apito propostos [B]). |
| 3,0 | **Cartela 1:** TCZEW, POLÓNIA / 1 de setembro de 1939 — 04:30 (máquina de escrever). |
| 7,0 | **Cartela 2:** 2.º Batalhão de Fuzileiros · Oddział Wydzielony "Tczew" · Exército "Pomorze". |
| 9,0 | *Cartela 3 (proposta [B], 2 s, só se não atrasar o fade-in; alternativa: substituir a cartela 2 por três linhas):* "Duas pontes de ferro · 1.030 metros sobre o Vístula · Do outro lado, a Cidade Livre de Danzig." (FACTO: T04, T05, T06, T25.) |
| 11,0–13,4 | **Fade-in** em primeira pessoa; olhar livre. Céu azul-escuro; faixa clara a ENE; torres da ponte rodoviária em silhueta a 212 m (`sightlines[3]`). |
| 13,0 | Kowal limpa a rkm (`rkm_clean`, existe); Bąk sopra o café. **005 KOWAL:** "Café de verdade hoje. Mau sinal." |
| 16,0 | *140 BĄK: "Wrona, que horas são?"* (Jan não responde; a câmara pode olhar o relógio de Zieliński: gesto [B].) |
| 18,0 | Zieliński e Krawiec sobre o mapa dobrado, lanterna tapada pela mão. **001 ZIELIŃSKI.** |
| 23,0 | **002 KRAWIEC.** (Krawiec aponta com o lápis para fora do mapa, para a ponte real: direção de atores.) |
| 28,0 | **006 BĄK** → 31,0 **007 DUDEK** (Dudek escreve algo no caderno: prop [B]). |
| 35,0 | Zieliński vem até Jan; entrega o papel dobrado e a **caneca amassada**. **003.** |
| 40,0 | **004 ZIELIŃSKI (obrigatória):** "Confira o homem do posto. Ele está sozinho." |
| 44,0 | Controlo total (`evt_m01_prelude_start`) · **CP-A**. |

- **Ações/comportamentos:** ninguém está parado (Prompt §37): Kowal limpa; Pawlak ata a bota; Wąs e Lenc, na encosta sul, tocam, apontam e anotam **sem procedimento visível**; Lipski passa com lanterna.
- **Interação:** nenhuma até 44 s; olhar livre; Espaço salta (estado final: mensagem e caneca no inventário, controlo no posto).
- **Ambiente:** fogareiro aceso (prop existe), bule, dois capacetes no chão, a rogatywka de Jan na cabeça (HUD/ViewModel: `headgear`), vapor do café (partícula [B]).
- **Animações:** `seated` (Jan, procedural), `rkm_clean`, `standing_idle`, `crouched_idle`; gesto do relógio [B].
- **Som:** vento 0,02; água; apito a 500 m; vozes sem reverberação (exterior); respiração de Bąk.
- **Música:** motivo "A Primeira Manhã" (doc 9) só sob as cartelas (3–11 s), cortado no fade-in.
- **Direção visual:** exposição baixa, azul-cinza; a única luz quente é o fogareiro e a lanterna tapada.
- **Transição:** sem corte; o jogador levanta-se e anda.
- **Consequências/estados:** `evt_m01_prelude_start` consumido; CP-A.
- **Dependências:** HUD V1 (cartelas), ViewModel (mãos/caneca [B]).
- **Fallbacks:** skip aplica o estado final sem repetir falas (já).
- **Critérios:** 4 vozes distinguíveis; a caneca vista na mão antes de ser entregue; o jogador identifica a direção da ponte sem marcador.

---

## CENA 2 — O caminho e o posto da ponte (04:30–04:33) · SETUP/BUILDUP

- **ID** `scr_m01_002` · **Setor** S1, S3 (ao longe), S5 (vazio) · **Objetivo** `obj_m01_deliver_message` · **Eventos** `evt_m01_railway_worker_report` (04:31), `evt_m01_planes_heard` (entrega ou 04:33:10)
- **Contexto:** FICÇÃO compatível (aviso de Szymankowo: T13; posto avançado: dramatização).
- **Propósito:** tutorial orgânico (andar, olhar, cobertura, interagir); a ferrovia como lugar de trabalho; a única conversa pessoal da manhã (Nowicki); o silêncio de 40 s.
- **Personagens:** Jan, Lipski, um guarda no portal rodoviário (`generic_rifleman`), Wąs/Lenc na encosta, Nowicki no posto.

**Beats:**
1. **Saída do posto.** Duas rotas (trincheira ou faixa aberta; já). A trincheira ensina a agachar (C); os sacos ensinam a encostar.
2. **04:31, Lipski na linha** (x −100…−20, lanterna). Se Jan passa a ≤ 15 m: **008**. Caso contrário a informação chega por **019**. *Proposta [B]: 170 se Krawiec está perto.*
3. **A ponte aparece.** Primeira vista completa: o portal ferroviário (x −8…0, z −7…7), o portal rodoviário a 40 m, as torres do 1.º pilar a 141 m, e **1 km de ferro** até ao portal de Lisewo com os portões fechados (x≈1052). Nenhum marcador: o jogador vê onde vai porque a ponte é a coisa maior do mundo.
4. **Posto avançado** (18, 0, 3): sacos de areia sob o portal ferroviário. Nowicki sozinho, capacete no colo. **E** entrega: **009 JAN**, **010 NOWICKI**, **011 NOWICKI** (lê o papel).
5. **O salto do relógio** para 04:33:10 (`snap`, já) e `evt_m01_planes_heard`: motores a leste (80°, Elbląg), 40 s a crescer; aproximação final pelo sul.

**SP-01 "Os motores" (set piece, ver doc 4):** durante 40 s de relógio ninguém dispara e ninguém corre (ainda). Nowicki levanta-se devagar: **012** "Ouve isso? Não é trem." → **013** "Aviões! A leste, contra a claridade!" → **067 ZIELIŃSKI (longe)** → **066 NOWICKI** (já a correr pela encosta sul com a caneca, `target = repair_site_1`, já implementado). *Proposta [B]: Wąs e Lenc param e olham para leste (target null por 3 s); o guarda do portal rodoviário tira o capacete do ombro e põe-no; Lipski apaga a lanterna.*

- **Interação:** andar, olhar, E. Sem tiro (o wz.29 fica para a Cena 5, quando tem propósito).
- **Ambiente:** sacos de areia, o rio a correr para norte sob o ferro, o cheiro de carvão (não há cheiro: há fumo da estação a 400 m, [A] emissor existente `station_wagon_fire` só depois; propor um fumo fino de chaminé/locomotiva de manobra antes das 04:34 [B]).
- **Animações:** `walk`, `standing_idle` (Nowicki `seated` com capacete: pose [B]); corrida de Nowicki `run`.
- **Som:** rio (loop novo [B]); motores dos Ju 87 (loop existente `aircraft`, trajetória partilhada); o apito de manobra cala-se às 04:33.
- **Música:** nenhuma.
- **Direção visual:** o Sol a −3,2°; a faixa clara a ENE "recorta" os aviões (silhuetas Ju 87 V2 contra o céu, já); a margem oeste escura.
- **Transição:** sem corte para a Cena 3 (04:34:00).
- **Consequências:** `obj_m01_deliver_message` concluído (ou completado em silêncio às 04:34, já).
- **Fallbacks:** jogador que demora: os aviões chegam onde ele estiver (já); Lipski não repete.
- **Critérios:** o jogador vê a ponte inteira antes do primeiro tiro; ouve os motores pelo menos 20 s antes da primeira bomba; percebe que Nowicki correu *para* os sapadores.

---

## CENA 3 — Catorze segundos (04:34) · FIRST_CONTACT

- **ID** `scr_m01_003` · **Setor** S1, S3, S5 · **Objetivo** `obj_m01_take_cover` → `obj_m01_follow_sergeant` · **Eventos** `evt_m01_bombing_0434`, `evt_m01_forward_post_bombed` (+2,1 s), `evt_m01_nowicki_lost` (+5 s), `evt_m01_cable_cut`, `cs_m01_bombing` (jogável, 14 s, não pulável)
- **Contexto:** FACTO (04:34, estação/margem oeste/quartel bombardeados; três Ju 87 B da 3./StG 1); impactos individuais RECONSTRUÇÃO; Nowicki FICÇÃO.
- **Propósito:** a guerra chega por cima; a primeira perda não tem resposta nem corpo.

**Timeline (existente em negrito):**

| t | Ação |
| --- | --- |
| 0,0 | **Sirene de mergulho do 1.º Ju 87** (saída de picada: `planJu87PullOut`, existe). Movimento do jogador reduzido 40 % durante o sopro (já). |
| 0,6 | **014 ZIELIŃSKI:** "Para o chão! Todo mundo no chão!" |
| 2,1 | **1.ª bomba:** posto avançado (se Jan já saiu, destrói-o) ou quase-acerto no rio 40 m a norte (`forward_post_state`). Onda de choque; zumbido configurável (feedback V1). |
| 5,0 | **2.ª bomba** perto de `repair_site_1`, sempre ≥ 30 m de Jan; poeira; **Nowicki não é visto de novo** (`missing`). A caneca cai em (−36, −3, 11). |
| 8,5 | **3.ª bomba** no pátio da estação (`station_bomb`); um vagão pega fogo (`station_wagon_fire`, yard wagon burned, existe). |
| 10,0 | **016 SOLDADO:** "O aterro! Acertaram o aterro!" |
| 12,0 | **015 ZIELIŃSKI:** "Wrona! Para a trincheira! Siga a minha voz!" |
| 14,0 | **Fim do bloqueio parcial;** `obj_m01_take_cover` ativo ("Abrigue-se!", ≥ 2,5 s visível). |

- **Proposta [B]: a troca de chapéu.** Jan troca a rogatywka pelo capacete wz.31 (já: `headgear`); o ViewModel mostra a mão a tirar a rogatywka e a pôr o capacete (1,2 s), durante os quais a câmara não é bloqueada. Primeira "animação de mãos" da missão: a guerra começou.
- **Proposta [A]: direção de atores durante os 14 s.** Wąs e Lenc deitam-se (`pinned`); Kowal rola para a trincheira (`rkm_prone` ao chegar); Bąk fica de pé 1 s a mais e Dudek puxa-o pelo cinto (par de animação [C]; até lá, `crouched_idle` imediato). Lipski, a 300 m, continua de pé junto ao quadro de horários e só corre à 3.ª bomba.
- **Interação:** câmara e movimento livres; agachar; procurar cobertura real (`coverAt`).
- **Ambiente:** três colunas distintas: água e lama (rio), terra e cascalho (encosta), fogo e madeira (pátio). Decals V1 (crateras, fuligem) aparecem 0,04–0,6 s depois e persistem.
- **Animações:** `pinned`, `crouched_idle`, `run` (Zieliński para a trincheira).
| **Som:** sirenes com Doppler (áudio V1); bombas por distância (`planExplosion` bomb); detritos; metal da ponte a tinir (`planMetalStress`, existe) para a bomba do posto; zumbido pós-explosão (configurável).
- **Música:** nenhuma.
- **Direção visual:** flashes contra o céu ainda escuro; a poeira da 2.ª bomba iluminada por trás pela faixa clara; o fogo do vagão como única luz quente.
- **Transição:** `obj_m01_take_cover` → `obj_m01_follow_sergeant` (voz posicional 015/015a–d, sem marcador).
- **Consequências:** `forward_post_state`; crateras; vagão a arder; caneca no chão; Nowicki `missing`; `ignition_line_damaged`.
- **Fallbacks:** 12 s sem cobertura completam "Abrigue-se!" (já); nenhuma bomba a < 30 m (já).
- **Critérios:** o jogador sabe de onde vieram os aviões e para onde foram; vê o posto (ou a coluna de água); **não vê corpo de Nowicki**; ouve a 3.ª bomba antes de a ver (está atrás dele).

---

## CENA 4 — Reorganização e a caixa (04:36–04:55) · ESCALADA

- **ID** `scr_m01_004` · **Setor** S1, S3 (ferido arrastado 04:35:30; segunda passagem 04:40) · **Objetivos** `follow_sergeant` → `find_sappers` → `fetch_material` · **Eventos** `evt_m01_wounded_dragged`, `evt_m01_second_air_pass`; **CP-B** (≥ 20 s depois do bombardeio, no rally point)
- **Contexto:** FICÇÃO plausível; reparo dos cabos RECONSTRUÇÃO disputada (nunca mostrado).
- **Propósito:** contar os que ficaram; o trabalho que não se mostra; a travessia do pátio onde a guerra já tem custo.

**Beats:**
1. **Ponto de reunião** (−150, −3, 14), na cunha entre as linhas. **018** (Zieliński conta nos dedos: "Kowal. Bąk. Wrona. Nowicki? …Nowicki."), **019**, **020**. *Opcional [B]: 104 JAN "Era só para levar o café." se o jogador ficar 4 s junto de Zieliński.* Pausa de 2 s sem falas. **CP-B.**
2. **Encontrar Krawiec** (`repair_site_1`, −40, −2, 10): ajoelhado junto da cratera, Wąs e Lenc com ele. **021**, **023** "…a caixa no barracão ferroviário, a da faixa branca. Corre!" Os sapadores deslocam-se para `repair_site_2` (já).
3. **SP-03 "A caixa" (doc 4).** 222 m até ao barracão (−270…−250, 14…26), porta oeste. No caminho, a 300 m, **o ferido do pátio** (`STATION_PATIENT`, −300, −3, 30): Dudek chega-lhe à cabeça, **017** "Segura a perna dele! Segura, eu disse!", *152*, arrasta-o de costas (`drag_wounded`, 0,65 m/s) até à estação, *153*. O jogador vê-o a 40 m se olhar; acontece sem ele. Às **04:40** a segunda passagem distante (`second_air_pass`): explosões na direção da estação e do quartel, sem aviões sobre Jan; Lipski a correr com a lanterna apagada (ator civil, [B] target).
4. **O barracão.** Interior simples (não navegável além da porta): a caixa de faixa branca (`sapper_crate`), **E**. Carregar reduz a velocidade e impede disparar (já). Mensagem "Material recolhido…".
5. **Regresso** (143 m) até `repair_site_2` (−120, −2, 9). **E** entrega: **024 KRAWIEC** "Isso. Agora vire para o rio e não olhe para mim." → `obj_m01_cover_repair`.
6. **A caneca.** Durante o reparo, Krawiec passa por (−36, −3, 11), apanha a caneca e guarda-a no bolso sem comentário (prop `dented_mug` desativa; `dented_mug_picked_by_krawiec` em CP-C). *Proposta [B]: animação de agachar/apanhar (`crouched_idle` 1,5 s + ocultação do prop).* Um jogador atento vê; nada o força.

- **Interação:** andar/correr, E (duas vezes), agachar; nenhum tiro ainda (os alemães só chegam às 04:45).
- **Ambiente:** crateras, sacos desfeitos, o vagão a arder (chamas e fumo persistentes), vidros partidos na estação (decals V1 fuligem; props [B] vidro), o rastro do ferido no cascalho (decal [B]), a lanterna de Lipski caída (prop [B]).
- **Animações:** `drag_wounded`, transições `station_drag_*` (existem), `sapper_work` (já a trabalhar no segundo corte), `walk` com caixa (ViewModel `carryCrate`, existe).
- **Som:** o fogo do vagão (`planFireCrackle`, existe) e o seu estalar como ponto de referência espacial; a segunda passagem como ronco alto e três explosões abafadas a 400–600 m; vento.
- **Música:** nenhuma.
- **Direção visual:** o Sol ainda abaixo do horizonte (−1,5°); primeira luz cinzenta; o fumo do pátio arrasta-se para oeste? (sem vento documentado: deriva lenta, doc 8).
- **Transição:** 024 → Cena 5 (04:45 chega durante ou logo depois do regresso: pela partida contínua, a entrega dá-se por volta de 04:42; o trem chega às 04:45).
- **Consequências:** `station_wagon_fire`, ferido no posto de socorro, caneca com Krawiec (em CP-C).
- **Fallbacks:** piloto automático já corrigiu rumo e distância dos sapadores; a mensagem-guia indica barracão/porta oeste (já).
- **Critérios:** o jogador vê o ferido a ser arrastado **ou** ouve 017 de longe; ninguém explica o que há na caixa; CP-B nunca com bombas a cair.

---

## CENA 5 — Mil metros (04:45–05:30) · COMBATE PRINCIPAL

- **ID** `scr_m01_005` · **Setor** S1 (reparo), S2 (trem 963, Panzerzug), S5 (fumo do trem) · **Objetivo** `obj_m01_cover_repair` (150 s de trabalho sem supressão; gate `evt_m01_repair_complete`; `readyScale` 27× depois) · **Eventos** `evt_m01_train963_arrives` (04:45), `evt_m01_panzerzug_arrives` (04:52), `evt_m01_repair_complete`; **CP-C** pedido depois (05:30).
- **Contexto:** FACTO (trem 963, portões fechados, fogo polaco; Panzerzug presente); posições de fogo RECONSTRUÇÃO/dramatização; reparo RECONSTRUÇÃO disputada.
- **Propósito:** o combate característico de M01: proteger um trabalho a 1,2 km do inimigo; aprender a arma com propósito; a MG que "sobe" a encosta.

**Beats:**
1. **04:45.** Fumo de uma locomotiva parada diante do portal de 1912 (locomotiva e 65 vagões: produção V5); pioneiros descem (S2: silhuetas); clarões junto aos vagões e no dique. **025 PAWLAK** (chega a correr), **028 ZIELIŃSKI** ("alça em mil"), **026**, **027 KOWAL**. O tutorial de mira/tiro/ferrolho/recarga acontece aqui, com razão (V alterna 300/500/800/1000; já).
2. **SP-04 "A MG que sobe a encosta" (doc 4).** A MG34 dos portões (`de_east_0`) dispara sobre a encosta sul do aterro onde os sapadores trabalham (z≈10–11): os impactos "sobem" até eles (fogo mergulhante, modelo de flecha já implementado). Quando uma rajada passa a < 3 m: os três deitam-se (`sapper_work_pinned`), o trabalho pára 3,5 s, **022 KRAWIEC (obrigatória, 1.ª vez)** "Precisamos de espaço para trabalhar!"; 2.ª+: *121 "Lenc! Cabeça!"*; 3.ª: *202 LENC "Outra vez não…"*; ao levantar: *120 "Três… quatro… agora."*. Calar a MG (tiros do jogador a < 3 m da arma: 5 s + 2,5 s) → *132 KOWAL "A MG calou. Trabalhem!"*. `co_m01_enemy_mg_fire_on_squad` "Metralhadora no dique!" quando a MG vira para a secção; *130* nas vezes seguintes.
3. **04:52.** Panzerzug 7 para atrás dos vagões: **038 KOWAL** "Trem blindado! Na outra via, atrás dos vagões!" → *133 "Não é um. São dois."* (+15 s). Só MGs; nenhum canhão contra o jogador (P6).
4. **Munição.** **029** "Trocando carregador!" (real); **030 BĄK** "Cubro você!" (quando Jan recarrega perto); carregadores de Kowal por **E** (já) → *131* quando lhe restam ≤ 10.
5. **Metade:** *200 WĄS "Cabo. Pronto aqui."* → *122 KRAWIEC "Metade. Não comemorem."*
6. **Reparo completo:** **031 KRAWIEC** "Linha inteira. Avisem o oficial: está pronta." **032** "Pawlak, vai." Pawlak parte (`sprint` quando resolvido). O relógio acelera até 05:30 (`readyScale`), com S2 em comportamento de sustentação sem laço percetível.

- **Comportamentos militares (existentes):** Kowal responde ao clarão mais recente (2 s); supressão de MG; cadência cai sem aviso depois de 120 s de reparo parado (tolerância); os 26 do dique disparam só sobre a cabeça de ponte leste até às 06:00.
- **Interação:** mirar clarões (não fumo), alça 1000 m, ferrolho, clipe de 5, E para carregadores, agachar nos sacos (`cv_sandbag_mid_1/2`), trincheira, cratera (`cv_crater_1`).
- **Ambiente:** o nascer do Sol às 04:51 (74°): a primeira luz rasante sobre a água; os portões de Lisewo em contraluz; o fumo da locomotiva como marca de S2 (`planLocomotiveIdleTick`, existe); traçantes de MG a 1,2 km (já); poeira nos sacos (decals V1).
- **Animações:** `aim`/`fire_bolt`/`reload_clip` (NPCs), `rkm_aim`/`rkm_fire_burst`/`rkm_reload`, `sapper_work`/`sapper_work_pinned`, `pinned`.
- **Som:** estampidos com atraso ~3 s; MG34 a 900 m (perfil existe); estalos supersónicos perto (`crack`); rkm de Kowal; **a cadência da MG como relógio da cena**.
- **Música:** nenhuma. A tensão vem do intervalo entre rajadas.
- **Direção visual:** sol baixo a 74–82°; sombras longas do portal para oeste; o fogo mergulhante visível como linha de poeira a subir a encosta.
- **Transição:** 031/032 → aceleração do relógio → Cena 6 às 05:30.
- **Consequências:** `ignition_line_repaired`; baixas em S2 por ID; `repairPins`; tempo de reparo gravado (HUD).
- **Fallbacks:** 022 toca aos 40 % se não houve supressão (já); tolerância de 120 s (já).
- **Critérios:** o jogador percebe a relação clarão → impactos → sapadores deitados → trabalho parado; consegue calar a MG e vê o efeito; a diferença ajuda/ignora continua mensurável (reparo 180–207 s vs 206–251 s, 12 sementes).

---

## CENA 6 — A ordem sob o zumbido (05:30–05:34) · COMBATE PRINCIPAL

- **ID** `scr_m01_006` · **Setor** S1, S5 (raid de altitude), S3 (manter o socorro) · **Objetivo** ativa `obj_m01_hold_access` · **Eventos** `evt_m01_order_demolish` (05:30 ∧ reparo completo), `evt_m01_bombing_0530` (janela 05:30–05:34), `cs_m01_order` (12 s, sem perda de controlo); **CP-C** guardado quando `second_raid_state = ended`.
- **Contexto:** FACTO (ordem; raid Do 17 Z, H01-PDF n.76); hora da ordem RECONSTRUÇÃO (T01/T09).
- **Propósito:** a decisão de destruir chega por um rapaz de 18 anos a dizer as horas, enquanto o céu zumbe alto e ninguém mergulha.

**Beats:**
| t | Ação |
| --- | --- |
| 05:30:00 | Zumbido grave e alto a crescer (Do 17 a altitude: loop `aircraft` com mistura "far", sem sirene, sem silhuetas detalhadas); explosões abafadas na cidade (`raid_0530`, ≥ 30 m do jogador, já). Todos olham para cima 2 s (target null, [B]). |
| +0,0 | Pawlak chega de oeste pela trincheira, abaixado. *112 ZIELIŃSKI "Cinco e meia."* (ele diz a hora antes de Pawlak falar: sabe o que vem). |
| +1,5 | **033 PAWLAK:** "Ordem do comandante do batalhão: destruir as pontes. O pelotão do outro lado recua primeiro." |
| +6,5 | **034 ZIELIŃSKI:** "Ouviram. Quando os sapadores disserem, ninguém fica na ponte." |
| +10,0 | `obj_m01_hold_access` ativo. Bąk parte para o tabuleiro (`target = bak_wound_point`, já). |
| 05:34:00 | `second_raid_state = ended` → *164 PAWLAK "Cinco e trinta e quatro. Acabou lá em cima."* → **CP-C** (já: deferUntilSafe). |

- **Interação:** total; o jogador pode olhar para cima (nada mergulha) ou para leste (a cabeça de ponte leste continua em combate).
- **Ambiente:** fumo novo na direção da cidade (oeste/sudoeste), a juntar-se ao do pátio; S3 continua o socorro.
- **Som:** o zumbido a altitude tapa parcialmente S2 (ducking "o mais fundo vence", existe); silêncio relativo da secção.
- **Música:** nenhuma.
| **Direção visual:** sol a +4,8° (82°): primeira cena com ofuscamento ao olhar a leste; o céu a sul/oeste com fumo alto.
- **Transição:** → Cena 7.
- **Consequências:** `m01.second_raid_state`; CP-C com hora real.
- **Fallbacks:** CP-C nunca durante o raid (já).
- **Critérios:** o jogador ouve a ordem **e** o raid ao mesmo tempo e percebe que são coisas diferentes; sabe que a ponte vai cair antes de ver os sapadores agir.

---

## CENA 7 — Contra o sol (05:34–06:00) · COMBATE PRINCIPAL

- **ID** `scr_m01_007` · **Setor** S1, S2 (pressão 05:40), S4 (contacto 05:50) · **Objetivo** `obj_m01_hold_access` (readiness: jogador na área −10…160 × 30…50 quando o pelotão recua) · **Eventos** `evt_m01_runner_pressure_report` (05:40), `evt_m01_north_contact_distant` (05:50)
- **Contexto:** C01 (Sol atrás do inimigo) FACTO; pressão RECONSTRUÇÃO; contacto norte FICÇÃO (hora).
- **Propósito:** esperar com o sol nos olhos; a rotação de cobertura como linguagem do sargento; saber que o outro lado está a perder.

**Beats:**
1. **036 ZIELIŃSKI** "Sol nos olhos. Fique na sombra da treliça e espere o clarão." (+ *113* se o jogador insiste em olhar para leste; `co_m01_sun_glare` [B]).
2. **SP-06 "A rotação" (doc 4).** Depois de ~42 s na mesma cobertura, uma MG ou até quatro atiradores que **vêem** o jogador disparam uma salva real sobre a cobertura (impactos, traçantes). Só então Zieliński manda mudar e reserva o próximo nó: sacos → portal → treliça 1 → treliça 3 → torre do 1.º pilar. **035** genérica ou *114a–d* por nó. O HUD mostra a origem 8 s (já).
3. **05:40.** Pawlak volta: *115 "Pawlak. Água. Depois fala."* → **037** "Do outro lado dizem que não aguentam muito. Perderam uma metralhadora." → *161 "…o oficial mandou dizer só isto: aguentem."* → *141 BĄK "E agora? Que horas?"* S2 passa a `pressure`.
4. **05:50.** Clarões e ruído grave a norte (S4) a 1–1,5 km; nenhuma fala (o silêncio diz que é longe).
5. **Kowal e Bąk alternam** por conta própria (Kowal cobre, Bąk avança; já descrito; Bąk chega ao tabuleiro antes das 06:00).

- **Interação:** mudar de cobertura quando mandam (o fogo ajusta de facto), disparar contra clarões em contraluz, usar a sombra das treliças (`cv_road_truss_*`, cobertura parcial: as barras deixam passar tiros, já).
- **Ambiente:** contraluz; as torres de 23 m projetam sombras de 70 m para oeste; poeira iluminada por trás; o fumo do trem e do dique a leste.
- **Animações:** `aim`, `pinned`, `crouched_idle`; `near_miss_duck` quando resolvido (reação a `suppressedAt`).
- **Som:** salvas de ajuste com impactos no saco/ferro (perfis `impact` por material, existem); S4 como `distantBattle` com atraso de 2–4 s; vento.
- **Música:** nenhuma.
- **Direção visual:** o Sol a +5…+10°: ofuscamento (sprite de glare [B]); os clarões do dique quase invisíveis contra a luz, os dos portões visíveis entre as pontes (geometria real).
- **Transição:** 06:00 → Cena 8.
- **Consequências:** `holdAccessVisited`; cobertura reservada; baixas.
- **Fallbacks:** sem atirador com visão → reavalia a cada 4 s (já); jogador que não entra na área: `hold_access` conclui quando o pelotão recua e ele lá estiver (já).
- **Critérios:** o jogador muda de cobertura por causa de uma salva que viu, não por um ícone; percebe que olhar para leste custa.

---

## CENA 8 — Os nossos no tabuleiro (06:00–06:10) · SET-PIECE/CLÍMAX

- **ID** `scr_m01_008` · **Setor** S1 (tabuleiro rodoviário x 20–160), S2 · **Objetivos** `obj_m01_cover_withdrawal`, `obj_m01_rescue_bak` (opcional) · **Eventos** `evt_m01_east_platoon_withdraws` (06:00), `evt_m01_bak_wounded` (06:04), `evt_m01_germans_on_east_spans` (06:05), `evt_m01_east_demolition` (06:10, gate: pelotão com x < 660), `cs_m01_east_blast`
- **Contexto:** FACTO (recuo do pelotão leste; demolição às 06:10); Bąk FICÇÃO; alemães no tabuleiro RECONSTRUÇÃO.
- **Propósito:** cobrir homens que correm sobre ferro; a escolha de carregar; a ponte a cair longe e o som a chegar depois.

**Beats:**
1. **06:00.** Figuras pequenas vêm para oeste em lances curtos (18 ativos por ID; os outros seis caíram antes, fora de cena). **039 ZIELIŃSKI** "Aí vêm os nossos. Fogo em quem vem atrás deles. Nos nossos, não!" *142 BĄK "Um… dois… três…"* (parte para o tabuleiro).
2. **06:04.** Bąk cai em (55, 0, 41): **041**, **042 DUDEK**, **043 ZIELIŃSKI** "Wrona! Traga o Bąk até o Dudek. Eu cubro!" → `obj_m01_rescue_bak`. Se Jan carrega: *143 "Não me deixe cair."*, *144* (10 s), entrega em `aid_position` (−8, 0, 48): *150 DUDEK*, *145 BĄK*. (Dudek leva-o à estação depois das 06:10, já.)
3. **06:05.** Alemães entram pelo portal de 1912 e avançam pela metade sul até x = 690; mensagem "Eles entram pelo tabuleiro leste! Cubra os últimos homens do pelotão." Cada baixa do pelotão é um tiro real de um alemão não suprimido que vê o último homem, ≥ 20 s entre baixas, mínimo 12 (já). Tiros do jogador a < 3 m deitam o grupo: `co_m01_enemy_group_suppressed` "Deitaram! Continua!".
4. **06:06+.** O primeiro homem a passar a < 25 m: **040 RUSEK** "Não parem! Eles estão no tabuleiro atrás de nós!" Rusek chega com um ferido às costas (par `carry_wounded`/`carried` [C]; até lá, sozinho).
5. **SP-07 "O clarão e o som" (doc 4).** `cs_m01_east_blast`: t −7 *124 KRAWIEC "Apito. Três toques. Depois, chão."* · t −4 **apito 3×** · t −3 *162 PAWLAK "Seis e dez. É agora."* · t −2 **044 ZIELIŃSKI** "Cabeças baixas! Lá do outro lado!" · **t 0 clarão e coluna no antigo encontro leste (x≈800), vãos cedem, sem som** · t ≈ 2,0–2,4 **estrondo** (distância ÷ 343) e vibração do tabuleiro · *105 JAN "Dois segundos."* (opcional) · t 4 detritos no rio, fumo cobre o trem · t 6,5 **2 s de silêncio** (mixagem) · t 8,5 **045 KOWAL** "…Lá se foi o outro lado." · t 10 **046 ZIELIŃSKI** "Todos fora da ponte! Para o posto de disparo, agora!"
6. **Depois (06:10–06:11), o momento moral.** A 700 m, alemães recuam a carregar outros; alguns ficam. *181 RUSEK "Estão ali. A rastejar. Deixe-me."* (levanta a arma [B]) → *110 ZIELIŃSKI "Rusek. Esses já não vêm."* → *134 KOWAL "Mil metros. Não é tiro, é pontaria."* Se o **jogador** dispara sobre um alemão caído/em retirada depois da demolição (tiro a < 3 m dele ou acerto): *111 ZIELIŃSKI "Wrona. Não gasto cartuchos com quem já caiu. Nem você."* e 20 s sem falas de secção. Sem recompensa, sem contador, sem repetição.

- **Interação:** cobrir (suprimir) sem acertar nos próprios (o pelotão corre pela treliça norte, os alemães pela metade sul: já); carregar Bąk 63 m; decidir não disparar.
- **Ambiente:** o tabuleiro de ferro sob os pés; as torres; o rio a 10 m abaixo; o Sol a +10,6° exatamente atrás da explosão (90°): a coluna de poeira é vista em contraluz, o clarão quase invisível, o fumo escuro contra o sol.
- **Animações:** `run` (pelotão), `carry_wounded`/`carried` (Jan e Bąk via ViewModel `carryBody`, existe), `wounded`, `fallen`; alemães `RETREAT` (`run`), `DOWN` (`fallen`).
- **Som:** rajadas de MG dos alemães do tabuleiro; os passos do pelotão em ferro (footsteps [C]); apito; **silêncio**; estrondo com cauda longa sobre a água (`planBridgeDemolition`, existe); tensão de metal (`planMetalStress`).
- **Música:** nenhuma. (O estrondo é a música.)
- **Direção visual:** plano subjetivo obrigatório: olhar para leste no instante 0 recompensa; olhar para os seus (a oeste) é legítimo e o HUD indica a demolição (12 s, já).
- **Transição:** 046 → Cena 9; CP-D ao passar x < −20 sem carregar ninguém.
- **Consequências:** `east_ends_destroyed`; `m01.east_platoon_survivors`; `bak_status`/`dudek_status`; baixas alemãs (4 mortos, resto em retirada: já); `m01.fired_on_fallen` [B].
- **Fallbacks:** retardatários fora de vista passam a `reached_safety` após 90 s (já); Bąk entregue depois das 06:10 → Dudek leva-o já (já).
- **Critérios:** clarão antes do som em **todas** as partidas; o jogador vê o pelotão e os alemães como grupos distintos; a escolha de não disparar é possível e tem resposta.

---

## CENA 9 — Não contes os tiros (06:10–06:45) · CLÍMAX

- **ID** `scr_m01_009` · **Setor** S1 (evacuação), S2 (reagrupamento 06:20), S3 (carroças) · **Objetivos** `obj_m01_leave_bridge` → `obj_m01_hold_corridor` · **Eventos** `evt_m01_dudek_retrieves_bak` (06:14, se opcional ativo), `evt_m01_west_demolition` (06:45, gate; avisos 06:36/06:38:30), `cs_m01_west_blast`; **CP-D**.
- **Contexto:** FACTO (demolição oeste 06:45); procedimento de avisos FICÇÃO plausível; guarnição da ckm FICÇÃO sobre casamatas documentadas.
- **Propósito:** a retirada como contagem; a casa da arma abandonada; a ponte do avô de Lipski.

**Beats:**
1. **Sair da ponte.** 310–450 m de cobertura em série (portal, sacos, trincheira, barracão, vagões). Atiradores do dique e rajadas do trem varrem a faixa (reagrupamento 06:20). *118* se o jogador corre no tabuleiro. **CP-D** ao passar x < −20 sem carregar.
2. **SP-08 "A guarnição sai de casa" (doc 4).** 3 s depois da explosão leste a guarnição da ckm abandona a casamata (24, −3, 43): *190 HAJDUK "Esta não fica. Vem connosco."*, *191*, *192 CYRA*. Em `retreat`, passam por Jan: *193 PISZCZEK "Capral, e se eles atravessarem?"* → *194 HAJDUK "Então é por isso que a levamos."* → *116 ZIELIŃSKI "Hajduk. Para a estação. A arma vai convosco."* (Transporte visível da arma: [C].)
3. **O corredor** (`firing_point`, −290, −3, 22): **047 ZIELIŃSKI** "Contem os homens do pelotão leste quando passarem. Em voz alta." *119* → **048 (obrigatória)** "Wrona, conte os nossos. Não conte os tiros." (se Jan atira enquanto passam, ou após 10 s) → **049 JAN** "{n}. São {n} do pelotão leste." (`co_m01_platoon_count` [B]: um número por homem). Os últimos homens e a guarnição passam.
4. **06:14.** Se Bąk ficou: *117 ZIELIŃSKI "Dudek, vai. Eu digo quando."*; Dudek e Pawlak vão buscá-lo; Dudek volta ferido no braço (já).
5. **05:40→06:20, S3:** carroças de feridos para oeste (*172 LIPSKI* [B]); posto de socorro.
6. **06:36:** **050 KRAWIEC** "Última chamada! Quem estiver no encontro, sai agora!" **06:38:30:** **051 ZIELIŃSKI** "Boca aberta, cabeça baixa." Zieliński baixa a cabeça de Jan com a mão se estiver a ≤ 3 m (já descrito). Se Jan insistir em ficar: Zieliński vai buscá-lo e a demolição espera (já).
7. **SP-08b "Oitenta anos" (doc 4).** `cs_m01_west_blast`: t 0 detonação a ~210 m: clarão, som a 0,6 s, onda de pressão, poeira · t 1,5 **o portal oeste e os primeiros vãos caem no Vístula** (GLB `_collapsed`, já) · t 5 chuva de terra e madeira no posto de disparo · t 8 silêncio, zumbido (reduzível), vento e água · t 11 **052 LIPSKI** "Meu avô atravessava por ela para ir à feira." · *t 13 125 KRAWIEC "Oitenta anos. Quarenta segundos."* · t 14 `obj_m01_reach_shelter`.

- **Interação:** mover-se de cobertura em cobertura; disparar sobre quem persegue (ou não); contar; sair de `bz_west` a tempo; E para carregar Bąk se ainda ativo (nunca dentro de `bz_west` depois das 06:36: CP-D não guarda).
- **Ambiente:** os vãos de 1912 ausentes a 800 m, fumo persistente; S3 com carroças; a casamata vazia com a água do refrigerador entornada (decal [B]); depois das 06:45: o portal oeste ausente, os encontros danificados (decals V1 demolição), poeira a cair durante minutos (fumo persistente já).
- **Animações:** ckm `abandon`/`retreat` (clips `ckm_wz30_*` existem; transporte [C]); `run`, `crouch_walk` (resolvido futuramente).
- **Som:** demolição oeste a 210 m (perfil existe; a mais forte da missão); terra a cair (debris `planDebris`); zumbido; depois **só vento e água**; S4 em `lull`.
- **Música:** nenhuma.
- **Direção visual:** Sol a +15° (96°): sombras longas para oeste; a poeira da demolição iluminada por trás, a deslizar sobre a água para norte (o rio corre para norte); Lipski de pé junto ao barracão, a olhar.
- **Transição:** `reach_shelter` (57 m) → salto para 07:05 com fade e cartela (HUD V1).
- **Consequências:** `west_end_destroyed`; casamatas/portal/cobertura do encontro removidos (já); flags de Bąk/Dudek; contagem.
- **Fallbacks:** escolta de Zieliński (já); CP-D nunca em `bz_west` após 06:36 nem a carregar (já).
- **Critérios:** o jogador diz o número em voz alta e o número é verdadeiro; vê a guarnição sair com a arma (ou, até [C], vê-os sair); sente a demolição oeste no corpo (feedback V1) e vê a ponte ausente antes do abrigo.

---

## CENA 10 — A chamada (07:05) · AFTERMATH/OUTRO

- **ID** `scr_m01_010` · **Setor** S1 (abrigo, −260, −4, 70), S4 (ataque das 07:00) · **Objetivo** `obj_m01_reach_shelter` → `evt_m01_roll_call` · **Evento** `cs_m01_roll_call` (first_person_scene, pulável, 60 s), `evt_m01_kozliny_attack_distant` (07:00), `evt_m01_debrief`
- **Contexto:** FICÇÃO; ataque do norte FACTO (T08, fonte única).
- **Propósito:** o final verdadeiro: nomes ditos em voz baixa, um sem resposta, e a guerra que continua noutro sítio.

**Timeline (existente; propostas em itálico):**

| t | Ação |
| --- | --- |
| 0–3 | Fade-in com cartela "Chamada no abrigo / Tczew — 07:05" (HUD V1). Interior do abrigo; poeira no ar; Jan sentado; olhar livre. Os presentes sentados de frente para Jan (`stageRollCall`, já). |
| 3 | Kowal passa um cantil; Krawiec gira nas mãos a caneca amassada. |
| 6–11 | **053** "Chamada." **054** "Kowal." **055** "Presente." **063** "Bąk." |
| 12,5 | Variante por flag: **056a** (Dudek: "…a dívida é com o Wrona") / **056b** (Pawlak: "Levaram o Bąk para a estação. O Dudek foi junto, com o braço aberto.") / **056c** (Bąk: "Presente."). |
| *16,5* | *151 DUDEK "Devo-lhe uma. Está no caderno." (só se 056a)* |
| 18–19,5 | **064** "Dudek." → **057a** "Presente." / **057b** "Dudek… na estação. Eu sei." |
| 24–25,5 | **065** "Wrona." → **058 JAN** "Presente." |
| 28 | **059** "Nowicki." |
| 31–35 | **Silêncio 4 s.** Ninguém responde. |
| 35 | **059** "Nowicki." |
| 38–41 | **Silêncio 3 s.** Câmara livre; a caneca na mão de Krawiec, que não levanta os olhos. |
| 41 | **060** "Continuamos." |
| 48 | Tiros distantes a norte (`kozliny_attack_distant`: canhão AT e MGs, só som). |
| 50 | **061 KOWAL** "Agora é no norte." |
| 54 | **062 ZIELIŃSKI** "O norte é de quem está lá. Bebam água. Durmam se conseguirem." |
| 57–60 | Fade para preto (HUD V1) → debrief. |

- **Direção de atores (preservada e detalhada):** Zieliński não muda o tom ao chegar a Nowicki; Krawiec gira a caneca; Kowal olha para a porta ao ouvir o norte; Pawlak, se presente, mexe nos lábios ao repetir "Continuamos"; Wąs mastiga o fósforo; Lenc olha para o chão; Bąk (se ileso) ri uma vez, curto, e cala-se.
- **Proposta [C] (cinematográfica, opcional):** entre o fade e o debrief, **um plano exterior de 6 s**: a boca do abrigo e, ao fundo, os 141 m de água entre o encontro e o 1.º pilar sem ponte; poeira ainda a cair; nenhuma legenda. Exige câmara fora do jogador (não existe: `CutsceneDirector` é D-adjacente; por isso [C] e opcional). Alternativa [A]: o jogador *sai* do abrigo após a chamada e vê a ponte ausente antes de o debrief abrir (reposicionamento permitido no fim da cena, sem câmara nova).
- **Som:** interior (reverberação curta, exteriores abafados: o áudio V1 só tem exterior → interior [B]); respiração; água do cantil; o norte a 1,3 km com atraso de 4 s.
- **Música:** **nenhuma** sobre a chamada (regra preservada). O motivo de abertura pode regressar, muito baixo, **só** sobre o debrief, sem percussão.
- **Direção visual:** luz baixa e clara (+18,6°, 101°) pela boca do abrigo; poeira em suspensão (puffs finos [A] emissor); rostos em meia-luz; a caneca com um reflexo.
- **Transição:** debrief (texto canónico `db_01`–`db_07`) → cartela de transição para M02 (troca de protagonista, unidade, lugar e data: `exit.transitionNote`).
- **Consequências:** `m01.completed`; flags finais.
- **Fallbacks:** skip vai ao debrief sem repetir falas (já).
- **Critérios:** 7 s totais de silêncio com nomes; nenhuma música; o jogador recorda a caneca; o debrief não declara vitória.

---

## CENAS PARALELAS (o que acontece sem o jogador)

Resumo; detalhe hora a hora em [`M01-ENVIRONMENTAL-WAR-STORYTELLING.md`](M01-ENVIRONMENTAL-WAR-STORYTELLING.md).

| Setor | 04:30 | 04:34 | 04:45 | 05:30 | 06:00 | 06:10 | 06:45 | 07:00 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S2 Lisewo | silêncio | — | trem, fogo, MGs | pressão | recuo polaco; alemães no tabuleiro | demolição; recuo alemão com feridos | fumo, fogo esporádico | — |
| S3 estação | turno da noite, lanternas | bombas, vagão a arder, ferido arrastado | posto de socorro | raid alto na cidade | carroças de feridos | — | poeira | — |
| S4 norte | silêncio | — | — | fogo esporádico (05:15) | contacto (05:50) | pausa (06:25) | — | ataque de Koźliny (canhão AT) |
| S5 céu | vazio; faixa clara | Stukas, saída, 2.ª passagem 04:40 | fumo do trem a leste | raid de altitude 05:30–05:34 | — | — | — | — |

## ANTES / DEPOIS (resumo do roteiro)

| | Antes (SCRIPT.md) | Depois (este roteiro) |
| --- | --- | --- |
| Falas | 70 | 70 canónicas + ~55 novas com gatilhos reais e cooldowns |
| Personagens com voz | 9 | 15 (sem alterar o elenco: vagas existentes nomeadas) |
| Silêncios dirigidos | 1 | 6 |
| Momentos morais | perda sem corpo | + impulso contido (Rusek/Zieliński/Kowal) e reação ao jogador |
| Objetos com história | caneca, caixa, mapa, fogareiro | + relógio, caderno, lanterna, quadro de horários, fita da ckm, rastro do ferido |
| Controlo retirado | 2 cenas (puláveis) | 2 cenas (puláveis); tudo o resto jogável; 1 plano exterior opcional [C] |
