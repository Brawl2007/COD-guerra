# E — Cenários, modelos, animações, efeitos e som

A avaliação distingue três alcances: capturas do percurso em Low/640×360; um trecho independente em **High/1280×720**, controlado através do navegador e inspecionado pelo auditor; e análise de dados/código e do sinal de áudio. High não transforma renderização por software em medição do PC-alvo. Não há gameplay de Call of Duty observado nesta execução, pelo que as comparações específicas permanecem pendentes no relatório C.

## Imagem observada em High

Ver [vista inicial](evidence/manual-high/01-high-intro-default.png), [virar para a secção](evidence/manual-high/02-high-intro-turn-around.png) e [aproximação](evidence/manual-high/03-high-approach-section.png). Os [diagnósticos](evidence/manual-high/observations.json) confirmam preset High, relógios e clips; são uma sessão nova separada do piloto integral. Houve salto da introdução por Espaço apenas depois de observar e virar a câmara, seguido de W e E. Não foram atribuídas coordenadas ou relógios à simulação.

As duas torres/portais e as treliças dão ao sítio uma silhueta própria; o espaço não é uma sala genérica de tiro. A ferrovia, a encosta e o pátio organizam funções diferentes. Essa base deve ser preservada. Contudo, na abertura em High, as massas das torres dominam o fundo enquanto a frente é uma encosta ampla e pouco articulada, com objetos isolados. A composição vende a localização melhor do que as pessoas que falam.

O terreno tem relevo e materiais, mas o talude apresenta uma transição larga, regular e visualmente pouco específica; não se vê uma cadeia convincente de utilização, drenagem, desgaste e reparação em cada metro. Isto não pede encher o chão de pedras. Pede marcas que expliquem a circulação e liguem trilho, balastro, relva e terra. A resolução e repetição visível dos materiais devem ser revistas no tamanho de ecrã do PC-alvo.

As árvores observadas usam massas de folhagem muito recortadas e repetição de formas/tons. O contraste de escala entre esse tratamento, a arma em primeiro plano e os grandes volumes da arquitetura revela níveis de acabamento diferentes. A luz de madrugada permite ler a silhueta e mantém um céu identificável, mas esta amostra não demonstra uma iluminação dramática dos rostos nem uma separação do interlocutor por luz.

Não se deve concluir que cada elemento ausente do enquadramento não existe no mapa. A estação, interiores, superfície do rio, danos e clímax exigem as vistas específicas do percurso. Uma contagem de materiais ou de instâncias não substitui esse exame.

## Personagens e animação

Ao virar a câmara, a secção torna-se visível; na imagem há três figuras em poses semelhantes com as armas junto ao corpo. No diagnóstico de 14,58 s há 13 atores apresentados, com cinco nomes de clip distintos: `standing_idle`, `rkm_clean`, `sapper_work` e dois idles da guarnição ckm. Sete atores usam `standing_idle`. Estes números descrevem **um fotograma**, não a diversidade da missão inteira.

Kowal tem um clip específico de limpeza da arma; não é correto afirmar que todos os soldados estão completamente imóveis ou que não há resolvedor. Também existem blends, posturas, transporte e IK na candidata. A lacuna é a direção dos interlocutores e a diferenciação perceptível de ação: a existência de um clip de trabalho não demonstra o gesto de consultar o mapa, passar café ou receber uma ordem.

A abertura observada mostra o wz.29 em primeira pessoa durante a fala sobre o café. A troca visível de papel/caneca não foi demonstrada nesse trecho. O executor de `timeline` dispara falas e controla a duração, mas não interpreta genericamente todas as frases `action`. Uma frase como «Krawiec gira a caneca» continua a exigir implementação específica noutro sistema. Não se conta como animação só por aparecer no roteiro.

A forma dos rostos, o volume do equipamento e a diferença entre variantes podem ser inspecionados nas fotografias High; a atuação facial e a personalidade corporal durante falas não foram demonstradas. Não foi feita avaliação de lip-sync, porque não há VO reproduzida nesta sessão. Deslize de pés, interpenetração dinâmica de mãos e transições de queda precisam de sequências ou vídeo, não de uma fotografia escolhida. Onde não há prova, estes itens ficam NÃO VERIFICADOS, e não entram como bugs observados.

## Física e correspondência entre imagem e espaço

