# T46 · M01-AUDIO-MIX-OPTIONS-V1 — handoff

Base: `main` @ 6697956 (inclui a candidata #76). Reserva: `claims/m01-t46`.

## Entregue
- Grupos de volume EFEITOS / VOZES / MÚSICA (barramentos `sfx`/`voice`/`music` do `MixGraph`) e VOLUME GERAL.
  Os valores definidos antes de existir o AudioContext ficam guardados e são aplicados ao criar o grafo.
- Opção «REDUZIR ZUMBIDO»: escala a profundidade da concussão (filtro passa-baixo SFX/vozes) para 0,35.
- Persistência numa única chave `localStorage` `cod-guerra:audio-mix` (JSON validado em `src/core/audio/settings.js`).
- Controlos num painel «MISTURA» recolhível, para que o menu mantenha a altura em 1366×768.
- Só apresentação: simulação, saves e renderer não foram tocados.

## Verificação
- `node --test tests/audio-mix-options.test.js tests/audio-core.test.js`: 42/42.
- `npm run build`: OK.
- Chromium 1194 local (`persistence-check.mjs` contra `vite preview`): música 0,3 e zumbido reduzido sobrevivem a recarregar.
  Capturas: `menu-mix-closed.png`, `menu-mix-open.png`.

## Por fazer (fora do alcance automático)
- Sessão manual de 10 min no aparelho, verificando glitches e se `outputLatency` se mantém estável (critério do roadmap). Requer pessoa.
- T45 (amostras reais) continua HUMAN_REQUIRED; os grupos já estão preparados para essas amostras.
- Os controlos só reagem depois de a missão terminar de carregar, porque a ligação acontece em `main.js` após o carregamento.
