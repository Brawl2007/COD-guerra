# M21 — FLORESTA · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 2/11/1944, Vossenack, região de Hürtgen; 112.º Regimento de Infantaria, 28.ª Divisão; POV Victor Allen; fonte H20; 22–29 min; três falas; checkpoints "orientação; acesso à povoação; corredor de evacuação; posição final — salvar rotas, feridos e destruição"; relevo e obstáculos definem quem vê/atira; inimigos não enxergam através da mata; rebentamentos entre árvores legíveis (assobio, impacto, tronco, estilhaços, reação dos homens), sem morte arbitrária; carregadores com tarefas próprias que precisam de passagem real; o final: um carregador tira lama da maca; o homem dado como desaparecido só perdeu a rota, outro não voltou; "sem afirmar que toda a campanha de Hürtgen foi vencida naquele dia". **Proposto:** Allen no 2.º Batalhão do 112.º (S-C07: o 2/112 toma Vossenack e a crista na tarde de 2/11 a partir de Germeter — P-C21), o mapa molhado como objeto, a cobertura contra rebentamento em copa como aprendizagem (encostar ao tronco, não deitar), a rota de evacuação pela ravina como decisão (`m21.evac_route`), Halvorsen `found` / Ames `missing`, o ferido Brenner (proposta deste dossiê; acrescentar a CONTINUITY §4). **Sistemas:** [C] artilharia com dano em árvores (copa, tronco, queda de galhos) e oclusão sonora por relevo/mata; [A] tudo o resto.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m21_vossenack` / 21 |
| Datas | 1944-11-02T09:00+01:00 → 1944-11-02T18:30+01:00 (hora da Europa Central; o horário de verão alemão terminou a 2/10/1944) |
| Local | orla de Germeter (posições de partida) → pinhal denso com uma ravina lateral e um ribeiro → clareira/campos abertos a subir para a crista de Vossenack → primeiras casas a oeste da povoação (cruzamento, celeiro, casa com cave) — `RECONSTRUCTED` (P-C21: companhia; a ravina de evacuação **não é o trilho do Kall**, usado a 3/11 pelos outros batalhões; é um talvegue lateral a norte do eixo Germeter–Vossenack) |
| Operação | ataque da 28.ª DI de 2/11 (109.º a norte para Hürtgen; 110.º a sul para Simonskall; 112.º: o 2/112 toma Vossenack e a crista na tarde de 2/11; a crista é perdida a 6/11 ao 156.º PzGren; 6 184 baixas da divisão na campanha — S-C07, DOCUMENTED em resumo) |
| Unidade | 112.º Reg., 28.ª DI (canónico) → 2.º Batalhão (proposta, RECONSTRUCTED) → esquadra de Allen |
| Elenco | cabo Victor Allen (POV), staff sergeant Earl Pruitt (graduado), pte. Amos Teague (carregador/maqueiro da companhia), pte. Dick Halvorsen (o que se perde e volta), pfc. Wendell Ames (o que não volta), pte. Carl Brenner (ferido — proposta deste dossiê), um segundo maqueiro (pfc. Lyle Osgood — proposta), um tenente de pelotão só por voz/rádio (ten. Harker — proposta), um estafeta da companhia da direita (propostas) |
| Fora de cena | gen. Norman Cota; o comandante do batalhão; os blindados do 707.º Tank Bn (só por som na estrada de Germeter — R, P-C21) |
| Intocável | data, local, unidade, POV, falas `dlg_m21_001–003`, os quatro checkpoints (salvar rotas, feridos e destruição), mata/ravinas/campos/povoação diferenciados ("não plantar árvores sobre um grid plano"), oclusão simétrica, rebentamento legível sem morte arbitrária, carregadores com tarefas próprias, Halvorsen só perdeu a rota, Ames não voltou, "sem vitória de Hürtgen" |

---

## 1. Story Bible

**Logline.** Num pinhal onde o som chega de onde não devia e a crista que se tem de tomar mal se vê, Victor Allen aprende que a primeira arma é o mapa molhado e a segunda é o tronco de uma árvore. Entre rebentamentos acima das copas, uma esquadra avança para Vossenack, abre uma passagem numa ravina para que uma maca não fique na terra encharcada e segura um cruzamento enquanto o batalhão se reorganiza. À noite, Teague tira a lama da maca para o ferido não escorregar. Halvorsen aparece por outro talvegue, com homens de outra esquadra. Ames foi mandado a Germeter de manhã e não chegou.

**As oito respostas.**
1. **Situação central:** a floresta não deixa ver; a artilharia rebenta nas copas; evacuar (MASTER-STORY-BIBLE §4).
2. **Modo de contar:** as padiolas que passam — a guerra conta-se pelo que sai da mata, não pelo que entra.
3. **Objeto:** o mapa molhado de Allen (o papel enrola, a tinta corre; a crista desenhada e a crista real não coincidem com a mesma luz).
4. **Silêncio:** depois do rebentamento na copa — o ouvido ocluído, as agulhas a cair, o único som é o dos homens a chamar-se.
5. **Tarefa que não é matar:** confirmar a direção; observar; escolher a cobertura certa; abrir uma rota; dar passagem aos maqueiros; carregar; contar quem voltou.
6. **Custo humano:** Brenner, ferido por estilhaço na anca durante o rebentamento, pede para não ficar na terra encharcada ("Não me deixem na água. Com a terra assim não aguento até à noite.") (causa: a lama e a hipotermia são reais) → Teague procura uma rota coberta pela ravina / Pruitt manda avançar porque a companhia tem a hora da crista ("A hora é a hora. Os maqueiros tratam disso.") → o jogador escolhe gastar os minutos a abrir a rota com Teague ou seguir Pruitt → `m21.evac_route = ravine | exposed`. Em `exposed`, os maqueiros levam Brenner pelo trecho aberto mais tarde, uma salva cai perto (≥ 30 m, sem morte), Brenner chega ao posto mas Teague diz a fala 003 com raiva; em `ravine`, a maca passa antes do ataque e Teague diz 003 como pedido de passagem, não como acusação. Nenhum ramo mata Brenner; nenhum ramo "ganha".
7. **Pessoas históricas:** Cota fora de cena; o batalhão e os blindados só por voz e som.
8. **Debrief:** regista que o 2/112 tomou Vossenack e a crista na tarde de 2/11, que os outros batalhões atravessaram o Kall nos dias seguintes, que a crista foi perdida a 6/11 e que a 28.ª DI teve 6 184 baixas na floresta; Halvorsen `found`, Ames `missing`; "um cruzamento seguro; nenhuma floresta vencida".

**Três motivos.** (a) *A direção* — "Confirme a direção antes de andar." (001): cada deslocamento começa por um ponto de referência real (ribeiro, clareira, trilho, crista); (b) *o tronco* — contra o instinto de se deitar, encostar-se à árvore; o jogo ensina pela reação dos homens, não por tutorial; (c) *a passagem* — "Preciso da passagem, não de mais homens aqui parados." (003): a ajuda que serve é abrir caminho, não acumular gente.

