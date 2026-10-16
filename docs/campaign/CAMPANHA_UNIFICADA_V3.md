# COD-guerra — CAMPANHA UNIFICADA V3 · 1939–1945

> **PLANO NARRATIVO PROPOSTO / não implementado.** Complementa `docs/campaign/ROTEIROS_30_MISSOES_POLIMENTO_V2.md`, `STORY_BIBLE_M02_M30_V2.md`, `DIRECAO_CINEMATOGRAFICA_30_MISSOES_V1.md` e a §72/73/79 do `docs/PROMPT_MESTRE.txt`. Não modifica os roteiros, os IDs, os acontecimentos históricos nem as missões jogáveis. A guerra e seus resultados reais são a estrutura; as experiências pessoais são ficcionais.

## 1. Identidade de toda a campanha

**Logline:** Durante seis anos, soldados de frentes diferentes aprendem que a guerra não se resume às batalhas vencidas: é aquilo que fizeram sob pressão, aqueles a quem ajudaram e os nomes a que nunca mais ouviram responder.

**Tema:** “Contar os vivos, não os inimigos mortos.” Deriva da ideia dramática da M01, mas **não** força todos os protagonistas a repetir a frase nem se conhecerem entre si. O eco entre capítulos é de *ações humanas*, não de teletransporte narrativo ou coincidências improváveis.

**Promessa ao jogador:** a cada missão muda o lugar, a forma de lutar, o que se arrisca, o tipo de silêncio e o que permanece depois da batalha. A narrativa deve ser adulta e por vezes perturbadora, sem transformar nacionalidades em estereótipos de monstros nem a crueldade em espetáculo repetido.

### O que este documento não faz

- Não altera `M01Simulation`, `mission.json` ou `missions/m01-tczew/SCRIPT.md`; **M01 permanece PROTÓTIPO JOGÁVEL**.
- Não cria mapas, cutscenes executáveis, modelos, áudio ou gameplay; **M02–M30 permanecem PLANEADAS**.
- Não inventa crimes de guerra *históricos* de comandantes, companhias ou soldados identificáveis. Cenas de encontros ficcionais são `GAMEPLAY_DRAMATIZATION` e têm **gate histórico** por tempo, local e plausibilidade.
- Não copia a cena de prisioneiros queimados/abatidos de *World at War*, nem qualquer fala, personagem, localização, coreografia, morte ou enquadramento reconhecível.
- Não representa todos os exércitos como moralmente uniformes; soldados, civis e prisioneiros têm individualidade e reações plausíveis.

## 2. Macroestrutura da campanha — seis movimentos

| Movimento | Missões | Sentido dramático | Jogabilidade principal | Linguagem de imagem/som | Final de transição |
|---|---|---|---|---|---|
| **I — A guerra chega** | M01–M03 · Polónia 1939 | Rotina destroçada, derrota e defesa de casas | Ponte/retirada, ofensiva curta, combate urbano | Amanhecer → campos → pó de edifícios, apitos ferroviários e vozes perdidas | De um abrigo sobrelotado, corte para a estrada imóvel de Dunquerque |
| **II — Sobreviver para continuar** | M04–M07 · 1940–41 | O objetivo muda de vencer para regressar ou aguentar | Embarque, combate aéreo, cerco desértico, inverno | Água/motores, céu, calor seco, gelo e vento | Uma voz chama nomes na neve; a próxima frente começa em água tropical |
| **III — A guerra consome tudo** | M08–M12 · 1942–43 | Distância, fábricas, logística, homens exaustos | Reconhecimento, travessia fluvial, interiores industriais, ofensiva nocturna, retirada | Selva quieta, reflexos de incêndio, metal, artilharia, rádio falho | Documento do último transporte fecha; o motor de um tanque abre M13 |
| **IV — A escala da invasão** | M13–M20 · 1943–44 | Mobilidade e alianças; algumas vitórias custam quase tudo | Tanque, jeep, praias distintas, montanha, salto, sebes, três datas de Arnhem | Metal, poeira, mar, pedra, noite, água outra vez | Reed atravessa um rio em silêncio; floresta fechada ocupa o ecrã |
| **V — Aproximar-se não é terminar** | M21–M26 · 1944–45 | Falta de homens, exaustão, ataques longos, civil no meio | Floresta, ruptura, cerco, vulcão, ponte preservada, Okinawa calma | Lama, neve, cinza, aço, aldeias habitadas, céu marítimo | A praia calma de Okinawa corta para preparação de artilharia em Seelow |
| **VI — Parar de disparar** | M27–M30 · 1945 | A guerra termina em datas diferentes; o silêncio não desfaz consequências | Artilharia de Seelow, rendição em Berlim, desgaste em Shuri, cerimónia sem combate | Ruído gigantesco → combates a cessar → chuva → água e vento | Reconstrução começa, não cura instantânea |

