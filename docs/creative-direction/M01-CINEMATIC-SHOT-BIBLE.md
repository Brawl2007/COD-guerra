# M01 — CINEMATIC SHOT BIBLE · Planos, câmaras, atuação, duração, transições

**Estado:** PROPOSTA DE DIREÇÃO CINEMATOGRÁFICA. Compatível com o que existe: duas cenas fechadas em primeira pessoa com olhar livre (`cs_m01_intro`, `cs_m01_roll_call`), cartelas/fades do HUD V1, feedback de câmara V1 (offsets ≤ 0,02 m, roll ≤ 0,012 rad, configurável), FOV 70 (48 ao mirar), sem `CutsceneDirector` nem câmara fora do jogador. Tudo o que exige câmara externa está marcado **[C]** e é opcional.

## 0. Princípios

1. **Primeira pessoa primeiro** (Prompt §34). A "composição" em M01 é o que está no campo de visão do jogador quando algo acontece. Dirigir = colocar as coisas onde o jogador *naturalmente* olha e dar-lhe razões para olhar para lá.
2. **A câmara nunca é roubada.** Nenhum beat roda a cabeça de Jan (regra do HUD de demolição, já). Os únicos movimentos "de câmara" são os offsets de feedback (impacto, explosão, zumbido) e a inclinação de Zieliński a baixar-lhe a cabeça (≤ 3 m, `cs_m01_west_blast`): este é um **offset de apresentação de 0,02 m** (dentro dos caps V1), não uma rotação.
3. **Planos exteriores curtos [C]** só para escala (Prompt §74: "tomadas externas curtas servem à escala e não retiram o controlo a cada poucos metros"). Em M01 propõe-se **um** (SP-09, 6 s) e nunca durante o combate.
4. **Skip sem quebrar** (já): estado final consistente, sem repetir falas ou efeitos.
5. **Luz é o enquadramento.** O Sol a 70°–101° define o que é silhueta e o que é rosto. As horas das cenas já estão fixas; a direção escolhe de onde olhar.

## 1. Vocabulário de planos (primeira pessoa)

| Termo | Definição em M01 |
| --- | --- |
| **PS (plano subjetivo livre)** | O jogador controla tudo; a direção coloca atores/eventos no cone de 70°. |
| **PS-guiado** | Subjetivo com um estímulo forte (som posicional, clarão, voz) que atrai o olhar sem o forçar. |
| **PS-mãos** | O ViewModel é o plano: caneca, papel, capacete, caixa, Bąk, ferrolho, clipe. |
| **PS-sentado** | `pose: seated` do jogador (intro, chamada): altura do olhar baixa; os outros em plano médio. |
| **PE [C]** | Plano exterior, câmara fixa, ≤ 6 s, nunca com input ativo. |
| **Cartela** | Texto em máquina de escrever sobre preto (HUD V1). |
| **Faixas** | Barras de cinema nas cenas fechadas (HUD V1). |

## 2. Shot list por cena

### Cena 1 — O posto (`cs_m01_intro`, 44 s)

| # | t | Plano | Composição | Atuação | Luz | Som | Duração |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | 0–3 | Preto | — | — | — | vento, água, apito | 3 s |
| 1.2 | 3–7 | Cartela 1 | centro | — | — | motivo (viola) | 4 s |
| 1.3 | 7–11 | Cartela 2 (+3 opcional) | centro | — | — | motivo | 4 s |
| 1.4 | 11–13,4 | Fade-in PS-sentado | Jan sentado no posto; eixo inicial para **ENE** (faixa clara) com as torres à direita do enquadramento a 212 m | Kowal à esquerda (`rkm_clean`), Bąk à direita (café), Zieliński/Krawiec ao fundo com o mapa (lanterna tapada) | exposição baixa; o fogareiro como única luz quente no terço inferior | motivo corta; vento | 2,4 s |
| 1.5 | 13–18 | PS livre | — | 005 Kowal; Bąk sopra; 140 Bąk | — | — | 5 s |
| 1.6 | 18–35 | PS livre | o mapa a 2 m, meio-plano | 001/002/006/007; Krawiec aponta com o lápis para fora do mapa (para a ponte) | lanterna | — | 17 s |
| 1.7 | 35–44 | PS-mãos | Zieliński entra no plano pela direita e para a 1,2 m; a mão de Jan recebe o papel e a caneca (ViewModel [B]) | 003, 004; Zieliński olha para o posto da ponte ao dizer "Ele está sozinho." (cabeça virada a leste: `facing`) | — | — | 9 s |

