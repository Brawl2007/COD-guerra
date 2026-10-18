# M01 — CHARACTER BIBLE · As pessoas da primeira manhã

**Estado:** PROPOSTA DE DIREÇÃO (aprofundamento). Preserva integralmente `STORY_BIBLE.md` (nomes, idades, funções, arcos, destinos, flags). Acrescenta profundidade às personagens existentes e dá nome e voz a vagas que já existem na simulação (`sapper_2`, `sapper_3`, `east_platoon_voice`, `grp_ckm_crew`). Nenhuma personagem é substituída. Classificação das mudanças de dados em [`M01-INTEGRATION-MATRIX.md`](M01-INTEGRATION-MATRIX.md).

**Convenções.** Falas canónicas: `dlg_m01_NNN` (inalteradas). Falas novas: `dlg_m01_1NN` (ver [`M01-DIALOGUE-PRODUCTION-SCRIPT.md`](M01-DIALOGUE-PRODUCTION-SCRIPT.md)). Rig: cabeças disponíveis no kit (`head_wrona`, `head_zielinski`, `head_krawiec`, `head_nowicki`, `head_bak`, `head_kowal`, `head_dudek`, `head_pl_a`); as personagens sem cabeça própria usam `head_pl_a` com variação de atlas (Soldier Visual Variation, em integração) até haver novas cabeças. Clips existentes: `standing_idle, aim, fire_bolt, reload_clip, walk, run, crouched_idle, pinned, sapper_work, sapper_work_pinned, carry_wounded, carried, wounded, fallen, seated, rkm_*` (+ `drag_wounded`, transições da estação, `mg34_*`, `ckm_wz30_*`, e os seis motion clips V1 `sprint, crouch_walk, turn_left, turn_right, hit_front, near_miss_duck` ainda sem resolver).

---

## 1. Regras de escrita das pessoas (todas)

1. **Ninguém existe para explicar objetivos.** Cada pessoa tem uma tarefa própria que cumpre com ou sem o jogador (Prompt §37/§71).
2. **Contradição obrigatória.** Cada personagem tem pelo menos um par (coragem/pânico, calma/medo escondido, humor/terror).
3. **A voz reconhece-se sem ler o nome.** Cada um tem um padrão: Jan conta; Zieliński diz "depois"; Krawiec nunca explica; Kowal diz números; Bąk ri antes do perigo; Dudek "cobra"; Pawlak diz as horas; Lipski fala do horário; Rusek grita e depois cala; Hajduk fala com a arma.
4. **Ninguém fala a morrer nem faz discurso.** Combate: ≤ 6 palavras. Segurança: ≤ 2 frases.
5. **Mudança visível em atuação e gameplay**, não só em texto (Prompt §73): postura, posição, silêncio, objetos.
6. **Idiomas.** Legendas em português; áudio original em polaco (secção) e alemão (gritos distantes) quando gravado, sem sotaque caricato (política completa no documento 7).

---

## 2. Jan Wrona — ponto de vista

