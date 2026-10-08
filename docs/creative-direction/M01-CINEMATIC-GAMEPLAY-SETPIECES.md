# M01 — CINEMATIC GAMEPLAY SET PIECES · Nove sequências para recordar

**Estado:** PROPOSTA (sequências jogáveis originais sobre eventos já existentes). Cada set piece usa o formato do brief §11: Conceito · Contexto · Preparação · Participação · Companheiros · Evolução · Clímax · Consequências · Integração técnica · Fallbacks · Persistência. Nenhum retira o controlo ao jogador. Classes [A]/[B]/[C]/[D] por componente; matriz em [`M01-INTEGRATION-MATRIX.md`](M01-INTEGRATION-MATRIX.md).

| ID | Nome | Hora | Evento(s) âncora | Verbo | Controlo |
| --- | --- | --- | --- | --- | --- |
| SP-01 | Os motores | 04:33:10–04:34 | `evt_m01_planes_heard` | ouvir, não se mexer | total |
| SP-02 | Catorze segundos | 04:34 | `cs_m01_bombing` | sobreviver, agachar | total (mov. −40 %) |
| SP-03 | A caixa | 04:38–04:55 | `fetch_material`, `wounded_dragged`, `second_air_pass` | buscar, carregar, ver | total |
| SP-04 | A metralhadora que sobe a encosta | 04:46–05:15 | `cover_repair` | suprimir a 1,2 km | total |
| SP-05 | A ordem sob o zumbido | 05:30–05:34 | `order_demolish`, `bombing_0530` | esperar, olhar para cima | total |
| SP-06 | Contra o sol | 05:34–06:00 | `hold_access` | mudar de cobertura, não olhar | total |
| SP-07 | O clarão e o som | 06:00–06:12 | `east_platoon_withdraws`, `bak_wounded`, `east_demolition` | cobrir, carregar, não disparar | total |
| SP-08 | A guarnição sai de casa / Oitenta anos | 06:10–06:46 | `leave_bridge`, `hold_corridor`, `west_demolition` | sair, contar, sair | total |
| SP-09 | A chamada | 07:05 | `cs_m01_roll_call` | responder | olhar livre (pulável) |

---

## SP-01 — Os motores (04:33:10–04:34:00)

- **Conceito:** quarenta segundos em que o mundo inteiro pára para ouvir. A guerra começa como um som que não é um trem.
- **Contexto:** Ju 87 de Elbląg (39,7 km) ouvidos a leste e a aproximar pelo sul (H01-PDF n.65); crepúsculo civil; Sol a −3,2°.
- **Preparação:** a entrega da mensagem (ou 04:33:10) dispara `evt_m01_planes_heard` (já). O apito de manobra da estação cala-se (áudio [B]). O loop dos aviões começa inaudível e cresce 40 s (áudio V1: trajetória partilhada, Doppler).
- **Participação:** o jogador pode fazer tudo (andar, olhar, agachar), mas o desenho sonoro e os atores convidam a parar. Nenhum objetivo novo até 04:34. Olhar para ENE recompensa: três silhuetas contra a faixa clara (Ju 87 V2), que viram para sul.
- **Companheiros:** Nowicki levanta-se devagar (012), aponta (013), corre pela encosta com a caneca (066, já). Zieliński grita de longe (067). **Proposta [B]:** Wąs e Lenc param e olham para leste (alvo nulo 3 s); o guarda do portal rodoviário põe o capacete; Lipski apaga a lanterna; Kowal pára de limpar a rkm (fim de `rkm_clean` ao `planes_heard`: [A], a condição já é `battleClock < 04:33:10`).
- **Evolução:** o som passa de ENE a S (trajetória); o primeiro Ju 87 inclina (atitude animada V2); às 04:34:00 a sirene.
- **Clímax:** a primeira sirene de mergulho (`planJu87PullOut` existe para a saída; a sirene de entrada é o loop com Doppler).
- **Consequências:** o jogador sabe de onde vieram e para onde foram; Nowicki está na encosta quando a segunda bomba cai.
- **Integração:** `evt_m01_planes_heard` + áudio V1 + Ju 87 V2 + direção de atores (targets nulos: [B] uma linha por ator no handler).
- **Fallbacks:** jogador que corre para o rally point antes das 04:34: o bombardeio acontece onde ele estiver (já); a segurança de 30 m mantém-se.
- **Persistência:** nada novo; `planes_heard` consumido.
- **Antes/depois:** antes, 40 s de relógio em que o jogador anda; depois, 40 s em que ouve.