**Montagens de transição:** 8–20 s recomendados como proposta, com skip acessível e créditos de data/local. Nunca comprimir vários anos numa falsa cena contínua. Transições podem usar documentos, silhuetas, gestos ou objetos **sem afirmar que um protagonista passou a outro teatro**. Não mostrar mapa do mundo com setas erradas nem texto que anuncie um resultado não observado.

## 3. Identidade emocional de cada protagonista recorrente

- **Jan (M01):** da contagem de vagões e tiros para a contagem de pessoas. A caneca de Nowicki e a ausência à chamada são próprios da M01, não um adereço repetido em outras frentes.
- **Piotr (M02–03):** do movimento otimista na Bzura à proteção de uma família em Varsóvia. O estado de Lis afeta presença, fala, percurso e memória; não regressa ileso por defeito.
- **Reed (M04→M20):** duas retiradas separadas por quatro anos e uma trajetória militar explícita; não repetir Whitfield como fantasma nem permitir que o barco espere por todos.
- **Malec (M05):** piloto que descobre que voltar com o ala importa mais que somar vitórias. A guerra aérea tem responsabilidade sobre pessoas, não tiros constantes.
- **Daniel (M06→M11):** de suportar um cerco a abrir um corredor; Fraser, Ellis e Morrow não são acessórios intercambiáveis.
- **Orlov (M07→M27→M28):** aprende a orientar homens na neve, chega em 1945 exausto, enfrenta o limite moral de uma rendição. Transferência e hospitalização do passado ficam documentadas como ficção.
- **Brooks (M08→M26→M29):** aprende a desconfiar do silêncio da praia, a não disparar contra sombras e a guardar humanidade quando já não lhe sobra paciência. **Sargento Henry Cole, seu companheiro Marine, não é Nathan Cole, protagonista paraquedista da M17.**
- **Lane (M14→M18→M19):** estrada, praia e sebes; os sobreviventes reconhecíveis mudam, inclusive Price ou substituto conforme save.
- **Bennett (M23):** guarda luvas para alguém que poderá não regressar. O objeto passa de promessa pessoal a cuidado real com outro vivo.
- **Cross (M30):** observa a rendição formal, não salva retroativamente os outros nem substitui representantes históricos.

### Montagem como linguagem, não como coincidência

Nunca juntar protagonistas que não se conheciam apenas para fazer homenagem. Emparelhar **gestos**: mãos numa caneca na Polónia e dedos gelados na Rússia; água sob ponte e água junto a um barco; rádio a pedir ajuda e rádio que finalmente cala; uma carta aberta e uma família que não voltou para casa. A coincidência é de linguagem cinematográfica, não de factos.

## 4. Curva de tensão, crueldade e humanidade

Tratar **intensidade dramática** separadamente de **nível gráfico**. Não aumentar sangue em cada missão para simular escalada: quanto mais o jogador vê perdas, mais importantes se tornam a respiração, as dúvidas, o silêncio e o tratamento dado a quem já não combate.

| Fase | Intensidade desejada | Exemplos de consequências | Conduta dos soldados |
|---|---|---|---|
| 1939 | Surpresa, ruptura, perda | Feridos no posto, civis sob ruínas, ausência na chamada | Recrutas hesitam; líderes tentam manter coesão; não são heróis omniscientes |
| 1940–41 | Sobrevivência e desgaste | Tripulações não regressam, barcos partem, frio incapacita | Homens disputam recursos e ainda podem cuidar uns dos outros |
| 1942–43 | Brutalidade do combate próximo | Destruição industrial, ferimentos sérios, tripulações presas em veículos | Medo, raiva e decisões precipitadas contrastam com disciplina de socorro |
| 1944 | Escala e perda de referências | Civis deslocados, praia com destroços, resgate limitado | Exaustão moral sem reduzi-la a crueldade automática |
| 1945 | Vingança, exaustão e cessar-fogo | Prisioneiros rendidos, suspeitas sobre civis, território devastado | Alguns querem retaliar; outros impedem abusos; nenhum exército é uniformemente cruel |
| M30 | Consequências após o combate | Famílias ausentes, reconstrução incompleta, sobreviventes mudados | Não existe “botão de vitória” que apague a guerra |