| Campo | Direção |
| --- | --- |
| Identidade | *strzelec* Jan Wrona, 21 anos, conscrito do Kociewie (região de Tczew). 2 Batalion Strzelców, secção fictícia do sargento Zieliński, cabeça de ponte oeste. |
| Experiência anterior | Filho de um guarda-freio. Cresceu a contar vagões da janela. Serviço militar desde a primavera; sabe atirar, nunca foi alvo. |
| Personalidade | Observador, calado. Conta coisas por hábito: vagões, degraus, tiros, segundos entre o clarão e o som. Não é herói de ação; é alguém que presta atenção. |
| Medos | Não é a morte: é não conseguir dizer o que viu. Tem medo de contar mal. |
| Motivação | Fazer o que lhe mandam bem feito; não deixar ninguém sozinho (a mensagem de Zieliński, 004: "Ele está sozinho."). |
| Relações | Respeita Zieliński sem intimidade. Leva café a Nowicki; é a única conversa pessoal da manhã. Bąk vê-o como "o que sabe as horas". Kowal ensina-lhe a alça. Krawiec manda-o correr. |
| Contradição | Quer ver tudo e, quando vê (a bomba de Nowicki a 30 m), não consegue olhar para o lugar. |
| Maneira de falar | Quase não fala. Quatro falas em toda a missão: 009 (entrega), 049 (contagem), 058 ("Presente."), e a nova **104** *"Era só para levar o café."* (opcional, no ponto de reunião, só se o jogador ficar parado 4 s junto de Zieliński depois de 018). A contagem (049) é o centro do arco. |
| Linguagem corporal (primeira pessoa) | O jogador vê as mãos: a caneca, o papel, o wz.29, a caixa, o corpo de Bąk. Depois das 06:10 as mãos tremem ligeiramente ao recarregar (apresentação; **[B]**, ViewModel). |
| Sob pressão | Faz o que lhe dizem, um pouco tarde. É por isso que a secção lhe fala tanto. |
| Evolução | Ato I: conta vagões (não dito; o ambiente conta-os por ele). Ato III: conta os clarões ("alça em mil"). Ato IV: conta os tiros contra os que perseguem o pelotão. Ato V: conta pessoas em voz alta. Chamada: responde. |
| Consequência | Vivo, sem ferimento. Diferente. |
| Continuidade | Não aparece depois de M01. |
| Rig/VO | `head_wrona`; VO só para as 4 falas; voz baixa, sem heroísmo. Polaco de referência: 009 *"Sierżant kazał to zanieść. I kawę."*; 058 *"Obecny."* |

## 3. Sierżant Marek Zieliński — líder da secção

| Campo | Direção |
| --- | --- |
| Identidade | *sierżant*, 38 anos, suboficial de carreira; anos de caserna em Tczew (o quartel de 1930). Nasceu em 1901; aos 19 esteve na guerra de 1920 (ficção plausível, sem batalhas nomeadas). |
| Função | SQUAD_LEADER. Essencial: pode ser atingido e ficar incapacitado momentaneamente, nunca morre. |
| Personalidade | Seco, protetor, sem discursos. Fala baixo quando está calmo, curto quando não está. Nunca diz "morto"; diz "depois". |
| Medo | Perder o controlo da contagem: não saber onde está cada um. É por isso que manda contar. |
| Motivação | Trazer todos de volta ao abrigo. Cumprir a ordem (as pontes) sem gastar homens para isso. |
| Relações | Trata Krawiec como igual (outra arma, mesma idade de serviço). Chama todos pelo apelido. Com Nowicki tinha implicância afetuosa (a caneca era piada da secção). Com Rusek, que não é seu, é mais duro. |
| Contradição | É o homem que mais fala de nomes e o que menos olha para os rostos. |
| Maneira de falar | Ordens de 3–4 palavras. Perguntas que são ordens ("Nowicki?"). Horas ditas em voz baixa, com o relógio de bolso na mão esquerda (objeto novo). |
| Linguagem corporal | Aponta com a mão inteira, nunca com o dedo. Baixa a cabeça dos outros com a mão (já descrito em `cs_m01_west_blast`). Conta nos dedos. Na chamada, não muda o tom ao chegar a Nowicki. |
| Sob pressão | Mais lento e mais claro. A voz desce. |
| Evolução | Entrada: calma rotineira. Ato II: "…Nowicki." (018). Ato IV: "Nos nossos, não!" (039). Ato V: "Esses já não vêm." (nova 110) e "Continuamos." (060). |
| Consequência | Mesma postura, voz mais baixa. Perdeu um homem e sabe o número exato dos outros. |
| Comportamentos que mudam o jogo (preservados) | Rotação de cobertura por salva real; mandar suprimir; mandar sair da ponte; contagem; ir buscar Jan à zona oeste. |
| Rig/VO | `head_zielinski`, `nco`, `rank_sierzant`, Vis no coldre. VO: barítono baixo, nunca grita mais de 4 palavras. Polaco de referência: 004 *"Sprawdź człowieka na posterunku. Jest sam."*; 048 *"Wrona, licz naszych. Nie strzały."*; 060 *"Idziemy dalej."* |

