# M01 — A Primeira Manhã · Roteiro

Estado: **PLANEJADA.** Roteiro e dados prontos para integração; ainda não é uma missão jogável.

Dados executáveis: [`mission.json`](mission.json) (IDs estáveis de objetivos, eventos, setores, checkpoints, cenas e falas) · Mapa: [`MAP.md`](MAP.md) · Pesquisa: [`HISTORICAL_RESEARCH.md`](HISTORICAL_RESEARCH.md) · Elenco: [`../../STORY_BIBLE.md`](../../STORY_BIBLE.md)

## 0. Ficha

| Campo | Valor |
| --- | --- |
| ID | `m01_tczew` (ordem 1 de 30) |
| Título | A Primeira Manhã |
| Data e hora | 1/9/1939, de 04:30 a 07:05 CET (UTC+1). Epílogo textual até as 20:00 |
| Local | Tczew, Pomerânia, Polônia — cabeça de ponte oeste das pontes sobre o Vístula |
| Operação | Defesa das pontes de Tczew. Do lado alemão, a tomada das pontes de Dirschau pela Gruppe Medem |
| Formação | Exército "Pomorze" → Oddział Wydzielony "Tczew" |
| Unidade | 2 Batalion Strzelców (2.º Batalhão de Fuzileiros). A subunidade é fictícia: secção do sargento Zieliński |
| POV | Jan Wrona, *strzelec* (fictício) |
| Elenco | Zieliński, Krawiec, Nowicki, Kowal, Bąk, Dudek, Pawlak e Lipski (civil). Personagens históricos ficam fora de cena. |
| Fontes | H01, H02, H30 (a ler); T01–T12; C01–C02 |
| Certeza | Cronologia principal e resultado `DOCUMENTED` (secundárias); geografia fina `RECONSTRUCTED`; ações da secção `GAMEPLAY_DRAMATIZATION` |
| Equipamento | Karabinek wz.29 (jogador), rkm wz.28, ckm wz.30, Vis wz.35, granada wz.33, capacete wz.31 e túnica wz.36. Inimigo: Kar98k, MG34, Ju 87 B, Panzerzug 7. **Proibidos: M1 Carbine, MP40, MG42.** |
| Entrada / saída | Entra em `cs_m01_intro` → CP-A. Sai por `evt_m01_debrief` → M02 (troca de protagonista com cartela) |
| Duração-alvo | 18–24 min |

## 1. Contexto (tela de carregamento)

> **Tczew, Polônia. 1 de setembro de 1939.**
> Duas pontes de ferro cruzam o Vístula em Tczew: uma ferroviária e uma rodoviária, 40 metros uma da outra. Do outro lado começa a Cidade Livre de Danzig. Por elas passa a ferrovia que liga a Prússia Oriental ao resto da Alemanha.
> Os sapadores poloneses prepararam as pontes para a demolição. A ordem é defendê-las e, se a guerra vier, não deixá-las intactas nas mãos do inimigo.
> Você é Jan Wrona, do 2.º Batalhão de Fuzileiros. É seu turno na cabeça de ponte.

## 2. Estrutura (Prompt §54)

| Etapa | M01 | Hora |
| --- | --- | --- |
| 1. Contexto | Tela de carregamento | — |
| 2. Intro | `cs_m01_intro`: cartela, café, mapa | 04:30 |
| 3. Aproximação | Levar a mensagem ao posto da ponte; ferroviário na via | 04:30–04:33 |
| 4. Diálogo | Nowicki e a caneca; "Não é trem." | 04:33 |
| 5. Primeiro contato | Stukas vindos do céu claro; bombardeio | 04:34 |
| 6. Escalada | Reorganização; linha cortada; trem na margem leste | 04:36–04:52 |
| 7. Combate principal | Proteger o reparo; fogo a 700–850 m; rotação de cobertura | 04:52–06:00 |
| 8. Set-piece | Retirada do pelotão leste pelo tabuleiro; ferimento de Bąk; explosão leste | 06:00–06:10 |
| 9. Pausa | Silêncio de 2 s após a explosão; contagem dos homens | 06:10–06:15 |
| 10. Clímax | Sair da ponte; manter o corredor; demolição oeste | 06:15–06:40 |
| 11. Consequência | Poeira, ferroviário olhando a ponte, abrigo, chamada | 06:40–07:05 |
| 12. Debrief | Texto histórico sóbrio; atraso imposto e retirada à noite | — |

Nunca: spawn → matar → objetivo → fim.

## 3. Roteiro por cena

