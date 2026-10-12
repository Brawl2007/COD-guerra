# COD-guerra Agent Memory V1

This directory stores small, curated memory notes for future agents.

Memory is NOT the source of truth.

Source-of-truth priority:

1. current Git and code;
2. tests/evidence tied to a commit;
3. versioned project decisions;
4. curated memory;
5. structured handoffs;
6. old conversation context.

## Purpose

Use memory to quickly locate:

- prior decisions;
- relevant subsystem facts;
- known constraints;
- confirmed test/evidence references;
- task outcomes;
- asset information;
- historical research pointers.

Do not store:

- full conversations;
- large logs;
- complete test output;
- duplicated source code;
- mutable HEAD values as permanent truth;
- unsupported claims.

## Categories

Create notes under:

- `systems/`
- `assets/`
- `decisions/`
- `tests/`
- `historical/`
- `tasks/`

Create category directories only when needed.

## Retrieval

Prefer simple targeted search first:

- TASK_ID;
- subsystem;
- filename;
- function;
- branch;
- asset name;
- decision topic.

Use `rg` before loading many notes.

Only load the few notes relevant to the current task.

## Freshness

Every note must have a status:

- CURRENT
- SUPERSEDED
- ARCHIVED

When information changes, do not silently rewrite history.

Prefer:

STATUS: SUPERSEDED
SUPERSEDED_BY: <new note>

The new note should point back with:

SUPERSEDES: <old note>

## Evidence

Memory may point to evidence but must not replace it.

Example:

EVIDENCE:
- docs/verification/...
- commit abc123

A test claim without evidence must not become CONFIRMED merely because it exists in memory.