**Temas.** Perceção sob floresta; desorientação genuína sem esconder a informação necessária; a terra encharcada como inimigo; a diferença entre perder-se e não voltar; o desgaste como resultado, não o triunfo.

**Estrutura (§54).** CONTEXTO → INTRO (o mapa molhado; Pruitt e a crista que mal se vê; sons distantes que parecem próximos) → APROXIMAÇÃO (acesso pesquisado pela mata até à posição de observação; o ribeiro, a clareira) → DIÁLOGO (Ames mandado a Germeter como estafeta) → PRIMEIRO CONTATO (apoio ao avanço: quem vê, atira) → ESCALADA (o fogo acima das árvores; Brenner ferido; Halvorsen desaparece no fumo) → COMBATE PRINCIPAL (a ravina: abrir a rota; os maqueiros) → SET-PIECE (a maca passa / o trecho exposto) → PAUSA (a orla: Vossenack ouve-se diferente) → CLÍMAX (o cruzamento; pressão repelida; reorganização) → CONSEQUÊNCIA (a lama na maca; Halvorsen; Ames) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Allen | mapa molhado; julga que vê a crista | Pruitt; Teague | o rebentamento; a ravina; contar quem voltou | aprende a confirmar antes de andar e que ajudar é abrir passagem | no cruzamento, à noite, com dois nomes por resolver |
| Pruitt | "Confirme a direção antes de andar." (001) | esquadra | a hora da crista vs Brenner | não muda; cumpre a hora e leva a esquadra inteira (menos Ames) | vivo; reorganiza |
| Teague | maqueiro com tarefa própria | Brenner | a passagem | — | tira a lama da maca |
| Halvorsen | fala muito; conta os passos | Allen | perde-se no fumo | volta com outra esquadra, sem heroísmo | `found` |
| Ames | "O fogo está acima das árvores!" (002) — a última fala dele | Allen | estafeta a Germeter | — | `missing` (nunca mostrado) |
| Brenner | ferido às 10:40 | Teague | a terra encharcada | — | evacuado (ravina: cedo; exposto: tarde) |
| Osgood | segundo maqueiro | Teague | — | — | vivo |

**O que a missão recusa.** Árvores em grelha; nevoeiro total para esconder geometria; IA que vê através da mata; morte do jogador por efeito invisível; o trilho do Kall (é de 3/11); tanques em cena; Cota; "Hürtgen vencida"; um Ames morto em cena; um Halvorsen herói; corrida de minigame.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "O mapa molhado" (`cs_m21_intro`, ≤ 70 s)
2 09:00 · 3 orla de Germeter: buracos com troncos por cima, lama, pinhal denso a leste; a crista de Vossenack a 1,5 km, uma linha mais escura sob nuvens baixas; a preparação de artilharia americana acaba de terminar · 4 manhã de chuva fria, nuvens baixas, luz cinzenta sem sombras (D geral) · 5 Allen, Pruitt, Teague, Halvorsen, Ames, Brenner, Osgood; outras esquadras nos buracos · 6 Cartela: GERMETER — FLORESTA DE HÜRTGEN — 2 DE NOVEMBRO DE 1944 — 09:00 · 112.º REGIMENTO DE INFANTARIA · 28.ª DIVISÃO. Allen tem o mapa na mão; a chuva enrola o papel; Pruitt aponta uma crista que mal se vê e pergunta: "Vês a crista? Qual delas?" Allen aponta; Pruitt corrige meio palmo: "Essa é a de trás." Um rebentamento ao longe soa perto: Halvorsen baixa-se; Pruitt não. Pruitt: "Confirme a direção antes de andar." (001). Teague e Osgood verificam a maca (correias, lama já). · 7 estabelecer que o som mente e o mapa só serve com um ponto real; o objeto · 8 olhar; dobrar o mapa (interação) · 9 — · 10 — · 11 artilharia alemã esparsa (longe) · 12 buracos com troncos, botas a secar inúteis, o mapa · 13 `dlg_m21_001` (canónica), `010–014` · 14 chuva nas agulhas e nos capacetes; o rebentamento que parece perto (oclusão invertida) · 15 beat: o mapa a enrolar (2 s); plano da crista sob nuvens · 16 `missionStart` · 17 Pruitt: "Vamos. Pelo ribeiro." · 18 — · 19 [A] cutscene; [C] oclusão sonora como parâmetro de cena · 20 abre com a água de M20 transformada em chuva nas copas (AUDIO: transição IV → V)

### Cena 2 — "Pelo ribeiro" (jogável; `obj_m21_orient`)
2 09:10–10:00 · 3 pinhal denso (troncos a 2–3 m, visibilidade 15–40 m), um trilho de madeireiros, um ribeiro que corre para sul (referência), uma clareira de corte com cepos, uma ravina lateral a norte (vista de cima, ainda não usada); a posição de observação é um afloramento na orla leste do pinhal · 4 chuva; luz filtrada · 5 esquadra; a esquadra da direita a 60–120 m (só vozes e silhuetas); nenhum alemão em contacto · 6 Deslocar-se por um acesso pesquisado até à posição de observação preservando ligação com o grupo: **orientação por referências reais** — o jogador confirma a direção em três pontos (interação: "confirmar" com o mapa — o trilho, o ribeiro, a clareira); se andar sem confirmar, Pruitt chama ("Allen. Direção.") e o grupo pára: custo em tempo, nunca em dano; os sons distantes parecem próximos (um morteiro a 800 m soa a 200 m: a oclusão invertida é o jogo); a ligação com a esquadra da direita faz-se por voz (chamada curta de Halvorsen; resposta) · 7 §79 ponto 1 ("diferenciar mata, ravinas, campos e povoação, em vez de plantar árvores sobre um grid plano") · 8 navega; confirma três pontos; chama a direita · 9 trilho (rápido, lama, visível de cima) vs ribeiro (lento, coberto) · 10 Pruitt confirma/corrige; Halvorsen conta os passos em voz alta; Ames à retaguarda; Teague e Osgood com a maca vazia · 11 nenhum ativo (artilharia como dados, longe) · 12 cepos, um carro de madeireiro, uma fita branca velha (lane de minas de outro batalhão: "não sair da fita" — Teague) · 13 `dlg_m21_015–021` · 14 chuva nas copas; o ribeiro; ecos por ravinas; morteiros longe que soam perto · 15 livre · 16 start · 17 chegada ao afloramento (`evt_m21_op_reached`) · 18 `cp_m21_a_orientacao`; `m21.orientation_confirmed` (3/3, 2/3…) · 19 [A] navegação; [B] "confirmar direção" como interação de estado; [C] oclusão sonora por relevo/mata com ecos · 20 —

