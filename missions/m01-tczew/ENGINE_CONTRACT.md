# M01 — contrato de integração revisto

Dados revistos nos PRs #8 e #10; runtime em **PROTÓTIPO JOGÁVEL**, com evidências e limites em `QUALITY_REPORT.md`. O JSON descreve a implementação, mas não executa os seus textos de condições, efeitos e restauração. Usar handlers explícitos por ID, sem `eval` nem interpretação automática de prosa. Nunca reutilizar o mapa francês ou a M1 para M01.

## Tempo e eventos

- A indicação das demolições lê `sectors.damage` e o olhar actual: distância/direcção do impacto e destino seguro durante 12 s (leste) / 15 s (oeste) de jogo activo. Não depende da visibilidade da poeira, não força câmara, não acrescenta campos ao schema 2 e não reemite explosões ao restaurar.

- Manter dois valores serializáveis: segundos de jogo activo (animação, IA, combate e tolerâncias) e hora histórica de batalha (agenda dos sectores). Ambos suspendem em pausa; um gate suspende só a hora histórica. Os sectores mantêm combate e estado durante o gate.
- O snap de entrega da mensagem só avança: `max(horaActual, 04:33:10)`. Nunca regressar o relógio se a entrega for tardia. Ao saltar um intervalo, consumir por ordem os eventos elegíveis, sem perder os que ficaram entre as duas horas.
- `battleClock.at` significa hora atingida ou ultrapassada, não igualdade numérica. Eventos dependentes tornam-se elegíveis quando os seus pré-requisitos terminam. Guardar IDs consumidos e a hora de consumo para `delaySec`.
- Um gate consulta prontidão, sem exigir que o próprio evento já tenha sido consumido. Quando a prontidão é verdadeira, permite atingir a hora e disparar o evento uma vez. Tolerâncias contam segundos de jogo activo durante a espera. A demolição espera indefinidamente pela saída do jogador, mesmo após o timeout.
- `readyScale` (opcional, segmento com gate): quando a prontidão do gate já é verdadeira, a hora histórica usa essa escala até ao fim do segmento. `seg_repair` usa 27× porque, na partida contínua, o reparo terminava às ~04:49 e restavam ~4,5 min reais sem tarefa até às 05:30. Os horários dos eventos não mudam.
- Ausência de `readiness` equivale a nenhuma condição adicional; ausência de `tolerance` equivale a nenhum timeout automático. `results` ainda requer implementação explícita.

## Checkpoints e representação

- `checkpoints[].restore` é uma descrição do estado esperado, não um snapshot pronto. Guardar o estado real: relógios, timers, objectivos, eventos efectivamente consumidos, falas, actores por ID, munição, ferrolho, carregamento, flags e destruição.
- Não acrescentar automaticamente todos os IDs de uma lista de checkpoint. Eventos condicionais podem não ter acontecido. CP-B/C/D preservam a hora real de salvamento, sem a substituir pela hora nominal da ficha; CP-A também admite estado completo ao saltar a intro.
- Restaurar mortes, feridos, objectivos opcionais e a posição actual de CP-D. Validar todos os dados antes de substituir o estado em execução. Nunca guardar nem ressuscitar actores através de objectos Three.js.
- LOD e visibilidade alteram só a representação. S2 mantém os mesmos IDs e baixas. Fontes sonoras seguem ataques reais e persistentes; a proximidade não inicia um sector.

