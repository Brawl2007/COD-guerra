# M01-STATION-ARCHITECTURE-PRODUCTION-V2

Estado: **READY_FOR_CAPTAIN_REVIEW**. M01 continua **PROTÓTIPO JOGÁVEL**.

Base remota confirmada antes de editar: `codex/m01-bridge-portal-material-detail-polish-v1` @ `99309d9cb023cc94a07d41ff863e1362e4460570`. Branch de entrega: `codex/m01-station-architecture-production-v2`. HEAD final é entregue na resposta e no ref remoto; este documento integra a própria árvore entregue. Sem merge da branch structural do Claude, alteração de main, deploy ou workflow_dispatch.

## Transformação entregue

O bloco visual de 122 × 27 m foi substituído por malhas originais em metros, agrupadas por material: pavilhão central elevado, duas alas e dois volumes de extremidade, coberturas de quatro águas pouco inclinadas, beirais/cumeeiras/rufos, cinco chaminés e marquise de plataforma apoiada na parede. A laje de madeira e as antigas janelas sobrepostas foram removidas somente da apresentação.

140 aberturas nas quatro fachadas têm faces de alvenaria realmente ausentes, lintéis em arco segmentar, peitoris, jambas/soffits, caixilhos e planos recuados fechados. Recessos de janela 0,95 m e portas 1,35 m geram parallax físico. Paredes internas/backing escuro simplificado criam o shell visual; portas fechadas e vidros opacos preservam a leitura de um edifício inacessível. Não existem salas, portais navegáveis ou novos colliders. Pavimento quase rente ao terreno e marquise a mais de 5 m de altura mantêm o corredor livre.

Cor/roughness e bump originais usam escala métrica: alvenaria aproximada de 27 × 9 cm, roof, madeira, pedra e metal. Variação estável por posição, embasamento mais sujo/húmido, material partilhado e três LODs. Sem GLB ou imagem externa obrigatória; o fallback não depende de downloads. Envelope desconhecido/alterado rejeita a substituição e mantém o bloco visual sólido original.

## Fundamentação e limites históricos

Antes de editar foram consultados `map-layout.json`, `TczewWorld`, T24 e os documentos internos da missão. Âncora física preservada: min `[-460,-3,28]`, max `[-338,11,55]`. Envelope visual já autorizado no mapa: X −470…−330, Z 20…55; altura máxima anterior 15 m. Todos os vértices novos ficam dentro desse envelope, incluindo roof/chaminés. A planta da missão continua marcada **RECONSTRUCTED**, com o levantamento P4 pendente.

