# G — Sequência prática de elevação de qualidade

A meta é uma missão que o jogador compreende e acompanha através de pessoas, espaço e consequências. A auditoria não propõe substituir tudo o que existe nem usar os testes verdes como nota artística. Cada passo tem uma prova de produto, uma dependência e um ponto de paragem. A comparação externa com WaW/WWII deve ser completada assim que o acesso às fontes estiver disponível.

## 1. Primeiro: consolidar a base e tornar a missão confiável

**Dono: Capitão, com as frentes phys → npc → pacing → combat e skin.** Reconciliar os resultados desta auditoria com as entregas já em curso. A referência deste pacote é 68301b7; um problema demonstrado aí não deve ser duplicado numa branch se já tiver correção posterior. Não promover tarefas humanas T51/T52 com base neste percurso automático.

O primeiro lote pequeno deve resolver o predicado das interações, o contrato de cobertura, a legibilidade do destino de socorro e a regressão dos braços/arma depois da entrega de Bąk. Não começar por aumentar partículas, inimigos ou mensagens. Estes são os pontos em que o jogador recebe uma instrução que não consegue executar ou localizar.

**Aceitação:** E disponível significa ação válida no mesmo ponto; a cobertura recomendada é diferente da ocupada e ligada a uma salva real; o destino do resgate e a entrega são o mesmo ponto; saves/restauros conservam estes resultados sem repetir avisos. Ver QI01–QI04 e QI08. A saída do transporte tem de recuperar mãos/arma após espera, movimento e ADS, com prova visual da transição. Se o contrato autoritativo estiver indefinido, fechar a interface mínima com a frente pacing antes de desenhar o marcador.

O contrato mínimo a acordar tem cinco responsabilidades concretas: a simulação fornece o objetivo e a condição que continua válida; a referência espacial vem do mesmo ponto/nó usado pela ação; o prompt consulta o mesmo predicado de disponibilidade que E; a recomendação de cobertura identifica a salva e um nó distinto do ocupado; a apresentação arbitra prioridade e expira a indicação quando o estado muda. Estes dados podem estender as interfaces existentes, sem um segundo HUD, navegação própria ou um indicador de segurança inventado. Para o resgate, progresso significa aproximação ao socorro e entrega; para o reparo, significa trabalho/supressão útil, não reduzir distância à MG.

## 2. Depois: uma abertura que apresente pessoas

**Dono: direção, skin, animação e HUD.** Usar os modelos e o presenter existentes. Compor o primeiro enquadramento para que o jogador reconheça a secção e perceba a origem da fala. Preparar a entrega de papel/café e o encontro com Nowicki através de um ou dois gestos legíveis. Não é necessário um sistema geral novo de cutscenes.

**Aceitação:** numa sessão sem documentação, o jogador identifica quem deu a ordem, onde está Nowicki e o que transporta. O orador e a ação são reconhecidos pelo enquadramento, gesto ou som, com liberdade de olhar. A primeira visão da caneca estabelece o objeto que terá significado depois. Testar 1280×720/High e a configuração real do proprietário; não aprovar atuação por foto de galeria isolada.

## 3. Tornar o efeito do combate perceptível

**Dono: combat/pacing, com apresentação e áudio.** O reparo já tem progresso, supressão e poses. Dar ao jogador prova de causa e efeito usando esses estados. A tarefa não deve depender de conseguir ler a face de um inimigo de poucos pixels a 1 km. Clarões, resposta dos sapadores, deslocação da secção, estado de trabalho e falas podem formar um conjunto legível sem transformá-lo em GPS.

**Aceitação:** um jogador explica por que o trabalho parou e demonstra uma ação que o fez retomar; distingue perigo atual de fogo de fundo; identifica uma ordem de cobertura e a nova posição. Medir reconhecimento e comportamento, não só número de tiros, baixas ou partículas. Manter dados históricos e escala como restrições de desenho, não como desculpa para ausência de feedback.

## 4. Reestruturar as esperas com base na linha temporal

**Dono: pacing e narrativa.** Usar o tempo de simulação, os registos de ação, as falas e as vistas efetivas deste pacote. O tempo real do SwiftShader não é o ritmo normal do jogo. Separar uma pausa de observação que tem significado de um intervalo em que o jogador não consegue identificar nenhuma decisão.

Priorizar o regresso com a caixa, a defesa até à retirada e o corredor. Para cada bloco longo: qual informação mudou, o que se pode decidir, o que fazem os aliados e como o jogador confirma utilidade? Se não houver resposta, testar uma mudança de estrutura ou duração; não preencher automaticamente o vazio com texto ou nova vaga de inimigos.

**Aceitação:** cada bloco prolongado tem uma mudança compreensível e uma razão para observar/agir. Um playtest sem coordenadas distingue «estou a defender» de «estou à espera de um horário». Voltar a medir as mesmas janelas antes/depois, sem exigir repetição integral por alteração pequena.

## 5. Fechar um conjunto pequeno de produção humana e sonora

**Dono: animação, assets/skin e T45/VO.** Depois de reconciliar a branch skin, escolher um recorte vertical: abertura, ordem de cobertura, acolhimento de Bąk e chamada. Corrigir mãos/arma/escala e criar atuação para os beats que sustentam a história. Produzir/licenciar um núcleo de vozes com direção coerente. Música só onde o desenho precisar dela; o condutor sem buffers não é música entregue.

**Aceitação:** vídeo em velocidade normal com orador, gesto, ação e som sincronizados; escuta humana com ordens inteligíveis sob fogo; ausência de clips interrompidos de maneira abrupta; posto de socorro reconhecível; chamada com reações e silêncio sustentado. Preservar opções de acessibilidade e as assinaturas acústicas já medidas. Não medir realismo apenas por pico/centróide e não resolver mixagem aumentando o volume geral.

## 6. Acabamento espacial e audiovisual com vistas comparáveis

**Dono: ambiente, materiais, iluminação e efeitos.** Escolher vistas próxima, média e distante da estação, dos acessos e das pontes; percorrer as transições. Corrigir escala e mistura de materiais, taludes regulares, folhagem repetida e diferenças de acabamento entre props, arma e humanos. Confirmar que a geometria que chama a atenção tem correspondência nas colisões.

**Aceitação:** galeria High com as mesmas câmaras e horas antes/depois; vistas de gameplay que mostram a melhoria durante a ação; ausência de popping/volumes invisíveis; destruição que muda o lugar de forma legível. Não reabrir sistemas já corrigidos apenas porque o documento Fable ainda os chama de inexistentes.

## 7. Gate de produto e reavaliação

1. Completar a observação das referências com links e timestamps reais; rever a matriz C e comparar situações equivalentes, sem copiar assets ou narrativa.
2. Executar playtest humano da missão inteira no PC do proprietário e uma sessão focada de escuta. Distinguir compreensão, controlo, entretenimento e performance.
3. Repetir verificações focadas por sistema alterado. Repetir o percurso integral num marco integrado, mantendo a candidata e o ambiente registados.
4. Reter problemas resolvidos, regressões e diferenças ainda abertas em listas separadas. Cada aceitação inclui SHA, captura/trecho e responsável; não somar runs diferentes como se fossem uma corrida completa.
5. Só então decidir se a M01 vale uma recomendação como campanha acabada. Um debrief alcançado por um piloto com coordenadas não responde a essa pergunta.

O maior ganho perceptível provável vem de tornar a unidade compreensível e as ações confiáveis, usando o que já existe. O acabamento gráfico e sonoro deve apoiar esse recorte. Mais conteúdo fora desse núcleo pode aumentar o volume de produção sem corrigir a experiência principal.
