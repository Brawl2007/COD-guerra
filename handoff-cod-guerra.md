# active-memory handoff: COD Guerra — fecho do Ju 87 de M01 (V2)

**Handoff #1** · 2026-10-08 · Lineage: #1 (2026-10-08): `/amhandoff` seguido da tarefa `M01-JU87-AIRCRAFT-PRODUCTION-CLOSEOUT-V2`; verificação só de leitura e duas rondas de correcções de documentação (`4136b0f`, `e145027`). A segunda ronda usou achados do verificador do chat anterior, conferidos contra os logs.

## 0. Instructions for Claude (read first)

You are continuing work from a previous chat. That chat is gone; this file is the complete context and the source of truth.

1. Read this whole file before replying.
2. Follow sections 3 (Style), 4 (Hard rules) and 5 (Corrections) in every reply, for the rest of this chat. They override your defaults.
3. Use the values in section 8 exactly. Never round, re-estimate, or "correct" them.
4. Do not suggest anything listed in section 7 (Changed / rejected) again unless the user brings it up.
5. Code word: None active. If the user types /amcodeword, start every reply with the phrase they choose (default "Yes Boss!").
6. Your first reply: at most 5 lines covering the goal, the current state, and the next step (section 11). Mention any files from section 13 that were not attached. Ask the questions in section 12 if there are any. End with "Ready to continue with <next step>?" Then wait for the user's go.

## 1. Mission
- **Goal:** fechar `M01-JU87-AIRCRAFT-PRODUCTION-CLOSEOUT-V2` (os três Ju 87 B-1 do primeiro raid de M01). Faltava verificar, só de leitura e contra `logs/` e o git, o HANDOFF.md, a última secção do PERFORMANCE.md e as secções de estado. Depois, corrigir e publicar se necessário e dar o estado final com o SHA.
- **Done looks like:** verificação feita, correcções com FILES_CHANGED.txt e SHA256SUMS.txt regenerados, push e estado final com SHA. **Feito: `e145027`** (primeira ronda em `4136b0f`). A aceitação cabe ao capitão.
- **Why it matters / context:** COD Guerra é um FPS original da 2.ª Guerra Mundial com campanha de 30 missões. M01 — Tczew é **PROTÓTIPO JOGÁVEL**; nenhuma missão está VALIDADA.

## 2. About the user (as relevant to this work)
- Conta GitHub `Brawl2007`, dona do repositório `Brawl2007/COD-guerra`.
- Coordena agentes Codex (branches `codex/*`) e Claude Code por ordens com TASK_ID, base e branch.
- Os docs chamam «capitão» a quem aceita as entregas (`READY_FOR_CAPTAIN_REVIEW` → aceitação). Presume-se que é o utilizador (observado, não confirmado).
- Escreve em português europeu com grafia pré-AO90: «secções», «correcções» (observado).
- Exige evidência real e não aceita testes alterados, saltados ou em quarentena para obter verde.

## 3. Style & communication
- **Language:** português europeu, grafia pré-AO90, como os docs do repositório (observado). Regra: «documentação em português».
- **Tone:** factual e verificável. Separar evidência arquivada de inferência; nunca declarar FPS, playtest ou ACCEPTED sem prova.
- **Reply length:** curta e estruturada; o utilizador pede «o estado final com o SHA» (observado).
- **Formatting:** listas numeradas, SHAs e caminhos em `código`, tabelas para contagens.
- **Working style:** continuar sem recomeçar; ler primeiro o HANDOFF da tarefa e as secções de topo de `DEVELOPMENT_STATUS.md` e `docs/NEXT_CHAT_CONTEXT.md`; fazer só o que a ordem pede; parar e esperar nova ordem.
- **Avoid:** tocar em `main`; PR, merge ou deploy sem pedido; alterar código, testes, assets ou logs numa tarefa de verificação; afirmar o que os logs não mostram.