Referências fotográficas efetivamente inspecionadas: MBP Tczew, **Poczt226**, fachada de 1900–1908 ([acervo](https://skarbnica.tczew.pl/5655/tczew-dawny-dworzec-kolejowy-elewacja-frontowa-budynku-dworcowego-7/)), e **Poczt734**, vista aérea circa 1901 ([acervo](https://skarbnica.tczew.pl/2151/tczew-dawny-dworzec-kolejowy-widok-z-lotu-ptaka/)). A biblioteca identifica a estação antiga de Stüler, 1856–1857. Pavilhão elevado, alas baixas, coberturas pouco inclinadas, presença de chaminés e marquises têm apoio nas imagens. Não foi usada a estação moderna.

**Estimados/adaptados ao envelope:** medidas exatas, subdivisão em cinco volumes, ritmo/número de vãos, fachada traseira, profundidade dos recessos, desenho interno, posição das cinco chaminés e pavimento. As imagens precedem 1939; não comprovam todas as alterações posteriores. Sem acrescentar edifícios externos, grandes ornamentos, torre/arquitetura de fantasia ou uma estação moderna. As fotografias são referências, não assets redistribuídos. Não afirmar levantamento exato ou arte final de toda a missão.

## Invariantes e validação

**28/28 testes Node focados**: oito novos de arquitetura, props/ambiente existentes, evacuação e integração do arrasto. Verificam envelope, ausência de parede dentro do vão por raycast, profundidade/oclusão de jambas, LODs, conteúdo determinístico byte a byte, mapas reproduzíveis, rotas, recursos libertados uma vez, ciclo de recriação e fallback para âncoras inválidas. UUIDs internos do Three.js são excluídos do determinismo visual; não existe consumo de RNG da simulação.

**Comparação integral de rota com a base: PASS.** Saves, checkpoints, eventos, hitboxes, posição/estado das personagens, objetivos, relógios, HP/munição e RNG coincidem. **133 ficheiros protegidos são byte a byte iguais**, incluindo game/world/core, missão, assets, ponte, train/wagons/locomotiva/Panzerzug, personagens, viewmodel e prop layout; hashes em `PROTECTED_FILES.json`. Todos os anchors/features e obstáculos permanecem iguais. Os 30 clusters de props mantêm posições/quantidades/composição.

**Build PASS**, Vite 8.3.1 / Node 24.19.0. JS 1.209,33 kB / gzip 325,33 kB; aviso preexistente de chunk >500 kB continua. `git diff --check` passa.

**Browser: três casos focados verdes, zero retries/skips**, em duas execuções: fallback opcional e evacuação real passaram na execução inicial; qualidade/menu/checkpoint/reload passou após corrigir a fixture. A primeira fixture tentava operar o seletor de qualidade escondido no menu; timeout preservado em `logs/browser-initial.json` e trace textual/contexto (recursos binários de rede do trace completo omitidos). A correção usa Voltar ao menu → qualidade → Continuar, sem alterar timeouts ou runtime. O primeiro teste Node também rejeitou UUIDs aleatórios internos do Three.js; a verificação foi corrigida para comparar o conteúdo renderizado e preservar o RNG real. Não se declara que a execução inicial foi toda verde.

**22 pares finais antes/depois** com mesmo save congelado e hash de estado, incluindo frontal, oblíqua, roof, annexes, yard, plataforma, janela/porta, upper window, roll-call e evacuação, High/Low e duas vistas Medium. Zero erros de página/rede. Frontal e roof são câmaras elevadas de inspeção artística explicitamente encenadas; a chamada usa a câmara dentro do abrigo existente. Capturas são continuações/frames congelados de estados alcançados por controlos de simulação, com câmara reposicionada; não são playtest humano ou partida contínua. Suíte browser completa não executada; fica para integração.

## Custo e revisão visual

Station isolada: **7 materiais/lotes de desenho**, **21 geometrias** prontas para três LODs, **10 mapas 128 × 128** partilhados, **0 instâncias**, **0 colliders adicionados**. LOD0/1/2: **30.881 / 28.707 / 13.382 triângulos**. Sombras podem acrescentar passes de desenho; não confundir sete lotes com o total do frame.

Na frontal High: **74 → 66 calls**, **375.567 → 403.436 triângulos**, **37 → 46 texturas**. Low: **60 → 52 calls**, **342.803 → 353.173 triângulos**. Medium: **71 → 63 calls**, **361.201 → 386.896 triângulos**. Todos os contadores observados, incluindo geometrias e instâncias, estão em `PERFORMANCE.md` e `COMPARISON.json`. `renderer.info` de geometrias inclui caches e recursos renderizados previamente; não é somente a Station. A ordem de anexação assíncrona dos portais foi normalizada por ordenação na comparação; quantidades, identidades e lotes são iguais. Sem FPS inventado; performance no Chromebook continua pendente.

Inspeção visual: silhueta fracionada e cobertura inclinada legíveis em High/Low; fachadas de topo deixam de ser cegas; recessos/canopy/soleiras legíveis de perto; chão e props mantêm rotas. Texturas sintetizadas e ritmo de vãos ainda apresentam repetição moderada. O shell é simplificado e fechado. Revisão artística/histórica do capitão, P4 e hardware físico continuam necessários.

## Ficheiros e integração com Claude

- `src/render/m01-station-architecture.js`: malhas originais, materiais, LOD, diagnóstico e lifecycle.
- `src/render/m01-environment.js`: import, substituição exclusivamente do trecho Station em `buildArchitecture()` antes do dressing do hut, `station.sync()` e `station.dispose()`.
- `src/render/m01-view.js`: remove janelas falsas da Station em `buildTerrain()`, omite somente `id==='station'` dos lotes visuais de `syncSolids()` quando o novo root está pronto, acrescenta diagnóstico `stationArchitecture`. O objeto/collider do world não é removido.
- `tests/m01-station-architecture.test.js`, `tests/browser/m01-station-architecture.spec.js`, `tools/verification/m01-station-capture.mjs`.
- Créditos, status/contexto e esta pasta de evidências.

Ao integrar com **M01-BRIDGE-STRUCTURAL-PRODUCTION-CLOSEOUT-V2**, preservar os trechos da ponte no `m01-environment.js`/`m01-view.js`. Aplicar somente os pontos acima, revendo `buildTerrain()`/`syncSolids()` semanticamente. Não copiar os dois ficheiros completos sobre a branch do Claude. Esta entrega não contém nem integra aquele trabalho.

Reprodução focada: `node --test tests/m01-station-architecture.test.js tests/m01-environment.test.js tests/m01-environment-props.test.js tests/m01-station-evacuation.test.js tests/m01-station-drag-runtime.test.js`; `npm run build`; `CHROME_EXECUTABLE=/caminho/chromium npx playwright test tests/browser/m01-station-architecture.spec.js`; captura pela ferramenta desta tarefa. Ver [antes/depois](BEFORE_AFTER.md), [contadores](PERFORMANCE.md), relatórios pareados, logs e hashes nesta pasta.