## 4. Kapral Paweł Krawiec — sapador

| Campo | Direção |
| --- | --- |
| Identidade | *kapral* do pelotão de sapadores destacado em Tczew (unidade histórica real; ele é fictício), 29 anos. |
| Experiência anterior | Oficina ferroviária "da linha" antes do exército (não se afirma qual). Por isso o disfarce de ferroviário dos sapadores (facto, T09) lhe servia: andou meses pelas pontes com um macacão e uma lanterna, a conhecê-las por dentro. |
| Personalidade | Meticuloso, impaciente com interrupções, humor ácido. Orgulho de ofício: a demolição é um trabalho bem feito, não uma explosão. |
| Medo | Que o trabalho de meses falhe por causa de um cabo. Que lhe perguntem o que sente. |
| Motivação | Que a linha esteja inteira quando o oficial mandar. |
| Relações | Parceria antiga com Zieliński. Chama Jan pelo apelido e manda-o correr. Com Wąs e Lenc (os seus) fala por gestos. Apanha a caneca de Nowicki e guarda-a sem dizer nada. |
| Contradição | O homem que mais conhece as pontes é o que as vai partir. Diz "é nosso" (002) das cargas e "é dele" (do avô de Lipski) da ponte, sem perceber que são a mesma coisa. |
| Maneira de falar | Técnico sem explicar. "Eu sei onde." Nunca descreve o que faz. Conta segundos entre rajadas em voz baixa (nova 120, só quando os sapadores estão `pinned`). |
| Linguagem corporal | Trabalha de costas para o rio. Mãos sujas de graxa, mangas arregaçadas, bolsa de ferramentas. Nunca olha para a câmara do jogador quando fala ("vire para o rio e não olhe para mim", 024). Apito de sinal ao pescoço. |
| Sob pressão | Deita-se com os outros (`sapper_work_pinned`) e levanta-se primeiro. |
| Evolução | Entrada: certeza (002). Choque: a linha cortada (021). Momento: "Precisamos de espaço para trabalhar!" (022, obrigatória). Perda silenciosa: a caneca na encosta. Último aviso: 050. Saída: gira a caneca e não levanta os olhos. |
| Regra (preservada) | Nenhuma cena ensina preparação, ligação ou disparo de explosivos. |
| Rig/VO | `head_krawiec`, `sapper`, `rank_kapral`. VO: voz rouca, rápida, cortando frases. Polaco de referência: 022 *"Potrzebujemy miejsca do pracy!"*; 050 *"Ostatnie wezwanie! Kto jest na przyczółku, wychodzi!"* |

## 5. Strzelec Tadeusz Nowicki — o homem do posto

| Campo | Direção |
| --- | --- |
| Identidade | *strzelec*, 22 anos, sentinela do posto avançado sob o portal ferroviário. |
| Personalidade | Brincalhão, fala com o rio quando está sozinho. A caneca amassada é dele; "foi o irmão que a amassou", segundo ele (o irmão está noutra unidade; não se diz onde). |
| Medo | Ficar sozinho. (É o que Zieliński sabe: "Ele está sozinho.") |
| Motivação | Ser lembrado como alguém de quem ainda gostam ("Então ainda gostam de mim.", 010). |
| Relações | Jan é a visita. Zieliński é a implicância. Os sapadores são os vizinhos de encosta. |
| Contradição | O que mais brinca é o primeiro a ouvir os aviões e o único que corre *para* o perigo (para avisar os sapadores). |
| Maneira de falar | Ironia leve (011). Frase curta e certa quando importa (012, 013, 066). |
| Linguagem corporal | Capacete no colo, a olhar o rio. Levanta-se devagar quando ouve (012). Corre com a caneca na mão. |
| Destino (fixo) | `missing` após a segunda bomba. O jogo não mostra corpo nem afirma morte. Na chamada ninguém responde (059 ×2). **Nenhuma proposta oferece salvá-lo.** |
| O que fica dele | A caneca (prop `dented_mug` em (−36, −3, 11)); o posto destruído ou "quase" (`forward_post_state`); os cinco minutos de conversa. |
| Rig/VO | `head_nowicki`. VO: voz clara, jovem, com riso contido. Polaco de referência: 012 *"Słyszysz? To nie pociąg."*; 013 *"Samoloty! Od wschodu, pod jasne niebo!"* |

