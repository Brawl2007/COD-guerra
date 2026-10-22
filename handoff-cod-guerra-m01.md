# active-memory handoff: COD-guerra — M01 Tczew (Capitão Opus)

**Handoff #1** · 2026-10-21 · Lineage: #1 (2026-10-21): recuperou o PR #89 e integrou na branch do Capitão as correções P0–P4 do playtest do dono; PR #91 aberto para a candidata #80, à espera de merge humano.

## 0. Instructions for Claude (read first)

You are continuing work from a previous chat. That chat is gone; this file is the complete context and the source of truth.

1. Read this whole file before replying.
2. Follow sections 3 (Style), 4 (Hard rules) and 5 (Corrections) in every reply, for the rest of this chat. They override your defaults.
3. Use the values in section 8 exactly. Never round, re-estimate, or "correct" them.
4. Do not suggest anything listed in section 7 (Changed / rejected) again unless the user brings it up.
5. Code word: None active. If the user types /amcodeword, start every reply with the phrase they choose (default "Yes Boss!").
6. Your first reply: at most 5 lines covering the goal, the current state, and the next step (section 11). Mention any files from section 13 that were not attached. Ask the questions in section 12 if there are any. End with "Ready to continue with <next step>?" Then wait for the user's go.

## 1. Mission
- **Goal:** terminar a M01 Tczew (FPS da Segunda Guerra, 1 de setembro de 1939, defesa polaca das pontes do Vístula) com qualidade de referência CoD World at War (2008) / CoD WWII (2017). Depois vêm a fatia vertical de ~10 min e as missões M02–M30.
- **Done looks like:** o playtest do dono aprova a M01. As 16 falhas do playtest de 2026-10-18 estão corrigidas, por prioridade P0 física/colisão → P1 IA/combate → P2 progressão → P3 animações → P4 áudio/apresentação. Cada entrega responde às 7 perguntas (secção 8).
- **Context:** o dono rejeitou a M01 no playtest de 2026-10-18. Há duas diretivas: a «DIRETIVA MESTRE PERMANENTE» (WaW/WWII como referência) e a «ORDEM EXECUTIVA Fable 5.1» (integrar o roteiro do PR #56 sem o seguir às cegas).

## 2. About the user (as relevant to this work)
- É o dono do repositório `Brawl2007/COD-guerra`. Escreve em português informal, sem acentos e com gralhas.
- O alvo final é **um exe instalado no PC, em qualidade máxima**. O browser e o Vercel servem só para ver se o jogo arranca.
- Faz ele próprio os merges no GitHub e viu deployments no Vercel.
- Usa outros agentes: Codex, Gemini 4 «Argon» (a quem se pede tarefas para colar), e as sessões e Routines da Cloud.

## 3. Style & communication
- **Language:** responder em português europeu. Os documentos do repo também em português. Os prompts para subagentes podem ir em inglês.
- **Tone:** direto e factual, sem enchimento. Relatar resultados reais, incluindo falhas.
- **Reply length:** curto. Usar listas e tabelas para números.
- **Formatting:** markdown com listas e alguma tabela. Links completos para PRs.
- **Working style:** avançar sem pedir instruções em cada subtarefa. Delegar a subagentes (no máximo 4 em paralelo) e integrar o resultado. Dar o próximo trabalho a cada agente que acaba.
- **Avoid:** declarar sucesso sem provas; enfraquecer asserções; recriar trabalho que já existe.

## 4. Hard rules (word for word)
1. "Não alteres main, PR #80 ou PR #84 enquanto o integrador permanecer PAUSED. Não faças merge nem deploy sem autorização. Mantém a candidata única e trabalha em branches isoladas."
2. "podes alterar, diate de agora te dou permissao para tudo nao precisa pedir e so avancar". Merge na `main` e deploy continuam a exigir um «faz merge na main» explícito.
3. "agora vai ser 4 subagente a trabalhar no maximo". Antes o limite era 5.
4. "vc so para quando vc terminar o m01, quando a 1 agente terminar o seu trabalho da mais trabalho para o agente".
5. "e integra os trabalhos tambem".
6. "isso e soteste pra ver se rodoa no browser, nao se preocupe o jogo vai ser para pc maxima qualidade instalado exe".
7. Regras do repositório (AGENTS.md/CLAUDE.md):
   - «uma IA entrega, um jogo recebe» e uma única candidata.
   - Merge `--no-ff`.
   - Estados do ledger: CONCLUÍDA NA ORIGEM / INTEGRADA NA CANDIDATA / INTEGRADA SEM VALIDAÇÃO DE JOGO / PENDENTE / BLOQUEADA (motivo).
   - Sem force-push nem reset destrutivo.
   - Não copiar nada de Call of Duty (nomes, falas, cenas, assets). Só IP original.
8. Nunca enfraquecer asserções. Os goldens só se regeneram com as ferramentas do repo e com uma emenda documentada.
9. O Jev pago está autorizado. O Fable pago e outras APIs pagas precisam de autorização específica. O email do utilizador nunca vai para serviços externos.
10. Commits terminam com:
    `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
    `Claude-Session: https://claude.ai/code/session_01Uc4yy1qUZCxM8DZt8X68qo`

## 5. Corrections log
| # | Claude did | The user wanted |
|---|---|---|
| 1 | Demorava em validações pesadas no browser | "isso e soteste pra ver se rodoa no browser… pc maxima qualidade instalado exe": o browser é só smoke |
| 2 | Usava 5 agentes em paralelo | No máximo 4 |
| 3 | Correu testes no browser contra um `dist/` desatualizado e obteve 21/40 | Fazer sempre `npm run build` antes de testar no browser (o erro foi do Claude) |
| 4 | `pkill -f "playwright test"` matou os próprios comandos | Matar só por PID explícito |
| 5 | Tentou push direto para a branch da #80 (bloqueado pelo classificador) | Abrir um PR para a branch da #80; o dono faz o merge |
| 6 | Tentou escrever a D42 em DECISIONS.md (bloqueado como «Instruction Poisoning») | Não contornar; o dono regista a D42 |

## 6. Decisions
| Decision | Why |
|---|---|
| Ordem de fusão física → NPCs → ritmo → combate; render (skin, anim, audio) a qualquer altura | Conselho do advisor |
| Goldens re-baseados uma vez por passo de fusão (emendas 04–12) | Evitar emendas obsoletas |
| A ckm wz.30 dispara (T47), contra o Fable, onde «nunca dispara» | Diretiva do dono para uma batalha ativa |
| A regra B4 mantém-se: a carga oeste espera que o Bąk seja entregue ao médico | Fixada por testes. A espera no corredor resolve-se depois com a escolta SP-08 |
| Fatia 2: assalto alemão ao tabuleiro às 06:05–06:10; a demolição leste espera o tabuleiro livre; relógio parado às 06:09:30 com limite absoluto | Combate próximo e historicamente plausível |
| Retaguarda polaca `pl_east_0..2` em x 165–175, z 38.7, sem baixas | Medido; ter baixas exigiria um segundo modelo de baixas |
| Rampa do Vístula em x 25–40, z 10–15 | Noutros sítios mexia no golden |
| Intel HD Graphics arranca em Medium; GPU capaz em High; renderer por software em Low | Alvo PC |
| Limite de catch-up de 5 passos (250 ms) | 150 ms atrasava o CI no SwiftShader |
| Falas 118/119 seguem a simulação (recuo pelo aterro, não pela estação) | Coerência com o jogo |
| Dificuldade: recruta idêntico bit a bit; soldado é o default de jogo novo (D5); veterano é o mais difícil | Calibração D2 |

## 7. Changed / rejected
- 5 agentes → 4 agentes (ordem do dono)
- Catch-up 150 ms → 250 ms (o CI ficava a 0,68× do tempo real)
- Regra F1 da física (tirar o jogador de dentro dos sacos da ckm ao carregar) → retirada, porque os sacos ganharam uma porta traseira
- ❌ Otimização de alocação no `heightAt` (ganho desprezível e partia o pin do terreno). A branch `claude/busy-ritchie-3fkvk2-perf` ficou abandonada
- ❌ Patch T21 do Argon (base desatualizada). Refeito sobre o código real
- ❌ Relaxar a B4 (a carga oeste sair quando o Bąk passa x < −90)
- ❌ Seguir o Fable em «não cortar esperas», «nenhuma música» e «nada novo no HUD»
- ❌ Mover a ckm para o posto S3 (partia a T47 e o golden)

## 8. Data & facts (exact)
**Branches e PRs**
| Item | Valor |
|---|---|
| Candidata única | PR #80, branch `claude/quirky-heisenberg-9l4m7b` @ `68301b7` |
| Branch do Capitão | `claude/busy-ritchie-3fkvk2` @ `afaded9` (já com push) |
| PR para a candidata | https://github.com/Brawl2007/COD-guerra/pull/91 (aberto, mergeable, à espera do merge do dono) |
| PR #90 | integrado na #80 em `f86bc3b` |
| Pré-visualização Vercel | https://codguerram01-git-claude-busy-ritchie-3fkvk2-tarcio3.vercel.app |
| Issue de coordenação | #72 (handoff em https://github.com/Brawl2007/COD-guerra/issues/72#issuecomment-6262400413) |
| PR do Fable 5.1 | #56, branch `origin/claude/upbeat-ptolemy-rzqu5g` |

**Testes no HEAD `afaded9`**
- `npm test`: 1453/1453.
- Browser (`m01.spec.js`, `m01-pacing-hud`, `m01-hud-presentation`, `m01-ckm-fire`, com CI=1, porta 4185): 39/40.
  - Falha `tests/browser/m01.spec.js:453` (o CP-D reload espera um número de alemães vivos). O pin `CPD_ENEMIES_ALIVE=42` já não bate certo depois da D2, que mudou o comportamento das 05:35.
- Em `2e7b2e1` o browser deu 40/40.

**Emendas aos goldens** (ferramenta `tools/verification/m01-integration-golden-audit.mjs`):
| Emenda | Delta |
|---|---|
| 04 | phys `body` |
| 05 | npc |
| 06 | pacing |
| 07 | combat-ai |
| 08 | deck-assault |
| 09 | nav-queue (idêntico) |
| 10 | dialogue |
| 11 | rearguard |
| 12 | difficulty+0535 |

**Métricas (antes → depois)**
| Métrica | Valor |
|---|---|
| Atravessamentos de paredes pelos NPCs | 14 → 0 |
| Pares de NPCs sobrepostos | 49–57 → 0 |
| Caminhadas livres que chegam | 150/150 |
| Alemão mais próximo | 963 m → 430 m |
| Repetição de intervalos do Kowal | 72 % → 2,2 % |
| Pares de animação em sincronia | 22 % → 4 % |
| 06:00 chega a | 692,0 s → 568,1 s (emenda 06) |
| Duração da missão | 16,0 → 19,9 min (1191,9 s) depois da fatia 2 |
| Maior troço sem contacto (controlo) | 76,7 → 131,5 s (fatia 2) → 27,5 s (D2) |
| Rondas polacas no tabuleiro, jogador passivo | 0 → 22 |
| Tick em combate (barks) | 0,904 → 0,656 ms |
| Falas por minuto | 2,32/2,71 → 4,18/4,27 |
| Vida mínima: recruta / soldado / veterano | 52 / 41,25 / 0 (veterano: 12 mortes em 24 no percurso passivo de controlo) |

**Ambiente**
- Porta 4173 fixa para o preview principal.
- Browser: `CHROME_EXECUTABLE=/opt/pw-browsers/chromium`, com `flock` em `/tmp/claude-0/-home-user-COD-guerra/2e266534-2f3a-5797-a5ca-4d7af2b9f0a3/scratchpad/pw.lock`.
- Configs por porta em `tools/verification/playwright-port-41xx.config.mjs`.
- As specs regravam as capturas versionadas em `docs/verification/`. Reverter com `git checkout -- docs/verification/`.
- Unidades: 32 unidades legadas = 1 m.

**As 7 perguntas por entrega:** o que a referência faz melhor; o que estava errado; o que foi corrigido; o que ficou igual; como foi validado; o que continua inferior; próxima melhoria.

## 9. People, terms & names
- **People:** dono = Brawl2007. Argon = Gemini 4. Codex. Fable 5.1 = autor dos documentos de direção criativa (PR #56).
- **Personagens:** Kowal (rkm), Dudek, Bąk (ferido levado ao médico), Nowicki, Zieliński, Krawiec. Guarnição da ckm: `ckm_gunner`, `ckm_loader`, `ckm_reserve`.
- **Terms:**
  - ckm wz.30 = metralhadora polaca;
  - MG34 = metralhadora alemã; «cekaem» é o termo polaco usado nas falas;
  - B4 = regra do Bąk entregue ao médico;
  - T47 = fogo real da ckm;
  - T48 = retirada e silêncio alemão às 06:10–06:12;
  - CP-A..D = checkpoints;
  - D35/H9 = desenho da dificuldade;
  - D2 = ligação da dificuldade;
  - D5 = seletor de dificuldade;
  - SP-08 = escolta no corredor;
  - fatia 2 = assalto ao tabuleiro; fatia 2b = retaguarda.
- **Names in use:**
  - `src/game/m01-simulation.js`, `m01-barks.js`, `m01-rearguard.js`, `m01-difficulty.js`, `src/world/m01-navigation.js`
  - `missions/m01-tczew/mission.json`, `tests/helpers/m01-route.js`
  - `docs/direction/COD_WAW_WWII_BENCHMARK.md`, `M01_INTEGRATION_LEDGER.md`, `M01_REACTIVE_DIALOGUE.md`, `M01_FABLE_GAP_2026-10-18.md`, `H9_DIFICULDADE.md`
  - Regras partilhadas dos agentes: `/tmp/claude-0/-home-user-COD-guerra/2e266534-2f3a-5797-a5ca-4d7af2b9f0a3/scratchpad/AGENT_RULES.md` (efémero)

## 10. Work state
| Item | Status | Version / location | Notes |
|---|---|---|---|
| Correções P0–P4 + fatias 2/2b + D2 | integradas na branch do Capitão | `afaded9`, PR #91 | Falta o merge do dono na #80 |
| Spec do CP-D (`m01.spec.js:453`) | falha 1/40 | `tests/browser/m01.spec.js` | Re-medir `CPD_ENEMIES_ALIVE` depois da D2 (nota com data) |
| D5 seletor de dificuldade | parcial, sem commit | worktree `/home/user/wt/d5`, branch `claude/busy-ritchie-3fkvk2-d5` sobre `afaded9` | Ficheiros alterados: index.html, src/game/game.js, src/main.js, src/ui/m01-hud.js, H9 doc. Novos: `src/styles-d5-difficulty.css`, `tests/m01-difficulty-ui.test.js`, `tests/browser/m01-difficulty-ui.spec.js`, capturas em `docs/verification/m01-runtime/difficulty-ui-2026-10-19/`. O agente parou no limite semanal depois de «All 5 pass» |
| Benchmark WaW/WWII | uma só tabela de 21 linhas, todas NÃO VERIFICADO | docs/direction | A D2 foi acrescentada no fim; falta integrá-la na tabela principal |
| Fable gap | no repo | `M01_FABLE_GAP_2026-10-18.md` | — |

## 11. Next steps
1. **Next action:** em `/home/user/wt/d5`, rever o diff da D5, correr `npm run build`, os testes focados e `tests/browser/m01-difficulty-ui.spec.js` (CI=1, porta 4192, flock). Fazer commit e depois `git merge --no-ff` na branch do Capitão.
2. Corrigir o pin `CPD_ENEMIES_ALIVE` em `tests/browser/m01.spec.js:453`, medindo com `restoreSnapshot` em Node e deixando um comentário com a data e a causa (D2). Depois `npm run build` e de novo os 40 testes no browser, `npm test`, push, e atualizar o corpo do PR #91.
3. Integrar a linha da D2 na tabela principal do benchmark e no ledger.
4. Pedir ao dono o merge do PR #91 e o playtest.
5. Depois do playtest: escolta SP-08, ckm a encravar (falas 114/115), D3/D4 (morte justa e checkpoint CP-B2), revisão do polaco por um falante nativo.

## 12. Open questions ⚠️
- Calibração da D2: aceitar a regeneração em veterano (3 HP/s ao fim de 10 s), contra a recomendação do D35 §7.2? Opções: aceitar / retirar.
- O «Production rebuild» no Vercel feito pelo dono foi intencional? O Claude não fez nenhum deploy.
- Decisões humanas pendentes:
  - licença fp-arms-v2;
  - gravações T45;
  - medição T49 num PC real;
  - shell do exe (proposta: Electron);
  - registar a D42 (alvo PC em qualidade máxima).
- O dono não respondeu se quer que o Claude acompanhe o PR #91 automaticamente.

## 13. Re-attach checklist
- [ ] `handoff-cod-guerra-m01.md`: este ficheiro, na raiz do repo, na branch `claude/busy-ritchie-3fkvk2`.
- Mais nada: todo o resto está no GitHub (PR #91, issue #72, documentos em `docs/direction/`).

---
<sub>Audit: 13/13 sections · 10 rules · 6 corrections · 40+ data points · secrets removed: none found · generated by active-memory</sub>
