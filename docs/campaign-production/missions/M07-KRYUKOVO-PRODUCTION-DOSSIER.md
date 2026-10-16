# M07 — INVERNO · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 7–8/12/1941, Kryukovo, arredores de Moscovo; 16.º Exército, Frente Ocidental; POV Mikhail Orlov; fonte H08; 20–27 min; três falas; checkpoints "saída; primeiro acesso; evacuação; mudança de data"; sem medidor de frio punitivo; a captura histórica de Kryukovo **não** atribuída ao dia anterior; final: Orlov senta-se ao lado do evacuado; Saveliev olha as mãos antes de segurar o copo. **Proposto:** 8.ª Divisão de Guardas (Panfilov) com a 1.ª Brigada de Tanques de Guardas como "grupo da estrada" (S-C09, RECONSTRUÇÃO; P-C07), elenco, relógio, flags.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m07_kryukovo` / 7 |
| Datas | 1941-12-07T13:30+03:00 → 1941-12-08T09:30+03:00 (pôr do sol ~15:55; nascer ~08:40 — P-C07) |
| Local | bosque e ravina a leste de Kryukovo → orla da aldeia (isbás, casas de tijolo) → cruzamento junto da estação (`RECONSTRUCTED`; a estação `EXACT` em silhueta) |
| Operação | contra-ofensiva de Moscovo; Kryukovo mudou de mãos várias vezes; libertada 7–8/12 pela 8.ª Div. de Guardas + 1.ª Bde de Tanques de Guardas (D em resumo, S-C09) |
| Unidade | 16.º Exército (canónico) → 8.ª Div. de Guardas (R) → companhia ficcional |
| Elenco | Orlov (POV, serzhant), sgt. Viktor Saveliev, op. rádio Yuri Makarov (§73); krasn. Fyodor "Fedya" Lukin, yefr. Stepan Dorokhov, sanitarka Zinaida "Zina" Belova, ezdovoy (condutor de trenó) Grisha (propostas); um alemão desarmado a tremer |
| Fora de cena | Rokossovsky, Panfilov (†18/11), Katukov |
| Intocável | datas, unidade, POV, falas `dlg_m07_001–003`, checkpoints, a transição de data visível, o final (copo), sem medidor de frio |

---

## 1. Story Bible

**Logline.** Numa isbá onde a roupa molhada solta vapor, um homem tenta dobrar os dedos. A ordem é avançar. Lá fora a neve apaga os rastos e os sons, e Orlov aprende a encontrar quem ficou — feridos que não puderam ser retirados, um recruta que ergue a arma por pânico, um alemão que treme à porta de uma casa — antes de a aldeia ser deles, no dia certo.

**As oito respostas.**
1. **Situação central:** a neve apaga rastos e sons; encontrar quem ficou.
2. **Modo de contar:** rastos novos sobre rastos antigos (o jogador lê pegadas: quem passou, para onde).
3. **Objeto:** o copo de lata de Saveliev (as mãos que não fecham).
4. **Silêncio:** o campo antes do assalto de 8/12.
5. **Tarefa que não é matar:** abrir corredor para o trenó de evacuação; restabelecer o rádio (Makarov).
6. **Custo humano:** um alemão desarmado, a tremer, junto de uma casa danificada (causa: separado da sua unidade em retirada) → Lukin ergue a arma por pânico / Saveliev interpõe-se e manda escoltá-lo se a situação permitir → `m07.pow_escorted`; no fim, Lukin guia o trenó.
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista a libertação de Kryukovo a 8/12, o avanço para oeste, o frio, os feridos evacuados; nenhuma "batalha no centro de Moscovo".

**Três motivos.** (a) *Rastos* — o terreno escreve; (b) *o trenó* — evacuar é abrir caminho, não carregar sozinho; (c) *as mãos* — o frio é atuação, não barra.

**Temas.** Medo que parece ódio (Lukin); disciplina dura e protetora (Saveliev); orientação; o corpo que falha; a captura no dia certo.