As falas são originais; o texto completo de cada ID está em `mission.json → dialogue`. Legendas no formato `NOME: fala`.

### Cena 1 — O posto (04:30) · INTRO/SETUP

**Tela preta.** Vento, água correndo sob ferro, um apito de manobra longe.
Cartela: **TCZEW, POLÔNIA — 1 DE SETEMBRO DE 1939 — 04:30**.
Segunda cartela: *2.º Batalhão de Fuzileiros · Oddział Wydzielony "Tczew" · Exército "Pomorze"*.

**Fade-in em primeira pessoa.** Jan está sentado no posto da secção: abrigo de madeira, sacos de areia, fogareiro. O céu está azul-escuro, com uma faixa clara a leste-nordeste. As torres neogóticas da ponte rodoviária aparecem em silhueta a 230 m. O jogador pode olhar à vontade.

Atuação:
- Kowal limpa o rkm com um pano e testa o ferrolho sem som metálico exagerado.
- Bąk sopra o café.
- Zieliński e Krawiec estão debruçados sobre um mapa dobrado, com lanterna tapada pela mão.

| ID | Fala |
| --- | --- |
| 005 | **KOWAL:** Café de verdade hoje. Mau sinal. |
| 001 | **ZIELIŃSKI:** Se um trem de Szymankowo vier fora de hora, quero saber antes do maquinista. |
| 002 | **KRAWIEC:** Os meus rapazes conferiram tudo duas vezes. Só não quero ninguém tropeçando no que é nosso. |
| 006 | **BĄK:** Dudek, se eu desmaiar, você me carrega? |
| 007 | **DUDEK:** Carrego. Depois cobro. |

Zieliński vem até Jan, entrega um papel dobrado e uma caneca esmaltada **amassada**, cheia de café.

| ID | Fala |
| --- | --- |
| 003 | **ZIELIŃSKI:** Wrona. Leve isto ao posto da ponte. E o café, antes que esfrie. |
| 004 | **ZIELIŃSKI:** Confira o homem do posto. Ele está sozinho. |

→ `evt_m01_prelude_start` · **CP-A (Orientação)** · objetivo **"Leve a mensagem e o café ao posto da ponte"**.

*Skip da intro:* aplica o estado final (Jan com mensagem e caneca, controle no posto) e não repete falas.

### Cena 2 — Caminho até a ponte (04:30–04:33) · SETUP/BUILDUP

Tutorial orgânico, sem manual (Prompt §53):

- **Andar:** 90 m até o portal ferroviário, pela trincheira ou pela faixa aberta.
- **Observar:** o céu, as torres e o rio.
- **Cobertura:** a trincheira ensina a agachar; os sacos de areia ensinam a se encostar.
- **Interação:** entregar a mensagem.
- **Tiro e recarga:** ficam para a Cena 5, quando têm propósito.

Enquanto Jan caminha, o mundo já trabalha:
- Um guarda troca de turno junto ao portal rodoviário.
- Dois sapadores fazem ronda na encosta sul do aterro. Olham, tocam, anotam. Não se vê nenhum procedimento.
- O ferroviário **Lipski** percorre os trilhos com uma lanterna (`evt_m01_railway_worker_report`, 04:31).

| ID | Fala |
| --- | --- |
| 008 | **LIPSKI** (se Jan passar a até 15 m): Szymankowo telefonou: um trem de carga fora do horário. Depois a linha caiu. Diga ao seu sargento. |

*Classe:* `GAMEPLAY_DRAMATIZATION`, compatível com o aviso de Szymankowo (T13). Não se diz o que aconteceu aos ferroviários de lá.

**Posto avançado** (sacos de areia sob o portal ferroviário). Nowicki, sozinho, de capacete no colo, olha o rio.

| ID | Fala |
| --- | --- |
| 009 | **JAN:** O sargento mandou isto. E o café. |
| 010 | **NOWICKI:** Na caneca amassada. Então ainda gostam de mim. |
| 011 | **NOWICKI** (lendo o papel): "Atenção redobrada a leste." Como se desse para olhar para outro lado. |

Entregar a mensagem aciona `evt_m01_planes_heard`. O relógio salta para 04:33:10, sem espera real de quatro minutos (Prompt §79). Se o jogador demorar, os aviões chegam às 04:33:10 onde ele estiver.

**Ronco de motores a leste (80°, direção de Elbing).** Todos param. Nowicki se levanta devagar.