## SP-02 — Catorze segundos (04:34:00–04:34:14)

- **Conceito:** o jogador não é bloqueado; é empurrado. Três bombas, três materiais, três distâncias.
- **Contexto:** FACTO (raid às 04:34); impactos reconstruídos; Nowicki ficção.
- **Preparação:** SP-01.
- **Participação:** mover-se a 60 % (já), agachar, procurar cobertura real. A troca rogatywka→capacete em primeira pessoa (1,2 s, mãos, [B]) acontece ao primeiro clarão: o jogador vê-se a pôr o capacete enquanto o mundo treme.
- **Companheiros:** 014 Zieliński; direção de atores (deitar, rolar, puxar); 016 soldado; 015 "Siga a minha voz".
- **Evolução:** água (2,1 s, norte) → terra (5 s, sul, perto) → fogo (8,5 s, oeste, longe). Cada bomba tem assinatura visual e sonora distinta (perfis existem: `bomb`, materiais; decals V1).
- **Clímax:** a segunda bomba: a poeira onde Nowicki corria. Nenhum close. O jogador que olha vê só poeira.
- **Consequências:** posto destruído/quase; crateras; vagão a arder; caneca no chão; `missing`.
- **Integração:** `cs_m01_bombing` (jogável), `safeImpact`, FX V3/decals V1, feedback de câmara V1 (zumbido/tremor configuráveis).
- **Fallbacks:** 12 s completam "Abrigue-se!" (já).
- **Persistência:** `forward_post_state`, `destruction[]`.
- **Antes/depois:** antes, três explosões; depois, três explosões com três texturas e uma ausência.

## SP-03 — A caixa (04:38–04:55)

- **Conceito:** um fetch quest que atravessa o lugar onde a guerra já tem custo. O jogador não luta; vê.
- **Contexto:** reparo dos cabos (reconstrução disputada; nunca mostrado); ferido arrastado (ficção); segunda passagem (T11).
- **Preparação:** 021/023 Krawiec; a mensagem-guia (barracão, porta oeste).
- **Participação:** 222 m sem arma útil (nada a atingir a < 1 km); E; regresso a 0,55× com a caixa, sem disparar. **Decisão de design:** não acelerar; a lentidão do regresso coincide com a chegada do trem (04:45) em muitas partidas: Pawlak corre ao encontro de Jan com 025.
- **Companheiros:** Dudek arrasta o ferido do pátio (04:35:30, 0,65 m/s, ~50 m: está a meio quando Jan passa a 40 m); 017/152/153; Lipski a correr com a lanterna apagada [B]; Kowal fica com os sapadores.
- **Evolução:** 04:40 a segunda passagem distante: ronco alto, três explosões abafadas para oeste (`second_air_pass` já emite um `distant-shot`; propõe-se [A] trocar por `m01-blast` distante sem dano com três pontos a 400–700 m, para fumo persistente a oeste).
- **Clímax:** nenhum. É a ausência de clímax que o torna memorável: a guerra como trabalho de carregar coisas.
- **Consequências:** `cover_repair` ativa; fumo novo a oeste; o ferido no posto de socorro.
- **Integração:** tudo existe exceto Lipski a correr [B] e o fumo das 04:40 [A].
- **Fallbacks:** ponto de entrega já corrigido na partida contínua; caixa nunca aberta.
- **Persistência:** `station_wagon_fire`; `stationDrag` (já no save).
- **Antes/depois:** antes, buscar uma caixa; depois, atravessar um pátio onde um homem é arrastado pelas axilas enquanto a cidade é bombardeada outra vez.

## SP-04 — A metralhadora que sobe a encosta (04:46–05:15)

