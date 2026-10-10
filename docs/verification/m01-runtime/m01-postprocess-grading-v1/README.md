# M01-POSTPROCESS-GRADING-V1 (T44) — evidência

- Commit aceite: `4f27f90e265447e8a1cb67dc17310751a045b2e5`.
- Base: `71ad067` (código aceite do T42). Implementação `e9234e8`, spec `8d78e67`, correção `4f27f90`.
- Estado: ACCEPTED. Verifier: PASS. Reviewer: ACCEPT.
- Tentativas de correção: 4 de 5 (orçamento subido de 3 para 5 pelo utilizador em 2026-10-10).
- CI x86: run `38045943911`.
  - `npm test`: 548/548.
  - Antes da captura, na base: 10 passed + 2 skipped (modo baseline).
  - Spec focada (grading + regressão de água do T42): 21/21, `--workers=1 --retries=0`.
  - Autoridade: OK.

## Alteração de jogo

- Gradação de cor por fase (amanhecer).
- Vinheta suave e oclusão ambiental de profundidade (AO), num só passe, em Média e Alta.
- Baixa: sem alteração.

## Causa e correção da 4.ª tentativa

- Causa: problema de medição. O atlas de decalques de dano era enviado para a GPU só depois da primeira captura (a cache de frames em pausa não voltava a desenhar). A spec passou a esperar por `atlasReady`, força dois redesenhos e exige o mesmo checksum do atlas antes e depois.
- A verificação de pixels escuros passou de luma<10 (+1 %) para luma<3 (preto no ecrã, +0,005). A versão anterior contava a vinheta e a AO autorais como esmagamento.
- O critério do contrato (luminância média ≥85 % do BEFORE) não mudou.

## Capturas

Copiadas de `test-results/` da execução de validação, com os nomes originais.

| Ficheiro | Conteúdo |
|---|---|
| `m01-grading-bridges-0530-high.png` | Pontes, 05:30, Alta, com gradação, vinheta e AO |
| `m01-grading-bridges-0530-high-bypass.png` | Mesma cena com o passe de pós-processamento desligado (bypass) |
| `m01-grading-station-0605-medium.png` | Estação, 06:05, Média, mesmo frame em pausa com atlas pronto |
| `m01-grading-station-0605-medium-bypass.png` | Mesma cena com bypass |
| `m01-grading-results.json` | Resultados da spec por cenário (ex.: `bridges-05:30-high`, `station-06:05-medium`) |

As descrições são inferidas dos nomes dos ficheiros. A inspecção visual não foi refeita neste closeout.

## Limitações

- Não há FPS medido nem declarado nesta entrega.
- Ficheiros BEFORE em `evidence/before/` não foram copiados. O `m01-grading-results.json` aqui vem de `test-results/` da execução pós-alteração.
- Follow-up (comportamento da base, fora deste passe): a cache de frames em pausa em `src/render/m01-view.js` não redesenha quando termina um upload de textura (atlas de decalques). Isto afeta os ecrãs de pausa em jogo real.
- Integração: o branch parte de `71ad067` e não da ponta atual do stack (`3388c24`). Precisa de rebase ou merge posterior.
