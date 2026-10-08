# M16 — MONTANHA · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 17–18/5/1944, Monte Cassino; 3.ª Divisão de Fuzileiros dos Cárpatos, II Corpo Polonês; POV Leon Ostrowski; fonte H16; 22–30 min; três falas; checkpoints "aproximação; primeiro objetivo; evacuação; nova data; reconhecimento final"; equipamento do II Corpo de 1944 (não o de 1939); sem chefe final na abadia; sem bandeira do protagonista; a passagem para 18/5 com cartela e checkpoint. **Proposto:** 1.ª Brigada dos Cárpatos (batalhão pendente P-C16), setor da cota 593 (S-C16), elenco, a carta como objeto, relógio, flags.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m16_monte_cassino` / 16 |
| Datas | 1944-05-17T06:30+02:00 → 1944-05-18T11:00+02:00 |
| Local | trilha de aproximação na encosta norte → dobra de rocha (pausa protegida) → setor da cota 593 → posição de acesso → trilho de reconhecimento para a abadia (vista; sem entrar como combate) — `RECONSTRUCTED`; a silhueta da abadia e das cotas `EXACT` |
| Operação | Diadem; 2.º assalto polaco a 17/5 às 08:00 sobre 593/569/Albaneta/Widmo; retirada alemã noturna (1.ª Div. Paraquedista); patrulha do 12.º Lanceiros na abadia às 10:20 de 18/5; engenheiros com baixas pesadas nos campos de minas (D em resumo, S-C16) |
| Unidade | 3.ª Div. Cárpatos, II Corpo (canónico) → 1.ª Bde dos Cárpatos (R) → secção ficcional |
| Elenco | Ostrowski (POV, kapral), strz. Józef Kaleta (portador da carta), plut. Stanisław Herc (graduado), carregadores Bolesław Pietrzak e Mieczysław "Mietek" Sowa, strz. Wacek Duda (recruta) (propostas) |
| Fora de cena | gen. Anders; ppor. Gurbiel (bandeira); Emil Czech (hejnał) |
| Intocável | datas, unidade, POV, falas `dlg_m16_001–003`, checkpoints, 17→18/5 com cartela, abadia vazia a 18/5, equipamento 1944, "a conquista não devolve casas e companheiros" |

---

## 1. Story Bible

**Logline.** Antes da subida, uma carta de casa passa de mão em mão; a abadia aparece ao fundo, na altura certa. Ostrowski aprende, cota a cota, que a encosta decide quem vê e quem dispara, que carregar feridos é mais lento do que avançar — e que, na manhã em que a abadia aparece vazia, a carta ainda está no bolso, manchada, por entregar a quem a trouxe.

**As oito respostas.**
1. **Situação central:** encosta, feridos, reconhecimento depois de o inimigo sair.
2. **Modo de contar:** feridos descidos (quantos chegaram à dobra de rocha e ao posto).
3. **Objeto:** a carta de Kaleta (muda de bolso duas vezes; fica manchada ao atender um ferido).
4. **Silêncio:** a abadia vazia a 18/5.
5. **Tarefa que não é matar:** carregar feridos; levar munição; comunicar; reconhecer.
6. **Custo humano:** Kaleta, que trouxe a carta, precisa de parar por ferimento e peso (causa: o fogo da cota) → Ostrowski guarda-a enquanto os carregadores atravessam a linha protegida / Herc manda seguir → `m16.kaleta_status`; nenhum prémio por abandonar o ferido.
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista 593 tomada entre 17 e 18/5, a retirada alemã, a bandeira do 12.º Lanceiros às 10:20 (facto, não cena do protagonista), as baixas; "a conquista não devolve casas".

**Três motivos.** (a) *Altura* — ver é estar exposto; (b) *descer com feridos* — o ritmo físico da missão; (c) *a carta* — futuro possível mais do que heroísmo.

