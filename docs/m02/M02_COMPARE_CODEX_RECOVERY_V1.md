# M02: comparação Claude × Codex, para integração segura (2026-11-05)

**Só leitura. Não houve merge nem substituição.** A comparação foi feita com `git fetch origin`, `git merge-base`,
`git diff --name-only` e `git merge-tree` (simulação de merge, sem escrita).

| | Claude | Codex |
|---|---|---|
| Branch | `claude/elegant-wright-m9l1ws` | `codex/m02-recovery-v1` |
| Ponta | `dd1ed9f5` | `b0d14d4b` (2026-11-04 20:24 UTC) |
| Base | Linha da M01 `03387a31`, que inclui o merge Gemini `426045ee` e `origin/main` | Gemini `56e98cbf` + `origin/main`; **não** inclui `03387a31` nem `426045ee` |
| Commits desde o antecessor comum `56e98cbf` | 207 | 144 |

## Simulação de merge (`git merge-tree HEAD codex`)

Há **16 conflitos de conteúdo**:
- `DEVELOPMENT_STATUS.md`;
- `src/core/audio.js` (motor partilhado);
- `m02-01.html`;
- `src/game/m02-01-simulation.js`, `m02-acts-director.js` e `m02-combat-ai.js`;
- `src/m02/m02-01-main.js`;
- `src/render/m02-01-renderer.js`;
- `src/render/m02-environment.js` e `src/render/m02-presentation.js`, como **add/add** (os dois lados criaram o mesmo ficheiro);
- `src/world/m02-quinta-world.js` e `src/world/m02-zone-streamer.js`;
- `tests/browser/m02-01-quinta.spec.js`;
- `tests/m02-02-combat-squad-ai.test.js`;
- `tools/m02/playwright-m02-01.config.js`.

Fundem sem conflito textual `index.html`, `src/core/battlefield-audio.js` e os dois JSON de `missions/m02-bzura`, mas exigem revisão semântica.

## Divergências semânticas (decidir antes de resolver os conflitos)

1. **Ecrã e equipamento.**
   - O Codex ainda mostra «56.º Regimento / 25.ª DI» (`m02-01.html`, `historicalNote`) e «Mensageiro 56 pp». Também usa `mp38` (`m02-combat-ai.js` e layout B/C) e acrescenta modelos `assets/models/provisional/m02/weapons/mp38_*.glb`.
   - O Claude retirou tudo isto até DEC-02 e EQP-01, com o guard `tests/m02-07-history-text-guard.test.js`.
   - Este guard falha com o código do Codex.
2. **Saves.** Os dois lados guardam o estado do RNG.
   - **Codex:** `rngState`, validação opcional e `src/m02/m02-session.js` com `localStorage`.
   - **Claude:** snapshot v2 com validador estrito, restauro em fases e `src/game/m02-save-store.js` (staging, `previous`, compare-and-swap, `status()`/`clear()`), checkpoints em lote no fim do tick e `runAtomicAction`. Teve 2 revisões adversariais e fuzz de restauro sem divergências.
   - **Há dois gestores de save.** É precisamente o risco M6 do pacote, e é preciso escolher um. A proposta D-M02-4 está em `docs/m02/M02_SAVE_ENVELOPE_PROPOSAL.md`.
3. **Fim da missão.**
   - Codex: «Complete M02 only in the final campaign transaction», com retirada antecipada.
   - Claude: `m02.completed` só no C12, `missionFailed` e `lis_status` derivado.
   - Os dois mudam a mesma lógica de maneiras diferentes.
4. **Entrada no jogo.** O Codex altera `src/game/game.js`, `index.html` e `vite.config.js` (M02 no menu/build) e `src/core/audio.js`. O Claude não toca em nenhum destes; o build principal não muda. Isto exige autorização (D-M02-1/7, CAMPAIGN_PLAN §2) e cuidado com a M01.
5. **Áudio partilhado.** O Codex mexe em `src/core/audio.js` e `battlefield-audio.js` e acrescenta `tests/m01-battlefield-audio.test.js`. Pode afetar a M01.
6. **Ambiente e apresentação.** Os dois lados criaram `m02-environment.js` e `m02-presentation.js` com conteúdos diferentes.
   - O do Claude reutiliza `m01-area-*` e usa luzes TIME-01.
   - É preciso escolher uma base e enxertar a outra.
7. **Só no Codex:**
   - controlos tácteis;
   - água no C04 com animação;
   - retirada antecipada;
   - presença de atores;
   - clearance de rajadas aliadas;
   - referências Astra (`docs/m02/referencias/astra/`, com outra cópia do PDF);
   - muitas evidências em `docs/verification/m02-runtime/`.
8. **Só no Claude:**
   - auditorias N, O, P e Q;
   - FIX-1/FIX-3/K;
   - BZ-H/BZ-C02 em SOURCES;
   - TIME-01;
   - roteiro automático C01→C12 com MissionBot;
   - combate D (falha, avisos 5–8 s, dificuldade da M01, ordens, moral);
   - set pieces J/E/F;
   - N0 a 360° (30 conjuntos);
   - planta e tabela de vãos.

## Recomendação para integrar os dois trabalhos

1. Usar como base a linha da M01 (`claude/elegant-wright-m9l1ws`, que já contém `03387a31`). Trazer o Codex numa branch de integração própria, com `merge --no-ff`, sem rebase e sem force-push.
2. Resolver primeiro as decisões 1, 2 e 4 com o proprietário. Fixar **um** gestor de save e o texto histórico.
3. Resolver os conflitos ficheiro a ficheiro, preservando o comportamento dos dois lados e sem remover asserções. Correr depois as duas suites: `tests/m02-*.test.js` (Claude 377) e os testes do Codex.
4. Correr uma revisão adversarial dos saves e da simulação no resultado. Correr também o `npm test` completo e o `test:browser` da M01, porque o Codex mexe em `game.js` e no áudio partilhado.