## 6. Starszy strzelec Szymon Kowal — metralhador

| Campo | Direção |
| --- | --- |
| Identidade | *starszy strzelec*, 25 anos, atirador da rkm Browning wz.28 (carregador de 20). |
| Experiência anterior | Filho de agricultor; mede tudo em passos e em "mil metros, talvez mais". Dois anos de serviço. |
| Personalidade | Calmo, prático, fala em números e distâncias. Humor seco e raro. |
| Medo | Ficar sem munição (é literal: tem 30 cartuchos para dar a Jan e sabe-o). |
| Motivação | Calar a metralhadora dos portões. Não desperdiçar (026). |
| Relações | Âncora de estabilidade de Zieliński. Ensina Jan sem o dizer (027 → 028 de Zieliński). Passa carregadores a Jan (mecânica existente). Com Rusek, depois das 06:10, é o único que lhe responde sem gritar. |
| Contradição | O mais calmo é o único que verbaliza a perda da ponte ("…Lá se foi o outro lado.", 045). |
| Maneira de falar | Distâncias, tempos, estados da arma. "Trocando carregador!" (029). Novas: 130 *"Clarão. Esquerda do portão. Conta até três."*; 131 *"Dois carregadores. Depois é com o Wrona."* |
| Linguagem corporal | Ombros largos, cartucheiras da rkm, rosto queimado de sol. Limpa a arma na abertura (`rkm_clean`, já existente); deita-se para disparar quando pode (`rkm_prone` existe). |
| Sob pressão | Mais lento no gatilho, não mais rápido. |
| Evolução | Entrada: "Café de verdade hoje. Mau sinal." (005). Ato III: duelo com a MG dos portões. Ato IV: "…Lá se foi o outro lado." Ato V: "Agora é no norte." (061). |
| Rig/VO | `head_kowal`, `rank_st_strzelec`, `rkm_pouch`, rkm embutida com 10 clips `rkm_*`. VO: grave, pausado. Polaco de referência: 027 *"Błyski przy wagonach. Tysiąc metrów, może więcej."* |

## 7. Strzelec Józef Bąk — o recruta

| Campo | Direção |
| --- | --- |
| Identidade | *strzelec*, 19 anos, o mais novo; karabin wz.98a (mais comprido que o de Jan: o jogador vê a diferença). |
| Personalidade | Falante, nervoso, ri demais antes do perigo. Conta até dez baixinho antes de cada coisa que o assusta (tique novo; ecoa a contagem de Jan sem o saber). |
| Medo | Desmaiar à frente dos outros (006). |
| Motivação | Que Dudek cumpra o trato; mais tarde, que o levem. |
| Relações | O "trato" com Dudek (006/007) é a espinha emocional da secção. Jan é "o que sabe as horas": Bąk pergunta-lhe as horas duas vezes (novas 140/141) para não pensar. |
| Contradição | Fala demais e, ferido, diz a frase mais curta da missão (041: "Estou bem… Não. Não estou."). |
| Maneira de falar | Frases que começam a rir e acabam sérias. "Cubro você!" (030) quando Jan recarrega. |
| Linguagem corporal | Sopra o café; aquece as mãos; mexe no capacete. No tabuleiro avança demasiado (é por isso que está em `bak_wound_point` às 06:04). |
| Sob pressão | Avança sem ordem. |
| Evolução | Entrada: riso. Ato IV: ferido na coxa às 06:04 (fixo). Ramos: levado por Jan ("a dívida agora é com o Wrona"), por Dudek (que se fere), ou ileso (contingência). |
| Consequência | Vivo e ferido em qualquer caminho; evacuado para o posto de socorro da estação. Ferimento visível na coxa (sangue, rastro: padrão adulto, intensidade configurável). |
| Rig/VO | `head_bak`, `rifle_wz98a`. VO: voz jovem, acelerada. Polaco de referência: 006 *"Dudek, jak zemdleję, poniesiesz mnie?"*; 041 *"Nic mi nie jest… Nie. Jest."* |

