# M01 T50 — integração segura da entrega Argon (revisão)
Base imutável: 4c6f7bebee27b68af3bea8ad086da1dffbca0084. Branch: `argon/m01-loading-and-bundle-t50`.

## Auditoria do ZIP entregue
O ZIP recebido não podia ser aplicado literalmente: substituía `src/main.js` (assinatura de Game, HUD/event listeners e saves) e `src/assets/asset-manager.js` (contratos `load`, `get`, `beginSession`, `dispose`, OBJ+MTL), e removia IDs do HTML. Manifesto fictício usava URLs GLB inexistentes. A folha @font-face apontava para WOFF2 ausente no ZIP.

## Implementado
- Entrada da UI permanece original, só faz import() assíncrono do grafo Game; V7 continua dona dos controles e da simulação.
- Observador de bytes/carregamentos reais partilhado por todos os AssetManagers, e 100% somente quando `M01View.ready` resolve sem falhas obrigatórias.
- GLTF/OBJ/MTL/texturas reais: progresso de rede, tentativas limitadas só para erros transitórios; saída do asset e comportamento de fallback continuam os originais.
- Ecrã discreto no menu, retriable por reload (não finge recuperação em-place).
- Code splitting Vite de Three e GLTF extensions; resultados exatos no artefacto CI.

## Não implementado/limites
- Fonte Barlow self-hosted: o pacote não inclui o binário WOFF2, só licença. Conservado fallback existente, sem afirmações falsas de ausência de FOUT.
- O progresso em bytes só é exato nos pedidos que comunicam Content-Length; contagem de modelos é por pedido real e pode variar durante descoberta.
- Não foi ativado dispose agressivo em objetos partilhados: a V7 já possui o seu controlo de liberação.
- Sem prova de FPS ou melhorias de transfer total; precisam de medições no hardware alvo.
- Sem deploy/merge. Testes e vídeo de Chromium são executados pelo CI.
