# Próxima tarefa independente para Claude — ckm wz.30

Kowal/Bąk foram entregues nos PRs #25/#26; o kit isolado da rkm no #27; o Ju 87 no #28; os vagões no #29; a MG34 no #30. Não repetir estas tarefas. O Codex revê/integra os kits e os comportamentos.

Continuar Brawl2007/COD-guerra numa branch própria, a partir de `codex/m01-runtime` actualizado. Criar a **ckm wz.30 polaca e as animações da guarnição da casamata de M01 — Tczew**.

1. Modelar a arma, o tripé usado em 1939, a cinta e a caixa de munição. Confirmar variante, dimensões e referências; identificar medidas e detalhes estimados.
2. Entregar GLB em metros, +Y vertical, cano para −Z e três LODs. Separar peças móveis e documentar pivôs, boca do cano, pontos de pega e encaixe no tripé.
3. Usar o rig polaco actual para demonstrar atirador e municiador. Criar clips com prefixo `ckm_wz30_*` para espera, pontaria, rajada, alimentação e abandono do posto. Não substituir clips existentes; mostrar uma só arma por atirador.
4. Mostrar capturas da arma, das mãos, da equipa e dos três LODs. Incluir manifesto com escala, triângulos, materiais, texturas, bytes, autoria, licenças, fontes e limitações.
5. Usar novas pastas `assets/models/provisional/m01/weapons/ckm_wz30/`, `tools/assets/m01-ckm-wz30/` e `docs/assets/m01-ckm-wz30/`. Usar ferramentas gratuitas e geração reproduzível.
6. Testar importação, escala, transforms finitos, LODs e ligação dos clips ao rig actual. A galeria é isolada; não declarar playtest ou FPS.

Ler `AGENTS.md`, `DEVELOPMENT_STATUS.md`, `ASSET_CREDITS.md`, `missions/m01-tczew/ASSETS.md`, `mission.json`, `research/equipment-timeline.json` e `docs/assets/m01-soldiers/README.md`.

Não alterar `src/`, modelos existentes, combate, saves, relógios, mapa ou workflows. Não extrair conteúdo de outros jogos. Actualizações pequenas de créditos devem ser identificadas no PR. Documentar sugestões de integração com `grp_ckm_crew`, sem criar regras novas.

Abrir PR para `codex/m01-runtime`, indicando o que foi verificado e o que falta. M01 permanece **PROTÓTIPO JOGÁVEL**. O merge em main e a publicação pertencem ao utilizador.