## 8. Sanitariusz Leon Dudek — socorrista

| Campo | Direção |
| --- | --- |
| Identidade | Padioleiro-socorrista da companhia, 31 anos. Sem arma na lista (loadout vazio). |
| Experiência anterior | Enfermeiro de hospital de província antes do serviço (ficção). Sabe o que não pode fazer. |
| Personalidade | Gentil, rápido, sem dramatismo. "Cobra" tudo: cigarros, favores, carregamentos. Tem um caderno no bornal (objeto novo). |
| Medo | Chegar tarde. |
| Motivação | O trato (007). E o ferido do pátio às 04:35:30, que ele arrasta pelas axilas até à estação (já implementado: `stationDrag`). |
| Relações | Bąk (o trato); Zieliński (que o deixa ir); Jan (de quem passa a ser credor ou devedor). |
| Contradição | O homem que "cobra" é o único que dá sem contar. |
| Maneira de falar | Ordens a feridos: "Segura a perna dele! Segura, eu disse!" (017). Nunca "cura": estanca, prende, carrega. Novas: 150 *"Não olhe para a perna. Olhe para mim."*; 151 *"Devo-lhe uma. Está no caderno."* |
| Linguagem corporal | Ajoelha-se sempre do lado da ferida. Arrasta de costas (`drag_wounded`). Com o braço ferido (ramo), usa só o direito. |
| Regra (preservada) | Não ressuscita ninguém; não trata ferimento grave num segundo. |
| Evolução | Ato II: o ferido da estação (ouvido de longe). Ato IV: Bąk. Ramo: ferido no braço às 06:14. Saída: "Presente." ou "na estação". |
| Rig/VO | `head_dudek`. VO: voz quente, sem urgência fingida. Polaco de referência: 007 *"Poniosę. Potem policzę."*; 042 *"Bąk leży! Niech mnie ktoś osłoni!"* |

## 9. Strzelec Stanisław "Staszek" Pawlak — mensageiro

| Campo | Direção |
| --- | --- |
| Identidade | *goniec*, 18 anos, ligação a pé entre a secção, o posto de comando e o pelotão leste. Sem rádio. |
| Personalidade | Rápido, ofegante, repete ordens palavra por palavra. Diz sempre a hora antes do conteúdo (tique novo): "Cinco e meia. Ordem do comandante do batalhão…" |
| Medo | Esquecer-se de uma palavra. |
| Motivação | Entregar exato. É a voz da cadeia de comando: por ele os oficiais históricos ficam fora de cena sem deixarem de existir. |
| Relações | Zieliński manda-o ("Pawlak, vai.", 032). Kowal dá-lhe água quando chega. Vê o pelotão leste de perto antes de todos (037). |
| Contradição | É quem mais vê (atravessa a batalha) e quem menos conta. |
| Maneira de falar | Frases inteiras, decoradas, sem vírgulas. Novas: 160 *"Quatro e quarenta e cinco. Trem na cabeça de ponte leste…"* (prefixo opcional da 025, só se a gravação o permitir sem alterar o texto canónico) ; 161 *"Do outro lado, o tenente mandou dizer… só isto: aguentem."* |
| Linguagem corporal | Chega abaixado (`crouch_walk` quando resolvido), fala com as mãos nos joelhos, parte a correr (`sprint`). |
| Evolução | Entrada: mensageiro. Ato IV: traz a ordem e a pressão. Ato V: traz Bąk/Dudek à estação (056b). Saída: diz a hora mais baixo. |
| Rig/VO | `head_pl_a` (variação jovem). VO: respiração audível. Polaco de referência: 033 *"Rozkaz dowódcy batalionu: zniszczyć mosty. Pluton z tamtej strony wycofuje się pierwszy."* |

