# M02 — integração das duas linhas, 2026-11-05

Esta branch é uma área de integração temporária, não uma segunda missão. Parte de `claude/elegant-wright-m9l1ws` em `c687e9417e7a745d6ded303aca08ea2eefbaa934`, que contém a linha da M01 `03387a31`. A outra origem é `codex/m02-recovery-v1` em `b0d14d4bdf1df89743489b9c57cc7e0e574a0ca8`. O antecessor comum é `56e98cbf774d3b717f4f228ce5f66a7194f4d7a5`; as duas origens estão publicadas e preservadas. **A integração de código ainda não foi feita.**

O PDF Astra de ambas as branches tem o mesmo objeto Git `3c0783fefeff966453424266157a6a97ec998b7c`. As imagens originais e a comparação da outra linha foram preservadas em `docs/m02/referencias/astra/`; isto não integra o jogo.

## Checkpoints: risco confirmado

O código da candidata Codex em `src/m02/m02-session.js` persiste em `cod-guerra:checkpoint:m02:v1` um objeto `{version:1,id,snapshot}`. O snapshot `m02-01-bench-snapshot-v1` dessa candidata atual grava `rngState`; o seu validador também aceita snapshots anteriores sem ele. O gerador usa o mesmo LCG de `src/core/random.js` nesta origem e na Codex. Isso **não prova** que os snapshots ou os estados das simulações divergentes sejam intercambiáveis.

Na base Claude `c687e941`, passaram 66 testes focados de `m02-09-save-restore-determinism`, `m02-12-save-hardening` e `m02-13-save-hardening-2c`. São provas da base, não de compatibilidade entre as duas linhas.

A loja desta linha (`src/game/m02-save-store.js`) grava noutro namespace, usa validação e protocolo v2 e rejeita snapshots v1. A afirmação anterior de que nenhum v1 havia sido persistido era válida apenas para a história local conhecida daquela linha e não vale para a candidata Codex. Não apagar a chave v1 nem a substituir; não restaurar por transformação superficial de schema. Estudar diferenças de áreas, atores, armas, objetivos, flags, portas, transições e RNG; validar com saves reais dos dois lados, rejeição segura, falhas de armazenamento e comparação da continuação. Enquanto não houver migrador comprovado, manter os dados antigos intactos e apresentar claramente a incompatibilidade.

`src/game/m02-legacy-save-inspection.js` reconhece apenas o envelope v1 da candidata Codex e distingue armazenamento inacessível, ausência, conteúdo inválido, schema diferente e dados que exigem análise. Nunca grava ou apaga; detetar não significa validar nem migrar. Dois testes focados cobrem essas situações. **Ainda não está ligado à interface nem importa saves.**

## Integração pendente

- Preservar o histórico e a autoria; resolver os conflitos manualmente numa integração `--no-ff`, sem rebase, sem force-push e sem tocar na `main`.
- Manter saves e testes de ambas as origens; harmonizar morte, C12 e retirada antecipada sem invalidar checkpoints.
- Recuperar os controlos táteis, a escolha de água, presença física, segurança das rajadas, a saída pelo celeiro, apresentação e provas da linha Codex; preservar as auditorias, o trabalho de cenário, a validação de saves e a lógica do Claude. Não declarar uma funcionalidade integrada por existir só na origem.
- Não reafirmar como facto o enquadramento histórico ou o equipamento contestados; conservar fontes e guardas até decisão fundamentada.
- Comparar entrada M01/M02, áudio e renderizadores com testes M01 e M02. Validar resultado no browser e, antes de qualquer aprovação, no iPhone e por pessoas. `docs/m02/M02_COMPARE_CODEX_RECOVERY_V1.md` contém a comparação detalhada de origem.
- Confirmar a branch e a tarefa atualmente em curso no Claude para não fazer a mesma implementação em paralelo. Uma única pessoa/agente deve editar cada ponto de conflito.
