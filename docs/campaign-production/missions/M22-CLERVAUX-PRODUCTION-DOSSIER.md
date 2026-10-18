# M22 — OFENSIVA · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 16–17/12/1944, setor de Clervaux, Luxemburgo; 110.º Regimento de Infantaria, 28.ª Divisão; POV Paul Lewis; fonte H21; 22–30 min; três falas; checkpoints "reorganização; defesa; evacuação; nova data; saída final — restaurar controle dos acessos sem ressuscitar posições perdidas"; o desgaste recente da divisão existe na conversa/equipamento "sem transferir Allen invisivelmente do 112.º para o 110.º"; a conquista de Clervaux nunca apresentada como vitória americana; "Vozes e sons continuam mesmo após o objetivo local". **Proposto:** Lewis como estafeta (runner) da Companhia de Comando do 1.º Batalhão na zona de Clervaux (S-C11/CONTINUITY §2 — P-C22), o caderno de rotas de Lewis como objeto, a estática onde devia haver resposta como silêncio, o posto da estrada perdido → Tolliver acusa Pascal / Lewis confirma o mapa (`m22.pascal_deescalated`), a prioridade da retirada como decisão (`m22.wounded_out`), a lista incompleta como final. **Sistemas:** [A] quase tudo (fogo como dados, interiores, rádio por estados); [C] blindados alemães na rua como pressão por agenda (nunca combate de tanques); [B] rádio/estafeta por estados de ligação; [D] passagem de data com snapshot.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m22_clervaux` / 22 |
| Datas | Ato I 1944-12-16T05:00+01:00 → 16:00 · Ato II 1944-12-17T06:30+01:00 → 1944-12-17T21:00+01:00 (hora da Europa Central) |
| Local | posto de rádio/estafetas num anexo de hotel na encosta oeste de Clervaux (ficção dentro da cidade real: "hoteleiro sem nome real") → acesso leste da cidade (estrada do vale do Clerve, curva com casas) → pátios e interiores de três edifícios ligados (hotel-anexo, garagem, casa de pedra) → rua de saída para oeste (estrada de Marnach? **não**: Marnach é a leste; a saída é para oeste/noroeste na direção de Wiltz, por uma estrada secundária na encosta) → ponto de reunião possível fora da cidade — `RECONSTRUCTED` (P-C22) |
| Operação | ofensiva alemã das Ardenas: barragem às 05:30 de 16/12 em toda a frente; o 110.º (dois batalhões num front de 9–10 milhas) com QG do col. Fuller no Hotel Claravallis; a cidade cai na noite de 17/12; o castelo resiste até 17/18; Fuller capturado (S-C11 — DOCUMENTED em resumo) |
| Unidade | 110.º Reg., 28.ª DI (canónico) → Companhia de Comando / 1.º Batalhão, zona de Clervaux (proposta, RECONSTRUCTED) → o posto de Lewis |
| Elenco | pfc. Paul Lewis (POV, estafeta), T/5 Gene Pascal (rádio), sgt. Vern Hollis (graduado), T/5 Lyle Grady (motorista do jipe/camião de feridos), pte. Roy Tolliver (o acusador), pte. Owen Kessock (ferido do posto da estrada, transportável — proposta), pfc. Hal Dugan (ferido grave, maca — proposta), um tenente (ten. Sayer, oficial do posto — proposta; capturado no fim como consequência do roteiro), dois homens do posto da estrada que não respondem (nomes só na lista: Bricker, Nunes — propostas), o hoteleiro luxemburguês (sem nome real; fala luxemburguês/francês sem tradução), outro grupo com transporte (propostas) |
| Fora de cena | col. Hurley Fuller; o Hotel Claravallis; o castelo (silhueta e som, nunca "defendido" pelo jogador) |
| Intocável | datas, local, unidade, POV, falas `dlg_m22_001–003`, os cinco checkpoints ("restaurar controle dos acessos sem ressuscitar posições perdidas"), "Allen não é transferido", a barragem não é spawn (primeiro falha a comunicação), a cidade cai (não é variável do jogador), captura de personagens ficcionais como consequência (não derrota do jogador), "vozes e sons continuam após o objetivo local", a lista incompleta |

---

## 1. Story Bible

**Logline.** Num posto de rádio onde a rotina tem cheiro a café e o rádio diz coisas sem importância, Paul Lewis escreve rotas limpas num caderno. Às 05:30 o rádio cala-se antes de a terra tremer. Em dois dias Lewis vai reunir homens, defender um acesso enquanto os relatos chegam de setores que já não existem, levar feridos por uma rota que ainda está aberta e percorrer pátios gelados para proteger a saída de um grupo. Chega ao ponto de reunião com menos homens e entrega uma lista com nomes por confirmar. A cidade cai atrás dele. O rádio continua a falar.

