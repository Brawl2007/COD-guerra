# M01 bridge authority: pins, drift inventory and provenance ledger

Branch `claude/m01-bridge-authority-provenance-v1` (from candidate 813f163, PR #80, base `main` 6697956).
Problem: `.github/workflows/m01-t14-t41-bridge-finish.yml` runs `m01-bridge-finish-v2-authority.mjs` in historical mode
(pin 8a0c362). On any main-based PR that guard fails with `ENOENT .github/workflows/ci.yml`, and even without the ENOENT it
would reject 136 paths that approved work already changed on main. The fix keeps every pin and every byte check, and replaces
"the bytes never changed" by "the bytes equal the pin, or equal an explicitly reviewed, commit-backed approved state".

## 1. Inventory of pinned SHAs

| Pin | Where | What it protects / asserts | Valid on a main-based PR? |
|---|---|---|---|
| `8a0c362` (T09/T28, T13/T32, T31/T33, T27/T30, T10/T29 delivery) | `m01-bridge-finish-v2-authority.mjs` default mode | every `src/`, `assets/`, `missions/`, `tools/assets/`, `tests/` file of that tree (except `src/render/m01-view.js`) plus `package.json`, `package-lock.json`, `vite.config.js`, `playwright.config.js`, `.github/workflows/ci.yml`: 552 paths, exact bytes | No: 136 paths drifted on main, 2 were deleted |
| `8a0c362` | `m01-t14-t41-bridge-finish.yml` "Prepare exact base" (`git worktree add`, base build, preview :4188) | the "untouched base" browser capture | No (see section 4) |
| `8a0c362` | `m01-bridge-finish-v2-future-batch.mjs` line 17 (`reference.baselineHead` must be 8a0c362 unless `--current-authority`), `--baseline /tmp/m01-bridge-base` in the workflow | 24 A/B futures: events, full snapshots and checkpoints of the 8a0c362 simulation equal the current simulation | No (the French simulation was deliberately changed after it: T23 east front, T24, partials) |
| `8a0c362` | `m01-bridge-finish-v2-source.mjs` (`baseHead` label only) | records the label in the freeze file; the freeze itself is self-consistent (hash taken and re-checked in the same run) | Yes, no byte pin |
| `8a0c362` | `m01-partials-completion-integration-v1.yml` line 42 | `git merge-base --is-ancestor 8a0c362 HEAD` (history preserved) | Yes, no byte pin |
| `bc8f6a2` (predecessor of the partials completion) | authority script `--current-authority` | assets (impostor manifest author-only), `src/render/m01-terrain*`, `src/world/tczew-world.js`, `map-layout.json`, `m01-soldier-variation.js`, `src/game/simulation.js`, `src/world/world.js`, `package.json`, `package-lock.json`: 299 paths, exact bytes | Not as written: 45 paths drifted on main |
| `bc8f6a2` | `m01-partials-completion-integration-v1.yml` line 90 and `m01-partials-completion-audit.mjs` / `m01-partials-cover-policy-audit.mjs` (predecessor worktree) | delta audit and 12-seed cover invariants against the predecessor tree | Yes: they compare with a worktree, not the working tree paths |
| `8a0c362` (comment only) | `tests/helpers/m01-byte-guard-allowlist.js` | nothing | n/a |

## 2. Drift between each pin and main 6697956

`git ls-tree` of the pin versus main 6697956, per protected path (hash of bytes). The responsible commit is the earliest commit
in main's history that holds the approved state of the path (or, for a deletion, the earliest commit containing the pin without
the path). All of them are ancestors of 6697956 (checked with `git merge-base --is-ancestor`, and again by the verifier on every run).
The full per-path list with hashes is the ledger, `tools/verification/m01-bridge-authority-provenance.json` (181 entries).

`bc8f6a2` (current-authority scope), 45 paths:
- 43: `assets/models/provisional/m01/props/*.glb` (lod0/lod1) and `props/manifest.json`, commit `16dd41b` "make the M01 prop kit generator architecture-independent" (T12; also the reason the `props` GLBs differ from the pin).
- 1: `package.json`, commit `64275b3` "build:browser serves the authoring viewers that three specs open next to the game".
- 1: `src/render/m01-terrain-envelope.js` (+3 lines), merge `9928bdc` (the merge of 8a0c362 into the candidate; 8a0c362 itself equals bc8f6a2 for this file, so the 3 lines come from the candidate side of that merge).
- The impostor manifest `author` field (added by `e0d494e`) is not in the ledger: it is covered by the author-only rule below.

