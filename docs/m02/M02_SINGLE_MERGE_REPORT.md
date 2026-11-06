# M02 — merge único Claude × Codex (2026-11-06)

Pedido do proprietário: «não façam 2 M02 diferentes, tem que ser 1». A linha Codex foi integrada na linha Claude
(`claude/elegant-wright-m9l1ws` @ `2810dcbc`) na branch local **`m02-single`**, com `git merge --no-ff`. Não houve rebase,
squash, reescrita de commits, push nem merge na `main`. O PDF `docs/m02/preproducao/M02-BZURA-PRE-PRODUCAO.pdf` é a fonte. O Codex
usa o mesmo objeto em `docs/m02/referencias/astra/`.

| Passo | Origem | Commit de merge |
|---|---|---|
| 1 | `origin/codex/m02-integracao-unica` (`c8995f53`, 2 commits) | `18ce2c36` |
| 2 | `origin/codex/m02-recovery-v1` (`b0d14d4b`, 144 commits, base `56e98cbf`) | `46af6021` |
| 2b | Ajustes de testes, sementes e correções após o merge | ver `git log 46af6021..m02-single` |

**Estado: integrado SEM validação de jogo.** Não houve playtest humano nem verificação no iPhone. Os testes de estado não são
playtest, e a experiência integrada não foi revista visualmente. O resultado dos testes está na secção 7.

## 1. Passo 1 — inspeção só de leitura dos saves v1 do Codex

Houve conflitos em dois ficheiros, e foram mantidos os dois lados.

- `src/game/m02-save-store.js` (cabeçalho):
  - Fica a nossa loja v2, com slots exatos e `detectForeignSaves()`.
  - Fica o aviso do Codex: houve v1 persistidos com `rngState` e nunca podem ser apagados nem sobrescritos.
  - O cabeçalho aponta para `m02-legacy-save-inspection.js`.
- `docs/m02/M02_SAVE_ENVELOPE_PROPOSAL.md`:
  - O §4.3 junta as duas afirmações.
  - O §8 lista `inspectCodexLegacySave` (Codex), uma segunda leitura só de leitura.
- O merge trouxe também, sem conflitos:
  - `src/game/m02-legacy-save-inspection.js` e o seu teste;
  - as referências Astra (PDF, masterplan, interiores, `COMPARACAO_INICIAL.md`);
  - `docs/m02/M02_INTEGRACAO_UNICA_2026-11-05.md`.
- Testes: 685/685 verdes antes do commit.

## 2. Um só gestor de save

- O snapshot v2, o validador estrito e `M02SaveStore` continuam a ser o **único** caminho de gravação.
- O estado novo do Codex entrou no NOSSO snapshot e no NOSSO validador. São campos aditivos, que ficam ausentes nos saves
  anteriores e são validados por `validateCodexAdditiveState` em `m02-01-simulation.js`, depois do validador estrito:
  - `playerGrenadeAction`: granada preparada, 0,5 s;
  - `playerWaterAction` e `m02.pomar_wounded_water`: água em C04;
  - `actor.burst`, `burstSequence` e `damageOnPlayer`: rajada pendente ronda a ronda, com o teto «uma ferida por rajada» a
    atravessar as rondas;
  - `m02BarnRetreat` e o estado `RETREAT_B02`;
  - `m02GrenadeThreat` e o estado `FLEE_GRENADE`;
  - `leftBehind`, `areaC.leftBehindIds` e `m02.last_group_unaccounted`: retirada antecipada;
  - `c04WaterOfferedAt`, `m02LastEngagedTargetId`, `hitAt`/`diedAt`/…, `effectiveSpeed`, `navCorners` e `releaseView` das granadas.
- `#prepareRestore`/`#activateRestore` repõem `playerGrenadeAction`/`playerWaterAction`. A ida e volta snapshot → restauro →
  snapshot fica igual, como mostra o teste smoke.
- `src/m02/m02-session.js` (menu/pausa/epílogo do Codex):
  - Foi reescrito para usar `sim.saveStore`. **Nunca grava `cod-guerra:checkpoint:m02:v1`.**
  - `M02_SAVE_KEY` passa a exportar a chave v2.
  - O teste `tests/m02-session.test.js` prova que a chave v1 continua `null`.
  - Os dados v1 existentes não são lidos como v2, escritos nem apagados. `tests/m02-25` e `m02-legacy-save-inspection` estão verdes.