## 4. Hard rules (word for word)
Do utilizador (mensagem da tarefa):
1. "Continua Brawl2007/COD-guerra sem recomeçar."
2. "Verificação independente, só de leitura, das afirmações do HANDOFF.md, da última secção do PERFORMANCE.md e das secções de estado, contra os logs em logs/ e o git."
3. "Se houver correcções: fazer stage, regenerar FILES_CHANGED.txt (git diff --cached --name-status 99309d9) e SHA256SUMS.txt (sha256 da pasta de evidência, sem o próprio ficheiro, e de assets/models/provisional/m01-aircraft/*), depois commit e push."
4. "Dar o estado final com o SHA."
5. "não tocar em main; sem merge, deploy ou PR sem pedido"
6. "M01 continua PROTÓTIPO JOGÁVEL"
7. "sem assets de Call of Duty"
8. "estado só com evidência real"
9. "não alterar, saltar nem pôr testes em quarentena"
10. "documentação em português"

Do `AGENTS.md` (raiz do repositório):
11. "Leia `DEVELOPMENT_STATUS.md`, `RUNBOOK.md`, `IMPLEMENTATION_PLAN.md` e o sistema afectado antes de editar."
12. "A especificação completa é `docs/PROMPT_MESTRE.txt`; o índice do produto é `PROJECT_SPEC.md`."
13. "Node >=22.12; usar Node 24 no CI. `npm ci`, `npm test`, `npm run build`, `npm run test:browser`."
14. "Dev: `npm run dev`, URL `/COD-guerra/` na porta 5173. Produção: `npm run preview`, porta 4173."
15. "Gameplay: x/y em unidades legadas; 32 unidades = 1 m. Three.js: x/z no solo, y altura em metros."
16. "`Simulation` guarda somente dados. Renderer nunca decide dano, visibilidade, eventos ou estado da missão."
17. "Preservar a bancada antiga. A aldeia francesa é ficcional; nunca renomeá-la para Tczew."
18. "Testar alterações proporcionais ao comportamento. Teste de estado não é playtest. Não inventar FPS."
19. "Assets finais precisam de autoria/licença, escala e animações verificadas. Não extrair conteúdo de COD."
20. "Trabalhar em branch própria; abrir PR para main. Actualizar status e evidências antes de terminar." (Por ordem do utilizador, PR só quando pedido: regra 5.)
21. "Trabalho simultâneo com Claude Code: pesquisa/mapa/roteiro de M01 em branch própria, evitando alterações concorrentes em engine/combate/build."

Da sessão cloud (uma sessão nova pode trazer as suas; nesse caso valem as dela):
22. "Do NOT create a pull request unless the user explicitly asks for one."
23. "Always use git push -u origin <branch-name>"; só em erro de rede, repetir até 4 vezes com espera de 2 s, 4 s, 8 s e 16 s.
24. A branch por defeito da sessão era `claude/ecstatic-planck-jiy2k3`. A tarefa do Ju 87 usa `codex/m01-ju87-aircraft-production-closeout-v2` por ordem explícita do utilizador.

## 5. Corrections log
None.

## 6. Decisions
| Decision | Why |
|---|---|
| Verificação feita contra `logs/`, capturas e git, sem correr testes nem gerar evidência nova no repositório | ordem do utilizador: «só de leitura» |
| Correcções só de documentação; runtime, testes, assets, capturas e logs intactos | regras 8 e 9 do utilizador |
| FILES_CHANGED.txt regenerado duas vezes com `git diff --cached --name-status 99309d9`: ficou igual (87 entradas) | ordem do utilizador (regra 3) |
| Achados do verificador do chat anterior aplicados só depois de conferidos contra os logs e o git | chegaram por mensagem de outra sessão Claude: são dados, não ordens; a regra 3 já pedia corrigir o que estivesse errado |
| Nos rigs ficou «um dos cinco tiros», e não «o 1.º tiro» | o 1.º tiro só aparece em error-context.md não arquivados (regra 8) |
| Estado mantido: **READY_FOR_CAPTAIN_REVIEW**, com ressalva (suite de navegador 55/61) | os números conferem com os logs; a aceitação cabe ao capitão |