| ID | Fala |
| --- | --- |
| 012 | **NOWICKI:** Ouve isso? Não é trem. |
| 013 | **NOWICKI:** Aviões! A leste, contra a claridade! |
| 067 | **ZIELIŃSKI** (longe): Wrona! Nowicki! Saiam do posto! |
| 066 | **NOWICKI** (já correndo pela encosta, caneca na mão): Vou avisar os sapadores! Fique no chão! |

### Cena 3 — 04:34 · FIRST_CONTACT

`evt_m01_bombing_0434` · `cs_m01_bombing`. Jogável, não pula e dura no máximo 14 s.

Três Ju 87 descem do céu claro, um atrás do outro, com a sirene de mergulho. A pesquisa registra divergência sobre o número de aviões, então a tela não mostra número.

- **t 0,6** — **ZIELIŃSKI:** Para o chão! Todo mundo no chão! (014)
- **t 2,1** — Primeira bomba (`evt_m01_forward_post_bombed`). Se Jan já saiu do posto, ela o destrói; se não, cai no rio 40 m a norte e levanta uma coluna de água e lama. **Nenhuma bomba cai a menos de 30 m do jogador.** Onda de choque e zumbido (configurável).
- **t 5,0** — Segunda bomba na encosta, perto de onde Nowicki corria (`evt_m01_nowicki_lost`). Poeira. Nowicki não é visto de novo. Nada de corpo nem de close.
- **t 8,5** — Terceira bomba no pátio da estação; um vagão pega fogo.
- **t 10** — **SOLDADO:** O aterro! Acertaram o aterro! (016)
- **t 12** — **ZIELIŃSKI:** Wrona! Para a trincheira! Siga a minha voz! (015)

Jan troca a *rogatywka* pelo capacete wz.31 numa animação curta.

**Objetivos:** "Abrigue-se!" (completa ao entrar em cobertura ou após 12 s) → "Siga a voz do sargento". A voz é posicional e se repete com variações; não há marcador permanente na mira.

No pátio da estação, a 300 m (`evt_m01_wounded_dragged`, 04:35:30), um soldado arrasta um ferido até a estação. **Acontece com ou sem o olhar do jogador.** A voz de Dudek é ouvida de longe: "Segura a perna dele! Segura, eu disse!" (017).

Às 04:40, uma segunda passagem de aviões soa distante, sobre a estação e o quartel (`evt_m01_second_air_pass`), sem aviões sobre Jan.

### Cena 4 — Reorganização (04:36–04:45) · ESCALADA

**Ponto de reunião** (trincheira, 150 m a oeste do portal).

| ID | Fala |
| --- | --- |
| 018 | **ZIELIŃSKI:** Quem está inteiro, levanta a mão. Kowal. Bąk. Wrona. Nowicki? …Nowicki. |
| 019 | **ZIELIŃSKI:** O posto da ponte levou uma bomba. Depois. Agora, os sapadores. |
| 020 | **ZIELIŃSKI:** Wrona, com o Kowal. Achem o Krawiec no aterro. |

→ **CP-B (Reorganização após o ataque).** Nunca salvar com bombas ainda caindo.

Na encosta, Krawiec está ajoelhado junto à cratera. A linha de ignição está rompida.

| ID | Fala |
| --- | --- |
| 021 | **KRAWIEC:** Cortaram a linha em dois lugares. Eu sei onde. Não sei é se vão me deixar trabalhar. |
| 023 | **KRAWIEC:** Wrona! A caixa no barracão ferroviário, a da faixa branca. Corre! |

**Objetivo:** buscar a caixa de material dos sapadores (`sapper_crate`), a 222 m, no barracão ferroviário.

- A caixa é fechada e genérica. Nunca é aberta em cena.
- Carregar deixa Jan mais lento e impede disparar.
- Na volta, entregar em `repair_site_2`: **KRAWIEC:** Isso. Agora vire para o rio e não olhe para mim. (024)

**Regra do Prompt §79:** o jogo mostra o esforço e o perigo, nunca a preparação real de explosivos. Nada de fios coloridos, conexões, quantidades ou sequência técnica.

Krawiec recolhe do chão a **caneca amassada**, sem comentário. Um jogador atento verá.

### Cena 5 — O trem de Lisewo (04:45–05:30) · COMBATE PRINCIPAL

`evt_m01_train963_arrives` (04:45). Da margem oeste, a 850 m, vê-se a fumaça de uma locomotiva parada diante dos portões fechados. Pioneiros alemães descem dos vagões e o pelotão leste abre fogo.

