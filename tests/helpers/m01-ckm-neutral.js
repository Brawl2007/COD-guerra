import {M01Simulation} from '../../src/game/m01-simulation.js';

// Test-only variants of the simulation for T47. Each overrides one decision of the ckm gun and nothing else, so what they leave
// untouched is exactly what the live fire policy must not disturb (proved per tick in tools/verification/m01-t47-ckm-fire-audit.mjs).

/** The gun never engages: the route is, tick for tick, the one of the build before T47 apart from the crew standing at S2 (named delta). */
export class CkmNeutralSimulation extends M01Simulation{
  ckmTarget(){return null;}
}

/** The gun fires for real (events, belt, burst plans, its own stream) but its rounds change no German: no damage and no suppression. */
export class CkmGhostSimulation extends M01Simulation{
  ckmImpact(){}
}
