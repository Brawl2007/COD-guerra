---
name: structured-handoff
description: Produce concise, evidence-based COD-guerra handoffs that preserve continuation state without repeating the full conversation or investigation history.
---

# Structured Handoff

Use this skill when finishing or pausing substantial COD-guerra work.

## Goal

Preserve enough state for another agent or future session to continue safely without rereading the full conversation or repeating completed investigation.

Do not produce a long narrative unless explicitly required.

## Required handoff fields

Return:

- TASK_ID
- STATUS
- BASE_BRANCH
- BASE_HEAD
- WORK_BRANCH
- FINAL_HEAD
- FILES_CHANGED
- IMPLEMENTED
- TESTS
- BUILD
- RUNTIME_OR_VISUAL_EVIDENCE
- REVIEW
- KNOWN_LIMITATIONS
- BLOCKERS
- NEXT_ACTION

## Status values

Prefer:

- PLANNED
- IMPLEMENTED
- VERIFIED
- REVIEWED
- ACCEPTED
- BLOCKED
- PAUSED

Do not mark ACCEPTED unless required verification and review gates have passed.

## Evidence rules

Record only evidence that actually exists.

Use exact values when known:

- commit SHA;
- test count;
- test command;
- PASS/FAIL;
- build result;
- browser/runtime result;
- artifact or evidence path.

Never reconstruct missing logs and present them as original evidence.

If evidence was not run or was lost, say so explicitly.

## Context compression

Include conclusions needed for continuation.

Do not repeat:

- full prompts;
- full chat history;
- unrelated documentation;
- every command executed;
- already-resolved dead ends.

Preserve important invariants, decisions and unresolved risks.

## Git continuity

Always record:

- starting/base HEAD;
- final HEAD;
- current branch;
- whether the branch was pushed;
- whether main was untouched.

If the remote HEAD differs from the local HEAD, state that clearly.

## Failure or pause

If blocked or paused, include:

- exact blocker;
- last known good state;
- failed check;
- what has already been attempted;
- what must not be repeated unnecessarily;
- safest next action.

## Recommended format

Use a compact structure similar to:

TASK_ID:
STATUS:

BASE:
WORK_BRANCH:
FINAL_HEAD:

IMPLEMENTED:
- ...

FILES_CHANGED:
- ...

EVIDENCE:
- tests:
- build:
- runtime/browser:
- review:

LIMITATIONS:
- ...

NEXT_ACTION:
- ...

Keep the handoff concise enough to be loaded cheaply in a future session.