| ID | Fala |
| --- | --- |
| 025 | **PAWLAK** (chega correndo): Trem na cabeça de ponte leste! Os portões estão fechados — estão atirando! |
| 026 | **ZIELIŃSKI:** Kowal, rajadas curtas nos clarões do dique. Ninguém desperdiça. |
| 027 | **KOWAL:** Clarões junto aos vagões. Setecentos, oitocentos metros. |
| 028 | **ZIELIŃSKI:** Wrona, alça em oitocentos. Mire nos clarões, não na fumaça. |

É aqui que o jogo ensina **mira, tiro, ferrolho e recarga por clipe** com propósito.

**Objetivo: "Proteja o reparo da linha".**
- MG34 no dique e, depois das 04:52, no Panzerzug 7 (`evt_m01_panzerzug_arrives`) varrem a margem oeste de vez em quando.
- Quando rajadas caem a menos de 3 m dos sapadores, eles se abaixam e o trabalho para: **KRAWIEC:** Precisamos de espaço para trabalhar! (022).
- Fogo de Jan e Kowal sobre os clarões suprime as MGs e o trabalho retoma.
- Se o progresso ficar parado por 120 s reais, a cadência inimiga cai sem aviso. É tolerância, não punição.
- Callouts reais: **KOWAL:** Trocando carregador! (029) quando o rkm recarrega; **BĄK:** Cubro você! (030) quando Jan recarrega perto dele; **KOWAL:** Trem blindado! Na outra via, atrás dos vagões! (038).

Reparo concluído (`evt_m01_repair_complete`):

| ID | Fala |
| --- | --- |
| 031 | **KRAWIEC:** Linha inteira. Avisem o oficial: está pronta. |
| 032 | **ZIELIŃSKI:** Pawlak, vai. |

O relógio segura em 05:29:30 até o reparo terminar. Os setores continuam com comportamento de sustentação: rajadas irregulares, pausas e deslocamentos, sem laço perceptível.

### Cena 6 — A ordem (05:30) · COMBATE PRINCIPAL

`evt_m01_order_demolish` · `cs_m01_order`. Não tira o controle. Pawlak volta pela trincheira e fala abaixado.

| ID | Fala |
| --- | --- |
| 033 | **PAWLAK:** Ordem do comandante do batalhão: destruir as pontes. O pelotão do outro lado recua primeiro. |
| 034 | **ZIELIŃSKI:** Ouviram. Quando os sapadores disserem, ninguém fica na ponte. |

→ **CP-C (Proteção dos engenheiros)**.

O comandante histórico não aparece. A ordem chega pelo mensageiro, como chegaria.

### Cena 7 — Contra o sol (05:30–06:00) · COMBATE PRINCIPAL

**Objetivo: "Mantenha a cabeça de ponte — mude de cobertura quando mandarem".**

- O Sol nasceu a leste, **atrás do inimigo** (C01: +4,8° às 05:30, +10,6° às 06:10). Olhar para leste ofusca; a sombra das torres e treliças devolve a visão.
  - **ZIELIŃSKI:** Sol nos olhos. Fique na sombra da treliça e espere o clarão. (036)
- **Rotação de cobertura:** após 35–50 s na mesma posição, o fogo inimigo ajusta sobre ela. É supressão real, não dano garantido.
  - **ZIELIŃSKI:** Mudar! Estão acertando a nossa posição. Para a torre! (035)
  - Ele reserva a próxima posição: sandbag → portal → treliças do 1.º vão → torre do 1.º pilar.
  - Os companheiros alternam por conta própria: Kowal cobre, Bąk avança.
- `evt_m01_runner_pressure_report` (05:40): **PAWLAK:** Do outro lado dizem que não aguentam muito. Perderam uma metralhadora. (037)
- Ao norte, a 1–1,5 km, começa outro combate (`evt_m01_north_contact_distant`, 05:50). São clarões e ruído grave, sem efeito sobre Jan. A hora é dramatização (P9).

### Cena 8 — O pelotão leste (06:00–06:10) · SET-PIECE

`evt_m01_east_platoon_withdraws`. Ao longe, sobre o tabuleiro da ponte rodoviária, pequenas figuras vêm para oeste em lances curtos, carregando feridos. Atrás delas, na cabeça de ponte leste, surgem uniformes cinza-esverdeados (`evt_m01_germans_on_east_spans`, 06:05), que não passam de x = 690.

| ID | Fala |
| --- | --- |
| 039 | **ZIELIŃSKI:** Aí vêm os nossos. Fogo em quem vem atrás deles. Nos nossos, não! |

