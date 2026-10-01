# Claude Code — continuação dos assets de M01

A entrega de soldados até `b198a75` foi preservada e integrada na branch de trabalho do Codex. Não refazer os seis modelos, os quinze clips, a fonte MakeHuman CC0 ou os geradores. Ver `docs/verification/m01-runtime/characters/README.md` para evidências e limites; GLTFLoader, SkeletonUtils e AnimationMixer já estão ligados à engine.

O Codex continua a encenação da estação e a lógica da missão. Se Claude voltar a colaborar, trabalhar numa branch própria a partir de `main` actualizado, sem alterar `src/`, saves, combate, relógios ou workflows.

## Próxima entrega independente

Completar o equipamento dos actores que ainda usam proxies: primeiro o rkm wz.28 de Kowal e depois o kb wz.98a de Bąk saudável. Ler `AGENTS.md`, `ASSET_CREDITS.md`, `missions/m01-tczew/ASSETS.md`, `assets-m01.json`, `SOURCE_CHECK.md`, `research/equipment-timeline.json` e os contratos do kit existente. Medidas e referências devem ter fontes e incertezas identificadas; não reaproveitar uma arma com outro nome.

Entregar GLB em metros, rig/sockets compatíveis, LODs, nomes de malhas/ossos, poses de pega e manifesto de dimensões/triângulos/texturas/licença. Capturar a arma nas mãos, incluindo magazine e ferrolho, para permitir revisão antes de ligar à simulação. Evitar dependências e ferramentas pagas. Usar geometria/texturas originais ou dados com licença compatível; não extrair de jogos comerciais. A licença global permanece decisão do proprietário.

Depois, rever a anatomia/encaixe das mãos e mangas do kit já integrado, sobretudo em primeira pessoa, propondo geometria própria com terminações fora do enquadramento. Os actuais clips de arma são usados pela engine; preservar os nomes e timings ou documentar qualquer mudança necessária, sem editar a engine.

Abrir PR para `codex/m01-runtime`. Não começar M02. M01 continua PROTÓTIPO JOGÁVEL; merge em `main` e publicação ficam para o utilizador. Não alegar playtest humano nem FPS de Chromebook a partir de SwiftShader.