**Estrutura (§54).** CONTEXTO → INTRO (isbá, vapor, dedos) → APROXIMAÇÃO (bosque e ravina; rastos) → DIÁLOGO (Saveliev: "Não corra…") → PRIMEIRO CONTATO (orla da aldeia; acesso) → ESCALADA (feridos não retirados) → COMBATE PRINCIPAL (corredor do trenó) → SET-PIECE (a casa e o alemão) → PAUSA (rádio; noite; cartela 8/12) → CLÍMAX (cruzamento; impedir a separação) → CONSEQUÊNCIA (o copo) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Orlov | confirma onde está o grupo antes de acelerar; esfrega o polegar no copo | Saveliev; Lukin | o trenó; a casa; o cruzamento | reconhece a desorientação dos recrutas | senta-se ao lado do evacuado |
| Saveliev | mãos rígidas | Orlov | o alemão; o copo | — | `m07.saveliev_status` |
| Makarov | rádio | Orlov | restabelecer | — | `m07.makarov_status` → M27 |
| Lukin | pânico | Saveliev | a casa | guia o trenó | `m07.lukin_status` |
| Dorokhov | veterano calado | — | ferido no acesso (evento) | — | `m07.dorokhov_status` |
| Belova | trenó | feridos | — | — | viva |

**O que a missão recusa.** Medidor de frio; grelha de árvores; ondas eternas; tomada da aldeia a 7/12; repetir a cena de rendição em toda missão soviética (regra); vento que cega NPCs arbitrariamente.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Vapor" (`cs_m07_intro`, ≤ 75 s)
2 13:30 · 3 isbá a leste de Kryukovo (abrigo da companhia) · 4 luz baixa de dezembro; janela gelada · 5 Orlov, Saveliev, Makarov, Lukin, Dorokhov, Belova; um oficial fora de cena (voz) · 6 Cartela: KRYUKOVO, ARREDORES DE MOSCOVO — 7 DE DEZEMBRO DE 1941 — 13:30 · 8.ª DIVISÃO DE GUARDAS · 16.º EXÉRCITO. Roupa molhada solta vapor junto do forno; Saveliev tenta dobrar os dedos; Orlov recebe a ordem de avançar (voz do oficial pela porta); Makarov confere o rádio. · 7 estabelecer o frio como corpo · 8 olhar; esfregar o polegar no copo (gesto) · 9 — · 10 — · 11 — · 12 forno, roupa, um ícone tapado, o copo · 13 `dlg_m07_001` (Saveliev, canónica: "Não corra até perder os outros na neve."), `010–012` · 14 forno; vento na janela; artilharia ao longe · 15 beat: as mãos de Saveliev (3 s) · 16 `missionStart` · 17 Orlov abre a porta · 18 `cp_m07_a_saida` · 19 skip · 20 —

### Cena 2 — "Rastos" (jogável; `obj_m07_follow`)
2 13:40–14:30 · 3 bosque de bétulas → ravina → borda de campo · 4 sol baixo a sudoeste; sombras azuis; vento que levanta neve · 5 grupo; outra formação a oeste (proxies) · 6 Seguir o grupo por relevo e edificações: neve compactada (rápida), neve funda (lenta), lama gelada (ruidosa), ravina (cobertura). Ler rastos: pegadas novas dos nossos para oeste; pegadas antigas alemãs para leste; marcas de trenó. O vento apaga rastos visualmente sem alterar a perceção dos NPCs · 7 §79 ponto 1 · 8 navega por rastos; escolhe caminho tático · 9 ravina (cobertura, lenta) vs campo (rápido, exposto) · 10 Saveliev corrige; Lukin fica para trás (Orlov chama) · 11 atirador na borda (dados) · 12 neve com pegadas; um cavalo morto; trenó tombado · 13 `dlg_m07_013–017` · 14 neve a comprimir; respiração; vento · 15 livre · 16 CP-A · 17 orla da aldeia · 18 — · 19 [C] neve (velocidade por profundidade; rastos como decals dinâmicos) · 20 —

### Cena 3 — "O acesso" (jogável; `obj_m07_attack_access`)
2 14:30–15:20 · 3 orla de Kryukovo: uma rua de isbás e uma casa de tijolo · 4 luz a baixar · 5 grupo; formação da estrada (T-34 ao longe, infantaria) · 6 Atacar o acesso com cobertura de outra formação (Makarov: "O grupo da estrada avançou. Podemos cruzar." — 002); avançar por trechos e pausas; Dorokhov ferido ao cruzar a rua (evento fixo) · 7 §79 ponto 2 · 8 lances de cobertura; dispara (60–200 m); cruza a rua quando a formação da estrada atrai o fogo · 9 cruzar agora (exposição) vs esperar a cobertura (tempo; a luz baixa) · 10 formação da estrada avança por si; Lukin dispara demais · 11 infantaria alemã nas isbás; MG na casa de tijolo · 12 isbás a arder; neve suja · 13 `dlg_m07_002` (canónica), `018–022` · 14 tiros entre casas; T-34 ao longe · 15 livre · 16 orla · 17 casa de tijolo tomada | 18 `cp_m07_b_primeiro_acesso`; `m07.dorokhov_status` | 19 [A] | 20 —

