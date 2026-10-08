# M01-STATION-VISUAL-FIDELITY-PASS-V3

Estado: **READY_FOR_CAPTAIN_REVIEW**. M01 permanece **PROTÓTIPO JOGÁVEL**.

Base remota confirmada: `codex/m01-station-architecture-production-v2` @ `090804776b18c8dc3200497388eb59e83b56205c`. Branch própria: `codex/m01-station-visual-fidelity-v3`. Código de produção final em `2d608d8a1b52d319ff92ef0e9352733df91b59f7`; o HEAD da entrega inclui a documentação/evidências e é indicado no PR. Sem merge, main, deploy ou integração da bridge structural do Claude.

## Mudança visual

Refinamento da implementação V2. Mantêm-se os cinco volumes, proporções, posições, coberturas e 140 aberturas. Os caixilhos têm perfis e fanlights, travessas com variação discreta e tons de vidro determinados pela localização; portas fechadas têm painéis rebaixados. Peitoris têm bisel e bordo de gotejamento. Juntas radiais interrompem os arcos de alvenaria sem acrescentar novos vãos. A revisão corrige normais dos extremos, perfis, marquises e remates.

Cumeeiras dobradas com folga real, juntas das águas, caleiras abertas e tubos de queda substituem remates planos. As chaminés existentes recebem cabeça em fiadas, tampo com abertura escura e rufo que acompanha a inclinação. Toda a malha continua agrupada nos mesmos sete materiais; não há BoxGeometry adicional, modelo externo, nova sala ou collider.

Materiais originais: tijolo calibrado para aproximadamente 27 × 9 cm, juntas estreitas irregulares, desgaste de arestas e granulação; pedra com poros; madeira pintada com grão e desgaste gradual; metal oxidado; cobertura com fiadas, juntas e variação de rugosidade. Cor e roughness/height têm canais independentes. Dois campos de ruído em coordenadas do mundo reduzem a repetição e sombreiam humidade junto à base. O hash do shader usa multiplicações/fract, sem seno por fragmento, relógio, camera uniform ou RNG da missão. Apenas os materiais privados da Station recebem esse shader. A iluminação global é preservada.

## Fundamentação e estimativas

