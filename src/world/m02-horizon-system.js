export const SOUND_SPEED_MPS = 343.0; // L3: 343 m/s at 20 °C

export const M02_TEMPORAL_STATES = Object.freeze({
  T0: Object.freeze({
    id: 'T0',
    label: 'T0 · 9 Set 1939 — Fim da tarde (Preparação e Assalto à Quinta)',
    lightingPreset: 'afternoon_1939_09_09',
    cartela: 'Setor de Łęczyca — 9 de setembro de 1939 — fim da tarde',
  }),
  T1: Object.freeze({
    id: 'T1',
    label: 'T1 · Noite de 9–10 Set 1939 (Acessos de Łęczyca)',
    lightingPreset: 'night_1939_09_09',
    cartela: 'Acessos de Łęczyca — noite de 9 para 10 de setembro',
  }),
  T2: Object.freeze({
    id: 'T2',
    label: 'T2 · 10 Set 1939 — Manhã (Reorganização)',
    lightingPreset: 'morning_1939_09_10',
    cartela: '10 de setembro de 1939 — manhã',
  }),
  T3: Object.freeze({
    id: 'T3',
    label: 'T3 · 10 Set 1939 — Tarde (Eixo de Leśmierz)',
    lightingPreset: 'afternoon_1939_09_10',
    cartela: 'Acessos de Leśmierz — 10 de setembro — tarde',
  }),
});

export const HORIZON_SECTORS_360 = Object.freeze([
  Object.freeze({ id: 'N', azimuthDeg: 0, label: 'Norte · Estrada de aproximação e coluna logística (HS-A3)', layer: 'L2' }),
  Object.freeze({ id: 'NE', azimuthDeg: 45, label: 'Nordeste · Frente lateral da companhia (HS-A2)', layer: 'L2/L3' }),
  Object.freeze({ id: 'E', azimuthDeg: 90, label: 'Este · Campos agrícolas e silhueta urbana de estudo (Łęczyca)', layer: 'L3' }),
  Object.freeze({ id: 'SE', azimuthDeg: 135, label: 'Sudeste · Corredor de acesso para Área B', layer: 'L2' }),
  Object.freeze({ id: 'S', azimuthDeg: 180, label: 'Sul · Pomar e saída da quinta', layer: 'L1/L2' }),
  Object.freeze({ id: 'SW', azimuthDeg: 225, label: 'Sudoeste · Volume de estudo provisório (Tum / Colegiada)', layer: 'L3' }),
  Object.freeze({ id: 'W', azimuthDeg: 270, label: 'Oeste · Valas de drenagem e apoio lateral polaco (HS-A1)', layer: 'L2' }),
  Object.freeze({ id: 'NW', azimuthDeg: 315, label: 'Noroeste · Campos baixos e linha de árvores do Bzura', layer: 'L2/L3' }),
]);

// H5 / HZ-02: L1<->L2 promotion/demotion with 15% hysteresis around 250m
export const LOD_PROMOTE_TO_L1_M = 230.0;
export const LOD_DEMOTE_TO_L2_M = 268.0;

export class M02HorizonDirector {
  constructor() {
    this.reset();
  }