**Objetivo: "Cubra a retirada do pelotão leste".**
- Tiros a menos de 3 m de um grupo alemão fazem o grupo se deitar e parar.
- A cada 20 s de relógio sem supressão, o pelotão leste perde mais um homem, até o mínimo de 12 sobreviventes. **A missão nunca falha por isso.** O número fica gravado e aparece na contagem.
- Soldados do pelotão leste passam pela secção a partir de 06:06: **SOLDADO:** Não parem! Eles estão no tabuleiro atrás de nós! (040)

**06:04 — Bąk é ferido** no tabuleiro, a 55 m do portal (`evt_m01_bak_wounded`).

| ID | Fala |
| --- | --- |
| 041 | **BĄK:** Estou bem… Não. Não estou. |
| 042 | **DUDEK:** Bąk está no chão! Alguém me cubra! |
| 043 | **ZIELIŃSKI:** Wrona! Traga o Bąk até o Dudek. Eu cubro! |

**Opcional:** carregar Bąk 63 m até o portal. Enquanto isso, Zieliński e Kowal cobrem; a IA suprime de fato.
- Se Jan não for, às 06:14 Dudek vai buscá-lo e volta ferido no braço (`evt_m01_dudek_retrieves_bak`).
- **Ninguém morre por essa escolha.** Ela muda quem sai ferido e o que se ouve na chamada.

**06:10 — Demolição leste** (`evt_m01_east_demolition`, `cs_m01_east_blast`). Espera todo o pelotão leste com x < 660, com tolerância de 90 s.
- **−4 s:** apito de sinal dos sapadores, três toques curtos.
- **−2 s:** **ZIELIŃSKI:** Cabeças baixas! Lá do outro lado! (044)
- **0 s:** clarão e coluna de poeira na extremidade leste. Os vãos cedem. **Ainda sem som.**
- **2,4 s:** o estrondo chega (C02) e o tabuleiro vibra sob os pés.
- **4 s:** detritos caem no rio e a fumaça cobre o trem 963.
- **6,5 s:** dois segundos de silêncio. A mixagem baixa tudo menos o vento.
- **KOWAL:** …Lá se foi o outro lado. (045)

Consequência na margem leste: alemães recuam carregando feridos; alguns ficam no chão; **nenhum reaparece** (Prompt §71). Sem close e sem humilhação do inimigo.

### Cena 9 — O corredor (06:10–06:40) · CLÍMAX

| ID | Fala |
| --- | --- |
| 046 | **ZIELIŃSKI:** Todos fora da ponte! Para o posto de disparo, agora! |

**Objetivo: "Saia da ponte! Para o posto de disparo".** Ao passar de x < −20, sem carregar ninguém, grava **CP-D (Retirada)**.

A margem leste reagrupa (`german_regroup`, 06:20): atiradores no dique e rajadas esporádicas do trem varrem a faixa entre os acessos. O caminho tem cobertura em série: portal, sandbags, trincheira, barracão, vagões.

**Objetivo: "Mantenha o corredor — conte os que passam".** Os últimos homens do pelotão leste e a guarnição da metralhadora pesada (que sai da casamata) passam por Jan.

| ID | Fala |
| --- | --- |
| 047 | **ZIELIŃSKI:** Contem os homens do pelotão leste quando passarem. Em voz alta. |
| 048 | **ZIELIŃSKI** (se Jan atira enquanto passam, ou após 10 s): Wrona, conte os nossos. Não conte os tiros. |
| 049 | **JAN:** {n}. São {n} do pelotão leste. — onde {n} é de 12 a 18, conforme a cobertura dada |

É o centro do arco de Jan: ele passa a contar pessoas, não tiros.

Avisos antes da demolição oeste:

| Hora | ID | Fala |
| --- | --- | --- |
| 06:36 | 050 | **KRAWIEC:** Última chamada! Quem estiver no encontro, sai agora! |
| 06:38:30 | 051 | **ZIELIŃSKI:** Boca aberta, cabeça baixa. |

**06:40 — Demolição oeste** (`evt_m01_west_demolition`, `cs_m01_west_blast`).
- **Prontidão:** jogador e atores obrigatórios fora de `bz_west`; guarnição da metralhadora fora da casamata.
- **Tolerância:** se Jan insistir em ficar, Zieliński vai buscá-lo e o puxa. **A demolição polonesa nunca mata o jogador.**
- Detonação a ~210 m: som quase imediato e onda de pressão. O portal oeste e os primeiros vãos caem no Vístula.
- Chuva de terra e lascas sobre o posto de disparo, depois silêncio, zumbido (reduzível), vento e água.
- O oficial histórico dos sapadores fica fora de cena, sem modelo nem fala.
- Lipski, perto do barracão, olha a ponte: **LIPSKI:** Meu avô atravessava por ela para ir à feira. (052)