**Direção de atores (regra: ninguém é estátua):** Kowal limpa (clip existe); Bąk aquece as mãos (procedural [B]); Dudek escreve no caderno (prop [B]); Pawlak ata a bota (procedural [B]); Zieliński dobra o mapa antes de vir (gesto [B]).
**Skip:** estado final (já).

### Cena 2 — O caminho (PS livre)

| # | Plano | Composição desejada | Como se obtém |
| --- | --- | --- | --- |
| 2.1 | PS-guiado | Lipski com lanterna a 15 m, à esquerda da linha, luz baixa a oscilar | ator civil em ronda (já) + lanterna com luz pontual [B] |
| 2.2 | PS-guiado | **A ponte inteira**: ao sair da trincheira em x≈−50, o portal ferroviário à frente, o rodoviário à direita (40 m), as torres do 1.º pilar e 1 km de ferro até aos portões fechados | geometria real; nenhuma assistência; a faixa clara a ENE recorta as torres |
| 2.3 | PS | Nowicki sentado nos sacos, capacete no colo, de perfil para o rio | `seated` + prop [B] |
| 2.4 | PS-mãos | E: a caneca passa das mãos de Jan para as de Nowicki (ViewModel [B]) | — |
| 2.5 | PS-guiado | 012/013: Nowicki levanta-se e aponta para ENE; o olhar do jogador segue o braço | `facing` + gesto de apontar (procedural [B]) |
| 2.6 | PS-guiado | Nowicki a correr pela encosta sul, caneca na mão, a afastar-se para oeste; Zieliński a gritar de longe | já |

### Cena 3 — Catorze segundos (`cs_m01_bombing`, PS com movimento −40 %)

| # | t | Plano | Composição | Feedback |
| --- | --- | --- | --- | --- |
| 3.1 | 0–2 | PS-guiado | sirene com Doppler vinda do sul: o jogador tende a virar-se; se o fizer, vê o 1.º Ju 87 a sair de picada sobre o aterro (Ju 87 V2 atitude animada) | — |
| 3.2 | 2,1 | PS-mãos | **troca de chapéu [B]**: a mão esquerda tira a rogatywka, a direita põe o capacete, 1,2 s; a bomba 1 cai durante o gesto (coluna de água a norte ou posto a 18 m) | explosão V1 (impulso, roll) |
| 3.3 | 5 | PS-guiado | poeira na encosta a 30+ m (onde Nowicki corria); **sem close** | impulso menor |
| 3.4 | 8,5 | PS | o fogo do vagão a 300 m a oeste; se o jogador olha para trás, vê a chama como única cor quente | — |
| 3.5 | 10–14 | PS-guiado | 016 (voz à esquerda), 015 (voz a oeste, posicional): o jogador orienta-se pelo som | — |

**Regra:** nenhuma bomba a < 30 m; nenhum black-out; o zumbido é configurável.

### Cena 4 — Reorganização e a caixa (PS livre)

| # | Plano | Composição | Atuação |
| --- | --- | --- | --- |
| 4.1 | PS | ponto de reunião na cunha entre as linhas; Zieliński de frente, a contar nos dedos; Kowal, Bąk, Dudek, Pawlak em semicírculo; **um lugar vazio** (o de Nowicki) | 018 com pausa de 2 s em "…Nowicki." (gesto: a mão para no quarto dedo [B]) |
| 4.2 | PS-guiado | Krawiec ajoelhado na cratera, **de costas para o rio**; Wąs e Lenc a tapar com o corpo o que fazem | `sapper_work` com `facing` para oeste |
| 4.3 | PS-guiado | a 300 m, de lado, Dudek a arrastar o ferido para a estação; o rastro | `drag_wounded` (já); decal [B] |
| 4.4 | PS | a porta oeste do barracão; a caixa de faixa branca no chão; interior escuro | prop (já) |
| 4.5 | PS-mãos | regresso: a caixa tapa o terço inferior do plano (ViewModel `carryCrate`, já); a ponte à frente; às 04:45 o fumo da locomotiva sobe a 1 km | — |
| 4.6 | PS (opcional) | Krawiec a apanhar a caneca em (−36, −3, 11): só quem olha vê | agachar 1,5 s [B] |