- `m02.html` (segunda entrada do Codex, com a sua própria sessão) **foi retirada da árvore**. Continua no histórico do Codex.
  A M02 tem uma só entrada, `m02-01.html`. `RUNBOOK.md` foi anotado em conformidade.

## 3. Conflitos, ficheiro a ficheiro

| Ficheiro | Resolução |
|---|---|
| `src/game/m02-01-simulation.js` (26 blocos) | Ficou a nossa base: validador, ordens D4, socorro D1, falha da missão, D5, checkpoints em lote e restauro em fases. Do Codex entraram os prompts e as ações de água, a preparação/cancelamento/largada da granada, as rajadas ronda a ronda (`advanceActorBurst` com clearance aliada por ronda) e as marcas de impacto. O fogo pelos controlos passou a usar a dispersão M01 (`firePlayerWeapon(false)`). A granada abre o contacto C01/C06 no compromisso. A presença usa `m02ActorPresent`. O emissor `mg-burst` desta linha ficou, porque é testado (N0-2/L). O seu bug do Codex, disparar com a MG inativa, já está tapado pelo guarda do Codex em `evaluateMgLineOfFire`. |
| `src/game/m02-combat-ai.js` (16) | Imports do Codex. `lastGroupTargets` delega em `m02ExposedLastGroup`, uma só regra. Continuidade do diálogo (`resolveForCurrentState`) com o descarte K4. Velocidade de amparado e do último grupo. Reação a granadas, retirada pelo celeiro dentro da moral por grupo e lugares de preparação em P1. A pontaria ao **tronco** (nossa) fica para a secção e para os hostis: a cabeça visível do Codex fazia a secção tomar a quinta sozinha em 13 s e matava Piotr abrigado. Isso contradiz D4/D6, por isso `m02VisibleAimPoint` fica sem uso. O atraso fixo de reação do Codex não entra, porque a equidade é F1/D6. As ordens D4 ficam. A boca da MG vem da fonte única. |
| `src/game/m02-acts-director.js` (10) | Ficou o nosso percurso de Lis em C11 (J3) e C12. Do Codex entraram a guarda de desfecho já resolvido, `leftBehind` **só na retirada antecipada** (opção `earlyWithdrawal`) e `lastGroupUnaccountedCount` na exportação. Um homem `leftBehind` não continua a rota. O último grupo evacua com navegação física (Codex). |
| `src/m02/m02-01-main.js` (14) | Base nossa. Enxertos: F/«Água» dá água em C04 e F/«Recuar» faz a retirada com segunda confirmação (`M02RetreatConfirmation`). `[E]` contextual do Codex só para `rifle-ammo` e `assist-lis`; as transições são do nosso roteiro. Prompts de água, retirada e mãos ocupadas, estado da granada no HUD e desbloqueio do áudio M01. Para não haver dois sons, o placeholder só toca `blast_warning` e `door`. |
| `src/render/m02-01-renderer.js` (12) | Base nossa (TIME-01, ambiente L3, boca da MG, N0). Enxertos: `M02Presentation` do Codex (personagens GLB M01, arma em 1.ª pessoa, gestos de granada/água, áudio M01) e `M02Grenades`. Os bonecos de caixa escondem-se quando há personagem. Não ligados: `m02-architecture`, `m02-static-batching`, `m02-lighting` (classe), `m02-combat-fx`, a vegetação/terreno do Codex, `m02-farm-furniture`, `m02-aid-stretcher` e `m02-cargo-visuals`. Ficam no repositório, com os seus testes. |
| `src/render/m02-presentation.js` (add/add) | **Não eram a mesma coisa.** O módulo junta o `M02PresentationFeed` (nosso: legendas, indicadores, D5) e o `M02Presentation` (Codex). O cabeçalho explica a divisão. |
| `src/render/m02-environment.js` (add/add) | Ficou o nosso, que reutiliza `m01-area-*` (campo, árvores, L3; validado N0 a 360°). O ambiente do Codex (kit de vegetação + shader M01) não entra para não duplicar árvores e terreno. Pendente: enxertar `M01Atmosphere` (fumo). |
| `src/world/m02-quinta-world.js` e `m02-zone-streamer.js` | Ficaram os nossos: `withWalkableApproach` é a mesma funcionalidade do Codex, e os limites jogáveis também. **A trincheira física de P1/EA0 do Codex não entrou:** é geometria nova e exige layout v3, N0 regenerado e verificação visual. |
| `missions/m02-bzura/m02-01-quinta-layout.json` | Ficou a nossa geometria v2, incluindo a bancada da MG. Do Codex entraram só os `preparationSlots`, que são posições de atores. Os docs N0 gerados (`quinta-planta.svg`, `tabela-vaos.md`) só mudaram no SHA do layout. |
| `missions/m02-bzura/m02-cells-bc-layout.json` | Ficou o nosso. O spawn B do Codex (−50, 51) não entrou, porque quebrava a janela C06. |
| `src/m02/m02-touch-controls.js` | Ficou o nosso, testado em iPhone. Entraram os botões contextuais «Água» e «Recuar/Confirmar» do Codex (`setContextual`, CSS em `m02-01.html`). `m02-touch.js` do Codex fica sem uso. |
| `m02-01.html` | Ficou o nosso título honesto («bancada… NÃO validada»), mais o ícone do Codex. |
| `DEVELOPMENT_STATUS.md` | Ficaram as duas secções. |
| `tests/m02-02`, `tests/browser/m02-01-quinta.spec.js`, `tools/m02/playwright-m02-01.config.js` | Ficaram os nossos. `m02.completed` só em C12, nos dois lados. `m02-mission.spec.js` do Codex **não entra na config**: precisa de `m02.html`, que não foi integrada. |

