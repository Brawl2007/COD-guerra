---
name: focused-verification
description: Choose and execute the minimum sufficient verification for COD-guerra tasks, escalating validation only when risk or evidence requires it.
---

# Focused Verification

Use this skill when validating implementation work in `COD-guerra`.

## Principle

Use the cheapest deterministic evidence that can reliably prove the requested behavior.

Do not run expensive suites by habit.

Verification depth must be proportional to:

- task type;
- changed systems;
- regression risk;
- acceptance criteria;
- observed failures.

## Verification order

Prefer:

1. static/syntax/schema checks;
2. targeted unit or Node tests;
3. affected-system tests;
4. `npm run build`;
5. targeted runtime/browser proof;
6. broader regression tests;
7. full integration suites only when justified.

Stop escalating when sufficient evidence has been obtained.

## CODE tasks

Normally require:

- tests covering changed behavior;
- relevant regression tests;
- final build when production code changed.

Do not use browser validation when the behavior can be proven deterministically.

## VISUAL tasks

Normally require:

- focused code/runtime tests;
- final build;
- targeted browser/runtime capture of the changed area.

Do not run the full browser suite solely to prove a localized visual change unless cross-system risk exists.

## GAMEPLAY tasks

Normally require:

- focused simulation/state tests;
- relevant invariants;
- runtime behavior proof when deterministic tests alone cannot prove the player-visible result;
- final build.

Preserve unrelated gameplay behavior.

## PERSISTENCE tasks

Require relevant coverage for:

- save;
- reload;
- checkpoint/resume when applicable;
- legacy compatibility when applicable;
- invalid/corrupt input behavior when relevant;
- deterministic continuation where required.

## ASSET tasks

Verify applicable:

- file presence;
- manifest;
- loader;
- scale/orientation;
- required clips/sockets;
- fallback behavior;
- runtime appearance.

Do not claim visual correctness from manifest checks alone.

## PERFORMANCE tasks

Require actual measurements.

Never invent FPS or performance improvement.

Record:

- environment;
- before;
- after;
- measurement method;
- threshold or budget.

## Failure handling

When a check fails:

1. preserve the exact failure;
2. classify whether it is caused by the task;
3. avoid rerunning unrelated suites;
4. provide the smallest useful failure context to the fix step;
5. rerun the failed focused check after correction.

Escalate validation only if the failure suggests wider regression risk.

## Integration gate

Full certification belongs primarily to integration work.

An integration gate may include:

- full Node suite;
- full browser suite;
- save/reload regression;
- cross-feature checks;
- performance checks;
- broad visual review.

Do not repeat an already valid expensive certification without a concrete reason.

## Evidence report

Return a compact result:

- checks executed;
- PASS/FAIL for each;
- exact failures if any;
- build result;
- runtime/browser result if required;
- what was intentionally not run and why;
- whether evidence is sufficient for review.
