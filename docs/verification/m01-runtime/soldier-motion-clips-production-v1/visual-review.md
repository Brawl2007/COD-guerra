# Revisão visual — motion clips V1

Revisão do candidato `dbcb3e56015c1902d691c9fdb1783997e86c0a69e7c2abc29135ea773611031c`, em 2026-10-08 UTC. Estado: candidato pronto para revisão do Capitão; aprovação artística humana não atribuída.

Inspeção feita sobre as 12 sheets comparativas nas cinco fases exigidas, seis sheets de compatibilidade (PL/DE, LOD0/1/2) e seis strips cronológicos extraídos dos MP4 finais. São renders reais com GLTFLoader/AnimationMixer e materiais/texturas originais, vistas frontal e lateral. O apoio dos pés foi também verificado numericamente sobre vértices reais da skin a 240 Hz. Os MP4 têm múltiplas poses distintas e as amostras independem da ordem dos seeks.

| Clip | Observação do movimento | Limite para a revisão/integração |
| --- | --- | --- |
| `sprint` | Apoio comprimido, alternância das pernas, recuperação com joelho/tornozelo e voo legíveis; torso inclinado e espingarda segura; início/fim contínuos. | Braços coordenados segurando a arma, sem oscilação livre de braços; um ciclo, solo plano. |
| `crouch_walk` | Quadril consistentemente baixo, passos curtos, sobreposição de apoios e pouca oscilação vertical; mãos/arma acompanham o tronco. | Transição de standing/crouch deverá fazer blend no resolver; base comparativa é crouched_idle, não uma caminhada antiga. |
| `turn_left` | Olhar/ombros antecipam a rotação, pé esquerdo coloca primeiro, peso transfere, pé direito completa e corpo assenta em +90°. | Final está rodado; reproduzir como loop provocaria um salto. Compensação visual de yaw ainda precisa de integração. |
| `turn_right` | Ordem dos pés invertida, continuação do grip destro, giro progressivo e assentamento em −90°. | Não é simples espelhamento do grip da arma; mesma política de saída/compensação do giro esquerdo. |
| `hit_front` | Impulso curto no peito, cabeça com atraso, compressão dos joelhos e recuperação sem deslocar os pés. | Reação discreta, uma intensidade/frente; a direção real precisa vir da simulação. |
| `near_miss_duck` | Cabeça e quadril descem rapidamente, postura baixa mantida brevemente, olhar lateral e recuperação mais lenta; arma mantém grip. | Reação curta de supressão, não novo estado prone/hitbox nem supressão decidida pelo renderer. |

As versões PL/DE e os três LODs mantêm a mesma composição de pose. Não foi observada penetração do chão, cruzamento evidente de braços/arma ou deformação anatómica nas vistas inspecionadas. A geometria/angularidade de LOD2 e o detalhe limitado de tecido/face são dos assets originais preservados. Esta inspeção de vistas não substitui teste de interseção de todas as superfícies nem aprovação humana da animação em jogo.

As comparações são explicitamente `run` para sprint, `crouched_idle` para crouch, `standing_idle` para turn/hit e `pinned` para duck. Não existem clips antigos equivalentes de turn/hit nesta comparação; as imagens mostram poses de referência, não um falso antes/depois do mesmo evento.

Iterações rejeitadas: sprint com IK limitado por alcance e apoio deslizante; primeiro vídeo estático por action clamped/paused. Só os artefactos regenerados depois das correções estão nesta pasta. A inspeção temporal usa frames dos MP4 codificados; não é alegada reprodução audiovisual humana nem qualidade AAA.