### Cena 3 — "Quem vê, atira" (jogável; `obj_m21_support_advance`)
2 10:00–10:40 · 3 afloramento na orla; campos abertos a subir para a crista (300 m de erva alta, cercas, um caminho); a primeira fiada de casas de Vossenack à esquerda, a 400 m; uma sebe baixa onde estão alemães (só visíveis de dois pontos) · 4 chuva mais fina; nuvens baixas; a crista agora vê-se · 5 esquadra; dois pelotões do batalhão a avançar pelos campos (proxies, 20–30); alemães: uma MG 42 na sebe e 6–8 infantes; morteiros alemães (dados) · 6 Apoiar o avanço a Vossenack: do afloramento, o jogador só vê a MG de dois pontos (o relevo define quem vê); mudar de ponto expõe-no por 5 s a cada mudança (aviso de Pruitt); Ames é mandado a Germeter como estafeta às 10:20 (o rádio SCR-300 do pelotão só apanha a companhia, não o batalhão) — a última vez que se vê Ames, de costas, no trilho; o avanço pelos campos avança por agenda e pára quando a MG dispara; o fogo da esquadra (BAR de Halvorsen + Garands) permite que o pelotão retome; os alemães da sebe recuam para as casas (não "morrem todos") · 7 §79 ponto 2 ("Relevo e obstáculos definem quem consegue ver/atirar; inimigos não enxergam automaticamente através da mata") · 8 escolhe o ponto de tiro; dispara (150–300 m); muda de ponto; manda Ames? (não: Pruitt manda; o jogador só vê) · 9 ponto alto (vê a MG; exposto) vs ponto baixo (vê só a sebe; coberto) · 10 Pruitt dirige o fogo; Halvorsen com a BAR; Ames parte; Teague/Osgood atrás do afloramento · 11 MG 42 (dados; só dispara sobre quem vê); infantes; morteiros por agenda (≥ 30 m) · 12 cercas, erva alta, a sebe, as casas · 13 `dlg_m21_022–028` · 14 MG abafada pela crista; Garands a 2 m; morteiros nos campos (longe/médio); o rádio · 15 livre · 16 CP-A · 17 pelotão retoma e a MG recua (`evt_m21_mg_withdrawn`) · 18 `m21.ames_sent = true` (fixo) · 19 [A] fogo como dados, linhas de visão por relevo; [B] pontos de tiro com exposição temporizada · 20 Ames nunca reaparece

### Cena 4 — "O fogo está acima das árvores" (jogável; `obj_m21_treeburst_cover`) — **set piece**
2 10:40–10:55 · 3 recuo para a orla do pinhal (ordem de Pruitt: "Para dentro, a artilharia deles vem aos campos") → sob as copas: a artilharia alemã (observada da crista de Brandenberg-Bergstein: D em resumo) rebenta **nas copas** · 4 chuva; luz filtrada; fumo entre troncos · 5 esquadra; outras esquadras na mata (vozes) · 6 **Sequência legível:** assobio (2 s) → rebentamento na copa (≥ 30 m do jogador na primeira salva) → estilhaços e galhos a cair → reação dos homens (Pruitt grita a instrução; Halvorsen deita-se por instinto; Brenner deita-se e é atingido na anca por estilhaço de uma salva seguinte — evento fixo às 10:46, não evitável pelo jogador, **nunca** anunciado como evitável); **a cobertura certa é o tronco, não o chão**: deitar-se na clareira/trilho sob rebentamento em copa = supressão forte e aviso ("Levanta-te! Ao tronco!"), danos só após dois avisos e sempre ≥ 30 m do rebentamento (regra `safeImpact`); encostar-se ao tronco ou entrar num buraco com tronco por cima = seguro; a salva dura 90 s por agenda (três cadências); no fumo, Halvorsen corre pelo talvegue errado (desaparece: `evt_m21_halvorsen_lost`) · 7 §79 ponto 3 ("não matar o jogador arbitrariamente por um efeito invisível") · 8 encosta-se a um tronco (interação de cobertura vertical) ou entra num buraco; chama Halvorsen (sem resposta) · 9 tronco vs buraco (ambos seguros; o buraco não deixa ver Brenner) · 10 Pruitt instrui; Ames já não está; Teague e Osgood rastejam para Brenner com a maca; Halvorsen desaparece · 11 artilharia alemã (dados, agenda de 90 s; impactos em copas com queda de galhos) · 12 copas desfeitas, galhos no chão, um tronco partido que atravessa o trilho (será obstáculo na cena 5) · 13 `dlg_m21_002` (Halvorsen, no momento em que se deita — a última fala dele antes de se perder; ver §12, correção 1), `029–035` · 14 **assobio → rebentamento em copa → estilhaços e galhos → silêncio ocluso (ouvido tapado 3 s, agulhas a cair) → chamadas** (AUDIO §4) · 15 livre; o fumo reduz a visibilidade a 10 m sem apagar a geometria · 16 `evt_m21_barrage` · 17 fim da salva (`evt_m21_barrage_end`) · 18 `m21.treeburst_cover_learned` (se nunca precisou de segundo aviso); `m21.brenner_wounded = true` (fixo); `m21.halvorsen_status = lost` · 19 [C] artilharia com dano em árvores (copa; tronco atingido; queda de galhos com colisão); oclusão auditiva pós-impacto; [A] `safeImpact`, suppression, avisos · 20 Brenner → cena 5; Halvorsen → cena 8

### Cena 5 — "A passagem" (jogável; `obj_m21_open_evac`, `obj_m21_carry`) — **custo humano**
2 10:55–11:45 · 3 a ravina lateral a norte: talvegue com ribeiro, taludes de 3–4 m, troncos caídos, uma posição alemã abandonada (buraco com MG retirada, latas, uma fita de minas alemã) — e, em alternativa, o trecho aberto do caminho dos campos (200 m visíveis da crista inimiga) · 4 chuva; a ravina mais escura · 5 esquadra (sem Ames, sem Halvorsen); Teague e Osgood com Brenner na maca; mais duas macas de outra esquadra à espera (proxies) · 6 Brenner, na maca, pede: "Não me deixem na água." Teague: "Há uma ravina. Se alguém abrir o tronco e verificar o buraco, passa coberta." Pruitt: "A hora é a hora. Os maqueiros tratam disso." **Decisão:** (a) ajudar Teague a abrir a rota pela ravina — remover o tronco partido (dois homens: Allen + Osgood), verificar a posição abandonada (interação: olhar, retirar a fita de minas alemã **sem** a pisar: a fita marca o lado minado), marcar a passagem com a fita branca (3 estacas) → as macas passam cobertas antes do ataque (`m21.evac_route = ravine`); Pruitt espera 10 min com má cara e segue; (b) seguir Pruitt: os maqueiros ficam à espera de passagem; levam as macas pelo trecho aberto depois, sob observação; uma salva cai a ≥ 30 m; Brenner chega ao posto 40 min mais tarde (`m21.evac_route = exposed`); **carregar** (opcional): o jogador pega na frente da maca 80 m na ravina (lento; os outros cobrem) · 7 §79 ponto 4 ("carregadores que se movimentam por tarefas próprias e precisam de passagem real") · 8 escolhe; remove tronco (a dois); verifica a posição; marca; carrega (opcional) · 9 ravina / exposto; carregar / cobrir · 10 Teague e Osgood têm agenda própria (vão pela rota aberta; não esperam ordens do jogador); Pruitt cronometra; Brenner fala pouco · 11 nenhum em contacto na ravina; morteiros por agenda sobre o trecho aberto · 12 tronco, buraco abandonado, latas, fita alemã, fita branca nova · 13 `dlg_m21_003` (Teague, em dois tons conforme ramo), `036–046` · 14 ribeiro; o tronco a arrastar; respiração sob a maca; morteiros longe · 15 livre; beat fixo na maca a passar sob o talude (3 s) · 16 barrage end · 17 macas passaram (ravina) ou Pruitt avança (exposto) (`evt_m21_evac_decided`) · 18 `cp_m21_c_corredor` ("corredor de evacuação" — salva a rota, as macas e o tronco removido); `m21.evac_route`; `m21.player_carried`; `m21.teague_passage_given` · 19 [A] maca a dois, obstáculo a dois (M01/M16); [B] "verificar posição", marcar com fita; [D] minas como **zona marcada** (nunca mina invisível que mata: a fita alemã e um aviso de Teague são o limite) · 20 `evac_route` lido no debrief e em M22? **não** (POV diferente); fica no registo da campanha