### Cena 5 — Mil metros (PS livre; alça)

| # | Plano | Composição | Nota |
| --- | --- | --- | --- |
| 5.1 | PS-guiado | 025: Pawlak chega de oeste a correr e para abaixado a 3 m; aponta para leste | — |
| 5.2 | **PS-alça** | ao mirar (FOV 48), o clarão da MG dos portões entre as duas pontes, por cima da água, a 1,2 km: um ponto de luz com fumo (tamanho mínimo no ecrã, já) | a composição-chave da cena: a água como fundo escuro, o clarão como único ponto |
| 5.3 | PS-guiado | a linha de impactos a subir a encosta sul até aos sapadores (SP-04 [B]) | o jogador vê o perigo *mover-se* |
| 5.4 | PS | os três sapadores deitados (`sapper_work_pinned`) e a levantarem-se (120) | — |
| 5.5 | PS-guiado | 04:51: **o nascer do Sol** a 74°: luz rasante na água, contraluz dos portões; o jogador sente a mudança sem cartela | keyframes do Sol (já) |
| 5.6 | PS-guiado | 038: Kowal aponta para a via paralela; o Panzerzug atrás dos vagões (Panzerzug V5) | — |
| 5.7 | PS | 031/032: Pawlak parte a correr para oeste; o relógio acelera e a luz sobe (04:51 → 05:30 em ~90 s reais) | o jogador vê o dia chegar |

### Cena 6 — A ordem sob o zumbido (`cs_m01_order`, PS livre)

| # | Plano | Composição |
| --- | --- | --- |
| 6.1 | PS-guiado | todos olham para cima (targets nulos 2 s [B]); o jogador olha também: céu alto, nada a mergulhar, fumo distante a sudoeste |
| 6.2 | PS | Pawlak abaixado na trincheira, mãos nos joelhos; Zieliński de pé por cima dele (112 antes de 033) |
| 6.3 | PS | 034: Zieliński olha para a ponte ao dizer "ninguém fica na ponte" |
| 6.4 | PS | 164: Pawlak olha o relógio de Zieliński (gesto [B]) |

### Cena 7 — Contra o sol (PS livre)

| # | Plano | Composição | Técnica |
| --- | --- | --- | --- |
| 7.1 | PS-guiado | ao olhar a leste a ±25° do Sol: **ofuscamento** (sprite de glare + exposição local, [B], doc 8) que esconde os clarões do dique | o custo de olhar |
| 7.2 | PS | a sombra da torre do 1.º pilar (23 m) projetada 70 m para oeste sobre o tabuleiro: um corredor de sombra que o jogador pode usar | geometria + Sol |
| 7.3 | PS-guiado | salva de ajuste: impactos e traçantes na cobertura atual **antes** do estampido (3 s); 114x; o próximo nó visível a 20–60 m | já (salva real) |
| 7.4 | PS | 037/161: Pawlak com o cantil de Kowal; Bąk a perguntar as horas (141) | — |
| 7.5 | PS-guiado | 05:50: clarões a norte (−Z), 1–1,5 km, grave; ninguém comenta | `distant-shot` (já) |

### Cena 8 — O clarão e o som (PS livre no tabuleiro)

