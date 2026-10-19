# D — História escrita, proposta Fable e história apresentada

Base local: PR #80 @ `68301b779b856af46ed35a10fde42df9559d9ed4`. Proposta Fable: PR #56 @ `03b61a380c2624ba2b704299a789749a50dc6a93`. As fontes canónicas são `missions/m01-tczew/SCRIPT.md`, `mission.json` e `STORY_BIBLE.md`. Inventário verificável dos documentos criativos: [fable-inventory.json](evidence/fable-inventory.json).

## Juízo sobre a história escrita

A M01 tem um núcleo dramático específico e aproveitável: levar café a um homem isolado, perder esse contacto durante o ataque e acabar por contar pessoas em vez de tiros. Destruir uma ligação civil para impedir a captura dá às duas pontes uma função além de decoração. O final proposto não inventa uma vitória. O resgate de Bąk altera quem chega ferido e as falas do abrigo, ligando uma ação do jogador a uma consequência individual.

O melhor elemento não é uma reviravolta: é a mudança de significado do gesto inicial. A caneca e a ausência de Nowicki podem sustentar uma missão contida. O risco é a história depender de um objeto que o jogador mal viu e de um homem que conheceu apenas por legendas. Uma ausência só pesa narrativamente se houve presença reconhecível antes. Um roteiro que diz que Krawiec gira a caneca não demonstra que o modelo executa o gesto.

O texto dá pouco espaço para Jan: há apenas três falas canónicas associadas ao seu ID, contra 31 de Zieliński. Esta contagem não mede tempo de exposição, mas mostra concentração da função verbal no sargento. Jan pode ser um protagonista reservado; porém, a passagem de mensageiro a alguém responsável pelos outros precisa de ações legíveis, não de uma biografia que só existe na bíblia.

A identidade histórica pede distância, retirada e trabalho de engenharia, não uma limpeza contínua de salas. Preservar essa escolha é razoável. Ela exige mais direção para que esperar seja uma decisão informada: ver o progresso dos sapadores, perceber uma mudança de ameaça ou reconhecer homens que chegam. Um prazo de calendário sem acontecimentos compreensíveis não produz automaticamente tensão.

## Personagens: potencial escrito e entrega verificável

As contagens são de entradas em `mission.json`, não de falas efetivamente vistas na partida. A exposição real deve ser conferida no relatório A e nas legendas capturadas.

| Personagem | Papel e traço no texto | Lacuna / risco de apresentação | Melhoria concreta sem mudar a história |
| --- | --- | --- | --- |
| Jan Wrona — 3 entradas | Mensageiro, testemunha e voz da contagem; resposta final «Presente» | O arco interior é muito maior na bíblia do que no que o jogador faz; a contagem pode parecer só outra legenda | Tornar visível a responsabilidade por um homem concreto e dar feedback da chegada antes da contagem verbal |
| Zieliński — 31 | Proteção expressa em ordens curtas; «Depois» adia o luto; repete o nome de Nowicki | Concentra exposição, tutorial, ameaça e emoção; sem atuação diferenciada pode virar locutor de objetivos | Associar cada ordem a gesto, posição e motivo reais; reservar pausas para a chamada e evitar filas de avisos ultrapassados |
| Kowal — 7 | Humor seco, números, apoio e carregadores; relação funcional com o jogador | Oferecer munição por texto não basta para um companheiro reconhecível; capacidade de suprimir é uma função de combate que deve ser percebida | Uma passagem de munição legível e feedback da MG calada ligam a pessoa à ajuda prestada |
| Bąk — 4 | Piada inicial sobre desmaiar; vulnerabilidade e dívida mais tarde | O ferimento pode ser apenas um novo objetivo se o vínculo inicial não foi apresentado | Mostrar a interação breve com Dudek e conservar a continuidade no resgate e na chamada |
| Dudek — 5 | «Carrego. Depois cobro» prepara a escolha entre quem ajuda e quem fica ferido | O socorrista pode estar perto, mas oculto; a falta de uma ação visível de acolhimento enfraquece o fim do resgate | Posto de socorro identificável no ambiente, alcance de E correto e receção com confirmação coerente |
| Krawiec — 7 | Profissional concentrado, receio de não poder trabalhar; preservação da caneca | Repete pedidos utilitários; o gesto humano decisivo depende de um prop e de animação específicos | Uma pausa de trabalho, um olhar para o posto e o objeto reconhecível sustentam o traço sem acrescentar discurso |
| Nowicki — 5 | Humor sobre a caneca, vigilância e primeira identificação dos aviões | Pouca convivência antes do desaparecimento; perda fora do campo visual pode ser entendida apenas por texto | Tornar o encontro inicial e o caminho de saída claramente visíveis; ausência física no retorno, sem close obrigatório de morte |
| Pawlak — 4 | Mensageiro da situação e da ordem de demolição | Pode ser percebido só como correio de exposição; a própria bíblia procura ritmos e gestos que ainda exigem produção | Chegada reconhecível, esforço corporal e posição que permita acompanhar o recado |
| Lipski — 2 | Civil ferroviário; dá ao lugar memória familiar | Pode passar despercebido, ficando só a frase final sobre a feira | Presença curta ligada a uma tarefa civil visível; manter contenção e evitar transformar cada civil num discurso |

