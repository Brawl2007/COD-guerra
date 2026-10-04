# COD-guerra — Claude Code Engineering Constitution

## Mission

Develop `Brawl2007/COD-guerra` with high quality, low context waste and high autonomy.

Read `AGENTS.md` before production work. Read task-specific context only when relevant. Do not preload large documentation without a concrete need.

## Git safety

- Never modify, commit to, merge into, or push directly to `main`.
- Production work must use a dedicated branch.
- Before editing, confirm current branch, base branch and relevant HEAD.
- Never force-push, hard-reset shared work, delete branches, or perform destructive Git operations unless explicitly authorized.
- Existing remote work is authoritative. Do not recreate completed work from memory.

## M01 status

M01 — Tczew remains `PROTÓTIPO JOGÁVEL` until explicitly promoted.

Do not silently redesign gameplay, mission logic, persistence, timings, RNG, damage, objectives or historical structure to fit a visual or asset task.

## Task contract

Before substantial implementation, establish:

- TASK_ID
- objective
- base branch / base HEAD
- work branch
- allowed scope
- forbidden scope
- dependencies
- acceptance criteria
- required evidence
- retry budget
- escalation conditions

Resolve material ambiguity before changing production code.

## Context discipline

Use:

SEARCH -> NARROW -> READ -> IMPLEMENT

Do not read the entire repository or large documentation sets by default.

Prefer:
- targeted search;
- relevant functions/ranges;
- existing structured handoffs;
- Git evidence;
- concise summaries between agents.

Carry forward conclusions and evidence, not entire conversations.

## Engineering discipline

Prefer deterministic tools over LLM judgment whenever possible.

Examples:
- Git for changed files and history;
- tests for behavior;
- parsers/schema checks for validity;
- build tools for compilation;
- runtime/browser evidence for actual runtime behavior.

Do not invent:
- test results;
- browser results;
- FPS;
- visual proof;
- historical facts;
- successful builds.

## Evidence gates

`IMPLEMENTED != VERIFIED != REVIEWED != ACCEPTED`

A task is not complete because code was written.

Required evidence depends on task type.

Production work should prefer focused validation plus the required final build/runtime proof.

Expensive full-suite certification belongs primarily to integration gates unless the task contract explicitly requires it.

## Autonomous correction

Normal implementation/test/review failures should be diagnosed and corrected automatically within the task retry budget.

Do not ask the user to manually say:
- continue;
- test;
- fix;
- review;
- build.

Escalate only when a real decision or blocker exceeds the task contract.

## Escalate for

- contradictory requirements;
- significant gameplay/product decisions;
- major architecture changes outside scope;
- destructive operations;
- main-branch changes;
- unsafe/conflicting integrations;
- necessary files outside allowed scope;
- exhausted retry budget;
- insufficient evidence that cannot be obtained safely.

## Scope control

Make the smallest correct change that satisfies the task.

Do not opportunistically refactor unrelated systems.

Do not create parallel architecture when the existing system can be extended safely.

## Completion

Before declaring success:

1. acceptance criteria are satisfied;
2. required focused tests pass;
3. required build passes;
4. required runtime/visual evidence exists;
5. scope violations are absent;
6. review requirements are satisfied;
7. branch and final HEAD are recorded.

Return a concise structured handoff instead of a long narrative.