**Temas.** Exílio (Sibéria → Anders → Itália); a carta como casa; esforço coletivo; vitória sem duelo.

**Estrutura (§54).** CONTEXTO → INTRO (a carta; a abadia ao fundo) → APROXIMAÇÃO (trilha; cotas; campos de tiro) → DIÁLOGO (Herc: "A cota, não o telhado.") → PRIMEIRO CONTATO (fogo da cota 593) → ESCALADA (apoio ao avanço; comunicação; munição) → COMBATE PRINCIPAL (Kaleta ferido; a carta) → SET-PIECE (pausa protegida: descer feridos) → PAUSA (noite; cartela 18/5) → CLÍMAX (consolidar o acesso; reconhecimento) → CONSEQUÊNCIA (ruínas; a carta guardada) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Ostrowski | revê o envelope; ouve os companheiros | Kaleta (a carta) | Kaleta ferido | guarda o tempo para salvar quem ainda fala | guarda a carta ao ajudar um ferido |
| Kaleta | "Esta carta já viajou mais do que eu." (002) | Ostrowski | ferido | — | `m16.kaleta_status ∈ {evacuated_with_letter, evacuated}` |
| Herc | "A cota, não o telhado." (001) | secção | — | — | vivo |
| Pietrzak/Sowa | carregadores | feridos | linha protegida | — | vivos |
| Duda | recruta; mãos feridas pela pedra | — | — | — | `m16.duda_status` |

**O que a missão recusa.** Uniforme de 1939; duelo na abadia; a bandeira pelo protagonista; terreno de M07/M27 retexturado; atrocidade inventada; Anders em cena.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "A carta" (`cs_m16_intro`, ≤ 80 s)
2 17/5 06:30 · 3 posição de partida na encosta norte, entre rochas; a abadia ao fundo, na altura correta (`EXACT`) · 4 luz seca de maio; pedra branca; poeira · 5 secção; outras companhias (proxies) · 6 Cartela: MONTE CASSINO — 17 DE MAIO DE 1944 — 06:30 · 3.ª DIVISÃO DE FUZILEIROS DOS CÁRPATOS · II CORPO POLONÊS. Uma carta de casa passa de mão em mão (de um campo de refugiados em África — pendência de pesquisa); Kaleta: "Esta carta já viajou mais do que eu." (002). Herc aponta a cota, não o telhado. Ostrowski revê o envelope e guarda-o no bolso de Kaleta. · 7 estabelecer a carta e a altura · 8 olhar; passar a carta (interação) · 9 — · 10 — · 11 artilharia alemã ao longe · 12 rochas, equipamento de ataques anteriores (capacetes polacos de 12/5, cobertos) · 13 `dlg_m16_001`, `002` (canónicas), `010–013` · 14 vento de altitude; pedras · 15 beat: a abadia (3 s); a carta (2 s) · 16 `missionStart` · 17 08:00 (ordem) · 18 `cp_m16_a_aproximacao` · 19 skip · 20 —

### Cena 2 — "Trilha" (jogável; `obj_m16_approach`)
2 08:00–09:00 · 3 trilha pesquisada: talude, rocha, crista; campos de tiro visíveis · 4 sol · 5 secção; companhias noutros eixos · 6 Aproximar-se reconhecendo cotas e campos de tiro: trilha (rápida, vista da cota), talude (lenta, coberta), rocha (muito lenta); o jogador entende por que a observação da encosta determina o fogo · 7 §79 ponto 1 · 8 escolhe o percurso; observa (binóculos) · 9 trilha vs talude · 10 Herc corrige; Duda fere as mãos na rocha · 11 fogo da cota (dados), morteiros · 12 pedra branca; carvalho rasteiro · 13 `dlg_m16_014–017` · 14 pedras; morteiros · 15 livre · 16 ordem · 17 base da cota · 18 — · 19 [A]; [C] terreno vertical · 20 —

