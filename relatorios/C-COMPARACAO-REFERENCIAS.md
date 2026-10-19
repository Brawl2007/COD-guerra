# C — Comparação com World at War, WWII e COD 1

**Estado: comparação externa incompleta por bloqueio de acesso.** Não foram vistos vídeos, jogadas ou trailers de Call of Duty nesta execução. Não há timestamps de referência verificados. Este relatório não certifica equivalência, superioridade ou uma distância numérica entre COD-guerra e esses jogos. A falta de fontes não impede documentar os problemas do produto local; impede atribuir aos outros jogos soluções que não foram observadas.

## Fontes e grau de verificação

| Fonte | Operação e resultado | Uso permitido nesta auditoria |
| --- | --- | --- |
| WaW, manual Steam, `https://store.steampowered.com/manual/10090` | A consulta final recebeu 302 da loja; o PDF no CDN shared.fastly.steamstatic.com foi bloqueado com CONNECT 403; manual não lido | Apenas registo do impedimento, nenhuma afirmação sobre HUD ou campanha |
| Pesquisa de gameplay WWII/D-Day em `https://www.youtube.com/results?search_query=Call+of+Duty+WWII+D+Day+gameplay` | HTTPS CONNECT 403; nenhum vídeo selecionado/observado | Não há evidência audiovisual de referência |
| Reviews IGN, caminhos de artigos WaW/WWII tentados | CONNECT 403; não se verificou sequer a existência/conteúdo dos artigos nesses caminhos | Nenhuma conclusão de referência |
| PR #56, `https://github.com/Brawl2007/COD-guerra/pull/56`, SHA `03b61a380c2624ba2b704299a789749a50dc6a93` | 15 documentos criativos e índice recuperados pelo Git | Fonte primária das propostas do Fable; não é prova de como funciona um Call of Duty |
| PR #80, SHA `68301b779b856af46ed35a10fde42df9559d9ed4` | Checkout, build, navegador e análise do código | Fonte da avaliação do nosso jogo |
| Pedido do proprietário e playtest que ele relata | Testemunho do proprietário, não reexecutado por humano pelo auditor | Motiva as perguntas; não substitui observação nova |

As tentativas finais e os redirects estão em [reference-access.json](evidence/reference-access.json). Não há timestamps de vídeo, pois nenhum foi observado.

Os domínios de pesquisa já foram propostos no rascunho do ambiente na sessão anterior. A política observada nesta execução continuou sem domínios personalizados aplicados. Acesso por Git/gh não demonstra acesso à Steam, ao YouTube ou aos CDN de vídeo. Não foi solicitado um token e não se tentou contornar o proxy.

## Matriz de comparação que permanece por fechar

Em todas as linhas seguintes, o comportamento específico de WaW, WWII e COD 1 está **NÃO VERIFICADO**. A última coluna é um critério original proposto para COD-guerra, não uma funcionalidade atribuída aos jogos de referência.

