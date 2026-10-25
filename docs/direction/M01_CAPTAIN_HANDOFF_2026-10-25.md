# Handoff do Capitão — M01, 2026-10-25

**Candidata única:** PR #80, `claude/quirky-heisenberg-9l4m7b` @ `29ac84dc`. Branch de preparação do Capitão: `claude/exciting-bohr-k8v5xm` (todas as integrações passam por ela; merge `--no-ff` na #80). `main` intocada; sem deploy.
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

## Em curso (não integrado)

- R3-a integrado (ver ledger, 2026-10-25).

## Próximos pacotes (por ordem)

1. R3-a (acima).
2. Simulação: `end/hit` nas rondas da retaguarda e do rkm do Kowal (impactos visíveis); pó que tapa a vista da IA; falas de ferido.
3. R1-b abertura 04:30–04:34 mais viva (pátio, sapadores a inspecionar, mensageiro) e ANIM-1 (fumar, munições, binóculos).
4. R4 INC-1: gestor de atos + cartão às 07:05 + fatia norte 400 × 300 m (plano R4 §6), atrás de `acts.enabled=false`.
5. Asset: alça da kb wz.29 sem entalhe.

## Pendentes humanos

Playtest da #80 (T52), FPS no PC (T49), gravações (T45), revisão nativa do polaco (falas 100–207), licença fp-arms-v2, PDFs das fontes, decisões D-1..D-4 do plano R4, `safeX`/`closeExtraSec`, dureza do nível soldado.

## Notas de operação

- Clone já não é raso (`git fetch --unshallow`): os testes de bloqueio de bytes correm.
- `npm test` completo ≈ 40–60 min; build antes de qualquer browser; matar só por PID.
- Branches de pacote ficam locais (só a branch designada e a #80 recebem push): integrar cedo.