`8a0c362` (historical scope), 136 paths, 134 changed and 2 deleted. By commit (details per path in the ledger):
`16dd41b` 51 (props art, `tools/assets/m01-props`, `tests/`), `02396fd` 15 (merge of the partials batch), `e0d494e` 13 (complete scoped partial runtime systems),
`9149de7` 5, `9928bdc` 4 changed + 2 deleted, `04d6dcf` 4, `521bdf3` 4, `8387b56` 3, `467953d` 3, `fd2539f` 3, `c5ed487` 3 and one or two each for
`64275b3`, `afcd970`, `ae0f453`, `fb9968b`, `1c59d6a`, `61ecd77`, `e257c6e`, `1f8bd2d`, `bca75ae`, `f3ef5fa`, `f86ceb7`, `899937f`, `438510d`, `6de39c1`, `1ff893d`, `ea0b4ca`,
`1990a58`, `9d5f49d`, `e085e96`, `9596059`, `ed26449`, `4653207`: touch controls (PR #74), T23 east front, T24 train, T50 loader, PT05 wagon colliders, T05a audio data fields,
H9-D1 difficulty, byte-guard allowlist and browser-spec waits. Each is an already merged change on main.
Deletions: `.github/workflows/ci.yml` (never present on the candidate's first-parent line; dropped when 8a0c362 was merged by `9928bdc`) and
`tools/assets/m01-props/src/reproducibility.mjs` (8a0c362 delivered it; the candidate's first parent never had it and merge `9928bdc` did not take it). Both are recorded as deletions with `approvedSha256: null`, not silently dropped from the protected list.

Caveat: 44 historical-scope paths differ between candidate HEAD and main 6697956 (e.g. `src/game/m01-simulation.js`, `src/render/m01-actor-pose.js`, `tests/m01-runtime.test.js`);
they are PR #80's own changes, not drift approved on main. The historical scope therefore still fails on candidate HEAD in `--provenance` mode (44 paths: ledger hash differs from the working tree). This is correct and by design: a
guard that protects all of `src/` and `tests/` cannot be satisfied by a PR that evolves them. It passes on a clean main-based tree (verified in a temporary worktree of 6697956: 416 equal the pin, 134 ledger, 2 deletions).

## 3. Design

New files (historical pins and the old default behaviour of the authority script are untouched):
- `tools/verification/m01-bridge-authority-provenance.mjs`: `verifyProvenance()` and a CLI wrapper.
- `tools/verification/m01-bridge-authority-provenance.json`: the ledger. Entry: `mode` (`historical`|`currentAuthority`), `path`, `pinnedSha256`, `approvedSha256` (`null` = recorded deletion), `approvingCommits` (full SHAs), `reason`.
- `tools/verification/m01-bridge-authority-ledger-draft.mjs`: prints a DRAFT of entries from `git` for a given main commit. Never run in CI; a human reviews and commits.
- `m01-bridge-finish-v2-authority.mjs`: only adds `--provenance`, `--pr-base <sha>`, `--ledger`, `--ledger-base` and `--list-protected`; `--pr-base`/`--ledger*` without `--provenance` fail loudly.

Acceptance rule for each protected path (`--provenance`, with `--current-authority` selecting the bc8f6a2 set):
1. bytes equal the pinned bytes; or
2. a ledger entry exists whose `pinnedSha256` equals the real pin hash, whose `approvedSha256` equals the working-tree hash (or `null` and the file is absent), and every `approvingCommits` entry is an ancestor of the base (the PR base in PR mode, else HEAD) and its tree at that commit really holds those bytes (or lacks the file).
Anything else fails: byte change, missing file not recorded, hash mismatch, non-ancestor commit, ledger pin differing from the script pin, duplicate entry, entry for a path outside the protected set. All failures are collected and printed together.
PR mode (`--pr-base <github.event.pull_request.base.sha>`): every protected path (including deletions) must also be byte-identical to the PR base, so the PR cannot alter what is protected, even to bytes the pin would accept.
Impostor manifest (bc8f6a2 scope): every field except `author` must equal the pin (and the PR base); `author` must be a non-empty string in the working tree, and, when present, in the reference (the bc8f6a2 pin has no `author`).
Limits: a PR can still add ledger entries or edit the verifier; that is a reviewable diff, and an entry only counts if its commit is already an ancestor of the base and holds exactly those bytes. The ledger and verifier are not themselves pinned (chicken and egg for the PR that introduces them).

## 4. Decision for the other 8a0c362-pinned steps

On a main-based PR (`pull_request`, and `workflow_dispatch`) they are not valid, so they are replaced, not deleted: the 8a0c362 base build/preview/capture, `compare` against it, and `future-batch --baseline /tmp/m01-bridge-base`
demand equal full state, camera, parts, pixels and 24 future event/snapshot streams between the 8a0c362 simulation/art and the current ones. Main has deliberately changed both since (T23, T24, partials, props, terrain).
The equivalent current-authority steps already used by `m01-partials-completion-integration-v1.yml` are used instead: bridge owner OFF (`M01_BASELINE_CAPTURE=1`, `M01_BRIDGE_CURRENT_AUTHORITY=1`) versus ON on the same current build, the same `compare`, and `future-batch --current-authority` (24 ON/OFF futures against the current simulation).
`push` to `codex/m01-t14-t41-bridge-finish-v2` keeps the original steps byte for byte (now behind `if: github.event_name == 'push'`). Steps that never depended on the pin (material viewer, current runtime, regressions, source freeze) are unchanged.
The workflow path filters also include the new verifier, ledger and test.

## 5. Not verified

The reworked workflow is validated as YAML only; no browser or CI job was run. The browser steps in the pull-request branch are copies of the partials workflow steps, ported to port 4190 of this job, and need one CI run to confirm.