O código atual de `TczewWorld.move` resolve movimento planar e atribui a altura por `heightAt` no fim do passo. Não há, nessa função, integração de velocidade vertical ou aceleração gravitacional do jogador. Isto comprova uma limitação do modelo; não comprova, por si só, um atravessamento particular visto no navegador. A frente `phys` do Capitão já está dedicada a esta área.

O bloqueio inicial do piloto original não deve ser lançado como defeito de colisão: a espera pelo input e a resolução foram adaptadas fora da produção, e o trecho inicial foi percorrido depois. A causa exata daquele bloqueio não foi isolada entre as duas alterações do controlador. Colisores, limites e treliças também têm regras de proteção intencionais. Não se recomenda removê-las para «parecer físico» sem considerar os contratos da missão.

## Efeitos, destruição e composição

O desenho contém dois níveis de destruição com distância e consequência persistente. Isso é mais interessante do que um flash sem efeito no espaço. Para julgar o clímax, devem ser lidos em conjunto o instante do evento, a vista para o local, a geometria posterior e a tarefa seguinte. Um screenshot de poeira não comprova queda convincente, detritos com massa ou sincronização acústica.

As capturas do percurso, o relatório A e a linha temporal identificam os acontecimentos efetivamente alcançados. Qualquer demolição não alcançada ou vista fora do campo da câmara deve ser marcada como tal. O mesmo vale para LOD: o sistema existe e tem correções recentes, mas este pacote não é uma varredura completa de todas as distâncias e transições. A auditoria não reabre automaticamente T43 ou reconstrói o sistema de LOD.

## Áudio: resultado medido, sem alegar escuta

Foi executado o spec existente `m01-audio-offline-render.spec.js` sobre o HEAD auditado, com o AudioManager de produção e `OfflineAudioContext` do Chromium. **1/1 teste passou**, abrangendo 31 sinais. Os WAV e [metrics.json](evidence/audio/metrics.json) foram guardados para escuta posterior. São renderizações isoladas de fontes, não uma gravação da mixagem da partida.

| Sinal | Pico estéreo | Centróide espectral | Decaimento medido | Interpretação permitida |
| --- | ---: | ---: | ---: | --- |
| wz.29 do jogador | 0,228 | 1748 Hz | 0,439 s | Há um transiente e uma cauda medidos; não prova «potência» subjetiva |
| Kar98k a 15 m | 0,152 | 2835 Hz | 0,275 s | Referência de proximidade no mesmo motor |
| Kar98k a 1400 m | 0,00277 | 238 Hz | 2,207 s | Atenuação e escurecimento com distância foram medidos |
| MG34, rajada a 30 m | 0,107 | 5062 Hz | 0,627 s | Sete ataques medidos, aproximadamente separados por 0,075 s |
| Demolição a 250 m | 0,163 | 90 Hz | 4,294 s | Cauda longa e energia grave, sem prova de realismo histórico |
| Mistura densa do teste | 0,436 | 168 Hz | 3,935 s | Nesta mistura há margem até 1; não generalizar para todas as partidas |

Os 31 sinais têm zero valores não finitos. Há diferenciação por material, distância e arma; isto deve ser preservado. Não se conclui que a mixagem final esteja equilibrada ou que as armas soem reais. O volume de reprodução, a cadeia de saída e a perceção humana não foram avaliados. A componente «impacto/realismo comparável a WaW/WWII» fica NÃO VERIFICADA.

Os diagnósticos High mostram `activeVoiceLines: 0`, loader com `entries: 0` e `decoded: 0`, e slots musicais vazios. A análise dos assets não encontrou ficheiros de áudio distribuídos nas extensões usuais. O condutor musical existe, mas só inicia os stems quando dispõe de buffers reais; o próprio módulo documenta essa dependência. Não é correto chamar isto música dinâmica entregue só porque as decisões de camadas são calculadas. As falas vistas nesta auditoria são legendas; a naturalidade de atores de voz não pode ser julgada.

O problema de produção mais claro é a distância entre «siga a voz»/diálogo contextual e uma experiência sem VO correspondente. Mais volume não o resolve. A sequência recomendada é: fechar direitos e vozes; produzir tomadas curtas coerentes com os estados; ligar posição, prioridade e interrupção; testar inteligibilidade sob combate; só depois retocar loudness e timbre. Preservar as opções de redução de zumbido e os buses separados já existentes.

