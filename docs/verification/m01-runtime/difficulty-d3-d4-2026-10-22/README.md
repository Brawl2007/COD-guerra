# Dificuldade H9: D3 (morte com causa, CP-B2), D4 (morte justa F1–F5) e o resto da D5 — evidência de 2026-10-22

Branch `wp1-difficulty`, sobre `efb8eb00d37a3370018e6193c4c0b158094f0241` (a candidata #80 em `4e2588fa` mais um commit só de CI; a simulação é a mesma).
Desenho: `docs/direction/H9_DIFICULDADE.md` (D35). Esta pasta é a prova pedida pela secção 6 desse desenho.

**Decisões do proprietário (2026-10-22), que mandam:** (1) o veterano **não regenera** (a D2 tinha-lhe dado +3 PV/s após 10 s, contra a recomendação do §7 item 2) e a dificuldade é
recalibrada em conjunto com a D3/D4; (2) fazer por inteiro a D3 e a D4 e o que faltava da D5 (pausa de morte de 2,5 s sem avançar a simulação, nível no cartão do checkpoint, oferta
«continuar em nível mais baixo» após mortes repetidas).

## 1. Resultado em duas linhas

- Com a tabela recalibrada, **as barras da secção 6 cumprem-se** (lidas como o desenho as define: o cenário «exposto» agrupa o reparo e a retenção, 12 sementes × 2 fases): soldado mediana
  17,65 s (barra 15–25), em cobertura nenhuma morte em 24 corridas (barra ≥ 120 s); veterano mediana 9,9 s (barra 8–12), em cobertura 5 mortes em 24 corridas, a primeira aos 103,75 s (barra ≥ 60 s); recruta 0 mortes e
  as 48 corridas de recruta do varrimento de perigo (e as 24 rotas) são **idênticas byte a byte** às da candidata sem estas alterações; a regra F1 vale em **53 de 53** ferimentos letais.
- **Consequência medida que o proprietário tem de saber:** soldado, o nível por defeito dos jogos novos, ficou muito mais letal do que na D2 para quem fica parado; os dois pilotos de teste
  (controlo e apoio), que nunca se mexem do posto, já **não sobrevivem** em geral a soldado nem a veterano: em veterano morrem 24 de 24, em soldado 12 de 12 (controlo) e 7 de 12 (apoio) (secção 3.2). O desenho (§6) já previa isto; só um playtest humano diz se a tabela é
  agradável para quem se mexe e responde ao fogo.

## 2. O que mudou

| Item | O que ficou | Onde |
|---|---|---|
| D3 morte com causa | `playerDown(cause,by,weapon)`: `failure` com a causa e o atirador (F5) e **um** evento `player-down {cause,by,text}` por morte (bala, granada própria, queda, rio, limite da secção); o restauro continua a ser o do tick seguinte e diz porquê; o `failure` não se guarda | `src/game/m01-simulation.js`, `src/game/m01-difficulty.js` (`deathText`), `src/game/m01-audio-events.js` (valida o evento) |
| D3 CP-B2 | `cp_m01_b2_reparo` («CP-B2 · Reparo»), guardado no tick em que a caixa chega aos sapadores e `obj_m01_cover_repair` fica ativo, **só em soldado e veterano**; recruta não o guarda (a rota fica byte a byte a mesma) | `missions/m01-tczew/mission.json`, `m01-simulation.js`, `checkpointApplies` |
| D3 vida no checkpoint | 100 PV ao guardar e ao restaurar em soldado e veterano (`hpOnCheckpoint`, da D2) | `m01-difficulty.js` |
| D3 regeneração | veterano `healing:null` (decisão do proprietário); soldado mantém +5 PV/s após 8 s sem ser atingido | `m01-difficulty.js` |
| D4 F1, F2, F3 | já da D2 (reação, uma ferida por rajada, bombas e demolições não ferem); agora **medidas em todos os ferimentos letais** do varrimento | `tests/helpers/m01-danger.js`, `tools/verification/m01-danger-sweep.mjs` |
| D4 F4 | um ferimento que mataria durante uma cena (`sim.scene` ativa) deixa 1 PV; só soldado e veterano (em recruta nada muda) | `m01-simulation.js` (`woundPlayer`) |
| D4 F5 | toda a morte tem causa e atirador, nomeado pelo lugar («Abatido pela MG34 do dique (portões).»); a queda, o rio e o limite mantêm os textos que já tinham | `m01-difficulty.js` (`deathText`) |
| D5 pausa de morte | 2,5 s de tempo **real**: escurece e mostra a causa e «A retomar em CP-x · Nome · Nível»; `sim.tick` não corre; um quadro lento conta no máximo 1 s | `src/game/game.js`, `src/ui/m01-hud.js` (`DEATH_BEAT`), `index.html`, `src/styles-d5-difficulty.css` |
| D5 cartão do checkpoint | «CP-x · Nome · Nível» | `game.js` |
| D5 «continuar em nível mais baixo» | à 3.ª morte no mesmo checkpoint, acima de recruta, o jogo pára no ecrã `#death-offer`; `Game.continueLowerLevel()` só pede, a simulação re-nivela o checkpoint (`lowerDifficulty`, `relevelSnapshot`) e **nunca sobe** o nível; contador por checkpoint só de sessão (não se guarda) | `game.js`, `src/main.js`, `m01-simulation.js` |
| Tabela | linhas de soldado e veterano recalibradas (abaixo) | `m01-difficulty.js` |
| Saves | esquema 2 mantido; sem `difficulty` = recruta; um save de soldado ou veterano anterior à D3 (sem CP-B2) carrega e ganha o CP-B2 se a caixa ainda não tiver sido entregue; o `failure` e a pausa de morte não entram em nenhum save | `tests/m01-difficulty-death.test.js` |

**Tabela (recruta intacta).** Antes = D2 (2026-10-19), depois = esta entrega. Os valores da D2 e da D35 ficam em comentário em `src/game/m01-difficulty.js`.

| Parâmetro | soldado antes | soldado depois | veterano antes | veterano depois |
|---|---|---|---|---|
| Chance de ferida por colisão, exposto / cobertura | .45 / .15 | **1 / .06** | .80 / .30 | **1 / .08** |
| Dano por ferida | 25 (4 feridas) | **34 (3 feridas)** | 40 (3 feridas) | **50 (2 feridas)** |
| Erro de pontaria × | .85 | **.35** | .55 | **.35** |
| Cadência × (tempo entre rajadas no lado oeste) | .90 | **.50** | .70 | **.50** |
| Reação antes de poder matar (F1) | 1,5 s | **1,2 s** | .8 s | .8 s |
| Regeneração | +5 PV/s após 8 s | +5 PV/s após 8 s | +3 PV/s após 10 s | **nenhuma** |
| Sem alteração | cap de 1 ferida por rajada, limiares do portão e do tabuleiro, parte da de_east_0 (30 % / 50 %), salva de 30 s / 20 s, pool do Kowal 30 / 15, PV a 100 no checkpoint, bombas não letais | | | |

## 3. Medição

### 3.1 As barras da secção 6 (`tools/verification/m01-danger-sweep.mjs`, novo)

Quatro cenários × 12 sementes (19390901, 1…11) × 3 níveis, sobre o piloto de teste real: a fase é alcançada em recruta (onde o piloto chega sempre vivo), o estado é guardado e **reajustado ao nível**
em teste, de modo que, para a mesma semente, todos os níveis partem do mesmo estado e só as regras do nível diferem (comparação emparelhada). O jogador fica **parado**:

- `exposed/repair`: de pé em (−120, 16,5) durante `obj_m01_cover_repair`, à vista das duas MG34 e dos doze atiradores do portão;
- `exposed/hold`: de pé em (−10, 22) durante `obj_m01_hold_access`, a partir do CP-C (05:34, vida cheia);
- `covered/repair`, `covered/hold`: de cócoras em (−26,5, 28), 1,5 m atrás do nó de cobertura `cv_sandbag_mid_2` (dentro do teste de cobertura da própria simulação).

O tempo até à morte (TTD) conta desde o mais tardio do momento em que o jogador está no posto e da chegada do comboio 963 (04:45), isto é, o tempo passado à vista das armas **ativas**. O
limite de cada corrida é 240 s (reparo) e 180 s (retenção); uma corrida que sobrevive conta como infinita.
**Leitura das barras:** o desenho (§6) define «exposto» como «de pé num ponto do lado oeste à vista das MG durante o reparo **e** durante o hold_access», logo a mediana é a das 24 corridas
(12 sementes × 2 fases) e o mínimo de «cobertura» o das 24; as linhas por fase são as mesmas corridas.

**Depois (esta entrega):**

| Nível | Cenário | Corridas | Mortes | TTD mediano (s) | TTD mínimo (s) | TTD máximo (s) | Barra da secção 6 |
|---|---|---|---|---|---|---|---|
| recruta | exposed/repair | 12 | 0 | sem morte (limite) | — | — | |
| recruta | exposed/hold | 12 | 0 | sem morte (limite) | — | — | |
| recruta | covered/repair | 12 | 0 | sem morte (limite) | — | — | |
| recruta | covered/hold | 12 | 0 | sem morte (limite) | — | — | |
| recruta | **exposed agrupado (reparo+retenção)** | 24 | 0 | sem morte (limite) | — | — | **cumpre**: 0 deaths of 24 |
| recruta | **covered agrupado (reparo+retenção)** | 24 | 0 | sem morte (limite) | — | — | **cumpre**: 0 deaths of 24 |
| soldado | exposed/repair | 12 | 12 | 19.3 | 5.2 | 142.05 | |
| soldado | exposed/hold | 12 | 12 | 17.65 | 7.4 | 48.7 | |
| soldado | covered/repair | 12 | 0 | sem morte (limite) | — | — | |
| soldado | covered/hold | 12 | 0 | sem morte (limite) | — | — | |
| soldado | **exposed agrupado (reparo+retenção)** | 24 | 24 | 17.65 | 5.2 | 142.05 | **cumpre**: median TTD 17.65 s (band 15-25), 24 deaths of 24 |
| soldado | **covered agrupado (reparo+retenção)** | 24 | 0 | sem morte (limite) | — | — | **cumpre**: 0 runs died before 120 s (min Infinity s), 0 deaths of 24 |
| veterano | exposed/repair | 12 | 12 | 6.3 | 4.9 | 14.2 | |
| veterano | exposed/hold | 12 | 12 | 14.55 | 6.9 | 38.95 | |
| veterano | covered/repair | 12 | 0 | sem morte (limite) | — | — | |
| veterano | covered/hold | 12 | 5 | sem morte (limite) | 103.75 | 175.15 | |
| veterano | **exposed agrupado (reparo+retenção)** | 24 | 24 | 9.9 | 4.9 | 38.95 | **cumpre**: median TTD 9.9 s (band 8-12), 24 deaths of 24 |
| veterano | **covered agrupado (reparo+retenção)** | 24 | 5 | sem morte (limite) | 103.75 | 175.15 | **cumpre**: 0 runs died before 60 s (min 103.75 s), 5 deaths of 24 |

**Antes (D2, tabela de 2026-10-19 em `efb8eb00`, mesmos cenários e mesmo auxiliar):**

| Nível | Cenário | Corridas | Mortes | TTD mediano (s) | TTD mínimo (s) | TTD máximo (s) | Barra da secção 6 |
|---|---|---|---|---|---|---|---|
| recruta | exposed/repair | 12 | 0 | sem morte (limite) | — | — | |
| recruta | exposed/hold | 12 | 0 | sem morte (limite) | — | — | |
| recruta | covered/repair | 12 | 0 | sem morte (limite) | — | — | |
| recruta | covered/hold | 12 | 0 | sem morte (limite) | — | — | |
| recruta | **exposed agrupado (reparo+retenção)** | 24 | 0 | sem morte (limite) | — | — | **cumpre**: 0 deaths of 24 |
| recruta | **covered agrupado (reparo+retenção)** | 24 | 0 | sem morte (limite) | — | — | **cumpre**: 0 deaths of 24 |
| soldado | exposed/repair | 12 | 0 | sem morte (limite) | — | — | |
| soldado | exposed/hold | 12 | 0 | sem morte (limite) | — | — | |
| soldado | covered/repair | 12 | 0 | sem morte (limite) | — | — | |
| soldado | covered/hold | 12 | 0 | sem morte (limite) | — | — | |
| soldado | **exposed agrupado (reparo+retenção)** | 24 | 0 | sem morte (limite) | — | — | **NÃO cumpre**: median TTD Infinity s (band 15-25), 0 deaths of 24 |
| soldado | **covered agrupado (reparo+retenção)** | 24 | 0 | sem morte (limite) | — | — | **cumpre**: 0 runs died before 120 s (min Infinity s), 0 deaths of 24 |
| veterano | exposed/repair | 12 | 12 | 48.9 | 23.75 | 191.9 | |
| veterano | exposed/hold | 12 | 11 | 40.9 | 12.85 | 153.75 | |
| veterano | covered/repair | 12 | 0 | sem morte (limite) | — | — | |
| veterano | covered/hold | 12 | 0 | sem morte (limite) | — | — | |
| veterano | **exposed agrupado (reparo+retenção)** | 24 | 23 | 40.9 | 12.85 | 191.9 | **NÃO cumpre**: median TTD 40.9 s (band 8-12), 23 deaths of 24 |
| veterano | **covered agrupado (reparo+retenção)** | 24 | 0 | sem morte (limite) | — | — | **cumpre**: 0 runs died before 60 s (min Infinity s), 0 deaths of 24 |

Leitura honesta dos números:

- Soldado cumpre também **por fase** (reparo 19,3 s, retenção 17,65 s, ambas em 15–25).
- Veterano cumpre **agrupado** (9,9 s), mas **não por fase**: o reparo mata em 6,3 s (abaixo de 8) e a retenção em 14,55 s (acima de 12). As duas fases têm fogo diferente (no
  reparo atuam a de_east_0 e os doze atiradores à vista dos sapadores; na retenção, com o CP-C a meio, o fogo é mais disperso) e uma só tabela por nível não as junta; reportado, não escondido.
- Em cobertura ninguém de soldado morre em 24 corridas e o veterano só morre na retenção (5 de 12), nunca antes de 103,75 s.
- A D2 ficava muito aquém das barras: soldado não morria em nenhuma das 24 corridas expostas e a mediana do veterano era 40,9 s.

### 3.2 As 24 rotas dos pilotos de teste (`tools/verification/m01-difficulty-sweep.mjs`, da D2)

12 sementes × {controlo, apoio} por nível, sobre o piloto de teste (que nunca responde ao fogo).

**Depois (esta entrega):**

| Nível | Rota | Rotas | Mortes | PV mín. | PV mín. mediano | PV final mediano | Colisões med./máx. | Feridas med./máx. | Combate do tabuleiro (s reais) mediano |
|---|---|---|---|---|---|---|---|---|---|
| recruta | controlo | 12 | 0 | 52 | 84 | 84 | 14/20 | 2/6 | 262.3 |
| recruta | apoio | 12 | 0 | 68 | 100 | 100 | 5/11 | 0/4 | 243.5 |
| soldado | controlo | 12 | 12 | 0 | 0 | — | 13/35 | 9/21 | — |
| soldado | apoio | 12 | 7 | 0 | 0 | 100 | 8/68 | 4/18 | 219.4 |
| veterano | controlo | 12 | 12 | 0 | 0 | — | 3/18 | 3/3 | — |
| veterano | apoio | 12 | 12 | 0 | 0 | — | 5/23 | 3/5 | — |

**Antes (D2, `efb8eb00`):**

| Nível | Rota | Rotas | Mortes | PV mín. | PV mín. mediano | PV final mediano | Colisões med./máx. | Feridas med./máx. | Combate do tabuleiro (s reais) mediano |
|---|---|---|---|---|---|---|---|---|---|
| recruta | controlo | 12 | 0 | 52 | 84 | 84 | 14/20 | 2/6 | 262.3 |
| recruta | apoio | 12 | 0 | 68 | 100 | 100 | 5/11 | 0/4 | 243.5 |
| soldado | controlo | 12 | 0 | 41.25 | 73.75 | 100 | 19/32 | 8/16 | 262.3 |
| soldado | apoio | 12 | 0 | 50 | 75 | 100 | 10/12 | 3/5 | 241.5 |
| veterano | controlo | 12 | 12 | 0 | 0 | — | 13/28 | 9/15 | — |
| veterano | apoio | 12 | 0 | 1 | 20 | 100 | 21/28 | 9/15 | 226.6 |

Os pilotos de teste ficam parados no posto (o de controlo ao pé dos sacos de areia e no posto do tabuleiro; o de apoio ao lado dos sapadores): é exatamente o que as barras da secção 6 medem, e o
desenho já dizia «o piloto de rota **não** deve sobreviver a soldado/veterano; os testes de rota completa ficam em recruta». A única asserção dos testes que o assumia, `tests/m01-deck-assault.test.js`,
foi atualizada com comentário datado.

### 3.3 Regra F1 em todos os ferimentos letais

| Nível | Ferimentos letais | Reação exigida (F1) | `engagedFor` mínimo | `engagedFor` máximo | `sinceTelegraph` máximo | Em cena (F4) | Armas | Ferimentos que a F1 deixou a 1 PV |
|---|---|---|---|---|---|---|---|---|
| soldado | 24 | 1,2 s | 1,275 s | 11,6 s | 0 s (limite 6 s) | 0 | 23 MG34, 1 Kar98k | 20 |
| veterano | 29 | 0,8 s | 1,0 s | 6,85 s | 0 s (limite 6 s) | 0 | 24 MG34, 5 Kar98k | 19 |
| **Total** | **53** | | | | | **0** | | **39** |

Violações da F1 nos 53 ferimentos letais: **0**. Nas 96 corridas dos dois níveis a morte nunca ocorreu a andar (`diedWalking` 0) e nenhuma colisão consumiu mais do que um sorteio (`drawViolations` 0).

`engagedFor` é medido pelo auxiliar com o seu próprio registo de disparos (não pela simulação): é o tempo que o mesmo atirador levava a disparar sobre o jogador quando a ferida letal acertou;
`sinceTelegraph` é o tempo desde o último telégrafo (clarão, estalo, traçante, grito). Nenhuma ferida letal aconteceu numa cena (F4), e cada colisão consumiu exatamente um sorteio (`drawViolations` 0).

## 4. Recruta intacta

Tudo o que mudou nesta entrega está desligado ou ausente em recruta: nenhum multiplicador mudou, a F4 e o CP-B2 só existem em soldado e veterano, o `failure` e `player-down` só nascem numa morte, e nenhuma chave nova entra num save de recruta. Provas, todas medidas nesta árvore:

- **Varrimento de perigo, recruta:** as 48 corridas (4 cenários × 12 sementes) são **idênticas byte a byte** às da candidata `efb8eb00` (`cmp` de `DANGER_SWEEP_AFTER_RECRUTA.jsonl` com `DANGER_SWEEP_BEFORE_D2_RECRUTA.jsonl`); 0 mortes nas duas.
- **Varrimento das 24 rotas, recruta:** as 24 linhas são idênticas byte a byte às da medição «antes» (`cmp`), que por sua vez reproduziu `docs/verification/m01-runtime/difficulty-0535-2026-10-19/DIFFICULTY_SWEEP_24_ROUTES.jsonl` (de onde sai o «antes» da secção 3.2).
- **Golden da emenda 12, verificação** (`node tools/verification/m01-integration-golden-audit.mjs --amendment 12`, exigida «sem alterações»): `check: identical`. A emenda 12 é agora história: a ferramenta extrai por git a simulação de `efb8eb00` (`after:'efb8eb00…'`) e volta a provar a sua cadeia desde `a59c129`, de modo que a prova não depende dos ficheiros vivos; na candidata sem estas alterações a mesma verificação também deu `check: identical`.
- **Golden da emenda 13** (`M01-H9-D3-D4-DEATH-V1`, `identical`, como a 09): a auditoria passo a passo da simulação viva contra `efb8eb00` nas duas rotas do golden (semente 19390901 sem apoio e semente 7 com apoio, ambas em recruta) não encontrou **nenhum tick diferente**: 23 746 e 21 660 ticks, 47 e 43 blocos de digest todos iguais ao golden da emenda 12, fim da missão igual (1187,3 s e 1083 s reais); nas quatro rotas extra (sementes 3 e 7, com e sem apoio) 0 colisões de navegação, 0 homens sobrepostos, mesmos objetivos, checkpoints, eventos consumidos, relógio final e sobreviventes. O fixture novo `tests/fixtures/m01-difficulty-d3-d4-gameplay-baseline.json` e a conta `GOLDEN_AMENDMENT_13.json` foram escritos só pela ferramenta; o que a emenda move é o fecho da fonte (`m01-simulation.js`) e as entradas (`m01-difficulty.js`, `mission.json`, `m01-audio-events.js`), não um tick.
- **`tests/m01-animation-contract.test.js`**: o digest de cada tick das duas rotas contra o golden vivo (agora o da emenda 13) e a cadeia 09–13; a emenda 12 passou a ser testada como história (fixa a fonte de `efb8eb00` e prova que já não é a viva), com comentários datados nas duas asserções que já não podem comparar `mission.json` e `m01-difficulty.js` com os ficheiros vivos.

## 5. Testes executados

Tudo na árvore final (a fonte, a tabela e `mission.json` estão congelados desde o commit WIP `ac7ef84b`; depois só mudaram testes, o fixture da emenda 13, a evidência e a documentação).

| Verificação | Comando | Resultado |
|---|---|---|
| Testes da dificuldade (guardar, ligar, interface) | `node --test tests/m01-difficulty-save.test.js tests/m01-difficulty-wiring.test.js tests/m01-difficulty-ui.test.js` | 22 de 22 |
| Morte, CP-B2, nível mais baixo | `node --test tests/m01-difficulty-death.test.js` | 9 de 9 (depois de corrigir uma expectativa antiga do próprio teste: o início da fase de retenção passou a ser o CP-C) |
| Lote de testes provavelmente afetados | `node --test` em `m01-tczew-data`, `game`, `m01-hud-presentation`, `m01-audio-director`, `m01-simulation-boundary`, `audio-core`, `m01-cover-threat` | 112 de 112 |
| Construção | `npm run build` | sem erros (o aviso de tamanho do chunk já existia) |
| Golden da emenda 12 (história) | `node tools/verification/m01-integration-golden-audit.mjs --amendment 12` | `check: identical` |
| Golden da emenda 13 | `… --amendment 13 --write` | escrito; 2 rotas sem nenhum tick diferente, 4 rotas extra iguais (secção 4) |
| **Suite unitária completa** | `node --test` sobre os 156 `tests/*.test.js` (um processo por ficheiro, para poder retomar: a máquina reiniciou duas vezes durante a sessão e o limite de 2 h de uma tarefa de fundo cortou duas execuções inteiras) | **156 ficheiros, 1483 testes, 1483 passam, 0 falham**; inclui `m01-animation-contract` 31/31 e `m01-deck-assault` 12/12 |
| Página | `CI=1 CHROME_EXECUTABLE=/opt/pw-browsers/chromium npx playwright test` (config de cópia na porta 4193, removida depois) `tests/browser/m01-difficulty-ui.spec.js` | **4 de 4** numa só execução (3,7 min) |

Notas: (1) com a máquina muito carregada (média de carga 25–30) o primeiro teste de página excedeu uma vez os 180 s do seu limite e passou ao repetir-se; a execução final, com a máquina mais livre, passou os quatro de seguida. (2) Testes existentes alterados, todos por causa de decisões do
proprietário de 2026-10-22 e com comentário datado: `tests/m01-deck-assault.test.js` (o soldado já mata o piloto parado), `tests/m01-difficulty-save.test.js` (a tabela e o veterano sem regeneração), `tests/m01-runtime.test.js` (os ids de checkpoint que se aplicam ao nível, porque o CP-B2 só existe acima de recruta) e
`tests/m01-animation-contract.test.js` (emenda 13 e a emenda 12 como história). Nenhuma asserção foi enfraquecida nem removida sem substituta, e nenhum golden foi editado à mão.

## 6. Incertezas e o que fica por decidir

1. **A tabela é muito mais dura do que a da D2 para quem fica parado, e o soldado é o nível por defeito dos jogos novos.** As barras só se cumprem com ferida certa quando uma bala acerta num
   homem no aberto (1,00; a D2 tinha .45 no soldado e .80 no veterano), pontaria × 0,35 e cadência × 0,50 (D2: .85 / .90 no soldado). **Não houve playtest humano:** as barras medem um jogador
   **parado**; quem se mexe, usa a cobertura e responde ao fogo não foi medido, e é isso que decide se o jogo é «difícil mas justo» ou apenas duro. Se for demasiado duro, as alavancas são a tabela
   (`src/game/m01-difficulty.js`, com os valores da D2 e da D35 em comentário) e o nível por defeito (`M01_DIFFICULTY_NEW_GAME`): decisão do proprietário.
2. **Leitura agrupada das barras.** O desenho define o cenário «exposto» sobre o reparo e a retenção; li a mediana sobre as 24 corridas. Soldado cumpre fase a fase e agrupado; **o veterano só cumpre
   agrupado** (reparo 6,3 s, retenção 14,55 s). Se o proprietário quiser a banda 8–12 s em cada fase, é preciso uma alavanca que separe as fases (p. ex. a parte da de_east_0 no reparo), o que
   não está na tabela D35 e não foi feito.
3. **Os pilotos de teste não sobrevivem a soldado nem a veterano** (controlo: 12 de 12 morrem em ambos; apoio: 7 de 12 em soldado e 12 de 12 em veterano). O desenho previa-o («o piloto de rota não deve
   sobreviver; os testes de rota completa ficam em recruta»). `tests/m01-deck-assault.test.js` assumia que o soldado levava o piloto de controlo vivo ao fim e foi atualizado com comentário datado; não
   removi mais nenhuma asserção.
4. **Reação do soldado 1,5 s → 1,2 s** (a D35 e a D2 diziam 1,5 s): com 1,5 s a mediana agrupada passava a barra de 25 s no replay das colisões gravadas. O veterano mantém 0,8 s.
5. **Método.** A tabela foi procurada com um replay offline das colisões gravadas (scratch, fora do repositório: serve só para escolher candidatos sem voltar a simular) e depois **confirmada pelas
   corridas reais** desta pasta; as medianas reais coincidiram com as previstas (17,65 s, 9,9 s, mínimo coberto 103,75 s).
6. **A pausa de morte e a oferta só foram vistas em Chromium sem GPU** (GL por software, quadros de vários segundos sob carga). A pausa corre em tempo real e o teste de página usa um amostrador de 50 ms,
   por isso não depende da cadência, mas a sensação num GPU real não foi vista. Com a máquina muito carregada, um dos quatro testes de página (o primeiro, que inicia o jogo três vezes) excedeu os
   180 s do seu limite numa execução e passou (2,1 min) quando repetido sozinho; a execução final, com a máquina mais livre, passou os quatro de seguida.
7. **F4** (sem ferida letal numa cena) está provada por teste unitário e pelo teste de 12 sementes sob letalidade máxima; nos varrimentos de perigo nenhuma das 53 mortes calhou numa cena, por isso o
   varrimento não a exercita.
8. **Numeração do golden.** Esta entrega usa a emenda **13** (`M01-H9-D3-D4-DEATH-V1`, predecessor `efb8eb00`, cadeia para o golden da emenda 12). Outros trabalhadores em paralelo definem as emendas 13
   (`M01-CKM-JAM-V1`) e 14 (`M01-SP08-ESCORT-COORDINATION-V1`) com predecessor `4e2588fa`. Todas mexem em `m01-simulation.js`, logo ao integrar o Capitão tem de renumerar e **regenerar** os
   goldens sobre a árvore combinada (o fecho da cadeia da fonte muda), e escolher a ordem.
9. **Fora do âmbito, texto desatualizado (não tocado):** `DEVELOPMENT_STATUS.md` (secção da dificuldade D2: calibração, «D3/D4 faltam»), `handoff-cod-guerra-m01.md` linha 184 (a pergunta sobre a
   regeneração do veterano, agora decidida), `docs/direction/COD_WAW_WWII_BENCHMARK.md` e `docs/direction/M01_INTEGRATION_LEDGER.md`.

## 7. Ficheiros desta pasta

| Ficheiro | Conteúdo |
|---|---|
| `README.md` | este documento |
| `DANGER_SWEEP_AFTER_RECRUTA.jsonl`, `…_SOLDADO.jsonl`, `…_VETERANO.jsonl` | uma linha JSON por corrida (48 por nível) do varrimento de perigo com a tabela recalibrada |
| `DANGER_SWEEP_BEFORE_D2_RECRUTA.jsonl`, `…_SOLDADO.jsonl`, `…_VETERANO.jsonl` | o mesmo varrimento (mesmo auxiliar, mesmos cenários) sobre `efb8eb00`, tabela da D2; o de recruta é **idêntico byte a byte** ao `AFTER` |
| `DANGER_SWEEP_SUMMARY_AFTER.json`, `…_BEFORE_D2.json` | resumos por cenário e nível, veredictos agrupados e F1, como saem da ferramenta |
| `DIFFICULTY_SWEEP_24_ROUTES_AFTER.jsonl`, `DIFFICULTY_SWEEP_SUMMARY_AFTER.json` | as 24 rotas × 3 níveis com a tabela recalibrada. O «antes» é `docs/verification/m01-runtime/difficulty-0535-2026-10-19/DIFFICULTY_SWEEP_24_ROUTES.jsonl`: a medição «antes» desta entrega reproduziu-o byte a byte |
| `GOLDEN_AMENDMENT_13.json` | conta da auditoria de passo-a-passo da emenda 13 (escrita só pela ferramenta; nunca à mão) |
| `GOLDEN_RUNS.txt` | saída das execuções da ferramenta: emenda 13 (`--write`) e emenda 12 (verificação) |

Reproduzir (da raiz do repositório; os varrimentos são deterministas, sem relógios nem caminhos):

```
node tools/verification/m01-danger-sweep.mjs --jsonl <ficheiro>          # barras da secção 6 e F1: 3 níveis × 4 cenários × 12 sementes
node tools/verification/m01-difficulty-sweep.mjs --jsonl <ficheiro>       # as 24 rotas dos pilotos por nível
node tools/verification/m01-integration-golden-audit.mjs --amendment 13   # verificação (acrescentar --write para escrever)
node tools/verification/m01-integration-golden-audit.mjs --amendment 12   # a emenda 12 como história, por git
```
