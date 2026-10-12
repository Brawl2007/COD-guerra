# T13 / T32 — estruturas de campo

TASK_ID: `M01-T13-T32-FIELD-STRUCTURES-V1`. Estado: **ACEITE** (verifier PASS, reviewer ACCEPT). Código aceite: `cbbe0d7624d39e444f02ac0bd200037a71b3cf8e`, branch `codex/m01-t13-t32-field-structures-v1`; base integração `a1dd76b8fd30467f9bb335411cf8f589a4fd829a`. Integração a publicar após validar a junção.

Quatro estruturas originais: barracão ferroviário com telhado/chaminé/janela/bancada/entrada oeste aberta, abrigo com retorno em L e interior revestido, parapeito de terra/madeira intacto ou destruído, casamata com seteiras e capa de terra. Quinze GLBs, 3 LODs, 370768 bytes totais, CC0-1.0 e SHA; máximos reais por LOD 1248/208/144 triângulos (limites5000/1500/300). Bounds das superfícies que correspondem a colisores comparados com `TczewWorld`; envelopes de telhados/interiores/feature decorativa explicitamente separados, sem novos sólidos.

## Verificação final

- `ci-final-node.log` / `ci-final-runs.json`: CI38225594014, 648/648 Node, 173 tooling e build86 módulos PASS, no código aceite.
- `ci-final-browser.log`: CI38225594010, 4/4 browser/galeria PASS (12,3 min), 16 ficheiros reproduzidos byte a byte, autoridade dos sistemas protegidos e modelos anteriores, colisores83, rota26 eventos/4 checkpoints/saúde92.
- `browser.log` / `browser.json`: produção local3/3 PASS (10,9 min), sem retries/skips. `captures/same-pause-report.json`: 11 pares A/B com relógio desenhado igual ao real e estado preservado. Posto legível em duas vistas adicionais de dentro da via; intacto1,1m/destruído0,45m. Sky control: zero mudança em 10 vistas, 28/51200 píxeis na casamata, dentro do limite declarado.
- `captures/checkpoint-geometry-plateau.json`: 316 geometrias antes do primeiro restauro; primeiro checkpoint muda legitimamente vista/relógio e carrega GPU343; três restauros iguais mantêm343, relógio750,65, quatro roots e15 modelos residentes. Low/High, falha opcional, reload e ready num frame pausado também PASS.
- `gallery.log` / JSON: galeria local1/1 PASS, 15 capturas em `docs/assets/m01-field-structures/captures/`. `supplemental-gallery.log` / JSON e `.spec.js`: 1/1 PASS, cinco ângulos reais de OrbitControls mostram entrada/revestimento do abrigo, janela/bancada do barracão e seteiras; imagens e acções em `docs/assets/m01-field-structures/supplemental-gallery/`.
- Verificador independente repetiu9/9 Node focados, reprodução e autoridade; leu buffers reais de15 GLBs, bounds/índices/posições, porta oeste livre por ray probes, altura destruída exacta e casamata abaixo do tabuleiro. Verificador e reviewer inspeccionaram todas as imagens relevantes; ambos aprovam `cbbe0d7624d39e444f02ac0bd200037a71b3cf8e`.

## Referência e correcção preservadas

`baseline-colliders.log`, `baseline-route.log`, `baseline-world.json` e `baseline-simulation-report.json` são a referência real antes da alteração. `baseline-browser.log` e `before/`: quatro vistas03/04/15/16 PASS; câmaras encenadas sobre saves reais, não playtest humano. A vista03 antiga ficou quase preta por capture precoce e é apenas informativa; a aceitação usa A/B no mesmo frame pausado, com superfícies legíveis.

`browser-initial-interrupted.log` conserva a primeira tentativa incompleta, interrompida durante a revisão dos assets/URL do harness. `browser-attempt1.log/json` e `captures-attempt1/` conservam2/3: o primeiro restauro foi comparado com uma contagem global ainda não aquecida. A correcção1 alterou só a prova: restauro aquecido mais3 repetições com plateau exacto, e acrescentou dois ângulos do posto antes tapado pela treliça. Os9 pares originais foram mantidos; source/assets/runtime permaneceram iguais a `e23a47d`. A galeria recebeu ângulos suplementares de câmara, sem alterações de modelos/viewer.

## Limites

Arquitectura original artisticamente reconstruída, não levantamento histórico exacto. Roofs/interiores/envelopes decorativos não representam novos colisores. Câmaras de prova e saves da rota não são playtest humano. Sem medição FPS/VRAM real; bytes GLB não são memória GPU. M01 permanece PROTÓTIPO JOGÁVEL. Estação e trabalho concorrente do Claude preservados.