## 4. Alterações a ficheiros M01/partilhados EXCLUÍDAS (decisão do Capitão M01 / proprietário)

`git diff 2810dcbc..HEAD -- src/game/m01-* src/render/m01-* src/world/m01-* src/game/game.js src/main.js missions/m01-tczew` está
vazio. `index.html`, `vite.config.js`, `src/core/audio.js`, `src/core/battlefield-audio.js` e `tests/m01-*` também não mudaram.

1. `index.html`: ligação «M02 · Batalha do Bzura →» no menu da M01, para `m02.html`.
2. `vite.config.js`: `rollupOptions.input` com `m02-01.html` e `m02.html` no build principal (D-M02-1/7).
3. `src/core/audio.js` (`weaponFire`):
   - a MP38 entrava na junção de rondas em voz por fonte (`p.family==='mg'||id==='mp38'`);
   - uma voz só se reutilizava para a mesma arma (`b.weapon===id`);
   - as rondas MP38 entregues num frame lento eram espaçadas (`scheduledAt`).
   - **Nota para o Capitão M01:** `b.weapon===id` é uma correção genérica, sem ela uma fonte que muda de arma junta-se à rajada aberta.
4. `src/core/battlefield-audio.js`: perfil sonoro `mp38`.
5. `tests/m01-battlefield-audio.test.js`: a lista de perfis com `mp38`.

## 5. Funcionalidades

### Mantidas ou fundidas

- **Água em C04:** sim (prompt, ação de 1,5 s, persistência, validador), HUD, toque e áudio/gesto no `M02Presentation`.
- **Retirada antecipada:** só dentro de B12 em C11, com segunda confirmação; quem não chegou fica por localizar e parado.
- **Presença de atores:** `m02ActorPresent`.
- **Clearance aliada por ronda:** `advanceActorBurst`. Uma rajada aliada também pára quando o alvo do EA0 começa a recuar (D2).
- **Continuidade do diálogo:** C08, Lis.
- **Granadas:**
  - preparação de 0,5 s, que espera o fim da recarga e da culatra;
  - ressaltos físicos (`m02-grenade-physics`), com os eventos `grenade-bounced` e `grenade-handling-started` e o áudio;
  - consciência de granadas (`FLEE_GRENADE`, avisos).