### Cena 4 — "Os que ficaram" (jogável; `obj_m07_sled_corridor`)
2 15:20–16:00 · 3 zona exposta entre a casa de tijulo e um celeiro; 120 m até à ravina · 4 crepúsculo · 5 grupo; Belova e Grisha com o trenó; 2 feridos do ataque da manhã (não retirados) + Dorokhov · 6 Encontrar feridos que não puderam ser retirados (um deles já morto, coberto); abrir passagem para carregadores e trenó: suprimir a MG do celeiro, cobrir o percurso do trenó (que só passa se o fogo a < 3 m parar — regra de M01); Orlov: "Há lugar no trenó. Vamos levá-lo." (003) · 7 §79 ponto 3 · 8 suprime; cobre o trenó; pode carregar Dorokhov até ao trenó · 9 — · 10 Belova trata; Grisha conduz; Lukin cobre mal · 11 MG; atiradores · 12 trenó na neve; marcas · 13 `dlg_m07_003` (canónica), `023–027` · 14 trenó; cavalo; MG · 15 livre · 16 CP-B · 17 trenó na ravina (`evt_m07_sled_safe`) · 18 `cp_m07_c_evacuacao`; `m07.sled_evacuated` · 19 [A] carriedBy; [C] trenó com cavalo | 20 —

### Cena 5 — "A casa" (`cs_m07_house`, ≤ 35 s; jogável depois)
2 16:00–16:20 · 3 casa danificada na orla · 4 quase noite; fogo de uma isbá · 5 Orlov, Saveliev, Lukin; um alemão desarmado a tremer (DOWN/SURRENDERED) · 6 Lukin encontra um alemão sem arma, a tremer, encostado à parede. Ergue a arma por pânico. Saveliev coloca-se entre eles: "Não apontes só porque tens medo." Ordena escolta à retaguarda se a situação permitir (permite: o acesso está tomado). O homem é levado por Lukin e Saveliev. · 7 momento de custo humano · 8 pode aproximar-se e baixar a arma de Lukin (interação: mão no cano, `m07.player_intervened`) ou deixar Saveliev; se disparar sobre o alemão: `m07.fired_on_pow`, reação única de Saveliev e silêncio do grupo 20 s · 9 intervir / não · 10 Saveliev interpõe-se sempre (fallback encenado) · 11 nenhum · 12 a parede com marcas de estilhaços; o alemão sem luvas · 13 `dlg_m07_028–031` · 14 fogo; respiração dos três · 15 beat: Saveliev entre os dois (2 s) · 16 trenó seguro + chegada à casa · 17 escolta sai · 18 `m07.pow_escorted = true` (salvo disparo) · 19 [C] `SURRENDERED`; fallback encenado · 20 Lukin guia o trenó no fim.

### Cena 6 — "Rádio; noite; 8 de dezembro" (jogável + `cs_m07_date`, ≤ 30 s)
2 16:20 → 08:00 · 3 casa de tijolo (posto) → isbá · 4 noite; depois amanhecer cinzento · 5 grupo; Makarov · 6 Restabelecer comunicação (Makarov: antena, 2 tentativas; o jogador leva o rádio ao ponto alto — tarefa); ordem para a manhã; cartela: 8 DE DEZEMBRO — 08:00; o mesmo lugar com mudanças verificáveis (isbás apagadas, neve nova, trenós a passar, T-34 na rua) · 7 §79 ponto 4: transição de data visível · 8 leva o rádio; skip da cartela · 9 — · 10 Makarov · 11 — · 12 neve nova sobre os rastos · 13 `dlg_m07_032–034` · 14 estática; silêncio noturno · 15 fade · 16 escolta · 17 cartela · 18 `cp_m07_d_data`; `m07.comms_restored` · 19 [B] data; [B] rádio | 20 —