Referências da V2 mantidas: T24 interno; MBP Tczew [Poczt226, fachada de 1900–1908](https://skarbnica.tczew.pl/5655/tczew-dawny-dworzec-kolejowy-elewacja-frontowa-budynku-dworcowego-7/) e [Poczt734, vista aérea circa 1901](https://skarbnica.tczew.pl/2151/tczew-dawny-dworzec-kolejowy-widok-z-lotu-ptaka/). Apoiam a leitura do pavilhão central, alas, cobertura pouco inclinada, chaminés e marquises; não são um levantamento de 1939. As fotografias continuam apenas referências, sem redistribuição como assets.

São estimados: dimensões já autorizadas da V2, fachada posterior, posição exata das chaminés, perfis de caixilhos, divisões de panes, painéis das portas, secção das caleiras/rufos, materiais e distribuição do desgaste. A V3 acrescenta acabamentos construtivos discretos, sem nova ornamentação ou alegação de precisão fotogramétrica. P4/planta histórica exata continuam pendentes.

## Invariantes e integração

O hash SHA-256 do contrato de volumes e aberturas da V2 é `fbcf9d8e7de9e942e46e304296ac4cd9a9c0a5868c34d77f65396f43e3f4ebaa`. Todos os vértices permanecem no envelope `[-470,-3,20] .. [-330,15,55]`. O collider Station continua `[-460,-3,28] .. [-338,11,55]`; zero colliders novos.

162 ficheiros protegidos são byte a byte iguais à base: gameplay/world/core, missões, armas, saves/RNG, assets, workflows/configuração e todos os outros módulos de render. `src/render/m01-environment.js` e `src/render/m01-view.js` não mudam. Os 30 clusters conservam IDs, posição, contagem e corredores. A rota integral compara snapshots, checkpoints, eventos, hitboxes e futuros de combate sem divergência. A evacuação, stationDrag e autoridade dos relógios continuam na simulação.

Integrar o delta do módulo Station, testes, ferramenta e documentação sobre a V2. Não substituir ficheiros inteiros de integração ao combinar a ponte do Claude. A V3 não inclui nem depende da branch structural. A certificação browser combinada pertence ao próximo checkpoint autorizado. Não fazer merge ou deploy automaticamente.

## Custo próprio

| Recurso | V2 | V3 |
| --- | ---: | ---: |
| LOD0 triângulos | 30.881 | 34.285 |
| LOD1 triângulos | 28.707 | 28.975 |
| LOD2 triângulos | 13.382 | 16.928 |
| Draw calls de material por LOD | 7 | 7 |
| Geometrias dos três LODs | 21 | 21 |
| Texturas | 10 | 10 |
| Instâncias Station | 0 | 0 |
| Atributos geométricos, bytes | 9.632.040 | 10.584.816 |
| RGBA brutos das texturas, bytes | 655.360 | 1.441.792 |

Dois pares de mapas passam a 256² (tijolo/cobertura); três pares permanecem 128². Aumento aproximado: 0,91 MiB de atributos e 0,75 MiB de RGBA; incluindo mipmaps teóricos, 1,91 MiB combinados. Não inclui custos internos do driver/programas, que não foram medidos. Low remove biséis finos, juntas radiais, travessas adicionais, juntas de águas, tubos e corbelamento; mantém a silhueta e molduras legíveis. Os LODs diminuem progressivamente; Low fica abaixo de metade de High. O crescimento de Low é 26,5% no módulo, documentado em vez de escondido. Sem medição/alegação de FPS, VRAM real, Chromebook ou playtest humano.

## Validação e evidências

Ver [comparações](BEFORE_AFTER.md), [contadores](PERFORMANCE.md), `OWNED_RESOURCES.json`, `PROTECTED_FILES.json`, `GAMEPLAY_EQUIVALENCE.json`, relatórios pareados, fixtures comprimidas e logs. Capturas 1280×720 usam saves reais congelados e poses documentadas; não constituem uma partida contínua. Incluem High/Medium/Low, jogador com olho 1,6 m acima do terreno, roof próximo e um CP-D real sob a iluminação posterior da missão. Todos os 34 pares conservam o mesmo hash de estado; não se altera o relógio para produzir luz.

Reprodução:

```sh
node --test tests/m01-station-architecture.test.js tests/m01-environment.test.js tests/m01-environment-props.test.js tests/m01-station-evacuation.test.js tests/m01-station-drag-runtime.test.js
npm run build
CHROME_EXECUTABLE=/caminho/chromium npx playwright test tests/browser/m01-station-architecture.spec.js tests/browser/m01.spec.js --grep 'Station quality|missing optional soldier, aircraft and train|the station evacuation restores'
node tools/verification/m01-environment-equivalence.mjs /caminho/base-v2 docs/verification/m01-runtime/station-visual-fidelity-v3-2026-10-08
CHROME_EXECUTABLE=/caminho/chromium VISUAL_PORT=4185 node tools/verification/m01-station-fidelity-capture.mjs docs/verification/m01-runtime/station-visual-fidelity-v3-2026-10-08 AFTER .
```

A cópia base deve estar em `0908047`, com dependências e build próprios, e a mesma pasta de fixtures deve ser passada a ambas as capturas. O build mantém o aviso preexistente de chunk >500 kB.

Validação concluída: **31/31 Node focados**, build PASS, três casos browser focados verdes em duas execuções finais (fallback/evacuação 2 PASS e qualidade 1 PASS após corrigir a espera da fixture). Não houve retries/skips ou suíte browser integral. **34 pares/68 PNGs** inspecionados em High/Medium/Low, sem erros JS/GLSL/pedidos falhados e com hashes de estado idênticos. Relatórios das falhas anteriores foram preservados e identificados; a falha de reload foi apenas leitura antes do primeiro sync de LOD, corrigida no teste.

O contador de instâncias próprias foi medido em todos os pares (0). O contador global foi omitido nas primeiras 29 AFTER; os cinco Medium retomados o registam. A limitação está explícita no relatório, sem preencher números por inferência. Capturas iniciais pararam num timeout de navegação; as cinco restantes concluíram após aumentar apenas o timeout da ferramenta de captura.

## Limitações restantes

Os materiais continuam sintetizados, com algum tiling perceptível; os vidros são opacos e não possuem reflexos de ambiente. O ritmo estrutural repetido da V2 é obrigatório e permanece reconhecível. A iluminação de madrugada e sombras de marquises continuam escuras em algumas vistas. Não há interiores navegáveis, detalhe de levantamento histórico, aprovação de arte da missão inteira ou benchmark físico. A revisão do Capitão deve avaliar o acabamento durante o jogo, especialmente o jogador oblíquo, porta próxima e roof.

A manutenção da sessão eliminou o trabalho local não publicado da tentativa anterior. Esta entrega recuperou a V2 aprovada, reaplicou o acabamento sobre o mesmo módulo e executou novas verificações; os números antigos não são tratados como evidência desta árvore. Logs desta recuperação preservam falhas geométricas iniciais corrigidas (soleira e folga de cumeeira). Capturas preliminares de REVIEW e execuções anteriores a ajustes finais são identificadas no manifesto, sem apresentação como validação final.