- **Combate:** equipa da MG (cobertura do municiador), retirada do municiador de B02 pela porta sul e cues de recarga dos NPC.
- **Lis e munição:** recolha de munição dos caídos e a ação explícita «Socorrer Lis», como segunda via.
- **Referências e provas:** referências Astra e todas as provas em `docs/verification/m02-runtime/`.
- **Nossas, intactas:**
  - auditorias N/O/P/Q;
  - FIX-1/2/3/K, TIME-01 e N0 (planta, tabela de vãos, 30 conjuntos);
  - combate D (falha, avisos D5, dificuldade D6, ordens D4, moral), set pieces J/E/F e o roteiro automático com MissionBot;
  - a loja v2 e o toque.

### Excluídas ou sem uso

- **MP38 (FIX-1/EQP-01):**
  - não está no roster nem em `WEAPON_PROFILES`;
  - `m02-weapons.js` e `m02-smg-animation.js` passaram a nomes genéricos SMG, com `M02_SMG_WEAPON_IDS` vazio;
  - os nomes dos ficheiros e dos nós vêm do manifesto, e os assets ficam em `assets/models/provisional/m02/weapons/` sem uso
    (créditos em `ASSET_CREDITS.md`).
- **Ordens e reação:**
  - as ordens «suprimir»/«flanquear» e `holdPositions` não entram, porque D4 as recusa;
  - o atraso fixo de reação não entra.
- **Pontaria e geometria:**
  - a pontaria à cabeça visível não entra;
  - a trincheira física de P1/EA0 e o spawn B não entram.
- **Entrada e apresentação:**
  - `m02.html`, `m02-session-ui.js` e `m02-touch.js` ficam sem uso;
  - o ambiente/vegetação, a arquitetura, a iluminação e os FX do renderer Codex ficam sem uso.

## 6. Testes ajustados, e porquê

- **Sementes do MissionBot** (`m02-18`, `m02-19` FIX-CD 10, `m02-28`, `m02-c11-gruca-march`):
  - o fluxo do bot é caótico perante qualquer mudança, e as sementes voltaram a ser medidas com o código final, como já era
    prática desta linha;
  - o bot aponta pela mira (`tests/m02-mission-bot.js`), porque o fogo pelos controlos tem agora dispersão M01.
- **`m02-09` (SAVE-01):** a 2.ª granada passou do tick 150 para o 145. A preparação de 0,5 s e a espera pela recarga do tick 147
  deixavam-na em espera no snapshot.
- **`m02-13`:** o par jogador/inimigo passou para dentro dos limites jogáveis. A física corre agora em todos os ticks e repunha
  Piotr em x = −60.
- **`m02-d3`:** a rajada de MG34 esgota-se ronda a ronda, e o teto por rajada continua provado.
- **`m02-d4-squad-orders`:** o invólucro de `fireActorBurst` passa o 5.º argumento (`{continuation}`).
- **`m02-d1-rescue`:** o último grupo parte depois da janela de Lis. Com navegação física, chegava antes e fechava C12.
- **`m02-d5`:** Piotr levanta-se antes de correr, porque C01 começa agachado na vala.
- **Codex:**
  - `m02-squad-orders` foi reescrito para D4;
  - em `m02-session` a acessibilidade é configuração fora do save (PDF I5, FIX-2b);
  - em `m02-early-withdrawal`/`m02-evacuation-combat` os fixtures marcam `arrivedAt` e a rota é a desta linha;
  - `m02-weapon-causality`, `m02-round-audio`, `m02-weapons`, `m02-smg-animation` e `m02-grenade-awareness` deixam a MP38
    (passam à rkm wz.28) e abrem o contacto C06 no fixture;
  - os sólidos de teste entram também em `sightOpaqueObstacles` (vista N0);
  - em `m02-machinegun-team` o contacto C06 abre-se no fixture.

## 7. Resultados reais (código de `46b89f0f`) e pendências