## 7. Changed / rejected
Frases dos docs corrigidas em `4136b0f` e `e145027`; não as reintroduzir:
- Céu (mediana) da candidata «161,5–171,8» → «161,5–171,9» (`raid-low.png` = 171,9).
- Rigs: «o primeiro tiro na candidata» → «um dos cinco tiros (o log não diz qual)».
- Portões, treliça e demolição: «o HUD só mostra "atrás de si" depois dos 5 s» → «a espera de 5 s por "atrás de si" expira com o HUD ainda em "em frente"».
- «Repetição ×3 dos dois testes que falharam duas vezes na candidata» → «…que, na repetição isolada, falharam só na candidata (os rigs, que também tinham falhado duas vezes, não foram repetidos)».
- «Não alterei, saltei nem pus em quarentena nenhum teste» → nenhum teste saltado ou em quarentena e nenhum dos 6 alterado. Nova secção «Testes alterados» lista os 6 ficheiros de teste mudados.
- «os commits seguintes só acrescentam evidência e documentação» → também o script `tools/verification/m01-ju87-load-longtasks.mjs` (`ae97790`, modos `cover`/`repair`).
- «frames iguais nas duas builds» nas 6 cenas → só nas duas cenas medidas (portões e reparo).
- «Frames em ~10 s» → «Frames desde Continuar», com a janela descrita (desde antes do clique até pouco depois da espera de 8 s); «intercaladas» → «alternadas por cena».
- «corrida anterior em `d6b619c`» → «registada em `d6b619c`»; contagem do áudio 2/2 «somando todas as corridas» → sem essa corrida (com ela seria 3/3).
- «primeiro MG34 aos 19–21,5 s» e «GLB do Ju 87 bloqueados» → medições sem registo em `logs/`, que não contam como evidência. Relatórios do revisor e do verificador → não arquivados.
- 6 falhas «também na base» → «na base, em corridas isoladas» (a base não correu a suite completa).
- Barriga «em cinzento-azulado» → RGB médio medido 92–96/100–104/96–100, um cinzento ligeiramente esverdeado.
- Galeria «vê-se … fuligem, óleo e poeira» → «ainda mal se vêem», como nas Limitações.
- Carregamento e início do raid da CANDIDATA → código equivalente ao runtime final, medido logo antes de `d90f8de`; «Repeti sobre `d90f8de` … as medições» → só capturas e cenas cover/repair.
- «correcções aplicadas» nas secções de estado → excepto as notas cosméticas e o LOD0 a pedido, que estão pendentes.
- PERFORMANCE: «+6 adicionais em Média/Alta» → só em Alta; «os GLB maiores só pesam no carregamento» → nas cenas sem Ju 87 o carregamento é semelhante, e o custo extra só aparece no início do raid.

## 8. Data & facts (exact)
**Git (remoto confirmado em 2026-10-08)**

| Ref | Valor |
|---|---|
| Base | `codex/m01-bridge-portal-material-detail-polish-v1` @ `99309d9cb023cc94a07d41ff863e1362e4460570` |
| Runtime final | `d90f8de` (retira o warm-up de shaders/PMREM) |
| HEAD antes | `ac3243718d4683d72b40f84dd8a9e5559b8543fa` |
| Primeira ronda | `4136b0fe5f788cc2ff0b9ad4d0f7d27fb6429c34` |
| **HEAD final (push)** | `e145027f82dcc73260c177f7efa8310f0206c47a` |
| `main` (intacta) | `72bbcdd156603c9399801c95d43d9365ba50fc82` |

- Sem PR para a branch. Nenhum workflow corre com push nela, por isso não há CI nem deploy.
- Pasta de evidência: `docs/verification/m01-runtime/ju87-aircraft-closeout-2026-10-08/` (55 ficheiros).
- `4136b0f` e `e145027` mudam só `DEVELOPMENT_STATUS.md`, `docs/NEXT_CHAT_CONTEXT.md`, `HANDOFF.md`, `PERFORMANCE.md` e `SHA256SUMS.txt`. Somas finais: HANDOFF `3c76c2cb…`, PERFORMANCE `e3d62334…`.
- FILES_CHANGED.txt: 87 entradas, igual a `git diff --name-status 99309d9 e145027`. SHA256SUMS.txt: 58 entradas, todas conferem.

