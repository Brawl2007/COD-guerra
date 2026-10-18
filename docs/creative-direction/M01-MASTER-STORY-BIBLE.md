# M01 — MASTER STORY BIBLE · "A Primeira Manhã"

**TASK_ID** `M01-COMPLETE-NARRATIVE-GAMEPLAY-ATMOSPHERE-DIRECTION-V1` · **Direção criativa** (narrativa, cinematográfica, atmosférica e de gameplay)
**Estado deste documento:** PROPOSTA DE DIREÇÃO, revista. Não é implementação nem certificação técnica. **M01 continua PROTÓTIPO JOGÁVEL.**
**Base inspecionada:** `main` @ `72bbcdd`; consolidação V5 `codex/m01-ready-deliveries-consolidation-v5` @ `d277b06` (PR #52, draft, não integrada em `main`); narrativa de campanha PR #44 @ `3fc04b2` (draft). Detalhe do estado real em [`M01-CREATIVE-PRESERVATION-HANDOFF.md`](M01-CREATIVE-PRESERVATION-HANDOFF.md).

> **Regra absoluta desta biblioteca:** nada aqui substitui `missions/m01-tczew/mission.json`, `SCRIPT.md`, `STORY_BIBLE.md`, os relógios autoritativos (04:34 · 04:45 · 05:30 · 06:10 · 06:45 · 07:05), os 12 objetivos, as 26 definições de eventos, os quatro checkpoints, as flags `m01.*`, a perda fixa de Nowicki (`missing`) nem a simulação. Tudo o que é novo está marcado **[A] pronto para integração**, **[B] pequena expansão**, **[C] expansão ambiciosa** ou **[D] alteração estrutural (exige aprovação)**, conforme a matriz em [`M01-INTEGRATION-MATRIX.md`](M01-INTEGRATION-MATRIX.md).

---

## 0. Índice da biblioteca

| # | Documento | Pergunta a que responde |
| --- | --- | --- |
| 1 | **M01-MASTER-STORY-BIBLE.md** (este) | Que história contamos, com que temas, estrutura e conflitos? |
| 2 | [`M01-COMPLETE-CINEMATIC-SCREENPLAY.md`](M01-COMPLETE-CINEMATIC-SCREENPLAY.md) | Cena a cena: o que acontece, quem diz o quê, como se dirige. |
| 3 | [`M01-GAMEPLAY-VARIETY-DESIGN.md`](M01-GAMEPLAY-VARIETY-DESIGN.md) | Por que cada um dos 12 objetivos joga de maneira diferente. |
| 4 | [`M01-CINEMATIC-GAMEPLAY-SETPIECES.md`](M01-CINEMATIC-GAMEPLAY-SETPIECES.md) | As nove sequências que o jogador vai recordar. |
| 5 | [`M01-ENVIRONMENTAL-WAR-STORYTELLING.md`](M01-ENVIRONMENTAL-WAR-STORYTELLING.md) | O que acontece à volta do jogador, setor a setor, hora a hora. |
| 6 | [`M01-CHARACTER-BIBLE.md`](M01-CHARACTER-BIBLE.md) | Quem são estas pessoas e como mudam. |
| 7 | [`M01-DIALOGUE-PRODUCTION-SCRIPT.md`](M01-DIALOGUE-PRODUCTION-SCRIPT.md) | Todas as falas, variações e política de idioma. |
| 8 | [`M01-ATMOSPHERE-ART-DIRECTION.md`](M01-ATMOSPHERE-ART-DIRECTION.md) | Como a missão deve parecer, hora a hora. |
| 9 | [`M01-AUDIO-MUSIC-DIRECTION.md`](M01-AUDIO-MUSIC-DIRECTION.md) | Como a missão deve soar, e quando se cala. |
| 10 | [`M01-CINEMATIC-SHOT-BIBLE.md`](M01-CINEMATIC-SHOT-BIBLE.md) | Planos, câmaras, durações, transições. |
| 11 | [`M01-HISTORICAL-VALIDATION.md`](M01-HISTORICAL-VALIDATION.md) | O que é facto, reconstrução plausível e ficção. |
| 12 | [`M01-INTEGRATION-MATRIX.md`](M01-INTEGRATION-MATRIX.md) | Onde cada proposta encaixa nos sistemas reais. |
| 13 | [`M01-CREATIVE-PRODUCTION-ROADMAP.md`](M01-CREATIVE-PRODUCTION-ROADMAP.md) | Por que ordem, com que risco e dependências. |
| 14 | [`COD-GUERRA-CAMPAIGN-CREATIVE-VISION.md`](COD-GUERRA-CAMPAIGN-CREATIVE-VISION.md) | Como M01 abre uma campanha de 30 missões com identidades distintas. |
| 15 | [`M01-CREATIVE-PRESERVATION-HANDOFF.md`](M01-CREATIVE-PRESERVATION-HANDOFF.md) | Estado do projeto, o que fica intacto, antes/depois, revisão crítica, instruções. |

---

## 1. Logline e promessa

**Logline.** Na madrugada de 1 de setembro de 1939, um soldado de 21 anos leva café a um posto de sentinela sob a ponte de Tczew. Duas horas e meia depois, a ponte já não existe, um companheiro não responde à chamada, e ele deixou de contar vagões e tiros para contar pessoas.

**Promessa ao jogador.** Não vai ganhar uma batalha. Vai *fazer parte* de uma: proteger um trabalho que não compreende, disparar contra clarões a mais de um quilómetro, esperar com o sol nos olhos, cobrir homens que correm sobre ferro, e ver um lugar com oitenta anos de vida cair ao rio por decisão dos seus próprios compatriotas. A história real vence (as pontes caem, a guarnição retira à noite); o que o jogador decide muda quem sai ferido, quantos chegam e o que se ouve no abrigo.

**Frase-tema (preservada):** *"Contar os seus, não os tiros."* (`dlg_m01_048`, obrigatória).

---

## 2. Identidade narrativa

### 2.1 Três ideias que governam tudo

1. **A distância.** Em Tczew a guerra chega por camadas: primeiro é um *som* (motores a 40 km, 04:33), depois é uma *luz* (clarões a 1,2 km), depois é um *atraso* entre a luz e o som (a explosão leste a ~700 m, 2 segundos de silêncio antes do estrondo), depois é um *vazio* (os vãos que faltam sobre a água), e por fim é um *nome sem resposta* (07:05). Toda a direção, do áudio à câmara, obedece a esta progressão. O horror desta missão não é a proximidade do inimigo; é que se vê gente morrer a 700 metros como silhuetas e se perde o único homem com quem se falou sem lhe ver o corpo.
2. **Contar.** Jan conta por hábito (vagões, degraus, tiros). A batalha obriga-o a contar homens (`dlg_m01_049`) e, no fim, nomes. O jogo materializa isto em mecânica: a contagem do pelotão leste é persistida (`m01.east_platoon_survivors`, 12–18) e dita pelo jogador em voz alta. Nunca há um contador de abates no ecrã.
3. **A ponte que ligava duas feiras.** As pontes não são um "objetivo"; são oitenta anos de vida civil (Lipski: *"Meu avô atravessava por ela para ir à feira."*, `dlg_m01_052`). Os sapadores que as vão destruir passaram meses a conhecê-las por dentro, disfarçados de ferroviários (facto, T09). A tragédia de M01 não é só perder; é ter de partir uma coisa que se cuidava, para a negar ao invasor.

### 2.2 O que torna M01 reconhecível entre 30 missões

| Assinatura | Como se vê no jogo |
| --- | --- |
| **Combate de média e longa distância** (150–1200 m) | Só o wz.29 com alça; clarões, traçantes e poeira em vez de rostos inimigos. Nenhum alemão pisa a margem oeste. |
| **Trabalho sob fogo** | O objetivo central não é matar: é dar aos sapadores 150 segundos de trabalho sem tiros a menos de 3 m. |
| **O sol como inimigo** | Entre 05:30 e 06:40 o Sol nasce exatamente atrás da margem alemã (C01). Olhar para leste é olhar para a luz. |
| **Uma estrutura gigantesca que se destrói por decisão própria** | Duas demolições com avisos, apito dos sapadores, silêncio e consequência persistente. |
| **Uma perda sem corpo** | Nowicki desaparece na poeira da segunda bomba. Nunca há um cadáver; há uma caneca. |
| **O fim sem vitória** | Chamada no abrigo; o debrief regista atraso imposto e retirada à noite. |

### 2.3 O que M01 recusa

- Corredores com inimigos à espera; ondas; "mate todos para avançar".
- Discursos sobre o sentido da guerra; monólogos de vingança; música heroica sobre feridos ou mortos.
- Oficiais históricos (Janik, Juchtman, Faterkowski) com falas ou modelos: ficam fora de cena; os nomes aparecem só no debrief.
- Atrocidades inventadas atribuídas a unidades identificáveis; execução de rendidos como mecânica; humor com a morte de civis.
- Copiar cenas, falas, enquadramentos ou coreografias de *Call of Duty* (2003), *CoD 2* ou *World at War*. O que se estuda deles é o *porquê* de funcionarem (ver §7).

---

## 3. Temas e onde vivem na missão

| Tema (brief §4) | Onde se sente | Quem o carrega |
| --- | --- | --- |
| Medo | 04:33 (40 s de motores, ninguém se mexe); 05:30–06:00 (sol nos olhos, salvas que "ajustam" sobre a cobertura); 06:36 ("Última chamada!") | Bąk (ri antes do perigo, empalidece depois), Jan (silêncio), Piszczek (ckm, 19 anos) |
| Coragem | Nowicki a correr pela encosta com a caneca para avisar os sapadores; Dudek a ir buscar Bąk ao tabuleiro às 06:14 | Nowicki, Dudek, o pelotão leste |
| Exaustão | Krawiec ajoelhado na cratera, mãos sujas, impaciente; a secção às 06:45 a receber terra do céu | Krawiec, Kowal |
| Raiva | Rusek (pelotão leste) ao chegar à margem oeste e ver os alemães que lhe mataram a metralhadora rastejar no tabuleiro | Rusek |
| Desespero | O estado do reparo quando a MG dos portões não é calada: sapadores deitados dezenas de vezes | Krawiec, Wąs, Lenc |
| Companheirismo | "Se eu desmaiar, você me carrega?" "Carrego. Depois cobro." → "a dívida agora é com o Wrona" | Bąk, Dudek, Jan |
| Lealdade | Zieliński vai buscar Jan à zona de demolição se ele ficar (regra: a demolição polaca nunca mata o jogador) | Zieliński |
| Culpa | Krawiec guarda a caneca e não levanta os olhos; Jan: *"Era só para levar o café."* | Krawiec, Jan |
| Crueldade | Alemães que ficam no chão a 700 m depois das 06:10; a vontade de disparar sobre quem rasteja; Szymankowo, relatado | Rusek (impulso), Zieliński (contenção) |
| Compaixão | Dudek nunca "cura": estanca, prende, carrega; Lipski ajuda com as carroças de feridos | Dudek, Lipski |
| Obediência | Pawlak repete a ordem palavra por palavra; Hajduk abandona a ckm quando lhe mandam, não quando quer | Pawlak, Hajduk |
| Responsabilidade | Zieliński conta nomes, não tiros; Krawiec: "Eu sei onde." | Zieliński, Krawiec |
| Sacrifício | O pelotão leste que recua por último, com feridos; a ponte entregue ao rio | Pelotão leste, sapadores |
| Perda | Nowicki; os seis homens do pelotão leste que nunca chegam a ser vistos; a ponte | Todos |
| Sobrevivência | O corredor das 06:10–06:45: não avançar, sair; proteger e sair | Jan, secção |
| Transformação psicológica | Jan: de contar coisas a contar pessoas; Bąk: de falar demais a não falar; Rusek: de raiva a silêncio | Jan, Bąk, Rusek |

---

## 4. Estrutura dramática

### 4.1 Cinco atos sobre os cinco setores e os doze objetivos (estrutura preservada)

| Ato | Hora | Objetivos (ordem canónica) | Setores dominantes | Estado emocional pretendido | Elemento cinematográfico principal |
| --- | --- | --- | --- | --- | --- |
| **I — Café** | 04:30–04:34 | `deliver_message` | S1 (posto), S3 (estação a trabalhar), S5 (céu vazio) | Rotina, intimidade, pressentimento | 40 segundos de motores a crescer enquanto ninguém se mexe |
| **II — Poeira** | 04:34–04:45 | `take_cover`, `follow_sergeant`, `find_sappers`, `fetch_material` (início) | S1, S3 (ferido arrastado), S5 (Stukas) | Choque, desorientação, contagem a meio | Três bombas, um nome que falta ao ponto de reunião |
| **III — Mil metros** | 04:45–05:30 | `fetch_material` (fim), `cover_repair` | S1 (reparo), S2 (trem 963, Panzerzug), S5 (fumo do trem) | Concentração, impotência contra a distância, pequenas vitórias | O duelo com clarões a 1,2 km; a MG que "sobe" a encosta até aos sapadores |
| **IV — Contra o sol** | 05:30–06:10 | `hold_access`, `cover_withdrawal`, `rescue_bak` (opcional) | S1, S2 (pressão, retirada polaca, alemães no tabuleiro), S4 (norte), S5 (raid das 05:30) | Espera, cegueira, urgência, responsabilidade por quem corre | O pelotão leste no tabuleiro; Bąk; a explosão leste e o som 2 s depois |
| **V — O corte** | 06:10–07:05 | `leave_bridge`, `hold_corridor`, `reach_shelter` | S1 (evacuação), S2 (reagrupamento alemão), S3 (carroças), S4 (ataque das 07:00) | Pressão, contagem em voz alta, silêncio, luto contido | A demolição oeste a 210 m; a chamada |

A ordem, os gatilhos, os gates, as tolerâncias e os checkpoints **não mudam**. O que esta biblioteca acrescenta é densidade humana, variedade de situação dentro de cada objetivo e consequência visível.

### 4.2 Curva de intensidade (não é uma rampa)

```
intensidade
   ▲
   │                       ▄▄            ▄▄▄▄
   │          ▄▄▄        ▄█  █▄        ▄█    █
   │   ▁▁   ▄█   █▄▄▄▄▄▄█     █▄▄▄  ▄▄█      █▄
   │ ▁▁  ▀▀█                      ▀▀         █▄▄▁▁▁▁
   └──────────────────────────────────────────────────► hora
    04:30  04:34 04:45     05:30   06:00 06:10  06:45  07:05
    café   bombas trem     ordem   recuo  leste  oeste  chamada
            ↑silêncio 40 s   ↑raid alto e ordem   ↑2 s sem som   ↑só vento
```

Quatro silêncios obrigatórios: (1) os motores antes das 04:34; (2) a janela 05:30–05:34 (zumbido alto dos Do 17, sem mergulhos, sem fogo próximo); (3) os 2 s entre o clarão leste e o estrondo, mais os 2 s de mixagem reduzida (`cs_m01_east_blast`, já definido); (4) a chamada. Sem estes silêncios a violência não pesa.

### 4.3 Ritmo por fases (Prompt §39)

CALM (04:30) → TENSION (04:33) → CONTACT (04:34) → SILENCE/AFTERMATH curto (04:36, ponto de reunião) → ESCALATION (04:45) → COMBAT sustentado (04:46–05:30) → TENSION (05:30–06:00, contra o sol) → CLIMAX (06:00–06:10) → SILENCE (06:10:02) → COMBAT de retirada (06:12–06:36) → CLIMAX (06:45) → AFTERMATH (07:05).

---

## 5. Conflitos

### 5.1 Externo (histórico, fixo)

Gruppe Medem quer as pontes intactas; o Oddział Wydzielony "Tczew" tem ordem de não as entregar. O plano alemão (trem 963 com pioneiros escondidos, trem blindado, Stukas contra os cabos) falha; as pontes caem às 06:10 e 06:45; a guarnição aguenta o dia e retira à noite. **Nada disto depende do jogador.**

### 5.2 Internos (ficção, o que a missão realmente conta)

| Personagem | Conflito | Como se joga/vê | Resolução (fixa) |
| --- | --- | --- | --- |
| **Jan Wrona** | Contar coisas vs contar pessoas | Mecânica: a contagem em voz alta do pelotão (049); a chamada (058) | Responde "Presente." diferente de como começou |
| **Zieliński** | Manter os nomes vs mandar os homens para o tabuleiro | Ordens curtas; "Nos nossos, não!"; "Esses já não vêm." (novo) | "Continuamos." |
| **Krawiec** | O homem que cuidou das pontes vai destruí-las com orgulho de ofício | "Eu sei onde."; a caneca apanhada sem comentário; o apito de três toques | Gira a caneca e não levanta os olhos |
| **Bąk / Dudek** | A dívida: quem carrega quem | Objetivo opcional `rescue_bak`; flags `bak_status`/`dudek_status` | A dívida muda de credor (056a/b/c) |
| **Rusek** (pelotão leste, novo) | Raiva depois de perder a sua metralhadora vs disciplina | Chega a correr (040); quer disparar sobre quem rasteja a 700 m; Zieliński impede | Fica em silêncio na trincheira; não vai à chamada (é de outro pelotão) |
| **Hajduk** (ckm, novo) | Deixar a arma que defendeu durante meses | Abandono da casamata 3 s depois das 06:10 (já na simulação) | Sai com a guarnição; passa por Jan no corredor |
| **Lipski** (civil) | A ferrovia como vida vs a ferrovia como alvo | Trabalha até ao fim do bombardeio; aviso de Szymankowo; olha a ponte cair | "Meu avô atravessava por ela para ir à feira." |

### 5.3 O conflito moral de M01 (brutalidade com significado, brief §5)

M01 não tem prisioneiros nem execuções: em 1939, em Tczew, ninguém cruzou o rio. O momento de crueldade possível é outro e nasce da geometria real da batalha. Depois das 06:10, sobre os vãos da extensão de 1912, a ~700 m, ficam homens alemães no chão e outros que recuam carregando feridos (resultado já implementado: `grp_de_spans` com baixas e `RETREAT`). O jogador *pode* disparar sobre eles: a simulação aceita acertos nas mesmas entidades. Não há recompensa, nem contador, nem objetivo. O que há é reação:

- **Rusek**, que acabou de atravessar sob fogo e viu a sua guarnição de ckm morrer, levanta a espingarda para os que rastejam. (Ação visível: anima para `aim` virado a leste.)
- **Zieliński:** *"Rusek. Esses já não vêm."* Se o **jogador** dispara sobre um alemão já no chão ou em retirada depois da demolição (tiro que passa a menos de 3 m dele, ou que o atinge): *"Wrona. Não gasto cartuchos com quem já caiu. Nem você."* (uma vez; depois, silêncio da secção durante 20 s: nenhuma fala de apoio).
- **Kowal**, sem olhar: *"Mil metros. Não é tiro, é pontaria."* (variação seca: ele sabe que a essa distância é quase impossível e, mesmo assim, o gesto conta).

Não se proíbe o gesto (seria uma parede falsa). Mostra-se o que ele custa: a secção deixa de falar com o jogador por um momento. Isto é **[A]** (duas falas novas ligadas a um evento já existente: um `player-shot` cujo traçado **passa a menos de 3 m** de um actor `de_spans_*` em `DOWN`/`RETREAT` **ou o atinge**, depois de `evt_m01_east_demolition`; usa a mesma lógica de aproximação da supressão, porque a 700 m um acerto com o wz.29 é raro e a intenção é o gesto, não o resultado). O gesto de Rusek é **[B]** (um ator com `aim` virado a leste durante 4 s e a fala de contenção).

**Szymankowo** continua fora de cena, como facto comunicado (Lipski às 04:31) e como parágrafo do debrief (`db_06`), nos termos limitados pela página do IPN lida (T23). Não se encena, não se atribui a unidade identificável. Ver [`M01-HISTORICAL-VALIDATION.md`](M01-HISTORICAL-VALIDATION.md) §6.

---

## 6. Arcos (estado de entrada → vínculo → perda → mudança → estado de saída)

Resumo; detalhe completo em [`M01-CHARACTER-BIBLE.md`](M01-CHARACTER-BIBLE.md).

| Personagem | Entrada | Vínculo | Perda / prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Jan Wrona (POV) | Conta por hábito; cala-se | A caneca de Nowicki, o café | Nowicki não responde | Conta pessoas | "Presente." Vivo, sem ferimento, diferente |
| Zieliński | Calma de caserna | Cada nome da secção | Nowicki; o pelotão leste | "Depois." em vez de "morto" → "Continuamos." | Mesma postura, voz mais baixa |
| Krawiec | Certeza de que está tudo pronto | Parceria com Zieliński; as pontes | A linha cortada; a caneca na encosta | Guarda a caneca sem dizer nada | Não levanta os olhos |
| Nowicki | Brincalhão, só | A caneca, o rio | Desaparece na poeira (fixo) | — | `missing`; ninguém responde |
| Kowal | Estável, números | A rkm; Jan ("alça em mil") | "…Lá se foi o outro lado." | Frase única, depois silêncio | "Presente." |
| Bąk | Fala demais, ri | O trato com Dudek | Ferido na coxa às 06:04 | Deixa de falar | Vivo e ferido, no posto de socorro |
| Dudek | Gentil, rápido | O trato; o ferido da estação | Pode ferir-se no braço | Nunca cura; carrega | Ileso ou "na estação" |
| Pawlak | Ofegante, repete ordens | A hora certa | Vê o que não conta: o posto de comando | Diz as horas mais baixo | "Presente." |
| Lipski (civil) | Metódico, ferroviário | A linha, o horário | Szymankowo não responde; a ponte | Ajuda com as carroças | Vivo; a frase do avô |
| **Rusek** (novo, pelotão leste) | Chega a correr, gritando | A sua ckm perdida na margem leste | Vê os alemães caídos a 700 m | Raiva contida por Zieliński | Silêncio na trincheira |
| **Hajduk / Cyra / Piszczek** (novos nomes para `grp_ckm_crew`) | Guarnição na casamata, invisível | A arma, a seteira, a água do refrigerador | Abandonar a casamata antes das 06:45 | Saem com a ckm, passam por Jan | Fora de `bz_west` |
| **Wąs / Lenc** (novos nomes para `sapper_2`/`sapper_3`) | Trabalham, não falam | Krawiec | Deitados dezenas de vezes sob fogo | Lenc deixa de olhar para o rio quando Krawiec manda | Presentes na chamada (já encenados em `stageRollCall`) |

---

## 7. O que aprendemos com os clássicos sem os copiar

| Jogo | O que funciona (análise) | O que M01 faz com isso (original) |
| --- | --- | --- |
| *Call of Duty* (2003) | O jogador é um membro, não o herói; companheiros com nome que fazem coisas sem ele; a escala vista de baixo | A secção de Zieliński tem iniciativa (Kowal suprime, Dudek evacua, sapadores trabalham, o pelotão leste recua sozinho). Jan é "o que sabe as horas", não o salvador. |
| *Call of Duty 2* | Abertura em rotina (o frio, o treino, o café) antes do contacto; a batalha ao longe antes de estar aqui; sequências de defesa com reposicionamento | 04:30–04:34 é rotina real (fogareiro, mapa, ronda); S2 arde a 1 km antes de qualquer tiro chegar perto; `hold_access` é defesa com rotação de cobertura ordenada por salvas reais. |
| *World at War* | O peso: feridos que gritam, companheiros que impedem a crueldade, silêncio depois do ruído, a câmara que não desvia | Rusek/Zieliński (§5.3), o ferido arrastado da estação, a perda sem corpo, os 2 s sem som, a chamada sem música. Nenhuma cena, fala, morte ou enquadramento desses jogos é reproduzida. |

---

## 8. Objetos narrativos (o ambiente conta a história)

| Objeto | Onde | O que diz | Estado |
| --- | --- | --- | --- |
| **Caneca esmaltada amassada** | Posto → Nowicki → encosta (−36, −3, 11) → Krawiec → abrigo | A pessoa ausente | Existe (`dented_mug`, `activeAfter: evt_m01_nowicki_lost`) |
| **Fogareiro e bule** | Posto da secção (−74, −3, 24) | A rotina antes da guerra | Existe (`coffee_stove`) |
| **Mapa dobrado** | Zieliński/Krawiec (−68, −2.2, 20) | A ponte como problema de engenharia | Existe (`folded_map`) |
| **Caixa de faixa branca** | Barracão → `repair_site_2` | O trabalho que não se mostra | Existe (`sapper_crate`) |
| **Lanterna de Lipski** | Linha, 04:31 | Alguém trabalhava | [A] prop + animação de ronda já existente (ator civil) |
| **Quadro de horários com giz** | Estação (fachada norte) | O trem das 04:12 de Malbork que não chegou: "opóźn." | [B] decal/prop na Station V2 (apresentação) |
| **Relógio de bolso de Zieliński** | Mão esquerda, antes de cada ordem com hora | O sargento mede o que vai perder | [B] gesto (clip curto) ou [A] só em diálogo ("Cinco e meia.") |
| **Caderno de Dudek** | Bornal | "Depois cobro." é literal: ele aponta dívidas | [B] prop pequeno; [A] só em diálogo |
| **Apito dos sapadores (3 toques)** | 06:09:56 | A ponte vai cair; não é uma explosão: é um ofício | Existe (`cs_m01_east_blast`, t −4) |
| **Capacete wz.31 vs rogatywka** | 04:34 | A guerra começou | Existe (`headgear`) |
| **Fita e caixa da ckm** | Casamata (24, −3, 43) | Uma arma com casa | Existe (kit ckm, crew com fases idle/abandon/retreat) |
| **Carroças de feridos** | Estação, 05:40 | A batalha tem custo contínuo | Agenda S3 `carts_evacuating` existe; representação [C] |
| **Os vãos que faltam** | x≈794–808 (06:10) e x≈0–141 (06:45) | A consequência que não desaparece | Existe (`east_ends_destroyed`, `west_end_destroyed`, LOD0–2) |

---

## 9. Continuidade e persistência (inalteradas)

- `m01.nowicki_status` = `missing`, sempre. **Nenhuma proposta desta biblioteca oferece salvar Nowicki.**
- `m01.bak_status` ∈ {`rescued_by_player`, `rescued_by_dudek`, `unhurt`}; `m01.dudek_status` ∈ {`unhurt`, `wounded_arm`}.
- `m01.east_platoon_survivors` ∈ 12–18 (dramatização, não efetivo histórico; P8).
- `m01.forward_post_state`, `m01.second_raid_state`: só dentro da missão.
- Novas flags propostas (todas **[B]**, opcionais no schema 2, nunca obrigatórias): `m01.fired_on_fallen` (bool, só para a reação única de §5.3 e para o arquivo de personagens; **não** altera debrief nem resultado); `m01.ckm_crew_seen` (bool de apresentação, não persistida).
- Jan, a secção e os novos nomes **não** transitam para M02/M03 (Prompt §73).

---

## 10. Antes / depois (ao nível da história)

| Dimensão | Antes (SCRIPT.md + mission.json, PROTÓTIPO JOGÁVEL) | Depois (esta direção) |
| --- | --- | --- |
| Tema | "Contar os seus" declarado numa fala | Tema materializado em três motivos (distância, contar, a ponte civil) e em todas as camadas: som, luz, câmara, HUD, chamada |
| Personagens com voz | 8 nomeados + 1 civil; sapadores 2/3, guarnição ckm e pelotão leste anónimos | 8 aprofundados + Rusek, Hajduk/Cyra/Piszczek, Wąs/Lenc com nome, função, medo e uma fala cada; ninguém existe só para dar objetivos |
| Momentos de silêncio | 1 explícito (2 s após a explosão leste) | 4 obrigatórios, dirigidos (motores, raid alto, estrondo atrasado, chamada) |
| Brutalidade | Nowicki, feridos, alemães mortos a 700 m | + o impulso de disparar sobre quem rasteja, contido; o ferido da estação com rastro; o pelotão que chega com feridos às costas; Szymankowo só relatado |
| Companheiros | Executam tarefas da simulação com 3–4 falas cada | Reagem a perdas, a feridos, ao sol, às demolições e ao jogador, com variações e cooldowns (≈120 falas novas em [`M01-DIALOGUE-PRODUCTION-SCRIPT.md`](M01-DIALOGUE-PRODUCTION-SCRIPT.md)) |
| Ambiente | Setores com agendas e estados persistidos | Roteiro ambiental hora a hora, com props, danos, fumo acumulado, sinais civis e transições (doc 5) |
| Final | Chamada + debrief (já forte) | Chamada preservada, dirigida ao detalhe (luz, poeira, quem olha para onde), com ponte ausente visível à saída do abrigo e cartela de transição para M02 |

---

## 11. O que fica intacto (lista de proteção)

1. `mission.json`: IDs, objetivos, eventos, gatilhos, gates, tolerâncias, segmentos do relógio, checkpoints, cutscenes, as 70 falas (`dlg_m01_001`–`067` e variantes), callouts, flags, debrief.
2. `M01Simulation`, `TczewWorld`, `Wz29`, fogo alemão como dados, supressão de 3 m, regra das baixas por tiro real, escolta de Zieliński, zonas de demolição, segurança de 30 m das bombas.
3. Todas as entregas READY/EM INTEGRAÇÃO da V5 (Station V2, pontes V2, 65 vagões, locomotiva, Panzerzug, Ju 87 V2, áudio V1, HUD V1, FX/decals V1, contrato de animação V1, seis motion clips) e as EM PROGRESSO/PROPOSTAS (Station V3, Animation Resolver, World Interaction System, Combat AI architecture).
4. A aldeia francesa (bancada) e as suas coordenadas.
5. `STORY_BIBLE.md` (elenco e regras) e os documentos de campanha do PR #44 (M02–M30): esta biblioteca **complementa** e não os reescreve.

---

## 12. Critérios de aceitação narrativa (para o playtest humano futuro)

Um jogador que termine M01 deve conseguir, sem ler legendas de novo:

1. Dizer quem é Nowicki e por que a caneca importa.
2. Explicar por que a ponte foi destruída pelos próprios polacos e o que isso custou.
3. Nomear pelo menos três companheiros pela voz ou pelo comportamento (não pelo nome no HUD).
4. Descrever um momento em que a secção fez algo sem ele.
5. Dizer quantos homens do pelotão leste chegaram e por que o número foi aquele.
6. Lembrar-se de um silêncio.
7. Não conseguir dizer quantos alemães matou (porque o jogo nunca lhe disse).

Protocolo de medição: [`docs/campaign/PLAYTEST_PLAN_30_MISSIONS_V1.md`](../campaign/PLAYTEST_PLAN_30_MISSIONS_V1.md) (PR #44), secção M01, acrescido das sondas em [`M01-CREATIVE-PRESERVATION-HANDOFF.md`](M01-CREATIVE-PRESERVATION-HANDOFF.md) §7.
