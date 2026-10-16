# Revisão das capturas finais de FX

Foram inspecionadas as duas folhas [execução 1](fx-final/fx-followup-1.jpg) e [execução 2](fx-final/fx-followup-2.jpg), que apresentam os oito PNGs originais do run 37822021393. Mantêm câmaras/estados da rota real, sem inventar uma vista favorável.

A treliça domina a câmara de demolição leste e oculta o efeito distante. A vista raid-medium-far também não enquadra claramente o impacto. Essas imagens provam a apresentação/estado do teste, mas **não demonstram qualidade artística dos FX distantes**. Low/High têm sombras e composição esperadas; o gesto de reload muda entre as capturas quentes porque tinham idades diferentes. A comparação de densidade usa agora uma única pausa e preserva o snapshot completo.

Em ambos os cenários corrigidos, no mesmo clock/câmara: **smoke Low 1 / High 4**, **dust Low 5 / High 9**, **0 luzes extras** na fase de fumaça. High→Low→High conserva o relógio e o snapshot, restitui os contadores High e passa a limpeza pós-restore. [Metadata 1](fx-final/1-quality-same-clock.json) e [metadata 2](fx-final/2-quality-same-clock.json) guardam os valores reais. Nenhum FPS foi medido.

A [folha anterior próxima](ci-visual/fx-contact-sheet.jpg) foi reinspecionada: granada apresenta núcleo/fogo e poeira no chão; o campo oeste mostra fumaça persistente junto à Station. Os impactos e blasts distantes têm limitações de enquadramento já presentes na V5; não são apresentados como novos melhoramentos artísticos. As [30 comparações V5/V6](VISUAL_REVIEW.md) continuam pixel-idênticas e foram recomputadas pelo audit final.

[FINAL_CAPTURE_MANIFEST.json](FINAL_CAPTURE_MANIFEST.json) contém hashes/tamanhos das capturas e metadata; [FINAL_EVIDENCE_CHECK.json](FINAL_EVIDENCE_CHECK.json) confirma integridade do relatório global, 264 ficheiros protegidos e cobertura conjunta de 84 casos, explicitamente **sem single-full-suite PASS**.