## Onde a avaliação ainda é limitada

- High foi observado no início, na aproximação à secção e no percurso até à primeira entrega; não foi percorrida toda a missão em High.
- O percurso técnico usa Low/640×360 por renderização em software. É evidência funcional e de apresentação nesse preset, não de qualidade gráfica máxima nem de FPS num PC.
- Não há medição de latência de áudio da partida nem escuta humana. Os sinais offline sustentam parâmetros específicos.
- Contacto dos pés, IK em todas as rampas, colisão de cada prop, interiores, transições de LOD e sincronização de todos os set pieces não estão integralmente cobertos por estas fotografias.
- As diferenças concretas frente a gameplay observado de WaW/WWII permanecem por verificar por acesso externo.

## Escala angular do combate distante

O FOV de M01 é 70° na posição normal e 48° em ADS (`WZ29_FEEL`). Uma estimativa geométrica para uma silhueta vertical de 1,70 m a 1000 m dá cerca de **0,87 px a 720 px de altura**, ou **1,37 px em ADS**. A 1080 px, são aproximadamente 1,31 e 2,06 px. Ver [cálculo e pressupostos](evidence/target-projection.json). Isto não mede os clarões capturados: sprites, bloom, oclusão e postura mudam a leitura. Demonstra por que a identificação de uma figura e a percepção de um clarão são tarefas diferentes. O combate precisa de teste de aquisição e feedback no PC-alvo; não basta declarar que o inimigo existe e o raycast o pode atingir.

## Achado específico de primeira pessoa: mãos da caixa

A [captura de transporte em g262](evidence/observer/observer-3-g262.png) mostra a caixa entre dois volumes arredondados sem dedos. O caminho `carryCrate` de `src/render/m01-view.js` cria explicitamente duas esferas de pele; o transporte de Bąk tem outro caminho e braços próprios. Portanto, a entrega de braços novos não demonstra que todos os transportes ficaram com a mesma qualidade. É um problema delimitado de continuidade visual, não uma razão para descartar o trabalho já aceite em T40. A foto é Low; a geometria esférica do caminho é confirmada pelo código, não por uma captura High desta ação.

No trecho High de aproximação, os cinco primeiros atores do diagnóstico usam LOD0, sem falhas de carregamento de personagens, e o viewmodel identifica `fp-arms-v2`. Portanto, a crítica do acabamento humano dessa amostra não é explicada por um fallback provocado por erro de download. Isto não certifica todos os assets nem todos os momentos da missão.

## Prova adicional do assentamento vertical

Uma rota separada de controlos da simulação, desde missão nova e sem atribuir posição, chegou à margem: ao passar de x≈24,89 para x≈25,19, **Y mudou de −3 para −10 num único passo de 0,05 s**. Houve também uma descida de 2,65 m noutro limite de superfície. O [registo completo](evidence/height-probe.json) comprova o salto de altura nos dados; não é filmagem do navegador nem uma medição de perceção humana. É evidência específica para a frente phys, sem editar essa frente ou afirmar que todas as colisões estão quebradas.

## Vistas espaciais adicionais da navegação independente

A [aproximação aos portais](evidence/navigation-high/03-approach-portals.png), em High, mostra duas entradas com silhuetas claras, mas material muito escuro e pouco legível nas fachadas, perante um acesso largo com manchas de solo regulares. A [vista lateral para a margem](evidence/navigation-high/05-toward-rail-approach.png) permite ver balastro, trilho, vegetação repetida e água: esta surge como um padrão de contraste fino no enquadramento. A fotografia não permite julgar a qualidade do movimento ou a estabilidade temporal desse padrão.

Na [entrega da mensagem](evidence/navigation-high/07-deliver-message.png), Jan fala sobre o papel e o café enquanto a vista aponta ao longo da treliça, sem o destinatário no campo final. A ação funcionou por E, mas este fotograma não apresenta uma receção entre pessoas. Isso delimita a crítica de direção: falta demonstrar a troca e o reconhecimento, não adicionar um novo sistema de interação. Interiores e detalhe da estação continuam fora desta amostra High.

## Salvamento efetivamente executado nesta corrida

