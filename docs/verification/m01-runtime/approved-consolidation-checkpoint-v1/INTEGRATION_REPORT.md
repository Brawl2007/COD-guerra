# M01 — Consolidação controlada de entregas aprovadas (checkpoint V1)

**Estado:** artefacto de integração técnica; **NÃO é aprovação de produção**. M01 mantém **PROTÓTIPO JOGÁVEL**. Sem alterações em `main`, deploy ou trabalhos de agentes em progresso.

## Fonte e decisões

- Base comum exata: `codex/m01-bridge-portal-material-detail-polish-v1` @ `99309d9cb023cc94a07d41ff863e1362e4460570`.
- A base traz o trabalho de integração anterior e, no histórico, `codex/m01-wz29-viewmodel-visual-runtime`, `codex/m01-locomotive-963-production-asset-runtime` e `codex/m01-panzerzug-production-asset-runtime`; **não foram duplicados**.
- Integração da **Station Architecture Production V2**, [PR #42](https://github.com/Brawl2007/COD-guerra/pull/42), commit `090804776b18c8dc3200497388eb59e83b56205c`, e do **Animation Presentation Contract V1**, [PR #43](https://github.com/Brawl2007/COD-guerra/pull/43), commit `d070225d49840f5bd304a0825c0656651b82c26d`.
- O commit de consolidação foi construído sobre a árvore completa do PR #42 e acrescenta os blobs do PR #43. Os **únicos dois caminhos modificados por ambos** são `DEVELOPMENT_STATUS.md` e `docs/NEXT_CHAT_CONTEXT.md`: as duas introduções foram preservadas e concatenadas mantendo todo o conteúdo anterior. Código, assets e testes das entregas não se sobrepõem no diff.
- Branch nova: `codex/m01-approved-consolidation-checkpoint-v1`, distinta das duas branches fonte.

## Restrições e exclusões

- **Não incluir** os quatro trabalhos que o Capitão informou estarem em progresso; a identificação exata deles ainda exige reconciliação com o quadro operacional do Capitão, pois apenas o número foi informado neste pedido. Qualquer branch sem aprovação inequívoca permanece fora.
- **Não puxar automaticamente** `codex/m01-battlefield-fx-polish-v3`, `codex/m01-vegetation-foliage-production-closeout-v1`, `codex/m01-battlefield-audio-production-pass-v1`, `claude/m01-train-detail-coupling-polish-v1` ou `codex/m01-soldier-motion-clips-production-v1`. Podem ser concluídas em branches, mas não foram abrangidas por este corte de aprovação.
- Não atualizar `main`, publicar preview, acionar `workflow_dispatch`, alterar schema/simulação fora da entrega contratual, nem chamar esta branch de missão aprovada.
- Station V2 preserva envelope de navegação/colliders e 30 clusters de props; Animation Contract é **contrato de dados**, não instalação de uma biblioteca de clips nem conclusão do Animation Resolver.

## Evidências já relatadas pelas branches de origem — NÃO SÃO TESTES DESTE MERGE

| Fonte | Provas na entrega isolada | Limitações |
|---|---|---|
| PR #42 Station V2 | 28/28 Node focados, build passou, browser focado 3 casos, 22 pares antes/depois | Nenhuma certificação completa da integração nem medição de Chromebook |
| PR #43 Animation Contract | 41.083 ticks comparados; 2/2 browser restore; build passou; 343/344 suite Node numa execução; após ajuste da guarda, 38/38 testes focados | A suíte Node integral **não foi repetida**; não há Animation Resolver nem clips novos |

## Validação deste merge e critérios pendentes

- **Verificação estática de árvore** na criação: todos os blobs exclusivos de PR #43 coincidem byte a byte com o SHA de origem; todos os caminhos exclusivos do PR #42 permanecem no SHA da árvore de origem; relatórios e imagens originais preservados. Esta validação é de identidade de ficheiros, não execução.
- [ ] `npm ci` + `npm run build` sobre o HEAD **combinado**.
- [ ] Todos os testes Node relevantes, com relatório do único teste previamente vermelho e da guarda atualizada.
- [ ] Browser focado: Station frontal/oblíqua em High e Low, rollcall, Animation Contract restore de saves 86/89, integração 2/2.
- [ ] Browser completo e campanha M01 do menu ao debrief com 12/12 objetivos, CP-A..D, combate, Stuka e duas demolições, sem regressões.
- [ ] A/B de save/clock/RNG/posições/actors com a base, distinguindo mudanças *só de apresentação* do contrato de animação.
- [ ] Medição real no Chromebook: 1280×720 Low com alvo de 30 FPS medido; não extrapolar desempenho de SwiftShader.
- [ ] Comparação visual pareada e observação humana antes da certificação.
- [ ] Integração posterior das quatro tarefas em progresso somente quando aprovadas e testadas.

**Nota de rigor:** sem acesso a um checkout com dependências ou executor de build neste passo, a integração via API do GitHub só comprova árvore/ancestralidade. Nenhum teste combinado é declarado aprovado.
