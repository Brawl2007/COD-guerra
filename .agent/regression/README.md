# COD-guerra Regression Obligation Ledger V1

This directory stores durable regression obligations produced by ACCEPTED tasks.

Purpose:

Task A obligations
UNION
Task B obligations
UNION
Task C obligations

become the required checks for a later integration gate.

## Rules

Only ACCEPTED work may create a durable regression record.

A regression record must identify:

- TASK_ID;
- accepted code HEAD;
- obligation ID;
- check kind;
- concrete check;
- reason.

Obligation IDs must be stable.

If two accepted tasks use the same obligation ID with different definitions, integration must stop and report a conflict.

Do not silently choose one definition.

## Obligation kinds

Supported V1 kinds:

- test
- build
- browser
- runtime
- persistence
- performance
- manual

## Evidence

A regression obligation means:

"this behavior must continue to be proven"

It does NOT mean the check is permanently PASS.

The integration gate must execute or otherwise obtain the required fresh evidence.

## Scope

Do not register every test in the project.

Register only checks whose continued validity matters because of the accepted task.

Normal focused verification remains defined by the Task Contract.

Broad regression certification belongs primarily to integration gates.
