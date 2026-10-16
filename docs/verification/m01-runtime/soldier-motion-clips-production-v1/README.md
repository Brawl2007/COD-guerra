# M01 — provas da biblioteca de movimento

TASK_ID `M01-SOLDIER-MOTION-CLIPS-PRODUCTION-V1`. **READY_FOR_CAPTAIN_REVIEW**. Base `d070225d49840f5bd304a0825c0656651b82c26d`; branch `codex/m01-soldier-motion-clips-production-v1`. M01 continua **PROTÓTIPO JOGÁVEL**.

[HANDOFF e integração futura](HANDOFF.md) · [revisão visual e limites](visual-review.md) · [galeria dos seis vídeos](gallery.html).

| Clip | Sequência real a 30 fps | Comparação em 0/25/50/75/100% | PL/DE × LOD0/1/2 |
| --- | --- | --- | --- |
| sprint | [MP4](sequences/sprint.mp4) | [frontal](sheets/sprint-front.jpg), [lateral](sheets/sprint-side.jpg) | [sheet](sheets/sprint-compat.jpg) |
| crouch_walk | [MP4](sequences/crouch_walk.mp4) | [frontal](sheets/crouch_walk-front.jpg), [lateral](sheets/crouch_walk-side.jpg) | [sheet](sheets/crouch_walk-compat.jpg) |
| turn_left | [MP4](sequences/turn_left.mp4) | [frontal](sheets/turn_left-front.jpg), [lateral](sheets/turn_left-side.jpg) | [sheet](sheets/turn_left-compat.jpg) |
| turn_right | [MP4](sequences/turn_right.mp4) | [frontal](sheets/turn_right-front.jpg), [lateral](sheets/turn_right-side.jpg) | [sheet](sheets/turn_right-compat.jpg) |
| hit_front | [MP4](sequences/hit_front.mp4) | [frontal](sheets/hit_front-front.jpg), [lateral](sheets/hit_front-side.jpg) | [sheet](sheets/hit_front-compat.jpg) |
| near_miss_duck | [MP4](sequences/near_miss_duck.mp4) | [frontal](sheets/near_miss_duck-front.jpg), [lateral](sheets/near_miss_duck-side.jpg) | [sheet](sheets/near_miss_duck-compat.jpg) |

Cada imagem bruta em `captures/` contém a referência antiga à esquerda e o clip novo à direita, frontal em cima e lateral em baixo. Nas sheets comparativas: referência em cima, novo em baixo. Os loops percorrem três ciclos nos MP4; one-shots mantêm o frame final durante 0,4 s. `*-sequence.jpg` contém amostras cronológicas extraídas desses MP4, sem novas poses geradas.

Provas brutas: [mixer a 240 Hz](mixer-validation.json), [browser com materiais/texturas](browser-asset-review.json), [27 testes focados](focused-tests.log), [build](build.log) ([saída bruta comprimida](build-output.log.gz)), [invariância da base](invariance.json), [resumo](verification.json), [hashes dos artefactos](evidence-manifest.json).

Reprodução a partir da raiz do repositório, Node 24 / Three.js 0.186.1:

```sh
node tools/assets/m01-soldiers/build-motion-clips.mjs
node tools/assets/m01-soldiers/validate-motion-clips.mjs --out docs/verification/m01-runtime/soldier-motion-clips-production-v1/mixer-validation.json
node --test tests/m01-soldier-motion-clips.test.js tests/m01-soldiers-glb.test.js tests/m01-character-assets.test.js
npm run build
node tools/assets/m01-soldiers/render/capture-motion.mjs
python3 tools/assets/m01-soldiers/render/motion-sheets.py
```

Capturas exigem Chromium/Playwright e ffmpeg; montagens exigem Pillow/DejaVu. O viewer de captura usa o servidor isolado existente de `render/stage.mjs`, sem carregar código do jogo. Para um Chromium instalado fora do Playwright, usar `CHROME_EXECUTABLE`. Não reexportar os GLBs originais. O gerador também aceita `--out <pasta>` para reproduzir o pacote fora da árvore de assets.

Não há Animation Resolver nem ligação ao renderer nesta entrega. Sem nova execução de suites integrais, playtest humano ou benchmark de FPS. Os logs presentes pertencem às execuções focadas finais; falhas iniciais corrigidas estão descritas no handoff, sem fabricar logs que não foram preservados.
