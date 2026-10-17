# M01 — ledger de integração único

Ler isto primeiro em cada sessão; atualizar só com factos verificados pelo Git. A política está no `AGENTS.md`, secção «uma IA entrega, um jogo recebe».

**Candidata atual:** `claude/quirky-heisenberg-9l4m7b` · PR #80 (draft) · base `main@6697956`, que é o PR #76 já integrado.
Testar a candidata localmente: `git checkout claude/quirky-heisenberg-9l4m7b && npm ci && npm run dev`, depois abrir `http://localhost:5173/COD-guerra/`.
O link de pré-visualização é o que o Vercel publicar no PR #80 para o SHA indicado. Não usar um link de outro SHA.

| Origem | Conteúdo | Estado na candidata | Prova (SHA / testes) | Próxima ação |
|---|---|---|---|---|
| PR #76 (Claude) | V2–V7, Argon #62/#64, T50 #66, T21 #65/#70, pilha #63, áudio, touch #74, registo #73 | INTEGRADA (na `main`) | `6697956` | — |
| PR #78 (Codex) | Fecho de T02 T03 T05 T06 T07 T14 T24 T26 T34 T36 T41 (14 commits sobre `9a1535b`) | INTEGRADA SEM VALIDAÇÃO DE JOGO | merge `c24ee0b`; Node 944/944; build OK; 4 specs de browser em conflito resolvidas mas ainda não corridas | CI do #80 (browser) |
| PR #77 | Regra de integração na versão jogável | INTEGRADA, consolidada no `AGENTS.md` | merge do #77 nesta candidata | — |
| T46 (Claude) | Volume por grupo, reduzir zumbido | INTEGRADA SEM VALIDAÇÃO DE JOGO | `a11f2b8`; Node 940/940; Chromium: as definições persistem | sessão manual de 10 min (humana) |
| PR #79 (Codex) | T40 braços FP e T50 carregamento real; empilhado sobre o #78 | PENDENTE: draft com o autor ativo | `bea4149` | integrar quando estiver pronto e com CI |
| T24 (Gemini) | Chegada do comboio | INTEGRADA via #78 (ACEITE na origem `e377a07`) | ver a linha do #78 | — |
| PRs #61–#66, #70, #74 | Já incluídos no #76, exceto o #61, duplicado do #62 | INTEGRADA / EXCLUÍDA (duplicado) | ancestralidade em `6697956` | — |
| PR #59 e anteriores (V2–V7) | Absorvidos pelo #76 | INTEGRADA | — | — |
| PRs #44, #56, #58 | Só documentação de campanha (M02–M30) | FORA DO JOGO M01 | — | decisão humana |

**Notas da fusão `c24ee0b`:**
- `tests/fixtures/m01-partials-gameplay-baseline.json`: `sourceSha256` foi definido à mão como o SHA-256 do `m01-simulation.js` combinado (`00964436…`), e `historicalGoldenSha256` ficou com o valor da `main` (`1081cb7c…`).
- `tests/m01-animation-contract.test.js` recalcula os digests das rotas e dá 21/21.
- O `--write-golden` não foi corrido, porque precisa de um checkout de base que não está disponível.

**Por desenvolver:** T38, T43, T47, T48. **A auditar:** T00, T49. **Humanas:** T45, T51, T52 e a sessão de 10 min da T46.
