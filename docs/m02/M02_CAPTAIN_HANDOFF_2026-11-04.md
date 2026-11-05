# M02 «Operação Bzura»: handoff do Capitão M02 (2026-11-04)

Estado: **CHECKPOINT INTERCALAR n.º 2** (≈ 21:50 UTC). Desde as 21:01 UTC trabalha-se com **1 agente de cada vez**, por
pedido do proprietário. Este ficheiro é atualizado no fim da sessão.

Veredito: a M02 continua `PLANEJADA` e é uma **bancada isolada, INTEGRADA SEM VALIDAÇÃO DE JOGO**. Nenhum portão
(N0, N1, N6) está aprovado. Não há FPS medido. Os testes de estado não são playtest.

## 1. Base e ramo

- Branch: `claude/elegant-wright-m9l1ws`, criada a partir de `origin/claude/dreamy-ramanujan-6v62vr` @ `03387a31`.
- Push só para esta branch. Sem merge na `main` nem na #80, sem deploy, sem force-push, sem PR.
- Integração na linha da M01: cabe ao Capitão M01, com `merge --no-ff` desta branch.
- Ficheiros da M01: `git diff 03387a3..HEAD -- src/game/m01-* src/render/m01-* src/world/m01-* src/game/game.js src/main.js missions/m01-tczew` está **vazio**.

## 2. Feito e integrado nesta branch (commit e push)

| Passo | Commit(s) | Conteúdo | Prova |
|---|---|---|---|
| 0 Auditorias N, O, P, Q | `b8f78db`, `be954d9`, `625bde0` | `docs/m02/auditoria-2026-11-04/{N,O,P,Q}.md`. P inclui A pp. 5–7 | Leitura estática, sem medições |
| FIX-1 História/equipamento | `5eb85d9` (merge `65ce341`) | Ver lista abaixo | `tests/m02-07-history-text-guard.test.js` |
| FIX-3 Handoff honesto | `5c99744` (cherry-pick de `ac1f2d1`) | Ver lista abaixo | Revisão do Capitão |
| K Texto | `465cd30` (cherry-pick de `bd6a452`) | Ver lista abaixo | `tests/m02-08-dialogue-k.test.js` |
| TIME-01 Sol | `9177808` (merge `1ed037b`), `ba7d06e` | `tools/m02/solar-noaa.mjs` com teste e nota `docs/m02/research/TIME-01-solar.md`. BZ-C02 com as duas definições | `tests/m02-10-solar-time01.test.js`, mais verificação independente do Capitão |
| EQP-01 Pesquisa | `8f5cc55` | `docs/m02/research/EQP-01.md`. É PROPOSTA; nenhuma afirmação acima de PROVÁVEL, porque só se leram resumos | — |
| Testes reforçados | `9f5f44e` (merge `adcd1cd`) | Ver lista abaixo | Suites m02-01…06 |

**FIX-1:**
- «56.º Regimento / 25.ª DI», «56 pp» e «Mensageiro 56 pp» retirados do ecrã e dos dados (DEC-02 pendente).
- Os fuzileiros alemães passam de MP38 a `kar98k`. MG34 e Kar98k ficam com `equipmentStatus:'PROPOSTA_EQP01'`.
- Título do objetivo C12 sem data. A cartela «Varsóvia — 25 de setembro» mantém-se, porque o PDF a tem (C6 p. 15, I1 p. 33).
- As 7 macieiras ficam com `status:'candidata'`. «46» só como total planeado de D2.
- `research/SOURCES.md` passa a ter BZ-H01…H14 (estado: «registada no pacote; conteúdo não guardado») e BZ-C02.

**FIX-3** (matriz de `docs/m02/M02_HANDOFF.md`):
- PERF-01 e PERF-02: NÃO MEDIDO.
- HIST-TEST-01/02: HUMANO.
- REG-01: PENDENTE.
- «PASS (100 %)» passa a «teste de estado verde (não é aceitação)».
- Assinalado que `K-PERSONAGENS-DIALOGOS.md` não existe.

**K (texto):**
- `bz39_c01_02` (Małek) e `bz39_c01_03` (Lis): a segunda exige a primeira e cala-se em combate.
- Condição K2 «olhar livre» e «sem ordem crítica pendente» aplicada a `dlg_m02_001`.
- Nowak, Kowalski e LG01–LG12 com `sourceStatus:'fora_do_pdf'`.
- `bz39_c01_01` e `bz39_c04_05` **já eram literais** (K3 p. 39). A auditoria K.md tinha falsos positivos e ficou anotada.