### Cena 7 — "O cruzamento" (jogável; clímax; `obj_m07_crossroads`)
2 08:00–09:10 · 3 cruzamento junto da estação · 4 manhã; **silêncio obrigatório** no campo antes do assalto · 5 grupo; formação da estrada · 6 Avançar contra a nova posição (cruzamento) e consolidar; impedir a separação do grupo durante a reação local (contra-ataque curto com um blindado ao longe); terminar no objetivo · 7 §79 ponto 5 · 8 avança por lances; mantém o grupo junto (chamar Lukin: interação de voz); consolida · 9 — · 10 formação da estrada ocupa a estação; T-34 · 11 infantaria; blindado (proxy) · 12 estação com vidros partidos; trilhos · 13 `dlg_m07_035–039` · 14 silêncio → assalto → T-34 · 15 livre; beat: 2 s de silêncio antes do apito · 16 cartela · 17 cruzamento consolidado + reação rechaçada · 18 `m07.crossroads_held` · 19 [A] · 20 —

### Cena 8 — "O copo" (`cs_m07_outro`, ≤ 60 s) + debrief
2 09:10–09:30 · 3 isbá junto do cruzamento · 4 manhã; forno · 5 Orlov; Dorokhov evacuado (na isbá à espera do trenó); Saveliev; Lukin a guiar o trenó lá fora (se `pow_escorted`); Makarov · 6 Orlov senta-se ao lado do homem evacuado. Saveliev olha as mãos antes de conseguir segurar o copo. Frio e perdas permanecem após o sucesso. · 7 consequência canónica · 8 skip · 9 — · 10 — · 11 — · 12 o copo; vapor · 13 `dlg_m07_040` (Saveliev), `041` (Orlov) · 14 forno; trenó lá fora · 15 beat: mãos e copo (4 s) · 16 consolidação · 17 debrief · 18 `m07.completed` · 19 variantes · 20 M27/M28 (Makarov; Saveliev não).

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m07_follow` | Siga o grupo até à orla da aldeia | sim | intro | orla | — | — | A |
| `obj_m07_attack_access` | Ataque o acesso com a cobertura da estrada | sim | orla | casa de tijolo | — | `dorokhov_status` | B |
| `obj_m07_find_wounded` | Encontre os feridos que ficaram | sim | B | 2 encontrados | — | — | — |
| `obj_m07_sled_corridor` | Abra corredor para o trenó | sim | find | `evt_m07_sled_safe` | trenó destruído → restaurar B (aviso) | `sled_evacuated` | C |
| `obj_m07_house` | (cena) | sim | sled_safe | escolta sai | — | `pow_escorted`, `player_intervened` | — |
| `obj_m07_radio` | Leve o rádio ao ponto alto | sim | house | Makarov liga | — | `comms_restored` | — |
| `obj_m07_date` | (cartela 8/12) | sim | radio | cartela | — | — | D |
| `obj_m07_crossroads` | Consolide o cruzamento sem perder o grupo | sim | D | consolidado | grupo separado (Lukin a > 60 m por 30 s) → aviso, não falha | `crossroads_held` | — |

### 3.2 Setores
`s1_woods_ravine` (perto) · `s2_village_edge` (perto) · `s3_road_group` (médio: formação da estrada com T-34, avança por si) · `s4_fields` (médio: companhias cruzando campos; trenós) · `s5_batteries` (longe: baterias e clarões cuja posição muda com o avanço). Agendas: formação da estrada 14:40; MG do celeiro 15:20; noite; assalto 08:20; reação 08:50.

### 3.3 Checkpoints
A saída · B primeiro acesso · C evacuação (trenó seguro; Dorokhov) · D mudança de data (snapshot 8/12: rastos cobertos, isbás apagadas, estação).

### 3.4 Justiça
Neve funda abranda igualmente NPCs; vento apaga rastos só visualmente; o trenó só é alvo real se o jogador não suprimir (regra de 3 m); nunca "congelar" como falha.

---

## 4. Set pieces

### SP-07-1 "Rastos"
Contexto: bosque e ravina. Preparação: Saveliev avisa ("Não corra…"). Experiência: ler pegadas e marcas de trenó; o vento apaga. Companheiros: Lukin fica para trás; Orlov chama. Ambiente: cavalo morto; trenó tombado. Evolução: ravina vs campo. Clímax: a orla. Consequências: —. Requisitos: [C] neve/rastos. Integração: `obj_m07_follow`.

### SP-07-2 "O trenó"
Contexto: zona exposta. Preparação: feridos da manhã não retirados; um já morto. Experiência: suprimir a MG, cobrir 120 m de trenó. Companheiros: Belova, Grisha; Lukin cobre mal. Ambiente: celeiro, neve suja. Evolução: o trenó só passa sem fogo a < 3 m. Clímax: ravina. Consequências: `sled_evacuated`. Requisitos: [C] trenó com cavalo; [A] regra de supressão. Integração: `obj_m07_sled_corridor`.

### SP-07-3 "A casa"
Contexto: orla ao anoitecer. Preparação: Lukin disparou demais no acesso. Experiência: o alemão a tremer; a arma erguida; Saveliev no meio. Companheiros: Saveliev sempre; o jogador pode baixar o cano. Ambiente: parede com estilhaços. Evolução: escolta. Clímax: "Não apontes só porque tens medo." Consequências: `pow_escorted`; Lukin guia o trenó. Requisitos: [C] `SURRENDERED`; fallback. Integração: `obj_m07_house`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| isbá 13:30 | forno, roupa a secar, ícone tapado, copo | — | ordem | — | mãos | — |
| bosque | bétulas, pegadas, cavalo morto, trenó tombado | formação a oeste | atirador | — | Lukin atrás | rastos novos |
| orla | isbás, casa de tijolo, cerca | T-34 ao longe | MG | assalto | Dorokhov | isbás a arder |
| zona exposta | feridos na neve (um coberto) | trenó | MG do celeiro | corredor | Belova, Grisha | marcas de trenó |
| casa | parede com estilhaços, o alemão sem luvas | — | — | — | Saveliev | escolta |
| noite/8/12 | neve nova, isbás apagadas, estação | trenós a passar | — | assalto | — | cruzamento |

Objetos com origem: o copo (Saveliev, desde outubro), o ícone tapado (dona da isbá, evacuada), o cavalo morto (ataque da manhã), o alemão sem luvas (tirou-as para disparar; a unidade retirou sem ele), a estação (linha de Leninegrado).

---

## 6. Diálogos (VO russo)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Saveliev | "Não corra até perder os outros na neve." (§79) | intro t 20 | 1 | — |
| 002 | Makarov | "O grupo da estrada avançou. Podemos cruzar." (§79) | T-34 avança | 1 | — |
| 003 | Orlov | "Há lugar no trenó. Vamos levá-lo." (§79) | Dorokhov junto do trenó | 1 | — |
| 010 | oficial (voz) | "Orlov. Avançar às catorze. O grupo da estrada cobre." (V1) | intro t 6 | 1 | — |
| 011 | Saveliev | "Não tires a luva se não precisas." (PR #44) | intro t 12 | 2 | — |
| 012 | Lukin | "Vamos tomar a aldeia hoje?" (V1) | intro t 28 | 3 | — |
| 013 | Saveliev | "Rastos. Os nossos para oeste, os deles para leste. Lê." (V1) | bosque | 1 | — |
| 014 | Orlov | "Lukin! Ao meu lado." (V1) | Lukin a > 40 m | 1 | 30 |
| 015 | Dorokhov | "Ravina. Devagar e vivo." (V1) | escolha | 2 | — |
| 016 | Makarov | "O vento leva os rastos. Não leva o rádio." (V1) | vento | 3 | 60 |
| 017 | Saveliev | "Atirador na borda. Em baixo." (V1) | atirador | 0 | 20 |
| 018 | Saveliev | "Casa de tijolo. MG na janela. Esperem a estrada." (V1) | orla | 1 | — |
| 019 | Lukin | (dispara sem alvo) — Saveliev: "Guarda. Ainda não viste nada." (V1) | tiros de Lukin | 2 | 30 |
| 020 | Dorokhov | (atingido) "…rua. Não parem." (V1) | hit | 1 | — |
| 021 | Saveliev | "Agora! A estrada tem o fogo deles!" (V1) | T-34 atrai | 0 | — |
| 022 | Makarov | "Casa é nossa. Antena partida." (V1) | tomada | 1 | — |
| 023 | Belova | "Dois da manhã. Um já não." (V1) | feridos | 1 | — |
| 024 | Grisha | "O trenó não passa com aquela MG." (V1) | corredor | 1 | — |
| 025 | Saveliev | "Celeiro. Cala-a e ele passa." (V1) | 024 | 1 | — |
| 026 | Belova | "Devagar, devagar!" (V1) | trenó em movimento | 2 | 20 |
| 027 | Grisha | "Ravina. Estão connosco." (V1) | sled_safe | 1 | — |
| 028 | Lukin | "Alemão! Alemão!" (V1) | casa | 1 | — |
| 029 | Saveliev | "Não apontes só porque tens medo." (PR #44) | arma erguida | 0 | — |
| 030 | Saveliev | "Baixa. Não sabes quem está diante de ti." (PR #44) | se o jogador não intervém em 4 s | 1 | — |
| 031 | Saveliev | "Leva-o à retaguarda. Tu. Com as luvas dele nas tuas mãos, se for preciso." (V1) | escolta | 1 | — |
| 032 | Makarov | "Ponto alto. Dá-me dois minutos de antena." (V1) | rádio | 1 | — |
| 033 | Makarov | "Divisão. Ouvem-nos. Amanhã às oito, cruzamento." (V1) | ligado | 1 | — |
| 034 | Saveliev | "Dormir por turnos. Mãos nos sovacos." (V1) | noite | 3 | — |
| 035 | Saveliev | "Silêncio até ao apito." (V1) | 08:10 | 0 | — |
| 036 | Makarov | "Estação é da estrada. Cruzamento é nosso." (V1) | assalto | 1 | — |
| 037 | Orlov | "Lukin, Makarov, comigo. Ninguém fica para trás na neve." (V1) | reação | 1 | — |
| 038 | Dorokhov (rádio?) — **não** (evacuado). Saveliev: "Blindado! Não é nosso! Casas!" (V1) | reação | 0 | 20 |
| 039 | Makarov | "A estrada ainda está aqui. Os homens é que faltam." (PR #44, atribuída a Makarov) | consolidado | 2 | — |
| 040 | Saveliev | (mãos; copo) "…Já está." (V1) | outro | 2 | — |
| 041 | Orlov | "Chegámos aqui." (V1; eco de M27) | outro | 2 | — |

Callouts: `co_m07_sniper_edge`, `co_m07_mg_barn`, `co_m07_sled_hit`, `co_m07_ally_hit`. Silêncios: noite (cena 6) e o campo antes do apito (cena 7).

---

## 7. Arte e atmosfera

**Paleta:** branco sujo, azul de sombra, cinza de bétula, laranja de isbá a arder, castanho de telogreika. **Luz:** 13:30 Sol az 200°, el 10° (`#ffd6a8`, longo); 15:30 el 2° (`#ff9f6a`); 16:20 noite azul com fogos; 08:00 cinzento (nevoeiro de gelo). **Materiais:** neve compactada/funda (deformação), lama gelada, madeira de isbá, tijolo. **Silhuetas:** bétulas, a estação, a casa de tijolo, torres de água. **Destruição:** isbás a arder → apagadas (8/12); rastos → neve nova. **Humanos:** telogreika, valenki, ushanka, SSh-40; gelo nas sobrancelhas; mãos rígidas (animação); o alemão sem luvas. **Violência reduzida:** o ferido coberto.

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| isbá | forno, vapor, copo | — | artilharia | — |
| bosque | neve a comprimir, respiração, vento | formação a oeste | — | — |
| acesso | Mosin, DP, MG34, isbás a arder | T-34 | baterias | — |
| trenó | cavalo, trenó, MG | — | — | — |
| casa | respiração de três; fogo | — | — | — |
| noite | estática | — | — | **obrigatório** |
| cruzamento | apito; assalto; T-34 | — | — | **obrigatório** (antes) |