**As oito respostas.**
1. **Situação central:** a surpresa — resistir num lugar que não era frente; mapas, corredores e atraso importam mais do que matar tanques (PR #44, adotado).
2. **Modo de contar:** as vozes que ainda respondem no rádio — cada posto que deixa de responder é um setor perdido; nunca uma contagem de inimigos.
3. **Objeto:** o caderno de rotas de Lewis (rotas limpas → rotas riscadas → a lista incompleta na última página).
4. **Silêncio:** a estática onde devia haver resposta (o rádio é o único instrumento; quando não responde, o silêncio é dele).
5. **Tarefa que não é matar:** reunir homens; identificar a ameaça por relatos; defender um acesso o tempo suficiente; levar feridos e informação; escolher a prioridade da retirada; percorrer interiores; proteger a saída; entregar a lista.
6. **Custo humano:** o posto da estrada deixa de responder (às 08:40 de 16/12: Bricker e Nunes) → Tolliver acusa Pascal de ter "mandado o posto ficar" (causa: a ordem veio por rádio e ninguém a entendeu bem) → Lewis pode confirmar com o caderno (a ordem registada era "aguentar até ordem"; Pascal transmitiu-a tal como veio) / calar-se → `m22.pascal_deescalated` se o jogador confirma ou Hollis corta; Tolliver não se converte; os dois nomes ficam na lista "sem contacto" até ao fim (nunca "mortos"). Em paralelo, a **prioridade da retirada** (17/12): levar primeiro os feridos (Dugan na maca, lento; o jipe de Grady parte com Kessock) ou a informação (os mapas do posto com as posições conhecidas — o tenente quer que cheguem antes) → `m22.wounded_out ∈ {first, after}`; em `after`, Dugan sai mais tarde pela passagem já sob fogo (≥ 30 m, sem morte) e Hollis diz a fala 002 como ordem tardia; em `first`, os mapas saem com Lewis no fim (podem ficar incompletos: uma página molhada). Nenhum ramo salva a cidade.
7. **Pessoas históricas:** Fuller e o QG do Hotel Claravallis fora de cena (o posto de Lewis não é o QG; Fuller só nome num relato); o castelo como silhueta.
8. **Debrief:** regista a barragem de 05:30, os dois batalhões num front de 9–10 milhas, a queda da cidade na noite de 17/12, o castelo até 17/18, a captura de Fuller e dos defensores do castelo; "a resistência ganhou tempo para outras forças (Bastogne), mas não impediu a rutura naquele setor"; Bricker e Nunes "sem contacto"; o tenente Sayer "capturado" (ficção); "a lista entregue incompleta".

**Três motivos.** (a) *A rotina* — o posto de rádio com objetos de vida diária que depois se abandona; (b) *as vozes* — "Não tenho contato com o posto da estrada." (001): a perda chega pelo rádio antes de chegar pela rua; (c) *a lista* — "Estes chegaram. Dos outros, ainda não sei." (003): a informação incompleta também salva pessoas (PR #44).

**Temas.** A surpresa sem culpa; o atraso como vitória local que não é vitória; a dependência de ordens escritas e a sua falha; dizer o que se sabe sem inventar; a cidade que cai atrás.

**Estrutura (§54).** CONTEXTO (cartela: novo protagonista; a divisão desgastada por Hürtgen na conversa) → INTRO (posto de rádio de rotina: café, cartas, um rádio civil) → APROXIMAÇÃO (05:30: interferência → silêncio → barragem; cobertura; reunir) → DIÁLOGO (relatos: postos que não respondem) → PRIMEIRO CONTATO (defender o acesso leste; infantaria pela estrada do vale) → ESCALADA (o posto da estrada cala-se; Tolliver/Pascal) → COMBATE PRINCIPAL (16/12 tarde: manter o acesso; o transporte do outro grupo passa) → SET-PIECE (levar feridos e informação; prioridade) → PAUSA (cartela 17/12: posições reduzidas; o hotel abandonado com os objetos) → CLÍMAX (interiores e pátios; proteger a saída; blindados na rua) → CONSEQUÊNCIA (ponto de reunião; a lista; o rádio continua) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Lewis | escreve rotas limpas; confia nos relatórios | Pascal; Hollis | a estática; a prioridade; a lista | comunica o que sabe sem inventar | entrega a lista incompleta |
| Pascal | rádio de rotina; "Não tenho contato…" (001) | Lewis | Tolliver | não se defende; continua a chamar | sai com o rádio às costas |
| Hollis | "Tirem os feridos antes que fechem a passagem." (002) | posto | a passagem | — | sai; capturado? **não** (vivo no ponto de reunião) |
| Grady | motorista | feridos | o jipe sob fogo | — | leva Kessock; volta? não (o jipe não volta: a estrada fecha) |
| Tolliver | acusa | Pascal | o caderno | baixa a voz; não pede desculpa | sai |
| Sayer (ten.) | ordens escritas | mapas | fica para cobrir a saída com dois homens | — | capturado (consequência do roteiro, 17/12 noite) |
| Kessock / Dugan | feridos | Grady; Lewis | — | — | Kessock evacuado no jipe; Dugan evacuado (cedo/tarde) |
| hoteleiro | serve café; depois fecha as portadas | ninguém | — | — | fica na cave |

**O que a missão recusa.** Allen transferido; a barragem como spawn; Lewis a destruir tanques; o castelo defendido pelo jogador; Fuller em cena; Clervaux "salva"; um tutorial de rádio; nomes mortos inventados (só "sem contacto"); uma cena do hotel QG copiada de filmes/documentários; combate noturno de 17/12 "até ao último".

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Rádio de rotina" (`cs_m22_intro`, ≤ 80 s)
2 16/12 05:00 · 3 anexo do hotel na encosta oeste: sala com mesa de rádio (SCR-300 e EE-8 de campanha), fogão a lenha, café numa lata, cartas de Natal, um rádio civil a tocar baixo, botas a secar; a janela dá para o vale e o castelo em silhueta · 4 noite ainda; nevoeiro no vale; frio (D geral) · 5 Lewis, Pascal, Hollis a dormir sentado, Tolliver, Kessock (chegado do posto da estrada com um recado), o hoteleiro a acender o fogão · 6 Cartela: CLERVAUX — LUXEMBURGO — 16 DE DEZEMBRO DE 1944 — 05:00 · 110.º REGIMENTO DE INFANTARIA · 28.ª DIVISÃO. Cartela 2: "Novo protagonista: pfc. Paul Lewis, estafeta. A 28.ª saiu de Hürtgen há três semanas para um setor calmo." Pascal faz a chamada de rotina: posto da estrada (Bricker) responde "tudo calmo"; o posto do vale responde; Lewis copia no caderno a rota do dia (limpa, a lápis). Tolliver: "Hürtgen levou-me a companhia. Isto aqui é férias." Hollis, de olhos fechados: "Não digas isso em voz alta." O hoteleiro põe café. Às 05:28 o rádio civil fica em estática; Pascal bate no SCR: estática também. · 7 estabelecer a rotina, o objeto, as vozes e a falha de comunicação **antes** da barragem (PR #44) · 8 olhar; copiar a rota (interação: o caderno) · 9 — · 10 — · 11 — · 12 café, cartas, rádio civil, botas · 13 `dlg_m22_010–016` · 14 rádio civil baixo; fogão; a chamada de rotina; **estática às 05:28** · 15 plano fixo na mesa; o caderno; a janela com o castelo · 16 `missionStart` · 17 05:30: a barragem (o som chega 2 s depois do clarão no vale) · 18 — · 19 [A] cutscene; [B] estados de rádio (ok → interferência → estática) · 20 Tolliver traz Hürtgen pela conversa (não Allen)

### Cena 2 — "05:30" (jogável; `obj_m22_cover_rally`)
2 16/12 05:30–06:30 · 3 anexo → pátio → cave do hotel → as casas vizinhas (posto de estafetas, cozinha, uma garagem com o jipe de Grady) · 4 noite com clarões; nevoeiro · 5 posto; homens a sair de casas vizinhas (8–10 proxies da companhia de comando); o hoteleiro a fechar portadas; Grady no jipe · 6 Barragem alemã (Nebelwerfer e artilharia: impactos ≥ 30 m, na encosta e na cidade baixa; nunca spawn: começou pela estática) → procurar cobertura (a cave do hotel; a parede de pedra do pátio) → reunir homens (interação curta "connosco", M04) e identificar a ameaça **sem tutorial**: Pascal tenta os postos (só o do vale responde: "ouvimos motores a leste"); Hollis manda Lewis correr a pé até à casa da esquina para trazer o grupo de lá (estafeta: a rádio não os apanha) · 7 §79 ponto 1 · 8 abriga-se; corre (estafeta) até à esquina (120 m com dois impactos agendados ≥ 30 m); reúne 4 homens; volta · 9 pela rua (rápido, exposto aos impactos agendados com assobio) vs pelos pátios (lento, coberto) · 10 Hollis organiza; Pascal chama; Grady aquece o jipe; Tolliver pragueja · 11 artilharia (dados, agendada, com assobio); nenhuma infantaria ainda · 12 vidros partidos, café entornado, uma carta no chão (persistente: será vista de novo a 17/12) · 13 `dlg_m22_017–023` · 14 **barragem** (Nebelwerfer: o uivo antes do impacto), vidros, o rádio em estática entre chamadas · 15 livre · 16 start · 17 reunidos no pátio (`evt_m22_rallied`) · 18 `cp_m22_a_reorganizacao`; `m22.men_rallied` (4–6) · 19 [A] `safeImpact`, callouts, reunir · 20 a carta no chão

### Cena 3 — "Postos que não respondem" (jogável; `obj_m22_hold_access`)
2 16/12 06:30–10:30 (escala acelerada entre contactos; `readyScale`) · 3 acesso leste da cidade: a curva da estrada do vale com duas casas de pedra, um muro, uma barricada improvisada (um camião atravessado), vista para a estrada que sobe de leste; o castelo acima à direita · 4 amanhecer tardio (~08:00) sob nevoeiro; luz cinzenta; o nevoeiro levanta devagar · 5 o posto (Lewis, Hollis, Pascal com o rádio, Tolliver, Grady, 4–6 reunidos); mensageiros a pé que chegam de outros setores (3 ao longo da fase); alemães: infantaria (Volksgrenadier) pela estrada e pelas encostas (dados; 100–400 m), depois o som de blindados no vale (longe → médio) · 6 Defender o acesso enquanto mensageiros relatam penetração noutros setores (cada mensageiro traz um setor perdido: "Marnach não responde"; "a estrada de Hosingen cortada"; "o vale a sul tem blindados"); o inimigo aproxima-se por vias coerentes (estrada e encostas, nunca "de trás"); às 08:40 o posto da estrada (Bricker/Nunes) deixa de responder: Pascal: "Não tenho contato com o posto da estrada." (001) → **Tolliver acusa**: "Mandaste-os ficar. Eu ouvi." → o jogador pode abrir o caderno (interação: a ordem registada às 06:10 era "aguentar até ordem", assinada pelo tenente; Pascal transmitiu-a tal como veio) e confirmar: "Está aqui. Não foi ele." / calar-se → Hollis corta se ninguém o fizer em 10 s; Tolliver baixa a voz; os dois nomes passam a "sem contacto" na lista · 7 §79 ponto 2 · 8 defende (100–400 m); ouve os mensageiros; abre o caderno e confirma (ou não); roda posições · 9 confirmar / calar-se · 10 Hollis comanda a barricada; Pascal chama os postos; mensageiros chegam; Tolliver na casa da esquerda · 11 Volksgrenadier em três sondas (07:30, 08:50, 10:00; dados); blindados por som; nenhum tanque entra no acesso neste ato · 12 barricada, a lista no caderno (nomes a serem riscados/anotados), um mensageiro com o braço ao peito · 13 `dlg_m22_001` (canónica), `024–036` · 14 sondas abafadas pela curva; o rádio: vozes e **estática onde devia haver resposta**; blindados ao longe no vale · 15 livre; beat fixo no caderno (2 s) · 16 CP-A · 17 terceira sonda repelida; o tenente ordena preparar evacuação (`evt_m22_access_held`) · 18 `cp_m22_b_defesa`; `m22.pascal_deescalated`; `m22.player_confirmed_log`; `m22.sectors_lost` (lista) · 19 [A] fogo como dados, rotação, mensageiros como NPCs com agenda; [B] caderno como interação de registo; [C] blindados por som/agenda · 20 Bricker e Nunes só "sem contacto"

### Cena 4 — "Tirem os feridos antes que fechem a passagem" (jogável; `obj_m22_evacuate`) — **custo humano / decisão**
2 16/12 10:30–13:00 · 3 do acesso leste ao anexo (feridos: Kessock a andar, Dugan na maca) → a rua de saída para oeste (300 m: um troço exposto à estrada do vale, um troço coberto por casas) → a estrada secundária na encosta onde o jipe de Grady espera · 4 nevoeiro a levantar; céu cinzento · 5 posto; feridos; Grady; o tenente Sayer com os mapas do posto (posições conhecidas, setores perdidos anotados); **o transporte de outro grupo** (um camião de outra companhia com feridos) que passa pela rua de saída antes de Lewis · 6 Levar feridos e informação por uma rota que permanece aberta: o camião do outro grupo passa primeiro (demonstra uma defesa maior; o jogador cobre a sua passagem no troço exposto — a estrada do vale já tem uma MG alemã a 350 m que dispara por rajadas agendadas); **decisão de prioridade**: Sayer quer que os mapas cheguem ao batalhão antes de tudo ("Se os mapas não chegam, ninguém sabe onde estamos."); Hollis: "Tirem os feridos antes que fechem a passagem." (002) → (a) feridos primeiro: Dugan na maca pelo troço coberto (Lewis à frente, 4 min), Kessock no jipe; os mapas vão depois com Lewis a pé (uma página molha-se no caminho: `m22.maps_damaged`); (b) informação primeiro: Lewis leva os mapas ao jipe (2 min) e Grady parte com Kessock e os mapas; Dugan sai depois pelo troço já sob fogo (salva ≥ 30 m, sem morte; chega) → `m22.wounded_out = first | after` · 7 §79 ponto 3 · 8 cobre o camião no intervalo da MG; escolhe; carrega a frente da maca (opcional; senão Tolliver) · 9 feridos / informação; carregar / cobrir · 10 Grady; Sayer; Hollis; Tolliver carrega sem falar; o outro grupo com agenda própria · 11 MG a 350 m (rajadas agendadas com intervalo); morteiros no troço exposto (≥ 30 m) · 12 o camião do outro grupo, a maca, os mapas numa pasta de lona · 13 `dlg_m22_002` (canónica), `037–046` · 14 o camião; a MG por rajadas; o jipe de Grady a partir; o rádio continua · 15 livre · 16 CP-B · 17 Grady parte com Kessock (e Dugan ou os mapas) (`evt_m22_jeep_gone`) · 18 `cp_m22_c_evacuacao`; `m22.wounded_out`; `m22.maps_damaged`; `m22.player_carried` · 19 [A] maca, agenda de MG, veículo NPC com agenda (M19); [B] prioridade como escolha de sequência · 20 a estrada fecha depois: Grady não volta

### Cena 5 — "17 de dezembro" (`cs_m22_day2`, ≤ 60 s)
2 17/12 06:30 · 3 o anexo do hotel **abandonado**: a mesa de rádio vazia (o SCR foi com Pascal), o café gelado na lata, as cartas, a carta no chão de ontem, o fogão apagado; lá fora, a cidade baixa com fumo; o castelo com tiros · 4 madrugada fria, nevoeiro mais leve, fumo · 5 Lewis, Hollis, Pascal (rádio às costas), Tolliver, Sayer, 3 reunidos (menos que ontem: dois foram com o outro grupo, um ferido ontem à tarde — fixo); o hoteleiro na cave com a família (porta fechada) · 6 Cartela: CLERVAUX — 17 DE DEZEMBRO DE 1944 — 06:30. Snapshot: posições reduzidas (a barricada do acesso leste perdida de madrugada: **não se restaura**), menos homens, sem jipe; o mapa de Sayer agora com metade dos setores riscados; blindados alemães já na cidade baixa (som médio); a ordem: retirar/reorganizar para oeste percorrendo interiores e pátios (a rua principal é dos blindados). Pascal: "O batalhão responde. Dizem: saiam pelo que houver." Lewis abre o caderno: as rotas de ontem riscadas; escreve uma nova pelos pátios. · 7 §79 ponto 4: "passagem explícita para 17/12" (PR #44: "não um letreiro sobre cena idêntica") · 8 olhar; escrever a rota (interação) · 9 — · 10 — · 11 blindados na cidade baixa; o castelo sob ataque (longe/médio) · 12 a mesa vazia, o café gelado, a carta no chão · 13 `dlg_m22_047–051` · 14 **silêncio obrigatório** na sala (o rádio civil já não toca; o fogão não estala); fora, motores de blindados · 15 plano fixo na mesa — o mesmo enquadramento da cena 1, sem as pessoas · 16 fim do Ato I · 17 Hollis: "Pátios." · 18 `cp_m22_d_nova_data` ("nova data" — **sem ressuscitar posições perdidas**) · 19 [D] snapshot por data (cast, posições, destruição) · 20 o enquadramento repetido é a passagem de data

### Cena 6 — "Interiores" (jogável; clímax; `obj_m22_interiors`, `obj_m22_protect_exit`)
2 17/12 06:45–09:30 (escala acelerada) · 3 três edifícios ligados por pátios na encosta oeste: o hotel-anexo (cozinha, corredor, escada de serviço), uma garagem (portão para a rua: **não** usar), uma casa de pedra (cave com saída para o pátio de trás, janelas para a rua de saída); cada edifício com lógica diferente de saída (porta de serviço; buraco na parede aberto por morteiro; cave → pátio); a rua principal abaixo com dois blindados alemães (Panzer IV/StuG — dados; pressão: disparam contra fachadas, nunca entram nos pátios) e infantaria que sobe pelas escadas da encosta · 4 manhã cinzenta; fumo; neve fina a começar? **não** (sem registo: nevoeiro e frio) · 5 o grupo (7); outro grupo americano a sair mais acima (proxies, 6) que precisa de cobertura; alemães (infantaria pelas escadas; blindados na rua) · 6 Percorrer interiores/pátios pesquisados para a saída (cada edifício: encontrar a saída certa — a porta da garagem para a rua é a errada e Hollis avisa; o buraco de morteiro na casa de pedra é a certa); **proteger a saída de um grupo** (o outro grupo passa pelo pátio de trás; o jogador e Tolliver cobrem a escada da encosta com fogo curto; Pascal transmite ao batalhão: "Grupo do Weller a sair; nós a seguir."); o tenente Sayer fica com dois homens a cobrir a saída de todos e manda Lewis levar o caderno e a pasta ("Vai. Tens os nomes.") — fixo: Sayer é capturado nessa noite com os defensores do setor (consequência do roteiro; nunca mostrado morto) · 7 §79 ponto 5 · 8 navega interiores; escolhe saídas; cobre a escada (30–120 m); leva a pasta · 9 cozinha → corredor (rápido, janela exposta) vs escada de serviço (lento, coberto) · 10 Hollis guia; Tolliver cobre sem falar; Pascal transmite; Sayer fica · 11 infantaria pelas escadas (dados; 3 sondas); blindados contra fachadas (impactos ≥ 30 m do jogador, sempre com o som do motor antes) · 12 cozinha com louça, uma cama feita, o buraco de morteiro, cartuchos nos pátios · 13 `dlg_m22_052–061` · 14 passos em interiores gelados; blindados na rua (motor, lagartas, o canhão contra a fachada); o rádio · 15 livre · 16 CP-D · 17 o outro grupo passou e o grupo chega à rua de saída (`evt_m22_exit_open`) · 18 `m22.other_group_out`; `m22.sayer_status = captured` (fixo) · 19 [A] interiores (M10/M28), fogo como dados; [C] blindados por agenda (pressão, nunca alvo obrigatório; uma bazuca existe no grupo — Tolliver — e **pode** disparar contra o StuG para o afastar da fachada: opcional, sem destruição necessária) · 20 Sayer não reaparece

### Cena 7 — "Saída final" (jogável; `obj_m22_reach_rally`)
2 17/12 09:30–11:00 · 3 a rua de saída → a estrada secundária na encosta → bosque → o ponto de reunião possível (um cruzamento com um posto do batalhão, um jipe, um sargento com uma lista) · 4 manhã; nevoeiro no vale; fumo da cidade atrás · 5 o grupo (Lewis, Hollis, Pascal, Tolliver, 3); desgarrados de outros setores a chegar · 6 Chegar ao ponto de reunião possível sob fogo esparso (a estrada do vale vê o troço exposto: MG a 400 m; um morteiro); recolher dois desgarrados pelo caminho (interação "connosco"; falam de Marnach e de Hosingen); a cidade atrás: tiros no castelo, blindados; o rádio de Pascal continua a receber chamadas de postos que ainda respondem e de outros que não · 7 "Vozes e sons continuam mesmo após o objetivo local" · 8 navega; recolhe desgarrados; cobre · 9 estrada (rápido, MG) vs bosque (lento, coberto) · 10 Hollis à frente; Pascal com o rádio ligado · 11 MG (dados); morteiro ocasional · 12 equipamento largado; um camião abandonado; o posto do batalhão · 13 `dlg_m22_062–066` · 14 o rádio com vozes e estática; a cidade atrás (castelo; blindados) · 15 livre · 16 exit open · 17 chegada ao posto (`evt_m22_rally_point`) · 18 `cp_m22_e_saida` ("saída final") · 19 [A] · 20 —

### Cena 8 — "Estes chegaram" (`cs_m22_outro`, ≤ 60 s) + debrief
2 17/12 11:00 → cartela noturna · 3 o posto do batalhão: uma mesa de campanha, o sargento com a lista · 4 manhã cinzenta · 5 Lewis, Hollis, Pascal, Tolliver, 3, desgarrados · 6 Lewis entrega a pasta (mapas, completos ou com uma página molhada) e o caderno aberto na última página: a lista — nomes com "chegou", nomes com "jipe (Grady, Kessock, Dugan?)", nomes "sem contacto" (Bricker, Nunes), "Sayer — ficou a cobrir". Lewis: "Estes chegaram. Dos outros, ainda não sei." (003). O sargento copia. Pascal pousa o rádio: ainda fala — uma voz pede ordens de um setor que já não existe no mapa. Ninguém a desliga. Cartela: a cidade de Clervaux caiu na noite de 17/12; o castelo resistiu até à manhã de 18; o col. Fuller e os defensores foram capturados; a resistência do 110.º atrasou a ofensiva alemã o tempo que Bastogne precisava. Cartela 2: "Bricker, Nunes: sem contacto. Ten. Sayer: capturado." · 7 §79 final · 8 skip · 9 — · 10 — · 11 — · 12 a lista; o rádio a falar · 13 `dlg_m22_003` (canónica), `067–069` · 14 **o rádio continua** (a única fonte depois da fala 003); nenhuma música · 15 plano fixo na lista; plano do rádio pousado · 16 `evt_m22_rally_point` · 17 `missionEnd` · 18 `m22.completed`; `m22.list_incomplete = true` (sempre); `m22.maps_delivered` (full/damaged) · 19 [A] cutscene com variantes de texto da lista · 20 M23 abre com Bennett a 23/12: a ofensiva que M22 "atrasou" é o cerco de M23 — ligação só pela cartela

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m22_cover_rally` | Procure cobertura e reúna os homens das casas vizinhas | sim | 05:30 | `evt_m22_rallied` | — | `men_rallied` | A |
| `obj_m22_hold_access` | Defenda o acesso leste; ouça os mensageiros | sim | A | 3 sondas | — | `sectors_lost`; `pascal_deescalated`; `player_confirmed_log` | B |
| `obj_m22_evacuate` | Leve feridos e informação pela rota aberta: decida a prioridade | sim | B | jipe parte | — | `wounded_out`; `maps_damaged`; `player_carried` | C |
| `obj_m22_cover_truck` | Cubra a passagem do transporte do outro grupo | sim (paralelo) | B | camião passou | — | `other_truck_through` | — |
| `obj_m22_interiors` | Percorra interiores e pátios até à rua de saída | sim | D | `evt_m22_exit_open` | — | — | — |
| `obj_m22_protect_exit` | Proteja a saída do grupo do Weller | sim (paralelo) | interiores | grupo passou | — | `other_group_out`; `sayer_status = captured` (fixo) | — |
| `obj_m22_reach_rally` | Chegue ao ponto de reunião; recolha desgarrados | sim | exit open | posto | — | — | E |
| `obj_m22_deliver_list` | Entregue a lista | sim (fim) | E | cutscene | — | `list_incomplete` | — |

### 3.2 Setores
`s1_radio_post` (perto) · `s2_east_access` (perto, 16/12) · `s3_exit_street` (perto: troço exposto/coberto) · `s4_interiors` (perto, 17/12) · `s5_city_mid` (médio: acessos da cidade, posições em rutura, blindados na rua principal, o castelo) · `s6_valley_far` (longe: colunas, baterias, fumo no vale). Agendas: estática 05:28; barragem 05:30–06:10 (impactos agendados); sondas 07:30/08:50/10:00; posto da estrada cala-se 08:40; mensageiros 07:10/08:20/09:40; camião do outro grupo 11:20; MG da estrada rajadas 6 s/pausa 15 s; blindados na rua principal a partir de 06:45 de 17/12 (fachadas); sondas pelas escadas 07:15/08:00/08:50; outro grupo sai 09:00.

### 3.3 Checkpoints
A reorganização · B defesa (acesso mantido; setores perdidos registados) · C evacuação (jipe partido; prioridade salva) · D nova data (**snapshot 17/12: sem ressuscitar o acesso leste nem o jipe**) · E saída final (ponto de reunião). Restaurar sempre o controlo dos acessos ainda detidos e nunca os perdidos.

### 3.4 Justiça
A barragem começa pela estática e tem assobio/uivo; impactos ≥ 30 m; blindados nunca atingem o jogador a < 30 m sem o som do motor antes; a MG da estrada tem intervalo legível; as sondas vêm por vias coerentes (estrada, encostas, escadas); nenhuma morte do jogador por "fecho de passagem" (a passagem fecha para NPCs por agenda, nunca como falha); Bricker/Nunes/Sayer são estados fixos, nunca mortes; a cidade cai em qualquer ramo.

---

## 4. Set pieces

### SP-22-1 "Postos que não respondem"
Contexto: o acesso leste. Preparação: a chamada de rotina de 05:00 (Bricker "tudo calmo"). Experiência: defender a curva enquanto cada mensageiro apaga um setor; o rádio chama e recebe estática; às 08:40 o posto da estrada cala-se; Tolliver acusa; o caderno confirma. Companheiros: Pascal chama sem parar; Hollis corta; Tolliver baixa a voz. Ambiente: barricada, a lista. Evolução: três sondas; blindados por som. Clímax: fala 001. Consequências: `sectors_lost`, `pascal_deescalated`. Requisitos: [A]; [B] caderno. Integração: `obj_m22_hold_access`.

### SP-22-2 "Tirem os feridos antes que fechem a passagem"
Contexto: a rua de saída. Preparação: o camião do outro grupo passa primeiro (o jogador cobre no intervalo da MG). Experiência: Sayer vs Hollis; a maca pelo troço coberto ou os mapas ao jipe; o jipe de Grady parte. Companheiros: Grady; Tolliver carrega; o outro grupo. Ambiente: a pasta de lona; o camião. Evolução: a passagem fecha depois (agenda). Clímax: fala 002. Consequências: `wounded_out`, `maps_damaged`. Requisitos: [A] maca, veículo NPC. Integração: `obj_m22_evacuate`, `obj_m22_cover_truck`.

### SP-22-3 "Interiores"
Contexto: 17/12, a encosta. Preparação: o anexo abandonado (o mesmo enquadramento sem pessoas). Experiência: três edifícios com três saídas; a garagem errada; o buraco de morteiro certo; blindados contra fachadas; a escada da encosta coberta; o grupo do Weller passa; Sayer fica. Companheiros: Hollis guia; Pascal transmite; Tolliver com a bazuca (opcional). Ambiente: cama feita, louça. Evolução: três sondas pelas escadas. Clímax: "Vai. Tens os nomes." Consequências: `other_group_out`, `sayer_status`. Requisitos: [A] interiores; [C] blindados por agenda. Integração: `obj_m22_interiors`, `obj_m22_protect_exit`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| posto 05:00 | café, cartas de Natal, rádio civil, botas a secar | chamada de rotina | estática 05:28 | — | hoteleiro | — |
| posto 05:30 | vidros, café entornado, carta no chão | reunir | barragem | — | homens das casas | — |
| acesso leste | barricada (camião), muro, casas de pedra | mensageiros | postos calados | sondas | mensageiro ferido | lista com "sem contacto" |
| rua de saída | troço exposto/coberto, pasta de lona | camião do outro grupo; jipe | prioridade | MG por rajadas | Grady; Dugan; Kessock | jipe partido; página molhada |
| posto 17/12 | mesa vazia, café gelado, a mesma carta no chão | — | blindados na cidade | — | hoteleiro na cave | — |
| interiores | cozinha, cama feita, garagem, buraco de morteiro | saídas | escadas | sondas; fachadas | grupo do Weller; Sayer fica | cartuchos nos pátios |
| ponto de reunião | mesa de campanha, jipe, lista | desgarrados | — | — | o sargento | o rádio continua |

Objetos com origem: o caderno (comprado em Wiltz a 2/12; rotas a lápis), a carta no chão (de Kessock, para a mãe, não enviada), o rádio civil (do hoteleiro; Radio Luxembourg silenciosa desde setembro — usar uma estação alemã/francesa genérica, sem nome real), a pasta de lona (do tenente Sayer), o camião da barricada (sem gasolina desde 15/12).

---

## 6. Diálogos (VO inglês; luxemburguês/francês para o hoteleiro, sem tradução; alemão por gritos ao longe)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Pascal | "Não tenho contato com o posto da estrada." (§79) | 08:40 | 0 | — |
| 002 | Hollis | "Tirem os feridos antes que fechem a passagem." (§79; em `after` dita como ordem tardia) | prioridade | 1 | — |
| 003 | Lewis | "Estes chegaram. Dos outros, ainda não sei." (§79) | outro | 1 | — |
| 010 | Pascal (rádio) | "Posto da estrada, aqui Anexo. Situação." / Bricker: "Tudo calmo. Frio." (V1) | intro t 8 | 1 | — |
| 011 | Lewis | (copia a rota; sem fala) | intro t 15 | — | — |
| 012 | Tolliver | "Hürtgen levou-me a companhia. Isto aqui é férias." (V1) | intro t 25 | 2 | — |
| 013 | Hollis | "Não digas isso em voz alta." (V1) | 012 | 2 | — |
| 014 | hoteleiro (luxemburguês) | — (café; sem tradução) | intro t 35 | — | — |
| 015 | Pascal | "Estática. No civil e no nosso." (V1) | 05:28 | 1 | — |
| 016 | Hollis | (acorda) "Desde quando?" (V1) | 015 | 1 | — |
| 017 | Hollis | "Cave! Todos!" (V1) | 05:30 | 0 | — |
| 018 | Pascal | "Vale responde: ouvem motores a leste. Estrada não responde." (V1) | cave | 1 | — |
| 019 | Hollis | "Lewis. Casa da esquina. Traz os do Weller. A pé." (V1) | estafeta | 1 | — |
| 020 | homem da esquina | "Quem manda isto? Onde é a frente?" (V1) | esquina | 2 | — |
| 021 | Lewis | "Aqui. Agora é aqui. Connosco." (V1) | reunir | 1 | — |
| 022 | Grady | "O jipe pega. Não sei por quanto tempo." (V1) | pátio | 2 | — |
| 023 | Hollis | "Acesso leste. A curva. Vamos ver o que vem." (V1) | rallied | 1 | — |
| 024 | mensageiro 1 | "Marnach não responde desde as seis. Mandaram-me a pé." (V1) | 07:10 | 1 | — |
| 025 | Hollis | "Sondas pela estrada. Deixem-nos chegar aos cem." (V1) | sonda 1 | 0 | — |
| 026 | mensageiro 2 | "Estrada de Hosingen cortada. Há blindados no vale a sul." (V1) | 08:20 | 1 | — |
| 027 | Pascal (rádio) | "Posto da estrada, Anexo. Bricker. Bricker, responde." (estática) (V1) | 08:35 | 1 | — |
| 028 | Tolliver | "Mandaste-os ficar. Eu ouvi. 'Aguentar até ordem.'" (V1) | 001 | 1 | — |
| 029 | Pascal | "Foi o que veio. Eu passo o que vem." (V1) | 028 | 1 | — |
| 030 | Lewis | "Está aqui. Seis e dez, assinado pelo tenente. Não foi ele." (V1; se confirma) | caderno | 0 | — |
| 031 | Hollis | "Tolliver. A arma para a estrada. A boca para dentro." (V1; se ninguém confirma em 10 s) | — | 0 | — |
| 032 | Tolliver | "…Bricker devia-me dez dólares." (V1) | 030/031 | 2 | — |
| 033 | Pascal | "Vou continuar a chamar." (V1) | — | 2 | — |
| 034 | mensageiro 3 | "O regimento diz: aguentar e preparar a evacuação dos feridos para oeste." (V1) | 09:40 | 1 | — |
| 035 | Hollis | "Terceira sonda. Depois desta, saímos." (V1) | 10:00 | 0 | — |
| 036 | Sayer | "Preparem os feridos e os mapas. A passagem para oeste ainda está aberta. Ainda." (V1) | access held | 1 | — |
| 037 | outro grupo (camião) | "Feridos da Baker! Passagem!" (V1) | 11:20 | 1 | — |
| 038 | Hollis | "Cobrir o camião. A MG pára quinze segundos. Contem." (V1) | — | 1 | — |
| 039 | Sayer | "Os mapas primeiro. Se não chegam, ninguém sabe onde estamos." (V1) | prioridade | 1 | — |
| 040 | Hollis | (002) | 039 | 1 | — |
| 041 | Lewis | "Feridos." / "Mapas." (V1; escolha) | — | 1 | — |
| 042 | Dugan | "Não me larguem no troço aberto." (V1) | maca | 1 | — |
| 043 | Tolliver | (pega na maca; sem fala) | — | — | — |
| 044 | Grady | "Kessock dentro. Mais um lugar. Decidam." (V1) | jipe | 1 | — |
| 045 | Grady | "Vou. Se a estrada fechar, não volto." (V1) | partida | 1 | — |
| 046 | Pascal | "Batalhão confirma receção do jipe. Nós ficamos até ordem." (V1) | jeep gone | 1 | — |
| 047 | Pascal | "O batalhão responde. Dizem: saiam pelo que houver." (V1) | 17/12 | 1 | — |
| 048 | Hollis | "A curva é deles desde as quatro. Não se volta lá." (V1) | 17/12 | 1 | — |
| 049 | Sayer | "Metade do mapa está riscado. A outra metade é por onde vamos." (V1) | 17/12 | 1 | — |
| 050 | Lewis | (escreve a nova rota; sem fala) | — | — | — |
| 051 | Hollis | "Pátios." (V1) | fim da cutscene | 1 | — |
| 052 | Hollis | "Garagem não. Dá para a rua. A rua é deles." (V1) | garagem | 1 | — |
| 053 | Tolliver | "Buraco de morteiro na casa de pedra. Dá para o pátio de trás." (V1) | buraco | 1 | — |
| 054 | Pascal (rádio) | "Grupo do Weller a sair pelo pátio. Nós a seguir." (V1) | outro grupo | 1 | — |
| 055 | Hollis | "Escada da encosta. Fogo curto. Só para os travar." (V1) | escada | 0 | — |
| 056 | Tolliver | "Bazuca. Aquele canhão está a comer a fachada. Afasto-o?" (V1; opcional) | StuG | 2 | — |
| 057 | Hollis | "Afasta. Não o caces." (V1) | 056 | 1 | — |
| 058 | Sayer | "Eu fico com o Marks e o Teller a cobrir a saída. Lewis: o caderno e a pasta. Vai. Tens os nomes." (V1) | exit | 0 | — |
| 059 | Lewis | "Tenente—" / Sayer: "Vai." (V1) | 058 | 1 | — |
| 060 | Hollis | "Rua de saída. Bosque. Não parem na estrada." (V1) | exit open | 1 | — |
| 061 | Pascal (rádio) | "Anexo a sair. Sayer fica a cobrir. Registem." (V1) | — | 1 | — |
| 062 | desgarrado 1 | "Marnach. Éramos quarenta. Somos dois." (V1) | bosque | 1 | — |
| 063 | Lewis | "Connosco." (V1) | recolher | 1 | — |
| 064 | Pascal (rádio) | (vozes: um posto pede ordens; outro responde; estática) (V1) | estrada | 2 | — |
| 065 | Hollis | "Posto do batalhão. Ali. Com lista." (V1) | ponto | 1 | — |
| 066 | Tolliver | "O castelo ainda dispara." (V1) | ponto | 3 | — |
| 067 | sargento do batalhão | "Nomes. Todos os que tiveres." (V1) | outro | 1 | — |
| 068 | Lewis | (003) | — | 1 | — |
| 069 | Pascal | (pousa o rádio; a voz pede ordens; ninguém desliga) (V1) | outro fim | — | — |

Callouts: `co_m22_static`, `co_m22_nebelwerfer`, `co_m22_probe_road`, `co_m22_mg_pause`, `co_m22_armor_street`, `co_m22_stairs`. Silêncios: a sala vazia de 17/12; a estática entre chamadas.

---

## 7. Arte e atmosfera

**Paleta:** cinzento de nevoeiro, pedra de Clervaux (ardósia e xisto escuro), verde-oliva desbotado de M1943/capotes, castanho de madeira de hotel, branco de cartas e de lista, laranja baixo de fogão e de incêndios na cidade baixa, o castelo como silhueta clara. **Luz:** 05:00 interior com fogão e lâmpada (quente `#d9a66a`), fora azul-noite com nevoeiro; 08:00 amanhecer tardio cinzento sem sombras; 11:00 nevoeiro a levantar; 17/12 06:30 madrugada com fumo (o mesmo enquadramento da sala, frio `#8a8f96`). **Materiais:** madeira, pedra gelada, vidro partido, lona, papel, lama gelada. **Silhuetas:** o castelo, o hotel na encosta, a curva com a barricada, os blindados na rua principal. **Destruição:** persistente por data (vidros, fachadas lascadas, buraco de morteiro). **Humanos:** 28.ª DI três semanas após Hürtgen — capotes, galochas em alguns, barbas, Tolliver com lenço de Hürtgen; Pascal com o SCR às costas; o hoteleiro de colete. **Violência reduzida:** Dugan coberto; nenhum plano de mortos americanos (só "sem contacto").

**Imagem única:** o posto de rádio com objetos de vida diária, abandonado (ART §4, RECONSTRUCTED).

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| rotina | rádio civil, fogão, café, lápis no caderno | — | — | — |
| 05:28 | **estática** no civil e no SCR | — | — | **a estática** |
| barragem | Nebelwerfer (uivo), impactos, vidros | casas vizinhas | o vale inteiro a responder | — |
| acesso leste | sondas abafadas pela curva, rádio com vozes/estática | posições em rutura | blindados no vale | **estática onde devia haver resposta** |
| rua de saída | camião, MG por rajadas, jipe | — | colunas | — |
| 17/12 sala | nada: o fogão não estala | blindados na cidade baixa | o castelo | **obrigatório** |
| interiores | passos em soalho e pedra gelados, portas, o canhão contra a fachada | escadas da encosta | — | — |
| saída | bosque, rádio | cidade atrás | castelo | — |
| ponto | lista; o rádio pousado | — | — | — (o rádio fala) |

Sons novos: SCR-300/EE-8 com estados, rádio civil, Nebelwerfer, interiores gelados de hotel, blindados na rua (motor + lagartas + canhão contra fachada). Música: motivo V "A lama" **não** aqui (M22 é seco e frio: sem música; a estática é a música). VO inglês, luxemburguês/francês, alemão ao longe.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| Ofensiva às 05:30 de 16/12; barragem em toda a frente | D | H21; S-C11 | — |
| 110.º com dois batalhões num front de 9–10 milhas; QG de Fuller no Hotel Claravallis | D (resumo) | S-C11 | — |
| Cidade cai na noite de 17/12; castelo até 17/18; Fuller capturado | D (resumo) | S-C11 | — |
| Posto de Lewis (Cia. Comando/1.º Btl.); anexo de hotel; rota de saída para oeste | R | — | **P-C22** |
| Marnach/Hosingen como setores perdidos (relatos) | D (geral) | S-C11 | confirmar horas dos relatos |
| A 28.ª saída de Hürtgen para as Ardenas em novembro ("setor calmo") | D (geral) | H20/H21 | — |
| Nebelwerfer; Volksgrenadier; Panzer IV/StuG na cidade a 17/12 | D (geral) | S-C11 | tipos exatos (P-C22) |
| Pascal, Hollis, Grady, Tolliver, Kessock, Dugan, Sayer, Bricker, Nunes, Weller, Marks, Teller, o hoteleiro | F | — | acrescentar Kessock/Dugan/Sayer/Weller a CONTINUITY §4 |
| Equipamento: M1, BAR, bazuca M9, SCR-300, EE-8, jipe, camião | D | TIMELINE §3 | auditoria |

**Proibições:** Allen transferido; Fuller/QG em cena; o castelo defendido pelo jogador; Clervaux salva; tanques como alvo obrigatório; mortos inventados com nome; rádio real nomeado (Radio Luxembourg) a tocar. **Fora de cena:** Fuller; o Claravallis; o castelo (silhueta/som).

---

## 10. Handoff técnico

**Contrato:** `id m22_clervaux`, `order 22`, **dois segmentos de relógio** (16/12 05:00→16:00; 17/12 06:30→21:00 com cartela noturna final) com snapshot em D, `cast` (Lewis, Pascal, Hollis, Grady, Tolliver, Kessock, Dugan, Sayer, hoteleiro, mensageiros ×3, sargento do batalhão, desgarrados), grupos (`grp_post`, `grp_rallied`, `grp_messengers`, `grp_other_truck`, `grp_other_group_weller`, `grp_de_probe_a/b/c`, `grp_de_stairs`, `grp_de_armor_street`, `grp_stragglers`), setores s1–s6, checkpoints A–E (D = snapshot sem ressuscitar), cutscenes (intro, day2, outro), falas, flags, debrief.

**Flags:** `m22.completed`, `m22.men_rallied`, `m22.sectors_lost` (lista), `m22.pascal_deescalated`, `m22.player_confirmed_log`, `m22.wounded_out ∈ {first, after}`, `m22.maps_damaged`, `m22.maps_delivered`, `m22.player_carried`, `m22.other_truck_through`, `m22.other_group_out`, `m22.sayer_status = captured` (fixo), `m22.list_incomplete = true` (fixo).

**Sistemas:** [A] fogo como dados, `safeImpact`, reunir, maca a dois, veículo NPC com agenda (M19), interiores (M10), rotação; [B] rádio por estados (ok/interferência/estática/resposta parcial) ligado a `sectors_lost`, caderno como registo (ler/escrever), prioridade como sequência; [C] blindados na rua como pressão por agenda (disparam contra fachadas; a bazuca pode afastá-los: estado "recuou", nunca destruição obrigatória); [D] snapshot por data (cast reduzido, posições perdidas, destruição persistente, sem jipe). **Fallbacks honestos:** sem blindados animados → som + impactos nas fachadas por evento; sem bazuca opcional → o StuG recua por agenda ao fim de 3 min.

**Disciplinas:** Level: anexo (sala com janela para o castelo), pátio, cave, casa da esquina, curva do acesso leste com barricada, rua de saída (300 m, dois troços), três edifícios ligados, estrada da encosta, bosque, ponto de reunião; Combate/IA: sondas por via, escadas, blindados por agenda; Arte: Clervaux em ardósia, hotel, nevoeiro, o mesmo enquadramento em dois estados; Personagens: 28.ª pós-Hürtgen, hoteleiro, mensageiros; Animação: copiar no caderno, bater no rádio, carregar maca, bazuca (opcional), pousar o rádio; Som: estados de rádio, Nebelwerfer, interiores gelados; VO: inglês/luxemburguês/alemão; Historiador: P-C22 (posto, edifícios, rota, horas dos relatos, blindados); QA: snapshot D nunca restaura a curva nem o jipe; `list_incomplete` sempre true; nenhum nome ficcional marcado "morto"; MG com intervalo; estática antes da barragem em qualquer carregamento de CP-A.

**Testes:** carregar D e verificar `grp_de_probe_*` do acesso leste inativos e a barricada marcada perdida; `wounded_out = after` → Dugan chega vivo ao jipe/ponto com salva ≥ 30 m; `pascal_deescalated` true se `player_confirmed_log` ou corte de Hollis; o rádio continua a emitir depois de `missionEnd` até ao fade; nenhum impacto de blindado a < 30 m sem `co_m22_armor_street` antes.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Rádio de rotina; a estática | (intro) | copiar a rota | Pascal chama; Tolliver fala de Hürtgen | — | start | — |
| 05:30 | `obj_m22_cover_rally` | abrigar-se; correr à esquina; reunir | Hollis organiza; Grady aquece o jipe | vidros; carta no chão | 05:30 | CP-A; `men_rallied` |
| Postos que não respondem | `obj_m22_hold_access` | defender; ouvir; abrir o caderno | mensageiros; Tolliver acusa; Hollis corta | barricada; lista | A | CP-B; `sectors_lost`; `pascal_deescalated` |
| O camião do outro grupo | `obj_m22_cover_truck` | cobrir no intervalo | outro grupo com agenda | — | 11:20 | `other_truck_through` |
| Tirem os feridos antes que fechem a passagem | `obj_m22_evacuate` | escolher; carregar | Sayer vs Hollis; Grady parte | jipe partido; página molhada | B | CP-C; `wounded_out` |
| 17 de dezembro | (cutscene day2) | escrever a rota | Pascal "saiam pelo que houver" | sala vazia; curva perdida | fim ato I | CP-D (snapshot) |
| Interiores; a saída do Weller | `obj_m22_interiors` / `protect_exit` | escolher saídas; cobrir a escada; (bazuca) | Hollis guia; Sayer fica; blindados contra fachadas | buraco de morteiro; cartuchos | D | `other_group_out`; `sayer_status` |
| Saída final | `obj_m22_reach_rally` | bosque/estrada; recolher | desgarrados de Marnach | — | exit open | CP-E |
| Estes chegaram | `obj_m22_deliver_list` | entregar | sargento copia; Pascal pousa o rádio | o rádio continua | E | `m22.completed`; `list_incomplete` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 9 | a surpresa contada pelo rádio; a lista incompleta como final; a cidade cai em todos os ramos. |
| 2 | Autenticidade | 8 | S-C11 sólido no resumo; posto/edifícios/rota P-C22; nenhuma figura real em cena. |
| 3 | Personagens | 8 | Pascal não se defende; Tolliver com Hürtgen nas costas; Sayer fica (consequência, não heroísmo). |
| 4 | Diálogos | 8 | "Foi o que veio. Eu passo o que vem." / "Vai. Tens os nomes." |
| 5 | Originalidade | 9 | estafeta como POV; rádio por estados; prioridade feridos/informação; o mesmo enquadramento em duas datas. |
| 6 | Variedade | 8 | abrigar, correr como estafeta, reunir, defender, registar, cobrir transporte, decidir prioridade, carregar, interiores, proteger saída, recolher, entregar. |
| 7 | Set pieces | 8 | nenhum tanque abatido; os blindados são pressão. |
| 8 | Atmosfera | 9 | nevoeiro, ardósia, estática. |
| 9 | Environmental storytelling | 9 | café gelado, a carta no chão duas vezes, a mesa vazia. |
| 10 | Cinematográfica | 8 | o enquadramento repetido; o rádio pousado que continua. |
| 11 | Sonora | 9 | a estática como silêncio; Nebelwerfer; interiores gelados. |
| 12 | Impacto emocional | 8 | nomes "sem contacto"; Sayer. |
| 13 | Ritmo | 8 | 22–30 min; duas datas com `readyScale`. |
| 14 | Continuidade | 8 | Hürtgen pela conversa (não Allen); a cartela liga a M23. |
| 15 | Integração técnica | 7 | quase tudo [A]/[B]; blindados por agenda e snapshot [C]/[D] com fallbacks. |

**Correções aplicadas:** (1) a barragem é precedida pela estática (05:28) e por linhas que deixam de responder, nunca spawn; (2) Bricker, Nunes e Sayer recebem estados ("sem contacto", "capturado"), nunca "mortos"; (3) a saída de Clervaux foi orientada para oeste (Marnach é a leste, na direção do inimigo); (4) a bazuca contra o StuG é opcional e só o afasta, para que "matar tanques" nunca seja o jogo; (5) a prioridade feridos/informação substitui "outro corredor genérico de feridos" (PR #44); (6) o rádio continua a emitir depois da fala 003 ("vozes e sons continuam"); (7) Kessock, Dugan, Sayer e Weller são propostas deste dossiê a acrescentar a CONTINUITY §4.