## 10. Franciszek Lipski — ferroviário (civil)

| Campo | Direção |
| --- | --- |
| Identidade | *Dyżurny ruchu* (encarregado de circulação) da estação de Tczew, 56 anos. Civil. |
| Personalidade | Metódico, orgulhoso da ferrovia e da ponte. Fala do horário como quem fala de família. |
| Medo | A linha calada. (Szymankowo "não responde".) |
| Motivação | Manter a circulação. Depois, as carroças de feridos. |
| Relações | Avisa Jan ou Zieliński (008/019). Conhece Krawiec "de o ver nas pontes com macacão" (nova 170: *"O senhor cabo andou meses nos meus pilares de lanterna. Eu sabia."*). |
| Contradição | Trabalha até ao fim do bombardeio, numa estação que está a ser bombardeada. |
| Maneira de falar | Horas de comboios, nomes de estações. Novas: 171 *"Szymankowo continua sem responder."* (após 04:36, se o jogador passar a 15 m); 052 preservada. |
| Linguagem corporal | Lanterna na mão (04:31); relógio de bolso; boné de serviço. Nunca empunha arma. Depois das 06:45, parado junto ao barracão a olhar a ponte (já descrito). |
| Destino | Vivo, a ajudar com as carroças. |
| Rig/VO | Sem rig civil no kit: usar o rig polaco sem equipamento militar e `cap_wz37` substituída por boné de serviço **[B]** (nova malha pequena) ou, até lá, `head_pl_a` + variação de cor "civil" (Soldier Visual Variation). VO: voz madura, lenta. Polaco de referência: 052 *"Mój dziadek chodził po nim na jarmark."* |

## 11. Novas identidades para vagas existentes

### 11.1 Strzelec Antoni Rusek — "o homem do outro lado" (`east_platoon_voice`)

| Campo | Direção |
| --- | --- |
| Identidade | *strzelec*, 24 anos, de Starogard; pelotão da cabeça de ponte leste (unidade real; ele fictício). Municiador da ckm que "perderam" (037). |
| Personalidade | Grita a correr e cala-se parado. Chega sujo de terra e fuligem, com o uniforme rasgado no ombro e a cara preta. |
| Medo | Ter deixado a arma. |
| Motivação | Que alguém pague pela guarnição. |
| Relações | Ninguém da secção o conhece. Zieliński trata-o como se fosse seu. Kowal fala-lhe de arma para arma. |
| Contradição | O mais corajoso da manhã (atravessou 1 km de tabuleiro sob fogo) é o que quase comete a única crueldade da missão. |
| Maneira de falar | 040 (canónica, a correr). Novas: 180 *"Caíram todos na ckm. Todos. Eu estava a carregar."* (parado, à trincheira, uma vez); 181 *"Estão ali. A rastejar. Deixe-me."*; 182 (depois de 110 de Zieliński) silêncio: a fala é não dizer nada. |
| Comportamento | Chega entre 06:06 e 06:09 (`withdrawingPlatoon` a <25 m do jogador já dispara a 040). Depois das 06:10 fica junto de `cv_trench_1`; vira-se para leste e levanta a arma 4 s (**[B]**); Zieliński 110. Não vai à chamada (é de outro pelotão: fica no posto de socorro ou com o seu pelotão). |
| Rig/VO | `head_pl_a` + variação "sujo/fuligem" (atlas). VO: voz rouca de gritar. Polaco de referência: 040 *"Nie stawajcie! Oni są na moście, za nami!"* |

