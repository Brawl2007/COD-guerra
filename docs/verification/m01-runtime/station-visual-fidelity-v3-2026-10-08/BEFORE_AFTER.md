# Comparação visual V2 → V3

34 pares, 68 PNGs originais 1280×720: High 14, Low 14 e Medium 6. Cada par tem exatamente o mesmo hash de estado congelado, pose, qualidade, viewport e save. Zero erros JS/GLSL ou pedidos falhados nos pares finais. [COMPARISON.json](COMPARISON.json) e relatórios pareados conservam hashes e diagnósticos.

22 imagens V2 são copiadas sem edição da evidência já aprovada em 0908047; os dez fixtures antigos são idênticos aos dez primeiros fixtures atuais. As outras 12 imagens são novas capturas sobre essa mesma base. A V3 tem 29 capturas iniciais mais cinco retomadas após timeout de navegação. Não houve recaptura dos 29 resultados válidos. Os relatórios brutos e logs preservam proveniência.

As câmaras player-frontal e player-oblique têm o olho 1,6 m acima do terreno; as outras são poses de inspeção. player-oblique-later usa um CP-D real (06:11:09), comparado com a mesma pose às 04:30. Não se altera arbitrariamente o relógio para mudar a luz. O fixture comprimido regista as poses e saves. As capturas são frames pausados, não um playtest humano; a ferramenta usa cadência de captura de 10 Hz para controlar o renderizador de software. Essa cadência não mede FPS nem muda o jogo.

## Inspeção

Todos os pares foram inspecionados em folhas comparativas, com porta/janela, roof-detail e jogador sob luz posterior também vistos a 1280×720. Frontal e roof mostram a melhoria mais imediata da cobertura: fiadas e variação de reflexão substituem a superfície quase preta. As vistas oblíquas e do jogador conservam a escala e revelam os perfis dos caixilhos, peitoris e remates. Perto da plataforma, juntas estreitas, gradação do tijolo, portas com painéis e fundos escuros coerentes dão profundidade sem abrir espaços navegáveis.

Low mantém molduras, fundos e a cobertura legível; as juntas radiais, travessas finas e tubos de High desaparecem como previsto. Medium mantém uma leitura intermédia. Roll-call e evacuação conservam enquadramento, atores e props; a Station não aparece diretamente nessas duas poses e elas servem como controlo de interferência.

Limitações observadas: ritmo de vãos repetido, obrigatório da V2; materiais ainda sintetizados, com breakup/tiling perceptível no roof próximo; vidro opaco pouco reflexivo; sombras fortes sob a marquise na madrugada. O acabamento melhorou, mas estas imagens não certificam uma campanha acabada nem precisão do edifício em 1939.

## Pares originais

| Câmara | Qualidade | Antes | Depois |
| --- | --- | --- | --- |
| frontal | high | [V2](screenshots/BEFORE-frontal-high.png) | [V3](screenshots/AFTER-frontal-high.png) |
| oblique | high | [V2](screenshots/BEFORE-oblique-high.png) | [V3](screenshots/AFTER-oblique-high.png) |
| roof | high | [V2](screenshots/BEFORE-roof-high.png) | [V3](screenshots/AFTER-roof-high.png) |
| annexes | high | [V2](screenshots/BEFORE-annexes-high.png) | [V3](screenshots/AFTER-annexes-high.png) |
| yard | high | [V2](screenshots/BEFORE-yard-high.png) | [V3](screenshots/AFTER-yard-high.png) |
| platform | high | [V2](screenshots/BEFORE-platform-high.png) | [V3](screenshots/AFTER-platform-high.png) |
| window-door | high | [V2](screenshots/BEFORE-window-door-high.png) | [V3](screenshots/AFTER-window-door-high.png) |
| window-upper | high | [V2](screenshots/BEFORE-window-upper-high.png) | [V3](screenshots/AFTER-window-upper-high.png) |
| roll-call | high | [V2](screenshots/BEFORE-roll-call-high.png) | [V3](screenshots/AFTER-roll-call-high.png) |
| evacuation | high | [V2](screenshots/BEFORE-evacuation-high.png) | [V3](screenshots/AFTER-evacuation-high.png) |
| frontal | low | [V2](screenshots/BEFORE-frontal-low.png) | [V3](screenshots/AFTER-frontal-low.png) |
| oblique | low | [V2](screenshots/BEFORE-oblique-low.png) | [V3](screenshots/AFTER-oblique-low.png) |
| roof | low | [V2](screenshots/BEFORE-roof-low.png) | [V3](screenshots/AFTER-roof-low.png) |
| annexes | low | [V2](screenshots/BEFORE-annexes-low.png) | [V3](screenshots/AFTER-annexes-low.png) |
| yard | low | [V2](screenshots/BEFORE-yard-low.png) | [V3](screenshots/AFTER-yard-low.png) |
| platform | low | [V2](screenshots/BEFORE-platform-low.png) | [V3](screenshots/AFTER-platform-low.png) |
| window-door | low | [V2](screenshots/BEFORE-window-door-low.png) | [V3](screenshots/AFTER-window-door-low.png) |
| window-upper | low | [V2](screenshots/BEFORE-window-upper-low.png) | [V3](screenshots/AFTER-window-upper-low.png) |
| roll-call | low | [V2](screenshots/BEFORE-roll-call-low.png) | [V3](screenshots/AFTER-roll-call-low.png) |
| evacuation | low | [V2](screenshots/BEFORE-evacuation-low.png) | [V3](screenshots/AFTER-evacuation-low.png) |
| frontal | medium | [V2](screenshots/BEFORE-frontal-medium.png) | [V3](screenshots/AFTER-frontal-medium.png) |
| window-door | medium | [V2](screenshots/BEFORE-window-door-medium.png) | [V3](screenshots/AFTER-window-door-medium.png) |
| player-frontal | high | [V2](screenshots/BEFORE-player-frontal-high.png) | [V3](screenshots/AFTER-player-frontal-high.png) |
| player-oblique | high | [V2](screenshots/BEFORE-player-oblique-high.png) | [V3](screenshots/AFTER-player-oblique-high.png) |
| roof-detail | high | [V2](screenshots/BEFORE-roof-detail-high.png) | [V3](screenshots/AFTER-roof-detail-high.png) |
| player-oblique-later | high | [V2](screenshots/BEFORE-player-oblique-later-high.png) | [V3](screenshots/AFTER-player-oblique-later-high.png) |
| player-frontal | low | [V2](screenshots/BEFORE-player-frontal-low.png) | [V3](screenshots/AFTER-player-frontal-low.png) |
| player-oblique | low | [V2](screenshots/BEFORE-player-oblique-low.png) | [V3](screenshots/AFTER-player-oblique-low.png) |
| roof-detail | low | [V2](screenshots/BEFORE-roof-detail-low.png) | [V3](screenshots/AFTER-roof-detail-low.png) |
| player-oblique-later | low | [V2](screenshots/BEFORE-player-oblique-later-low.png) | [V3](screenshots/AFTER-player-oblique-later-low.png) |
| oblique | medium | [V2](screenshots/BEFORE-oblique-medium.png) | [V3](screenshots/AFTER-oblique-medium.png) |
| platform | medium | [V2](screenshots/BEFORE-platform-medium.png) | [V3](screenshots/AFTER-platform-medium.png) |
| player-frontal | medium | [V2](screenshots/BEFORE-player-frontal-medium.png) | [V3](screenshots/AFTER-player-frontal-medium.png) |
| player-oblique | medium | [V2](screenshots/BEFORE-player-oblique-medium.png) | [V3](screenshots/AFTER-player-oblique-medium.png) |
