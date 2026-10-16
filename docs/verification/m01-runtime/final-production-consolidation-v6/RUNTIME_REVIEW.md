# Revisão semântica V5 → V6

Esta revisão trata a V5 como base autorizada, sem importar novos HEADs sem aprovação. A árvore executável validada é `2a2a56734861b0801234d7ddf3cda66c0100f326`; os commits de provas não mudam produção. O diff de produção tem quatro ficheiros e está limitado a funções de apresentação/ciclo de vida.

| Sistema | Ligação e propriedade verificadas | Preservação / correção |
| --- | --- | --- |
| Game / simulação | `Game` escolhe M01 ou bancada francesa; consome eventos drenados por tick; fila de som é apresentação | Simulação, eventos, IDs, relógio, armas, checkpoints e RNG byte-idênticos. `rebuildSounds` recupera metadata de quatro impactos aéreos já persistidos, sem ampliar Schema 2 |
| Renderer | `three-renderer.js` prepara `M01View`; o loop renderiza mesmo em pausa, sem avançar relógio | Importações, coordenadas, qualidade e iluminação global preservadas. FX de fallback reiniciam o contador e exigem um novo marcador real de muzzle |
| Station / ambiente | `M01Environment` possui Station e recursos próprios; `stationFailure` conserva fallback; Station liberta geometria/material/mapas | Cinco volumes, 140 vãos, três LODs, sete lotes próprios, dez mapas e 30 clusters conservados; não foi importada #54 |
| Bridge | GLBs e estrutura herdam visibilidade da autoridade; detalhes dos portais pertencem a attachments por LOD | `dispose()` liberta os buffers dos lotes antes de remover as raízes; materiais partilhados continuam propriedade do renderer. Sem alteração estrutural ou de colliders |
| Train / locomotiva / Panzerzug | Renderers são inicializados pelo M01View e destruídos antes de `AssetManager`; loaders têm proteção de dispose | Assets, transforms, estados e visibilidade preservados; 65 slots não foram recriados nem reposicionados |
| Ju87 | Loaders protegidos por `disposed`; mixers são parados e roots uncached ao destruir | Restore mantém `aerial`, permitindo pull-out após a chegada real do som. Nenhum novo evento, asset ou caminho de voo |
| Áudio | `Game` aplica qualidade inicial; eventos reais alimentam filas; suspend/reset evitam loops acumulados | Menu aplica qualidade ao áudio antes da primeira alocação; teste captura `AudioContext.createConvolver` real, sem audio mock |
| Página | Game remove listeners próprios e cancela RAF em dispose | `pagehide.persisted` pausa e conserva objetos; unload real destrói. Dois ciclos de resume testados. Admissão de navegação no BFCache real não certificada |
| Personagens / movimento | IDs e rigs carregados pelo renderer existente; clips adicionais presentes nos assets | Contrato determinístico, movimento e aparência preservados. Os seis clips não implementam um Animation Resolver |
| HUD / FX / decals | Presenters lêem simulação; resets chamados no restart/restore; limites por qualidade permanecem | Harness captura o frame real antes da expiração e correlaciona round/damage ID; não injeta eventos nem prolonga efeitos |

Os testes de propriedade dos portais usam Three.js real e três recriações, com nove lotes por fixture e um evento de dispose por lote. O runtime tem attachments dos três LODs: nomes repetidos entre LODs não constituem duplicação. O teste de fallback usa `WeaponViewFx` real e um disparo emitido por controlo da simulação.

A comparação [INVARIANTS.json](INVARIANTS.json) cobre 264 ficheiros protegidos e duas rotas completas contra uma importação independente da V5. Compara snapshots finais, sequência de eventos, CP-A..D e outro. É complementada pelos grupos Node de determinismo e pela suíte browser; não substitui playtest humano.

Não houve conflito textual de merge: deltas externos sem aprovação foram excluídos antes da integração. Cada alteração preserva as funções adjacentes, inclusive Bridge Structural V2 no ficheiro central. Não foi substituído nenhum ficheiro central por uma versão de outra branch.
