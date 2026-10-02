# Terceiro agente — Ju 87 B-1 de M01

Tarefa independente da engine e dos soldados atribuídos ao Claude. Pode ser entregue a um agente de código com acesso ao repositório; este documento não activa nem contrata um serviço.

Criar uma branch própria a partir de `codex/m01-runtime` actualizado e abrir PR para essa mesma branch. Ler `AGENTS.md`, `DEVELOPMENT_STATUS.md`, `ASSET_CREDITS.md`, `missions/m01-tczew/ASSETS.md`, `assets-m01.json`, `SOURCE_CHECK.md` e as fontes de avião em `research/SOURCES.md`.

## Primeira entrega

Produzir **um Ju 87 B-1 verificável**, em GLB, para substituir a silhueta de caixas do raid de M01. Priorizar esta entrega antes de comboios ou outras aeronaves. Fazer geometria original com fonte reproduzível ou usar um modelo cuja licença permita redistribuição no repositório público. Referências e dimensões ainda por verificar devem permanecer identificadas como provisórias.

- Variante B-1 de 1939: conferir asa em gaivota invertida, trem fixo/carenagens, motor/radiador, cabine e cauda em fontes da época. Não substituir por variantes D/G.
- Referência do manifesto actual: comprimento 11,1 m, envergadura 13,8 m, altura 4,24 m; confirmar as fontes antes de dar a escala como validada.
- Convenções: 1 unidade = 1 metro, +Y para cima, frente em −Z, escala aplicada; documentar a origem/pivô para voo. O modelo não deve conter coordenadas globais de Tczew.
- Separar nós estáveis para fuselagem, hélice e freios de mergulho. Documentar e verificar animação da hélice e eventual clip dos freios, sem avançar eventos de missão.
- Entregar três LODs; LOD0 até 15.000 triângulos, conforme o orçamento proposto em `assets-m01.json`. Documentar triângulos reais, materiais, texturas e bytes por LOD.
- Materiais/texturas próprios, CC0 ou CC-BY com licença e crédito por ficheiro. Aplicar a política do repositório público; não extrair conteúdo de jogos.

## Ficheiros e verificação

Usar novas pastas `assets/models/provisional/m01-aircraft/`, `tools/assets/m01-aircraft/` e `docs/assets/m01-aircraft/`. Entregar manifesto, fonte/generador reproduzível, autor/licença, fontes de referência e instruções de integração. Actualizações de créditos existentes devem ser pequenas e indicadas no PR.

Importar o GLB num visualizador com Three.js e medir bounding box, orientação, pivô, triângulos e materiais. Verificar posições/normais finitas, nomes dos nós, LODs e animações carregadas. Guardar capturas de frente, lado, cima e silhueta à distância de voo de M01. A galeria isolada deve identificar-se como tal; não é um playtest nem medição de FPS do Chromebook.

## Integração

Não alterar `src/`, modelos de soldados/armas, mapa, relógios, dano, saves, build ou workflows. O Codex liga o kit aos raids existentes e revê o PR. Propor no documento qualquer dado adicional necessário, sem implementar estado na engine. M01 permanece **PROTÓTIPO JOGÁVEL**; merge em `main` e publicação pertencem ao utilizador.
