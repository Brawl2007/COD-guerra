#!/usr/bin/env python3
"""Read-only check of the local Claude Code setup for COD-guerra.

Reports the CLI version, advisor/model settings, environment variables that
change billing or disable the advisor, and the project agents. Never prints
secret values and never writes anything.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ADVISOR_MIN_FABLE = (2, 1, 257)
HAIKU_55_MIN = (2, 1, 293)
REQUIRED_AGENTS = ("captain", "explorer", "Explore", "researcher", "implementer",
                   "implementer-deep", "verifier", "reviewer", "reviewer-critical")
COMBO_AGENTS = tuple(f"{m}-{e}" for m in ("haiku", "sonnet", "opus", "fable")
                     for e in ("low", "medium", "high", "xhigh", "max"))

# name -> (level, message) when the variable is set to a non-empty value
ENV_RULES = {
    "ANTHROPIC_API_KEY": ("WARN", "Claude Code may bill the API key instead of the Max plan; check /status"),
    "CLAUDE_CODE_DISABLE_ADVISOR_TOOL": ("WARN", "advisor disabled entirely"),
    "DISABLE_TELEMETRY": ("WARN", "turns off feature-flag fetching, so the advisor stays off"),
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": ("WARN", "turns off feature-flag fetching, so the advisor stays off"),
    "CLAUDE_CODE_SUBAGENT_MODEL_FORCE": ("WARN", "subagent model fields are ignored"),
    "CLAUDE_CODE_SUBAGENT_MODEL": ("INFO", "overrides subagents without a model field"),
    "CLAUDE_CODE_EFFORT_LEVEL": ("WARN", "overrides the effort set in every agent"),
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": ("WARN", "agent teams on: named subagents launch as full teammates and use much more of the plan"),
    "TYPESAFE_API_KEY": ("INFO", "Jev key present (paid calls capped at 3 by jev_router)"),
}


def parse_version(text):
    m = re.search(r"(\d+)\.(\d+)\.(\d+)", text or "")
    return tuple(int(x) for x in m.groups()) if m else None


def check_version(version):
    out = []
    if version is None:
        return [("WARN", "claude not found or version unreadable; run `claude --version`")]
    v = ".".join(map(str, version))
    out.append(("INFO", f"Claude Code {v}"))
    if version < ADVISOR_MIN_FABLE:
        out.append(("WARN", "Fable 5.1 advisor needs >= 2.1.257; run `claude update`"))
    if version < HAIKU_55_MIN:
        out.append(("WARN", "Haiku 5.5 agents need >= 2.1.293; run `claude update`"))
    return out


def check_env(env, source="environment"):
    out = []
    for name, (level, msg) in ENV_RULES.items():
        value = str(env.get(name) or "").strip()
        if value and not (name == "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" and value == "0"):
            out.append((level, f"{name} set in {source}: {msg}"))
    return out


def load_json(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except (OSError, ValueError) as exc:
        return {"__error__": str(exc)}


def check_settings(path, label):
    data = load_json(path)
    if data is None:
        return [("INFO", f"{label}: absent")]
    if "__error__" in data:
        return [("WARN", f"{label}: unreadable JSON ({data['__error__']})")]
    out = []
    for key in ("model", "advisorModel", "effortLevel", "modelSettings"):
        if key in data:
            out.append(("INFO", f"{label}: {key} = {json.dumps(data[key])}"))
    env = data.get("env")
    if isinstance(env, dict):
        out.extend(check_env(env, f"{label} env"))
    return out or [("INFO", f"{label}: present, no model/advisor keys")]


def frontmatter(path):
    text = Path(path).read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}
    block = text.split("---", 2)[1]
    fields = {}
    for line in block.splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()
    return fields


def check_agents(project_dir, home):
    out = []
    pdir = Path(project_dir) / ".claude" / "agents"
    found = {}
    for base, label in ((pdir, "project"), (Path(home) / ".claude" / "agents", "user")):
        if base.is_dir():
            for f in sorted(base.glob("*.md")):
                fm = frontmatter(f)
                name = fm.get("name", f.stem)
                found.setdefault(name, (label, fm))
    if not pdir.is_dir():
        out.append(("WARN", "no .claude/agents in this checkout: switch to a branch that has the agents"))
    for name in REQUIRED_AGENTS:
        if name in found:
            label, fm = found[name]
            out.append(("OK", f"agent {name} ({label}): model={fm.get('model', '-')} effort={fm.get('effort', '-')}"))
        else:
            out.append(("WARN", f"agent {name} missing"))
    bad = [n for n in COMBO_AGENTS
           if n not in found or (found[n][1].get("model"), found[n][1].get("effort")) != tuple(n.split("-"))]
    if bad:
        out.append(("WARN", f"combination agents missing or mismatched: {', '.join(bad)}"))
    else:
        out.append(("OK", f"{len(COMBO_AGENTS)} combination agents (4 models x 5 effort levels)"))
    return out


def git_branch(project_dir):
    try:
        r = subprocess.run(["git", "-C", str(project_dir), "branch", "--show-current"],
                           capture_output=True, text=True, timeout=5, check=False)
        return r.stdout.strip() or "(detached)"
    except (OSError, subprocess.SubprocessError):
        return "(unknown)"


def claude_version():
    try:
        r = subprocess.run(["claude", "--version"], capture_output=True, text=True, timeout=20, check=False)
        return parse_version(r.stdout)
    except (OSError, subprocess.SubprocessError):
        return None


def run_checks(project_dir, home, env, version):
    results = [("INFO", f"branch: {git_branch(project_dir)}")]
    results += check_version(version)
    results += check_env(env)
    results += check_settings(Path(home) / ".claude" / "settings.json", "user settings")
    results += check_settings(Path(project_dir) / ".claude" / "settings.json", "project settings")
    results += check_settings(Path(project_dir) / ".claude" / "settings.local.json", "local settings")
    results += check_agents(project_dir, home)
    return results


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", default=".")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)
    results = run_checks(Path(args.project).resolve(), Path.home(), os.environ, claude_version())
    if args.json:
        print(json.dumps([{"level": lvl, "message": msg} for lvl, msg in results], indent=2))
    else:
        for lvl, msg in results:
            print(f"[{lvl}] {msg}")
        warns = sum(1 for lvl, _ in results if lvl == "WARN")
        print(f"\n{warns} warning(s). Inside Claude Code also run /status and /advisor.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
