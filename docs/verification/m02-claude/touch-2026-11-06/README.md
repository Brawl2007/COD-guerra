# M02 bancada por toque (iPhone) — evidência 2026-11-06

Teste de estado em Chromium com emulação `iPhone 13` (hasTouch, isMobile, SwiftShader). **Não é playtest e não prova Safari/iOS real.**

Comando: `CHROME_EXECUTABLE=/opt/pw-browsers/chromium PORT=4394 M02_TOUCH_SHOTS=docs/verification/m02-claude/touch-2026-11-06 npx playwright test -c tools/m02/playwright-m02-01.config.js m02-touch.spec.js`
Resultado: 3/3 verdes (paisagem 750x342, falha em paisagem, retrato 390x664). HUD + botões cobrem 28,7 % (paisagem) e 28,6 % (retrato) do ecrã, com legendas e diálogo ativos (pior caso).

| Captura | O que mostra |
|---|---|
| landscape-01-hud-compacto | HUD compacto: vida, munição, granadas, objetivo curto, botões; painel de bancada escondido |
| landscape-02-joystick-correr | Joystick flutuante empurrado até ao fim (correr), legendas de som e diálogo |
| landscape-03-interagir | Botão [E] visível só junto a uma porta (prompt da simulação) |
| landscape-04-menu-bancada | Painel «☰ Bancada» aberto: «0: P1 C01», atalhos, telemetria, painel tático |
| landscape-05-depois-do-menu | Painel fechado após «0: P1 C01» |
| landscape-06-falha | Painel de «Missão falhada» com botão de reinício ≥ 44 px |
| portrait-01-hud-compacto | Retrato: «Roda o telemóvel para paisagem», mas controlos utilizáveis |
| portrait-02-menu-bancada | Painel da bancada em retrato |

O spec verifica: joystick move/corre/pára o Piotr; arrastar à direita roda yaw e pitch; multitoque (joystick + olhar); Disparar aumenta `shotLog`;
Recarregar, Agachar, Mirar, Granada; [E] abre a porta; Cobrir; Gravar/Carregar (F5/F9) gravam no localStorage e restauram a posição;
primeiro toque cria o AudioContext; alvos ≥ 44 px; sem erros de consola.

Não provado sem iPhone real: retoma do WebAudio no Safari (exige gesto; usa pointerup/touchend/click), comportamento da barra de endereços e
de `100%` de altura, bloqueio do zoom por pinça (o iOS ignora `user-scalable=no`; há `gesturestart` bloqueado), `env(safe-area-inset-*)` com
entalhe, desempenho (usar `?quality=low` se necessário) e ergonomia dos polegares.
