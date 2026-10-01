# Claude Code — humanos e animações de M01

Trabalhar numa branch própria a partir de `codex/m01-runtime` actualizado. Ler `AGENTS.md`, `ASSET_CREDITS.md`, `missions/m01-tczew/ASSETS.md`, `assets-m01.json`, `SOURCE_CHECK.md` e `research/weapons/kb_wz29.md`.

## Entrega

Criar um kit de soldados polacos e alemães de Setembro de 1939, em GLB, com rosto, mãos, anatomia, uniforme, capacete, cartucheiras, equipamento e arma correctos. Priorizar um soldado polaco completo antes de multiplicar variantes. O alemão permanece na margem leste; MP40, MG42 e M1 Carbine não entram em M01.

Usar metros, Y para cima, pés na origem e frente/rig documentados. Incluir esqueleto e animações de: parado, andar, correr, agachar, sapador a trabalhar, sapador sob fogo (`pinned`), sentado, ferido e transporte de ferido. Para as mãos da primeira pessoa: disparo, ferrolho após cada tiro, recarga por clipe de cinco e inserção individual parcial do wz.29. Documentar nomes/duração de clips, ossos, sockets e transições; a integração com a simulação fica com o Codex.

Entregar LODs e contagens de triângulos, materiais, texturas, tamanho dos ficheiros e capturas de cada pose em luz de madrugada. Dar orçamento proposto para o Chromebook e explicar como medir; não declarar FPS sem medição. Texturas PBR devem ser próprias ou ter licença compatível com repositório público, identificada por ficheiro e origem. Não extrair assets de Call of Duty ou outros jogos comerciais.

## Limites de trabalho

Não alterar `src/`, combate, relógios, saves, mapa histórico, build ou workflows. Colocar assets numa pasta nova, com manifesto, autoria/licenças e documento de integração. Se alguma animação exigir outro dado do actor, propor o contrato no documento sem implementar a engine.

Abrir PR para `codex/m01-runtime`. M01 continua PROTÓTIPO JOGÁVEL; merge em `main` e publicação ficam para o utilizador. Não começar M02 antes da aprovação do marco 2.
