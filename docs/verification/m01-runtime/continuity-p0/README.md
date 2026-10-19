# Continuidade M01 — correções da auditoria

Base verificada: PR #91, `afaded912c5c3a7f8a4e6e567be9a98cd35ac24f`. A versão auditada originalmente era `68301b7`; os relatórios pertencem ao commit `8d420eb`. Não se transfere a nota antiga para a #91.

## P0-A — entrega de Bąk

**Antes:** no build da #91, após E e fim do putdown, o braço flutua e o rifle fica à esquerda. [Captura High](bak-before.png), [diagnóstico completo](bak-before.json). O teste novo falhou com comprimento da linha de mira 0 m.

**Causa:** o clone do paciente era filho do `carry_socket` no rig do jogador. Os dois contêm `weapon` e outros nomes repetidos. As buscas no rig passaram a encontrar a arma oculta de Bąk (escala zero) e novos bindings podiam alcançar o rig errado. Não era necessário substituir os braços ou os clips.

**Depois:** o paciente tem uma raiz separada na mesma cena de primeira pessoa. As matrizes de ambos são atualizadas, o orçamento soma ambos, e dispose/ocultação abrangem o paciente. [Captura High](bak-after.png), [após reload do checkpoint](bak-after-restored.png), [métricas e hashes de produção](bak-proof.json).

**Prova executada:** 34/34 Node focados (braços, arma e feel), build de produção e 2/2 testes de navegador. Estes incluem E para recolher/depositar, carry walk e saída real do putdown; o teste de regressão usa High 1280×720 e recarrega o estado guardado após entrega. O teste Node percorre duas sequências e compara todos os ossos do jogador com uma instância nova em idle, andar, correr, ADS, bolt e recargas parcial/completa, incluindo pausa.

**Limites:** os testes de navegador começam em snapshots produzidos pelo piloto da simulação; são testes focados de interação/restauro, não uma nova partida integral nem playtest humano. Fotos autênticas do renderer; só o menu de pausa é ocultado na captura indicada. Sem vídeo grande. A pose/movimentação do paciente ainda exige revisão em cadência normal e a licença do fp-arms-v2 continua pendente. Nenhum asset ou clip de terceiros foi alterado.

Os logs antes/depois são preservados, incluindo a falha anterior. Não há alegação de FPS no PC alvo ou equivalência a Call of Duty.

## Interações, orientação e caixa

- `interactionAction()` define o mesmo ID/alcance/estado para o prompt e E. Evita recolher Bąk durante transporte por outro ator, transições, cenas fechadas ou morte. Não cria novas regras de linha de visão ou alcance vertical: mantém o alcance horizontal do jogo e corrige a divergência entre apresentação e execução.
- A rotação só recomenda outro nó ativo com um ponto que a cápsula pode ocupar. O portal e a torre, cujos centros são sólidos, não recebem marcadores dentro da parede. Só uma salva real sustenta a ordem; a posição é uma recomendação, e treliças continuam explicitamente parciais, sem promessa de proteção balística.
- [Ordem](cover-order-high.png) e [chegada](cover-arrival-high.png): estado/marker derivados da mesma simulação. O teste final pausa por input e valida o snapshot independentemente antes de exigir opacity=0. Uma tentativa anterior consultou estado e CSS em momentos separados; o FAIL fica no log. Não se relaxou a asserção, não se aumentou timeout nem se injetou uma posição para obter a chegada.
- [Caixa High](crate-high.png): mesmos braços, dedos e clips, com contacto nas laterais; a caixa foi afastada do olho para caberem mãos e volume no enquadramento. Velocidade, conteúdo e entrega não mudam. As esferas só ficam como fallback quando o rig opcional não pode ser apresentado.
- [Resgate tátil](mobile-bak-delivered.png): o botão USAR executou a entrega; o aviso confirmou Bąk e o objetivo atualizou. A captura é tirada em pausa, por isso os botões ficam ocultos na foto. O spec tátil existente também percorreu andar, olhar, disparar, recarregar e pausar/retomar.
- [Demolição](west-preroll-high.png): `beat.action` não é prosa para o jogador. Mantém-se o token de save e a fala; nenhum gesto físico inexistente é apresentado como concluído.
- Uma revisão adicional reproduziu uma reserva de cobertura sem tiro e «Zieliński: .» no silêncio real das 06:10. A regra passa a respeitar `germanSilence()` antes de selecionar atiradores. O teste isolado não é uma partida: coloca o relógio nesse período e isola o consumo de eventos, apenas para verificar a ausência de reserva/ordem/tiro.

## Como ler os resultados do navegador

O grupo de cinco cenários terminou 4/5 na primeira execução conjunta. A cobertura passou depois 1/1 com captura congelada e verificação independente de chegada/marcador. Não se apresenta isso como uma execução conjunta 5/5. O regresso à arma também passou novamente após a adaptação dos braços para a caixa. Os logs anteriores e a reprodução do defeito inicial ficam preservados; o relatório final distingue os runs e as versões exatas.

A [matriz dos 20 achados](MATRIZ.md) liga a auditoria original às correções já existentes na #91, à continuação e às pendências. As tabelas antigas do Capitão não demonstram integração ou prova visual por si só; a ancestralidade mostrou que D2 já estava no HEAD `afaded9`.