- **Builds:** `npm run build` OK e `npm run build:m02` OK, com o aviso de chunk grande que já existia.
- **Node:** `node --test --test-concurrency=1` nas duas metades de `tests/m02-*.test.js`: **861 testes, 831 passam, 30 falham.**
  - `m02-[0-2]*`: 362 testes, 360 passam;
  - `m02-[a-z]*`: 499 testes, 471 passam.
  - O conjunto continua **vermelho**, por isso a M02 única ainda não pode ser promovida.
- **Browser:** `CI=1 CHROME_EXECUTABLE=/opt/pw-browsers/chromium PORT=4395 npx playwright test -c tools/m02/playwright-m02-01.config.js`
  deu **8 passam e 1 falha** (15,9 min, SwiftShader).
  - Passam, entre outros: arranque e balística, o teste do Codex «reuses loaded M01 GLB rigs and viewmodel» no renderer desta
    linha, save/reload real, os 30 conjuntos N0, os vídeos de rota e o painel de falha por toque.
  - Falha `m02-touch.spec.js:118`: o stick no fim do curso já não dá `sprinting`. Com o Codex, `sprinting` só fica ativo com
    deslocação real, e o Piotr do teste estava bloqueado. Falta confirmar e ajustar.

### Testes ainda vermelhos (30) e causa provável

**A. Calibração D desta linha com o modelo de combate fundido (15).** O modelo inclui as rajadas ronda a ronda, a supressão só
para rondas a ≤ 3 m do alvo, as reações a granadas e as outras regras de IA do Codex.

- `m02-d4-squad-orders`: são 5 (prova de 60 s: tiros ≥ 50, impactos ≥ 4, dano > 200, Piotr abrigado vivo).
- `m02-d4-autonomy-limits`: semente 2, a quinta cai sozinha aos 17 s.
- `m02-d1-mission-failed`: são 5, porque o cenário em que Piotr morre a tiro já não o mata.
- `m02-c06-entry-window` (controlo: EB1 acerta em Piotr) e `m02-c09-section-advance` (precondição da trela).
- `m02-27-o2-com01-ammo`: a MG34 não esgota a dotação em 130 s.
- `m02-09` n.º 6: falta a precondição «porta reservada aos 25 s».
- **Decisão pendente do Capitão:**
  - (a) recalibrar os cenários e limiares D com o modelo causal; ou
  - (b) voltar a rajadas atómicas (combate D desta linha) e ajustar os testes do Codex que dependem da rajada causal (clearance
    por ronda, áudio por ronda).
  - Não se removeu nenhuma asserção.

**B. Testes do Codex que dependem de partes não ligadas ou excluídas (15).**

- **Geometria (`m02-cover-dressing`, 2):** trincheira de P1 a −0,42 m e parapeito do EA0, que não foram integrados.
- **Iluminação (`m02-lighting`, 1):** o preset noturno do Codex (2,25) contra o TIME-01 desta linha (0,36).
- **Contacto com Lis:**
  - `m02-lis-contact` (2): o contacto por proximidade desta linha (J3) contra o contacto só explícito do Codex;
  - `m02-playable-continuity` n.º 192: caminhada amparada.
- **`m02-playable-continuity`, outros dois:**
  - n.º 186: o atraso fixo de reação, excluído;
  - n.º 190: um save de formato Codex com `doorLocks` em lista e a porta `portal`, recusado pelo validador v2 (correto: formato
    estrangeiro).
- **Personagens e recargas:**
  - `m02-npc-reload-audio` (1) e `m02-presentation`/`m02-reconstruction` n.º 201/207: clips de recarga e cues;
  - `m02-reconstruction` n.º 210/211/212: exposição em cobertura baixa, Lis amparado com velocidade 2,6, boca obstruída na
    balística.
- **`m02-completion-flag` (1):** reparação de saves antigos do Codex, cujos checkpoints intermédios marcavam `completed`.

### Próxima ação recomendada

1. Decisão do Capitão sobre o modelo de rajada e a calibração D (A).
2. Para cada teste B, ligar a peça visual do Codex ao renderer, ajustando o teste com justificação, ou registar a exclusão como decisão.
3. Ligar o ambiente/iluminação/FX do Codex. Isto exige verificação visual N0, e só depois se pode pensar no iPhone e em playtest humano.
4. Decidir as alterações partilhadas da secção 4 com o Capitão M01.