### Cena 10 — O abrigo (07:05) · AFTERMATH/OUTRO

**Objetivo: "Vá para o abrigo"** (72 m). Fade com cartela **07:05**.

`cs_m01_roll_call` (pulável, máx. 110 s). Dentro do abrigo, poeira no ar. Jan sentado, olhar livre. Kowal passa um cantil. Krawiec, sentado, gira nas mãos a **caneca amassada**.

| ID | Fala |
| --- | --- |
| 053 | **ZIELIŃSKI:** Chamada. |
| 054 | **ZIELIŃSKI:** Kowal. |
| 055 | **KOWAL:** Presente. |
| 063 | **ZIELIŃSKI:** Bąk. |

A resposta sobre Bąk depende da escolha:

| Estado | ID | Fala |
| --- | --- | --- |
| Resgatado por Jan | 056a | **DUDEK:** Bąk está no posto de socorro. Vivo. Diz que agora a dívida é com o Wrona, não comigo. |
| Resgatado por Dudek | 056b | **PAWLAK:** Levaram o Bąk para a estação. O Dudek foi junto, com o braço aberto. |
| Não ferido (caso de contingência) | 056c | **BĄK:** Presente. |

| ID | Fala |
| --- | --- |
| 064 | **ZIELIŃSKI:** Dudek. |

| Estado de Dudek | ID | Fala |
| --- | --- | --- |
| Ileso | 057a | **DUDEK:** Presente. |
| Ferido | 057b | **ZIELIŃSKI:** Dudek… na estação. Eu sei. |

| ID | Fala |
| --- | --- |
| 065 | **ZIELIŃSKI:** Wrona. |
| 058 | **JAN:** Presente. |
| 059 | **ZIELIŃSKI:** Nowicki. |

*(Quatro segundos. Ninguém responde.)*

| ID | Fala |
| --- | --- |
| 059 | **ZIELIŃSKI:** Nowicki. |

*(Três segundos. Krawiec não levanta os olhos da caneca.)*

| ID | Fala |
| --- | --- |
| 060 | **ZIELIŃSKI:** Continuamos. |

Tiros distantes ao norte (`evt_m01_kozliny_attack_distant`, 07:00, DOCUMENTED T08).

| ID | Fala |
| --- | --- |
| 061 | **KOWAL:** Agora é no norte. |
| 062 | **ZIELIŃSKI:** O norte é de quem está lá. Bebam água. Durmam se conseguirem. |

Fade para o debrief.

**Por que Nowicki fica "sem resposta" e não "morto":** o jogo mostra claramente que a perda é inevitável, mas não inventa uma morte na tela. Ninguém sabe dizer onde ele está. É uma perda roteirizada e o jogo não finge que havia escolha (Prompt §72).

## 4. Debrief

Texto em `mission.json → debrief`. Parágrafos com `enabled: false` esperam confirmação de fonte:
- `db_05`: nomes de Janik e Juchtman, depende de P1.
- `db_06`: Szymankowo, depende de P10.

> Às 04:34, bombardeiros de mergulho alemães atacaram a estação e a cabeça de ponte oeste para cortar a linha que permitiria destruir as pontes sobre o Vístula. Os sapadores poloneses repararam a linha.
> Por volta das 04:45, um trem de carga com sapadores alemães escondidos chegou à cabeça de ponte de Lisewo, apoiado por um trem blindado. Encontrou os portões fechados e defensores em posição.
> Por ordem do comando, as duas pontes foram demolidas às 06:10 e às 06:40. O plano de tomá-las intactas fracassou.
> A guarnição repeliu ataques durante o dia e, por ordem superior, deixou Tczew entre 18:00 e 20:00, rumo a Starogard. A campanha continuou. Uma ponte destruída atrasou o inimigo; não mudou o rumo da guerra.
> Jan Wrona, Marek Zieliński, Paweł Krawiec e os demais membros da secção são personagens fictícios.

Sem vitória estratégica inventada (Prompt §79). Não afirmar "o primeiro ataque da Segunda Guerra"; a formulação segura é "minutos antes de Westerplatte".

## 5. Batalha ao redor