**Regra sobre prisioneiros/civis:** desarmados e rendidos deixam de ser alvos de combate. Não oferecer missão/achievement/XP por matá-los, queimá-los, humilhá-los ou torturá-los. O conflito dramático pode ocorrer entre NPCs ficcionais, com intervenção, testemunho, desobediência a impulso violento ou contenção — nunca com autorização implícita de atrocidade. Se um acto abusivo é representado, é explicitamente condenado por personagens e/ou consequência, não celebrado.

**Regra de possibilidade:** nenhuma morte roteirizada é anunciada como evitável quando não é. Se há perigo que o jogador pode interromper, evidenciar janela de acção, agência real e resultado inequívoco. Não usar a escolha “matar prisioneiro ou perder missão”.

**Regra de escala:** não inserir crimes de guerra em toda missão. A brutalidade mais perturbadora deve ser rara, personalizada, pesquisada e deixada ressoar; violência física pode ser intensa durante combate legítimo sem fazer de cada aliado um criminoso.

## 5. A cena-âncora original de conflito moral: M28, Berlim — «A porta aberta»

**Tipo:** encontro ficcional proposto, dependente de pesquisa de setor/época; não é afirmação de atrocidade historicamente documentada. É um **contraste de personagens**, não cópia da cena de World at War lembrada pelo Capitão.

**Situação:** durante a consolidação de um prédio em 1–2/5/1945, a arma já baixou em parte da rua. Um alemão visivelmente desarmado abandona a porta de uma oficina com ambas as mãos à vista. Um soldado soviético ficcional do grupo de Orlov, ferido e furioso após perdas recentes, avança com a arma erguida. Um camarada tenta conter a mão dele. A cena trata de **não deixar que o ódio transforme um rendido em alvo**.

**Encenação original (8–15 s jogáveis, salvo se timing/realidade histórica o impedirem):**

1. A porta range e o som de um rifle que cai no chão é ouvido *antes* da figura sair. Orlov observa livremente o limiar, sem zoom artificial.
2. O soldado alemão sai de mãos erguidas, sem arma. A IA muda para `SURRENDERED`/inofensivo; outro aliado começa procedimentos de guarda. Não há munição ou recompensa associada a disparar.
3. Um soviético furioso ergue o fuzil; um companheiro segura o seu braço e diz **«Baixa isso. Ele já largou a arma.»** A voz não é música heroica; é medo de uma segunda tragédia.
4. Orlov pode **aproximar-se e mandar baixar as armas** ou ficar em cobertura enquanto outro soldado interrompe a agressão. Ambas as vias mantêm o prisioneiro vivo nesta proposta; a ação do jogador modifica quem se aproxima, falas e confiança do grupo, não o estado histórico de Berlim. Se esse nível de interatividade ainda não existir, escolher versão puramente encenada honesta — sem falsa opção.
5. O soldado zangado dá um passo atrás, respira e desvia o olhar. O rendido continua a tremer; o grupo encaminha-o sob custódia. Sem fanfarra, "honra +10" ou câmera fetichista.
6. Mais tarde, quando chega a ordem de cessar-fogo, o mesmo soldado zangado baixa a arma antes que Orlov lhe mande. Sem monólogo didático; a ação mostra escolha de disciplina.

**Exemplo de fala (original, não canónica):**
- **SOLDADO IRRITADO:** «Ele pode largar a arma. O que fez não desaparece.»
- **CAMARADA:** «Então não faças tu o que não podes desfazer.»
- **ORLOV:** «Vão levá-lo. Nós ficamos aqui.»

**Proteções de produção:** diálogo e ação são ficcionais; contexto histórico do local/ator/unidade exige verificação. Se o jogo permitir disparar em rendidos, o sistema tem de explicitar que não é combate/XP e tratar com consequências sérias adequadas; este documento não autoriza construir um "minijogo de execução". Guardar `m28.pow_secured`, `m28.comrade_deescalated` e `m28.moral_event_seen` apenas como **flags propostos**, não como schema existente. O evento não reabre no reload, nem reaparece como três prisioneiros após pular.

## 6. Diálogos e reações: como parecerem humanos

**Antes do perigo:** comentários pessoais e gestos suficientes para criar vínculo (um casaco emprestado, um cantil oferecido, uma rota conhecida) sem cinco minutos de exposição.

**Durante o combate:** ordens curtas, falhas de comunicação, pedidos dirigidos a pessoas reais. O mesmo NPC não sabe a posição de um inimigo oculto sem observação e não faz comentário perfeito ao mesmo tempo em que recarrega e recebe tiro.

