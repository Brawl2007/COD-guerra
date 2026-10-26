# M02 — execução e apresentação

Esta pasta distingue jogo contínuo, testes de estado e inspeções de arte. A candidata é `codex/m02-recovery-v1`; o estado de continuidade identifica o último commit de código e o resultado final dos testes.

## Percurso contínuo de produção

[`native-final.json`](native-final.json) e [`native-final.txt`](native-final.txt) registam o build `9f906142128474cf876382b11136faa914049833`, de C01 ao debrief, com **0 mortes, 0 erros de página, vida final 74, Lis ferido evacuado e 12/12 membros do último grupo**. A simulação terminou em 256,15 s. A captura [`native-final-debrief.png`](native-final-debrief.png) mostra o resultado. O pacote M03 conserva as cinco transições, abastecimentos e consequências dos feridos, sem promoção automática ou cura de Lis.

Método: build Vite congelado num servidor estático, clique inicial, teclado Playwright e eventos relativos de rato pelo controlador de input. O planner observa atores/colisões e escolhe controlos; conhece o mapa e os atores, pelo que não representa a habilidade de um jogador humano. Não instala snapshots, teletransporta, mata inimigos, cura o jogador ou altera tempo/RNG. Pausas, mortes e reinícios, se existirem, são reportados. A resolução do percurso foi 480 × 270/Low para manter o rasterizador por software operacional; debrief a 1280 × 720. Não é benchmark gráfico.

As alterações posteriores a esse SHA tratam testes, documentação e apresentação/iluminação. Não alteram a simulação validada: `git diff --exit-code 9f90614 9d8152d -- src/game src/world src/config.js missions/m02-bzura` terminou com código 0. A inspeção visual da versão final está separada abaixo.

[`native-missing-lis.json`](native-missing-lis.json) documenta outro percurso completo anterior, sem contacto com Lis: vida 14, 12/12 homens e Lis desaparecido. É uma execução anterior aos ajustes finais de armas/reação, sem SHA capturado pelo harness antigo; não a atribuir ao build final.

## Verificações

| Evidência | Resultado e alcance |
| --- | --- |
| [`node-m02.txt`](node-m02.txt) | 49 PASS, sem falhas/cancelamentos/skips: missão, combate, navegação, saves/RNG, abastecimentos, Lis, sessão, MP38 e batching. |
| [`node-shared-audio.txt`](node-shared-audio.txt) | 64 PASS, incluindo percurso M01 sem mutação da simulação/RNG. |
| [`node-shared-assets.txt`](node-shared-assets.txt) | 42 PASS nos assets e sistemas M01 reutilizados. |
| [`node-presentation-polish.txt`](node-presentation-polish.txt) | 4 PASS após polimento da apresentação. |
| [`build.txt`](build.txt) | Build das entradas principal, M02 de produto e bancada; aviso de bundle grande conservado. Gerador MP38 também verificado com `--check`. |
| [`browser-auto-quality.txt`](browser-auto-quality.txt) | Autoqualidade M01 no software/Low e seleção de High com quatro texturas efetivamente carregadas; 1 PASS após corrigir uma espera do teste. |
| [`browser-suite.txt`](browser-suite.txt) | Execução anterior: 3 PASS, 1 FAIL. A falha nova lia o tier do terreno antes do frame aplicar a seleção High. A correção espera o tier e as quatro texturas; não remove a asserção. |
| [`browser-repeat.txt`](browser-repeat.txt) | Repetição após polimento: 3 PASS, 1 TIMEOUT. Qualidade, áudio e sessão passam; caso longo de cenas volta a exceder 240 s. Não é uma suite final integral verde. |
| [`browser-weapon-lighting.txt`](browser-weapon-lighting.txt) | 1 PASS no código final `9d8152d`: GLB/arma, áudio audível e snapshot intacto após render, com `WeaponLighting` M01 ativo. Pico 0,187596336, contexto running. |

O teste de áudio usa Espaço no input do jogo e grava a saída Web Audio com MediaRecorder. A execução em `browser-suite.txt` mediu pico **0,468053758**, contexto `running`. Não equivale a audição humana nem a vozes gravadas; o áudio é sintetizado pelo sistema M01.

As primeiras tentativas do caso legado, com 16 capturas novas, excederam os 240 s no SwiftShader: [`browser-cold-captures.txt`](browser-cold-captures.txt). A repetição funcional reutiliza o `snapIfMissing` já existente para as primeiras 12 imagens; as quatro restantes e toda a telemetria/asserções são executadas de novo. O caso passou uma vez em 3,4 min e voltou a exceder o limite na repetição, mesmo com cache. [`browser-capture-cache.json`](browser-capture-cache.json) regista a origem. Não se alteraram timeout nem asserções para obter passagem. As 12 imagens antigas não são apresentadas como capturas finais. A instância tem quota de CPU observada de quatro núcleos e usa rasterização por software; não foi validada uma GPU-alvo.

[`legacy-synthetic-telemetry.json`](legacy-synthetic-telemetry.json) foi gerado pelo trecho legado que chama `renderFrame(0.016, 0.5)`. Os seus valores derivados de FPS/tempo **não são medições reais**. `npm test` global não foi concluído no ciclo anterior; os resultados acima não certificam toda a campanha ou CI remoto.

## Inspeção visual

Capturas do código **`9d8152d`** a **1280 × 720**, High salvo a quinta Medium, na entrada de produto com fixtures explicitamente identificadas. A missão foi pausada para manter a composição; o menu/cartela foram ocultados só pela ferramenta de inspeção. Não constituem percurso contínuo. Relatório com qualidade, assets, clips, falhas, MP38, batching e luz/reflexos M01 da arma em [`visual-inspection.json`](visual-inspection.json). As cinco capturas terminaram sem erros de página; ambiente e GLB ativos.

- [Secção em C01](c01-section.png): modelos/rigs M01 e equipamento na trincheira.
- [Quinta Medium](quinta-medium.png): terreno/atlas/vegetação M01 e arquitetura.
- [Łęczyca High à noite](leczyca-high.png): legibilidade noturna e arma com luz da cena.
- [Leśmierz High](lesmierz-high.png): pátio e fachadas.
- [MP38 High](mp38-high.png): modelo no socket animado M01; o relatório confirma a espingarda anterior oculta.

Foi revista também a referência [M01 V6 Medium](../../m01-runtime/final-production-consolidation-v6/visual/V6-station-yard-medium.png). A M02 partilha os sistemas e assets atuais da M01; a referência não é prova de superioridade artística nem levantamento histórico. Humanos continuam estilizados/provisórios segundo os termos dos assets M01. A licença/proveniência da MP38 está no manifesto e em ASSET_CREDITS.

O contexto WebGL é opaco, sem preservação desnecessária do framebuffer. MSAA é mantido em GPU e desligado em rasterizadores identificados como software; as capturas usam SwiftShader. Os materiais e geometrias High continuam ativos. Não há certificação de FPS em hardware-alvo.

## Reproduzir

Ver [M02_EXECUTION_STATE.md](../../../m02/M02_EXECUTION_STATE.md). Para o percurso: `M02_PLAY_OUT=/tmp/m02-native bash tools/m02/run-native-playthrough.sh`. Para inspeção, com Vite ativo: `M02_VISUAL_OUT=/tmp/m02-visual node tools/m02/capture-mission-presentation.mjs`. Nunca correr dois browsers SwiftShader ao mesmo tempo. Main e produção não foram promovidas.
