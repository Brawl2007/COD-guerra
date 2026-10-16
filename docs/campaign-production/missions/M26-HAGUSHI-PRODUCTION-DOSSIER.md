# M26 — L-DAY · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 1/4/1945, praias de Hagushi e eixo inicial da 1.ª Divisão, Okinawa; 5.º Marines, 1.ª Divisão; POV Samuel Brooks; fonte H26; 18–25 min; três falas; checkpoints "desembarque; reconhecimento; passagem de moradores; perímetro — salvar ondas, civis e estado dos companheiros"; "o desembarque principal encontra pouca resistência inicial; a tensão vem do que não se vê, sem fingir uma carnificina de praia"; Cole manda observar sem disparar contra toda sombra; moradores assustados: "comunicação simples, distância e atitude dos soldados permitem passagem; não exigir que os civis agradeçam"; uma ameaça pontual plausível "explicitamente marcada como dramatização"; "a primeira praia não recebe artificialmente toda a resistência da linha de Shuri". **Proposto:** Brooks no 1/5 (R; praias Blue/Yellow da 1.ª Div. — fonte secundária, P-C26), a carta de Marsh (começa aqui), "famílias que passam" como contagem, a porta que se abre → Tully aponta / Cole manda baixar → `m26.tully_deescalated`, a família Nakama com barreira de língua real (revisão cultural/linguística okinawana obrigatória — P-C26), Ruiz presente por `m08.ruiz_status`. **Sistemas:** [A] quase tudo; [C] LVT-4 na chegada (reutiliza M24), civis como atores não-combatentes com estados (medo/passagem) e ponto de recolha; [D] leitura de `m08.*`.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m26_hagushi` / 26 |
| Datas | 1945-04-01T08:15+09:00 → 1945-04-01T17:30+09:00 (hora local; domingo de Páscoa) |
| Local | recife e praia no extremo sul do setor Marine (Blue/Yellow — P) → o terraço acima da praia com muro de pedra → estrada de terra para leste → campos de batata-doce e cana, pinheiros, muros de pedra, túmulos okinawanos em meia-lua → uma aldeia pequena (casas com telhado de colmo e uma de telha vermelha, hinpun à entrada, shisa) com uma posição japonesa abandonada à orla → um cruzamento com vista para o interior (perímetro do dia) — `RECONSTRUCTED` (P-C26: praia, companhia, aldeia) |
| Operação | L-Day 1/4/1945: manhã luminosa, sem ondulação; toque às 08:30; ~16 000 homens na primeira hora; 60 000 ao anoitecer; sem minas na praia; pouca resistência; o 5.º Marines no extremo sul do setor Marine; Yontan tomado no dia; a resistência organizada a sul semanas depois (S-C22 — DOCUMENTED em resumo) |
| Unidade | 5.º Marines, 1.ª Divisão (canónico) → 1.º Btl. (R) → esquadra de Brooks |
| Elenco | cabo Samuel Brooks (POV), sgt. Henry Cole (§73; cabelo grisalho), cabo Elliot Marsh (§73; a carta), Nelson Gray, pharmacist's mate (§73; nunca "médico do Exército"), cabo Danny Ruiz (se `m08.ruiz_status = unhurt`; senão cabo Vic Prado — proposta), pte. Eugene "Gene" Tully (18, reforço), pfc. Walt Jessup (BAR, de M08 — proposta de regresso), a família Nakama (avô, mãe, duas crianças — propostas; nomes só na ficha, nunca ditos pelos Marines), outras famílias que passam (proxies), um Marine do Governo Militar com panfletos em japonês (sem nome), um condutor de LVT (propostas) |
| Fora de cena | gen. Pedro del Valle; gen. Simon B. Buckner; intérpretes Nisei (só por relato: "há um na companhia de comando") |
| Intocável | data, local, unidade, POV, falas `dlg_m26_001–003`, os quatro checkpoints (ondas, civis e estado dos companheiros persistentes), pouca resistência inicial, Cole bloqueia disparos precipitados, civis sem gratidão obrigatória, a ameaça pontual marcada como dramatização, nenhuma Linha de Shuri na praia, Cole/Gray/Marsh reconhecíveis e o desgaste preparado sem spoilers de M29 |

---

## 1. Story Bible

**Logline.** Samuel Brooks já não precisa de olhar para o cinto quando o ajusta. A rampa desce numa praia de Páscoa sem ondulação e sem tiros, com a maior frota que alguma vez viu atrás de si, e a única coisa que o inquieta é que ninguém dispara. Durante um dia, a esquadra aprende a ler terraço, estrada, cultivo e casas habitadas em vez de disparar; encontra uma família que tenta explicar onde mora e não agradece; abre uma rota de suprimento; e monta um perímetro para um avanço que ainda não começou. Marsh começa uma carta. Ao anoitecer pergunta pelo sul. Brooks não responde com a confiança que já perdeu em Guadalcanal.

