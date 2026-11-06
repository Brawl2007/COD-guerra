// M02 O2 SAVE-01 no browser real (PDF p. 51): grava F5 (manual) e um checkpoint automático no localStorage REAL, recarrega a página e
// restaura com F9; compara o estado semântico completo com o que foi gravado. Verifica também que a chave que a versão Codex gravou
// (`cod-guerra:checkpoint:m02:v1`, pré-povoada) fica byte a byte igual e que nenhuma chave nova cai no espaço `cod-guerra:checkpoint:`.
// Teste de estado no navegador (não é playtest, não aceita o ID); a bancada corre com SwiftShader.
import { test, expect } from '@playwright/test';

const KEYS = {
  v2: 'cod-guerra:m02:bench:v2',
  codex: 'cod-guerra:checkpoint:m02:v1',
  m01: 'cod-guerra:checkpoint:m01:legacy',
};
// Um valor do Codex plausível (envelope `{version:1, id, snapshot}` com `rngState` e unicode para apanhar re-codificações).
const CODEX_RAW = JSON.stringify({
  version: 1,
  id: 'cp_m02_manual',
  snapshot: { schema: 'm02-01-bench-snapshot-v1', seed: 19390909, rngState: 123456789, note: 'Aldeia ficcional — ação, coração, é', nested: { a: [1, 2, 3] } },
});
const M01_RAW = '{"id":"cp_m01_x","note":"M01 intacta"}';

const FENCE = 'cov_south_fence_west';

