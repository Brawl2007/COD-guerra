# Handoff do Capitão — M01, 2026-10-25

**Candidata única:** PR #80, `claude/quirky-heisenberg-9l4m7b` @ `8b9a29e6` (atualizado no fim de 2026-10-25). Branch de preparação do Capitão: `claude/exciting-bohr-k8v5xm` (todas as integrações passam por ela; merge `--no-ff` na #80). `main` intocada; sem deploy.
**Ordem em vigor:** proposta de reconstrução da M01 + adenda WaW/WWII (2026-10-23); decisão do proprietário: **opção B** (expandir para lá das 07:05 com atos e áreas novas) e fontes do repositório (PDFs em falta listados em `M01_R4_EXPANSION_PLAN.md` §5).
**Documentos:** `M01_R0_REQUIREMENTS_MATRIX.md` (auditoria), `M01_R4_EXPANSION_PLAN.md` (atos e áreas), `M01_INTEGRATION_LEDGER.md` (topo = integrações de 2026-10-24/25).

## Integrado na #80 (todos INTEGRADA SEM VALIDAÇÃO DE JOGO)

| Pacote | Merge na #80 | Conteúdo | Testes |
|---|---|---|---|
| R1-a bombas | `a4b253c7` | 11 impactos 04:34–04:43, morte/ferimento/abalo com cobertura, guarnição oeste (6), atordoamento do jogador, emenda 16 | 1605/1606 + fix T49 |
| R6-a/R6-b mãos e ADS | `a4b253c7` | braços pelas mãos, dedo no gatilho, recarga, corte da coronha em ADS | focados |
| R8-a desempenho | `a4b253c7` | 2 draw calls por soldado (240 → 80 em High) | focados |
| VIS-a clarões | `a4b253c7` | um clarão por tiro real, fumo, contraste alemão | focados |
| R2-a secção polaca | `0ff4e03a` | avisos, reações variadas, ordens do Zieliński, emenda 17 | 1654/1654 |
| R2-b IA alemã | `3c8e576d` | fogo polaco real, `safeX` 450 → 250, linhas alternadas, granadas/busca latentes, emenda 18 | 1684/1684 |
| R2-c longe | `cdb33864` | impactos NPC, traçantes MG34/rkm/ckm, som com atraso | 1700/1700 |
| R7-a áudio | `29ac84dc` | rio contínuo, ferrovia, outra margem, sem repetições seguidas, etiqueta T45 | 1710/1710 |
| R3-a sapadores | `77175d85` | etapas (cabo, emenda, teste falhado → 2.º corte), cobertura atrás de sacos, retirada espaçada, emenda 19 | 1745/1745 |
| R1-b abertura | `1d201f43` | ato I com 20 homens em atividade, reações aos aviões, emenda 20 | 1743/1743 + 38/38 |
| R4 INC-1 atos | `8b9a29e6` | gestor de atos, cartão às 07:05, Ato VII-a norte (`?act=vii-a`), `acts.enabled=false` | 1797/1797 |

## Em curso (não integrado)

- R3-a integrado (ver ledger, 2026-10-25).

## Próximos pacotes (por ordem)

1. Ato VII-a: visual da fatia (relevo, montes de terra, árvores, legibilidade dos alemães a 70–140 m) e duração do combate (30–60 s é curto).
2. Simulação: pó que tapa a vista da IA; falas e socorro de feridos; granadas/busca alemãs a aparecer nas rotas (hoje latentes).
3. R4 WP seguintes (VII-b durante o dia, VII-c retirada ~17:00) só com fontes; Lisewo jogável depende de D-1.
4. Asset: alça da kb wz.29 sem entalhe; dedos de baixa resolução.

## Pendentes humanos

Playtest da #80 (T52), FPS no PC (T49), gravações (T45), revisão nativa do polaco (falas 100–207), licença fp-arms-v2, PDFs das fontes, decisões D-1..D-4 do plano R4, `safeX`/`closeExtraSec`, dureza do nível soldado.

## Notas de operação

