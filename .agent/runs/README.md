# Agent Run Traces

Runtime execution traces are stored here as:

`.agent/runs/<RUN_ID>/events.jsonl`

These traces are local operational data.

They are NOT project truth and are NOT durable project memory.

Do not store:

- secrets;
- tokens;
- credentials;
- full prompts;
- full conversations;
- large command outputs.

Use traces to measure:

- task attempts;
- verification failures;
- correction loops;
- review rejections;
- human intervention;
- task duration;
- final status.

Durable conclusions belong in `.agent/memory/`, not raw run traces.