- CP-C usa `savePolicy: deferUntilSafe`: não perder o pedido de checkpoint quando o raid das 05:30 estiver activo. Guardar ao terminar a janela das 05:34, com hora e eventos reais. Restaurar `m01.second_raid_state`, timers e impactos já consumidos; não repetir a passagem.
- Munição da arma no save: `mag + reserve + shotCount = 45 + received`. `received` (máx. 30) são carregadores que Kowal passa ao jogador; `timers.kowalRounds` guarda o que lhe resta, e os dois somam sempre 30. Saves antigos sem estes campos continuam válidos.
- Feridos e transporte são dados dos actores e entram no save: `carriedBy` (quem leva o ferido) e `task` de Dudek (`evacuate_bak` ou `stay_with_bak`). O renderer só lê estas posições.
- Bąk nunca fica na zona da demolição oeste. Entregue pelo jogador, fica deitado junto a Dudek, que o leva para a estação depois das 06:10 e volta à secção. Recolhido por Dudek às 06:14, ambos ficam na estação (`dlg_m01_056b/057b`).
- `pose` opcional no actor guarda a postura sentada da chamada; saves sem o campo são aceites. A representação distingue também agachados, feridos e transportados a partir dos dados existentes. Geometria procedural, sem alterar saúde, coordenadas ou resultados no renderer.
- Mira/recuo procedural usa `shot`, `firedAt` quando presente, `state`, `role` e `suppressedUntil` no relógio de jogo activo. Mãos, arma, cano e clarão partilham o referencial de apresentação; o tronco inclina-se sobre pés assentes. A mesma hora/dados produzem as mesmas matrizes em pausa/reload, sem novos campos no save ou mudança de hitboxes. `actorAnimations` é diagnóstico de apresentação; não deve servir de autoridade para combate.
- Na chamada das 07:05, os presentes são posicionados no abrigo com `pose: seated` e `crouched: true`, de frente para Jan; ninguém se move durante a cena. Bąk ferido, Dudek na estação e Nowicki desaparecido não são encenados.

## Fogo alemão, reparo e retirada

- **Tiros como dados.** Cada tiro alemão é um registo em `enemyFire.rounds`, com:
  - atirador (`by`), arma e tipo;
  - origem e ponto visado;
  - flecha `h` e horas de partida e chegada.

  O impacto só se resolve à chegada, contra o mundo e as posições actuais. Os tiros em voo entram no save e são validados: origem a x≥690, atirador `de_*` e vítima só `pl_east_*`. Saves sem `enemyFire` começam sem tiros no ar.
- **Trajectória.** É uma aproximação de jogo, não balística medida (`grp_de_east.fireModel`):
  - recta com flecha parabólica de 6e-6·R² (≈9 m a 1,2 km);
  - ~620 m/s de média.

  Sem a flecha, o tabuleiro e o portal ferroviário oeste tapariam os sapadores. O wz.29 do jogador mantém o fallback em recta.
- **Origem visível.** Da cabeça de ponte oeste, as treliças tapam o dique. Vê-se só a faixa dos portões de Lisewo, entre as pontes (x≈1053–1057, z≈9–33), por cima da água.
  - Ficam lá as duas MG34 e 12 atiradores (`firePositions`).
  - Só esses disparam sobre a margem oeste.
  - Os 26 do dique disparam sobre a cabeça de ponte leste e, depois das 06:00, sobre o pelotão.
  - Excepção: a salva de ajuste de `hold_access`, cuja origem fica atrás das treliças (pendente).
  - O renderer desenha clarão e fumo da boca com tamanho mínimo no ecrã, traçante nas rajadas de MG, e poeira ou faísca no impacto. Os estampidos chegam com o atraso de 343 m/s.
- **Reparo.** O trabalho dura 150 s de jogo sem supressão; com 75 s, dois terços acabavam antes do trem das 04:45.
  - Um tiro que passe a menos de 3 m de um sapador no corte pára o trabalho 3,5 s, e a equipa inteira deita-se (`suppressedUntil`).
  - Tiros do jogador a menos de 3 m de uma MG calam-na 5 s; a guarnição precisa de mais 2,5 s para voltar à arma. Kowal responde ao clarão mais recente que vê, com 2 s.
  - Ao fim de 120 s parado, a cadência sobre o reparo cai sem aviso até o trabalho retomar.
  - A fala obrigatória `dlg_m01_022` toca na primeira supressão real (ou aos 40 %, se não houver).
- **Retirada.**
  - Às 06:00 recuam os sobreviventes por ID; os restantes caíram antes, fora de cena.
  - Os 20 s de relógio da regra de baixas contam a partir de `germans_on_east_spans`.
  - Cada baixa é um tiro real de um alemão do tabuleiro que vê o último homem (`victim`); a contagem desce somente se o traçado colidir com o soldado vivo ao chegar. A pontaria antecipa o recuo no tabuleiro; obstáculos, falhas e alvos já mortos não causam baixa.
  - O pelotão corre em fila junto à treliça norte, e os alemães avançam pela metade sul: o fogo de cobertura do jogador não atravessa os próprios soldados.
  - Kowal nunca suprime os alemães do tabuleiro.
