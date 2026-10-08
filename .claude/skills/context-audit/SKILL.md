---
name: context-audit
description: Audit mutable COD-guerra task context before implementation, verifying Git state, evidence claims, project invariants and unresolved assumptions while producing a minimal context packet.
---

# COD-guerra Context Audit

Use this skill before planning or implementation when a task contains mutable repository facts, previous test claims, branch/HEAD assumptions or historical handoff context.

## Goal

Prevent agents from executing correctly against stale or unsupported context.

Do not treat previous conversation, memory or handoff text as authoritative when the claim can be checked deterministically.

## Truth hierarchy

Prefer sources in this order:

1. current Git and code;
2. current test/evidence artifacts tied to a commit;
3. versioned project decisions and invariants;
4. curated project memory;
5. structured handoff;
6. previous conversation.

Memory is an index to truth, not a replacement for truth.

## Claim classes

Classify relevant claims as:

- REQUIREMENT
- INVARIANT
- MUTABLE_FACT
- TEST_RESULT
- DECISION
- HISTORICAL_FACT
- HYPOTHESIS

## Audit statuses

Each audited claim must end as one of:

- CONFIRMED
- STALE
- UNVERIFIED
- CONFLICT

Do not silently promote UNVERIFIED information to CONFIRMED.

## Deterministic verification

Prefer tools over model judgment.

Examples:

Branch or HEAD:
- verify with Git;
- check remote when remote state matters.

File/function existence:
- search current checkout/code.

Test claim:
- locate actual evidence;
- confirm whether evidence applies to the relevant HEAD;
- rerun only when the Task Contract requires fresh evidence.

Build claim:
- require actual recorded build evidence or run the build when required.

Project invariant:
- verify against `CLAUDE.md`, `AGENTS.md` or another versioned policy source.

Historical claim:
- verify from authoritative project research when it affects implementation.

## Mutable Git context

Before implementation, confirm applicable:

- current branch;
- current HEAD;
- base branch;
- base HEAD;
- work branch;
- remote HEAD when required;
- whether the work branch is protected;
- whether expected dependencies still exist.

Never assume an old HEAD remains current.

## Test evidence

A statement such as:

"56/56 browser tests passed"

is not sufficient by itself.

Determine:

- what command ran;
- what HEAD it applied to;
- whether evidence still exists;
- whether later changes invalidate it.

If evidence cannot be established, mark UNVERIFIED.

## Conflict handling

If two sources conflict:

1. prefer the higher source in the truth hierarchy;
2. preserve the conflict explicitly;
3. do not invent a reconciliation;
4. block implementation only when the conflict materially affects the task.

## Context minimization

After auditing, do not forward the entire investigation.

Produce a compact Context Packet containing only what downstream work needs.

## Output

Return:

AUDIT_STATUS: PASS | BLOCKED

CONFIRMED:
- ...

STALE:
- ...

UNVERIFIED:
- ...

CONFLICTS:
- ...

INVARIANTS:
- ...

RELEVANT_FILES:
- ...

RELEVANT_EVIDENCE:
- ...

CONTEXT_PACKET:
- task:
- confirmed_git:
- constraints:
- relevant_systems:
- relevant_files:
- required_checks:
- unresolved_items:

BLOCKERS:
- ...

Do not include long logs or full conversation history.

After PASS, Captain persists the `CONTEXT_PACKET` with `python3 .agent/tools/context_packet.py create` (see that tool's `--help`).

## Pass condition

PASS when all task-critical mutable claims are either:

- CONFIRMED; or
- explicitly marked non-blocking.

Return BLOCKED when unresolved or conflicting information would make implementation unsafe or materially ambiguous.