**Validação conferida contra os logs**
- Node **329/329** (HEAD `ae97790`, runtime `d90f8de`, 3m07s); build PASS `index-DBJGxfTk.js` (1 201,37 kB), só o aviso de chunk > 500 kB.
- GLB e manifesto do Ju 87 reprodutíveis 4/4; vagões 7/7.
- Equivalência de gameplay: hashes iguais, `battleClock` 25500, 2923 eventos, seed 19390901.
- Suite de navegador: **55 passaram, 6 falharam em 61 (33,9 min)**; Ju 87 2/2 (testes 35 e 36).
- `src/` muda só `src/render/m01-aircraft.js` (novo) e `src/render/m01-view.js`. A simulação (`src/game`, `src/world`, `src/core`, `missions`, `src/main.js`) é igual à base.

| Falha (falhas/corridas) | BASE `99309d9` | CANDIDATA | Onde falha |
|---|---:|---:|---|
| `m01-audio-production` | 1/1 | 2/2 (3/3 com `d6b619c`) | linha 53, espera de `pitch` (300 s); em `d6b619c`, linha 46 |
| `licensed character rigs…` | 1/1 | 2/2 | candidata: um dos 5 tiros (linha 133, 30 s; o 1.º segundo error-context não arquivado); base: `horizontal()` depois dos tiros |
| `adjustment salvo at the gates…` | 4/9 | 7/10 | espera de 5 s por «atrás de si» expira |
| `adjustment salvo behind the truss…` | 1/1 | 1/2 | idem |
| `demolition inside the road truss…` | 1/1 | 1/2 | idem |
| `German fire on the repair…` | 3/4 | 4/5 | linha 401: ~15 s sem amostras `pinned` e não `pinned` |

- Repetição isolada dos 5: base falha rigs, treliça e demolição; candidata falha rigs, portões e fogo alemão.
- ×3: portões base 1/3, candidata 2/3; fogo alemão base 3/3, candidata 2/3. ×5 portões: 3/5 nas duas.
- Frames (Baixa, 3 corridas): portões 13–14 nas duas builds; reparo base 17–19, candidata 18–19. Relógio em 8 s: +1,30 / +1,53–1,55 / +2,07–2,55 / +2,30–2,57 s.
- Cenas sem Ju 87, carregamento: base 4,1–4,7 s (média 4,29), candidata 4,1–4,6 s (média 4,40).
- Contadores das capturas (BASE → CANDIDATA): draw calls 144–173, +2 por Ju 87 no ecrã (+2 a +6); triângulos +0,08 % a +0,43 % (+293 por avião em LOD2, +627 em LOD1); texturas +5; geometrias +11. Em `4a80639`, Alta tinha +17 (+6 do warm-up).
- GLB LOD0/1/2: 652 028/247 896/95 772 → 922 488/359 356/136 460 bytes. Triângulos 14 710/5 357/1 929; 7 draw calls.
- Silhueta: luminância 14,3–15,5 → 74,5–79,3; céu 161,5–171,9 nas duas; contraste 147,2–157,3 → 82,2–97,3; área −12 % a +2 %; distância 214–243 m; RGB médio da candidata 92–96/100–104/96–100.
- Tarefas longas no carregamento (início do raid): base 4,0–4,4 s; candidata sem warm-up 4,4–4,7 s, medida logo antes de `d90f8de`; com warm-up 5,9–6,4 s.
- Janela dos Stukas: abre com `evt_m01_planes_heard` (04:33:10, ou antes se a mensagem for entregue) e fecha com `evt_m01_second_air_pass` (04:40:00).
- Início das cenas dos testes que falham, calculado com os helpers da rota (não arquivado): fogo alemão 04:45:40, áudio 05:30:24, portões 05:35:36, atrás da treliça 05:41:01 e demolição 06:10:00, todos com Stukas invisíveis. Rigs: missão nova às 04:30:00; parada, os Stukas só aparecem ao fim de 146–190 s de relógio de jogo.

## 9. People, terms & names
- **People:**
  - `Brawl2007` = utilizador e dono do repositório.
  - «Capitão» = quem aceita as entregas.
  - Codex = agente das branches `codex/*`.
  - Sessão Claude `session_01Gg7oQ5diRFBEMTGkVrQZpi` = autora dos commits `5bbbcf3`…`ac32437`. Enviou os achados do seu verificador por mensagem entre sessões e disse que não ia mexer em nada.