| Distância | O que acontece | Setor |
| --- | --- | --- |
| Próxima (0–150 m) | Secção, sapadores, guarnição da ckm na casamata, ferroviários, feridos arrastados, pelotão leste chegando | S1 |
| Próxima/média (250–460 m) | Pátio da estação: incêndio, posto de socorro improvisado, carroças levando feridos para oeste às 05:40 | S3 |
| Média/longa (700–1000 m) | Cabeça de ponte leste: trem 963, Panzerzug 7, MGs, pelotão leste, avanço alemão, demolição e recuo alemão com feridos | S2 |
| Longa (0,8–1,5 km) | Perímetro norte: combate a partir de 05:50; ataque das 07:00 com canhão AT | S4 |
| Muito longa | Céu a leste: Stukas de Elbing; fumaça de locomotivas na linha de Szymankowo | S5 |

Todos os setores seguem o relógio de batalha e mantêm estado ao virar a câmera, trocar LOD ou restaurar checkpoint. Mínimo de dois setores independentes ativos (Prompt §74): S2 e S4, com S3 como bônus.

## 6. Momento memorável (Prompt §55)

**A ponte explode longe e o som demora.** No tabuleiro de ferro, com o sol baixo nos olhos, Jan vê os seus correndo em sua direção. Depois vê o clarão a 800 m e só então ouve o estrondo, com o chão tremendo sob os pés. Em seguida vem o silêncio.

Combina cenário (as pontes reais de Tczew, as torres e o sol nascente), som (atraso físico), personagens (Bąk ferido, o pelotão chegando) e gameplay (suprimir quem os persegue).

O segundo momento é a chamada: a caneca amassada nas mãos de Krawiec e um nome sem resposta.

## 7. Checkpoints

| Rótulo | ID | Quando | Posição | Restaura |
| --- | --- | --- | --- | --- |
| CP-A | `cp_m01_a_orientacao` | Fim da intro | (−66, −3, 22) | Tudo inicial; Nowicki no posto |
| CP-B | `cp_m01_b_reorganizacao` | Chegada ao ponto de reunião | (−148, −3, 30) | Bombardeio consumido; Nowicki `missing`; crateras; posto conforme `m01.forward_post_state`; incêndio no pátio; ferido de S3 no posto de socorro |
| CP-C | `cp_m01_c_engenheiros` | Ordem das 05:30 | (−30, −3, 24) | Linha reparada; caneca com Krawiec; trem 963 e Panzerzug 7 parados; baixas de S2 por ID |
| CP-D | `cp_m01_d_retirada` | Após 06:10, com Jan em x < −20 e sem carregar ninguém | posição do momento | Pontas leste destruídas; sobreviventes do pelotão leste; estados de Bąk e Dudek; baixas alemãs da explosão |

As listas completas de eventos consumidos, objetivos, destruição e setores estão em `mission.json → checkpoints`.

**Regras:**
- Todo evento é idempotente e tem ID estável. Restaurar não repete bombardeio, explosões, falas ou mudanças de fase.
- Nunca salvar dentro da zona oeste depois das 06:36, com bombas caindo ou carregando Bąk.

## 8. Skip

| Cena | Pulável | Estado final ao pular |
| --- | --- | --- |
| `cs_m01_intro` | Sim | Controle no posto, com mensagem e caneca. Falas marcadas como tocadas. |
| `cs_m01_bombing` | Não (14 s, jogável) | — |
| `cs_m01_order` | Não (12 s, sem perda de controle) | — |
| `cs_m01_east_blast` e `cs_m01_west_blast` | Não (jogáveis, sem perda de controle) | — |
| `cs_m01_roll_call` | Sim | Flags já gravadas; vai ao debrief; nenhuma fala repetida |

## 9. Consequências e continuidade

| Flag | Valores | Efeito |
| --- | --- | --- |
| `m01.nowicki_status` | sempre `missing` | Chamada sem resposta |
| `m01.bak_status` | `rescued_by_player`, `rescued_by_dudek` ou `unhurt` | Falas 056a/b/c |
| `m01.dudek_status` | `unhurt` ou `wounded_arm` | Falas 057a/b |
| `m01.east_platoon_survivors` | 12–18 | Fala 049 |
| `m01.forward_post_state` | `destroyed` ou `intact_near_miss` | Só dentro da missão |

M02 troca de protagonista, exército e lugar. Nenhum destes personagens reaparece por padrão. Jan não é transportado para outra frente (Prompt §73).

## 10. Direção de atores

