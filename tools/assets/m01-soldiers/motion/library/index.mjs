// Roster of the M01 soldier clip library V2 (roadmap T08, annex B of the animation plan).
import { bakeClip } from './common.mjs';
import { locomotionClips } from './locomotion.mjs';
import { postureClips } from './posture.mjs';
import { idleClips } from './idles.mjs';
import { reactionClips } from './reactions.mjs';
import { coverClips } from './cover.mjs';
import { callClips } from './call.mjs';

/** Every clip of the library, baked: [{ name, clip, duration, fps, loop, meta, source? }]. */
export function buildLibrary(R) {
  const specs = [locomotionClips, postureClips, idleClips, reactionClips, coverClips, callClips].flatMap(group => group(R));
  const names = new Set();
  return specs.map(s => {
    if (names.has(s.name)) throw new Error(`Duplicate clip ${s.name}`);
    names.add(s.name);
    return { ...s, clip: s.clip ?? bakeClip(s.name, s.duration, s.fps, s.poseAt) };
  });
}
