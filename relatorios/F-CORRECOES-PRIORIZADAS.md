# F — Correções priorizadas e critérios de aceitação

P1 identifica impacto elevado na experiência. Não foram inventados dez crashes críticos para preencher uma lista. A coluna de estado separa defeito reproduzido, observação artística, limitação e risco que ainda exige playtest. Nenhum item autoriza editar simultaneamente os ficheiros de autoridade do Capitão.

## Top 10 de maior prioridade

| ID | Problema | Estado e impacto | Coordenação | Aceitação |
| --- | --- | --- | --- | --- |
| QI01 | Defesa sem destino no guia | Confirmado por código e rota de simulação. Clareza espacial e compreensão do papel. | HUD/orientação; coordenar pacing | Jogador identifica área, ameaça e ação sem consultar coordenadas. |
| QI02 | Mudança recomenda a própria cobertura | Confirmado por rota de simulação. Uma ordem pode contradizer o estado real. | pacing/combate e contrato de apresentação | Salva real gera destino diferente e válido; recomendações iguais são rejeitadas. |
| QI03 | Prompt de E pode anunciar ação impossível | Confirmado por testes isolados. Confiança nas interações. | pacing/simulação + HUD | Todo E anunciado como disponível executa nessa posição; testar os limites e obstáculos. |
| QI04 | Ajuda termina antes do alcance da entrega | Confirmado por código; causa de desorientação plausível. Resgate e acessibilidade espacial. | HUD/orientação com pacing | Rota sem coordenadas encontra o destino e entrega com o mesmo critério apresentado. |
| QI05 | Falas sem VO correspondente | Confirmado por dados e diagnóstico no trecho High. Personagens, orientação pela voz e direção sonora. | T45/áudio e narrativa | Ordens essenciais e falas de relação têm voz, legendas corretas e inteligibilidade validada por escuta. |
| QI06 | Abertura enquadra o local e perde os interlocutores | Observado em High e Low. Introdução e identificação do elenco. | direção/apresentação e skin | Sem documentação, jogador identifica quem lhe dá a ordem e reconhece dois companheiros. |
| QI07 | Acabamento humano limitado no trecho High | Observado; avaliação artística. Credibilidade das pessoas. | skin/assets/anim — trabalho ativo do Capitão | Galeria e cena real mostram proporção, mãos, equipamento e identidade coerentes sem novo clipping. |
| QI08 | Arma e braço descompostos após entregar Bąk | Observado em várias capturas Low e diagnóstico persistente; causa ainda não isolada. Primeira pessoa e confiança nas transições de transporte. | viewmodel/anim; coordenar T40 e skin | Depois de entrega, espera, corrida, ADS e restore, mãos voltam a segurar a arma; comparação visual antes/depois e teste da transição. |
| QI09 | Ordem de reparar continua depois do reparo concluído | Observado na partida e explicado pelo código. Validade e confiança nas ordens. | HUD/narrativa + pacing | Nenhum aviso pede um objetivo já concluído; avisos urgentes e restores preservam a ordem correta. |
| QI10 | Movimento vertical é assentamento instantâneo | Confirmado por código e rota de simulação; não observado em vídeo. Fisicalidade do jogador e NPCs. | phys; evitar implementação concorrente | Percursos de queda/degrau têm resultado coerente e repetível; sem atravessar volumes ou quebrar gates. |

## Top 20 melhorias de maior impacto

