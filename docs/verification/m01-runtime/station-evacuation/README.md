# Evacuação ficcional da estação — S3

O evento existente das 04:35:30 fere uma vez o soldado ficcional do pátio. Dudek vai até à cabeça, arrasta-o de costas no chão a 0,65 m/s, entrega-o no posto da estação e regressa ao seu posto. A fala 017 começa ao chegar ao ferido. O comportamento avança fora do olhar do jogador e termina antes do resgate posterior de Bąk.

`state-report.json` usa exclusivamente a rota de controlos da simulação: arrasto, entrega, regresso e rotas completas com/sem apoio. As duas chegam às 07:05, quatro checkpoints, todos os objectivos obrigatórios e ambas as demolições. São testes de estado, não partidas no navegador. `tests/m01-station-evacuation.test.js` cobre também repetição do evento, olhar, save/futuro idêntico, morte/inactivação dos participantes e migração de saves antigos.

`m01-station-ground-drag.jpg` é uma captura real do navegador de produção, continuando um snapshot alcançado por essa rota. O teste usa input relativo para olhar para a dupla, pausa real para verificar relógio/actores congelados e retoma até à entrega. A captura oculta apenas a sobreposição do menu pelo CSS de teste. O estado inicial é esse save real, sem alterar os seus actores, poses, relógios ou munição para encenar a operação. Não é uma partida contínua nem um playtest humano. `capture-encoding.json` regista o PNG original e a exportação JPEG no mesmo viewport de 1280×720.

O clip original `drag_wounded` dura 1,4 s, com 43 amostras a 30 Hz, e usa os nomes do rig preservado do Claude. A origem, hashes do rig/GLB e unidades estão em `station-animations.manifest.json`. Regerar com:

```sh
node tools/assets/m01-station/build.mjs
npm test
npm run build
CHROME_EXECUTABLE=/caminho/chromium npm run test:browser -- --grep 'station'
```

O save continua schema 2, apenas com dados. `station_wounded`, `station_aid_post` e `evacuate_station_wounded` distinguem tarefas de paciente/médico; `carriedBy` nunca liga este paciente ao socket de ombro. Actores mortos/inactivos interrompem a operação e largam-no no chão. Saves antigos com o evento consumido não repetem a lesão.

As posições, velocidade e animação são escolhas de encenação do protótipo, não uma reconstituição medida de uma pessoa histórica. Transições de agarrar/largar e encaixe das mãos continuam provisórios. Playtest humano, arte final e Chromebook pendentes; M01 continua **PROTÓTIPO JOGÁVEL**.
