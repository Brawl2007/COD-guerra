---
MEMORY_VERSION: 1
TASK_ID: "M01-CONTINUITY-RAID-INTEGRATION-V1"
CATEGORY: "m01-persistence"
STATUS: CURRENT
DATE: "2026-10-14"
BRANCH: "codex/m01-continuity-raid-integration-v1"
SOURCE_HEAD: "8387b5627b3b5482370c0915f018776d563e31ec"
SUPERSEDES: ""
SUPERSEDED_BY: ""
---

# Agenda do raid no schema 2

T25 acrescenta seis impactos fixos (05:30:00 até 05:33:20), estimados para gameplay a oeste da área. A agenda não gasta RNG de combate. `timers.raidSchedule` é opcional, com seis entradas `{id,at,point,emitted}`; entradas consumidas correspondem a um dano único. Validação atómica também nos backups de checkpoint. Não reemitir impactos depois de restore nem acrescentar impactos retroactivos a saves legacy sem agenda.

O primeiro ID `raid_0530` conserva a âncora da passagem; seguem `_1`…`_5`. Sufixos novos exigem agenda. Um save sem agenda que só tenha o primeiro ID é indistinguível do legacy: essa ambiguidade é intencional e documentada. Simulação e renderer usam o prefixo fechado para fumo persistente. `Game.rebuildSounds` tem de classificar os cinco sufixos como aéreos, mantendo o limiar original de tremor (500 m); o teste de lifecycle cobre todos os seis IDs.

T02-min inclui o posto de disparo/rota oeste nos limites jogáveis de elegibilidade, sempre com LOS real. Cadências/dano/algoritmo RNG conservados; o novo fogo legal pode alterar o RNG posterior. Outras falas/pré-roll continuam em T02b. Grounding dos aéreos ocorre depois de `safeImpact`; fumo de granadas continua pendente.

Provas: handoff `docs/verification/m01-runtime/continuity-raid-integration-v1/`, testes `m01-continuity-raid`, `m01-consolidation-lifecycle` e guard de source hash em `m01-animation-contract`. CI **38582392486** no SOURCE_HEAD: **694/694**, build e browser **1/1**. PR **#63**. Preservar a proveniência histórica do golden e só regenerá-lo em x86 para deltas revistos; não repetir extrações/testes integrais por atualizações só de documentos. M01 continua PROTÓTIPO JOGÁVEL.