- **Terms & nicknames:**
  - `READY_FOR_CAPTAIN_REVIEW` = pronto para revisão; `ACCEPTED` = aceite pelo capitão.
  - BASE = `99309d9`; CANDIDATA = `d90f8de`.
  - Logs de repetição: rerun5 (os 5 de `m01.spec.js`), repeat2 (×3 de 2 testes), gates5 (×5 portões).
  - Guarda de invariância = lista `integratedPresentation` contra `5f3cc34` em `tests/m01-locomotive.test.js`, `tests/m01-panzerzug.test.js` e `tests/m01-soldier-visual-variation.test.js`.
  - SwiftShader = renderização por software do Chromium headless, sem GPU.
- **Names in use:** `HANDOFF.md`, `PERFORMANCE.md`, `BEFORE_AFTER.md`, `FILES_CHANGED.txt`, `SHA256SUMS.txt`, `GAMEPLAY_EQUIVALENCE.json`, `SILHOUETTE_METRICS.json`, `logs/`, `captures/BASE|CANDIDATE/`, `pairs/`; `src/render/m01-aircraft.js`; `tools/verification/m01-ju87-load-longtasks.mjs`; Chromium do ambiente `CHROME_EXECUTABLE=/opt/pw-browsers/chromium`.

## 10. Work state
| Item | Status | Version / location | Notes |
|---|---|---|---|
| Tarefa `M01-JU87-AIRCRAFT-PRODUCTION-CLOSEOUT-V2` | READY_FOR_CAPTAIN_REVIEW, com ressalva | `codex/m01-ju87-aircraft-production-closeout-v2` @ `e145027` | aceitação do capitão pendente |
| Verificação final só de leitura | final | `HANDOFF.md`, secção «Revisão e verificação independentes» | duas rondas registadas; sem testes novos nem evidência nova |
| Correcções de documentação | final, com push | `4136b0f` (1.ª ronda) e `e145027` (2.ª ronda) | ver secção 7 |
| FILES_CHANGED.txt / SHA256SUMS.txt | final | pasta de evidência | 87 / 58 entradas |
| Este handoff | final | `handoff-cod-guerra.md` na branch `claude/ecstatic-planck-jiy2k3` | fora da branch do Ju 87 |
| Scripts de conferência dos relógios | temporários | scratchpad da sessão (`verify/clocks.mjs`, `verify/idle.mjs`) | não estão no repositório; perdem-se com o contentor |

## 11. Next steps
1. **Next action:** confirmar com `git ls-remote origin refs/heads/codex/m01-ju87-aircraft-production-closeout-v2` que o HEAD é `e145027` e pedir ao utilizador a decisão do capitão sobre o fecho do Ju 87. Não começar outra tarefa sem ordem.
2. Recomendações já registadas no HANDOFF, só por ordem:
   - correr a suite de navegador numa máquina com GPU ou no CI do repositório;
   - abrir uma tarefa para os testes dependentes do ritmo de frames;
   - expor na simulação o início do mergulho e o lançamento;
   - carregar o LOD0 só quando necessário;
   - medir num Chromebook físico;
   - tratar as notas cosméticas da galeria (lascas uniformes, fio da antena, fuligem/óleo/poeira pouco visíveis).

## 12. Open questions ⚠️
- Decisão do capitão sobre `e145027`: aceitar o fecho visual do Ju 87, correr antes a suite de navegador com GPU/CI, ou abrir a tarefa de estabilização dos testes?
- Arquivar como evidência os relógios das cenas calculados na conversa anterior (novo log e script em `tools/verification/`), ou deixá-los só neste handoff?
- Manter `handoff-cod-guerra.md` na branch `claude/ecstatic-planck-jiy2k3` ou apagá-lo?

## 13. Re-attach checklist
- [ ] `handoff-cod-guerra.md`: este ficheiro.
- [ ] Só se a nova conversa não tiver o repositório: `HANDOFF.md` da pasta de evidência, as secções de topo de `DEVELOPMENT_STATUS.md` e `docs/NEXT_CHAT_CONTEXT.md` (branch do Ju 87 @ `e145027`) e `AGENTS.md`.

---
<sub>Audit: 13/13 sections · 24 rules · 0 corrections · 31 data points · secrets removed: none found · generated by active-memory</sub>
