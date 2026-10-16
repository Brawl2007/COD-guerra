# Browser specs: wait for the loaded frame, not just for actors (T35, 2026-10-10)
The M01 menu renders the fresh mission at clock 0 every frame, and gameDiagnostics().clock reads sim.clock live,
so after loadCheckpoint the clock already shows the save while character stats still come from the clock-0 frame.
Waiting for `actors.length>0` is satisfied by the menu frame. Wait until `gameDiagnostics().m01.demolition.clock`
(last drawn frame clock, m01-view.js lastClock) equals the save clock before snapshotting.
Evidence: CI 38042227351 fail -> 38043817745 pass (tests/browser/m01-anim-resolver.spec.js drawnAt helper).
