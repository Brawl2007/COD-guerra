# M01 — contrato de integração revisto

Revisão do PR #8. Missão **PLANEJADA**: o JSON descreve a implementação, mas não executa os seus textos de condições, efeitos e restauração. Criar handlers explícitos por ID, sem `eval` nem interpretação automática de prosa. Nunca reutilizar o mapa francês ou a M1 para M01.

## Tempo e eventos

- Manter dois valores serializáveis: segundos de jogo activo (animação, IA, combate e tolerâncias) e hora histórica de batalha (agenda dos sectores). Ambos suspendem em pausa; um gate suspende só a hora histórica. Os sectores mantêm combate e estado durante o gate.
- O snap de entrega da mensagem só avança: `max(horaActual, 04:33:10)`. Nunca regressar o relógio se a entrega for tardia. Ao saltar um intervalo, consumir por ordem os eventos elegíveis, sem perder os que ficaram entre as duas horas.
- `battleClock.at` significa hora atingida ou ultrapassada, não igualdade numérica. Eventos dependentes tornam-se elegíveis quando os seus pré-requisitos terminam. Guardar IDs consumidos e a hora de consumo para `delaySec`.
- Um gate consulta prontidão, sem exigir que o próprio evento já tenha sido consumido. Quando a prontidão é verdadeira, permite atingir a hora e disparar o evento uma vez. Tolerâncias contam segundos de jogo activo durante a espera. A demolição espera indefinidamente pela saída do jogador, mesmo após o timeout.
- Ausência de `readiness` equivale a nenhuma condição adicional; ausência de `tolerance` equivale a nenhum timeout automático. `results` ainda requer implementação explícita.

## Checkpoints e representação

- `checkpoints[].restore` é uma descrição do estado esperado, não um snapshot pronto. Guardar o estado real: relógios, timers, objectivos, eventos efectivamente consumidos, falas, actores por ID, munição, ferrolho, carregamento, flags e destruição.
- Não acrescentar automaticamente todos os IDs de uma lista de checkpoint. Eventos condicionais podem não ter acontecido. CP-B/C/D preservam a hora real de salvamento, sem a substituir pela hora nominal da ficha; CP-A também admite estado completo ao saltar a intro.
- Restaurar mortes, feridos, objectivos opcionais e a posição actual de CP-D. Validar todos os dados antes de substituir o estado em execução. Nunca guardar nem ressuscitar actores através de objectos Three.js.
- LOD e visibilidade alteram só a representação. S2 mantém os mesmos IDs e baixas. Fontes sonoras seguem ataques reais e persistentes; a proximidade não inicia um sector.

## Espaço, segurança e história

- Coordenadas são metros, X leste, Y altura, Z sul. O limite de movimento inclui x=419 e a sua zona de aviso. Em x>419, explicar a falha e contar oito segundos de jogo activo; regressar limpa o contador.
- Escolher cada impacto aéreo a pelo menos 30 m da posição actual do jogador, incluindo alternativas de quase-acerto. A substituição de um impacto não pode criar outro impacto inseguro.
- Janik e Juchtman ficam completamente fora de cena, sem modelo nem fala. A ficha histórica não autoriza spawn.
- Manter P1–P12 e medidas provisórias visíveis na documentação. Parágrafos históricos de debrief ficam desactivados enquanto dependerem de verificação. Ver a leitura parcial de H01-PDF e as divergências em `HISTORICAL_RESEARCH.md`.

## Validação que falta

Jogabilidade completa com wz.29, restauração em CP-A..D, skip de cenas com estado consistente, espera de 90 s sem depender da câmera e demolições seguras. Os testes de dados não demonstram estes comportamentos.