As personalidades existem em sementes textuais. Isso é diferente de personagens plenamente desenvolvidas no ecrã. A naturalidade das vozes, os sotaques, a atuação vocal e a empatia humana permanecem NÃO VERIFICADOS por escuta/playtest nesta auditoria.

## O que o Fable acrescenta — e o que precisa de crítica

A biblioteca contém 15 documentos mais um índice. A matriz e o handoff são explícitos: tratam-se de propostas, sobre uma V5 de outubro, sem implementação automática. O inventário atual de 70 falas canónicas não contém IDs `dlg_m01_100+`; não se deve anunciar as novas falas como entregues. O estado antigo «Animation Resolver não existe» também não descreve a candidata atual, que já tem resolvedor, IK e novas integrações.

| Documento / grupo | Contributo útil | Avaliação crítica e estado |
| --- | --- | --- |
| Master Story Bible | Distância, contagem e ponte civil como três motivos; logline clara | Formula bem a identidade, mas vários sentimentos e transformações são afirmações de intenção, não acontecimentos apresentados |
| Complete Cinematic Screenplay | Liga encontros, resgate, duas demolições e chamada; especifica preparação e consequência | Muitos beats são instruções de atuação que não têm execução genérica em `updateScene`; a presença de `action` nos dados não prova gesto ou interação |
| Character Bible | Contradições, vozes e ações distintas para o elenco | Há biografia demais para a exposição efetiva de uma missão; priorizar um ou dois comportamentos visíveis por personagem |
| Dialogue Production Script | Variantes e gatilhos contextualizados; reconhece a fila FIFO e propõe prioridades | Mais falas numa fila sem interrupção podem piorar avisos urgentes. Não integrar o catálogo antes de medir atrasos e legibilidade |
| Gameplay Variety Design | Distingue verbos e riscos de cada objetivo | Proteger durações e percursos não garante variedade. A defesa de um fetch lento depende de o acontecimento paralelo ser perceptível, não apenas existir no mapa |
| Nine Set Pieces | Preparação, participação e consequências explícitas | Nove nomes não significam nove situações jogáveis distintas. Alguns blocos repetem «esperar e olhar»; precisam de condição, mudança e feedback próprios |
| Shot Bible | Direção em primeira pessoa, sem roubar a câmara; estímulos e luz orientam | A abertura observada aponta para a ponte enquanto a fala é sobre a secção. A liberdade de olhar exige composição inicial e estímulos suficientes |
| Environmental Storytelling | Uso civil, mudança persistente, detalhe com origem | Quantidade de props não é história ambiental. Um objeto deve ser reconhecido antes e depois; evitar clusters que tapem a rota ou só acrescentem ruído |
| Atmosphere Art Direction | Contraluz, poeira e aço como identidade; não inventar chuva para escurecer o jogo | Tabelas de cores não resolvem escala de materiais, anatomia ou animação. Vários números pertencem a um renderer anterior |
| Audio and Music Direction | Silêncio com propósito, fontes distintas, voz localizada e prioridade | O plano depende de VO e gravações ainda ausentes; silêncio escrito não é prova de boa mixagem. As métricas antigas não substituem escuta atual |
| Historical Validation | Separa facto, reconstrução e dramatização; explicita fontes frágeis | Não é revalidação independente das fontes históricas. Casamata, posto da ckm e contratos de combate já mudaram desde a base do documento |
| Integration Matrix | Classes A–D, dependências e testes evitam tratar tudo como «simples texto» | «Snapshot igual» demonstra preservação de estado, não qualidade da experiência. Mudanças perceptivas ainda precisam de teste com jogador |
| Creative Production Roadmap | Sequência por risco e dependências | Pré-requisitos V5/Chromebook e entregas antigas precisam de reconciliação; não mandar reconstruir resolvedor, LOD, áudio core ou HUD já integrados |
| Campaign Creative Vision | Evita repetir a assinatura da M01 em trinta missões | Documento de direção de campanha, não conteúdo jogável de M02–M30 e não prova de qualidade da M01 |
| Creative Preservation Handoff | Preserva a base e distingue proposta de certificação | Bom registo histórico; não pode prevalecer sobre o HEAD e as frentes atuais do Capitão |