- **Conceito:** o inimigo é uma cadência. A MG34 dos portões "caminha" o seu fogo pela encosta sul até aos sapadores; o jogador lê a urgência pela poeira que sobe, não pelo HUD.
- **Contexto:** FACTO (trem 963, pioneiros, portões fechados); posição da MG reconstruída; fogo mergulhante como modelo de jogo.
- **Preparação:** 025/028/026/027; alça 1000; tutorial de ferrolho/clipe com propósito.
- **Participação:** mirar o clarão, não o fumo (028); calar a MG (tiros a < 3 m: 5 s + 2,5 s); gerir 45 cartuchos + 30 de Kowal; escolher entre suprimir a MG (eficaz) ou os atiradores (inútil a 1,2 km: o jogo não pune, só não recompensa).
- **Companheiros:** Kowal responde ao clarão mais recente (2 s, já) e diz 027/130/132; Krawiec 022 (obrigatória)/121/120/122; Wąs 200; Lenc 202; Bąk 030; Zieliński 026/028.
- **Evolução [B]:** **bias progressivo** da MG dos portões: cada rajada sobre o reparo visa 2 m mais perto do sapador mais exposto; ao ser suprimida, o bias reinicia 6 m abaixo. O jogador vê a linha de impactos subir e descer. Os resultados agregados (reparo 180–207 s ajuda / 206–251 s ignora) devem ser preservados: o bias altera *onde* cai, não *quantas* vezes; validar com as 12 sementes.
- **Clímax:** 031 "Linha inteira." O relógio acelera (27×): o Sol sobe visivelmente (04:51 → 05:30 em ~1,5 min reais): **a luz muda diante do jogador** como recompensa.
- **Consequências:** `ignition_line_repaired`; tempo de reparo; Panzerzug visível a partir das 04:52 (133).
- **Integração:** `enemyFire.rounds` (bias é um parâmetro de `burst()`), HUD status (já), áudio (cadência da MG como relógio).
- **Fallbacks:** tolerância de 120 s (já); 022 aos 40 % (já).
- **Persistência:** nada novo (o bias deriva do estado atual, sem campo novo; se precisar de memória por arma, campo opcional no schema 2).
- **Antes/depois:** antes, suprimir uma MG até os sapadores pararem de se deitar; depois, ver o fogo a subir e a descer a encosta e a luz do dia a chegar quando a linha fica inteira.

## SP-05 — A ordem sob o zumbido (05:30–05:34)

- **Conceito:** a decisão mais grave da manhã chega pela voz de um rapaz de 18 anos, enquanto o céu zumbe alto e ninguém mergulha. O jogador aprende que nem todo o som de aviões é uma bomba sobre ele.
- **Contexto:** FACTO (ordem; raid Do 17 Z).
- **Preparação:** o reparo concluído; CP-C pedido.
- **Participação:** total; nenhum alvo; o jogador decide para onde olha (cima: nada mergulha; leste: S2 continua; oeste: fumo na cidade).
- **Companheiros:** todos olham para cima 2 s [B]; Zieliński 112 "Cinco e meia."; Pawlak 033; Zieliński 034; Pawlak 164 no fim; Bąk parte para o tabuleiro (já).
- **Evolução:** o zumbido tapa S2 (ducking "mais fundo vence", já); explosões abafadas na cidade (`raid_0530`).
- **Clímax:** 034 "…ninguém fica na ponte." dita **enquanto o raid continua**.
- **Consequências:** `hold_access`; CP-C com hora real depois de 05:34.
- **Integração:** `cs_m01_order` (já, 12 s sem perda de controlo), `bombing_0530` (já), áudio V1.
- **Fallbacks:** CP-C `deferUntilSafe` (já).
- **Persistência:** `second_raid_state`.
- **Antes/depois:** antes, uma ordem e um raid independentes; depois, uma ordem **sob** um raid.

## SP-06 — Contra o sol (05:34–06:00)

- **Conceito:** defender uma posição em que o inimigo é a luz. Cada salva de ajuste é uma frase do sargento; cada cobertura é uma sombra.
- **Contexto:** C01 FACTO (Sol +4,8° → +10,6° a 82°–90°).
- **Preparação:** 036; `co_m01_sun_glare` [B]; sprite de ofuscamento (doc 8) ao olhar a ±25° do Sol.
- **Participação:** mudar de cobertura só quando uma salva real atinge a atual (já); usar a sombra das torres (23 m → 70 m de sombra para oeste) e das treliças (cobertura parcial: tiros passam pelas barras, já); disparar aos clarões dos portões (visíveis) e não aos do dique (invisíveis); gerir munição para as 06:00.
- **Companheiros:** Zieliński 114a–d por nó; Kowal e Bąk alternam (já); Pawlak 115/037/161; Bąk 141; S4 começa a norte (05:50).
- **Evolução:** rotação sacos → portal → treliça 1 → treliça 3 → torre do 1.º pilar (já): o jogador **avança para a ponte** sem que ninguém lhe diga "avance"; aos 06:00 está onde precisa de estar (área −10…160 × 30…50).
- **Clímax:** a última salva antes das 06:00 e 039 "Aí vêm os nossos."
- **Consequências:** `holdAccessVisited`; posição no tabuleiro.
- **Integração:** tudo existe exceto glare [B], 114a–d [A], olhar para cima [B].
- **Fallbacks:** sem atirador com visão → reavalia a cada 4 s (já).
- **Persistência:** `timers.coverFire` (opcional, já).
- **Antes/depois:** antes, "mude de cobertura quando mandarem"; depois, cinco ordens diferentes com cinco sombras diferentes e um sol que custa.

