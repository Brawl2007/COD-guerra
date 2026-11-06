# active-memory handoff: COD-guerra — M01 Tczew (Capitão Opus)

**Handoff #2** · 2026-10-23 · Lineage: #1 (2026-10-21): recuperou o PR #89 e integrou na branch do Capitão as correções P0–P4 do playtest do dono; PR #91 aberto para a candidata #80. #2 (2026-10-22/23): pin do CP-D, D5 refeita, #91 integrado na #80, WP1 dificuldade D3/D4/D5, WP3 escolta SP-08, WP2 encravamento da ckm e WP4 desempenho integrados; candidata #80 @ `40787b2`.

## 0. Instructions for Claude (read first)

You are continuing work from a previous chat. That chat is gone; this file is the complete context and the source of truth.

1. Read this whole file before replying.
2. Follow sections 3 (Style), 4 (Hard rules) and 5 (Corrections) in every reply, for the rest of this chat. They override your defaults.
3. Use the values in section 8 exactly. Never round, re-estimate, or "correct" them.
4. Do not suggest anything listed in section 7 (Changed / rejected) again unless the user brings it up.
5. Code word: None active. If the user types /amcodeword, start every reply with the phrase they choose (default "Yes Boss!").
6. Your first reply: at most 5 lines covering the goal, the current state, and the next step (section 11). Mention any files from section 13 that were not attached. Ask the questions in section 12 if there are any. End with "Ready to continue with <next step>?" Then wait for the user's go.