## Momentos que merecem reconstrução de apresentação

**A entrega inicial:** é a oportunidade de tornar Nowicki uma pessoa reconhecível. Precisa de receção e objeto legíveis. Acrescentar outra cartela não substitui a interação.

**O regresso com a caixa:** a redução de velocidade pode transmitir peso, mas o trajeto precisa de revelar uma mudança ou exigir escolha. O ferido da estação só cumpre essa função se o jogador o identificar. Uma fala fora de campo sem VO não dirige a atenção como a proposta presume.

**A defesa:** o jogador deve saber que está no lugar certo, qual ameaça ajustou o fogo e para onde mudar. A mesma cobertura não pode ser anunciada como destino novo. Este é um contrato entre simulação, direção de companheiros e HUD.

**Bąk:** é o acontecimento com consequência pessoal mais diretamente ligada à ação do jogador. O cuidado maior deve ser localizar o destino e fazer o fim do transporte parecer uma entrega a alguém, não uma verificação de coordenadas.

**A chamada:** a repetição de Nowicki tem força escrita e deve ser preservada. O risco é transformá-la numa fila de legendas perante modelos imóveis. O silêncio de sete segundos previsto pede corpos, olhares e um enquadramento que sustentem a pausa. Jan responder automaticamente pode ser coerente com uma cena, mas não deve ser vendido como interação do jogador.

## Resposta à pergunta «a história é boa?»

Há uma premissa e uma estrutura escritas com identidade própria. A passagem para uma história envolvente durante o gameplay está incompleta e precisa de ser julgada pelas capturas e pelo percurso, não pelos documentos. A prioridade é encenar os poucos motivos que já existem — café, ausência, dívida, contagem, ponte destruída — antes de aumentar o número de falas ou de personagens. A comparação com construção dramática específica de WaW/WWII permanece bloqueada conforme o relatório C.

## As nove situações do Fable: ideia, implementação e prova

Esta tabela classifica contratos e componentes encontrados no HEAD. A coluna de observação não presume que a câmara tenha apanhado todo o acontecimento: o percurso A e as fotografias delimitam o que foi visto.

| Situação | Roteiro / proposta | Componentes atuais e observação | O que ainda exige produção ou prova |
| --- | --- | --- | --- |
| SP-01 Os motores | Quarenta segundos para parar, ouvir e perceber a aproximação | Evento, falas e aeronaves/áudio existem; o piloto pode manter-se virado para a ponte sem olhar para o céu | VO, reação coletiva e atenção dirigida. Não foi observada uma sequência de referência COD equivalente |
| SP-02 Catorze segundos | Água, terra e fogo interrompem a rotina; Nowicki desaparece | Bombardeio e mudança para abrigo/seguir foram alcançados. A foto posterior não prova cada impacto ou a corrida de Nowicki | Troca de capacete, gestos e leitura da perda em sequência, com sincronização auditiva validada |
| SP-03 A caixa | Transporte pelo custo humano da estação | Caixa, redução de velocidade, entrega e progresso foram executados; a imagem mostra mãos esféricas. Há transporte de ferido da estação na implementação | Confirmar que o jogador vê e compreende o acontecimento paralelo e a origem da caixa; não declarar que todo fetch lento se tornou interessante |
| SP-04 A MG sobe a encosta | Uma ameaça concreta interrompe trabalho e pode ser suprimida | Há MG, tiros reais, supressão, poses e progresso do reparo | A proposta de bias progressivo e a compreensão do efeito do jogador não se comprovam pelo simples aumento de percentagem |
| SP-05 A ordem sob o zumbido | Mensageiro, ameaça aérea e decisão de demolir | Evento e cena de ordem com legendas/cues pertencem à candidata | Atuação, sobreposição de falas e inteligibilidade precisam de prova própria. A sequência do percurso não equivale a escuta |
| SP-06 Contra o sol | Mudanças de cobertura motivadas pelo fogo | Salva real e rotação estão implementadas; o contrato pode sugerir a própria cobertura e o guia não tem destino | Orientação por nó/gesto/VO e nova posição válida; não acrescentar mensagens sobre perigo inexistente |
| SP-07 O clarão e o som | Retirada, Bąk, explosão e contenção do fogo | Retirada, ferimento, transporte e entrega de Bąk foram executados nesta corrida; os estados de demolição e consequências existem | Pôr o jogador a reconhecer os homens e a perceber as consequências; pares e atuação específicos do Fable não se presumem entregues |
| SP-08 A guarnição sai de casa | Evacuar, contar e ver a perda das pontes | Posto de disparo, corredor, guarnição/arma e destruição têm sistemas atuais, incluindo integrações posteriores ao documento | Não atribuir à matriz antiga a autoridade do posto ckm. Avaliar continuidade da evacuação e composição no trecho realmente alcançado |
| SP-09 A chamada | Nomes, dívida e ausência sem vitória triunfal | Cena, variantes e dupla chamada de Nowicki estão nos dados/executor | Props e pequenos gestos descritos continuam dependências específicas. Plano exterior e saída a pé antes do debrief são propostas, não implementação inferida |