## SP-07 — O clarão e o som (06:00–06:12)

- **Conceito:** o momento memorável canónico (SCRIPT.md §6), dirigido ao detalhe: ver os seus a correr, ver a ponte cair a 700 m em silêncio, ouvir dois segundos depois, e decidir o que fazer com quem rasteja.
- **Contexto:** FACTO (recuo às 06:00; demolição às 06:10; baixas alemãs); Bąk ficção; alemães no tabuleiro reconstrução.
- **Preparação:** 039; 142 Bąk; as figuras pequenas a 1 km em lances (X4 [C] torna isto visível antes); 06:04 Bąk cai (041/042/043).
- **Participação:** (1) suprimir os alemães do tabuleiro a < 3 m para que parem (já); (2) carregar Bąk 63 m a 0,55× sem disparar (já), ou não; (3) a partir de 06:05, cada 20 s sem supressão custa um homem (já); (4) às 06:09:53 o apito: cabeça baixa; (5) depois das 06:10, disparar ou não sobre quem caiu.
- **Companheiros:** Rusek chega a gritar (040) e, [C], com um ferido às costas; Zieliński cobre de facto (dispara); Dudek espera em `aid_position`; Kowal não suprime os alemães do tabuleiro (**regra preservada**; X9 [D] para mudar); Krawiec 124; Pawlak 162; Zieliński 044; Kowal 045; Zieliński 046; Rusek 181 → Zieliński 110 → Kowal 134; 111 se o jogador dispara sobre caídos.
- **Evolução:** 06:00 corrida → 06:04 Bąk → 06:05 alemães no tabuleiro → 06:06+ homens passam (040) → 06:09:53 apito → 06:10:00 clarão **sem som** → +2,0–2,4 s estrondo e vibração → +4 detritos no rio → +6,5 dois segundos de mixagem reduzida → +8,5 045 → +10 046.
- **Clímax:** o intervalo entre o clarão e o som. **Direção:** nada toca nesse intervalo; o HUD não muda; o vento continua. Se o jogador estiver a olhar para oeste, o HUD indica a demolição 12 s (já) mas a imagem é a dos seus a correr: ambas as leituras são válidas.
- **Consequências:** `east_ends_destroyed`; 4 alemães mortos, resto em `RETREAT` (já); `m01.east_platoon_survivors`; `bak_status`/`dudek_status`; 20 s de silêncio da secção se 111.
- **Integração:** `cs_m01_east_blast` (já: apito, 044, clarão, som por distância, detritos, silêncio, 045, 046) + beats 124/162/105 [A] + reações 181/110/134/111 [A] + gesto de Rusek [B] + pares com feridos [C].
- **Fallbacks:** retardatários → `reached_safety` após 90 s fora de vista (já); demolição espera sempre o pelotão com x < 660 (já).
- **Persistência:** `m01.fired_on_fallen` [B] (opcional; só para a reação única e o arquivo).
- **Antes/depois:** antes, a explosão longe e o som depois (já forte); depois, a mesma explosão com um apito que a anuncia como ofício, um rapaz a dizer a hora, um homem que quer vingar a sua arma e um sargento que não o deixa.

## SP-08 — A guarnição sai de casa / Oitenta anos (06:10–06:46)