**Testes reforçados:**
- As asserções de AI-02 ficam incondicionais, e há um AI-02 novo por som.
- O3 passa a determinismo real: 3 sementes × 2 execuções × 1800 ticks, comparando o snapshot a cada 60 ticks.
- Os ciclos vazios passam a exigir comprimento.

**Depois do checkpoint n.º 1 (21:01 UTC):**

| Passo | Commit(s) | Conteúdo |
|---|---|---|
| FIX-2 Saves | merge `023734d` (de `270cd44`, `32a933b`, `d8648f4`), `58e7976` | Snapshot v2 com semente e estado do RNG, granadas em voo, fechaduras de portas, registos, data narrativa e versão de layout. Restauro em fases. `src/game/m02-save-store.js` grava com staging e `previous`. Proposta de envelope em `docs/m02/M02_SAVE_ENVELOPE_PROPOSAL.md` (D-M02-4). Os 2 testes `todo` independentes passaram a obrigatórios e passam |
| Higiene de testes (passo 1) | `e74c952` | O `playwright.config.js` principal ignora `m02-*.spec.js` (a lista dá 219 testes em 62 ficheiros, 0 da M02). Os artefactos vão para `test-results/`. O servidor é reutilizado fora do CI |
| Cabeçalho da bancada, SN3/SN4 | `5fee9ee` | O cabeçalho deixa de dizer «Missão M02 Completa» e «Bancada de produção» e diz bancada isolada, não validada, 9–10 Set. Kwiatkówek–Tum fica só como referência tipológica. SN3 passa a (-23,-12) e SN4 a (8,-28), do PDF N; os dois pontos estão fora de B01 e B02 |
| N0 capturas (passo 10) | `e74c952`, `d3c3af0`, `dbb4436` | Ver lista abaixo |

**N0 capturas:**
- `tests/browser/m02-n0-captures.spec.js` gera 30 conjuntos: SN1–SN5 × 2 luzes × 3 perfis. Cada conjunto tem **4 direções**, porque o PDF N define os SN como pontos de revisão 360°. O total é de 120 PNG, gravados em `test-results/m02-artifacts/n0/` com o manifesto v2.
- O HUD fica escondido nas capturas. Antes, as capturas passavam 30/30 só porque o HUD dava variação à imagem.
- O limiar de imagem uniforme foi calibrado com imagens observadas.

**Revisão adversarial independente do FIX-2: REJEITADO.** A revisão foi só de leitura, com scripts de prova em
`scratchpad/review/`. Defeitos confirmados por execução:
- **P0:** x/z ficam NaN nas Áreas B e C. A causa está em `m02-zone-streamer.js:176-177` (`bounds` em array espalhado num objeto) e dispara em `clampToMap` da M01. Por isso o cp_c e o cp_d nunca persistem.
- **P1:**
  - os checkpoints automáticos são gravados a meio do `tick()`, e o restauro não reproduz a continuação;
  - uma granada que mata o último defensor deixa um snapshot inválido no índice;
  - recarregar a página apaga o save bom (o construtor chama `reset()`, que grava o cp_a), e o F9 só lê a memória.
- **P2:**
  - a loja reconstrói a partir de `previous` quando `current` é ilegível (perde checkpoints) e não tem compare-and-swap entre separadores;
  - o validador aceita enums inválidos e um `weapon.profile` com damage 9999 vindo do save;
  - a acessibilidade e a data narrativa estão misturadas no save, e `m02.completed=true` é posto na Área A;
  - `saveCheckpoint`/`restoreCheckpoint` devolvem referências partilhadas.
- **Sem defeito, testado:** snapshots entre ticks nos 4 modos de restauro, nas Áreas A, B (com o limite corrigido em memória) e C.

**FIX-2b** está integrado: merge `318b265`, commits `763310e`…`371582e`. Depois dele:
- `tests/m02-*.test.js` dá **100/100**, com 24 testes novos em `tests/m02-12-save-hardening.test.js`.
- O build passa.
- O browser M02 dá **2 passed (2,6 min)**, com N0 30/30.

**Verificação adversarial independente do FIX-2b: ACEITE COM RESSALVAS.** Nenhum dos 8 defeitos originais se
reproduz e não há P0 nem P1.
- **Sem defeito:**
  - 102 696 validações do estado vivo em A/B/C, até C12 com os três `lis_status`, sem nenhuma rejeição;
  - fuzz de restauro em A e C: 72/72 iguais.