## 1. Mission
- **Goal:** terminar a M01 Tczew (FPS da Segunda Guerra, 1 de setembro de 1939, defesa polaca das pontes do Vístula) com qualidade de referência CoD World at War (2008) / CoD WWII (2017), sem copiar conteúdo. Depois: fatia vertical de ~10 min e missões M02–M30.
- **Done looks like:** o playtest do dono aprova a M01. Objetivo final da ordem de 2026-10-22: «uma M01 jogável, estável, com combate intenso e credível, soldados coordenados, animações e áudio convincentes, dificuldades equilibradas e o mínimo possível de tempo morto».
- **Context:** o dono rejeitou a M01 no playtest de 2026-10-18 (16 falhas). Diretivas: «DIRETIVA MESTRE PERMANENTE» (WaW/WWII como referência) e «ORDEM EXECUTIVA Fable 5.1» (integrar o roteiro do PR #56 sem o seguir às cegas). Em 2026-10-22 o dono deu a «ORDEM DO CAPITÃO — CONCLUIR TODO O TRABALHO PENDENTE DA M01».

## 2. About the user (as relevant to this work)
- Dono do repositório `Brawl2007/COD-guerra`. Escreve em português informal, sem acentos e com gralhas.
- Alvo final: um exe instalado no PC, em qualidade máxima. Browser/Vercel só servem para ver se arranca.
- Faz merges no GitHub e vê deployments no Vercel.
- Usa outros agentes: Codex, Gemini 4 «Argon», sessões e Routines da Cloud (outras sessões fazem push para a #80 em paralelo).
- Tem plano Claude Max 5x; queixou-se de consumo de tokens («por que meu tokens esta sendo consumido como agua») e bate no limite de sessão da API.

## 3. Style & communication
- **Language:** português europeu nas respostas e documentos do repo; prompts para subagentes podem ir em inglês.
- **Tone:** direto e factual, sem enchimento; relatar resultados reais, incluindo falhas.
- **Reply length:** curto; listas e tabelas para números.
- **Formatting:** markdown com listas e tabelas; links completos para PRs.
- **Working style:** avançar sem pedir instruções em cada subtarefa; delegar (máx. 4 subagentes) e integrar; **economia de tokens**: um pacote de cada vez, esforço médio/alto, suites completas só na integração, não reler ficheiros nem repetir testes no mesmo SHA.
- **Avoid:** declarar sucesso sem provas; enfraquecer asserções; recriar trabalho existente; gastar tokens à toa.

## 4. Hard rules (word for word)
1. "Não alterar a `main` nem promover deployments para produção." (ordem 2026-10-22; merge na `main` e deploy exigem «faz merge na main» explícito)
2. "PR #91: autorizado a avançar a branch `claude/busy-ritchie-3fkvk2` para `b04c5f1d` por fast-forward" e "Candidata #80: autorizado a integrar o #91 na candidata jogável depois da validação, resolvendo conflitos sem perder trabalho." (feito)
3. "Veterano: retirar a regeneração automática, conforme D35 §7.2, e recalibrar a dificuldade em conjunto com D3/D4." (feito)
4. "Não pares depois de concluir uma tarefa. Avança para a próxima, respeitando as dependências e a segurança do projeto."
5. "Só declares uma tarefa concluída quando estiver implementada, testada e integrada na candidata jogável."
6. "O playtest humano e as gravações humanas devem permanecer assinalados como pendentes até serem realmente realizados."
7. "Não modificar testes apenas para esconder erros." · "Corrigir regressões antes de continuar." · "Preservar compatibilidade com saves antigos."
8. "Faz commits e push seguros nas branches autorizadas. Não uses force-push nem apagues trabalho válido."
9. "Se uma sessão terminar antes da conclusão, guarda commits, evidências e um handoff com a próxima ação exata para outra sessão continuar."
10. "agora vai ser 4 subagente a trabalhar no maximo".
11. "isso e soteste pra ver se rodoa no browser, nao se preocupe o jogo vai ser para pc maxima qualidade instalado exe".
12. Regras do repo (AGENTS.md/CLAUDE.md): «uma IA entrega, um jogo recebe», uma só candidata; merge `--no-ff`; provar inclusão por ancestralidade Git; estados do ledger CONCLUÍDA NA ORIGEM / INTEGRADA NA CANDIDATA / INTEGRADA SEM VALIDAÇÃO DE JOGO / PENDENTE / BLOQUEADA (motivo); sem force-push nem reset destrutivo; não copiar nada de Call of Duty.
13. Goldens só se regeneram com `tools/verification/m01-integration-golden-audit.mjs` e com emenda documentada; nunca à mão.
14. Jev pago autorizado; Fable pago e outras APIs pagas precisam de autorização específica. O email do utilizador nunca vai para serviços externos.
15. Commits terminam com:
    `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
    `Claude-Session: https://claude.ai/code/session_01EofSp9PSNfE7zC4hg3zhVu`
    (numa sessão nova, usar o URL da sessão nova)

## 5. Corrections log
| # | Claude did | The user wanted |
|---|---|---|
| 1 | Demorava em validações pesadas no browser | O browser é só smoke; o alvo é o exe no PC |
| 2 | Usava 5 agentes em paralelo | No máximo 4 |
| 3 | Testou o browser contra `dist/` desatualizado (21/40) | `npm run build` sempre antes do browser |
| 4 | `pkill -f "playwright test"` matou os próprios comandos | Matar só por PID |
| 5 | Push direto para a branch da #80 (bloqueado, 2026-10-21) | Na altura: PR para a #80. Desde 2026-10-22 o dono autorizou integrar na #80 |
| 6 | Tentou escrever a D42 em DECISIONS.md (bloqueado) | Não contornar; o dono regista a D42 |
| 7 | Quatro subagentes em paralelo, Opus/Sonnet-max, suites completas repetidas: consumo enorme de tokens | Economia: um pacote de cada vez, esforço menor, suites só na integração, conversas novas a partir de handoffs |
| 8 | Deixou trabalho da D5 sem commit numa worktree efémera (perdido) | Fazer commit e push de WIP antes de qualquer pausa/limite |
| 9 | `git branch -D` (bloqueado pelo hook de segurança) | Usar `git branch -d` |

## 6. Decisions
| Decision | Why |
|---|---|
| Ordem de integração: dificuldade → escolta → ckm → desempenho; emendas ao golden renumeradas 13/14/15 | Uma emenda por passo, em cadeia |
| Veterano sem regeneração | Decisão do dono (D35 §7.2) |
| SP-08 = opção (b), tarefa de escolta; B4 mantém-se | Ordem do dono «Corrigir a escolta SP-08» |
| Fala 115 prioridade 3 → 2 | Era ouvida 0/21; agora 8/21 |
| ckm encrava nas rajadas 14 (3,8 s) e 45 (4,6 s), sem sorteio | Determinismo; rota idêntica até ao 1.º encravamento |
| Um Skeleton partilhado por soldado (só renderer) | Auditoria de desempenho; pose bit a bit idêntica |
| Fundir malhas, MSAA/AO e sombras em Medium ficam para depois | Mudam a imagem ou têm risco médio |
| Ckm wz.30 dispara (T47); B4 mantém-se; recruta idêntico bit a bit; soldado default de jogo novo (D5) | Decisões anteriores do dono/advisor |

## 7. Changed / rejected
- 5 agentes → 4 agentes
- Paralelismo máximo → economia de tokens, um pacote de cada vez
- Veterano regenera 3 HP/s após 10 s → sem regeneração (dono, 2026-10-22)
- Graça de reação de soldado 1,5 s → 1,2 s (para cumprir o alvo de 25 s; a confirmar no playtest)
- `CPD_ENEMIES_ALIVE` 45 → 42 → 44 (D2) → 43 (encravamento da ckm)
- Fala 115 prioridade 3 → 2
- Catch-up 150 ms → 250 ms
- ❌ Otimização de alocação no `heightAt` (branch `-perf` abandonada)
- ❌ Patch T21 do Argon (base desatualizada)
- ❌ Relaxar a B4
- ❌ Seguir o Fable em «não cortar esperas», «nenhuma música» e «nada novo no HUD»
- ❌ Mover a ckm para o posto S3

## 8. Data & facts (exact)
**Branches e SHAs**
| Item | Valor |
|---|---|
| Candidata única | PR #80, `claude/quirky-heisenberg-9l4m7b` @ `40787b2` |
| Branch do Capitão | `claude/gallant-darwin-xr7jxu` @ `40787b2` (igual à candidata) |
| `main` | `6697956` (intocada) |
| PR #91 | integrado: fast-forward `f446d83` → `b04c5f1`, merge `--no-ff` `4e2588f` |
| Merges na #80 | WP1 `3eb21b3`, WP3 `c99a432`, WP2 `af3f382`, WP4 `86e1a1a`, fecho `ffb65e7`, correção de outra sessão `5274d6d` (merge `f929a02`), handoff `40787b2` |
| Branches de origem | `claude/gallant-darwin-xr7jxu-wp1` @ `c9de387`, `-wp2` @ `45a61a3`, `-wp3` @ `7b64047`, `-wp4` @ `be7703a`, `-integ` @ `ffb65e7`, `-d5` (local `4738d08`) |
| Pré-visualização Vercel (antiga) | https://codguerram01-git-claude-busy-ritchie-3fkvk2-tarcio3.vercel.app |
| Issue de coordenação | #72 |

**Validação em `ffb65e7`:** `npm test` 1524/1524 (159 ficheiros); build OK; golden 13/14/15 «identical»; browser 6 specs (`m01.spec.js`, `m01-pacing-hud`, `m01-hud-presentation`, `m01-ckm-fire`, `m01-difficulty-ui`, `m01-escort-hud`) 45/47 e as 2 expectativas corrigidas 2/2 isoladas (não se repetiu o conjunto inteiro). Sem playtest humano, sem FPS.

**Emendas ao golden**
| Emenda | Delta | Nota |
|---|---|---|
| 04–11 | phys, npc, pacing, combat-ai, deck-assault, nav-queue, dialogue, rearguard | — |
| 12 | difficulty+0535 | histórico |
| 13 | WP1 dificuldade | recruta idêntico (histórico) |
| 14 | escort+coordination | 1.ª diferença Kowal x às 06:10:00 (ticks 17220/15134); ticks 23746→23933 / 21660→21750 |
| 15 | ckm-jam | 1.ª diferença ckm.phase fire_burst→stoppage (ticks 6957/7002); ticks 23933→23655 / 21750→23148 |
Cada `--write` demora ≈40 min nesta máquina.

**Dificuldade (WP1, medição de perigo, 12 sementes)**
| Nível | Exposto, mediana antes | Exposto depois | Coberto depois |
|---|---|---|---|
| soldado | sem morte | 17,65 s (reparo 19,3, tabuleiro 17,65) | 0 mortes em 24 |
| veterano | 40,9 s | 9,9 s (reparo 6,3, tabuleiro 14,55) | 5 de 24, a 1.ª aos 103,75 s |
| recruta | 0 mortes | 0 mortes | 0 mortes |
- Alvos §6: soldado 15–25 s e coberto ≥120 s; veterano 8–12 s e coberto ≥60 s (só cumprido agregando reparo+tabuleiro).
- F1: 0 violações em 53/53 ferimentos letais.
- Pilotos de rota: soldado mata 12/12 controlo e 7/12 apoio (D2: 0); veterano 24/24.

**Escolta (WP3, 6 rotas)**
- Parado no posto sem nada: 233,0 → 0,1 s (troço parado máximo 256,5–257,8 → 23–25 s).
- Maior intervalo sem contacto (demolição leste→oeste): controlo 30,4 → 33,5 s; apoio-7 44,1 → 36,7 s. Momentos de contacto 56 → 113 e 20 → 50.
- Missão: controlo 1187,3 → 1196,6 s (19,9 min); apoio-7 1083,0 → 1087,5 s (18,1 min); 6 rotas entre 18,1 e 20,1 min.
- Jogador a ≤10 m do Dudek 81 % da escolta. Clipping 0, empilhados 0.

**ckm (WP2, 14 rotas):** 28 encravamentos, todos dentro de 04:46:00–06:09:30; 21 com o jogador a ≤60 m; 114 ouvida 11, 115 ouvida 8 (era 0). Efeito: rondas da ckm −4,6 ± 3,6 (−1 %), baixas 0,29 → 0,14.

**Desempenho (WP4, Node, 40 soldados, High):** `update()` mediana 1,7391 → 1,3506 ms; passagem de ossos 0,4511 → 0,1993 ms; `skeleton.update` 240 → 40; recomputações reais 164,35 → 27,39; heap por `update()` 453 778 → 369 468 B; Skeletons por soldado 26 (PL) / 8 (DE) → 1.

**Métricas históricas (handoff #1):** atravessamentos de paredes 14 → 0; pares sobrepostos 49–57 → 0; alemão mais próximo 963 → 430 m; Kowal repetição 72 % → 2,2 %; intervalo sem contacto 05:35: 131,5 → 27,5 s (D2); falas/min 2,32/2,71 → 4,18/4,27.

**Ambiente:** `CHROME_EXECUTABLE=/opt/pw-browsers/chromium`; configs por porta `tools/verification/playwright-port-41xx.config.mjs` (4183, 4184, 4185, 4189, 4191); specs regravam PNGs em `docs/verification/` (reverter com `git checkout -- docs/verification/`); a máquina fica sobrecarregada com vários agentes (testes de browser falham por tempo-limite); `npm test` completo leva 15–40 min; 32 unidades = 1 m.

## 9. People, terms & names
- **People:** dono = Brawl2007. Argon = Gemini 4. Codex. Fable 5.1 = direção criativa (PR #56).
- **Personagens:** Kowal (rkm), Dudek, Bąk (ferido), Nowicki, Zieliński, Krawiec, Jan (o jogador). Guarnição da ckm: `ckm_gunner`, `ckm_loader`, `ckm_reserve`.
- **Terms:** ckm wz.30 (metralhadora polaca); MG34; B4 = carga oeste espera Bąk entregue ao médico; T47 = fogo real da ckm; T48 = retirada alemã; CP-A..D e CP-B2 (`cp_m01_b2_reparo`) = checkpoints; D35/H9 = desenho da dificuldade; D2 ligação, D3 morte+CP-B2, D4 garantias F1–F5 (F4 = proteção em cutscenes), D5 seletor + death beat + oferta de nível mais baixo; SP-08 = escolta no corredor; WP1–WP4 = pacotes de 2026-10-22.
- **Names in use:** `src/game/m01-simulation.js`, `m01-difficulty.js`, `m01-corridor.js`, `m01-squad.js`, `m01-barks.js`, `m01-rearguard.js`, `m01-deck-assault.js`, `src/render/m01-characters.js`, `m01-viewmodel.js`, `missions/m01-tczew/mission.json`, `tests/helpers/m01-route.js`, `tools/verification/m01-integration-golden-audit.mjs`, `m01-difficulty-sweep.mjs`, `m01-danger-sweep.mjs`, `m01-ckm-jam-audit.mjs`, `m01-render-perf-bench.mjs`; docs `docs/direction/M01_INTEGRATION_LEDGER.md`, `COD_WAW_WWII_BENCHMARK.md`, `H9_DIFICULDADE.md`, `M01_REACTIVE_DIALOGUE.md`, `M01_CAPTAIN_HANDOFF_2026-10-22.md`; evidências em `docs/verification/m01-runtime/{difficulty-d3-d4,escort-coordination,ckm-jam,render-perf}-2026-10-22/`.

## 10. Work state
| Item | Status | Version / location | Notes |
|---|---|---|---|
| PR #91 (P0–P4, fatias 2/2b, D2, D5) | INTEGRADA SEM VALIDAÇÃO DE JOGO | #80 `4e2588f` | playtest pendente |
| WP1 D3/D4/D5 + sem regeneração | INTEGRADA SEM VALIDAÇÃO DE JOGO | #80 `3eb21b3` | soldado talvez duro de mais |
| WP3 SP-08 + recuo coordenado | INTEGRADA SEM VALIDAÇÃO DE JOGO | #80 `c99a432` | coordenação só na retirada; polaco 155–163 por rever |
| WP2 encravamento ckm + 114/115 | INTEGRADA SEM VALIDAÇÃO DE JOGO | #80 `af3f382` | sem som próprio de encravamento |
| WP4 Skeleton partilhado, alocações | INTEGRADA SEM VALIDAÇÃO DE JOGO | #80 `86e1a1a` | — |
| Ledger e handoff do Capitão | atualizados | `docs/direction/` @ `40787b2` | — |
| Coordenação no combate 05:30–06:10 | PENDENTE | — | linha do benchmark PARCIAL |
| Distância (nenhum alemão < 300 m) | PENDENTE | `m01-deck-assault.js` `safeX` | — |
| Intervalo 33,5 s após demolição leste | PENDENTE | — | corrida por terreno morto |
| Defeito `raid_0530` (`>=` exato vs tolerância 1e-6) | PENDENTE | `m01-simulation.js` | exige emenda própria |
| Renderer: fundir malhas, MSAA/AO e sombras em Medium | PENDENTE | `src/render/` | ≈26 draw calls/soldado → 2–3 |
| Browser `m01.spec.js:59/:346/:478` | sensíveis à carga | — | re-correr com máquina livre |
| Playtest (T52), áudio (T45), polaco nativo, FPS no PC (T49), licença fp-arms-v2, shell do exe, D42 | BLOQUEADA (humano) | — | — |

## 11. Next steps
1. **Next action:** esperar o playtest do dono na candidata #80 (`claude/quirky-heisenberg-9l4m7b` @ `40787b2`) e a decisão sobre a dureza de soldado; se o dono mandar avançar antes, implementar a coordenação aliada no combate 05:30–06:10 numa branch própria a partir da #80 (um só agente, esforço médio/alto, emenda 16 ao golden).
2. Distância do inimigo (`safeX`) e intervalo de 33,5 s.
3. Defeito `raid_0530` com emenda própria.
4. Renderer: fundir malhas por soldado; MSAA/AO/sombras em Medium.
5. Re-correr as 6 specs do browser com a máquina livre.
6. Atualizar ledger e handoff no fim de cada passo; sem `main`, sem deploy.

## 12. Open questions ⚠️
- Soldado (default de jogo novo) ficou muito mais duro (piloto parado morre em 17,65 s; 12/12 rotas de controlo passivas morrem). Opções: manter / suavizar a tabela / jogo novo em recruta.
- Graça de reação de soldado 1,2 s: aceitar ou voltar a 1,5 s?
- Fala 115 ouvida 8/21: suficiente, ou dar-lhe tolerância no realizador?
- Pendentes humanos antigos: licença fp-arms-v2, gravações T45, medição T49, shell do exe (proposta Electron), registar a D42.

## 13. Re-attach checklist
- [ ] `handoff-cod-guerra-m01.md`: este ficheiro (na raiz do repo, branch `claude/quirky-heisenberg-9l4m7b` e `claude/gallant-darwin-xr7jxu`).
- Tudo o resto está no GitHub (candidata #80, issue #72, `docs/direction/`).

---
<sub>Audit: 13/13 sections · 15 rules · 9 corrections · 70+ data points · secrets removed: none found · generated by active-memory</sub>
