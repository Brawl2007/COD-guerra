#!/usr/bin/env python3
"""Report which model and effort each Claude Code agent actually used.

Reads the transcript files Claude Code writes under ~/.claude/projects (main sessions as
<session>.jsonl, subagents as <session>/subagents/agent-<id>.jsonl) and prints, per transcript,
the models and effort levels recorded on its assistant turns plus token counts.
Only metadata is read; no message content is printed.
"""

import argparse
import json
import os
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path


def iter_transcripts(root, max_age_hours):
    cutoff = time.time() - max_age_hours * 3600
    for path in sorted(Path(root).rglob("*")):
        if path.suffix not in (".jsonl", ".output") or not path.is_file():
            continue
        try:
            if path.stat().st_mtime < cutoff:
                continue
        except OSError:
            continue
        yield path


def summarise(path):
    models, efforts = Counter(), Counter()
    tokens = defaultdict(int)
    turns = fallbacks = 0
    seen_requests = set()
    agent = ""
    first_ts = last_ts = None
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            try:
                rec = json.loads(line)
            except ValueError:
                continue
            if not isinstance(rec, dict) or rec.get("type") != "assistant":
                continue
            msg = rec.get("message") if isinstance(rec.get("message"), dict) else {}
            model = msg.get("model") or rec.get("requestedModel")
            if not model:
                continue
            # One API response is stored as several records (one per content block) sharing a
            # requestId and repeating the same usage: count each response once.
            req = rec.get("requestId")
            if req:
                if req in seen_requests:
                    continue
                seen_requests.add(req)
            turns += 1
            models[model] += 1
            efforts[str(rec.get("effort") or "-")] += 1
            requested = rec.get("requestedModel")
            if requested and requested != model:
                fallbacks += 1
            agent = agent or str(rec.get("attributionAgent") or rec.get("agentType") or "")
            usage = msg.get("usage") if isinstance(msg.get("usage"), dict) else {}
            for key in ("input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"):
                tokens[key] += int(usage.get(key) or 0)
            ts = rec.get("timestamp")
            if ts:
                first_ts = first_ts or ts
                last_ts = ts
    if not turns:
        return None
    kind = "subagent" if "subagents" in path.parts or path.name.startswith("agent-") else "main"
    return {
        "file": str(path), "kind": kind, "agent": agent, "turns": turns,
        "models": dict(models), "efforts": dict(efforts), "tokens": dict(tokens),
        "fallbacks": fallbacks, "first": first_ts, "last": last_ts,
    }


def fmt_counter(d):
    return ", ".join(f"{k}×{v}" for k, v in sorted(d.items(), key=lambda kv: -kv[1]))


def defined_agents(agents_dir):
    """name -> (model, effort) from the frontmatter of every .claude/agents/*.md."""
    out = {}
    for path in sorted(Path(agents_dir).glob("*.md")):
        text = path.read_text(encoding="utf-8", errors="replace")
        if not text.startswith("---"):
            continue
        fields = {}
        for line in text.split("---", 2)[1].splitlines():
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()
        out[fields.get("name", path.stem)] = (fields.get("model", "-"), fields.get("effort", "-"))
    return out


def print_coverage(rows, agents_dir):
    defined = defined_agents(agents_dir)
    if not defined:
        print(f"No agent definitions found in {agents_dir}.")
        return
    used = defaultdict(lambda: {"turns": 0, "models": Counter(), "efforts": Counter()})
    for r in rows:
        if r["agent"] in defined:
            u = used[r["agent"]]
            u["turns"] += r["turns"]
            u["models"].update(r["models"])
            u["efforts"].update(r["efforts"])
    print(f"\nCoverage of {len(defined)} defined agents ({len(used)} used):")
    print(f"{'agent':20} {'defined':16} {'used':>5}  {'served models / efforts'}")
    for name, (model, effort) in defined.items():
        u = used.get(name)
        if u:
            print(f"{name:20} {model + '/' + effort:16} {u['turns']:>5}  {fmt_counter(u['models'])} / {fmt_counter(u['efforts'])}")
        else:
            print(f"{name:20} {model + '/' + effort:16} {'never':>5}")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--root", default=os.path.expanduser("~/.claude/projects"))
    ap.add_argument("--hours", type=float, default=24, help="only transcripts modified in the last N hours")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--coverage", action="store_true",
                    help="also list every agent defined in --agents-dir and whether it was used")
    ap.add_argument("--agents-dir", default=str(Path(__file__).resolve().parents[2] / ".claude" / "agents"))
    args = ap.parse_args(argv)

    rows = [s for s in (summarise(p) for p in iter_transcripts(args.root, args.hours)) if s]
    if args.json:
        print(json.dumps(rows, indent=2))
        return 0
    if not rows:
        print(f"No transcripts with assistant turns under {args.root} in the last {args.hours:g} h.")
        if args.coverage:
            print_coverage(rows, args.agents_dir)
        return 0
    print(f"{'kind':9} {'agent':18} {'turns':>5}  {'models':34} {'efforts':22} {'in':>7} {'out':>6} {'cache':>8}  file")
    for r in rows:
        t = r["tokens"]
        cache = t.get("cache_creation_input_tokens", 0) + t.get("cache_read_input_tokens", 0)
        print(f"{r['kind']:9} {(r['agent'] or '-')[:18]:18} {r['turns']:>5}  {fmt_counter(r['models'])[:34]:34} "
              f"{fmt_counter(r['efforts'])[:22]:22} {t.get('input_tokens', 0):>7} {t.get('output_tokens', 0):>6} "
              f"{cache:>8}  {Path(r['file']).name}")
    multi = [r for r in rows if len(r["models"]) > 1 or len(r["efforts"]) > 1]
    if multi:
        print(f"\n{len(multi)} transcript(s) switched model or effort mid-run (fallback or /model): see rows above.")
    fb = sum(r["fallbacks"] for r in rows)
    if fb:
        print(f"{fb} turn(s) were served by a different model than requested (server-side fallback).")
    if args.coverage:
        print_coverage(rows, args.agents_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main())