  reset() {
    this.temporalState = 'T0';

    // HS-A1: Polish lateral support group (L2 <-> L1 promotable, 6 persistent soldiers)
    this.hsA1 = {
      id: 'HS-A1',
      state: 'PREPARE', // PREPARE -> ADVANCE -> OCCUPY_COVER -> CONSOLIDATED
      actors: [
        { id: 'hs_a1_01', name: 'kpr. Zieliński (HS-A1)', x: -165, z: -140, goalZ: -35, health: 100, mag: 5, reserve: 40, alive: true, representation: 'L2_impostor' },
        { id: 'hs_a1_02', name: 'strz. Dąbrowski (HS-A1)', x: -172, z: -148, goalZ: -42, health: 100, mag: 5, reserve: 40, alive: true, representation: 'L2_impostor' },
        { id: 'hs_a1_03', name: 'strz. Sikora (HS-A1)', x: -158, z: -154, goalZ: -48, health: 100, mag: 5, reserve: 40, alive: true, representation: 'L2_impostor' },
        { id: 'hs_a1_04', name: 'strz. Wójcik (HS-A1)', x: -168, z: -162, goalZ: -55, health: 92, mag: 4, reserve: 35, alive: true, representation: 'L2_impostor' },
        { id: 'hs_a1_05', name: 'strz. Krawczyk (HS-A1)', x: -176, z: -168, goalZ: -62, health: 100, mag: 5, reserve: 40, alive: true, representation: 'L2_impostor' },
        { id: 'hs_a1_06', name: 'strz. Mazur (HS-A1)', x: -162, z: -175, goalZ: -68, health: 85, mag: 3, reserve: 30, alive: true, representation: 'L2_impostor' },
      ],
    };

    // HS-A2: Lateral company front (L2/L3 finite barrage & smoke events, never loops!)
    this.hsA2 = {
      id: 'HS-A2',
      state: 'OFFENSIVE_FIRE', // OFFENSIVE_FIRE -> POSITION_TAKEN -> SETTLED_SMOKE
      events: [
        { id: 'ev_hsa2_01', x: 340, y: 2, z: -210, flashAt: 2.5, flashed: false, soundArrivalAt: null, soundPlayed: false, smokeActive: false },
        { id: 'ev_hsa2_02', x: 420, y: 3, z: -140, flashAt: 9.0, flashed: false, soundArrivalAt: null, soundPlayed: false, smokeActive: false },
        { id: 'ev_hsa2_03', x: 380, y: 2, z: -65, flashAt: 18.0, flashed: false, soundArrivalAt: null, soundPlayed: false, smokeActive: false },
        { id: 'ev_hsa2_04', x: 460, y: 4, z: 30, flashAt: 28.0, flashed: false, soundArrivalAt: null, soundPlayed: false, smokeActive: false },
        { id: 'ev_hsa2_05', x: 310, y: 2, z: 95, flashAt: 40.0, flashed: false, soundArrivalAt: null, soundPlayed: false, smokeActive: false },
      ],
    };

    // HS-A3: Rear logistics column on northern road (passes once, never loops)
    this.hsA3 = {
      id: 'HS-A3',
      state: 'WAIT_ROAD', // WAIT_ROAD -> PASSING_ONCE -> EXITED_SECTOR
      x: -180,
      z: -245,
      targetX: 190,
      speed: 5.2,
      vehicles: [
        { id: 'hs_a3_01', offset: 0, x: -180, z: -245, visible: false },
        { id: 'hs_a3_02', offset: -14, x: -194, z: -245, visible: false },
        { id: 'hs_a3_03', offset: -28, x: -208, z: -245, visible: false },
      ],
    };

    // HS-B1 (H4): Distant urban combat in Łęczyca (LOCALIZED_FIRE -> REDUCED_INTENSITY -> POLISH_OCCUPATION)
    this.hsB1 = {
      id: 'HS-B1',
      state: 'LOCALIZED_FIRE',
      sector: 'S',
      flashesTriggered: 0,
      maxFlashes: 3,
    };

    // HS-C1 (H4): Right-flank group at 70-110 m in Leśmierz (ADVANCE -> UNDER_PRESSURE -> RETREAT_TO_CORRIDOR, linked to LG01..LG12)
    this.hsC1 = {
      id: 'HS-C1',
      state: 'ADVANCE',
      linkedRosterIds: ['LG01', 'LG02', 'LG03', 'LG04', 'LG05', 'LG06', 'LG07', 'LG08', 'LG09', 'LG10', 'LG11', 'LG12'],
    };

    // HS-C2 (H4): Fixed-position artillery event in Area C (WARNING -> IMPACTED -> RESIDUAL_DUST_DAMAGE, 1 unique ID, never repeats on restore)
    this.hsC2 = {
      id: 'HS-C2',
      impactId: 'art_hsc2_01',
      state: 'READY', // READY -> WARNING -> IMPACTED -> RESIDUAL_DUST_DAMAGE
      x: 4.0,
      y: 0.0,
      z: 18.0,
      detonatedOnce: false,
    };

    this.acousticLog = [];
  }