**As oito respostas.**
1. **Situação central:** a praia calma e os civis; não disparar sobre uma porta (MASTER-STORY-BIBLE §4).
2. **Modo de contar:** famílias que passam — a guerra conta-se por quem atravessa a linha para a retaguarda, não por inimigos.
3. **Objeto:** a carta de Marsh, por começar (dobra o papel em branco na praia; escreve a primeira linha no perímetro; nunca lida em voz alta).
4. **Silêncio:** depois da rampa — aves, uma porta que se fecha ao longe, passos; a calma "intencional e carregada de expectativa" (PR #44).
5. **Tarefa que não é matar:** organizar; reconhecer sem disparar; verificar uma posição abandonada; dar passagem a moradores; abrir uma rota de suprimento; patrulhar uma ameaça pontual sem a transformar em batalha; estabelecer perímetro, ligação e observação.
6. **Custo humano:** a porta da casa de telha abre-se devagar (causa: a família Nakama escondida desde a madrugada, o avô a tentar sair para dizer onde moram) → Tully aponta a arma à porta e grita ("Sai! Mãos! **Sai!**") / Cole manda baixar ("Baixa. É uma porta. Ninguém dispara sobre uma porta.") → o jogador pode baixar a própria arma e afastar-se dois passos (interação: `m26.player_lowered_weapon`) ou calar-se → Cole decide se ninguém o fizer em 5 s; a família recua, sem gratidão; o avô aponta a casa e a estrada; Marsh: "Ele está tentando dizer onde mora." (002); Brooks: "Dê espaço. Eles também estão procurando saída." (003); `m26.tully_deescalated` se Tully baixa após o jogador/Cole; **se o jogador disparar sobre a porta**: ninguém é atingido (a bala entra na madeira: evento fixo), a família foge pelo lado, `m26.player_fired_at_door`, Cole deixa de falar com Brooks até ao perímetro, a fala 003 é omitida, o debrief regista "uma família não passou pela nossa linha"; nunca termina a missão nem dá nada. A família fica com medo em qualquer ramo.
7. **Pessoas históricas:** del Valle e Buckner fora de cena.
8. **Debrief:** regista L-Day com pouca oposição, Yontan tomado no dia, as famílias que passaram pela linha para o ponto de recolha, a ameaça pontual como dramatização declarada, e avisa "a mudança de caráter da resistência nas semanas seguintes" (a linha de Shuri a sul; M29); Ruiz presente/ausente por M08.

**Três motivos.** (a) *Ler o lugar* — terraço, estrada, cultivo, casa habitada: a leitura substitui o tiroteio (PR #44); (b) *a porta* — "A praia está quieta. Isso não torna a ilha segura." (001): a ameaça é o que não se vê, e o que não se vê inclui pessoas; (c) *espaço* — "Dê espaço." (003): a atitude dos soldados é a comunicação.

**Temas.** Experiência sem discurso (Brooks interrompe antes de disparar); civis no meio sem gratidão; a calma como expectativa; o desgaste de três anos preparado para M29; a frota que não garante o sul.

**Estrutura (§54).** CONTEXTO (cartela: Peleliu fora de cena; os quatro reconhecíveis) → INTRO (LVT sobre o recife; a frota; a rampa: nada) → APROXIMAÇÃO (organizar na praia; ondas a chegar; o muro) → DIÁLOGO (Cole: "A praia está quieta…") → PRIMEIRO CONTATO (reconhecer a estrada e a aldeia sem disparar: Brooks interrompe Tully diante de uma sombra) → ESCALADA (a posição abandonada; a porta; a família) → COMBATE PRINCIPAL (a rota de suprimento: LVT atolado no terraço, muro aberto, caminho marcado) → SET-PIECE (a ameaça pontual: um atirador nos túmulos — dramatização declarada) → PAUSA (famílias que passam; o Marine do Governo Militar) → CLÍMAX (perímetro, ligação, observação para o avanço seguinte) → CONSEQUÊNCIA (a família junto da casa; a carta; o sul) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Brooks | ajusta o cinto sem olhar; olha para a frota | Cole; Tully | a sombra; a porta | não dispara sobre sombras nem sobre portas; perdeu a confiança de responder pelo sul | no perímetro; não responde a Marsh |
| Cole | "A praia está quieta. Isso não torna a ilha segura." (001) | esquadra | a porta | — (cabelo grisalho; mais lento) | vivo |
| Marsh | dobra o papel em branco; "Ele está tentando dizer onde mora." (002) | Brooks | — | começa a carta; menos humor | `m26.marsh_letter_started` |
| Gray | monta o posto; trabalha sempre | feridos (poucos hoje); civis (uma criança com febre) | — | olheiras | vivo |
| Ruiz / Prado | cabo (se unhurt) / substituto | Brooks | — | — | vivo |
| Tully | 18; quer o primeiro tiro | Cole | a porta | baixa a arma; não se converte | `m26.tully_deescalated` |
| Jessup | BAR | — | — | — | vivo |
| família Nakama | porta fechada | ninguém | passar pela linha | — | ficam junto da casa danificada; depois ao ponto de recolha (fora de cena) |

**O que a missão recusa.** Tarawa/Omaha em Okinawa; carnificina de praia; a Linha de Shuri a 1/4; civis que agradecem; civis caricaturados; "bandidos" em cada túmulo; um "boss"; tiroteio obrigatório; Cole ferido (é M29); spoilers de M29.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "A frota" (`cs_m26_intro`, ≤ 80 s)
2 08:15 · 3 LVT-4 a cruzar o recife; mar liso; a frota a encher o horizonte (couraçados, transportes, LSTs, barcos de foguetes); a praia e o terraço com muro de pedra; pinheiros; colinas verdes ao fundo · 4 manhã luminosa e fresca, sem ondulação (D, S-C22) · 5 Brooks, Cole, Marsh, Gray, Ruiz/Prado, Tully, Jessup; condutor do LVT · 6 Cartela: OKINAWA — PRAIAS DE HAGUSHI — 1 DE ABRIL DE 1945 — 08:15 · 5.º MARINES · 1.ª DIVISÃO DE MARINES. Cartela 2: "Guadalcanal, Cabo Gloucester, Peleliu. Os mesmos quatro." Cartela 3 (`lineVariants`): "Cabo Ruiz, desde Guadalcanal" / "Cabo Prado substitui o lugar de Ruiz desde Peleliu" (se `m08.ruiz_status ≠ unhurt`, sem explicar com ferimento inventado: "transferido"). Brooks ajusta o cinto **sem olhar** (2 s). Tully: "É a maior coisa que já vi." Cole: "É a maior coisa que **eu** já vi, e já vi três." Marsh dobra um papel em branco e guarda-o no capacete. Gray verifica a bolsa sem falar. O bombardeamento naval cessa. O LVT sobe o recife e toca a areia às 08:30: **nada**. Aves. · 7 estabelecer os quatro reconhecíveis por gestos, o reforço, a frota, a calma · 8 olhar · 9 — · 10 — · 11 nenhum · 12 a frota; o papel em branco; o cinto · 13 `dlg_m26_010–015` · 14 **mar → LVT → rampa → aves** (AUDIO) · 15 plano geral da frota (a escala é o plano); o cinto; o papel · 16 `missionStart` · 17 rampa traseira · 18 — · 19 [C] LVT-4 (M24); variante de cartela por `m08.ruiz_status` · 20 lê `m08.*`

### Cena 2 — "Organizar" (jogável; `obj_m26_organize`)
2 08:30–09:30 · 3 praia estreita; muro de pedra do terraço (1,5 m) com brechas; LVTs a subir e a parar; equipamento a chegar; ondas seguintes · 4 sol; luz limpa · 5 esquadra; ondas seguintes (proxies, dezenas); equipas de descarga; um LVT que não sobe o muro · 6 Desembarcar e organizar o grupo: contar (Cole), passar o muro por uma brecha (interação curta), reunir no terraço, registar as ondas (Marsh conta LVTs em voz alta; a contagem fica no debrief), ajudar a empurrar? **não** — veículos têm tripulações; o jogador marca a brecha para os de trás (interação); Cole: "A praia está quieta. Isso não torna a ilha segura." (001); nenhum tiro · 7 §79 ponto 1 ("Outras ondas, logística e unidades avançam por seus acessos") · 8 passa o muro; marca a brecha; reúne · 9 brecha perto (rápida; LVTs a passar) vs brecha longe (lenta; vazia) · 10 Cole conta; Marsh conta ondas; Gray monta um posto provisório ao pé do muro (fica; não segue); Tully à espera de um tiro; Jessup com a BAR · 11 nenhum (fogo japonês esparso ao longe: uma peça a sul, ≥ 500 m, por agenda e só som) · 12 muro com brechas, equipamento, panfletos em japonês caídos (do Governo Militar) · 13 `dlg_m26_001` (canónica), `016–021` · 14 LVTs, ondas, ordens de curta distância, aves; **silêncio** entre LVTs · 15 livre · 16 rampa · 17 reunião no terraço (`evt_m26_assembled`) · 18 `cp_m26_a_desembarque`; `m26.waves_logged` · 19 [A]; [C] ondas/LVTs como NPC por agenda · 20 Gray fica no posto (regra: nunca segue o jogador)

### Cena 3 — "Observar, não disparar" (jogável; `obj_m26_recon`)
2 09:30–11:00 (escala acelerada; `readyScale`) · 3 a estrada de terra para leste entre muros de pedra; campos de batata-doce e cana; pinheiros; a primeira linha de túmulos em meia-lua numa encosta; a aldeia a 300 m (telhados de colmo; uma casa de telha vermelha com hinpun) · 4 sol a subir; sombras curtas; verde intenso · 5 esquadra (sem Gray); outra esquadra na estrada paralela (proxies); civis **não** visíveis ainda (portas fechadas; uma porta que se fecha ao longe quando a esquadra aparece); nenhum inimigo em contacto · 6 Reconhecer estrada/povoação no eixo da unidade: "ler o lugar" — o jogador identifica (interações de observação, sem HUD de inimigos): terraço cultivado vs posição (um muro com sacos de areia = posição; um muro liso = campo), estrada principal vs caminho de carro de boi, casa habitada (galinhas, roupa, uma porta fechada **recentemente**) vs casa vazia; Cole manda observar sem disparar contra toda sombra: **uma sombra** move-se atrás de um muro (uma cabra) → Tully ergue a arma → Brooks (o jogador) pode interromper (interação: mão no cano, M19) antes de Cole; se não, Cole: "Confirma antes." (PR #44, repetido de M08); Tully não dispara (a cabra sai); Ruiz/Prado: "Em Guadalcanal era um porco." (só se Ruiz) · 7 §79 ponto 2 ("Cole manda observar sem disparar contra toda sombra"; PR #44: "Brooks interrompe um companheiro antes de disparar contra uma sombra, mostrando experiência sem discurso") · 8 observa (3 leituras); interrompe Tully (opcional) · 9 estrada (vista; rápida) vs caminho entre muros (coberto; lento) · 10 Cole lê com Brooks; Marsh anota; Tully impaciente; Jessup cobre · 11 nenhum ativo · 12 muros, cana, túmulos, galinhas, uma porta fechada, uma bicicleta · 13 `dlg_m26_022–030` · 14 aves, cana ao vento, uma porta a fechar-se ao longe, passos em terra · 15 livre · 16 CP-A · 17 relato de reconhecimento a Cole (3 leituras) (`evt_m26_recon`) · 18 `cp_m26_b_reconhecimento`; `m26.recon_reported`; `m26.brooks_stopped_tully` (se interrompeu) · 19 [B] leituras como interações; [A] mão no cano · 20 —

### Cena 4 — "A porta" (jogável; `obj_m26_abandoned_position`, `obj_m26_residents`) — **custo humano**
2 11:00–12:00 · 3 a orla da aldeia: uma posição japonesa abandonada (trincheira curta, uma MG retirada, latas, um capacete, panfletos); a casa de telha vermelha com hinpun e shisa; o pátio; as outras casas de colmo; um túmulo em meia-lua atrás · 4 sol alto; sombra do pátio · 5 esquadra; a família Nakama (avô, mãe, duas crianças: 9 e 5 anos) dentro da casa; nenhum inimigo · 6 Verificar a posição abandonada (interações: olhar a trincheira — retirada há horas; a MG levada; "não há ninguém aqui desde a madrugada"); depois **a porta**: abre-se devagar (o avô). **Tully aponta e grita**; Cole: "Baixa. É uma porta. Ninguém dispara sobre uma porta." → o jogador baixa a própria arma e recua dois passos (interação) / cala-se → Cole decide em 5 s; a família recua para dentro; o avô volta a sair com as mãos abertas e aponta a casa e a estrada, fala em okinawano/japonês (sem tradução; **sem** caricatura — revisão P-C26); Marsh: "Ele está tentando dizer onde mora." (002); Brooks: "Dê espaço. Eles também estão procurando saída." (003); Cole manda Jessup afastar-se da porta e mostra o panfleto do Governo Militar (japonês) ao avô; a mãe sai com as crianças; o avô aponta para sul (a direção de onde vieram os soldados japoneses? ou a direção da casa de parentes? **ambíguo de propósito**: Marsh "Acho que diz que os soldados foram para sul." — Cole: "Acho não é relato."); a família **fica** junto da casa, com medo; não agradece; mais tarde (cena 6) passa pela linha · 7 §79 ponto 3 ("Comunicação simples, distância e atitude dos soldados permitem passagem; não exigir que os civis agradeçam") · 8 verifica a posição; baixa a arma/recua (ou cala-se; ou dispara: custo); mostra distância (afastar-se) · 9 baixar/recuar · calar-se · (disparar: `player_fired_at_door`; ninguém atingido; a família foge pelo lado; Cole silencioso; 003 omitida) · 10 Tully aponta; Cole corta; Marsh interpreta mal e bem; Jessup afasta-se; Ruiz/Prado observa · 11 nenhum · 12 trincheira vazia, latas, capacete, panfletos; a porta; o shisa · 13 `dlg_m26_002–003` (canónicas), `031–043` · 14 **a porta** (madeira a abrir devagar), a voz do avô, as crianças; **silêncio** antes de Tully gritar (2 s) · 15 livre; beat fixo na porta (3 s) antes de abrir · 16 CP-B · 17 família junto da casa; a esquadra afasta-se (`evt_m26_family_contact`) · 18 `cp_m26_c_passagem_moradores`; `m26.tully_deescalated`; `m26.player_lowered_weapon`; `m26.player_fired_at_door` · 19 [C] civis como atores com estados (escondidos → porta → pátio → junto da casa → passam pela linha), nunca alvo da IA aliada; fallback encenado (cutscene) · 20 Tully reage a Cole em M29 conforme `m26.tully_deescalated`

### Cena 5 — "Rota de suprimento" (jogável; `obj_m26_supply_route`)
2 12:00–13:30 (escala acelerada) · 3 da aldeia de volta ao terraço: um LVT atolado numa brecha do muro, um caminho de carro de boi entre muros estreitos, um troço de estrada cortado por um fosso de drenagem · 4 sol; calor moderado · 5 esquadra; equipas de descarga e um jipe com reboque (NPC); tripulação do LVT atolado; a outra esquadra · 6 Apoiar a abertura de uma rota para suprimento "decorrente de logística observável" (PR #44): o LVT atolado bloqueia a brecha → abrir uma segunda brecha no muro (interação a dois: Brooks + Jessup, 40 s, com Cole a vigiar), marcar o caminho de carro de boi com fita para os jipes, pôr pranchas sobre o fosso (interação a dois); o primeiro jipe passa; o Marine do Governo Militar chega com panfletos e um ponto de recolha de civis marcado no mapa ("as famílias vão para trás pela estrada marcada; vocês mandam-nas, não as empurram") · 7 §79 ponto 4 (primeira metade) · 8 abre a brecha a dois; marca; põe pranchas; cobre o jipe (sem tiros) · 9 brecha nova (trabalho; 40 s) vs esperar que o LVT saia (10 min de relógio; a esquadra espera; sem custo além do tempo) · 10 Jessup trabalha; Cole vigia; Marsh anota o jipe; Tully quer "fazer alguma coisa" · 11 nenhum (fogo esparso a sul, só som) · 12 LVT atolado, pedras do muro, fita, pranchas, o jipe · 13 `dlg_m26_044–049` · 14 pedras, pranchas, o jipe, o LVT a rodar · 15 livre · 16 CP-C · 17 jipe passou (`evt_m26_jeep_through`) · 18 `m26.supply_route_open` · 19 [A] obstáculo a dois (M01); [C] veículos NPC · 20 —

### Cena 6 — "Famílias que passam; a ameaça pontual" (jogável; `obj_m26_families`, `obj_m26_threat`) — **dramatização declarada**
2 13:30–15:30 (escala acelerada) · 3 a estrada marcada para a retaguarda; a linha da esquadra junto da aldeia; a encosta de túmulos a 150 m · 4 sol a descer para oeste · 5 esquadra; famílias que passam pela linha para o ponto de recolha (3 grupos: a família Nakama entre eles, por agenda, se não fugiu; outras famílias com trouxas; um homem idoso com uma carroça); o Marine do Governo Militar; **a ameaça pontual**: um soldado japonês isolado (retardatário de uma unidade de construção/guarnição que retirou de madrugada) numa abertura de túmulo, que dispara duas vezes a 150 m (dados; ninguém atingido: primeira bala no muro, segunda numa trouxa) e se retira pelo lado; cartela pequena no canto no início da fase: "DRAMATIZAÇÃO: contacto pontual plausível, não documentado para esta praia" (regra §79) · 6 Dar passagem às famílias (Cole: distância, armas baixas, apontar a estrada; Tully à retaguarda; o jogador conta quem passa — Marsh regista: `m26.families_passed`); durante a passagem, os dois tiros: a esquadra abriga as famílias atrás do muro (interação: "para trás do muro", gesto), Jessup cobre a abertura do túmulo com a BAR **sem disparar** sobre os túmulos ("há gente nos túmulos; civis escondem-se neles" — Cole), Brooks e Ruiz/Prado contornam pelo muro (30 m) e encontram a abertura vazia (o soldado retirou: capacete e cartuchos; `m26.threat_resolved = withdrew`); se o jogador disparar sobre os túmulos antes de confirmar: Cole corta ("Túmulos **não**. Há gente lá dentro."), ninguém é atingido (fixo), `m26.fired_at_tombs` (debrief) · 7 §79 ponto 4 (segunda metade): "patrulhar uma ameaça pontual historicamente plausível, explicitamente marcada como dramatização" · 8 aponta a estrada; conta; abriga as famílias; contorna; verifica (sem disparar) · 9 contornar pelo muro (coberto) vs pelo campo (vista; exposto aos dois tiros) · 10 Cole dirige as famílias; Marsh regista; Jessup cobre sem disparar; Tully à retaguarda; o Marine do GM · 11 um atirador (dados; 2 tiros; retira) · 12 trouxas, a carroça, a abertura do túmulo com capacete e cartuchos · 13 `dlg_m26_050–059` · 14 passos de famílias, a carroça, **dois tiros**, o eco nos túmulos, silêncio · 15 livre; a cartela de dramatização no canto (3 s) · 16 jipe passou · 17 famílias passaram + abertura verificada (`evt_m26_threat_resolved`) · 18 `m26.families_passed`; `m26.threat_resolved`; `m26.fired_at_tombs` · 19 [C] civis em trânsito por agenda; [A] fogo como dados; [B] "para trás do muro" · 20 a família Nakama passa aqui se não fugiu (cena 4); senão, o debrief regista

### Cena 7 — "Perímetro" (jogável; clímax de preparação; `obj_m26_perimeter`)
2 15:30–17:00 · 3 o cruzamento a leste da aldeia com vista para o interior: colinas, uma estrada que desce para sul, Yontan ao longe a norte (aviões americanos já a pousar? **não** a 1/4 — só a tomada; aviões a 2/4+); a outra esquadra à direita; o posto de Gray trazido para a aldeia · 4 fim de tarde; luz dourada · 5 esquadra; Gray monta o posto na casa de colmo vazia (trata uma criança com febre de outra família: "Sente-a aqui." — o gesto de M08); a outra esquadra; relatos do sul pela rádio da companhia (voz); nenhum inimigo em contacto · 6 Estabelecer perímetro, ligação e observação para o avanço seguinte: posicionar Jessup e Tully (interação, M11), ligar com a esquadra da direita (Ruiz/Prado a pé), montar um posto de observação (Brooks e Cole: binóculos sem HUD; relatar o que se vê — estrada para sul com movimento civil, nenhuma posição; fumo ao longe), cavar (Marsh e Tully), ouvir os relatos do sul ("a 6.ª Marine a norte sem oposição; o Exército a sul idem; Yontan tomado"); **nenhum ataque** — a pressão cresce só em relatos · 7 §79 ponto 5 ("A primeira praia não recebe artificialmente toda a resistência da linha de Shuri") · 8 posiciona; liga; observa; relata; cava (interação curta) · 9 posto de observação no cruzamento (vê a estrada; exposto a nada hoje) vs no túmulo (coberto; vista parcial) · 10 Cole; Gray trabalha; Marsh cava e depois escreve; Tully cava; Ruiz/Prado liga · 11 nenhum · 12 buracos, a rádio da companhia, a criança com febre, o papel de Marsh · 13 `dlg_m26_060–066` · 14 relatórios do sul (rádio), pás, aves, a criança · 15 livre · 16 threat resolved · 17 perímetro + ligação + relato (`evt_m26_perimeter`) · 18 `cp_m26_d_perimetro`; `m26.marsh_letter_started = true` · 19 [A] posicionar, observar/relatar · 20 a carta → M29

### Cena 8 — "O sul" (`cs_m26_outro`, ≤ 70 s) + debrief
2 17:00–17:30 · 3 o perímetro ao anoitecer; a casa de telha danificada (o telhado com um buraco de obus naval da madrugada) com a família Nakama ao lado (se não fugiu: ficam junto da casa porque o ponto de recolha fecha à noite; senão: a casa vazia, a porta aberta); a frota ao largo com luzes tapadas; Gray no posto · 4 pôr do sol sobre o mar; o interior a escurecer · 5 Brooks, Cole, Marsh, Gray, Ruiz/Prado, Tully, Jessup; a família (variante) · 6 A família permanece perto da casa danificada enquanto o grupo segue para as posições. Marsh, com o papel no joelho, escreve a primeira linha (plano na dobra, 2 s; o texto nunca se lê). Marsh: "E o sul? Dizem que é lá que eles estão todos." Brooks olha para a frota, depois para a estrada que desce. Não responde. Cole: "Posições. Amanhã é outro dia e outro mapa." Tully olha para a família; a criança mais velha olha para ele; ninguém acena. Cartela: L-Day terminou com 60 000 homens em terra e pouca oposição; Yontan e Kadena tomados no dia; nas semanas seguintes a resistência mudou de caráter a sul (a linha de Shuri; M29). Cartela 2 (`lineVariants`): "A família passou pela nossa linha ao fim da tarde." / "Uma família não passou pela nossa linha." (se `player_fired_at_door`). · 7 §79 final ("Brooks não responde com confiança que já perdeu") · 8 skip · 9 — · 10 — · 11 — · 12 a dobra da carta; a frota com luzes tapadas; o telhado furado · 13 `dlg_m26_067–070` · 14 **silêncio obrigatório** depois da pergunta de Marsh (aves da noite, o mar ao longe) · 15 plano fixo na dobra; Brooks de perfil para a frota; a família ao fundo sem acenar · 16 `evt_m26_perimeter` · 17 `missionEnd` · 18 `m26.completed`; `m26.families_passed`; `m26.marsh_letter_started` · 19 [A] cutscene com variantes · 20 "a dobra" → M27 (a mesma dobra numa ordem de ataque em russo)

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m26_organize` | Passe o muro, marque a brecha e reúna no terraço | sim | rampa | `evt_m26_assembled` | — | `waves_logged` | A |
| `obj_m26_recon` | Leia a estrada e a aldeia: três leituras; não dispare sobre sombras | sim | A | relato | — | `recon_reported`; `brooks_stopped_tully` | B |
| `obj_m26_abandoned_position` | Verifique a posição abandonada | sim | B | 3 interações | — | — | — |
| `obj_m26_residents` | A porta: baixe a arma; dê espaço | sim (cena) | porta | família junto da casa | — | `tully_deescalated`; `player_lowered_weapon`; `player_fired_at_door` | C |
| `obj_m26_supply_route` | Abra a rota para o jipe: brecha, fita, pranchas | sim | C | jipe passou | — | `supply_route_open` | — |
| `obj_m26_families` | Dê passagem às famílias para o ponto de recolha | sim | jipe | 3 grupos | — | `families_passed` | — |
| `obj_m26_threat` | Verifique a abertura do túmulo sem disparar sobre os túmulos | sim | 2 tiros | abertura verificada | — | `threat_resolved`; `fired_at_tombs` | — |
| `obj_m26_perimeter` | Posicione, ligue, observe e relate | sim | threat | `evt_m26_perimeter` | — | `marsh_letter_started` | D |

### 3.2 Setores
`s1_beach_wall` (perto) · `s2_road_fields` (perto) · `s3_village` (perto: posição abandonada, casa de telha, pátio) · `s4_supply_path` (perto) · `s5_tombs` (perto/médio: 150 m) · `s6_crossroads` (perto) · `s7_mid` (médio: companhias e veículos a reorganizar; a outra esquadra; o ponto de recolha) · `s8_far` (longe: frota, aeronaves, alarmes ao largo, uma peça japonesa a sul só por som). Agendas: ondas a cada 4 min; LVT atolado 12:05; jipe 13:10; famílias 13:40/14:20/15:00 (Nakama às 14:20 se não fugiu); dois tiros 14:25; relatos do sul 15:45/16:20.

### 3.3 Checkpoints
A desembarque (ondas registadas) · B reconhecimento (três leituras) · C passagem de moradores (estado da família; Tully) · D perímetro. Salvam ondas (quantas passaram), civis (estado de cada família) e companheiros (Ruiz/Prado; Tully).

### 3.4 Justiça
Nenhum inimigo invisível: os dois tiros são o único fogo direto do dia e não atingem ninguém (fixo); disparar sobre a porta ou sobre os túmulos nunca mata civis (fixo) mas tem custo registado; civis nunca são alvo da IA aliada; a cabra é uma cabra; o LVT atolado nunca precisa do jogador; a calma não é falta de conteúdo: cada fase tem tarefa.

---

## 4. Set pieces

### SP-26-1 "A rampa: nada"
Contexto: o recife. Preparação: os quatro reconhecíveis; a frota como plano. Experiência: a rampa desce e não acontece nada; aves; o muro; marcar a brecha; contar ondas. Companheiros: Cole conta; Marsh conta LVTs; Gray monta o posto e fica. Ambiente: panfletos caídos. Evolução: ondas chegam sem o jogador. Clímax: fala 001. Consequências: CP-A. Requisitos: [C] LVT (M24), ondas NPC. Integração: `obj_m26_organize`.

### SP-26-2 "A porta"
Contexto: a aldeia. Preparação: a posição abandonada; Tully à espera do primeiro tiro desde a praia; a cabra. Experiência: a porta que se abre devagar; Tully grita; Cole corta; baixar a arma e recuar; o avô que aponta; Marsh interpreta; o panfleto. Companheiros: Cole; Marsh; Jessup afasta-se. Ambiente: shisa, hinpun. Evolução: a família recua, sai, fica. Clímax: falas 002 e 003. Consequências: `tully_deescalated`, CP-C. Requisitos: [C] civis com estados; fallback encenado. Integração: `obj_m26_residents`.

### SP-26-3 "Dois tiros nos túmulos"
Contexto: a estrada marcada com famílias a passar. Preparação: cartela de dramatização. Experiência: abrigar famílias atrás do muro; Jessup cobre sem disparar; contornar; a abertura vazia. Companheiros: Cole "Túmulos não"; Ruiz/Prado contorna com Brooks. Ambiente: trouxas; capacete e cartuchos. Evolução: o retardatário retira. Clímax: a abertura vazia. Consequências: `threat_resolved`. Requisitos: [A]. Integração: `obj_m26_threat`, `obj_m26_families`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| recife/praia | frota, muro com brechas, panfletos | ondas; descarga | nada | — | Gray fica | brecha marcada |
| estrada/campos | muros, cana, batata-doce, túmulos, galinhas, bicicleta, porta fechada | ler o lugar | a cabra | — | — | relato |
| aldeia | trincheira vazia, latas, capacete, hinpun, shisa | verificar | a porta | — | família Nakama | família junto da casa |
| caminho de suprimento | LVT atolado, pedras, fosso | brecha; pranchas | — | — | Marine do GM | jipe passou |
| estrada marcada | trouxas, carroça, fita | famílias | dois tiros | 2 tiros | famílias | abertura vazia |
| cruzamento | buracos, rádio, a casa de colmo como posto | perímetro | relatos do sul | — | criança com febre; Gray | a carta começada |
| anoitecer | telhado furado, frota com luzes tapadas | — | — | — | família ao lado | — |

Objetos com origem: o papel de Marsh (bloco de Pavuvu, janeiro de 1945), os panfletos (Governo Militar, impressos em Saipan), o capacete na trincheira (unidade de construção japonesa que retirou à madrugada), o telhado furado (obus naval de 05:40), a bicicleta (do avô Nakama), o shisa (a casa de telha é a do antigo chefe da aldeia — ficção).

---

## 6. Diálogos (VO inglês; okinawano/japonês para a família, **sem tradução e com revisão cultural obrigatória** — P-C26)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Cole | "A praia está quieta. Isso não torna a ilha segura." (§79) | reunião | 1 | — |
| 002 | Marsh | "Ele está tentando dizer onde mora." (§79) | avô aponta | 1 | — |
| 003 | Brooks | "Dê espaço. Eles também estão procurando saída." (§79; **omitida** se `player_fired_at_door`) | 002 | 1 | — |
| 010 | Tully | "É a maior coisa que já vi." (V1) | intro t 10 | 3 | — |
| 011 | Cole | "É a maior coisa que **eu** já vi, e já vi três." (V1) | 010 | 2 | — |
| 012 | Marsh | (dobra o papel; sem fala) | intro t 25 | — | — |
| 013 | Ruiz / Prado | "Guadalcanal também começou calado." / "Dizem que Guadalcanal começou calado." (V1 variantes) | intro t 35 | 2 | — |
| 014 | Gray | "Água antes da sede. Sempre." (V1; o mesmo de M08, mais cansado) | intro t 45 | 3 | — |
| 015 | condutor do LVT | "Recife passado. Rampa atrás." (V1) | 08:30 | 1 | — |
| 016 | Cole | "Contem-se. Muro pela brecha. Brooks, marca-a para os de trás." (V1) | praia | 1 | — |
| 017 | Marsh | "Terceira onda. Quarta. Ninguém dispara." (V1) | ondas | 3 | 60 |
| 018 | Tully | "Quando é que começa?" (V1) | — | 3 | — |
| 019 | Brooks | "Já começou. É isto." (V1) | 018 | 2 | — |
| 020 | Gray | "Posto aqui, ao pé do muro. Quem precisar, sabe onde." (V1) | terraço | 2 | — |
| 021 | Cole | (001) | reunião | 1 | — |
| 022 | Cole | "Estrada para leste. Ler antes de andar: o que é campo, o que é posição, o que é casa com gente." (V1) | recon | 1 | — |
| 023 | Brooks | "Muro com sacos: posição. Muro liso: campo." (V1; leitura 1) | interação | 1 | — |
| 024 | Brooks | "Galinhas e roupa. Casa com gente. A porta fechou agora." (V1; leitura 2) | interação | 1 | — |
| 025 | Brooks | "Caminho de carro de boi. Estreito. Não passa jipe." (V1; leitura 3) | interação | 1 | — |
| 026 | Tully | "Ali! Atrás do muro!" (V1) | sombra | 0 | — |
| 027 | Brooks | (mão no cano; sem fala) | se interrompe | — | — |
| 028 | Cole | "Confirma antes." (PR #44; se o jogador não interrompe) | +1 s | 0 | — |
| 029 | Ruiz | "Uma cabra. Em Guadalcanal era um porco." (V1; só se Ruiz) | cabra | 3 | — |
| 030 | Marsh | "Anotado: três leituras e uma cabra." (V1) | relato | 3 | — |
| 031 | Cole | "Posição deles. Vazia desde a madrugada. Levaram a MG." (V1) | trincheira | 1 | — |
| 032 | Jessup | "Capacete. Latas. Saíram com pressa e com ordem." (V1) | — | 2 | — |
| 033 | — | (a porta abre devagar; 2 s) | porta | — | — |
| 034 | Tully | "Sai! Mãos! **Sai!**" (V1) | porta | 0 | — |
| 035 | Cole | "Baixa. É uma porta. Ninguém dispara sobre uma porta." (V1) | 034 | 0 | — |
| 036 | Brooks | (baixa a arma; recua dois passos; sem fala) | interação | — | — |
| 037 | Cole | "Tully. **Baixa.**" (V1; se ninguém em 5 s) | — | 0 | — |
| 038 | avô Nakama (okinawano/japonês) | — (mãos abertas; aponta a casa e a estrada; sem tradução) | — | 1 | — |
| 039 | Marsh | (002) | 038 | 1 | — |
| 040 | Brooks | (003) | 039 | 1 | — |
| 041 | Cole | "Jessup, afasta-te da porta. Panfleto. Devagar." (V1) | — | 1 | — |
| 042 | Marsh | "Acho que diz que os soldados foram para sul." / Cole: "Acho não é relato." (V1) | — | 2 | — |
| 043 | Cole | (se o jogador disparou) "…" (silêncio de Cole até ao perímetro) | fired | — | — |
| 044 | Cole | "LVT atolado na brecha. Segunda brecha. Brooks, Jessup." (V1) | 12:05 | 1 | — |
| 045 | Jessup | "Pedra a pedra. Não é a primeira parede que desmonto." (V1) | brecha | 2 | — |
| 046 | Marsh | "Fita no caminho dos bois. Os jipes não leem muros." (V1) | fita | 2 | — |
| 047 | Marine do GM | "Famílias para trás pela estrada marcada. Vocês mandam-nas, não as empurram. Ponto de recolha a um quilómetro." (V1) | GM | 1 | — |
| 048 | Tully | "Posso fazer alguma coisa?" / Cole: "Estás a fazer. Estás quieto." (V1) | — | 3 | — |
| 049 | condutor do jipe | "Passa? Passa." (V1) | jipe | 2 | — |
| 050 | Cole | "Famílias. Armas baixas. Distância. Apontem a estrada, não as pessoas." (V1) | 13:40 | 1 | — |
| 051 | Marsh | "Primeira família. Cinco. Segunda: três e uma carroça." (V1) | contagem | 2 | — |
| 052 | — | (dois tiros; o eco nos túmulos) | 14:25 | — | — |
| 053 | Cole | "Para trás do muro! As famílias primeiro!" (V1) | 052 | 0 | — |
| 054 | Jessup | "Abertura no túmulo do meio. Cubro. Não disparo." (V1) | — | 1 | — |
| 055 | Cole | "Túmulos **não**. Há gente lá dentro. Brooks, Ruiz: pelo muro, à volta." (V1) | — | 0 | — |
| 056 | Cole | "Brooks! Túmulos não!" (V1; se dispara) | fired | 0 | — |
| 057 | Ruiz / Prado | "Vazia. Capacete e cartuchos. Foi-se pelo lado." (V1) | abertura | 1 | — |
| 058 | Cole | "Um homem. Dois tiros. Não é a ilha. Continuem a passar as famílias." (V1) | 057 | 1 | — |
| 059 | Tully | "Era só um?" / Brooks: "Hoje, sim." (V1; eco de M08) | — | 2 | — |
| 060 | Cole | "Perímetro no cruzamento. Jessup à esquerda, Tully à direita. Ruiz, ligação com a direita, a pé." (V1) | 15:30 | 1 | — |
| 061 | Gray | "Sente-a aqui." (V1; a criança com febre; o gesto de M08) | posto | 2 | — |
| 062 | Cole | "Observação. Binóculos. Diz-me o que vês, não o que achas." (V1) | OP | 1 | — |
| 063 | Brooks | "Estrada para sul com gente a pé. Nenhuma posição. Fumo a dez quilómetros." (V1; relato) | relato | 1 | — |
| 064 | rádio da companhia (voz) | "6.ª Marine a norte sem oposição. Exército a sul idem. Yontan é nosso." (V1) | 15:45 | 1 | — |
| 065 | Marsh | "Sem oposição. Toda a gente sem oposição. Então onde é que eles estão?" (V1) | 064 | 2 | — |
| 066 | Cole | "Onde a gente ainda não foi." (V1) | 065 | 1 | — |
| 067 | Marsh | (escreve a primeira linha; sem fala) | outro | — | — |
| 068 | Marsh | "E o sul? Dizem que é lá que eles estão todos." (V1) | outro | 1 | — |
| 069 | Brooks | (não responde) | 068 | — | — |
| 070 | Cole | "Posições. Amanhã é outro dia e outro mapa." (V1) | +4 s | 1 | — |

Callouts: `co_m26_two_shots`, `co_m26_families_back`, `co_m26_reports_south`. Silêncios: depois da rampa; a porta antes de abrir (2 s); depois da pergunta de Marsh.

---

## 7. Arte e atmosfera

**Paleta:** verde intenso de cana e batata-doce, cinzento claro de muros de pedra calcária e de túmulos, vermelho de telha, palha de colmo, azul claro do mar liso, cinzento-azulado da frota, verde-musgo de P44 Marines, branco dos panfletos. **Luz:** 08:15 manhã luminosa (zénite `#6fa0d6`, horizonte `#e3ecf2`, sol a leste), sombras curtas ao meio-dia, luz dourada às 16:00, pôr do sol sobre o mar às 17:30. **Materiais:** calcário, colmo, telha, madeira de porta, cana, terra vermelha, água lisa, aço de LVT. **Silhuetas:** a frota (escala), o muro do terraço com brechas, pinheiros, túmulos em meia-lua, a casa de telha com hinpun e shisa, a carroça. **Destruição:** mínima (o telhado furado; a trincheira). **Humanos:** Brooks/Cole/Marsh/Gray reconhecíveis de M08 por rosto e gesto, envelhecidos (Cole grisalho; Marsh sem o sorriso de 1942; Gray com olheiras); Tully novo; a família Nakama com roupa de trabalho (kasuri), o avô de bengala, as crianças descalças — **revisão cultural obrigatória**. **Violência reduzida:** nenhum ferido Marine; nenhum civil atingido.

**Imagem única:** uma porta que se abre e uma família que recua (ART §4, GAMEPLAY_DRAMATIZATION).

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| recife | motor do LVT, água sobre o recife | outros LVTs | frota; bombardeamento a cessar | — |
| praia | rampa, areia, muro | ondas; descarga | uma peça a sul (só som) | **depois da rampa** (aves) |
| estrada | passos em terra, cana, galinhas, **uma porta a fechar-se** | outra esquadra | aviões ao largo | — |
| aldeia | **a porta a abrir**, a voz do avô, as crianças | — | — | **antes de Tully** (2 s) |
| suprimento | pedras, pranchas, jipe, LVT a rodar | descarga | — | — |
| famílias | passos, trouxas, carroça, **dois tiros**, eco nos túmulos | — | — | depois dos tiros |
| perímetro | pás, binóculos, rádio (relatórios do sul), a criança | a outra esquadra | frota com alarmes ao large (kamikaze só por som, ≥ 10 km) | — |
| anoitecer | aves da noite, o mar | — | frota | **obrigatório** |

Sons novos: aldeia okinawana (colmo, hinpun, cana), civis (vozes com barreira real: **gravação com falantes de okinawano/japonês; sem caricatura**), carroça. Música: motivo V "A lama" (movimento V) uma frase na cartela final; nenhuma no dia. VO inglês; okinawano/japonês.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| L-Day 1/4/1945, Páscoa; manhã luminosa, sem ondulação; toque 08:30; sem minas; pouca resistência; 60 000 em terra ao anoitecer | D | H26; S-C22 | — |
| 5.º Marines no extremo sul do setor Marine; praias Blue/Yellow da 1.ª Div. | D (resumo) / **P** | S-C22 (fonte secundária) | **P-C26** |
| Yontan (e Kadena) tomados no dia | D | S-C22 | — |
| Civis okinawanos escondidos em túmulos e casas; Governo Militar com panfletos; pontos de recolha | D (geral) | H26 | **P-C26 (revisão cultural/linguística obrigatória)** |
| A ameaça pontual (retardatário nos túmulos) | **GAMEPLAY_DRAMATIZATION declarada em cartela** | §79 | — |
| Peleliu fora de cena; os quatro sem ferimentos em Peleliu | decisão narrativa | CONTINUITY §3.5 | — |
| Ruiz/Prado por `m08.ruiz_status` | regra | CONTINUITY | — |
| Gray como pharmacist's mate (Marinha) | D | §73 | — |
| Equipamento: P44, M1 Garand/carbine, BAR, LVT-4, jipe | D | TIMELINE §3 | auditoria |

**Proibições:** carnificina de praia; Linha de Shuri a 1/4; civis caricaturados ou gratos por obrigação; disparo sobre civis com morte (nunca); Cole ferido; spoilers de M29; del Valle/Buckner em cena; kamikazes em cena (só som ao largo). **Fora de cena:** del Valle; Buckner; intérpretes Nisei.

---

## 10. Handoff técnico

**Contrato:** `id m26_hagushi`, `order 26`, relógio 08:15→17:30 com `readyScale` em três fases, `cast` condicional (`ruiz_or_prado`), grupos (`grp_squad`, `grp_other_squad`, `grp_waves`, `grp_unloading`, `grp_lvt_stuck`, `grp_jeep`, `grp_mg_marine`, `grp_family_nakama`, `grp_families_a/b`, `grp_jp_straggler`, `grp_aid_post`), setores s1–s8, checkpoints A–D, cutscenes (intro, outro com variantes), falas, flags, debrief com cartela de dramatização.

**Flags:** `m26.completed`, `m26.waves_logged`, `m26.recon_reported`, `m26.brooks_stopped_tully`, `m26.tully_deescalated`, `m26.player_lowered_weapon`, `m26.player_fired_at_door`, `m26.supply_route_open`, `m26.families_passed` (0–3), `m26.threat_resolved = withdrew` (fixo), `m26.fired_at_tombs`, `m26.marsh_letter_started` (fixo true), `m26.ruiz_present` (derivada de `m08.ruiz_status`).

**Sistemas:** [C] civis como atores não-combatentes com estados (escondidos → porta → pátio → junto da casa → em trânsito → passaram), nunca alvo da IA aliada, com "fuga pelo lado" se o jogador dispara (sem dano); LVT-4 e ondas/veículos NPC (M24); [A] fogo como dados (2 tiros), obstáculo a dois, posicionar, observar/relatar, mão no cano (M19); [B] "leituras" como interações, marcar brecha/fita, "para trás do muro", cavar; [D] leitura de `m08.ruiz_status`, `m08.friendly_fire_avoided` (se false, Cole repete "Confirma antes." com mais peso: texto). **Fallbacks honestos:** sem civis com estados → a cena da porta é cutscene (Cole decide; o jogador só baixa a arma por interação) e as famílias passam por agenda em plano médio.

**Disciplinas:** Level: recife + praia + muro (200 m), estrada com campos e túmulos (400 m), aldeia (6 casas, pátio), caminho de suprimento com fosso, cruzamento com vista; Combate/IA: um retardatário com 2 tiros e retirada; Arte: Okinawa rural (calcário, colmo, telha, cana, túmulos), frota como escala; Personagens: os quatro de M08 envelhecidos (rostos reconhecíveis, nunca modelo byte a byte), Tully, família Nakama com **consultoria cultural**; Animação: cinto sem olhar, dobrar papel, marcar brecha, mão no cano, baixar arma e recuar, mostrar panfleto, pedras a dois, pranchas, apontar a estrada, binóculos, escrever a primeira linha; Som: aldeia, civis, carroça, dois tiros com eco; VO: inglês/okinawano-japonês com falantes nativos; Historiador + consultor cultural: P-C26; QA: nenhum civil atingível; `threat_resolved` sempre `withdrew`; Ruiz e Prado nunca juntos; a fala 003 omitida se `player_fired_at_door`; Gray nunca segue o jogador.

**Testes:** disparar sobre a porta → bala na madeira, família foge, `player_fired_at_door`, Cole mudo até D; disparar sobre túmulos → ninguém atingido, `fired_at_tombs`; `families_passed` conta só grupos que chegam ao fim da estrada marcada; `m08.ruiz_status ≠ unhurt` → Prado presente, Ruiz ausente, fala 029 omitida; Gray permanece no posto após CP-A e muda para a aldeia só por agenda em D.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| A frota; o cinto; o papel dobrado | (intro) | olhar | Cole "já vi três"; Marsh dobra | — | start | variante Ruiz/Prado |
| A rampa: nada | `obj_m26_organize` | passar o muro; marcar; reunir | Cole conta; Marsh conta ondas; Gray fica | brecha marcada | rampa | CP-A |
| Observar, não disparar | `obj_m26_recon` | três leituras; mão no cano | Tully ergue; Cole "Confirma antes." | — | A | CP-B; `brooks_stopped_tully` |
| A posição abandonada; a porta | `obj_m26_abandoned_position` / `residents` | verificar; baixar a arma; recuar | Tully grita; Cole corta; avô aponta; Marsh 002 | família junto da casa | B | CP-C; `tully_deescalated` |
| Rota de suprimento | `obj_m26_supply_route` | brecha a dois; fita; pranchas | LVT atolado; Marine do GM; jipe | muro aberto | C | `supply_route_open` |
| Famílias que passam; dois tiros | `obj_m26_families` / `threat` | apontar a estrada; abrigar; contornar; verificar | Cole "Túmulos não"; Jessup cobre; retardatário retira | abertura vazia | jipe | `families_passed`; `threat_resolved` |
| Perímetro | `obj_m26_perimeter` | posicionar; ligar; observar; relatar; cavar | Gray "Sente-a aqui"; relatos do sul | buracos; a carta | threat | CP-D; `marsh_letter_started` |
| O sul | (outro) | skip | Marsh pergunta; Brooks cala; Cole "outro mapa" | — | perímetro | `m26.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 9 | a calma como tensão; a porta; "onde a gente ainda não foi". |
| 2 | Autenticidade | 8 | S-C22 sólido; praia/companhia/aldeia P-C26; revisão cultural obrigatória antes de qualquer gravação. |
| 3 | Personagens | 9 | os quatro de M08 reconhecíveis por gesto; Tully como espelho do Brooks de 1942. |
| 4 | Diálogos | 9 | "É a maior coisa que **eu** já vi, e já vi três." / "Acho não é relato." / "Onde a gente ainda não foi." |
| 5 | Originalidade | 9 | uma missão de desembarque quase sem tiros; leitura do lugar; civis como centro. |
| 6 | Variedade | 8 | passar muro, marcar, contar, ler, interromper, verificar, baixar/recuar, brecha, fita, pranchas, apontar estrada, abrigar, contornar, posicionar, observar, cavar. |
| 7 | Set pieces | 8 | nenhum tiroteio; o risco é parecer "mapa sem inimigos" — cada fase tem tarefa e som. |
| 8 | Atmosfera | 9 | Páscoa; a frota; cana ao vento. |
| 9 | Environmental storytelling | 9 | porta que fecha, panfletos, trincheira vazia, telhado furado. |
| 10 | Cinematográfica | 8 | a porta em 3 s; a dobra da carta. |
| 11 | Sonora | 9 | aves depois da rampa; dois tiros com eco; civis com barreira real. |
| 12 | Impacto emocional | 8 | a família que não acena. |
| 13 | Ritmo | 8 | 18–25 min; calma intencional com `readyScale`. |
| 14 | Continuidade | 10 | lê `m08.*`; prepara M29 (Tully, a carta, o desgaste) sem spoilers. |
| 15 | Integração técnica | 6 | civis com estados [C] com fallback encenado; o resto [A]/[B]. |

**Correções aplicadas:** (1) a ameaça pontual recebeu cartela explícita de dramatização (regra §79) e nunca atinge ninguém; (2) disparar sobre a porta ou os túmulos nunca mata civis (fixo) mas tem custo registado e omite a fala 003; (3) Ruiz/Prado são exclusivos por `m08.ruiz_status`, com "transferido" em vez de ferimento inventado; (4) Gray fica no posto (regra: nunca segue o jogador) e só muda de lugar por agenda; (5) Cole não é ferido nem prenunciado (M29); (6) a família Nakama exige revisão cultural/linguística antes de qualquer gravação ou modelação (P-C26); (7) Prado e Jessup (regresso) são propostas deste dossiê a acrescentar a CONTINUITY §4.