### Cena 6 — "Acesso à povoação" (jogável; `obj_m21_reach_village`)
2 11:45–13:30 (escala acelerada; `readyScale`) · 3 da orla pelos campos até às primeiras casas a oeste de Vossenack: a sebe (abandonada), um caminho com cercas, um celeiro, o cruzamento, a casa com cave; a povoação tem a igreja a leste (silhueta, a 600 m, não é objetivo) · 4 chuva a parar; nuvens; luz um pouco mais alta · 5 esquadra; o pelotão à direita (proxies) a entrar pelas casas; alemães a recuar casa a casa (dados) · 6 Avançar pelos campos com o pelotão usando o relevo (um talude de caminho e as cercas dão cobertura real; o campo aberto é visto da crista: morteiros por agenda sobre quem fica parado > 10 s); limpar o celeiro (2 alemães que se rendem? **não** — recuam pela porta de trás; um ferido alemão fica no celeiro e é deixado ao posto: "deixem-no, os maqueiros tratam dele" — sem custódia, M19 já fez esse momento); chegar ao cruzamento · 7 §79 ponto 2/5: o acesso ao ponto local · 8 avança por taludes/cercas; dispara (40–120 m); entra no celeiro; alcança o cruzamento · 9 celeiro pela porta (rápido) vs pelo lado (coberto) · 10 Pruitt; Teague/Osgood já no posto (ravina) ou ainda à espera (exposto: chegam ao cruzamento com a maca mais tarde, por agenda) · 11 recuo alemão casa a casa (dados; nunca spawn atrás do jogador) · 12 cercas, sebe abandonada com cartuchos, celeiro com feno molhado, o ferido alemão · 13 `dlg_m21_047–052` · 14 morteiros nos campos; Garands; a chuva a parar; Vossenack soa diferente ("o horizonte do qual se partiu já soa diferente" — PR #44): a mata atrás, agora, parece calada · 15 livre · 16 evac decided · 17 cruzamento alcançado (`evt_m21_crossroads`) · 18 `cp_m21_b_acesso` ("acesso à povoação") · 19 [A] · 20 —

### Cena 7 — "O cruzamento" (jogável; clímax; `obj_m21_secure_point`, `obj_m21_reorganize`)
2 13:30–16:30 (escala acelerada entre pressões) · 3 o cruzamento: casa com cave (posto da esquadra), celeiro, muro de pedra, o caminho para leste (povoação) e o caminho para sul (ligação com a companhia da direita); a crista a leste sob fogo (médio) · 4 tarde cinzenta; chuva volta intermitente; a luz cai depois das 16:00 · 5 esquadra; a companhia da direita a 200 m (proxies); alemães: duas pressões (infantaria + MG + morteiros) às 14:10 e 15:40 do lado leste; artilharia alemã sobre a crista e a povoação (dados, ≥ 30 m) · 6 Assegurar o ponto local e repelir pressão suficiente para completar a reorganização: posições (janela da cave, muro, celeiro), rotação por supressão; primeira pressão repelida; **reorganização**: Pruitt conta (Allen, Teague, Osgood, Pruitt: quatro; Halvorsen "?", Ames "?", Brenner no posto); o rádio apanha a companhia: o estafeta Ames não chegou a Germeter (voz do tenente Harker: "Nenhum estafeta vosso chegou."); um estafeta da companhia da direita chega pelo caminho sul com a ligação; segunda pressão repelida com a ajuda da companhia da direita (fogo de MG amiga pelo flanco); o jogador leva munição ao muro (interação) e fecha a cave (interação) antes da segunda pressão · 7 §79 ponto 5 ("sem afirmar que toda a campanha de Hürtgen foi vencida naquele dia") · 8 defende; roda; leva munição; fecha a cave; fala ao rádio (ouvir) · 9 janela da cave (vê o caminho, cega ao celeiro) vs muro (vê tudo, exposto a morteiros) · 10 Pruitt comanda; Teague volta do posto (ravina) ou chega com a maca (exposto) e fica como atirador; Osgood no celeiro; estafeta da direita · 11 duas pressões (dados); artilharia ≥ 30 m; nenhum ataque blindado (os blindados alemães são de 6/11) · 12 muro, cave, feno, a lista de Pruitt no verso do mapa molhado · 13 `dlg_m21_053–061` · 14 MG amiga pelo flanco; morteiros; o rádio; a crista a leste · 15 livre · 16 CP-B · 17 segunda pressão repelida + ligação feita (`evt_m21_consolidated`) · 18 `cp_m21_d_posicao` ("posição final"); `m21.village_point_secured`; `m21.ames_status = missing` · 19 [A] · 20 —

### Cena 8 — "A lama na maca" (`cs_m21_outro`, ≤ 70 s) + debrief
2 16:30–18:30 · 3 o cruzamento ao anoitecer; o posto de socorro improvisado no celeiro; macas a sair para Germeter pelo caminho (ravina, se aberta: os maqueiros usam-na; senão pelo trecho aberto já sem observação) · 4 noite a cair, chuva fina, luz de uma lanterna tapada · 5 esquadra; Teague com uma maca; Brenner (se ravina: já em Germeter — a maca é de outro ferido; se exposto: Brenner a sair agora); Halvorsen a chegar pelo caminho sul com três homens de outra esquadra · 6 Teague tira a lama da maca com a mão para o ferido não escorregar (plano fixo, 4 s). Halvorsen aparece: "Fui pelo talvegue errado. Juntei-me ao Mason. Eles disseram que vocês estavam aqui." Pruitt: "Estás na lista. Riscado." Allen olha para o caminho de Germeter: Ames não voltou; ninguém diz "morto". Pruitt: "Amanhã procuramos. Hoje, posição." Cartela: o 2/112 tomou Vossenack e a crista na tarde de 2/11; os outros batalhões atravessaram o Kall nos dias seguintes; a crista foi perdida a 6/11; a 28.ª DI sofreu 6 184 baixas na floresta. · 7 §79 final: "A incerteza e o desgaste substituem um final de triunfo" · 8 skip · 9 — · 10 — · 11 — · 12 a maca; a lista no verso do mapa (Halvorsen riscado; Ames não) · 13 `dlg_m21_062–066` · 14 **silêncio obrigatório** nos 4 s da lama; chuva fina; a crista a leste ainda sob fogo (longe) · 15 plano fixo na mão de Teague; plano de Halvorsen a chegar sem música; o caminho de Germeter vazio · 16 `evt_m21_consolidated` · 17 `missionEnd` · 18 `m21.completed`; `m21.halvorsen_status = found`; `m21.ames_status = missing` · 19 [A] cutscene com variantes (ravina/exposto; Brenner na maca ou não) · 20 fecha Allen; M22 abre com outra voz (Lewis) a 16/12: o mapa molhado não passa adiante — a campanha guarda só o registo

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m21_orient` | Confirme a direção e chegue à posição de observação | sim | intro | afloramento | — | `orientation_confirmed` | A |
| `obj_m21_support_advance` | Apoie o avanço do pelotão: dispare de onde vê | sim | A | MG recua | — | `ames_sent` (fixo) | — |
| `obj_m21_treeburst_cover` | Procure proteção adequada sob o rebentamento | sim | barrage | fim da salva | — (danos só após dois avisos) | `treeburst_cover_learned`, `brenner_wounded`, `halvorsen_status = lost` | — |
| `obj_m21_open_evac` | Abra uma rota de evacuação que evite o trecho exposto | sim (decisão) | barrage end | macas passam **ou** Pruitt avança | — | `evac_route` | C |
| `obj_m21_carry` | Carregue a frente da maca pela ravina | opcional | ravina | 80 m | — | `player_carried` | — |
| `obj_m21_reach_village` | Alcance o cruzamento a oeste da povoação | sim | evac decided | cruzamento | — | — | B |
| `obj_m21_secure_point` | Assegure o cruzamento e repila a pressão | sim | B | 2 pressões | — | `village_point_secured` | — |
| `obj_m21_reorganize` | Complete a reorganização: munição, cave, ligação | sim (paralelo) | pressão 1 | estafeta da direita | — | `ames_status = missing` | D |

### 3.2 Setores
`s1_germeter_edge` (perto) · `s2_forest_draw` (perto: pinhal, ribeiro, clareira, ravina) · `s3_ridge_fields` (perto/médio: campos, sebe, caminho exposto) · `s4_village_west` (perto: celeiro, cruzamento, cave) · `s5_far` (longe: artilharia alemã da crista de Brandenberg-Bergstein; o 109.º a norte e o 110.º a sul; blindados amigos na estrada de Germeter — som). Agendas: morteiros nos campos a cada 40 s sobre quem está parado > 10 s; salva de copas 10:40–10:55 (três cadências de 90 s com pausas de 20 s); Brenner atingido 10:46 (fixo); Halvorsen perde-se 10:50; morteiros no trecho aberto a cada 60 s; pressões 14:10 e 15:40; estafeta da direita 15:10.

### 3.3 Checkpoints
A orientação (afloramento) · B acesso à povoação (cruzamento) · C corredor de evacuação (**salva a rota escolhida, as macas, o tronco removido, a fita**) · D posição final (ligação; lista). Todos salvam feridos e destruição (copas, celeiro, muro).

### 3.4 Justiça
Assobio 2 s antes de cada rebentamento; primeira salva ≥ 30 m; dano ao jogador só após dois avisos verbais de Pruitt; oclusão de visão e de som simétrica (a IA não vê através da mata nem dispara sobre o que não vê); morteiros nos campos só sobre quem está parado e com aviso; minas só como zona marcada por fita e aviso; Brenner e Ames são eventos fixos nunca apresentados como evitáveis; Halvorsen nunca morre; nenhuma salva sobre o cruzamento a < 30 m.

---

## 4. Set pieces

### SP-21-1 "A crista que mal se vê"
Contexto: a orla de Germeter e o pinhal. Preparação: o mapa molhado; Pruitt corrige meio palmo. Experiência: confirmar a direção em três referências reais; o som que mente; chamar a esquadra da direita por voz. Companheiros: Halvorsen conta passos; Teague: "não sair da fita". Ambiente: cepos, carro de madeireiro, fita velha. Evolução: do trilho ao afloramento. Clímax: a crista aparece de facto. Consequências: `orientation_confirmed`. Requisitos: [C] oclusão sonora com ecos; [B] interação de confirmar. Integração: `obj_m21_orient`.

### SP-21-2 "O fogo está acima das árvores"
Contexto: a orla sob as copas. Preparação: Pruitt manda recuar da clareira para a mata; "ao tronco, não ao chão". Experiência: assobio, copa, galhos, o ouvido tapado; o instinto errado (deitar-se) é corrigido por reação dos homens; Brenner atingido (fixo); Halvorsen some no fumo. Companheiros: Pruitt instrui; Teague e Osgood rastejam. Ambiente: copas desfeitas, tronco partido no trilho. Evolução: três cadências. Clímax: o silêncio ocluso e as chamadas. Consequências: `treeburst_cover_learned`, `brenner_wounded`, `halvorsen_status = lost`. Requisitos: [C] dano em árvores e queda de galhos; [A] `safeImpact`/suppression. Integração: `obj_m21_treeburst_cover`.

### SP-21-3 "A passagem"
Contexto: a ravina. Preparação: Brenner pede; Teague propõe; Pruitt cronometra. Experiência: remover o tronco a dois; verificar a posição abandonada; a fita alemã; marcar com fita branca; carregar; **ou** seguir Pruitt e ver os maqueiros irem pelo aberto. Companheiros: Teague e Osgood com agenda própria. Ambiente: latas, buraco sem MG, ribeiro. Evolução: a maca passa sob o talude. Clímax: fala 003 em dois tons. Consequências: `evac_route`, `player_carried`, CP-C. Requisitos: [A] maca/obstáculo a dois; [D] minas como zona marcada. Integração: `obj_m21_open_evac`, `obj_m21_carry`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Germeter | buracos com troncos, botas a secar, mapa | verificar maca | rebentamento que soa perto | — | esquadra | — |
| pinhal | cepos, carro de madeireiro, ribeiro, fita velha | confirmar direção | ecos | — | esquadra da direita (vozes) | — |
| afloramento/campos | erva alta, cercas, sebe, casas ao longe | pelotão avança | MG só de dois pontos | apoio | Ames parte | MG recua |
| orla sob copas | troncos a 2 m | recuo | assobio | salva nas copas | Brenner; Halvorsen some | copas desfeitas; tronco no trilho |
| ravina | taludes, buraco abandonado, latas, fita alemã | abrir rota; marcar | Brenner pede | — | Teague; Osgood | fita branca; tronco removido |
| celeiro/cruzamento | feno molhado, muro, cave | avançar; limpar | morteiros nos parados | pressões | ferido alemão; estafeta | muro lascado; lista no mapa |
| noite | lanterna tapada, macas a sair | reorganizar | Ames? | — | Halvorsen volta | lama tirada da maca |

Objetos com origem: o mapa molhado (entregue na véspera no posto de comando da companhia; a lista de Pruitt no verso), a fita branca velha (lane de minas de uma unidade anterior, outubro), o carro de madeireiro (abandonado em setembro pelos civis evacuados), a fita alemã (marcava o lado minado do buraco), o tronco partido (a salva de 10:40), o feno molhado (o telhado do celeiro tem um buraco de morteiro de 31/10).

---

## 6. Diálogos (VO inglês; alemão só por gritos ao longe e o ferido do celeiro, sem tradução)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Pruitt | "Confirme a direção antes de andar." (§79) | intro t 40 | 1 | — |
| 002 | Halvorsen | "O fogo está acima das árvores!" (§79; atribuída ao companheiro Halvorsen, última fala antes de se perder) | primeira copa | 0 | — |
| 003 | Teague | "Preciso da passagem, não de mais homens aqui parados." (§79; **dois tons**: pedido na ravina / raiva no trecho exposto) | ravina: jogador chega; exposto: Pruitt avança | 1 | — |
| 010 | Pruitt | "Vês a crista? Qual delas?" (V1) | intro t 10 | 1 | — |
| 011 | Pruitt | "Essa é a de trás. A nossa é a que não se vê." (V1) | intro t 18 | 1 | — |
| 012 | Halvorsen | "Aquilo foi perto." / Pruitt: "Foi a oitocentos. A mata mente." (V1) | intro t 28 | 2 | — |
| 013 | Teague | "Correias. A lama já está na maca e ainda não saímos." (V1) | intro t 50 | 3 | — |
| 014 | Pruitt | "Vamos. Pelo ribeiro." (V1) | intro fim | 1 | — |
| 015 | Pruitt | "Allen. Direção." (V1) | andar sem confirmar | 1 | 15 |
| 016 | Halvorsen | "Cento e doze, cento e treze…" (V1; conta passos) | trilho | 3 | 30 |
| 017 | Teague | "Fita velha. É lane de minas de outubro. Não saiam dela." (V1) | fita | 1 | — |
| 018 | Allen | "Direita! Mason!" / voz: "Aqui! Sessenta metros!" (V1; chamada) | ligação | 2 | — |
| 019 | Pruitt | "Ribeiro corre para sul. Então a crista é à esquerda. Confirma." (V1) | ribeiro | 1 | — |
| 020 | Ames | "Isto parece todo igual." (V1) | clareira | 3 | — |
| 021 | Pruitt | "Afloramento. Daqui vê-se. Agora vê-se." (V1) | afloramento | 1 | — |
| 022 | Pruitt | "MG na sebe. Só se vê do alto ou da pedra da esquerda. Escolhe e não fiques a mudar." (V1) | apoio | 1 | — |
| 023 | Pruitt | "Ames. Germeter. Ao posto do batalhão: o pelotão está parado na sebe, pede morteiros na crista. Vai." (V1) | 10:20 | 1 | — |
| 024 | Ames | "Sim, sargento." (V1; última fala de Ames) | 023 | 1 | — |
| 025 | Halvorsen | "BAR pronta. Diz-me onde." (V1) | — | 2 | — |
| 026 | Pruitt | "Mudas de ponto, és visto cinco segundos. Mudas com juízo." (V1) | mudança | 1 | 20 |
| 027 | Pruitt | "Recuam para as casas. Não os persigas; o campo é deles de cima." (V1) | MG recua | 1 | — |
| 028 | Pruitt | "Para dentro! A artilharia deles vem aos campos!" (V1) | 10:38 | 0 | — |
| 029 | Pruitt | "**Ao tronco! Não ao chão!** Em copa, o chão apanha tudo." (V1) | primeira copa | 0 | — |
| 030 | Pruitt | "Allen! Levanta-te! Ao tronco!" (V1; aviso 1) | jogador deitado | 0 | — |
| 031 | Pruitt | "Allen! **Tronco!**" (V1; aviso 2; depois deste, dano) | jogador deitado 5 s | 0 | — |
| 032 | Brenner | "…anca. Está na anca." (V1) | 10:46 | 1 | — |
| 033 | Teague | "Osgood! Maca! Rasteja, não corras!" (V1) | 032 | 0 | — |
| 034 | Allen | "Halvorsen!" (sem resposta) (V1) | 10:50 | 1 | — |
| 035 | Pruitt | "Acabou. Ouvem? Acabou. Contem-se." (V1) | fim da salva | 1 | — |
| 036 | Brenner | "Não me deixem na água. Com a terra assim não aguento até à noite." (V1) | ravina | 1 | — |
| 037 | Teague | "Há uma ravina. Se alguém abrir o tronco e verificar o buraco, passa coberta." (V1) | 036 | 1 | — |
| 038 | Pruitt | "A hora é a hora. Os maqueiros tratam disso." (V1) | 037 | 1 | — |
| 039 | Teague | "Tratam se tiverem passagem." (V1) | 038 | 1 | — |
| 040 | Osgood | "Tronco. Tu de um lado, eu do outro." (V1; ravina) | tronco | 1 | — |
| 041 | Teague | "O buraco. Fita alemã do lado de lá: é o lado minado. Olha, não pises." (V1) | posição | 1 | — |
| 042 | Teague | "Três estacas de fita. Quem vier depois sabe." (V1) | marcar | 2 | — |
| 043 | Pruitt | "Dez minutos. Nem mais um." (V1; ravina) | — | 1 | — |
| 044 | Teague | "Passou. Vão. Nós voltamos por aqui." (V1; ravina) | maca passa | 1 | — |
| 045 | Pruitt | "Allen. Comigo. Já." (V1; exposto) | — | 0 | — |
| 046 | Osgood | "Então vamos pelo aberto. Quando eles pararem de olhar." (V1; exposto) | — | 1 | — |
| 047 | Pruitt | "Talude e cercas. Parado no campo és alvo em dez segundos." (V1) | campos | 1 | — |
| 048 | Pruitt | "Celeiro. Porta ou lado. Lado." (V1) | celeiro | 1 | — |
| 049 | ferido alemão (alemão) | — (gemido; sem tradução) | celeiro | — | — |
| 050 | Pruitt | "Deixem-no. Os maqueiros tratam dele como dos nossos." (V1) | 049 | 1 | — |
| 051 | Osgood | "A mata atrás parece calada agora. Não é." (V1) | orla → cruzamento | 3 | — |
| 052 | Pruitt | "Cruzamento. É o nosso. Até dizerem o contrário." (V1) | cruzamento | 1 | — |
| 053 | Pruitt | "Cave, muro, celeiro. Rodem quando eu disser." (V1) | posições | 1 | — |
| 054 | Teague | "Estou de volta. Dá-me uma arma, hoje já carreguei." (V1; ravina) | 13:50 | 2 | — |
| 055 | Pruitt | "Pressão a leste! Muro!" (V1) | 14:10 | 0 | — |
| 056 | Pruitt | "Contagem. Allen. Teague. Osgood. Eu. Halvorsen?" (silêncio) "Ames?" (silêncio) (V1) | após pressão 1 | 1 | — |
| 057 | ten. Harker (rádio) | "Nenhum estafeta vosso chegou a Germeter. Repito, nenhum." (V1) | rádio | 1 | — |
| 058 | estafeta da direita | "Companhia da direita. Ligação pelo caminho sul. Temos uma MG no vosso flanco." (V1) | 15:10 | 1 | — |
| 059 | Pruitt | "Munição ao muro. Cave fechada. Vem outra." (V1) | reorganização | 1 | — |
| 060 | Pruitt | "Segunda! A MG deles bate pelo flanco. Aguentem!" (V1) | 15:40 | 0 | — |
| 061 | Pruitt | "Chega. Hoje chega." (V1) | consolidated | 1 | — |
| 062 | Teague | (tira a lama da maca; sem fala) | outro | — | — |
| 063 | Halvorsen | "Fui pelo talvegue errado. Juntei-me ao Mason. Eles disseram que vocês estavam aqui." (V1) | outro | 1 | — |
| 064 | Pruitt | "Estás na lista. Riscado." (V1) | 063 | 1 | — |
| 065 | Allen | "O Ames." (V1) | outro | 1 | — |
| 066 | Pruitt | "Amanhã procuramos. Hoje, posição." (V1) | 065 | 1 | — |

Callouts: `co_m21_shell_whistle`, `co_m21_tree_burst`, `co_m21_mg_hedge`, `co_m21_mortar_field`, `co_m21_pressure_east`. Silêncios: o ouvido ocluso (3 s após cada copa); a mão de Teague na maca (4 s).

---

## 7. Arte e atmosfera

**Paleta:** verde-negro de pinhal molhado, castanho de agulhas e lama, cinza de nuvens baixas, verde-oliva encharcado de M1941/M1943, branco sujo das fitas, ocre da erva alta na crista, pedra cinzenta e feno escuro de Vossenack. **Luz:** 09:00 cinzento sem sombras (zénite `#6f7780`, horizonte `#a3a7a3`, Sol ausente); 11:00 luz filtrada sob copas (manchas); 13:30 um pouco mais alta sobre os campos; 16:30 queda rápida; 18:00 noite com lanterna tapada. **Materiais:** casca molhada, agulhas, lama (profundidade visível nas pegadas), água de ribeiro, erva alta, cerca de madeira, pedra, feno molhado. **Silhuetas:** troncos a 2–3 m (nunca em grelha: espaçamento irregular, clareiras de corte, cepos), a ravina com taludes, a crista como linha escura sob nuvens, a igreja de Vossenack ao longe. **Destruição:** copas desfeitas e galhos no chão (persistentes), tronco partido no trilho (removível, salvo em CP-C), telhado do celeiro furado, muro lascado. **Humanos:** capotes e ponchos, botas sem galochas (lama até ao tornozelo), ligaduras no posto, Teague com as mãos pretas de lama. **Violência reduzida:** Brenner coberto até à cintura na maca; o ferido alemão no feno, sem plano aberto.

**Imagem única:** o mapa molhado e uma crista que mal se vê (ART §4, RECONSTRUCTED).

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| Germeter | chuva nas agulhas e capacetes, papel molhado, correias | — | artilharia esparsa que **soa perto** (oclusão invertida) | — |
| pinhal | passos na lama, ribeiro, agulhas, voz de Halvorsen a contar | esquadra da direita (vozes) | morteiros com ecos por ravinas | — |
| afloramento/campos | Garands, BAR, rádio | MG 42 abafada pela crista; pelotão | morteiros nos campos | — |
| copas | **assobio → rebentamento em copa → estilhaços e galhos → ouvido tapado → chamadas** | outras esquadras a chamar | — | **ocluso** (3 s) |
| ravina | ribeiro, tronco a arrastar, respiração sob a maca, estacas | morteiros no trecho aberto | — | — |
| campos/celeiro | cercas, feno, porta | recuo alemão | crista sob fogo | — |
| cruzamento | muro, cave, rádio, MG amiga pelo flanco | pressões | artilharia na crista; blindados amigos na estrada (som) | — |
| noite | lama na maca, lanterna, macas a sair | — | crista ainda sob fogo | **obrigatório** (4 s) |

Sons novos: pinhal com chuva por camada (copa/agulhas/lama), artilharia com dano em árvores (três estados: copa, tronco, galho a cair), oclusão por relevo com ecos, ribeiro, maca na lama. Música: motivo V "A lama" só na cartela final (uma frase). VO inglês (sotaque da Pensilvânia para a 28.ª — proposta), alemão ao longe.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| 2/11/1944 ataque da 28.ª DI; o 2/112 toma Vossenack e a crista na tarde de 2/11 a partir de Germeter | D (resumo) | H20; S-C07 | — |
| Companhia/esquadra de Allen; a ravina lateral de evacuação (não o Kall) | R | — | **P-C21** |
| Rebentamentos em copa; doutrina "ao tronco, não ao chão"; buracos com troncos por cima | D (geral, Hürtgen) | H20 | revisão de doutrina (texto de treino de 1944) |
| Artilharia alemã observada da crista de Brandenberg-Bergstein | D (geral) | H20 | — |
| Crista perdida a 6/11 ao 156.º PzGren; 6 184 baixas da 28.ª DI | D | S-C07 | — |
| Blindados do 707.º Tank Bn em apoio na estrada de Germeter (só som) | R | S-C07 (indireto) | P-C21 |
| Chuva fria, lama, trench foot, falta de galochas | D (geral) | TIMELINE §2 | — |
| Minas (Schu-mine) e lanes com fita | D (geral) | H20 | — |
| Pruitt, Teague, Halvorsen, Ames, Brenner, Osgood, Harker, Mason | F | — | acrescentar Brenner/Osgood/Harker a CONTINUITY §4 |
| Equipamento: M1 Garand, BAR, M1 carbine, M1919, SCR-300, 60 mm; MG 42, morteiros alemães | D | TIMELINE §3 | auditoria |

**Proibições:** o trilho do Kall a 2/11; tanques em cena; Cota; "Hürtgen vencida"; nevoeiro total; árvores em grelha; IA através da mata; Ames morto em cena; mina invisível que mata. **Fora de cena:** Cota; o comandante do batalhão; os blindados.

---

## 10. Handoff técnico

**Contrato:** `id m21_vossenack`, `order 21`, relógio 09:00→18:30 com `readyScale` entre contactos, `cast` (Allen, Pruitt, Teague, Halvorsen, Ames, Brenner, Osgood, Harker [voz], estafeta, Mason [voz]), grupos (`grp_squad`, `grp_right_squad`, `grp_platoon`, `grp_de_hedge`, `grp_de_village`, `grp_de_pressure_a/b`, `grp_stretcher_teams`, `grp_runner_right`), setores s1–s5, checkpoints A–D (C salva rota/macas/tronco/fita), cutscenes (intro, outro com variantes), falas, flags, debrief.

**Flags:** `m21.completed`, `m21.orientation_confirmed` (0–3), `m21.ames_sent` (fixo), `m21.treeburst_cover_learned`, `m21.brenner_wounded` (fixo), `m21.halvorsen_status` (`lost` → `found`), `m21.evac_route ∈ {ravine, exposed}`, `m21.player_carried`, `m21.teague_passage_given`, `m21.village_point_secured`, `m21.ames_status = missing` (fixo).

**Sistemas:** [C] artilharia com dano em árvores (impacto em copa com partículas de agulhas, tronco atingido com lasca, galho a cair com colisão e som; nunca dano ao jogador sem assobio + dois avisos), oclusão sonora por relevo/mata com ecos e "oclusão invertida" (parâmetro por setor); [A] `safeImpact` ≥ 30 m, suppression, maca a dois, obstáculo a dois, fogo como dados, linhas de visão por relevo (sem perceção através de vegetação — regra já em M19), rotação; [B] "confirmar direção" (3 pontos), "pontos de tiro com exposição temporizada", "verificar posição", "marcar com fita", "fechar cave", "munição ao muro"; [D] minas como zona marcada (sem sistema de minas: colisão com a zona + aviso + dano só se o jogador insistir após aviso — **ou** zona intransponível; decisão do engenheiro, ambas honestas). **Fallbacks honestos:** sem dano em árvores → partículas e som com galhos pré-colocados que "caem" por evento; sem oclusão por relevo → mistura por setor (perto/médio/longe) com ecos fixos.

**Disciplinas:** Level: pinhal irregular (600 m), ribeiro, clareira de corte, ravina com taludes (200 m), campos até à crista (300 m), orla oeste de Vossenack (celeiro, cruzamento, casa com cave); Combate/IA: MG visível só de dois pontos; recuo casa a casa; pressões com MG amiga de flanco; Arte: pinhal molhado por camadas, copas destruídas, lama com pegadas; Personagens: 28.ª DI (capotes, ponchos, sem galochas), maqueiros, alemão ferido; Animação: dobrar mapa molhado, encostar ao tronco (cobertura vertical), arrastar tronco a dois, maca na lama, tirar lama com a mão, contar com o dedo na lista; Som: três estados de dano em árvore, oclusão invertida; VO: inglês/alemão; Historiador: P-C21 (companhia, ravina, 707.º), doutrina de copa; QA: nunca dano sem assobio + dois avisos; Brenner nunca morre; Halvorsen `found` em todos os ramos; Ames nunca visível depois das 10:20; `evac_route` persiste em CP-C; o tronco removido não reaparece após reload.

**Testes:** rebentamento em copa a < 30 m do jogador só após `co_m21_shell_whistle` (2 s) e dois avisos; jogador encostado ao tronco nunca sofre dano de copa; MG da sebe não dispara sobre o jogador em posição sem linha de visão; morteiros nos campos só com `stationary > 10 s`; `halvorsen_status` passa `lost → found` apenas em `evt_m21_consolidated`; em `exposed`, a salva sobre os maqueiros cai ≥ 30 m e Brenner chega ao posto; a fita alemã nunca mata sem aviso.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| O mapa molhado; a crista de trás | (intro) | dobrar o mapa | Pruitt corrige; Halvorsen baixa-se | — | start | — |
| Pelo ribeiro | `obj_m21_orient` | confirmar 3 pontos; chamar a direita | Pruitt "Direção."; Teague "fita" | — | intro | CP-A; `orientation_confirmed` |
| Quem vê, atira; Ames parte | `obj_m21_support_advance` | escolher ponto; disparar; mudar | pelotão avança por agenda; MG recua; Ames parte | sebe abandonada | A | `ames_sent` |
| O fogo está acima das árvores | `obj_m21_treeburst_cover` | ao tronco / buraco; chamar | Pruitt avisa; Brenner atingido (fixo); Halvorsen some | copas desfeitas; tronco no trilho | 10:40 | `treeburst_cover_learned`; `brenner_wounded`; `halvorsen = lost` |
| A passagem | `obj_m21_open_evac` / `carry` | ravina: tronco a dois, verificar, marcar, carregar / exposto: seguir Pruitt | Teague e Osgood com agenda própria; Pruitt cronometra | tronco removido; fita branca | barrage end | CP-C; `evac_route`; `player_carried` |
| Acesso à povoação | `obj_m21_reach_village` | taludes; celeiro pelo lado | recuo casa a casa; ferido alemão deixado | telhado furado | evac decided | CP-B |
| O cruzamento | `obj_m21_secure_point` / `reorganize` | defender; rodar; munição; fechar cave | pressões; Harker no rádio; estafeta da direita | muro lascado; lista no mapa | B | CP-D; `village_point_secured`; `ames_status = missing` |
| A lama na maca | (outro) | skip | Teague limpa; Halvorsen volta; Pruitt risca | macas a sair | consolidated | `m21.completed`; `halvorsen = found` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | perder-se vs não voltar; a passagem como ajuda que serve. |
| 2 | Autenticidade | 8 | 2/112 e Vossenack D; copas e doutrina D geral; companhia/ravina/707.º P-C21. |
| 3 | Personagens | 8 | Pruitt sem arco (deliberado); Teague em duas falas e um gesto; Ames existe por ausência. |
| 4 | Diálogos | 8 | "A hora é a hora." / "Tratam se tiverem passagem." / "Estás na lista. Riscado." |
| 5 | Originalidade | 9 | orientação como mecânica; cobertura invertida (tronco, não chão); oclusão invertida. |
| 6 | Variedade | 8 | confirmar, observar/escolher ponto, cobrir-se ao tronco, tronco a dois, verificar, marcar, carregar, defender, munição, cave, rádio. |
| 7 | Set pieces | 8 | as copas são o centro; a ravina é a decisão; o cruzamento fecha sem onda final. |
| 8 | Atmosfera | 9 | pinhal por camadas; chuva; a crista que mal se vê. |
| 9 | Environmental storytelling | 8 | mapa molhado, fita velha, buraco abandonado, lama na maca. |
| 10 | Cinematográfica | 7 | a cena final é um gesto e uma lista; o risco é parecer pequena — é a intenção. |
| 11 | Sonora | 9 | a sequência de copa e a oclusão invertida são o desenho sonoro mais específico da campanha com M07. |
| 12 | Impacto emocional | 8 | Ames por ausência; Halvorsen sem heroísmo. |
| 13 | Ritmo | 8 | 22–29 min; o cruzamento usa `readyScale`. |
| 14 | Continuidade | 7 | Allen não volta; a ligação é por som (água → chuva nas copas) e pelo motivo V. |
| 15 | Integração técnica | 6 | dano em árvores e oclusão por relevo [C] com fallbacks; o resto é [A]/[B]. |

**Correções aplicadas:** (1) a fala 002 foi atribuída a Halvorsen (o "Companheiro" de §79) porque Ames já partiu como estafeta às 10:20 — a última fala de Ames é "Sim, sargento."; (2) a ravina de evacuação foi declarada distinta do trilho do Kall (usado a 3/11) para não contradizer S-C07; (3) o ferimento de Brenner e o desaparecimento de Ames são eventos fixos nunca apresentados como evitáveis (regra 3 do MASTER-STORY-BIBLE); (4) a cobertura sob copa recebeu dois avisos verbais antes de qualquer dano; (5) as minas são zona marcada com fita e aviso, nunca mina invisível; (6) o momento de custódia de um rendido não se repete (M19): o ferido alemão do celeiro é deixado aos maqueiros; (7) Brenner, Osgood, Harker e Mason são propostas deste dossiê a acrescentar a CONTINUITY §4 na revisão de continuidade.
