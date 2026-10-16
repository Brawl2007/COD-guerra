// T21 browser-proof helper: feedback-controlled camera corrections only.
// Pure dependency-injected logic so delayed simulation frames can be tested offline.
//
// readExternalLook (optional): returns the cumulative sum of movementY carried by TRUSTED
// (non-synthetic) mouse events that the page saw. Real Playwright pointer actions under pointer
// lock (e.g. mouse.down/up used to fire) can deliver large relative movements that the game
// consumes as camera look. When such input is observed inside an attempt's window the attempt
// cannot be judged (it is traced as 'disturbed' and retried from the new pitch). When no
// foreign input was observed the strict check applies: our own input must move pitch to level.
export async function levelCameraClosedLoop({
  readPitch, sendMovement, waitForChange, readExternalLook = null, trace = () => {},
  tolerance = 0.18, maxMovement = 65, maxAttempts = 16, maxDisturbed = 6, radiansPerUnit = 0.0022,
}) {
  let disturbed = 0, seenExternal = readExternalLook ? await readExternalLook() : 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const external0 = seenExternal;
    const before = await readPitch();
    if (!Number.isFinite(before)) throw Error('Camera pitch diagnostics unavailable');
    if (Math.abs(before) <= tolerance) return before;

    // Only one bounded mouse event may be outstanding at a time.
    const movementY = Math.max(-maxMovement, Math.min(maxMovement, Math.round(before / radiansPerUnit)));
    await sendMovement(movementY);
    let after;
    try {
      // Wait for the simulation to CONSUME this event; fixed sleeps can queue inputs
      // under SwiftShader/slow CI and clamp the view at +/-1.25.
      after = await waitForChange(before);
    } catch (error) {
      const observed = await readPitch();
      trace({attempt, before, movementY, after: observed, status: 'no-confirmation'});
      throw Error(`Camera input not confirmed at attempt ${attempt} (before=${before}, observed=${observed}): ${error.message}`);
    }
    seenExternal = readExternalLook ? await readExternalLook() : 0;
    const externalLook = seenExternal - external0;
    if (readExternalLook && Math.abs(externalLook) >= 1) {
      // Foreign look input shared this window; our own contribution cannot be isolated.
      disturbed++;
      trace({attempt, before, movementY, after, externalLook, status: 'disturbed'});
      if (disturbed > maxDisturbed) throw Error(`Camera look kept being disturbed by foreign mouse input (${disturbed} attempts, pitch=${after})`);
      continue;
    }
    trace({attempt, before, movementY, after, status: 'confirmed'});
    if (!Number.isFinite(after) || Math.abs(after - before) < 0.003 ||
        (before > tolerance && after >= before) || (before < -tolerance && after <= before)) {
      throw Error(`Camera input did not move pitch towards level: ${before} -> ${after}`);
    }
  }
  const remaining = await readPitch();
  throw Error(`Camera still not level after ${maxAttempts} attempts (${disturbed} disturbed): pitch=${remaining}`);
}
