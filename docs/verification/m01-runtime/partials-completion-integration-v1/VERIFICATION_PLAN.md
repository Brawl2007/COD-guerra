# Independent acceptance gates

The eleven-task batch is an implementation candidate until an independent verifier returns PASS and reviewer returns ACCEPT. Implementation checks and predecessor CI are not final acceptance. Exact task clauses are in `TASK_CRITERIA.json`; task mapping and deliberate deltas are in `IMPLEMENTATION.md`.

| Gate | Required concrete evidence | Owner |
| --- | --- | --- |
| Exact source/scope | Pinned committed source; four source ancestors; French authority/map, physical layout/colliders, original GLBs and generic animation variation preserved | Verifier |
| Integrated Node/build | Fresh complete `npm test`, production build, collider check, complete mission route, final logs/counts | Verifier / normal CI |
| Predecessor authority | Strict per-tick original golden routes against clean `bc8f6a2`, narrow named T36 exceptions, current fixture reproduction without rewriting any fixture | Verifier / simulation-authority CI |
| Cover outcomes | All twelve original seeds × both routes; raw predecessor/current full reports and unchanged outcome invariants, plus exact all summary/route stats against the sole authorised WEST-readiness policy replay (`CAPTAIN_AMENDMENT_01_COVER_EXTENSION.json`) | Verifier / simulation-authority CI |
| Current renderer authority | Twenty-four real-control full-save/event/checkpoint futures, actual bridge owner ON/OFF on the current simulation; original protected scene bytes | Verifier / simulation-authority CI |
| New presentation | Four free scenes with pause and actual page reload; native train draw budget <=12 and decoded ~1 km lamp/smoke proof; actual yard actors/damage at requested times; optional crew fallback | Verifier / integrated-browser CI |
| Bridge appearance/ownership | Actual authored material viewer; six phase/camera views and two controls paired ON/OFF on the SAME current mission state; failed assets, disabled warm cards, real frames, demolition, checkpoint/quality/reload | Verifier / bridge-paired-and-coupled CI |
| Coupled regression | Production audio and offline waveform, HUD, train/rail/contact, terrain/vegetation, water and demolition browser obligations; raw diagnostics and inspectable PNGs retained | Verifier / browser CI jobs |
| Review | Independent review of clauses, implementation diff, precise authorised golden deltas and sufficient evidence | Reviewer |
| Integration | After acceptance, publish the work branch/PR and fast-forward authorised `claude/m01-integration` only after remote recheck. Main receives no write from this execution | Captain |

The older bridge branch failed its original bounded attempt budget. That history remains unchanged. This user-authorised eleven-task batch has its own bounded contract. Historic full-save comparisons against the old graphics-only simulation are not reclassified as passes: new carry phases, optional roster, dialogue and presentation records deliberately alter that source. Fresh current-authority ON/OFF comparisons preserve renderer noninterference.

Node and browser processes sharing this two-core environment must be scheduled to avoid unnecessary contention. CI separates the independent CPU audit and browser groups. No FPS, target-hardware performance or human playtest is inferred from these gates.