### 11.2 Guarnição da ckm wz.30 (`grp_ckm_crew`: `ckm_gunner`, `ckm_loader`, `ckm_reserve`)

| | Kapral **Wiktor Hajduk** (atirador, 40) | Strzelec **Mieczysław Cyra** (municiador, 27) | Strzelec **Olek Piszczek** (reserva/água e caixas, 19) |
| --- | --- | --- | --- |
| Experiência | Veterano de 1920 (sem batalhas nomeadas). Conhece a arma melhor do que o batalhão. | Ferreiro de aldeia. Cuida da fita como de uma correia de máquina. | Primeiro ano. Encarregado do refrigerador e das caixas. |
| Personalidade | Fala com a arma, não com as pessoas. | Pouco de falar, tudo de mãos. | Pergunta tudo. |
| Medo | Deixar a arma. | Que a fita encrave. | O barulho dentro da casamata. |
| Contradição | O homem mais obediente da missão é o que mais custa a mandar sair. | — | Tem mais medo do silêncio da arma do que do fogo. |
| Falas (novas) | 190 *"Esta não fica. Vem connosco."* (ao abandonar, 06:10+3 s); 191 *"Água fora. Caixas. Vai."* | 192 *"Fita no meu ombro. Não puxes."* | 193 *"Capral, e se eles atravessarem?"* → Hajduk: 194 *"Então é por isso que a levamos."* |
| Comportamento | Já na simulação: `idle` (casamata), `abandon` 3 s após `evt_m01_east_demolition`, `retreat` para fora de `bz_west`. Proposta **[C]**: transportar a arma visível (tripé/corpo/caixa) com clips do kit ckm quando existirem. | | |
| Regra | A ckm **não dispara** no jogo até a simulação o decidir (pendente, não inventar). O áudio tem o perfil pronto. | | |
| Rig/VO | Rig polaco; `head_pl_a` com variações de idade (atlas). VO: Hajduk grave e lento; Piszczek agudo. | | |

### 11.3 Sapadores (`sapper_2`, `sapper_3`)

| | Saper **Bronisław "Bronek" Wąs** (34) | Saper **Henryk Lenc** (20) |
| --- | --- | --- |
| Função | O silencioso. Trabalha de joelhos sem levantar a cabeça. Mastiga um fósforo apagado (nunca fuma perto do trabalho). | O corredor. Leva recados de Krawiec, enche o cantil, olha para o rio quando não deve. |
| Medo | Não tem tempo para isso. | Ser deitado pela MG outra vez. |
| Falas (novas) | 200 *"Cabo. Pronto aqui."* (só quando o reparo passa 50 %); 201 (quando `pinned`): respira alto, sem palavras — VO de respiração. | 202 *"Outra vez não…"* (quando `pinned` pela terceira vez); 203 *"Cabo, posso olhar?"* → Krawiec: 024 já diz tudo. |
| Comportamento | Já na simulação: `sapper_work` / `sapper_work_pinned`; presentes na chamada (`stageRollCall`). | |

### 11.4 O ferido do pátio (`generic_rifleman`, `STATION_PATIENT`)

Não recebe nome (é também o falante genérico de 016). Recebe identidade ambiental: capacete caído a dois metros, uma bota descalça, o rastro no cascalho até à estação (decal **[B]**). Dudek fala-lhe (017). É a primeira imagem do custo da guerra que o jogador vê a 300 m.

### 11.5 Os alemães (retrato coletivo, sem nomes)

Pioneiros do PiBtl 41 e guardas de fronteira. A 1,05–1,2 km são clarões, fumo da boca, traçantes, silhuetas junto dos vagões e do dique. A 700 m, depois das 06:10, são homens que recuam a carregar outros, e homens que ficam. Nunca têm close. Nunca gritam audivelmente (distância). Podem hesitar: a cadência das MGs cai quando suprimidas (já na simulação). Não são monstros; são a outra ponta da distância.

### 11.6 Pessoas históricas (fora de cena, inalterado)