Sons novos: neve (passos/trenó), isbás a arder, vento com partículas, T-34 à distância, rádio soviético. VO russo.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| Kryukovo libertada 7–8/12 pela 8.ª DG + 1.ª Bde Tanques Guardas; mudou de mãos várias vezes | D (resumo) | H08; S-C09 | leitura de H08 |
| 16.º Exército (Rokossovsky) | D | S-C09 | — |
| Estação de Kryukovo na linha de Leninegrado | D (geral) | — | mapa P-C07 |
| Temperatura −20 °C; pôr do sol 15:55 | R | — | P-C07 |
| Subunidade; eixo; trenós de evacuação | R | — | P-C07 |
| Alemão a tremer; Lukin; Saveliev | F | — | — |
| Equipamento 1941 (Mosin, DP, PPSh raro, telogreika, valenki) | D | — | auditoria |

**Proibições:** tomada a 7/12; medidor de frio; "batalha em Moscovo"; repetir rendição em M09/M10/M13. **Fora de cena:** Rokossovsky, Panfilov, Katukov.

---

## 10. Handoff técnico

**Contrato:** `id m07_kryukovo`, `order 7`, relógio 13:30→09:30 com noite em snap, grupos (`grp_squad`, `grp_sled`, `grp_road_formation`, `grp_de_village`, `grp_de_reaction`), setores, checkpoints A–D, cutscenes (intro, house, date, outro), falas, flags, debrief.

