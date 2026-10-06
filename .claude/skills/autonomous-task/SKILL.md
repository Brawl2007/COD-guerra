---
name: autonomous-task
description: Orchestrate a COD-guerra task through implementation, independent verification, bounded correction, review and structured handoff without routine user intervention.
---

# COD-guerra Autonomous Task

Use this skill when a valid Task Contract exists and a task should be carried from implementation to reviewed completion with minimal human intervention.

## Goal

Execute:

AUDIT CONTEXT
→ IMPLEMENT
→ VERIFY
→ CORRECT IF NEEDED
→ VERIFY AGAIN
→ REVIEW
→ CORRECT IF NEEDED
→ REVIEW AGAIN
→ HANDOFF

Do not ask the user to manually say:

- continue;
- test;
- fix;
- review;
- build.

Escalate only when the Task Contract requires a real human decision or the retry budget is exhausted.

## Preconditions

Before implementation:

1. read `CLAUDE.md`;
2. read `AGENTS.md`;
3. load the Task Contract;
4. confirm current branch;
5. confirm base branch and base HEAD;
6. confirm work branch is not `main` or `master`;
7. confirm allowed and forbidden scope;
8. confirm acceptance criteria;
9. confirm retry budgets.

If these cannot be established safely, return BLOCKED.

## Phase 0 — Context Audit

Before implementation, execute the `context-audit` skill.

Audit task-critical mutable claims including applicable:

- current branch and HEAD;
- base branch and base HEAD;
- remote HEAD when remote state matters;
- previous test/build claims;
- project invariants;
- relevant handoff or memory claims;
- unresolved assumptions that could materially affect implementation.

Require:

`AUDIT_STATUS: PASS`

before delegating implementation.

If the audit returns BLOCKED:

- do not implement;
- preserve the blocker;
- escalate only if it cannot be resolved safely with available deterministic evidence.

Pass downstream only the compact `CONTEXT_PACKET` plus the Task Contract.

Do not forward the full audit investigation unless required for a specific failure.

## Context discipline

Pass each agent only the minimum required context.

Do not pass the full conversation.

Prefer:

- Task Contract;
- relevant confirmed findings;
- relevant file/function locations;
- exact diff;
- exact failure;
- concise predecessor result.

Use:

SEARCH → NARROW → READ

before broad repository reading.

## Phase 1 — Implementation

Delegate implementation to the `implementer` agent.

Provide:

- Task Contract;
- confirmed relevant context;
- relevant files/functions;
- acceptance criteria.

The Implementer may perform cheap local checks but does not decide final acceptance.

## Phase 2 — Verification

After implementation, delegate to the `verifier` agent.

Provide:

- Task Contract;
- implementation result;
- changed-file diff;
- required evidence.

The Verifier must return:

PASS
FAIL
or
BLOCKED.

The Verifier must not edit production code.

## Phase 3 — Verification correction loop

If verification returns FAIL:

1. preserve the exact failure;
2. classify the failure;
3. increment the fix attempt count;
4. compare against `execution.max_fix_attempts`;
5. if budget remains, delegate a targeted correction to `implementer`;
6. provide only:
   - Task Contract;
   - exact failure;
   - smallest useful failure context;
   - current diff;
   - required correction;
7. run `verifier` again.

Do not restart the entire task when the failure is localized.

Do not repeat the same correction attempt without new evidence.

If the fix budget is exhausted, return BLOCKED with the accumulated evidence.

## Phase 4 — Review

When verification returns PASS, delegate to `reviewer`.

Provide:

- Task Contract;
- final implementation summary;
- final diff;
- verifier result;
- required evidence.

The Reviewer returns:

ACCEPT
or
REJECT.

## Phase 5 — Review correction loop

If Reviewer returns REJECT:

1. preserve only the actionable required fixes;
2. increment review rejection count;
3. compare against `execution.max_review_rejections`;
4. if budget remains, send the required fixes to `implementer`;
5. run `verifier` again after the correction;
6. only after verification PASS, run `reviewer` again.

Never skip verification after a review-driven code change.

If review rejection budget is exhausted, return BLOCKED.

## Completion

A task may be marked ACCEPTED only when:

- implementation exists;
- required verification passed;
- required build/runtime/browser evidence exists;
- Reviewer returned ACCEPT;
- scope was respected;
- final branch and HEAD are known.

Do not merge or push to `main`.

Do not automatically integrate into another branch unless the Task Contract explicitly authorizes that action.

## Escalation

Escalate only for:

- contradictory requirements;
- product or gameplay decisions;
- significant architecture outside scope;
- destructive operations;
- protected branch changes;
- unsafe integration conflicts;
- required files outside allowed scope;
- insufficient evidence that cannot be obtained safely;
- exhausted fix budget;
- exhausted review budget.

## Final output

Use the `structured-handoff` skill.

Return a concise result containing:

TASK_ID:
STATUS:
WORK_BRANCH:
FINAL_HEAD:

IMPLEMENTED:
- ...

VERIFICATION:
- ...

REVIEW:
- ...

FIX_ATTEMPTS:
REVIEW_REJECTIONS:

LIMITATIONS:
- ...

NEXT_ACTION:
- ...
