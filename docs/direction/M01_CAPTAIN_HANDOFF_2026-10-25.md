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

## Atualização 2026-11-04 (b) — pacote 2 feito (fora da #80)

Ramo local `pkg2-act1` (base `57ba50f3`, o pacote 1; sem push). Pó que tapa a vista da IA (cada cratera guarda uma nuvem; `M01Simulation.sees()`; o renderer desenha `renderState.dust`), socorro de feridos (Dudek trata e leva ao ombro os feridos da guarnição oeste, @@HANDOFF_AID@@) e granadas/busca alemãs (`safeX` 190, `closeExtraSec` 100, defensor ajoelhado como alvo, homem imobilizado lança): ver a entrada do topo do ledger e `docs/verification/m01-runtime/pkg2-act1-2026-11-04/README.md`. Golden **emenda 21**. **Não integrado na #80** (aguarda autorização), `acts.enabled=false`, sem playtest, `npm test` completo não corrido.

Decisões pendentes do proprietário: (a) `safeX` 190 / `closeExtraSec` 100 (o homem da frente fica a 23 m da retaguarda; a luta do jogador passivo dura mais; com 250 / 60 a granada volta a ser latente); (b) a busca com movimento só tem uma causa (a nuvem da granada, quando o esquadrão já está nas linhas mais fundas) e é rara: se se quer vê-la mais, é preciso deixar os homens em `hold` procurar, ou uma nuvem mais longa; (c) nas rotas de apoio (o jogador cobre o tabuleiro) o assalto não chega a 32 m de ninguém: sem granada, por desenho do R2-b; (d) polaco das falas 220–226 por rever por falante nativo; (e) raio/vida das nuvens (valores GAMEPLAY, `src/game/m01-dust.js`).

Próximos pacotes mantêm-se: 3 (VII-b/VII-c só com fontes), 4 (alça da kb wz.29).