| # | t | Plano | Composição | Direção |
| --- | --- | --- | --- | --- |
| 8.1 | 06:00 | PS-guiado | 039; figuras pequenas a 1 km em lances pela treliça norte (`run`) | o jogador está nas treliças/torre: vê o tabuleiro inteiro |
| 8.2 | 06:04 | PS-guiado | Bąk cai a 55 m, à frente (não atrás: já corrigido) | 041/042/043 |
| 8.3 | — | PS-mãos | carregar Bąk: o corpo tapa o terço inferior (ViewModel `carryBody`, já); a respiração dele; 143/144 | — |
| 8.4 | 06:05+ | PS-alça | alemães pela metade sul do tabuleiro a 700–800 m, pelotão pela norte: duas linhas de figuras, separadas | geometria (já) |
| 8.5 | 06:06+ | PS-guiado | Rusek passa a < 25 m a gritar (040) e (C) com um ferido às costas | — |
| 8.6 | 06:09:53 | PS | apito 3× (fonte: Krawiec, a oeste); 124/162/044 | o jogador decide: olhar a leste (recompensa) ou baixar a cabeça (segurança: o jogo nunca o pune) |
| 8.7 | **06:10:00** | PS | **clarão e coluna a 700 m, contra o Sol (90°): a coluna escura recortada na luz; os vãos cedem; SEM SOM** | nada toca; o HUD não muda |
| 8.8 | +2,0–2,4 | PS | estrondo; vibração (feedback V1 explosão, distância ~700 m); 105 opcional | — |
| 8.9 | +4 | PS | detritos a cair no rio; fumo cobre o trem | — |
| 8.10 | +6,5 | PS | **2 s de silêncio** (mixagem) | — |
| 8.11 | +8,5 | PS | 045 (Kowal à esquerda, sem olhar para Jan); 046 | — |
| 8.12 | 06:10:30 | PS-alça | a 700 m: homens a recuar com outros às costas; alguns no chão | 181/110/134; 111 se o jogador dispara |

### Cena 9 — A guarnição / Oitenta anos (PS livre)

| # | Plano | Composição |
| --- | --- | --- |
| 9.1 | PS-guiado | a guarnição sai da seteira (24, −3, 43) e sobe para a cobertura do encontro; passa a < 12 m de Jan: Hajduk à frente (190–194, 116); [C] a arma visível |
| 9.2 | PS | o corredor: portal → sacos → trincheira → barracão → vagões; cada cobertura com impactos recentes (decals V1) |
| 9.3 | PS-guiado | 047/048/049 no posto de disparo (−290, −3, 22): os homens do pelotão passam **entre** Jan e a ponte, da direita para a esquerda; Jan conta |
| 9.4 | PS | 06:36 050 (Krawiec a 20 m, de pé, a olhar a ponte); 06:38:30 051 (Zieliński ao lado; a mão na cabeça de Jan se ≤ 3 m: offset 0,02 m, 0,6 s) |
| 9.5 | **06:45:00** | PS | **o portal oeste e os dois primeiros vãos caem no Vístula a 210 m**; clarão; som a 0,6 s; pressão; poeira a deslizar para norte sobre a água; o Sol a 96° por trás: poeira iluminada por trás |
| 9.6 | +5 | PS | terra e lascas no posto (chips/debris V1) |
| 9.7 | +8–11 | PS | silêncio; vento; água; Lipski de pé junto ao barracão a 30 m, a olhar; 052 |
| 9.8 | +13 | PS | 125 Krawiec, sentado, sem olhar para ninguém |
| 9.9 | 06:46–07:05 | PS | caminho para o abrigo (57 m): **olhar para trás** mostra a água sem ponte; nada o obriga |

### Cena 10 — A chamada (`cs_m01_roll_call`, PS-sentado, 60 s)