- **P2 confirmados**, todos encaminhados para o FIX-2c (agente único, EM CURSO):
  - dois checkpoints automáticos no mesmo tick;
  - checkpoint gravado a meio das ações compostas C11/C12 (KeyM e botão);
  - -0 que chega a `atan2` (caso construído);
  - a loja fica sem saída quando `current` está ilegível, sem aviso nem `clear()` na UI;
  - o F9 ignora um save manual compatível quando o último checkpoint é incompatível.

**FIX-2c, integrado em `605e3fc`:**
- Lote de checkpoints no mesmo tick.
- `sim.runAtomicAction()` nas ações compostas de C07 a C12.
- Sem -0 na memória dos inimigos nem no `atan2`.
- `M02SaveStore.status()`, `sim.clearPersistedSaves()`, aviso `#hud-save-warning` e botão «Limpar saves da bancada», que só aparece quando a loja está bloqueada e pede confirmação.
- O F9 salta entradas incompatíveis.

Testes depois do FIX-2c: `tests/m02-*.test.js` **122/122**; build OK; browser M02 **2 passed (3,3 min)**, N0 30/30.
O botão novo da bancada só foi verificado por inspeção e por teste estático.

Fica conhecida uma janela residual de compare-and-swap entre separadores: o `localStorage` não tem escrita atómica.

**Roteiro C e set pieces, integrado em `07999a4`. Testes: `tests/m02-*.test.js` 204/204; build OK.**

O que mudou:
- **Progressão automática C01→C12 por condições de jogo.** As teclas de bancada ficam só como atalhos.
  - Teste de missão completa por entradas (`MissionBot`, 3 sementes, determinista). Um guard confirma que não usa atalhos.
  - Tempo simulado até ao C12: 636,9 / 786,9 / 694,6 s (≈ 10,6–13,1 min). É só referência e não é playtest; fica **muito abaixo do alvo editorial de 29–34 min**.
- **C02:** o EA0 começa sem alerta. O contacto é sorteado pelo RNG entre 30 e 60 s depois de o jogador começar a avançar (10 sementes testadas).
  - `bz39_c01_03` pode tocar antes do contacto.
  - O acesso P1 (z=-175 → -100) era impossível de percorrer e passou a ter `bounds.c01Approach`.
- **Carroça:** o tiro parte o varal (`shaft_broken`). Há `parked_fallback` explícito e rota conforme a p. 21. [E] apanha um volume largado.
- **Lis:** entra com velocidade limitada por tick, sem teletransporte.
  - `lis_status` passa a vir do estado de jogo e fica `missing` quando o Piotr termina sem o Lis.
  - A tecla KeyM mantém o valor forçado, marcado `lisOutcomeSource:'forced'`.
- **Último grupo LG01–LG12:** só conta como evacuado quando chega a (-85,105).
- **Mapa:** evacuação pela porta norte de B09 (-30,-20).
  - B05–B12 já estavam conformes com o PDF p. 20; o erro era do handoff da Gemini.
  - O layout B/C passa a `m02-cells-bc-layout-v2`, e os saves B/C v1 são recusados com o motivo explícito.
- **B08:** `doorsDecision.decision:'pendente'`.
- **B12:** as macas vêm só do layout.

**Decisões do agente a rever:**
- Interpretação do «fallback parada».
- Tempos mínimos de cena: C05 45 s, C07 60 s, C08 60 s, C12 45 s (leitura da p. 12).
- Lis «walking» ou «carried» com limiar de vida 40, que é **inventado**.
- O Lis só se move com o Piotr a ≤ 7 m.

**Observado e não corrigido:**
- O EC2 rende-se no 1.º tick do C10 (regra de moral) → encaminhado para o Combate D.
- Uma corrida ao EA0 não é alvejada antes do temporizador → encaminhado para o Combate D.
- Os aliados não transportam volumes à mão.
- A entrada do Lis não pára sob fogo.
- As portas de B12 têm 1,6 m, contra 1,4 m no PDF.

**Combate D, integrado em `edc51ad`. Testes: `tests/m02-*.test.js` 293/293 (169 s); build OK. A secção D do PDF está nas pp. 16–18.**

O que mudou:
- **Falha da missão:** `missionFailed` quando o Piotr morre. Pára o roteiro e todas as gravações. O reinício é explícito, a partir do último checkpoint compatível (painel ou F9).
- **Explosões:** cada explosão perigosa tem `hazardBlasts` com aviso de 5–8 s e posição fixa; o validador exige o intervalo [5,8].
  - A IA alemã não lança granadas, porque o PDF não o prevê; existe só a API `throwEnemyGrenade`.
  - O evento `blast-warning` **ainda não é consumido** pelo audiovisual.
