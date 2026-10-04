# Revisão das transições do arrasto — 2026-10-02

Entrega original de Claude: 27353ef207c5d0d97102db5b60d1d4fd16943194, branch claude/m01-station-drag-transitions, sem PR. Codex continua devido ao limite semanal informado pelo utilizador. Quatro clips de 1,6 s estimados, pares sincronizados, 61 ossos existentes; sem malhas nem deslocação de raiz.

158/158 testes Node, zero falhas/skips; build passou (aviso habitual de chunk). Regeneração local: node tools/assets/m01-station-drag-transitions/build.mjs; GLB e manifesto byte a byte idênticos à entrega. Testes verificam hashes dos ficheiros reutilizados, extremos, quaternões, contactos com AnimationMixer, chão e pausa/restauro.

Inspeccionadas as quatro galerias originais em docs/assets/m01-station-drag-transitions/: grab/release lateral/frontal/superior, contactos e pausa/restauro. Paciente de costas, pega sob os sovacos; pequenas interpenetrações estimadas e limitações das cápsulas permanecem documentadas. Corrigido somente o valor OVER na documentação para [0.05, 0.05, 0.05], igual ao gerador; fonte e GLB intactos.

Não executada nova partida nem suíte de navegador nesta integração isolada. src/, testes/browser, workflows e Graphify intactos. JS de produção SHA-256 6e8d87a1653f4495add54fa4176c9da41cb1416c3362f2615b17cc16116c56fa; checkpoint Graphify 54647d13cc9b860c18b777cbd3d4cdc693d4a2af0cb015082171c2667dd32e32.

Kit integrado em staging como asset; ligação dos clips ao estado real da evacuação ainda pendente, assumida por Codex. Não muda saves, relógios, segurança ou bancada francesa. M01 permanece PROTÓTIPO JOGÁVEL; playtest humano e Chromebook pendentes. Main/publicação reservados ao utilizador.
