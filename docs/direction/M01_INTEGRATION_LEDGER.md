# M01 — ledger de integração único

Ler isto primeiro em cada sessão; atualizar só com factos verificados pelo Git. A política está no `AGENTS.md`, secção «uma IA entrega, um jogo recebe».

**Candidata atual:** `claude/quirky-heisenberg-9l4m7b` · PR #80 (draft) · base `main@6697956`, que é o PR #76 já integrado.
Testar a candidata localmente: `git checkout claude/quirky-heisenberg-9l4m7b && npm ci && npm run dev`, depois abrir `http://localhost:5173/COD-guerra/`.
O link de pré-visualização é o que o Vercel publicar no PR #80 para o SHA indicado. Não usar um link de outro SHA.

**Integração pendente:** PR #90 (`claude/busy-ritchie-3fkvk2` @ `9a4ed60`, base = branch da #80). `npm test` 1130/1130 em `bf9042b`; build OK; browser core 29/30 em `bf9042b` (a falha `:435` foi corrigida em `9a4ed60`, 2/2). As linhas marcadas «NO PR #90» passam a «INTEGRADA SEM VALIDAÇÃO DE JOGO» quando o PR #90 for integrado na #80.

| Origem | Conteúdo | Estado na candidata | Prova (SHA / testes) | Próxima ação |
|---|---|---|---|---|
| Física do corpo do jogador (Claude) · P0 do playtest «atravessa paredes, sem gravidade» · D44 | Cápsula com deslize, degraus 0,45 m, gravidade, aterragem (mergulho da câmara, som), dano de queda; sólidos dos props/estruturas/encontros/treliça/casamata; golden T47 emenda 04 | CONCLUÍDA NA ORIGEM (local, não publicada; `claude/busy-ritchie-3fkvk2-phys` sobre `f6913a0`) | commits `cf26d5c`..HEAD da branch; `npm test` 1175 com 2 pilotos corrigidos e re-corridos (55/55); build OK; browser 2/2 (movimento após correcção do teste); auditor 04/03/02 EXIT 0 | revisão crítica; merge `--no-ff` pelo Captain (1.º na ordem); playtest humano (queda, aterragem, degraus) |
| PR #76 (Claude) | V2–V7, Argon #62/#64, T50 #66, T21 #65/#70, pilha #63, áudio, touch #74, registo #73 | INTEGRADA (na `main`) | `6697956` | — |
| PR #78 (Codex) | Fecho de T02 T03 T05 T06 T07 T14 T24 T26 T34 T36 T41 (14 commits sobre `9a1535b`) | INTEGRADA SEM VALIDAÇÃO DE JOGO | merge `c24ee0b`; Node 944/944; build OK; 4 specs de browser em conflito resolvidas mas ainda não corridas | CI do #80 (browser) |
| PR #77 | Regra de integração na versão jogável | INTEGRADA, consolidada no `AGENTS.md` | merge do #77 nesta candidata | — |
| T46 (Claude) | Volume por grupo, reduzir zumbido | INTEGRADA SEM VALIDAÇÃO DE JOGO | `a11f2b8`; Node 940/940; Chromium: as definições persistem | sessão manual de 10 min (humana) |
| PR #79 (Codex) | T40 braços FP e T50 carregamento real; empilhado sobre o #78 | T40 portado no PR #90; metade T50 EXCLUÍDA (a #80 já tem T50) | port `c17cb40`+`a1ed6ff` → `3ca910e` | merge do PR #90 |
| T47 (Claude) · PR #85, `claude/cool-mccarthy-viomu9` | Fogo real da ckm wz.30 no posto S2 (reconstruído, D41); interação com T38 resolvida pela D43 | NO PR #90 (aguarda merge na #80) | `claude/busy-ritchie-3fkvk2-t47i@f3d7386`; Node 1028/1028; 24/24 rotas; revisão crítica com correção aplicada | merge do PR #90; playtest do `CKM_SUPPRESS_SEC` |
| PR #89 (Codex) | Teste de áudio: primeira amostra de rato após o pointer lock | NO PR #90 | `b449007`; base 4/4 FAIL → 8/8 PASS; revisão APPROVE | merge do PR #90 |
| T48 (Claude) · PR #86 | Retirada alemã, silêncio 06:10–06:11, reagrupamento 06:12 | NO PR #90 | `8f9d1b2`; browser german-retreat PASS | merge do PR #90 |
| T38 (Claude) · PR #82 | Posturas de combate atrás de cobertura (D40) | NO PR #90 | `claude/busy-ritchie-3fkvk2-t38@3ff9e4e`; revisão crítica APPROVE_WITH_NOTES | merge do PR #90 |
| T37 (Gemini Argon, refeito) | IK dos pés, inclinação em rampas, níveis por qualidade | NO PR #90 | `claude/busy-ritchie-3fkvk2-t37@8e1f77a`; oráculo bit a bit contra `5a169ba` | merge do PR #90 |
| T43 (Claude) · PR #81 | LOD dos atores com histerese, fades com dither na vegetação e na ponte, correção da boca de arma | NO PR #90 | `claude/busy-ritchie-3fkvk2-t43i@d223cdf`; revisão APPROVE_WITH_NOTES | merge do PR #90 |
| T21 (Claude) | Clarões no horizonte norte, contador `flashes`, `battleReadout` | NO PR #90 | `claude/busy-ritchie-3fkvk2-t21@552652b`; 16/16 | merge do PR #90 |
| T50/T15 (Claude) | Fonte Barlow alojada (OFL), guarda de bundle, tabela do T15 | NO PR #90 | `claude/busy-ritchie-3fkvk2-t50@ca0aea0` | merge do PR #90 |
| T49 pilar E (port do PR #88) | Sem alocações por frame nem uploads vazios | NO PR #90 | `claude/busy-ritchie-3fkvk2-t49@5fde48f`; golden de saída idêntica | B1–B4/C e orçamento no PC |
| Certificação e qualidade (Claude) | `m01.spec.js:78/:426/:435`; qualidade inicial High em GPU capaz | NO PR #90 | `a5cf032`, `92f567e`, `9a4ed60` | merge do PR #90 |
| T24 (Gemini) | Chegada do comboio | INTEGRADA via #78 (ACEITE na origem `e377a07`) | ver a linha do #78 | — |
| PRs #61–#66, #70, #74 | Já incluídos no #76, exceto o #61, duplicado do #62 | INTEGRADA / EXCLUÍDA (duplicado) | ancestralidade em `6697956` | — |
| PR #59 e anteriores (V2–V7) | Absorvidos pelo #76 | INTEGRADA | — | — |
| PRs #44, #56, #58 | Só documentação de campanha (M02–M30) | FORA DO JOGO M01 | — | decisão humana |

**Notas da fusão `c24ee0b`:**
- `tests/fixtures/m01-partials-gameplay-baseline.json`: `sourceSha256` foi definido à mão como o SHA-256 do `m01-simulation.js` combinado (`00964436…`), e `historicalGoldenSha256` ficou com o valor da `main` (`1081cb7c…`).
- `tests/m01-animation-contract.test.js` recalcula os digests das rotas e dá 21/21.
- O `--write-golden` não foi corrido, porque precisa de um checkout de base que não está disponível.

**Por desenvolver:** nenhuma tarefa de código livre; T49 B1–B4/C dependem de medição no PC. **A auditar:** T00. **Humanas:** T45 (áudio), T51, T52 (playtest), sessão de 10 min da T46, licença do fp-arms-v2, escolha do shell do executável de PC.