### Cena 3 — "Cota 593" (jogável; `obj_m16_support_advance`)
2 09:00–11:00 · 3 setor da cota 593 · 4 sol; poeira de impactos · 5 secção; outra formação assume cobertura · 6 Apoiar o avanço no setor: cobertura, comunicação (levar mensagem a um posto), transporte (munição); um deslocamento lateral só é possível depois de outra formação assumir cobertura (evento) · 7 §79 ponto 2 · 8 cobre; leva mensagem/munição por lances; aguarda a cobertura de outra formação para se deslocar · 9 — · 10 outra formação cobre por si | 11 paraquedistas alemães em posições de pedra (dados), MG 42 · 12 crateras; equipamento · 13 `dlg_m16_018–022` · 14 MG 42 com relevo; eco · 15 livre · 16 base · 17 objetivo parcial (posição intermédia) · 18 `cp_m16_b_primeiro_objetivo` · 19 [A] · 20 —

### Cena 4 — "Kaleta" (jogável; `obj_m16_evacuate`) — **custo humano**
2 11:00–13:00 · 3 dobra de rocha (pausa protegida); linha protegida de descida · 4 sombra de rocha · 5 secção; feridos (Kaleta + 2); carregadores · 6 Pausa protegida: Kaleta ferido (perna) e com o peso do equipamento precisa de parar; Ostrowski: "Depois você termina de ler. Primeiro vamos tirá-lo daqui." (003); a carta muda de bolso (Ostrowski guarda-a); remover feridos pela linha protegida (carregar com os carregadores: a maca em encosta é lenta); reunir homens separados; corpos e equipamento do terreno mostram o custo acumulado dos ataques anteriores (cobertos; sem identificação) · 7 §79 ponto 3 + custo humano · 8 carrega (maca a dois com Pietrzak/Sowa) pela linha protegida; reúne dois separados · 9 ordem de descida (Kaleta primeiro ou o ferido mais grave: ambos descem; muda tempo/falas) · 10 carregadores; Herc manda seguir quando a descida termina · 11 fogo esporádico sobre a linha (supressão) · 12 a carta manchada (sangue de Kaleta ao estancar) · 13 `dlg_m16_003` (canónica), `023–028` · 14 respiração; pedras; artilharia afastada · 15 livre · 16 CP-B · 17 feridos no posto · 18 `cp_m16_c_evacuacao`; `m16.wounded_carried`; `m16.letter_state = stained` · 19 [A] carriedBy; [B] maca a dois em encosta · 20 —

### Cena 5 — "Retomar" (jogável; `obj_m16_resume`)
2 13:00–18:00 (`readyScale`) · 3 setor da cota · 4 tarde · 5 secção; formações noutros eixos · 6 Retomar o avanço quando chega ordem/informação do setor; outras formações avançam nos seus próprios eixos (visíveis); a cota é disputada até à noite · 7 §79 ponto 4 · 8 lances; cobertura · 9 — · 10 — · 11 contra-ataques · 12 — · 13 `dlg_m16_029–031` · 14 — · 15 livre · 16 CP-C · 17 noite · 18 — · 19 [A] · 20 —

### Cena 6 — "18 de maio" (`cs_m16_date`, ≤ 30 s)
2 noite → 18/5 05:30 · 3 posição na cota · 4 amanhecer · 5 secção · 6 Cartela: 18 DE MAIO — 05:30. Durante a noite o fogo alemão diminuiu; posições abandonadas visíveis; outras formações avançam · 7 §79 ponto 4 · 8 skip · 9 — · 10 — · 11 — · 12 posições abandonadas · 13 `dlg_m16_032` · 14 silêncio relativo · 15 fade · 16 noite · 17 cartela · 18 `cp_m16_d_nova_data` · 19 [B] data · 20 —

