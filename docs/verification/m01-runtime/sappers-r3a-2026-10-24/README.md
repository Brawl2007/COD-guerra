# Operação técnica dos sapadores: cabo, dois cortes, teste que falha, relato, ordem e verificação — 2026-10-24 (R3-a)

Ramo local `claude/exciting-bohr-k8v5xm-r3a` (de `3c8e576d`, a candidata #80 com as bombas R1-a, a secção polaca R2-a e a IA alemã R2-b). **Não publicada**, sem revisão crítica independente, **sem playtest humano**. Ordem do Capitão a partir da queixa do proprietário: «os sapadores parecem homens a picar o chão repetidamente, sem trabalho visível».

Resumo em três linhas. **(1)** A equipa de três sapadores deixa de ajoelhar numa só pose durante 150 s: segue o cabo até ao corte, espera a caixa, examina, emenda e testa; o 1.º teste **falha** (sempre, em todos os níveis e sementes) e manda-a seguir o cabo até um 2.º corte, onde examina, emenda e testa outra vez; o chefe avisa o oficial, esperam a ordem das 05:30 e olham o resultado de cada demolição. **(2)** Tudo é dado (`mission.json`, `grp_sappers.operation`) e função pura do estado guardado (a barra 0–100 de sempre dá a etapa), com consequências: a barra só avança com o chefe no lugar da etapa, uma ronda a menos de 6 m da linha entre os dois cortes ou uma bomba que abane os homens a trabalhar pára a etapa, e quem tem cobertura a ≤ 8 m corre para ela por decisão própria (não há nenhuma junto dos cortes: ficam deitados onde estão). **(3)** O tempo de reparo e as âncoras históricas ficam onde estavam (24 rotas: reparo −3,0 s em média, −17 a +3,5 s por rota; 24 / 24 concluídos antes da ordem das 05:30); o cabo, os cortes com estacas e trapos brancos, a manga da emenda, a caixa, as ferramentas e a lâmpada do testador (âmbar, vermelha, verde) veem-se do sítio do jogador, a 8 m.

## 1. O que a simulação fazia antes (medido em `3c8e576d`, 24 rotas)

- **Uma barra e uma pose.** `obj_m01_cover_repair` era uma barra 0–100 (`REPAIR_WORK_SEC` = 150 s de trabalho sem supressão). Os três sapadores andavam até ao ponto de reparo 2, deitavam-se à espera da caixa, ajoelhavam-se na mesma pose (`sapper_work`) durante os 150 s, e deitavam-se quando suprimidos. O HUD dizia «Reparo N% · sapadores a trabalhar». Não havia cabo desenhado, nem ferramentas, nem corte à vista, nem teste, nem relato.
- **O reparo medido** (12 sementes × controlo e apoio, `metrics-before.jsonl`): **controlo** (o piloto nunca dispara) 218,3 s reais de reparo (191,8–241,1), 47,9 rondas que apanham a equipa, 11,8 interrupções por rota de 5,8 s (68,3 s parados), concluído no máximo às 05:14:42, 12 / 12 antes da ordem das 05:30 (margem mínima 917 s); **apoio** (o piloto mantém a MG do dique em baixo) 169,9 s (158,8–180,2), 6,5 rondas, 5,3 interrupções de 3,9 s (20,0 s parados), no máximo às 05:05:34. **Cobertura do jogador**: ignorar a MG custa em média **48,3 s** a mais do que suprimi-la (mínimo 14,0 s, semente 4; 41,4 rondas a mais).
- **Quem interrompe** (24 rotas, 205 interrupções): MG34 `de_east_0` 110 (todas no controlo), fuzileiros do portão 93, MG34 `de_east_1` 2.

## 2. O que mudou no jogo

Código: `src/game/m01-sappers.js` (novo: o plano validado, a fase, o objectivo de cada homem, a cobertura, a vista de leitura), `src/game/m01-simulation.js` (ligação), `src/game/m01-pacing.js` e `src/game/m01-barks.js` (texto de estado e condição `sapperStage`), `src/game/m01-animation-presentation.js` (postura de corrida para a cobertura); renderizador (só apresentação): `src/render/m01-sapper-pose.js` (clip por fase e papel), `m01-sapper-kit.js` (ferramentas nas mãos), `m01-repair-line.js` (o cabo, os cortes, a caixa), `m01-characters.js`, `m01-view.js`. Dados: `missions/m01-tczew/mission.json` (`grp_sappers.operation`, falas `dlg_m01_200`–`207`).

### 2.1 Os dados (`grp_sappers.operation`)

- **Pontos** (x / z do mundo do jogo, em metros): a cratera da bomba (`crater`, −40,6 / 10,5, corte de 2,4 m, o ponto de reparo 1, onde a equipa começa), o corte onde chega a caixa (`fault`, −120,4 / 10,72, 1,5 m, o ponto de reparo 2) e o 2.º corte (`second`, −136,6 / 10,72, 1,5 m, 16,2 m ao longo do cabo para oeste). Cada ponto de trabalho tem o lugar de cada homem (x, z, rumo), a ≥ 0,9 m um do outro. O cabo é uma linha desenhada (11 pontos, x −196 … −12) que passa por esses lugares, sobre a encosta sul do aterro (a `ignition_line` RECONSTRUÍDA, desenhada 2 m a sul da linha esquemática para as mãos chegarem ao cabo); a exposição ao fogo dos lugares é a de antes (22 rondas a < 3 m por 100 s no ponto 2; 24 no 2.º corte: medido).
- **Papéis**: `pawel_krawiec` chefe (examina, emenda, testa e fala), `sapper_2` ajudante (segura o cabo, leva a caixa), `sapper_3` vigia (olha para fora do corte).
- **Etapas** (somam 150 s de trabalho, validado ao carregar), com a janela da barra 0–100 e o texto do HUD:

| Etapa | Onde | Trabalho (s) | Barra (%) | Texto do HUD (depois de «Reparo N% · ») |
|---|---|---|---|---|
| `inspect` | fault | 14 | 0–9,3 | sapadores a examinar a ligação |
| `splice` | fault | 52 | 9,3–44,0 | sapadores a emendar o cabo |
| `test` | fault | 6 | 44,0–48,0 | sapadores a testar a linha |
| `fail` | fault | 4 | 48,0–50,7 | sem passagem · falta o segundo corte |
| `relocate` | → second (1,8 m/s) | 10 | 50,7–57,3 | sapadores a seguir o cabo até ao segundo corte |
| `inspect2` | second | 8 | 57,3–62,7 | sapadores a examinar o segundo corte |
| `splice2` | second | 46 | 62,7–93,3 | sapadores a emendar o segundo corte |
| `test2` | second | 10 | 93,3–100 | sapadores a testar a linha inteira |

  Fora da barra: `camp` (na cratera, até serem chamados), `locate` («Os sapadores procuram o corte», seguem o cabo a 1,8 m/s), `standby` («Os sapadores esperam o material junto ao corte»), `report` (8 s, «linha inteira · os sapadores avisam o oficial»), `ready` (aguardam a ordem das 05:30), `verify` / `verify_west` (8 s depois de cada demolição, 06:10 e 06:45, olham para leste e só depois a retirada de sempre).
- **Classificação**: `GAMEPLAY_DRAMATIZATION`. **Sem instrução técnica real de explosivos** (HISTORICAL_RESEARCH.md §79): o jogo mostra o cabo cortado, os sapadores a examinar, emendar, testar a continuidade e avisar; nenhuma ligação, carga ou procedimento.

### 2.2 A fase e as consequências na simulação

- **A fase é função pura do estado guardado** (`sapperPhase`): objectivos, progresso da barra, instantes dos eventos consumidos (`evt_m01_repair_complete`, demolições, `cable_cut`), relógio e posições. **Nada de novo é guardado** além da bandeira opcional e validada `coverRun` do homem (só durante os ticks de uma corrida para a cobertura). **Nenhum sorteio** do fluxo principal nem relógio de parede.
- **A barra só avança com o chefe no lugar da etapa** (`leaderAt`, a ≤ 2,5 m do lugar dele), ou a caminhar (`relocate`), e nunca pode acabar a caminhada antes de ele chegar (tecto da barra). Sem chefe vivo, avança como antes.
- **Interrupção**: uma ronda a menos de 3 m da equipa a menos de 6 m da linha entre os dois cortes (era: do ponto de reparo 2) põe a equipa em supressão (3,5 s uma espingarda, 5 s uma rajada de MG34, `timers.repairSuppressedUntil`), uma bomba que abane um sapador a trabalhar faz o mesmo (R1-a), e a etapa **retoma onde ficou**, do lugar da etapa, quando acaba.
- **Cobertura por decisão própria**: um sapador suprimido ou abalado procura o nó de cobertura **com caixa** (não janela, esquina nem veículo) mais próximo a ≤ 8 m, corre para o lado de sotavento dele (`coverRun`, a 3,6 m/s, não desenhado deitado a meio da corrida) e deita-se lá; sem nó ao alcance, deita-se onde está, como antes. Os nós do mundo (25) ficam todos a > 50 m dos dois cortes (o mais próximo, `cv_squad_post`, a 51,6 m do corte 1; `cv_trench_1` a 6,3 m da cratera): **a corrida não acontece nos cortes nem em nenhuma das 6 rotas medidas (0 episódios)**, ver §7.
- **Cada pino conta nos dois cortes e na caminhada entre eles**: o tempo de exposição por 100 s no lugar de cada etapa foi medido antes de pôr os lugares (ponto 2: 22 rondas; x −100 / −110 / −130 / −136: 19 / 20 / 24 / 24).
- **HUD**: a linha de estado do objectivo lê a etapa (tabela acima); a linha de «sapadores deitados sob fogo da metralhadora do dique» continua a ser a da simulação. Durante `fetch_material` a linha diz o que fazem (procuram, esperam).

### 2.3 Apresentação (só renderizador)

- **Clip por fase e papel** (biblioteca T08 existente, nenhum clip novo): andam (`walk`) em `locate`; ajoelhados e à espera em `standby` (`crouched_idle_b`; o ajudante em pé); `sapper_work` para o chefe e o ajudante e `cover_low_idle` para o vigia durante examinar e emendar; o chefe a testar (`sapper_work`, lâmpada na mão), de pé e a olhar ao longo do cabo em `fail`, a andar com o ajudante a carregar a caixa (`carry_walk`) em `relocate`; em pé e a falar em `report`; ajoelhado o chefe e em pé os outros em `ready`; deitados (`prone_idle`) quando suprimidos. Um flinch por acerto próximo continua a ganhar ao trabalho.
- **Cabo e cortes** (`M01RepairLine`, original, sem ficheiros): tubo pálido de 6 cm sobre o terreno **desenhado** (a malha de 5 m: o 1.º teste no jogo mostrou que o cabo de 3 cm, preto e à altura analítica, desaparecia no pé do talude, onde a corda da malha fica acima do perfil), cortado onde a simulação diz (aberto: intervalo com pontas e **duas estacas com trapos brancos**; fechado: manga clara e fitas; sem corte: inteiro), reconstruído só quando um corte muda (três vezes numa missão). A **caixa** (aberta, com tampa e faixa branca), um **pano com ferramentas**, um rolo de cabo e (em `relocate`) a caixa **ao ombro** do ajudante (osso `carry_socket`).
- **Ferramentas nas mãos**: alicate (chefe, examinar e emendar), testador com **lâmpada e brilho** (âmbar enquanto testa, vermelha sem passagem, verde com passagem; sprite aditivo sem luz na cena), rolo no ajudante.
- **Legibilidade medida no jogo**: as primeiras capturas (cabo preto de 3 cm, caixa castanha de 44 cm, lâmpada de 2,4 cm) não se liam a 8–15 m na luz escura do amanhecer; o cabo pálido de 6 cm, as estacas, a manga e a caixa maiores, uma luminosidade própria mínima (fracção da cor, sem luz nova) e o brilho da lâmpada resolveram-no (§4).

### 2.4 Falas (`dlg_m01_200`–`207`)

Oito linhas novas sobre a condição nova `sapperStage` do realizador (`poll`, a ≤ 90 m do falante, máx. 1): `200` Krawiec em `standby` («Aqui está o corte. Quando a caixa chegar, começamos.»), `201` em `inspect` («Caixa aberta. Vejam as pontas.»), `202` `sapper_2` em `splice` a partir dos 12 % («Seguro aqui. Pode emendar.»), `203` Krawiec em `test` («Testem a linha.»), `204` `sapper_2` em `fail` («Sem passagem. Falta o outro corte.»; **guionada**, dita sempre no instante da etapa, porque a 60 s do trem 963 o orçamento do realizador esgotava as reativas), `205` Krawiec em `relocate`, `206` `sapper_3` em `test2` («Último teste.»), `207` Krawiec em `verify`. Reutilizadas as de sempre para pino, retoma e metade do reparo. **Polaco por rever por falante nativo** (cada linha leva o polaco e esta marca em `note`; a legenda é o português); texto original escrito por agente de IA.

### 2.5 Estado e saves (schema 2 intacto)

Nenhum registo novo. A etapa deduz-se da barra: um save feito **antes** desta entrega a 35 % cai em `splice` e continua (testado: os homens vão para os lugares novos e a missão acaba); a 0 % na primeira etapa, a 100 % na última. `coverRun` é opcional, validado (só `ENGINEER` aliado suprimido com alvo) e ausente em todos os saves antigos. Um save feito no meio de **cada fase** valida, restaura sem edição e continua igual ao original.

@@MEASURE@@