**Flags:** `m07.completed`, `m07.dorokhov_status`, `m07.lukin_status`, `m07.saveliev_status`, `m07.makarov_status`, `m07.sled_evacuated`, `m07.pow_escorted`, `m07.player_intervened`, `m07.fired_on_pow`, `m07.comms_restored`, `m07.crossroads_held`.

**Sistemas:** [A] simulação, fogo como dados, supressão, carriedBy; [B] data, rádio (interação), chamar companheiro; [C] neve (profundidade, velocidade, rastos dinâmicos, vento visual), trenó com cavalo, `SURRENDERED`, T-34 como proxies. [D] nenhum.

**Disciplinas:** Level: bosque/ravina 400 m, orla 200 m, cruzamento/estação; Combate/IA: infantaria em isbás; Arte: neve por hora; Personagens: soviéticos inverno 1941 (7), alemães inverno; Animação: mãos rígidas, copo, trenó, escolta; Som: neve; VO: russo; Historiador: P-C07; Eng.: neve e rastos; QA: data, `pow_escorted`, trenó.

**Testes:** rastos determinísticos por seed; trenó só passa sem fogo < 3 m; D restaura neve nova e isbás apagadas; `saveliev_status` nunca "dead" nesta missão (regra: não aparece em 1945 por transferência, não por morte).

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| As mãos que não fecham | (intro) | gesto do copo | Saveliev | vapor | start | CP-A |
| A neve apaga | `obj_m07_follow` | ler rastos; ravina/campo | Lukin atrás | vento | A | — |
| A estrada cobre | `obj_m07_attack_access` | cruzar quando a estrada atrai | T-34 avança; Dorokhov cai | isbás a arder | 002 | CP-B |
| Os que ficaram | `obj_m07_find_wounded/sled_corridor` | suprimir; cobrir trenó | Belova/Grisha | marcas de trenó | B | CP-C |
| A casa | `obj_m07_house` | baixar o cano / nada | Saveliev interpõe-se | — | sled_safe | `pow_escorted` |
| Rádio e noite | `obj_m07_radio/date` | levar o rádio | Makarov | neve nova | house | CP-D |
| O cruzamento | `obj_m07_crossroads` | lances; manter o grupo | estrada toma a estação | — | cartela | `crossroads_held` |
| O copo | debrief | — | Saveliev | — | consolidado | `m07.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | rastos, trenó, mãos: três ideias físicas. |
| 2 | Autenticidade | 7 | data/unidade D em resumo; eixo e temperatura P-C07. |
| 3 | Personagens | 8 | Saveliev e Lukin; Makarov com futuro. |
| 4 | Diálogos | 8 | 41 falas; a de Saveliev à porta é o centro. |
| 5 | Originalidade | 8 | ler rastos; o trenó como corredor. |
| 6 | Variedade | 8 | navegação, assalto, corredor, moral, rádio, data, consolidação. |
| 7 | Set pieces | 8 | três. |
| 8 | Atmosfera | 8 | neve azul e isbás; depende do sistema de neve. |
| 9 | Environmental storytelling | 8 | neve nova sobre rastos. |
| 10 | Cinematográfica | 7 | — |
| 11 | Sonora | 8 | neve e silêncio antes do apito. |
| 12 | Impacto emocional | 8 | o copo. |
| 13 | Ritmo | 8 | 20–27 min; noite em snap. |
| 14 | Continuidade | 9 | Makarov/Saveliev para 1945 por flag e trajetória. |
| 15 | Integração técnica | 6 | neve, trenó e rendição são [C]. |

**Correções aplicadas:** (1) Saveliev nunca morre em M07 (a sua ausência em 1945 é transferência, não morte — regra de continuidade); (2) a escolta do prisioneiro ficou condicionada à situação tática ("permite", porque o acesso está tomado) para não ser falsa; (3) a fala 038 foi corrigida (Dorokhov já evacuado não fala).