### Cena 7 — "Acesso e reconhecimento" (jogável; clímax; `obj_m16_consolidate`, `obj_m16_recon`)
2 05:30–10:30 · 3 posição de acesso → trilho para a abadia (vista) · 4 manhã · 5 secção; patrulhas de outras unidades · 6 Consolidar a posição de acesso (uma resistência residual: dois atiradores que recuam/rendem? **não**: recuam) e realizar reconhecimento depois da retirada alemã: a abadia aparece vazia; às 10:20 a bandeira do 12.º Lanceiros sobe ao longe (evento visível, não do protagonista) · 7 §79 ponto 5 · 8 consolida; reconhece pelo trilho; observa a abadia (sem entrar como combate) · 9 — · 10 patrulha de lanceiros ao longe · 11 residual · 12 ruínas; silêncio · 13 `dlg_m16_033–036` · 14 **silêncio obrigatório** (a abadia); ao longe, o hejnał ao meio-dia **não** é encenado (fora da janela; só debrief) · 15 livre; beat: a bandeira ao longe (3 s) · 16 cartela · 17 reconhecimento feito (`evt_m16_recon_done`) · 18 `cp_m16_e_reconhecimento_final` · 19 [A] · 20 —

### Cena 8 — "A carta no bolso" (`cs_m16_outro`, ≤ 60 s) + debrief
2 10:30–11:00 · 3 ruínas junto do trilho; um ferido de outra unidade a ser descido · 4 manhã · 5 Ostrowski, Herc, Pietrzak, Sowa, Duda · 6 Ruínas e silêncio breve; Ostrowski ajuda a descer um ferido e guarda a carta manchada no bolso (variante: Kaleta evacuado com a carta devolvida no posto = `evacuated_with_letter`; senão Ostrowski guarda-a para lha entregar). · 7 consequência canónica · 8 skip; (jogável: ajudar o ferido — interação) · 9 — · 10 — · 11 — · 12 a carta · 13 `dlg_m16_037–039` · 14 vento; nenhuma música · 15 beat: a carta (3 s) · 16 recon_done · 17 debrief · 18 `m16.completed`; `m16.kaleta_status` · 19 variantes · 20 M30 (epílogo condicional).

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m16_approach` | Aproxime-se pela trilha reconhecendo as cotas | sim | 08:00 | base | — | — | A |
| `obj_m16_support_advance` | Apoie o avanço na cota 593 | sim | base | posição intermédia | — | — | B |
| `obj_m16_evacuate` | Pausa protegida: desça os feridos | sim | B | 3 feridos no posto | — | `wounded_carried`, `letter_state` | C |
| `obj_m16_regroup` | Reúna os separados | sim | B | 2 reunidos | — | — | — |
| `obj_m16_resume` | Retome o avanço com a ordem | sim | C | noite | — | — | — |
| `obj_m16_date` | (cartela 18/5) | sim | noite | cartela | — | — | D |
| `obj_m16_consolidate` | Consolide a posição de acesso | sim | D | residual recua | — | — | — |
| `obj_m16_recon` | Reconheça depois da retirada alemã | sim | consolidate | recon_done | — | — | E |
| `obj_m16_help_wounded_end` | Ajude a descer um ferido | sim (fim) | outro | interação | — | — | — |

### 3.2 Setores
`s1_slope_593` (perto) · `s2_other_slopes` (médio: outras encostas e vales com deslocamento e fogo; Albaneta; Widmo) · `s3_support` (longe: posições de apoio, panorama de Cassino, cidade em ruínas) · `s4_abbey` (longe → perto a 18/5: a bandeira às 10:20). Agendas: outra formação assume cobertura 10:00; contra-ataques 15:00; retirada alemã noturna; patrulha dos lanceiros 10:20.

### 3.3 Checkpoints
A aproximação · B primeiro objetivo · C evacuação (feridos no posto; carta manchada) · D nova data · E reconhecimento final.

### 3.4 Justiça
Fogo da cota com clarão/eco; morteiros com assobio; maca em encosta lenta mas nunca "cai" por timer; campos de minas só por aviso dos engenheiros (sem procedimento).

---

## 4. Set pieces

### SP-16-1 "A cota, não o telhado"
Contexto: trilha. Preparação: a carta; a abadia ao fundo. Experiência: escolher percurso vendo campos de tiro. Companheiros: Herc; Duda. Ambiente: capacetes cobertos de 12/5. Evolução: fogo da cota. Clímax: a base. Consequências: —. Requisitos: [C] terreno vertical. Integração: `obj_m16_approach`.

### SP-16-2 "Descer com feridos"
Contexto: dobra de rocha. Preparação: Kaleta ferido; fala 003. Experiência: maca a dois pela linha protegida; a carta muda de bolso. Companheiros: Pietrzak/Sowa; Herc. Ambiente: corpos cobertos. Evolução: ordem de descida. Clímax: o posto. Consequências: `wounded_carried`, `letter_state`. Requisitos: [B] maca em encosta. Integração: `obj_m16_evacuate`.

### SP-16-3 "A abadia vazia"
Contexto: 18/5. Preparação: noite; posições abandonadas. Experiência: reconhecer; ver a bandeira ao longe. Companheiros: patrulha ao longe. Ambiente: ruínas. Evolução: silêncio. Clímax: nenhum (é o ponto). Consequências: CP-E. Requisitos: [A]. Integração: `obj_m16_recon`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| partida | rochas, capacetes cobertos de 12/5, a abadia | carta | artilharia | — | Kaleta | — |
| trilha | pedra branca, carvalho rasteiro, mãos feridas | — | campos de tiro | fogo da cota | Duda | — |
| cota | crateras, equipamento | outra formação | MG 42 | assalto | — | posição intermédia |
| dobra | corpos cobertos, macas | descida | fogo sobre a linha | — | carregadores | carta manchada |
| noite/18/5 | posições abandonadas | — | — | — | — | — |
| abadia | ruínas | patrulha | — | — | — | bandeira ao longe |

Objetos com origem: a carta (campo de refugiados — pendência), os capacetes de 12/5 (1.º assalto), as posições abandonadas (retirada noturna), a bandeira (12.º Lanceiros, 10:20).

---

## 6. Diálogos (VO polaco)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Herc | "A cota, não o telhado. Olhem o terreno." (§79) | intro t 20 | 1 | — |
| 002 | Kaleta | "Esta carta já viajou mais do que eu." (§79) | intro t 8 | 2 | — |
| 003 | Ostrowski | "Depois você termina de ler. Primeiro vamos tirá-lo daqui." (§79) | Kaleta ferido | 1 | — |
| 010 | Kaleta | "Ainda não acabei a carta." (PR #44) | intro t 12 | 3 | — |
| 011 | Duda | "De onde vem?" (V1) | 010 | 3 | — |
| 012 | Kaleta | "De longe. De onde nos mandaram, e depois de onde fugimos." (V1) | 011 | 2 | — |
| 013 | Herc | "Oito horas. Subir." (V1) | ordem | 1 | — |
| 014 | Herc | "Trilha vê-se da cota. Talude não. Tu escolhes, Ostrowski." (V1) | trilha | 1 | — |
| 015 | Duda | "A pedra corta." (V1) | rocha | 3 | — |
| 016 | Herc | "Fogo da cota! Em baixo!" (V1) | fogo | 0 | 20 |
| 017 | Sowa | "Os de maio ainda estão aqui." (V1) | capacetes | 3 | — |
| 018 | Herc | "Mensagem ao posto. Munição depois." (V1) | cota | 1 | — |
| 019 | Herc | "Lateral só quando a outra companhia cobrir. Esperem." (V1) | lateral | 1 | — |
| 020 | outra formação (voz) | "Cobrimos! Vão!" (V1) | evento | 1 | — |
| 021 | Pietrzak | "MG na pedra, duas horas!" (V1) | MG | 0 | 20 |
| 022 | Herc | "Posição intermédia. Pausa na dobra." (V1) | B | 1 | — |
| 023 | Kaleta | (atingido) "…a perna. E o saco pesa." (V1) | hit | 1 | — |
| 024 | Ostrowski | — (guarda a carta; interação) → Kaleta: "Guarda-a tu." (V1) | — | 2 | — |
| 025 | Pietrzak | "Abram espaço na descida. Há um ferido!" (PR #44) | descida | 1 | — |
| 026 | Sowa | "Linha protegida. Devagar. A maca escorrega." (V1) | maca | 2 | 20 |
| 027 | Herc | "Dois separados à esquerda. Tragam-nos." (V1) | separados | 1 | — |
| 028 | Herc | "Feridos no posto. Agora voltamos." (V1) | C | 1 | — |
| 029 | Herc | "Ordem: retomar. A cota ainda não é nossa." (V1) | retomar | 1 | — |
| 030 | Duda | "Contra-ataque!" (V1) | — | 0 | 20 |
| 031 | Herc | "Noite. Aguentar." (V1) | noite | 1 | — |
| 032 | Herc | "Saíram. De noite. Olhem as posições." (V1) | cartela | 1 | — |
| 033 | Herc | "Acesso. Dois ainda disparam; recuam." (V1) | residual | 1 | — |
| 034 | Sowa | "A abadia. Vazia." (V1) | vista | 2 | — |
| 035 | Duda | "Uma bandeira. Lá em cima." (V1) | 10:20 | 2 | — |
| 036 | Herc | "Não é nossa para pôr. É nossa para ver." (V1) | 035 | 2 | — |
| 037 | companheiro | "Se a carta chega, é porque alguém a levou." (PR #44) | outro | 2 | — |
| 038 | Ostrowski | "Guardo-a até desceres também." (PR #44) | outro (variante Kaleta no posto) | 2 | — |
| 039 | Herc | "Desce este. Depois contamos." (V1) | ferido final | 1 | — |

Callouts: `co_m16_mg_rock`, `co_m16_mortars`, `co_m16_stretcher_slip`. Silêncios: a abadia.

---

## 7. Arte e atmosfera

**Paleta:** calcário branco, cinza de ruína, verde-escuro de carvalho rasteiro, caqui de battledress, poeira. **Luz:** 06:30 luz rasante de leste sobre a encosta; 11:00 sombra de rocha; 18/5 05:30 azul; 10:20 manhã clara. **Materiais:** pedra, battledress, lona, metal. **Silhuetas:** a abadia (`EXACT`), as cotas 593/569, Albaneta. **Destruição:** crateras, posições abandonadas, ruínas. **Humanos:** battledress, Mk II com águia, mãos feridas, Kaleta com a perna ligada; capacetes cobertos de 12/5. **Violência reduzida:** corpos sempre cobertos.

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| partida | vento, papel, pedras | — | artilharia | — |
| trilha | pedras, respiração, morteiros | outras companhias | — | — |
| cota | MG 42 com relevo, eco | outra formação | — | — |
| dobra | maca a raspar, respiração, estancar | fogo sobre a linha | artilharia afastada | — |
| noite | — | — | — | relativo |
| abadia | vento | patrulha | — | **obrigatório** |

Sons novos: pedra/encosta, maca em declive, MG 42 com eco de montanha. VO polaco.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| Ataque de 17/5 às 08:00; 593 tomada 17/18; retirada alemã noturna | D (resumo; fontes divergem no dia) | H16; S-C16 | leitura |
| Patrulha do 12.º Lanceiros às 10:20 de 18/5 | D | S-C16 | — |
| Engenheiros com baixas nos campos de minas; Albaneta; Gardziela | D (resumo) | S-C16 | — |
| 1.ª Bde dos Cárpatos; batalhão; trilha | R/P | — | P-C16 |
| Carta de um campo de refugiados polacos em África | R (plausível) | — | pesquisa |
| Equipamento II Corpo 1944 | D | — | auditoria |

**Proibições:** equipamento de 1939; duelo na abadia; bandeira do protagonista; hejnał encenado (fora da janela). **Fora de cena:** Anders, Gurbiel, Czech.

---

## 10. Handoff técnico

**Contrato:** `id m16_monte_cassino`, `order 16`, relógio 06:30→11:00 do dia seguinte com noite em snap, grupos (`grp_section`, `grp_bearers`, `grp_other_formation`, `grp_lancers_patrol`, `grp_de_fallschirm`), setores, checkpoints A–E, cutscenes (intro, date, outro), falas, flags, debrief.

**Flags:** `m16.completed`, `m16.route`, `m16.duda_status`, `m16.wounded_carried`, `m16.letter_state ∈ {clean, stained}`, `m16.kaleta_status ∈ {evacuated_with_letter, evacuated}`, `m16.recon_done`.

**Sistemas:** [A] simulação, fogo como dados, carriedBy; [B] maca a dois em encosta, data, interação (carta); [C] terreno vertical (talude/rocha com velocidade), eco por relevo. [D] nenhum.

**Disciplinas:** Level: encosta 800 m com três percursos, dobra, cota, trilho; Combate/IA: paraquedistas em pedra; Arte: calcário; Personagens: II Corpo 1944 (6), Fallschirmjäger; Animação: maca em declive, mãos na rocha; Som: montanha; VO: polaco; Historiador: P-C16; QA: data, carta, kaleta.

**Testes:** `letter_state` muda só ao estancar; bandeira às 10:20 do relógio; nenhum objetivo dentro da abadia.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| A carta passa | (intro) | passar | Kaleta; Herc aponta | — | start | CP-A |
| Trilha | `obj_m16_approach` | escolher; observar | Duda; Herc | — | 08:00 | — |
| Cota 593 | `obj_m16_support_advance` | cobrir; mensagem; lateral com cobertura | outra formação | crateras | base | CP-B |
| Kaleta | `obj_m16_evacuate/regroup` | maca; reunir | carregadores | carta manchada | B | CP-C |
| Retomar | `obj_m16_resume` | lances | contra-ataques | — | C | noite |
| 18 de maio | `obj_m16_date` | — | — | posições abandonadas | noite | CP-D |
| Acesso; abadia | `obj_m16_consolidate/recon` | consolidar; reconhecer | residual recua; lanceiros | bandeira ao longe | D | CP-E |
| A carta no bolso | `obj_m16_help_wounded_end` | ajudar | Herc | — | recon | `m16.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | a carta e a descida. |
| 2 | Autenticidade | 7 | datas/bandeira D; batalhão/trilha P-C16; a carta precisa de pesquisa. |
| 3 | Personagens | 7 | Kaleta, Herc; carregadores funcionais. |
| 4 | Diálogos | 8 | "Não é nossa para pôr. É nossa para ver." |
| 5 | Originalidade | 8 | descer feridos como verbo; abadia vazia. |
| 6 | Variedade | 8 | subir, apoiar, carregar, reunir, data, reconhecer. |
| 7 | Set pieces | 7 | — |
| 8 | Atmosfera | 8 | calcário e vento. |
| 9 | Environmental storytelling | 8 | capacetes de 12/5. |
| 10 | Cinematográfica | 8 | a bandeira ao longe. |
| 11 | Sonora | 8 | eco de montanha; silêncio da abadia. |
| 12 | Impacto emocional | 8 | carta manchada. |
| 13 | Ritmo | 7 | dois dias em 22–30 min com `readyScale`. |
| 14 | Continuidade | 8 | `kaleta_status` → M30. |
| 15 | Integração técnica | 6 | terreno vertical [C]. |

**Correções aplicadas:** (1) a bandeira às 10:20 é evento visível ao longe, nunca do protagonista; (2) o hejnał fica fora da janela (debrief); (3) nenhum residual se rende (a rendição é de M19/M23/M25/M28).
