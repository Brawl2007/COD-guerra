# Auditoria M02 — secção C (Roteiro, PDF pp. 12–15) vs gemini/m02-01-quinta (transcrito pelo Capitão do relatório do auditor; leitura estática, sem testes)
Legenda: IMPLEMENTADO / PARCIAL / EM FALTA / CONTRADIZ.
- C01 PARCIAL: cartela T0, bz39_c01_01/dlg_m02_001, cp_m02_a_preparacao presentes; fade/mensageiro sem prova. CONTRADIZ (tempo): teste exige troca de tiro < 15 s; o PDF (C02) pede 30–60 s após iniciar o movimento.
- C02 PARCIAL: posto EA0 (4 a ~67 m), escolha vala/pomar, avanço ao cair o posto, bz39_c02_01 OK; Małek puxado pelo ombro EM FALTA; bz39_c02_03 nunca disparada.
- C03 PARCIAL: rendição por colapso (limiar ≥7 no código, handoff diz ≥6); fuga pela porta sul e portão aberto por aliado EM FALTA.
- C04 PARCIAL: giz [E], bz39_c04_01..03 e _05 OK; «dar água» e «dobrar o mapa» EM FALTA.
- C05 PARCIAL: TR01 e payload igual com/sem skip OK; percurso reconstruído EM FALTA; só disparado por tecla de bancada (Digit6).
- C06 PARCIAL: EB1 (12), carroça 0–2 volumes OK. CONTRADIZ: o PDF quebra o varal pelo tiro; o código danifica a roda e só por bancada. Fala com speaker «Mensageiro 56 pp» antes da aprovação histórica.
- C07 IMPLEMENTADO na lógica (entrada só por bancada). C08 PARCIAL (mensageiro substituto EM FALTA).
- C09 PARCIAL: a regra «remover a tranca» é contornada (startC10OrderChanges abre a tranca).
- C10 PARCIAL: dlg_m02_002, EC2, impacto fixo e bloqueio OK; escolha entre duas posições de apoio EM FALTA; bz39_c10_03/04 nunca disparadas.
- C11 PARCIAL: Lis ferido, dlg_m02_003, último grupo OK; «terminar sem Lis → missing» EM FALTA em jogo.
- C12 CONTRADIZ: lis_status por omissão vira «wounded_evacuated» (o PDF exige «missing» se Piotr termina sem Lis); último grupo em trânsito marcado como evacuado sem chegar; contagem de Gruca e «dobrar o mapa» EM FALTA; gatilho só por tecla (KeyM).
- Transversal: progressão C04→C12 NÃO automática (Digit0–9/KeyM e botões, src/m02/m02-01-main.js:81–95, 133–156): sem jogo ponta-a-ponta.