- **Dificuldade:** `src/game/m02-difficulty.js` com os IDs e multiplicadores importados de `m01-difficulty.js`.
  - Impactos de Kar98k até matar: recruta 7, soldado 3, veterano 2.
  - **Alerta:** os mesmos multiplicadores não dão a mesma letalidade que na M01, porque o ciclo da Kar98k é 1,55 s na M02 contra 9–18 s na M01.
  - Em soldado e veterano, o MissionBot morre em 2 de 3 sementes. **É preciso calibrar com playtest humano.**
  - A dificuldade é configuração e fica fora do snapshot. A bancada não tem seletor.
- **Ordens:** só «cobrir» e «avançar», e só na Área A, que é a única com nós de cobertura. «Suprimir», «flanquear» e as teclas Z/X/B antigas foram retiradas. O efeito causal D4 mantém-se e foi testado com 3 sementes.
- **Moral por grupo de encontro (D3):** o EC2 já não se rende no 1.º tick do C10.
- **Contacto C02 por proximidade:** abre a 25 m; o valor é **escolha do agente**, porque o PDF não o fixa. Com avanço prudente mantém-se em [30,60) s.

**Ajustes de testes a vigiar:**
- No m02-09, a semente 19390913 passou a 19390917, porque o piloto do pomar morria (está na revisão).
- No m02-13, o EA0 é rendido explicitamente.

**Pendentes:**
- 2.ª falha dura de D1 (incapacidade de personagem).
- `hpOnCheckpoint`: há risco de espiral de morte.
- Alternância apoio/deslocação.
- Ordens nas Áreas B e C.

**Revisão adversarial independente do roteiro C e do combate D, em `edc51ad`: REJEITADO.**

**P1:**
- O validador recusa instantes que a própria simulação escreve: `toFixed(3)` arredonda para cima. Com dt de 1/60, perdem-se o cp_c e o cp_d em cerca de 50 % das corridas.
- O SP03 nunca fere ninguém: o entulho é criado antes da detonação e oclui todos os raios.

**P2:**
- Um checkpoint pode ser gravado com o Piotr morto, o que leva a um ciclo de reinício.
- Há risco de espiral de morte, porque os gatilhos de cp_a e cp_d não seguem I3 pp. 33–34.
- A graça F1 depende do dt.
- A dificuldade fica fora do snapshot, ao contrário da M01.
- O C06 fica sem saída se a carroça parar.
- Um tiro antes de andar deixa a secção parada.
- Desvios do PDF:
  - os LG são invulneráveis;
  - as ordens só funcionam na Área A;
  - o EA0 não tem moral;
  - `lis_status` fica 'active';
  - `essential` funciona como imunidade oculta.
- Há um spam de `checkpoint-rejected` depois da falha.
- Há duas asserções vazias.

**Sem defeito:**
- Todo o estado novo está no snapshot.
- O fuzz de restauro-continuação deu **491 réplicas e 0 divergências**: MissionBot em 8 corridas, 3 variantes de restauro e os 4 checkpoints automáticos.
- O fuzz de entradas aleatórias deu 96 réplicas e 0 divergências.

A troca de semente no m02-09 não esconde nenhum defeito.

**Suspeito:** com dt de 1/60, ou nos perfis soldado e veterano, o MissionBot fica preso no C03 por causa da moral do EA1.

**FIX-CD, integrado em `da599c7`. Testes:**
- `tests/m02-*.test.js`: **319/319** (197 s).
- Build OK.
- Browser M02: **2 passed (3,1 min)**, N0 30/30.
- Os ficheiros da M01 não mudaram.

**Correções, com a prova antes → depois:**
- Instantes da simulação arredondados para baixo (`instantAt`): cp_c e cp_d perdidos passam de 20/40 a 0/40; Digit0 passa de 10/30 a 0/30.
- O SP03 passa a ferir: dano de 60 → 8 conforme a distância.
- Já não se grava nenhum checkpoint com o Piotr morto. KeyM é recusado depois da falha, e há 0 spam.
- cp_a passa a ser gravado no 1.º avanço antes do contacto, e cp_d no 1.º momento abrigado entre C10 e C12 (I3 pp. 33–34).
  - O reinício passa a usar o checkpoint mais recente.
  - Espiral de morte: veterano 31337 passa de 7/36 a 36/36 sobrevivências.
