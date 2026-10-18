# M01 audio feel, "robotic sound" (owner playtest complaint 12), 2026-10-18

Baseline `98f094f`; fix commit `0ecb220` (+ this evidence commit). Synthesis only: no samples were added (T45 recordings remain a human/licence item).
Everything here is presentation: the audio reads simulation events and never writes simulation state, the RNG, saves or goldens.

## What was measured (before -> after)

`measure-audio-feel.mjs` (Node, 200 distinct event keys per class; `AUDIO_SRC_ROOT=<git archive of 98f094f>` gives `before.txt`, default gives `after.txt`):

| | before | after |
|---|---|---|
| shot variants per weapon | 1 structure (jitter 2.4-3.5 % pitch, 0.2-0.3 dB gain) | 4 voicings; crack 6.6-11 % pitch spread, 1.1-1.3 dB gain; body/tail/blast/echo balance 2-5 dB |
| impact variants per material | 1 (gain constant, 0 dB spread) | 3 voicings (+ 4 steel mode families), gain spread 1-5 dB |
| burst gap SD (display fire) | 0.00 ms | 3.5 ms (median exact, +-6 % max); simulation bursts stay exact |
| bolt / clip / reload / player hit / landing | 1 rendering in 40 calls (fixed square beeps / sines) | 40 / 40 / 40 / 4 / 36 of 40 |
| footsteps | none existed | 6 surfaces x 3 voicings, pace, load |
| nodes created per event (steady state) | ~3 per source (env gain + filter + 4 voice nodes) | sources only (pooled gains, filters, panners) |
| air absorption lowpass at 150 / 450 m | 7.0 / 3.1 kHz | 4.7 / 1.8 kHz (about -4 dB at 4 kHz by 150 m, ISO 9613) |

Rendered signal (`tests/browser/m01-audio-variation-render.spec.js`, OfflineAudioContext, 8 renders per class, mean pairwise log-spectral distance in dB; floor with identical parameters is about 2 dB because of the noise read position): wz.29 shot 2.07 -> 4.33, kar98k 2.48 -> 4.21, ally rifle 2.37 -> 4.21, MG34 burst 2.30 -> 3.20, ckm burst 2.50 -> 3.41, wood 2.26 -> 6.23, steel 6.97 -> 12.20, earth 3.54 -> 5.86, stone 3.89 -> 5.78, bolt cycle 4.13 -> 9.46, player hit 0.00 -> 3.62, landing 2.04 -> 2.92 (`before-render/` and `after-render/variation-lsd.json`).

Already present and kept: delay by distance (`pendingSounds`, director slots, 343 m/s), distance gain and band layer mix, per-zone IR A/B reverb, StereoPanner and head shadow, ducking and concussion.

## Commands

- `node docs/verification/m01-runtime/audio-feel-2026-10-18/measure-audio-feel.mjs > after.txt`
- Browser (no WebGL, serial under `flock`, port 4183): `npm run build`, then `flock <lock> env CHROME_EXECUTABLE=<chromium> AUDIO_EVIDENCE_DIR=<dir> npx playwright test -c tools/verification/playwright-port-4183.config.mjs tests/browser/m01-audio-offline-render.spec.js tests/browser/m01-audio-variation-render.spec.js --reporter=line`
- `before-render/` came from the unchanged tree (`AUDIO_SRC_ROOT=` for the variation spec; the original offline spec for the WAVs/metrics). WAVs are mono (L+R)/2 at 22.05 kHz, for human listening; a subset only.

Rendered metrics are not a playtest. Nobody has listened to these WAVs yet.
