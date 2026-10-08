---
name: m01-production
description: Execute M01 production work quickly and safely with focused validation, minimal context waste, automatic correction, and no unnecessary gameplay or architecture changes.
---

# M01 Production

Use this skill for implementation work on M01 — Tczew while it remains `PROTÓTIPO JOGÁVEL`.

## Goal

Deliver the requested improvement with the smallest correct change, strong evidence, low context waste, and minimal user intervention.

## Before editing

1. Read `CLAUDE.md`.
2. Read `AGENTS.md`.
3. Establish or load the Task Contract.
4. Confirm:
   - base branch;
   - base HEAD;
   - work branch;
   - allowed scope;
   - acceptance criteria.
5. Search for the affected system before reading large files.

Do not reread unrelated documentation or reconstruct completed work from memory.

## Production mode

Default to fast focused production:

- targeted investigation;
- minimal implementation;
- focused tests;
- final `npm run build` when applicable;
- targeted runtime/browser proof only when required;
- concise review;
- structured handoff.

Do not run the complete browser suite repeatedly during normal production unless the Task Contract requires it or evidence shows a cross-system risk.

Full certification belongs primarily to an integration gate.

## Preserve by default

Unless the Task Contract explicitly authorizes changes, preserve:

- gameplay;
- hit detection;
- damage rules;
- mission objectives;
- timings;
- RNG;
- persistence/schema;
- AI behavior;
- historical structure;
- unrelated systems.

Do not redesign gameplay to fit a visual or asset task.

## Context discipline

Use:

SEARCH -> NARROW -> READ -> CHANGE -> VERIFY

Prefer exact functions, relevant ranges, diffs, Git evidence and prior structured handoffs.

Do not load the whole repository by default.

## Automatic correction

If focused validation fails:

1. classify the failure;
2. identify the smallest likely cause;
3. gather only the additional context needed;
4. apply a targeted fix;
5. rerun the relevant validation.

Continue automatically within the Task Contract retry budget.

Do not ask the user to say "continue", "test", "fix", "review", or "build".

## Stop conditions

Escalate instead of improvising when:

- requirements conflict;
- a significant gameplay change becomes necessary;
- architecture outside scope must change;
- destructive Git operations appear necessary;
- main would need modification;
- allowed scope is insufficient;
- retry budget is exhausted;
- required evidence cannot be obtained safely.

## Completion gate

Do not declare completion until applicable evidence exists for:

- acceptance criteria;
- focused tests;
- build;
- runtime/visual behavior;
- scope compliance;
- review.

Finish with a concise structured handoff containing:

- TASK_ID;
- branch;
- base HEAD;
- final HEAD;
- files changed;
- tests/evidence;
- build result;
- review result;
- known limitations;
- recommended next action.