- A graça F1 deixa de depender do dt, e a dificuldade entra no snapshot como na M01.
- C06: os volumes passam a LOST depois de 60 s sem portador e sem hostis. O prazo de 60 s é **escolha do agente**.
- `lis_status` fica nulo durante a missão.
- Defeito real encontrado pelo bot a 1/60: os aliados batiam na parede antes de uma porta fechada. Passam a ir primeiro à porta.
- Teste de missão completa a dt 1/60 em recruta.

**Pendentes do FIX-CD:**
- **Spawn sob fogo no C06:** em soldado e veterano, a dt 1/60, o Piotr morre 2 s depois de entrar, em (0,85), à vista do EB1.
- O entulho do SP03 pode aparecer em cima do Piotr.
- Se o Piotr nunca se abrigar, o cp_d não é gravado e o reinício cai no cp_c.
- A moral do EA0 (D2: recuo para oeste) não está feita.
- LG vulneráveis, ordens nas Áreas B e C e `essential`: não feitos, ficam por decidir.

**Verificação independente do FIX-CD, em `da599c7`: REJEITADO.** Os P1 estão corrigidos.

**Sem defeito:**
- 7 missões completas a 1/60, 1/144, 1/30 e com jitter: 0 checkpoints recusados e 0 checkpoints com o Piotr morto.
- Fuzz de restauro: **292 réplicas e 0 divergências**.

**P2 que continuam a reproduzir:**
- A graça F1 ainda depende do dt: o disparo seguinte é agendado a partir do relógio do tick.
- Um KeyM que mata o Piotr conclui a missão e exporta `completed:true`.

**P3:**
- O abrigo do cp_d ignora as granadas do próprio jogador.
- O cp_a não chega à loja no arranque por omissão da bancada; o reinício para o início em memória é equivalente.

**Suspeitos:**
- Portas sem limite de distância: o Lis andou 61 m até outra porta.
- `setDifficulty` perde-se no reinício para o início.

**Problema anterior, pendente de desenho:** com o Piotr parado em P1, a secção toma a quinta sozinha aos 72–86 s em 10/10 sementes. Contraria a D4 («autonomia não é vitória garantida»).

**Regra de jogo nova, introduzida pelo FIX-2b e a aprovar pelo proprietário:** quando o portador de um volume
morre, o volume fica no chão (`DROPPED_READY`). Evita que haja saves com `carriedBy` a apontar para um ator
morto. Não estava no pedido e o PDF não foi confirmado sobre isto.

**Testes corridos (checkout principal):**
- `node --test --test-concurrency=1 tests/m02-*.test.js` em `58e7976`: **76/76 pass, 0 fail, 0 todo**. Em `465cd30` eram 54 pass e 2 todo.
- `node --test tests/m01-tczew-data.test.js`: 14/14.
- `npm run build`: passa. `dist/` só tem `index.html`; o build principal não muda.
- Browser M02: `CHROME_EXECUTABLE=/opt/pw-browsers/chromium PORT=4391 npx playwright test -c tools/m02/playwright-m02-01.config.js` → **2 passed (2,4 min)** em SwiftShader, com o spec antigo e o N0. Prova N0 automática: **30/30 conjuntos**, 120 PNG, todos no ponto do PDF (desvio 0 m), 0 erros de consola. Árvore de trabalho = `dbb4436`.
- Isto **não aprova o N0**. Continuam pendentes:
  - a leitura humana das 120 imagens;
  - a oclusão;
  - os interiores;
  - o vídeo das duas rotas;
  - a planta com escala e a tabela de vãos (o patch WIP `n0-plan` está incompleto).
  - Além disso, as luzes usadas são os presets atuais, que estão errados segundo o TIME-01.
- **Não corrido:** `npm test` completo.

## 3. Em curso, interrompido ou por começar

