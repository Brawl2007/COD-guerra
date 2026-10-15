# M01 — cadeia de integração (inventário 2026-10-15, base main ecaebd3)

Inventário read-only feito pelo Capitão (issue #72). Nada foi integrado; todos os PRs abaixo são drafts.
Revalidar HEAD/CI antes de agir.

## Grafo base → head
main ← #45 ← #47 ← #50 ← #51 ← #52 ← #57 (V6) ← #59 (V7, 4c6f7be, sem checks no PR)
V7 ← #61 (Argon V1), #62 (Argon V1 sobre V7, CI verde) ← #64 (V2 IK/recarga, CI verde 4/4),
V7 ← #65 (T21 campo de batalha vivo) ← #70 (correção de câmara, CI **vermelho**),
V7 ← #66 (T50 loading/bundle, CI verde: fast-browser + full-regression).
#63 (continuidade fogo oeste/raid 05:30) tem base `claude/m01-stack-integration-t08-t12-v1`, fora da cadeia V7.
Fora do caminho crítico: #73 (carta autopilot), #74 (touch iPhone, issue #71), #58/#44 (campanha M02–M30), #56 (direção criativa).

## Bloqueio activo
#70 `validate-and-capture` (run 38730517535): fase «antes» converge (1.25→0.106 em 8 passos de 65);
fase «depois» falha no 1.º passo: pitch 1.0008 → 1.25 (salto ≥0.249, esperado ≈0.143, clampa em 1.25).
Hipótese não confirmada: evento de rato residual/em fila da fase anterior ou ganho diferente no HEAD T21.
Próximo passo: reproduzir localmente `tools/.t21-proof-runner.mjs` com T21_CAPTURE_MODE=depois e registar
o delta de pitch por evento; só então corrigir `tools/t21-camera-level.mjs` (sem relaxar a verificação).

## Ordem de integração proposta (sem merge sem aprovação humana)
1. Desbloquear #70 → #65. 2. Rever #66 e #62/#64 sobre V7 (CI verde). 3. Decidir #61 vs #62 (duplicados de V1).
4. Reconciliar #63 com V7. 5. Proposta única V2–V7 → main com relatório de aceitação.
