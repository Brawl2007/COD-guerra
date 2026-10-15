// T21 browser-proof helper: feedback-controlled camera corrections only.
// Pure dependency-injected logic so delayed simulation frames can be tested offline.
export async function levelCameraClosedLoop({
  readPitch, sendMovement, waitForChange, trace = () => {},
  tolerance = 0.18, maxMovement = 65, maxAttempts = 16, radiansPerUnit = 0.0022,
}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
    trace({attempt, before, movementY, after, status: 'confirmed'});
    if (!Number.isFinite(after) || Math.abs(after - before) < 0.003 ||
        (before > tolerance && after >= before) || (before < -tolerance && after <= before)) {
      throw Error(`Camera input did not move pitch towards level: ${before} -> ${after}`);
    }
  }
  const remaining = await readPitch();
  throw Error(`Camera still not level after ${maxAttempts} confirmed inputs: pitch=${remaining}`);
}