- **Conceito:** a retirada como contagem e como abandono. Primeiro, três homens saem da casamata com a arma que nunca disparou; depois, o portal de 1857 cai ao rio a 210 m e um ferroviário diz uma frase sobre o avô.
- **Contexto:** FACTO (demolição oeste às 06:45; casamatas existiam); guarnição ficção; avisos procedimento plausível.
- **Preparação:** 046; CP-D ao sair; o HUD indica a demolição leste 12 s e depois cala-se.
- **Participação:** sair de cobertura em cobertura (portal → sacos → trincheira → barracão → vagões) sob fogo esporádico do dique/trem; contar os que passam (049; [B] um número por homem); decidir voltar ou não à ponte antes das 06:36 (permitido; escolta existe); carregar Bąk se ainda está lá e Dudek ainda não foi (06:14).
- **Companheiros:** guarnição `abandon` → `retreat` (já) com 190–194 e 116; [C] transporte visível da ckm; Zieliński 047/048; Dudek/Pawlak 06:14 (117); Krawiec 050 (06:36) e 124-equivalente para oeste? (não: o apito é só a leste, para não repetir); Zieliński 051 (06:38:30) e a mão na cabeça de Jan (≤ 3 m, já descrito); Lipski 052; Krawiec 125.
- **Evolução:** 06:10–06:20 saída sob fogo; 06:20 reagrupamento alemão (fogo esporádico); 06:36 "Última chamada!"; 06:38:30 "Boca aberta, cabeça baixa."; 06:45 detonação a 210 m: clarão, som a 0,6 s, pressão, poeira; +1,5 s o portal oeste e os dois primeiros vãos caem (GLB `_collapsed`); +5 s terra e madeira no posto; +8 s silêncio, zumbido reduzível, vento e água; +11 s 052; +13 s 125.
- **Clímax:** o portal a cair a 210 m. É a maior imagem da missão e acontece **com o jogador a olhar para ela de uma posição que ele escolheu** (qualquer ponto fora de `bz_west`, x < −90).
- **Consequências:** `west_end_destroyed`; casamatas, portal e cobertura do encontro removidos (já); `reach_shelter`.
- **Integração:** tudo existe exceto 190–194/116/117/125 [A], contagem por homem [B], transporte da ckm [C], carroças [C].
- **Fallbacks:** Zieliński vai buscar Jan (já); CP-D nunca em `bz_west` depois das 06:36 (já).
- **Persistência:** `ckm` (fases, já no schema 2).
- **Antes/depois:** antes, "saia da ponte, conte, espere a explosão"; depois, três homens a carregar uma arma que nunca disparou, um número dito em voz alta, e oitenta anos em quarenta segundos.

## SP-09 — A chamada (07:05)

- **Conceito:** o final sem vitória. Nomes em voz baixa; um sem resposta; o norte a arder.
- **Contexto:** ficção; ataque de Koźliny FACTO.
- **Preparação:** `reach_shelter`; olhar para trás recompensado (a ponte ausente); salto para 07:05 com cartela (HUD V1).
- **Participação:** olhar livre; pulável. Nenhum input muda a cena (regra: nunca fingir escolha onde não há).
- **Companheiros:** `stageRollCall` (já): sentados de frente para Jan; variantes por flags (056a/b/c, 057a/b); 151 [A]; direção de atores (doc 2).
- **Evolução:** 053 → 065; o silêncio ×2; 060; o norte (07:00); 061/062.
- **Clímax:** o segundo "Nowicki." e os 3 s em que a caneca gira.
- **Consequências:** `m01.completed`; debrief; cartela M02.
- **Integração:** `cs_m01_roll_call` (já) + 151 [A] + plano exterior [C] ou saída a pé [A].
- **Fallbacks:** skip (já).
- **Persistência:** flags finais.
- **Antes/depois:** antes, a chamada (já a melhor cena da missão); depois, a mesma chamada com direção de olhares, poeira na luz, acústica interior e a ponte ausente à saída.

---

## Micro-situações (não são set pieces; dão textura entre eles)

| Hora | Situação | Classe |
| --- | --- | --- |
| 04:31 | Lipski reconhece Krawiec (170) | B |
| 04:36 | Lipski: "Szymankowo continua sem responder." (171) | A |
| 04:50 | A MG vira para a secção: "Metralhadora no dique!" (já) | — |
| 05:12 | Kowal: "Não é um. São dois." (Panzerzug) | A |
| 05:40 | Pawlak bebe antes de falar (115) | A |
| 05:50 | S4: clarões a norte; ninguém comenta | — |
| 06:03 | Bąk conta baixinho (142) | A |
| 06:11 | Jan: "Dois segundos." (105) | A |
| 06:14 | "Dudek, vai. Eu digo quando." (117) | A |
| 06:20 | Rusek: "Caíram todos na ckm…" (180) | A |
| 06:30 | A guarnição passa com a arma (193/194/116) | A (+C) |
| 06:47 | Krawiec: "Oitenta anos. Quarenta segundos." (125) | A |
| 07:05:16 | Dudek: "Está no caderno." (151) | A |

## Regras transversais

1. Nenhum set piece depende da orientação da câmara para acontecer (Prompt §71): tudo é relógio, estado e posição.
2. Nenhum set piece tem "momento de falha" novo: a missão continua a não falhar por baixas (só por sair dos limites ou cair no rio).
3. Nenhum set piece acrescenta dano ao jogador por explosões polacas.
4. Todo o set piece sobrevive a save/reload no meio (eventos idempotentes; cenas com beats consumidos; `pendingSounds` reconstruídos).
5. Nenhum set piece tem música.