| Sistema / situação a observar na referência | Evidência local / pergunta de qualidade | Critério original de melhoria |
| --- | --- | --- |
| Semper Fi / D-Day: apresentação do protagonista e da unidade | A abertura tem cartelas e falas; o enquadramento inicial observado aponta para as pontes, sem plano legível dos interlocutores | Um jogador que só viu a abertura identifica líder, apoio e companheiro vulnerável através de ações e apresentação |
| Semper Fi / D-Day: passagem de rotina para ameaça | A entrega salta a hora de batalha para a aproximação aérea; o aviso depende de texto, encenação e visão do céu | A ameaça tem preparação, orientação espacial e consequência visível, sem rodar a câmara à força |
| Little Resistance / Operation Cobra: objetivo militar e geografia | Existe mapa espacial extenso; a intenção de defender a cabeça de ponte não tem destino no guia | Apresentar área a defender, aliado de referência, ameaça e condição de cumprimento |
| Hard Landing / Stronghold: alternância de tarefas | Transporte, proteção e espera são verbos distintos, mas muitos passos não exigem nova decisão | Cada bloco prolongado inclui mudança verificável da situação ou feedback relevante da ação |
| Vendetta / Ambush: visibilidade e aquisição de alvo | Combate local a cerca de 1 km, com clarões e alça; valorizar visibilidade dos alvos no tamanho de ecrã escolhido | Teste de reconhecimento e pontaria no PC-alvo, sem pressupor que aumentar dano ou número de inimigos resolve legibilidade |
| Their Land, Their Blood / Hill 493: avanço da secção | Atores e estados de recuo existem; movimento e direção de esquadrão requerem prova visual ao longo do percurso | Deslocações com propósito, chegadas legíveis, cobertura usada e reações coerentes |
| Eviction / Death Factory: ocupação e custo humano | Ferido da estação e Bąk ligam tarefas a pessoas; o jogador pode passar sem perceber os acontecimentos paralelos | As pistas ambientais recompensam atenção e mantêm inteligibilidade sem depender de ler a documentação |
| Blood and Iron / Collateral Damage: mudança de escala | M01 mantém um único papel de infantaria; isso é uma escolha legítima | Não importar um veículo só para imitar variedade de outra missão; variar problemas dentro do papel histórico |
| Blowtorch & Corkscrew / Battle of the Bulge: encontro, pressão e cobertura | A simulação escolhe cobertura após salva real; pode escolher a própria posição já ocupada | Nó de destino diferente, existente e associado à ameaça real; confirmação ao chegar |
| Downfall / The Rhine: clímax e consequência | Duas demolições, geometria destruída, saída e chamada final fazem parte do desenho local | O jogador percebe o que mudou no espaço e por que a sua tarefa seguinte mudou |
| D-Day / companheiro ferido: transporte e entrega | Há discrepâncias entre prompt e alcance da ação; destino de socorro pode ficar oculto pelo portal | Um único predicado de interação; ajuda contínua até ao alcance real, sem marcador sobre destino inválido |
| Liberation / relações de personagens | O texto distingue humor, proteção, dívida e perda; atuação e VO não equivalem ao texto | Gestos, timbre e ações identificam quem fala e estabelecem relações sem biografias fora do jogo |
| Todas: animações e contacto físico | Existem clips, blends, IK e transporte; presença destes sistemas não prova transições naturais | Revisão em velocidade normal e sequência de frames: pés, mãos, arma, reação e chegada |
| Todas: áudio de guerra | 31 sinais do motor medidos; escuta humana ausente | Comparação de gravações com nível de reprodução controlado, verificando inteligibilidade, dinâmica e identidade |
| Todas: silêncio e música | Há política e condutor musical, mas faltam amostras musicais; silêncio não deve ser inferido apenas da fila de eventos | Distinguir ausência de produção de silêncio deliberadamente dirigido |
| COD 1: clareza militar e pertença ao esquadrão | Papéis e ordens existem; efeito no jogador precisa de prova de compreensão | O jogador explica a tarefa, aponta uma posição e identifica pelo menos dois papéis da secção |

## Protocolo para completar a comparação sem recomeçar a auditoria local

1. Selecionar gameplay completo, identificar plataforma, dificuldade, autoria do vídeo e se há comentário ou edição. Guardar URL, título, data de consulta e timestamps reais.
2. Para WaW, começar por Semper Fi e uma missão de combate mais aberto; para WWII, D-Day e uma missão de progressão da secção. Expandir só onde existir equivalente útil. COD 1 serve de contraste histórico, não de desculpa para baixar requisitos de clareza.
3. Por trecho, registar o que aparece e durante quanto tempo: ordem, gesto, enquadramento, animação, pista sonora, estado anterior e feedback posterior. Separar cutscene pré-renderizada, gameplay controlável e trailer.
4. Relacionar cada diferença com uma evidência local deste pacote e um critério de aceitação. Não confundir orçamento de produção com defeito técnico e não exigir cópia da interface ou de assets.
5. Só então atribuir notas comparativas às referências. O scorecard local não contém 10 automáticos para WaW/WWII.

Esta limitação mantém a auditoria independente: a reputação dos jogos de referência não é uma observação e não sustenta uma comparação minuciosa por si só.