- **HUD.** `mission.status` é a linha de estado do HUD e só lê a simulação:
  - percentagem do reparo e se os sapadores estão deitados;
  - estado da MG dos portões;
  - contagem por ID do pelotão;
  - se os alemães do tabuleiro estão suprimidos.
- **Falas e callouts.** Só tocam quando o evento acontece: `dlg_m01_026/027/029/040`, `co_m01_enemy_mg_fire_on_squad`, `co_m01_enemy_group_suppressed`. Os callouts usados ganharam IDs e o validador de legendas aceita-os.

## Espaço, segurança e história

- Coordenadas são metros, X leste, Y altura, Z sul. O limite de movimento (até x=440) inclui o 3.º pilar medido, x≈401 (`bounds.outOfBoundsX`), e a sua zona de aviso. Em x>401, explicar a falha e contar oito segundos de jogo activo; regressar limpa o contador. Ler os valores de `map-layout.json → bounds`, sem os fixar no código.
- Escolher cada impacto aéreo a pelo menos 30 m da posição actual do jogador, incluindo alternativas de quase-acerto. A substituição de um impacto não pode criar outro impacto inseguro.
- Janik e Juchtman ficam completamente fora de cena, sem modelo nem fala. A ficha histórica não autoriza spawn.
- Manter P1–P16 (`SOURCE_CHECK.md`) e medidas provisórias visíveis na documentação. Parágrafos históricos de debrief ficam desactivados enquanto dependerem de verificação. Ver as leituras de H01-PDF, H30 e T23 e as divergências em `HISTORICAL_RESEARCH.md`.

## Fogo de cobertura no protótipo

- A salva de ajuste só reserva a próxima cobertura e avisa depois de emitir tiros. Sem atirador elegível com visão, reavalia a cada quatro segundos activos. `timers.coverFire` é opcional no schema 2 e guarda somente ID, origem e instante da salva real; o validador rejeita dados inválidos. O HUD indica a origem por oito segundos activos, incluindo quando o dique está tapado pela treliça; não altera a câmara nem faz o efeito atravessar geometria.

- Os sapadores trabalham junto ao cabo, na encosta sul do aterro, ao lado de `repair_site_2`. É aí que o fogo mergulhante dos portões chega e de onde o jogador vê os clarões. O renderer mostra-os ajoelhados a trabalhar e curvados sob fogo (pose `pinned`, lida de `suppressedUntil`).
- O pelotão tem 18 instâncias activas. As seis posições de reserva do schema antigo ficam inactivas, incluindo na migração, e todos os IDs são preservados. A prontidão consulta só os homens activos e vivos.
- `grp_de_spans` só dispara depois de activado pelo evento das 06:05, com cadências desfasadas. Activação, baixas e supressão não dependem da câmara, e o tempo sozinho não mata soldados.
- `timers.withdrawalPressure` (do primeiro protótipo) e `nextCombatCall` são dados opcionais no schema 2. O validador aceita-os, e um save sem `enemyFire` nem `withdrawalPressure` recebe as reservas inactivas.
- A supressão do jogador dura 5 s e interrompe fogo e avanço; os alemães suprimidos agacham-se.
- Os eventos `incoming-shot` do primeiro protótipo foram substituídos por `enemy-fire` (partida) e `round-impact` (chegada, com `pinned` e `victim`).
- `Abrigue-se!` tem chamada imediata e pelo menos 2,5 s de objectivo visível antes da conclusão por cobertura. O fallback de 12 s mantém-se.

## Validação

Percurso, wz.29, CP-A..D, skip, independência da câmara e demolições têm testes de simulação e verificações de navegador descritos em `QUALITY_REPORT.md`. As duas rotas de cobertura com controlos não substituem uma nova partida contínua nem um playtest humano. Historicidade fina, afinação humana do combate, encenação e Chromebook continuam pendentes.
