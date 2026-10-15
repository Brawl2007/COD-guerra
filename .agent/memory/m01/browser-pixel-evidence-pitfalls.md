# Browser pixel evidence pitfalls (T44, T20, 2026-10-10)
- Late texture uploads: the damage-decal atlas is painted in timer slices and uploads on a later render; the
  paused-frame cache in src/render/m01-view.js does not repaint for it. Before any paused A/B capture wait for
  `gameDiagnostics().m01.damageDecals.atlasReady` and force a repaint (e.g. `window.m01WaterDebug.setDetail(false/true)`
  with `?debug=1`). Evidence: CI 38003872703 fail -> 38045943911 pass.
- Pixel A/B denominators must exclude depth-occluded subjects: impostors behind bridge decks/trusses give maxDiff 0
  on/off and cap the changed fraction. Use a conservative geometric line-of-sight oracle and assert a floor of
  sighted subjects. Evidence: T20 CI 38006506690 fail -> 38047289527 pass.
- See also browser-spec-menu-frame-race.md and fair-pixel-evidence.md.