O [transporte no tabuleiro](evidence/route/34-bak-carry-deck.png) apresenta Bąk e mãos com dedos, confirmando a diferença entre esse caminho e as esferas usadas na caixa. Na [chegada](evidence/route/35-bak-carry.png), há prompt «E entregar Bąk» e um companheiro nas proximidades. A [entrega](evidence/route/36-bak-delivered.png) produz confirmação textual e o objetivo opcional deixa de estar ativo. Não houve falha de coordenadas nessa entrega. A foto apanha o início da transição de pousar; não se classifica a presença do corpo nesse frame como transporte preso.

O enquadramento mostra o socorrista virado lateralmente com uma arma; não demonstra, por si só, uma receção encenada entre os dois homens. A composição, o gesto de acolhimento e a compreensão sem coordenadas continuam a ser pontos de qualidade a validar. A rota sabia o destino. A confirmação de entrega também foi rapidamente substituída pela mensagem da retirada, conforme o log.

## Demolição leste: evento alcançado, leitura visual limitada

O evento foi consumido e o HUD mudou para a saída da ponte. Nas duas imagens do piloto — [primeira captura](evidence/route/39-east-demolition.png) e [captura seguinte](evidence/route/40-east-demolition-6s.png) — o portal e a treliça próximos dominam o enquadramento; o colapso a cerca de 806 m não se distingue claramente. Não se confirma, a partir destas fotos Low, um clarão ou uma massa de detritos legíveis. Também não se declara efeito ausente: a ferramenta captura depois da deteção do evento e pode perder o instante. Os nomes automáticos «clarão» e «6s» não comprovam o conteúdo nem seis segundos de simulação, pois a espera usa tempo real nesta máquina lenta.

A cena faz uso de barras cinematográficas, cue espacial e ordens do sargento. Isso demonstra apresentação específica, mas não garante um clímax claro. A pose de braços capturada não foi aceite como reação intencional: a regressão persistente após o resgate, documentada abaixo, impede essa interpretação. A [recolha passiva posterior](evidence/east-demolition-diagnostic.json) confirma peças em estado settled e dano de demolição: há alteração de geometria, embora a foto não a torne legível. A aceitação deve mostrar a preparação, o efeito em sequência e a alteração persistente do espaço numa cadência normal, preservando a distância histórica.

## Regressão observada depois da entrega: primeira pessoa não recupera o apoio da arma

Antes do resgate, a [arma está apoiada na apresentação normal](evidence/route/17-hold-access.png). Depois da entrega, as capturas do [posto de disparo](evidence/route/42-firing-point.png), do [corredor](evidence/route/43-corridor-1.png) e [mais tarde no mesmo corredor](evidence/route/45-corridor-3.png) mostram a arma desviada para a esquerda e um braço com manga/mão separado, sem segurar a arma. Não é apenas o frame de pousar Bąk.

O [diagnóstico de g903,45](evidence/corridor-presentation-diagnostic.json), cerca de 80 s de simulação depois da entrega, indica `carrying=false`, `carryFrame=null`, clip `aim`, `runBlend=0`, `aimBlend=0`, arma READY e scene=null; o rig fp-arms-v2 continua carregado. Logo, não se deve explicar essas capturas como uma pose cinematográfica ainda ativa ou ausência do kit. A regressão visual é comprovada; o restauro de transformações ao sair de carry/putdown é uma hipótese de investigação, não uma causa já isolada. Não se afirma que o disparo esteja mecanicamente impedido.

Este é um alvo de regressão delimitado para T40/animação: recolher, entregar, esperar e voltar a ADS/arma normal, incluindo restore. A bateria unitária verde não apanhou o defeito visível desta corrida. A correção deve preservar o transporte e os braços aceites, acrescentando prova da transição.

## Menu no formato reduzido da rota

Na [captura de menu em 640×360](evidence/route/01-menu.png), o início da primeira linha do título fica cortado no topo; o botão de iniciar está acessível. É um resultado específico desta altura de viewport, não uma conclusão sobre o menu em 720p ou o modo tátil. Convém incluir alturas pequenas e orientação horizontal numa revisão de enquadramento. A mensagem «modelos críticos confirmados» expõe um detalhe técnico de carregamento ao jogador; pode ser simplificada para comunicar prontidão sem linguagem interna. A [foto inicial da cena](evidence/route/03-intro.png) apanha o fade preto e não foi usada para declarar a introdução vazia.
