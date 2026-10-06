# COD-guerra Task Graph V1

Task Graphs describe execution dependencies for autonomous COD-guerra tasks.

A graph defines what may run and in what dependency order.

It does NOT contain mutable runtime truth.

Runtime node state belongs under:

`.agent/runs/<RUN_ID>/`

and is not committed.

## Node states

Runtime nodes may have:

- PENDING
- READY
- RUNNING
- PASS
- FAIL
- BLOCKED
- SKIPPED

## Optional nodes

A node may be declared:

`"optional": true`

Only optional nodes may enter `SKIPPED`.

An optional node may become `SKIPPED` from either:

- READY;
- RUNNING.

Required nodes must never use `SKIPPED` merely to advance the graph.

## Dependency rule

A node becomes READY only when all nodes in `depends_on` are PASS or explicitly satisfied.

A failed node must not automatically restart the entire graph.

Retry only the smallest affected node/subgraph.

## Parallelism

Nodes with no dependency relationship may be candidates for parallel execution later.

V1 remains serial by default.

Parallel write execution must not be enabled until resource leases/worktree isolation exist.

## Deterministic nodes

Prefer deterministic tools for:

- Git checks;
- tests;
- builds;
- schema validation;
- regression union;
- tracing.

Use agents only where judgment or implementation is required.

## Safety

Graphs must never authorize:

- direct work on main/master;
- force push;
- destructive Git operations;
- silent scope expansion;
- bypassing required verification or review.

Task Contract policy remains authoritative.

## Graph and Task Contract

The Task Contract defines:

- objective;
- scope;
- policy;
- acceptance criteria;
- verification requirements;
- retry budgets.

The Task Graph defines:

- execution nodes;
- dependencies;
- node roles/types;
- retry relationships.

The graph must not weaken the Task Contract.
