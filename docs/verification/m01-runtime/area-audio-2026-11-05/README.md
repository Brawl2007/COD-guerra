# Áudio das áreas (VII-b dia, VII-c anoitecer) — provisório, 2026-11-05

**Estado: NÃO ouvido por um humano.** Áudio provisório sintetizado (WebAudio procedimental, sem gravações; etiqueta T45: «Áudio provisório sintetizado — gravações finais pendentes»). Provado apenas por testes Node com `FakeAudioContext`.

## O que mudou
- `src/game/m01-area-audio.js` (novo): `AreaAudio`, lido pelo `M01AudioDirector` (sem novo gancho em `game.js`; o guarda `audioDirector?.` continua 6/7). Só lê a simulação (`actId`, `clock`, `timers.barrage.run`, evento `shell-incoming`); variação por hash estável, sem relógio de parede nem fluxos aleatórios.
- **Assobio do obus:** ouve-se `distância/343 s` depois do lançamento e dura `warnSec`, logo termina quando o estrondo (`soundAt` do `m01-blast`, já atrasado pela distância em `game.js`) chega: antecede o impacto exatamente `warnSec`. O assobio antigo de `game.js` (sem atraso de distância, nunca verificado) foi removido para não duplicar.
- **VII-b (dia):** artilharia distante entre salvas (silenciosa durante a barragem) e piar de aves. **VII-c (anoitecer):** camadas contínuas de vento e de fogos da vila a nível baixo (`setAreaBed`/`stopAreaBed` em `src/core/audio.js`), artilharia mais rara e distante, sem aves.
- Portão por ato: o ato 1 (`M01Simulation`, sem `actId`) e o VII-a não recebem nada; comportamento igual ao anterior.
- Mudar de ato (reset do diretor) para as camadas e descarta sons pendentes.

## Comandos e resultados
- `node --test tests/m01-area-audio.test.js` → 10 pass, 0 fail (assobio com antecedência certa e atraso por distância, camadas por ato ligam/desligam, ato 1 mudo, determinismo, restauro).
- `node --test` em `m01-audio-director`, `m01-audio-layers-r7a`, `m01-battlefield-audio`, `audio-core`, `m01-audio-production`, `m01-audio-feel` → 122 pass, 0 fail.
- `npm run build` → OK.
- 14 ficheiros adicionais que leem `game.js`/`audio.js` (`audio-mix-options`, `m01-runtime`, `m01-frame-catchup`, `m01-demolition`, `m01-damage-decals`, etc.) → 144 pass, 0 fail.

## Por verificar (humano)
Audibilidade real do assobio (ganho 0,06 sob atenuação de distância), nível das camadas, repetição das aves, e se o vento do anoitecer se distingue do vento base do ato 1.