  get lightingPreset() {
    return M02_TEMPORAL_STATES[this.temporalState]?.lightingPreset ?? 'afternoon_1939_09_09';
  }

  setTemporalState(stateId, sim = null) {
    if (!M02_TEMPORAL_STATES[stateId]) return null;
    this.temporalState = stateId;
    const def = M02_TEMPORAL_STATES[stateId];
    if (sim) {
      sim.events.push({
        type: 'temporal-state-changed',
        temporalState: stateId,
        lightingPreset: def.lightingPreset,
        cartela: def.cartela,
        clock: sim.clock,
      });
    }
    return def;
  }

  update(sim, dt) {
    const clock = sim.clock;
    const player = sim.player;

    // 1. Update HS-A1 (Polish lateral support group) finite state & L1<->L2 hysteresis promotion
    if (clock >= 3.0 && this.hsA1.state === 'PREPARE') {
      this.hsA1.state = 'ADVANCE';
    }
    let allReached = true;
    for (const actor of this.hsA1.actors) {
      if (!actor.alive) continue;
      if (this.hsA1.state === 'ADVANCE' && actor.z < actor.goalZ) {
        actor.z = Math.min(actor.goalZ, Number((actor.z + 3.4 * dt).toFixed(3)));
        if (actor.z < actor.goalZ) allReached = false;
      }
      // Hysteresis promotion/demotion between L2_impostor and L1_actor without losing state or identity (HZ-02)
      const dist = Math.hypot(actor.x - player.x, actor.z - player.z);
      if (actor.representation === 'L2_impostor' && dist <= LOD_PROMOTE_TO_L1_M) {
        actor.representation = 'L1_actor';
        sim.events.push({ type: 'horizon-actor-promoted', actorId: actor.id, distance: Number(dist.toFixed(2)), clock });
      } else if (actor.representation === 'L1_actor' && dist >= LOD_DEMOTE_TO_L2_M) {
        actor.representation = 'L2_impostor';
        sim.events.push({ type: 'horizon-actor-demoted', actorId: actor.id, distance: Number(dist.toFixed(2)), clock });
      }
    }
    if (this.hsA1.state === 'ADVANCE' && allReached) {
      this.hsA1.state = 'OCCUPY_COVER';
    }
    if (this.hsA1.state === 'OCCUPY_COVER' && (sim.objective.id === 'C04' || sim.objective.id === 'COMPLETE')) {
      this.hsA1.state = 'CONSOLIDATED';
    }

    // 2. Update HS-A2 (Finite distant fire events with physical speed-of-sound delay d / 343 m/s)
    let completedCount = 0;
    for (const ev of this.hsA2.events) {
      if (!ev.flashed && clock >= ev.flashAt) {
        ev.flashed = true;
        ev.smokeActive = true;
        const dist = Math.hypot(ev.x - player.x, ev.y - player.y, ev.z - player.z);
        const delaySec = dist / SOUND_SPEED_MPS;
        ev.soundArrivalAt = Number((clock + delaySec).toFixed(3));
        sim.events.push({
          type: 'horizon-flash',
          eventId: ev.id,
          position: { x: ev.x, y: ev.y, z: ev.z },
          distanceM: Number(dist.toFixed(1)),
          acousticDelaySec: Number(delaySec.toFixed(3)),
          soundArrivalAt: ev.soundArrivalAt,
          clock: Number(clock.toFixed(3)),
        });
      }
      if (ev.flashed && !ev.soundPlayed && ev.soundArrivalAt !== null && clock >= ev.soundArrivalAt) {
        ev.soundPlayed = true;
        const record = {
          eventId: ev.id,
          flashAt: ev.flashAt,
          soundArrivalAt: ev.soundArrivalAt,
          measuredDelaySec: Number((ev.soundArrivalAt - ev.flashAt).toFixed(3)),
        };
        this.acousticLog.push(record);
        sim.events.push({
          type: 'horizon-acoustic-boom',
          ...record,
          clock: Number(clock.toFixed(3)),
        });
      }
      if (ev.soundPlayed) completedCount++;
    }
    if (completedCount >= 3 && this.hsA2.state === 'OFFENSIVE_FIRE') {
      this.hsA2.state = 'POSITION_TAKEN';
    }
    if (completedCount === this.hsA2.events.length) {
      this.hsA2.state = 'SETTLED_SMOKE';
    }

    // 3. Update HS-A3 (Rear logistics column passes once along northern road Z=-245)
    if (this.hsA3.state === 'WAIT_ROAD' && clock >= 5.0) {
      this.hsA3.state = 'PASSING_ONCE';
    }
    if (this.hsA3.state === 'PASSING_ONCE') {
      this.hsA3.x = Number((this.hsA3.x + this.hsA3.speed * dt).toFixed(3));
      if (this.hsA3.x >= this.hsA3.targetX) {
        this.hsA3.x = this.hsA3.targetX;
        this.hsA3.state = 'EXITED_SECTOR';
      }
    }
    for (const v of this.hsA3.vehicles ?? []) {
      v.x = Number((this.hsA3.x + v.offset).toFixed(2));
      v.visible = this.hsA3.state === 'PASSING_ONCE';
    }

    // 4. Update HS-B1 (Distant urban combat in Area B: LOCALIZED_FIRE -> REDUCED_INTENSITY -> POLISH_OCCUPATION)
    if (sim.activeCellId === 'B' || sim.areaB?.reorganizedC07) {
      if (sim.areaB?.reorganizedC07) {
        this.hsB1.state = 'POLISH_OCCUPATION';
      } else if (sim.flags?.['m02.corridor_held']) {
        this.hsB1.state = 'REDUCED_INTENSITY';
      } else {
        this.hsB1.state = 'LOCALIZED_FIRE';
      }
    }

    // 5. Update HS-C1 (Right-flank group LG01..LG12 in Area C: ADVANCE -> UNDER_PRESSURE -> RETREAT_TO_CORRIDOR)
    if (sim.activeCellId === 'C' && sim.areaC) {
      if (sim.areaC.c11Started) {
        this.hsC1.state = 'RETREAT_TO_CORRIDOR';
      } else if (sim.areaC.c10Started) {
        this.hsC1.state = 'UNDER_PRESSURE';
      } else {
        this.hsC1.state = 'ADVANCE';
      }
    }

    // 6. Update HS-C2 (Fixed-position artillery event in Area C: WARNING -> IMPACTED -> RESIDUAL_DUST_DAMAGE)
    if (sim.activeCellId === 'C' && sim.areaC) {
      if (sim.areaC.artilleryDetonated) {
        this.hsC2.detonatedOnce = true;
        this.hsC2.state = sim.areaC.c11Started ? 'RESIDUAL_DUST_DAMAGE' : 'IMPACTED';
      } else if (sim.areaC.c10Started) {
        this.hsC2.state = 'WARNING';
      }
    }
  }

  snapshot() {
    return {
      temporalState: this.temporalState,
      hsA1: structuredClone(this.hsA1),
      hsA2: structuredClone(this.hsA2),
      hsA3: structuredClone(this.hsA3),
      hsB1: structuredClone(this.hsB1),
      hsC1: structuredClone(this.hsC1),
      hsC2: structuredClone(this.hsC2),
      acousticLog: structuredClone(this.acousticLog),
    };
  }

  restore(snap) {
    if (!snap) return;
    this.temporalState = snap.temporalState ?? 'T0';
    if (snap.hsA1) this.hsA1 = structuredClone(snap.hsA1);
    if (snap.hsA2) this.hsA2 = structuredClone(snap.hsA2);
    if (snap.hsA3) this.hsA3 = structuredClone(snap.hsA3);
    if (snap.hsB1) this.hsB1 = structuredClone(snap.hsB1);
    if (snap.hsC1) this.hsC1 = structuredClone(snap.hsC1);
    if (snap.hsC2) this.hsC2 = structuredClone(snap.hsC2);
    if (snap.acousticLog) this.acousticLog = structuredClone(snap.acousticLog);
  }
}