| # | t | Plano | Composição | Atuação |
| --- | --- | --- | --- | --- |
| 10.1 | 0–3 | Fade-in + cartela "Chamada no abrigo / Tczew — 07:05" | interior; Jan sentado em (−260,5; 68,2) virado para (−260, 72,6); os presentes sentados em semicírculo de frente (`ROLL_CALL_SEATS`, já) | poeira em suspensão (puffs finos [A]); luz baixa pela boca do abrigo (101°) |
| 10.2 | 3 | PS | Kowal passa o cantil (gesto [B]); Krawiec gira a caneca (gesto [B]: `seated` + objeto na mão) | — |
| 10.3 | 6–30 | PS livre | cada nome: Zieliński **não** olha para quem chama; olha para o chão à frente | os chamados levantam a cabeça 0,5 s ao responder (procedural [B]) |
| 10.4 | 28–41 | PS | "Nowicki." (×2) e os silêncios: **nada se mexe**; a caneca é a única coisa com movimento no plano | a câmara livre do jogador tende a procurar quem responde; não há ninguém |
| 10.5 | 48–54 | PS | o norte (som a −Z, 1,3 km, atraso 4 s); Kowal olha para a porta (061); Zieliński (062) | — |
| 10.6 | 57–60 | Fade | — | — |
| 10.7 [C] | +0–6 | **PE** | câmara fixa na boca do abrigo, a 1,8 m, 35 mm equivalente: à esquerda a entrada escura; à direita, ao fundo, os 141 m de água entre o encontro e o 1.º pilar sem ponte; poeira a cair; sem legenda; som: vento, água | opcional; exige câmara externa |
| 10.8 | — | Debrief (HUD V1) | fundo escuro, cabeçalho de máquina, texto com serifa | motivo muito baixo, sem percussão |
| 10.9 | — | Cartela de transição M02 | "9 de setembro de 1939 · Região de Łęczyca · Exército 'Poznań' · Piotr Sokół" (conforme `exit.transitionNote`) | — |

## 3. Durações e orçamento de "controlo retirado"

| Cena | Controlo retirado | Pulável | Total de intro+outro |
| --- | --- | --- | --- |
| `cs_m01_intro` | 44 s (olhar livre) | sim | — |
| `cs_m01_bombing` | 0 (mov. −40 % 14 s) | não | — |
| `cs_m01_order` | 0 | não | — |
| `cs_m01_east_blast` / `west_blast` | 0 | não | — |
| `cs_m01_roll_call` | 60 s (olhar livre) | sim | — |
| PE [C] | 6 s | sim | — |
| **Total** | **≤ 110 s em ~20 min** (≤ 9 %) | | |

## 4. Transições

| De → para | Técnica | Estado |
| --- | --- | --- |
| Carregamento → intro | preto com som do rio já a correr | [B] |
| Intro → jogo | sem corte (Jan levanta-se) | já |
| 04:33:10 (salto do relógio) | invisível (o relógio salta; o mundo não) | já |
| Reparo pronto → 05:30 | aceleração 27× visível na luz | já |
| `reach_shelter` → 07:05 | fade + cartela | já (HUD V1) |
| Chamada → debrief | fade 3 s | já |
| Debrief → M02 | cartela de troca de protagonista/unidade/lugar/data | pendente de M02 |
| Continuar/restaurar | fade 0,8 s + cartela de continuação | já (HUD V1) |

## 5. Atuação (regras de animação por cena)

- **Olhar:** `facing` é combate; `bodyYaw` (contrato V1) segue com atraso; o **olhar de cabeça** para o interlocutor é a primeira coisa a pedir ao Animation Resolver (aim offset de cabeça ≤ 60°, já previsto no contrato) [B/C].
- **Gestos com objetos** (caneca, papel, cantil, caderno, relógio, lápis): sockets `hand_l`/`hand_r` existem; props pequenos como malhas anexadas [B]; nunca atravessam a mão (contrato do PR #44).
- **Reações:** `hit_front`, `near_miss_duck` (motion clips V1) quando resolvidos; até lá, `pinned`/`crouched_idle`.
- **Transporte:** `carry_wounded`/`carried` (Jan e Bąk, Dudek e Bąk), `drag_wounded` (estação). Pares do pelotão [C].
- **Sentados:** `seated` (chamada); Nowicki no posto (pose `seated` com capacete no colo [B]).
- **Mortos/feridos:** `fallen`, `wounded`; os alemães a 700 m só `fallen`/`run`.

## 6. O que a Shot Bible não pede

- Câmaras a voar sobre a ponte; planos de "drone"; close-ups de rostos inimigos; slow motion; letterbox durante combate; qualquer plano que mostre algo que Jan não poderia ver.