| Trabalho | Estado | Onde está |
|---|---|---|
| FIX-2b defeitos da revisão adversarial | **Integrado** (`318b265`); verificação independente: ACEITE COM RESSALVAS | — |
| FIX-2c P2 residuais dos saves | **Integrado**: merge `605e3fc` (`fe05c21`…`1bac72d`) | Ver lista abaixo |
| 6–7 Roteiro C e set pieces J/E/F | **Integrado**: merge `07999a4` (`bb0cbf4`…`85dea7a`) | Ver lista abaixo |
| 8 Combate D | **Integrado**: merge `edc51ad` (`4cedca2`…`46b59de`) | Ver lista abaixo |
| Revisão adversarial do roteiro C e do combate D | **REJEITADO**, 2 P1 (ver abaixo) | Só leitura; provas em `scratchpad/review-cd/` |
| FIX-CD correções da revisão | **Integrado**: merge `da599c7` (`fd66640`…`ef3b49e`) | Ver lista abaixo |
| Verificação independente do FIX-CD | **REJEITADO**: P1 corrigidos, mas 2 P2 continuam a reproduzir (ver abaixo) | Só leitura; `scratchpad/review-cd-verify/` |
| FIX-CD2 resíduos P2/P3 | **EM CURSO**: é o único agente ativo | worktree `m02-fix-cd2`, base `da599c7` |
| 1 Higiene de testes e N0 (30 capturas) | **Aplicado e corrigido** (`e74c952`, `d3c3af0`, `dbb4436`); o patch fica só como histórico | — |
| N0 Planta e tabela de vãos | **Parado a meio**, sem a planta SVG nem o teste | `docs/m02/wip/2026-11-04/n0-plan.patch` |
| 9 Ambiente G/H/L (reuso de `m01-area-*`, horizonte L3) | **Parado a meio**, não revisto | `docs/m02/wip/2026-11-04/env-GHL.patch`: `src/render/m02-environment.js`, `src/world/m02-environment-area.js`, horizonte |

Os patches em `docs/m02/wip/` são trabalho parcial de agentes interrompidos. **Não foram aplicados nem revistos.**
Ou se reaplicam com `git apply --3way` e se terminam, ou se apagam.

## 4. Achados novos que exigem ação

- **TIME-01 corrigido:**
  - O ocaso de 9/9 é ≈ **18:14** e o nascer de 10/9 ≈ **05:08**, pela definição padrão NOAA (zénite 90,833°).
  - 18:09 e 05:13 eram o centro geométrico do disco (zénite 90°).
  - Confirmado com uma implementação independente. Os dois pares estão registados no BZ-C02.
- **Presets de luz da bancada errados** face ao cálculo (`docs/m02/research/TIME-01-solar.md`):
  - T0: o sol está 15–24° alto.
  - T2: o azimute está errado em 38° (ENE em vez de SE).
  - T3: a elevação está +11,6°.
  - T1 noite: usa um «sol» acima do horizonte.
- **C02:** os 4 hostis do EA0 veem o Piotr no tick 0. O primeiro contacto acontece em < 15 s, contra os 30–60 s do PDF (vai para o passo 6).
- ~~«Kwiatkówek–Tum» como local~~ **corrigido** em `5fee9ee`: passa a ser referência tipológica (GEO-01).
- ~~SN3/SN4 desviados do PDF~~ **corrigido** em `5fee9ee`.
- **Lis no C11:** reaparece em (-28,-22) por teleporte (`m02-acts-director.js`), o que Q2 proíbe (passo 7).
- **EQP-01:** a pesquisa não conseguiu ler as páginas completas, porque havia DNS bloqueado na sessão.

## 5. Decisões pendentes do proprietário (D-M02-1…7, `docs/direction/M02_BZURA_DESIGN.md` §6)

| ID | Decisão | Estado nesta branch |
|---|---|---|
| D-M02-1 | Aceitar a fusão isolada da bancada (M02-INT-1) | Fusão feita na linha (`426045ee`) como INTEGRADA SEM VALIDAÇÃO DE JOGO. **Falta a ratificação.** |
| D-M02-2 (DEC-01) | Cronologia sem recuo geral; «cobertura da retirada» com sentido local | Texto conforme. Pendente |
| D-M02-3 (DEC-02) | 56.º pp como enquadramento | **Retirado do ecrã** até haver decisão (FIX-1) |
| D-M02-4 (DEC-07) | Envelope de save comum com o condutor de atos da M01 | Proposta em preparação no FIX-2 (`docs/m02/M02_SAVE_ENVELOPE_PROPOSAL.md`). `m01-acts.js` não é alterado |
| D-M02-5 (DEC-03/04/05/06) | Três células; clímax local em Leśmierz; rota do pomar mais longa; CP final em C10 | Pendente. A rota do pomar ainda não foi medida |
| D-M02-6 | Elenco: Gruca, Wierzba, Małek, Szymczak; «Małek» vs «Malec» (M05) | Pendente |
| D-M02-7 | A bancada pode avançar antes da aprovação da M01, sem promover o estado | Pendente |

Outras decisões: as portas de B08 (F), EQP-01 (validação das armas) e a regra `DROPPED_READY` (volume largado quando o portador morre).
