# M02 — recuperação do braço após lançar granada

Código `cc0ecfc`: a soltura continua imediata e o projétil segue a física existente. O evento de lançamento identifica o jogador; a apresentação adapta o rig de primeira pessoa da M01 para mover o braço direito de regresso após a soltura, sem escrever no estado ou nos saves. Disparo, ferrolho, recarga, mãos ocupadas, morte e restauro têm prioridade; granadas criadas por origem personalizada não ativam a pose do jogador. A pose dura até 0,45 s de relógio de missão e é restaurada antes de cada amostragem do rig.

- `node --test tests/m02*.test.js`: 118 testes, zero falhas; o teste focal também verificou a ausência de evento ao lançar sem munição.
- `npm run build`: concluído; mantém o aviso existente de bundles grandes.
- `CI=1 CHROME_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/m02-mission.spec.js --grep 'normal grenade input|grenade thrown by the player|High quality shows the released grenade' --reporter=line`: três casos passaram, incluindo lançamento por `G`, colisão real em B05 e remoção da granada e pose após restauro.
- [Captura High 1280 × 720](grenade-follow-through-high.png): Chromium/SwiftShader, lançamento real por `G` em C01; teste envia `Escape` quando deteta a pose e oculta o menu de pausa para a imagem. É uma captura controlada, não playtest humano nem medição de GPU.

**Limitações:** não há preparação, retirada de pino ou animação de soltura anterior ao projétil, nem uma mão que segure uma granada visível. A mão M01 tem geometria angular e o gesto é uma recuperação aproximada: não é uma coreografia final. A animação pode não aparecer quando o jogador já está a disparar ou recarregar. A última passagem integral C01–C12/M03 continua a de `e4a4632`; não foi repetida nesta etapa. O evento ganhou apenas a identidade da origem; física e snapshot não foram alterados.