- Clone já não é raso (`git fetch --unshallow`): os testes de bloqueio de bytes correm.
- `npm test` completo ≈ 40–60 min; build antes de qualquer browser; matar só por PID.
- Branches de pacote ficam locais (só a branch designada e a #80 recebem push): integrar cedo.

## Atualização 2026-11-04 — pacote 1 feito (fora da #80)

Ramo `claude/dreamy-ramanujan-6v62vr` @ `19cf713c` (base `b41d947d`); ver a entrada do topo do ledger. Visual do VII-a, segundo escalão alemão com pausa, saves do VII-a esquema 2, prioridade de desenho dos inimigos e correções da revisão crítica. **Não integrado na #80** (aguarda autorização), `acts.enabled=false`, sem playtest, `npm test` completo não corrido.

Decisões pendentes do proprietário: (a) duração não garantida: ativo 93–204 s conforme a semente; afinar o 2.º escalão ou aceitar; (b) MG34 da orla quase não disparam na pausa (suprimidas pela linha); fogo de supressão às cegas seria regra nova; (c) CP-F na pausa (só existe CP-E; morrer no 2.º escalão repete tudo); (d) alemães a 120–250 m ocupam 4–8 px: aproximar a vaga ou aceitar.

Visual ainda provisório: árvores pequenas em forma de guarda-chuva, face do parapeito desfocada em primeiro plano, padrão de relva cortada perto do jogador. +12 % triângulos não medidos no PC de referência.

Próximos pacotes mantêm-se: 2 (pó que tapa a vista da IA, socorro de feridos, granadas/busca alemãs reais), 3 (VII-b/VII-c só com fontes), 4 (alça da kb wz.29).

## Checkpoint 2026-11-05 (fim de sessão por limite de uso)

Ramo `claude/dreamy-ramanujan-6v62vr` (push feito). Integrado nesta sessão, tudo **INTEGRADA SEM VALIDAÇÃO DE JOGO**, fora da #80 (sem merge na main/#80, sem deploy):
- VII-a ronda 2 (CP-F, MG34 em pausa, 2.º escalão em 2 grupos) e correção de equilíbrio do fogo às cegas; VII-b (INC-2) e VII-c (INC-3) com correções das revisões críticas (`a5b86321`, `68892bce`); pacote 4 (alça kb wz.29, dedos) e visual ronda 2; specs de browser com esperas partilhadas; cartões dentro da largura; áudio dos atos da área (VII-b assobio/canhões, VII-c anoitecer), provisório T45.
- Pacote 2 do ato 1 (pó, Dudek, granadas; emenda 21) integrado em `5b319f31`; revisão crítica pediu correções (saves antigos de CP-D/fim recusados após safeX 190; granada através do pó) — **em curso no ramo local `pkg2-fixes`** (worktree do agente), ainda não integrado.
- M02: pré-produção do proprietário em `docs/m02/preproducao/`; M02 do Gemini integrada (`426045ee`, só ficheiros novos, testes M02 32/32, build principal inalterado); auditoria e plano em `docs/direction/M02_BZURA_DESIGN.md`; auditorias por secção em `docs/m02/auditoria-2026-11-04/` (N, O, P, Q por fazer). A M02 passa para outra conversa (prompt dado ao proprietário); esta linha integra a entrega dela por merge `--no-ff`.

Trabalho em curso em worktrees locais (recuperar por `git worktree list` / ramos locais; NÃO estão no remoto): `pkg2-fixes` (prioridade alta), `acts-continue` (Continuar/saves antigos dos atos), `area-render-polish` (maca, clarão, luzes), `area-perf` (auditoria de desempenho), `triage-specs` (12 specs sob carga), `area-consistency` (workflow de coerência VII-a/b/c). Revisão crítica de toda a branch lançada como workflow (resultado por recolher).

Fontes: muzeum1939.pl (H01-PDF), pl/en.wikipedia.org, konflikty.pl e warhistory.org **não resolvem na rede desta sessão** — pedir ao proprietário que os permita ou forneça os PDFs; até lá a tarde de 1/9 (VII-b/VII-c) fica RECONSTRUCTED/BLOQUEADA. Pistas a ler para D-2: Michaelis, *SS-Heimwehr Danzig in Poland 1939*; Angolia, *Cloth Insignia of the SS*. Tensão por resolver: research/SOURCES.md marca H01-PDF «INTEGRAL» mas o R4 diz que não foi guardado.

Próximo: integrar `pkg2-fixes` (auditoria emenda 21), `acts-continue`, `area-*`, `triage-specs`; recolher a revisão crítica; `npm test` completo no SHA final; ledger, `DEVELOPMENT_STATUS.md`, guia de playtest (rascunho no scratchpad da sessão).