**Depois:** alguns evitam falar. Outros procuram o ferido, discordam da decisão, mudam o modo como seguram a arma ou guardam um objeto. Não obrigar todo NPC a verbalizar uma moral da história.

**Interrupção:** explosões, perdas e novos avisos podem cortar uma conversa, mas as falas não continuam de forma incoerente depois que o ator foi morto ou afastado. Se necessário, passar a informação de missão por um substituto válido.

**Ambivalência:** a mesma pessoa pode ser corajosa e injusta; um inimigo pode combater e depois render-se; um aliado pode sentir desejo de vingança e ser impedido. O jogo não confunde compreender o sentimento com desculpar violência contra indefesos.

## 7. Sistema de consequências e interface narrativa

Propor grupos de dados novos **apenas ao desenhar a missão**, preservando o schema existente e o determinismo:

- `character_status`: alive, wounded, incapacitated, evacuated, missing, dead; compatibilidade por actor e episódio.
- `character_memory`: evento observado/acontecido; distinção entre observação do jogador e evento do mundo.
- `morale_exhaustion`: categoria de atuação, sem barra RPG e sem recompensa por atos de crueldade.
- `civilian_protection`: rotas abertas/abrigos seguros quando a história e o jogo permitirem, nunca vidas recolhidas como moedas.
- `pow_safety`: estado de rendição/custódia de ficcionais, sem incentivo para execução.
- `chapter_recap`: resumo só de factos realmente ocorridos e de estados salvos; não mentir no debrief.

**Se a engine não suportar tais variáveis**, ficam como requisitos condicionais de uma futura arquitetura, não campos a escrever imediatamente. O primeiro passo é observar o schema real e criar contratos mínimos com testes.

## 8. Cartelas e recapitulações entre missões

- **Abertura de capítulo:** título, data e unidade em fonte verificável; texto curto com o que o protagonista sabe no momento. Não antecipa o resultado histórico da missão.
- **Transição de frente:** localização temporal explícita; no máximo uma ideia emocional. Nunca sugerir que dois personagens se cruzaram.
- **Debrief:** objetivo local, cronologia geral, localização geográfica, estatuto dos principais companheiros e pendências históricas, com termos `DOCUMENTED`, `RECONSTRUCTED` e `GAMEPLAY_DRAMATIZATION` fora da experiência ficcional quando pertinente.
- **M30:** memória dos objetos apenas em epílogos de localização e data plausíveis; não reunir todo elenco no Missouri.

## 9. Critérios de qualidade para aprovação do Capitão

1. O jogador distingue 30 experiências pelo tipo de situação e pelos personagens; não por HUD ou menu.
2. Cenas de crueldade têm consequência e contexto, não só choque; o jogador consegue lembrar **quem fez o quê e quem tentou impedir**.
3. Os mesmos personagens mudam aparência/atuação entre anos; nenhum retorno ignora ausências.
4. O jogador recebe agência real onde houver escolha e reconhece limites impostos pela história.
5. Ao menos um momento por capítulo permanece memorável sem depender da maior explosão.
6. Configuração de sangue/ferimentos, flashes, câmera e zumbido preserva o peso dramático com menos imagem explícita.
7. Todas as ações de civis, capturados e rendidos obedecem ao contrato de não recompensa de atrocidades.
8. Depois das primeiras missões produzidas, a qualidade só é afirmada com playtests humanos e evidência em runtime; **nenhuma nota 10/10 é automática**.

## 10. Dependências e ordem segura

- **N1 — Rever narrativa:** aprovar/recusar cenas de cada missão e decisões de continuidade, mantendo docs separados de canónico.
- **N2 — História:** fontes de unidade, local, data e contexto; eventos de crueldade fictícia precisam de local e situação plausíveis, não inventar acusação histórica.
- **N3 — Sequenciamento:** com a M01 como referência de escrita, desenhar M02 e M03 em detalhe para validar transição do arco polonês.
- **N4 — Tecnologia:** tratar `SURRENDERED`, socorro, gestos, diálogo e skip/checkpoint apenas na vertical slice correspondente; não criar 30 sistemas em paralelo.
- **N5 — Captação real:** comparação antes/depois, e playtest humano para avaliar se a emoção surge sem confusão.
- **N6 — Rollout:** expandir para capítulos adicionais em lotes pequenos, com revisão e gate por missão.

**STATUS:** READY_FOR_CAPTAIN_NARRATIVE_REVIEW. Nenhuma cena ou sistema desta V3 está implementado.