test.describe('M02 SAVE-01 no browser (localStorage real)', () => {
  test('F5 e checkpoint automático gravam no localStorage, a página recarrega e o F9 restaura com igualdade de estado; a chave do Codex fica intacta', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    // pré-povoar (só se ausente: o reload não regrava; as chaves estranhas existem desde o primeiro carregamento)
    await page.addInitScript(
      ([codexKey, codexRaw, m01Key, m01Raw]) => {
        if (window.localStorage.getItem(codexKey) === null) window.localStorage.setItem(codexKey, codexRaw);
        if (window.localStorage.getItem(m01Key) === null) window.localStorage.setItem(m01Key, m01Raw);
      },
      [KEYS.codex, CODEX_RAW, KEYS.m01, M01_RAW],
    );
    await page.goto('/COD-guerra/m02-01.html?quality=low', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.m02Bench && window.m02Bench.getTelemetrySummary().sampleCount >= 5));
    expect(await page.evaluate((k) => window.localStorage.getItem(k), KEYS.codex)).toBe(CODEX_RAW);

    // 1. Alterações reais do mundo (ações da simulação): cerca derrubada, porta destruída e outra aberta, um hostil abatido por explosão
    const altered = await page.evaluate(
      ({ fence }) => {
        const sim = window.m02Bench.sim;
        const victim = sim.enemies.find((e) => e.id === 'DE-A10');
        window.m02Bench.detonateGrenadeAt(victim.x, 0.5, victim.z, 6.5);
        window.m02Bench.detonateGrenadeAt(-10, 0.5, 19.9, 6.5);
        sim.world.setDoorState('door_b02_south_door', 'open');
        return { victimAlive: victim.alive, fence: sim.world.getFenceState(fence), doorB03: sim.world.getDoorState('door_b03_south') };
      },
      { fence: FENCE },
    );
    expect(altered).toEqual({ victimAlive: false, fence: 'breached', doorB03: 'destroyed' });

    // 2. Checkpoint automático pelo caminho normal: a guarnição de EA1 cai → cp_m02_b_acesso (objetivo C04), gravado na loja
    await page.evaluate(() => {
      const sim = window.m02Bench.sim;
      for (const e of sim.enemies) if (!e.c04Candidate) Object.assign(e, { alive: false, health: 0, state: 'DEAD' });
    });
    await page.waitForFunction(() => window.m02Bench.sim.checkpointsReached.includes('cp_m02_b_acesso'), null, { timeout: 30000 });
    const autoStatus = await page.evaluate(() => window.m02Bench.getSaveStatus());
    expect(autoStatus.blocked ?? false).toBe(false);

    // 3. F5 (manual) pela tecla real, com o jogador parado
    await page.keyboard.press('F5');
    await page.waitForFunction(() => window.m02Bench.sim.checkpoints.has('cp_m02_manual'));
    const afterF5 = await page.evaluate(() => ({
      raw: window.localStorage.getItem('cod-guerra:m02:bench:v2'),
      keys: Object.keys(window.localStorage).sort(),
    }));
    expect(afterF5.raw).toBeTruthy();
    const record = JSON.parse(afterF5.raw);
    expect(Object.keys(record.checkpoints).sort()).toEqual(['cp_m02_b_acesso', 'cp_m02_manual']);
    expect(record.latestCheckpointId).toBe('cp_m02_manual');
    const manual = record.checkpoints.cp_m02_manual;
    expect(manual.fences[FENCE]).toBe('breached');
    expect(manual.doors.door_b03_south).toBe('destroyed');
    expect(manual.enemies.find((e) => e.id === 'DE-A10').alive).toBe(false);
    // nenhuma chave nova no espaço `cod-guerra:checkpoint:` (só as duas pré-povoadas)
    expect(afterF5.keys.filter((k) => k.startsWith('cod-guerra:checkpoint:')).sort()).toEqual([KEYS.m01, KEYS.codex].sort());

    // 4. Recarregar a página: a simulação é nova (início), a loja persiste
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.m02Bench && window.m02Bench.getTelemetrySummary().sampleCount >= 5));
    const fresh = await page.evaluate(() => {
      const sim = window.m02Bench.sim;
      return { cps: [...sim.checkpoints.keys()], fence: sim.world.getFenceState('cov_south_fence_west'), victim: sim.enemies.find((e) => e.id === 'DE-A10').alive };
    });
    expect(fresh.cps).toEqual(['cp_m02_a_preparacao']); // só o início em memória
    expect(fresh.fence).toBe('intact');
    expect(fresh.victim).toBe(true);
    expect(await page.evaluate((k) => window.localStorage.getItem(k), KEYS.v2)).toBe(afterF5.raw);

    // 5. F9 pela tecla real: restaura o último gravado (F5) a partir do localStorage
    await page.keyboard.press('F9');
    await page.waitForFunction(() => window.m02Bench.sim.checkpointsReached.includes('cp_m02_b_acesso'));
    const restored = await page.evaluate(
      () => {
        const sim = window.m02Bench.sim;
        return {
          fence: sim.world.getFenceState('cov_south_fence_west'),
          doorB03: sim.world.getDoorState('door_b03_south'),
          doorB02: sim.world.getDoorState('door_b02_south_door'),
          dead: sim.enemies.filter((e) => !e.alive).map((e) => e.id).sort(),
          objective: sim.objective.id,
          scene: sim.script.sceneId,
          reached: [...sim.checkpointsReached],
          cell: sim.activeCellId,
        };
      },
    );
    expect(restored.fence).toBe('breached');
    expect(restored.doorB03).toBe('destroyed');
    expect(restored.doorB02).toBe('open');
    expect(restored.dead).toEqual(manual.enemies.filter((e) => !e.alive).map((e) => e.id).sort());
    expect(restored.dead).toContain('DE-A10');
    expect(restored.objective).toBe(manual.objective.id);
    expect(restored.scene).toBe(manual.script.sceneId);
    expect(restored.reached).toEqual(expect.arrayContaining(manual.checkpointsReached));
    expect(restored.cell).toBe(manual.activeCellId);

    // 6. Igualdade de estado COMPLETA: a mesma chamada que o F9 faz (quickLoadCheckpoint) e, no mesmo passo síncrono, o snapshot v2
    //    comparado com o gravado (sem rAF pelo meio); idem para cada checkpoint da loja.
    const strict = await page.evaluate(() => {
      const bench = window.m02Bench;
      const raw = JSON.parse(window.localStorage.getItem('cod-guerra:m02:bench:v2'));
      const strip = (s) => {
        const c = JSON.parse(JSON.stringify(s));
        delete c.checkpointId;
        return c;
      };
      const out = {};
      const loaded = bench.quickLoadCheckpoint();
      out.quick = { checkpointId: loaded.checkpointId, source: loaded.source, equal: JSON.stringify(strip(bench.sim.snapshot())) === JSON.stringify(strip(raw.checkpoints[loaded.checkpointId])) };
      for (const id of Object.keys(raw.checkpoints)) {
        bench.restoreCheckpoint(id);
        out[id] = JSON.stringify(strip(bench.sim.snapshot())) === JSON.stringify(strip(raw.checkpoints[id]));
      }
      // controlo negativo: um passo de simulação depois de restaurar já NÃO é igual (a comparação não é trivial)
      bench.sim.tick(0.05, {});
      out.afterTick = JSON.stringify(strip(bench.sim.snapshot())) === JSON.stringify(strip(raw.checkpoints.cp_m02_manual));
      return out;
    });
    expect(strict.quick.checkpointId).toBe('cp_m02_manual');
    expect(strict.quick.equal).toBe(true);
    expect(strict.cp_m02_b_acesso).toBe(true);
    expect(strict.cp_m02_manual).toBe(true);
    expect(strict.afterTick).toBe(false);

    // 7. A chave do Codex e a da M01 ficam byte a byte iguais; continua sem chaves novas fora da loja v2
    const final = await page.evaluate(([c, m]) => ({ codex: window.localStorage.getItem(c), m01: window.localStorage.getItem(m), keys: Object.keys(window.localStorage).sort() }), [KEYS.codex, KEYS.m01]);
    expect(final.codex).toBe(CODEX_RAW);
    expect(final.m01).toBe(M01_RAW);
    expect(final.keys.filter((k) => k.startsWith('cod-guerra:checkpoint:')).sort()).toEqual([KEYS.m01, KEYS.codex].sort());
    expect(pageErrors).toEqual([]);
  });
});
