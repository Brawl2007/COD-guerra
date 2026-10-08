---
name: project-memory
description: Retrieve and update compact COD-guerra project memory while treating Git/code/tests as authoritative and preventing stale context, duplicate notes and uncontrolled memory growth.
---

# COD-guerra Project Memory

Use this skill to retrieve or update durable project knowledge without loading the full project history.

Memory is an index to truth.

Memory is not the source of truth.

## Modes

Use one of two modes:

- RETRIEVE
- UPDATE

## RETRIEVE

Retrieve memory before implementation only when prior project knowledge may materially help the task.

Search narrowly.

Prefer:

1. TASK_ID;
2. subsystem;
3. filename;
4. function or symbol;
5. asset name;
6. decision topic;
7. branch name.

Use targeted `rg` searches under `.agent/memory/`.

Do not load the entire memory directory.

Normally load no more than 3-5 highly relevant notes.

## Retrieval priority

Prefer notes with:

`STATUS: CURRENT`

Ignore `ARCHIVED` notes unless historical context is explicitly needed.

A `SUPERSEDED` note may be read only when needed to understand why a newer decision exists.

When a note contains `SUPERSEDED_BY`, prefer the newer note.

## Memory validation

Do not trust mutable memory claims automatically.

Examples:

- HEAD;
- branch status;
- current file contents;
- test PASS;
- build PASS;
- runtime state.

Send relevant mutable claims through the `context-audit` process before relying on them.

A memory note may identify where evidence exists, but it does not replace the evidence.

## Retrieval output

Return only:

MEMORY_TOPICS:
- ...

RELEVANT_NOTES:
- path:
  reason:

DURABLE_CONTEXT:
- ...

CLAIMS_REQUIRING_REVALIDATION:
- ...

Do not return complete notes unless their full contents are necessary.

## UPDATE

Update memory only after a task has reached an accepted or explicitly approved durable state.

Normally require:

- Verifier PASS;
- Reviewer ACCEPT;
- final HEAD known;
- supporting evidence known.

Do not write memory from failed or speculative work as if it were confirmed.

## What deserves memory

Store only knowledge likely to help future tasks, such as:

- durable architecture decisions;
- subsystem ownership/invariants;
- important asset constraints;
- validated regression obligations;
- reusable test/evidence pointers;
- task outcomes that change future work;
- historical conclusions that affect implementation.

Do not create a memory note merely because a task occurred.

## What must not be stored

Do not store:

- full conversations;
- full prompts;
- large logs;
- raw test output;
- duplicated source code;
- temporary debugging notes;
- transient terminal output;
- unsupported hypotheses as confirmed facts;
- secrets, credentials or tokens.

## Note creation

Use `.agent/templates/MEMORY_NOTE.md`.

Keep notes small and specific.

Prefer one topic per note.

Recommended filename:

`YYYY-MM-DD__topic__TASK-ID.md`

Use a short lowercase topic with hyphens.

## Supersession

Do not silently rewrite history when a durable fact changes.

When replacing an old note:

1. mark the old note `STATUS: SUPERSEDED`;
2. set `SUPERSEDED_BY`;
3. create the new note;
4. set its `SUPERSEDES` field.

Do not delete the old note merely because it became outdated.

## Evidence

For confirmed claims, record applicable:

- commit SHA;
- verification artifact path;
- test name or command;
- relevant source file;
- decision source.

Never turn missing evidence into PASS.

## Size discipline

Keep each note concise.

Target approximately 150-500 words.

If a note becomes large, split by subsystem or topic rather than accumulating history forever.

## Completion update

After an accepted task, ask:

"Did this task create durable knowledge future work needs?"

If NO:
- do not create memory.

If YES:
- create or supersede the minimum necessary note.

The structured handoff remains separate from durable memory.