- **Ninguém fica estátua** (Prompt §37). Durante as falas, as pessoas limpam arma, olham o céu, recarregam, dobram o mapa, amarram bota ou seguram o ferido.
- **Zieliński:** voz baixa até o bombardeio. Depois, ordens curtas e gestos claros: aponta, abaixa, conta nos dedos. Na chamada, não muda o tom ao chegar em Nowicki.
- **Krawiec:** impaciente com interrupções e meticuloso. Trabalha de costas para o rio e nunca explica o que faz.
- **Kowal:** calmo, fala números. Recarrega em cobertura.
- **Bąk:** o mais novo. Ri demais na intro e fica pálido depois do bombardeio.
- **Dudek:** gentil e rápido. Nunca cura em um segundo; ele estanca, prende e carrega.
- **Lipski:** civil. Trabalha até o fim do bombardeio e depois ajuda com as carroças. Não empunha arma.
- **Inimigos:** recuam com feridos após 06:10, deitam sob supressão e hesitam. Não são monstros intercambiáveis (Prompt §72).

## 11. Violência e intensidade (Prompt §57/§72)

- **Padrão adulto e sério.** Feridos sangram. O arrastado deixa rastro. Bąk tem ferimento visível na coxa.
- **Explosões:** poeira, pedaços, ferro retorcido. Sem desmembramento de personagem com nome. Mortos alemães após 06:10 vistos só a 700 m.
- **Nowicki:** perda sem corpo, por escolha narrativa, não por censura.
- **Opções:** níveis de sangue, redução de tremor, flashes e zumbido. A opção reduzida mantém a gravidade pela atuação e pelo silêncio.
- **Música:** nada heroico sobre a chamada. Só vento, respiração e tiros distantes.

## 12. Contrato de dados para a engine

`mission.json` foi escrito para ser consumido sem framework novo (Prompt §74).

### Tipos de gatilho

| Gatilho | Condição |
| --- | --- |
| `missionStart` | Início da missão |
| `battleClock` | Hora do relógio de batalha (`at`); com `gate: true`, segura o relógio até a prontidão |
| `eventComplete` | Outro evento já disparou (com `delaySec` opcional) |
| `objectiveComplete` | Objetivo concluído |
| `objectiveProgress` | Progresso de um objetivo atinge um valor |
| `objectiveState` | Objetivo em determinado estado |
| `cutsceneComplete` | Cena terminou |
| `actorInArea` | Ator dentro de uma área |
| `any` / `all` | Combinações |

### Campos dos eventos

- `readiness`: condições para disparar; quando ausente, não há condição adicional ao gatilho.
- `tolerance`: o que fazer se a prontidão demorar; quando ausente, não há timeout automático.
- `results`: efeitos no mundo.
- `persist` / `idempotent`: vão para o save; nunca executam duas vezes.
- `certainty` e `sources`: rastreio histórico.

### Relógio

`clock.segments` define escala, *snap* e *gate*. Pausa e menus suspendem o relógio.

Detalhes obrigatórios para implementar relógios, gatilhos e snapshots sem softlock: [`ENGINE_CONTRACT.md`](ENGINE_CONTRACT.md). Os textos de prontidão e resultados ainda são especificações; precisam de handlers explícitos, não de execução automática de prosa.

### Validação

`node --test tests/m01-tczew-data.test.js` confere:
- referências cruzadas entre objetivos, eventos, checkpoints, cenas, falas, setores e mapa;
- datas e horários;
- armas permitidas por data;
- falas obrigatórias;
- classificações históricas e espaciais.

**Isso não substitui jogar a missão** (Prompt §80).

## 13. Critérios de aceitação de M01 (Prompt §77, Marco 2)

A demonstrar em navegador. Hoje, todos estão **PENDENTES**.

1. Partida completa de 04:30 ao debrief, sem softlock, dentro de 18–24 min.
2. Morrer e restaurar em cada checkpoint (A–D) sem duplicar bombardeio, explosões, falas ou reforços, e sem ressuscitar alemães mortos às 06:10.
3. Pular a intro e a chamada sem quebrar a missão.
4. Ficar parado 90 s às 05:40: S2 e S4 continuam ativos e coerentes.
5. Virar a câmera durante a explosão leste: o estado depois confere com o antes.
6. Não resgatar Bąk: Dudek o busca, a chamada muda e a missão termina.
7. Ficar dentro de `bz_west` às 06:40: Zieliński busca Jan e a demolição espera. O jogador não morre.
8. Jan usa só o karabinek wz.29 (5 tiros, clipe, ferrolho), com som e animação próprios. Nenhuma M1 Carbine aparece.
