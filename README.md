# COD Guerra

FPS original da Segunda Guerra Mundial em desenvolvimento. Nesta branch, **M01 — Tczew: A Primeira Manhã** é um protótipo jogável. A bancada ficcional **Estrada de Cinzas**, França de 1944, continua acessível no selector de missão. A campanha de 30 capítulos permanece em desenvolvimento; nenhuma missão está declarada VALIDADA.

A fundação usa Three.js e Vite. Preserva os modelos OBJ originais e acrescenta mira/dano em 3D, obstrução do cano, cobertura com exposição real, checkpoints completos e pausa consistente. Modelos, mãos, texturas e sons ainda são provisórios.

## Executar

Node >=22.12 (CI usa Node 24):

```sh
npm ci
npm run dev
```

Abrir `http://127.0.0.1:5173/COD-guerra/`. WASD move; rato olha; clique esquerdo dispara; botão direito mira; R recarrega; G lança granada; Shift corre; Esc pausa. M01 acrescenta E para interagir, C para agachar, V para alça de mira e Espaço para saltar intro/outro. Iniciar e Retomar capturam o rato e habilitam áudio por gesto.

```sh
npm test
npm run build
npm run preview
```

Preview de produção: `http://127.0.0.1:4173/COD-guerra/`.

```sh
npx playwright install --with-deps chromium
npm run test:browser
```

Os testes de navegador iniciam o preview do build e usam controlos reais para disparo, recarga, movimento, pausa e restauração. Instruções completas, diagnóstico e alternativa de Chromium estão em [RUNBOOK.md](RUNBOOK.md).

## Estado e especificação

| Documento | Conteúdo |
| --- | --- |
| [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) | O que funciona, o que é parcial e o próximo passo |
| [QUALITY_REPORT.md](QUALITY_REPORT.md) | Evidências, limites dos testes e performance ainda não medida |
| [PROJECT_SPEC.md](PROJECT_SPEC.md) / [docs/PROMPT_MESTRE.txt](docs/PROMPT_MESTRE.txt) | Requisitos e especificação integral |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Marcos de implementação |
| [missions/m01-tczew/README.md](missions/m01-tczew/README.md) | Pesquisa, mapa, roteiro e contrato de M01 integrados do PR #8 |
| [STORY_BIBLE.md](STORY_BIBLE.md) / [research/SOURCES.md](research/SOURCES.md) | Elenco, continuidade e fontes com grau de verificação |
| [ASSET_PIPELINE.md](ASSET_PIPELINE.md) / [ASSET_CREDITS.md](ASSET_CREDITS.md) | Carregamento, licenças e placeholders |

## Arquitectura

- `src/game/simulation.js` contém a simulação independente do navegador. `Game` coordena input, áudio, HUD e um único loop.
- `src/game/m01-simulation.js`, `src/world/tczew-world.js` e `src/game/wz29.js` implementam o estado separado de Tczew em metros, eventos, objectivos, gates e checkpoints. `src/render/m01-view.js` apresenta esse estado na mesma engine.
- `src/world/spatial.js` partilha raycasts 3D entre jogador, NPCs e explosões. 32 unidades do mapa legado equivalem a um metro; Y planar converte para Z da cena.
- `src/render/three-renderer.js` representa o estado; não decide dano, percepção nem progressão. O renderer antigo permanece no repositório como referência.
- `src/assets/asset-manager.js` usa os loaders oficiais, cache e fallback. GLB riggado final ainda precisa de assets e validação.
- `src/game/sector-battle.js` mantém duas batalhas reduzidas da bancada. M01 tem cinco agendas próprias, actores e baixas com IDs persistentes; a encenação continua simplificada.

O checkpoint guarda JSON de actores, munição, recarga, granadas, missão, sectores, relógio e gerador aleatório. Continuar usa `localStorage` na origem do navegador; saves incompatíveis mostram erro recuperável.

## GitHub Pages

O workflow único `.github/workflows/pages.yml` testa PRs. Após merge, testa e publica `dist` em Pages; o deploy depende da validação. Em Settings → Pages, escolher GitHub Actions como source se ainda não estiver configurado. O prefixo de produção é `/COD-guerra/`; a branch de engine só actualiza o site após merge.

Não há conteúdo extraído de Call of Duty. Assets finais precisam de autoria ou licença documentada em [ASSET_CREDITS.md](ASSET_CREDITS.md).