Janik, Juchtman, Faterkowski, Medem, Dilley: sem modelo, sem fala. Existem como "o comandante do batalhão", "o oficial dos sapadores", "o pelotão do outro lado", "o trem". Nomes só no debrief, nos parágrafos habilitados.

---

## 12. Mapa de relações (atualizado)

```
                Zieliński ── responsável por todos; parceiro de Krawiec; relógio de bolso
                 │   ├─ Kowal (estável; carregadores para Jan; responde a Rusek)
                 │   ├─ Pawlak (a hora; a cadeia de comando)
                 │   ├─ Bąk ⇄ Dudek (o "trato" · o caderno)
                 │   ├─ Nowicki ── a caneca ── Jan (o café) ── Krawiec (a guarda)
                 │   └─ Jan (conta)
                 │
    Krawiec ── Wąs, Lenc (gestos; "Pronto aqui.")   Lipski (civil) ── a linha; conhece Krawiec "de o ver nas pontes"
                 │
    Hajduk ── Cyra, Piszczek (a arma; a casamata)   Rusek (de fora; a raiva; Zieliński contém; Kowal responde)
```

---

## 13. Evolução psicológica por ato (tabela de atuação)

| Personagem | I Café | II Poeira | III Mil metros | IV Contra o sol | V O corte / chamada |
| --- | --- | --- | --- | --- | --- |
| Jan | Observa | Obedece tarde | Aprende a alça | Carrega ou não | Conta; "Presente." |
| Zieliński | Calmo, baixo | Conta a secção; "…Nowicki." | Ordens de fogo | Rotação; "Nos nossos, não!" | "Esses já não vêm."; "Continuamos." |
| Krawiec | Certeza | A linha cortada; a caneca | "Precisamos de espaço!" | Prepara o apito | "Última chamada!"; caneca nas mãos |
| Nowicki | Ironia | Corre; desaparece | — | — | Silêncio ×2 |
| Kowal | Limpa a rkm | Levanta a mão | Rajadas curtas; carregadores | "Trem blindado!"; "…Lá se foi." | "Agora é no norte." |
| Bąk | Ri | Pálido | "Cubro você!" | Ferido | Ausente / "Presente." |
| Dudek | "Depois cobro." | Arrasta o ferido do pátio | Volta ao posto | Bąk; braço | Credor ou "na estação" |
| Pawlak | — | — | Trem; reparo pronto; "vai" | A ordem sob o raid; pressão | A hora mais baixa |
| Lipski | Lanterna; Szymankowo | Trabalha sob bombas | — | Carroças | "O meu avô…" |
| Rusek | — | — | — | Chega a gritar | Levanta a arma; cala-se |
| Hajduk/Cyra/Piszczek | Invisíveis (casamata) | — | — | — | Saem com a arma; passam por Jan |
| Wąs/Lenc | Ronda na encosta | Ajoelhados na cratera | Deitados dezenas de vezes | — | Sentados na chamada |

---

## 14. Direção de elenco e voz (para a gravação futura)

- **Idioma:** polaco para toda a secção, Lipski e Rusek; alemão só para gritos distantes **inaudíveis a 700 m** (não gravar: o áudio usa clarões e cadência). Legendas em português no formato `NOME: fala` (já implementado pelo HUD V1).
- **Casting:** vozes polacas nativas ou falantes fluentes; sem sotaque caricato; sem imitar vozes de jogos conhecidos; licença explícita por ator (ASSET_CREDITS).
- **Direção de gravação:** gravar em três estados por fala quando houver variação (calmo / sob fogo / exausto), respiração incluída; nunca "voz de rádio" (não há rádio na secção).
- **Prioridade de mixagem:** avisos de demolição e ordens de proteção > estado de missão > resposta a personagem > ambiente (seis camadas do PR #44, `DIALOGOS_REATIVOS_...V3.md` §2, adotadas).
- **O que não gravar:** monólogos, "citações" de comandantes históricos, insultos nacionais, humor sobre Szymankowo.