A nomenclatura das situações melhora o documento de direção, mas a aceitação precisa de demonstrar a diferença perceptível de cada uma. Reparo, defesa e corredor não ganham automaticamente variedade só por serem três objetivos com nomes diferentes.

## Roteiro exposto em vez de encenação: prova na demolição oeste

A [captura da demolição oeste](evidence/route/92-west-demolition.png) mostra literalmente a instrução «Zieliński abaixa a cabeça de Jan com a mão (se o jogador estiver a até 3 m)» como mensagem ao jogador. A causa é específica: `updatePreRoll` envia `beat.action` para `message`, sem uma camada que diferencie instrução de produção e texto diegético. Não se trata apenas de mais uma fala mal escrita. A produção precisa de converter intenção em evento/gesto condicionado, ou retirar a indicação interna do canal público. A fotografia não demonstra um contacto físico com o sargento, pelo que não se aprova a ação por existir no texto.

O evento de demolição e a ordem seguinte foram alcançados. Na vista do piloto, barracão e talude ocupam a frente; o efeito principal não ficou legível nas duas fotos. Isso limita a avaliação do clímax nesse enquadramento, sem comprovar ausência de colapso ou falha generalizada dos efeitos.

## Chamada e debrief alcançados: o que a execução acrescenta à crítica

A rota chegou à chamada sem saltar a cena e ao debrief. As [duas](evidence/route/95-roll-call.png) [capturas](evidence/route/96-roll-call-10s.png) mostram seis figuras sentadas com armas verticais e enquadramento estável; a legenda identifica o nome chamado. Não se demonstram nessas fotos a passagem de cantil, a caneca nas mãos de Krawiec ou uma reação específica do interlocutor. O diagnóstico amostrado apresenta a pose `seated` para membros da secção. A geometria e a contagem de poses não aprovam atuação, mas também não provam imobilidade em todos os frames.

A consequência do resgate chegou efetivamente à legenda: Dudek diz que Bąk está vivo no posto e que a dívida passou para Wrona. A fala de Jan sobre os doze homens do pelotão também foi registada. Assim, a relação e a contagem não existem só nos documentos. A limitação é a sua encenação e identificação durante o jogo, não ausência de toda a continuidade narrativa.

O [cruzamento de exposição](EXPOSICAO-DIALOGO.md) identificou 58 das 70 entradas canónicas entre 62 mudanças de legenda registadas. Variantes e condições explicam parte das entradas que não aparecem; não é uma taxa de implementação. O logger do piloto não atualiza `last.subtitle` quando a legenda fica vazia: uma repetição idêntica depois de silêncio, como o segundo Nowicki, pode não entrar na lista. Não se usou essa omissão como prova de fala cortada. A tentativa de acrescentar um observador mais rápido da chamada começou quando o navegador já tinha fechado no debrief, pelo que não produziu prova adicional.

O [debrief observado](evidence/route/98-debrief.png) contextualiza a história, explicita versões históricas disputadas e distingue as personagens fictícias. É uma contenção útil a preservar. A presença desse texto depois da missão não compensa aquilo que um jogador não reconheceu durante a ação, nem valida historicamente cada fonte citada.
