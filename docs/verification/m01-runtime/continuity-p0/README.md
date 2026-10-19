# Continuidade M01 — correções da auditoria

Base verificada: PR #91, `afaded912c5c3a7f8a4e6e567be9a98cd35ac24f`. A versão auditada originalmente era `68301b7`; os relatórios pertencem ao commit `8d420eb`. Não se transfere a nota antiga para a #91.

## P0-A — entrega de Bąk

**Antes:** no build da #91, após E e fim do putdown, o braço flutua e o rifle fica à esquerda. [Captura High](bak-before.png), [diagnóstico completo](bak-before.json). O teste novo falhou com comprimento da linha de mira 0 m.

**Causa:** o clone do paciente era filho do `carry_socket` no rig do jogador. Os dois contêm `weapon` e outros nomes repetidos. As buscas no rig passaram a encontrar a arma oculta de Bąk (escala zero) e novos bindings podiam alcançar o rig errado. Não era necessário substituir os braços ou os clips.

**Depois:** o paciente tem uma raiz separada na mesma cena de primeira pessoa. As matrizes de ambos são atualizadas, o orçamento soma ambos, e dispose/ocultação abrangem o paciente. [Captura High](bak-after.png), [após reload do checkpoint](bak-after-restored.png), [métricas e hashes de produção](bak-proof.json).

**Prova executada:** 34/34 Node focados (braços, arma e feel), build de produção e 2/2 testes de navegador. Estes incluem E para recolher/depositar, carry walk e saída real do putdown; o teste de regressão usa High 1280×720 e recarrega o estado guardado após entrega. O teste Node percorre duas sequências e compara todos os ossos do jogador com uma instância nova em idle, andar, correr, ADS, bolt e recargas parcial/completa, incluindo pausa.

**Limites:** os testes de navegador começam em snapshots produzidos pelo piloto da simulação; são testes focados de interação/restauro, não uma nova partida integral nem playtest humano. Fotos autênticas do renderer; só o menu de pausa é ocultado na captura indicada. Sem vídeo grande. A pose/movimentação do paciente ainda exige revisão em cadência normal e a licença do fp-arms-v2 continua pendente. Nenhum asset ou clip de terceiros foi alterado.

Os logs antes/depois são preservados, incluindo a falha anterior. Não há alegação de FPS no PC alvo ou equivalência a Call of Duty.