| Ordem | Ação concreta | Evidência e condição |
| --- | --- | --- |
| 1 · QI01 | Ler área da definição e apresentar a posição/tarefa real; feedback ao ocupar. | [Confirmado por código e rota de simulação](evidence/cover-contract.json). hold_access devolve guia null, apesar de ter ordem e uma cobertura sugerida. |
| 2 · QI02 | Garantir nó ativo diferente do ocupado; não inventar ameaça ou segurança no HUD. | [Confirmado por rota de simulação](evidence/cover-contract.json). Na primeira salva, occupied=suggested=cv_sandbag_mid_2. |
| 3 · QI03 | Partilhar o predicado de disponibilidade entre prompt e execução. | [Confirmado por testes isolados](evidence/interaction-probes.json). Bąk: E aparece a 3,5 m mas não recolhe; caixa: E aparece a 5,5 m mas não recolhe. |
| 4 · QI04 | Manter referência ao aid_position até ao alcance real e dar confirmação de entrega. | [Confirmado por código; causa de desorientação plausível](https://github.com/Brawl2007/COD-guerra/blob/68301b779b856af46ed35a10fde42df9559d9ed4/src/game/m01-simulation.js). Guia cala abaixo de 10 m, entrega de Bąk exige abaixo de 4 m. |
| 5 · QI05 | Gravar/licenciar núcleo de falas, ligar fonte espacial e prioridades; preservar legendas. | [Confirmado por dados e diagnóstico no trecho High](evidence/manual-high/observations.json). activeVoiceLines=0, loader entries=0/decoded=0; falas observadas são legendas. |
| 6 · QI06 | Compor abertura para mostrar o orador/ação, mantendo liberdade de olhar. | [Observado em High e Low](evidence/manual-high/01-high-intro-default.png). A fala sobre o café decorre com a câmara virada para as pontes; virar revela a secção. |
| 7 · QI07 | Rever a entrega da branch skin antes de encomendar outro kit; testar no mesmo enquadramento. | [Observado; avaliação artística](evidence/manual-high/03-high-approach-section.png). Rostos, mãos, silhuetas e similaridade de poses continuam simplificados no encontro. |
| 8 · QI08 | Reproduzir carry→putdown→aim com o rig atual; investigar restauro de transformações e contacto, sem substituir todo o sistema. | [Observado em várias capturas Low e diagnóstico persistente; causa ainda não isolada](evidence/route/45-corridor-3.png). Em g903,45 carrying=false, clip=aim, runBlend=0 e scene=null; fotos do corredor mostram arma à esquerda e braço separado após a entrega. |
| 9 · QI09 | Condicionar cues ao estado real; definir validade e prioridade das falas sem preencher silêncios. | [Observado na partida e explicado pelo código](evidence/route/log.jsonl). Em g503,1 o objetivo passa a Mantenha contacto; em g504,1 reaparece Proteja o reparo. updateContinuity escolhe o cue pelo intervalo de batalha, mesmo com reparo concluído. |
| 10 · QI10 | Auditar a branch phys e medir degraus, declives, quedas e limites antes de outra correção. | [Confirmado por código e rota de simulação; não observado em vídeo](evidence/height-probe.json). Na aproximação à água, Y passa de -3 para -10 num passo de 0,05 s. TczewWorld.move atribui actor.y=heightAt. |
| 11 · QI11 | Decidir contrato e explicar o papel que realmente existe; não adicionar timer fictício no HUD. | [Confirmado por código; decisão de design](https://github.com/Brawl2007/COD-guerra/blob/68301b779b856af46ed35a10fde42df9559d9ed4/src/game/m01-simulation.js). holdAccessVisited fica true por entrada na área; o objetivo não mede defesa contínua. |
| 12 · QI12 | Distribuir acontecimento legível, rota com decisão ou reação útil; medir exposição antes de encurtar arbitrariamente. | [Risco de direção; confrontar com cronologia e fotos da rota](D-HISTORIA-E-ROTEIRO.md). A tarefa combina deslocação longa, E e regresso mais lento, sem arma utilizável. |
| 13 · QI13 | Reutilizar mãos/rig existentes para o transporte de material e manter a faixa branca visível. | [Observado em Low e confirmado na geometria do código](evidence/observer/observer-3-g262.png). Na captura g262, a caixa é segurada por volumes arredondados sem dedos; m01-view.js cria duas esferas no carryCrate. |
| 14 · QI14 | Articular percursos, balastro e desgaste por uso; rever escala de textura em vistas fixas. | [Observado em High; avaliação artística](evidence/manual-high/03-high-approach-section.png). Taludes e grandes manchas de materiais têm regularidade e acabamento visivelmente simplificados. |
| 15 · QI15 | Ceder o cue ao objetivo urgente, ou limitar o intervalo à validade da indicação aérea. | [Observado em fotografia e confirmado nos dados](https://github.com/Brawl2007/COD-guerra/blob/68301b779b856af46ed35a10fde42df9559d9ed4/missions/m01-tczew/mission.json). Durante Siga a voz, o cue ainda diz ENE aeronaves até t=14 do bombardeio. |
| 16 · QI16 | Decidir se a missão precisa do motivo proposto; gravar/licenciar só os trechos úteis e preservar silêncios. | [Confirmado por código e diagnóstico do trecho](evidence/manual-high/observations.json). Conductor calcula layers, mas playing/musicSlots estão vazios e o loader não tem entries. |
| 17 · QI17 | Teste com jogador no PC-alvo: origem, alvo, efeito da supressão e resposta de aliados. | [Risco e requisito de teste; não avaliação humana conclusiva](https://github.com/Brawl2007/COD-guerra/blob/68301b779b856af46ed35a10fde42df9559d9ed4/missions/m01-tczew/map-layout.json). Layout e guia pedem identificar clarões longínquos; o piloto usa coordenadas/conhecimento da rota. |
| 18 · QI18 | Separar ação de encenação e texto para o jogador; executar gesto apenas com condição real, sem expor instrução interna. | [Observado em captura/log e causa confirmada no código](evidence/route/92-west-demolition.png). Na demolição oeste aparece Zieliński abaixa a cabeça de Jan com a mão (se o jogador estiver a até 3 m); updatePreRoll envia beat.action para message. |
| 19 · QI19 | Arbitrar a transição: uma confirmação breve e uma ordem prioritária, reduzindo duplicação central quando há diálogo/ameaça. | [Observado em captura Low; avaliação de hierarquia](evidence/route/19-withdrawal.png). Na retirada, objetivo fixo, tarefa anterior riscada, novo objetivo central, mensagem e legenda coexistem no corredor de mira. |
| 20 · QI20 | Usar progresso real e estado de ameaça para repetir; para o reparo, aproximar-se da MG não é a condição de avanço. | [Observado no log e explicado pelo código](evidence/route/log.jsonl). A mensagem da MG a 1083 m já se repete enquanto repair% avança; o guia mede aproximação ao alvo, não progresso do trabalho. |

## Detalhes de acabamento que merecem verificação específica

- O prompt de interação tem de usar o mesmo alcance que a execução; não basta testar o centro do alvo.
- Na captura [33-bak-found](evidence/route/33-bak-found.png), E está disponível e a mensagem conserva 12 m da aproximação: atualizar/expirar a direção ao mudar para interação.
- Em g798,7 a confirmação de recolher Bąk é substituída em g798,9 por ordem de combate: arbitrar a apresentação enquanto transporta o ferido.
- O cue de olhar deve expirar quando uma ordem urgente muda a direção relevante.
- Confirmar posição do orador e identificação visual durante falas, especialmente na abertura.
- Avaliar mãos, arma e equipamento em aproximação High e em movimento; uma foto não aprova clipping dinâmico.
- Rever a escala dos materiais em talude, chão, torre e prop no mesmo enquadramento.
- Confirmar a passagem física dos objetos que sustentam a narrativa (café, caneca, cantil).
- Diferenciar silêncio deliberado de áudio ainda não produzido.
- Não transformar os bloqueios de um piloto lento em bugs de colisão sem reproduzir por controlos independentes.
- Documentar frames fora de campo: uma explosão registada não significa que o jogador a tenha visto.
- Confirmar direitos do kit e das futuras vozes antes da distribuição; esta auditoria não é validação de licenças.

## Dependências e conflitos

A issue #72 regista frentes phys, npc, pacing, combat e skin, inicialmente sobre f6913a0. Os seus estados locais não foram certificados por esta auditoria. Antes de transformar um item em tarefa, comparar a entrega dessas frentes com a candidata, reexecutar apenas o trecho afetado e reutilizar correções existentes. O HUD deve consumir um contrato real de cobertura/destino; não assumir autoridade de navegação ou dano. Música e VO dependem de produção/licenças e teste auditivo. A composição das cenas depende de posição, animação e diálogo, não apenas de CSS.

As recomendações não pedem reconstruir resolvedor de animações, LOD, áudio core, HUD cinematográfico ou sistema de dano já existentes. Pedem demonstrar a qualidade que esses sistemas apresentam ao jogador. A lista estruturada completa é [findings.json](findings.json).
