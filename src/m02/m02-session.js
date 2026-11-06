import { M02_SAVE_STORAGE_KEY } from '../game/m02-save-store.js';

// Merge M02 único (2026-11-06): UM só gestor de save. Esta sessão (menu/pausa/epílogo da linha Codex) já não grava o seu próprio
// envelope `{version:1,id,snapshot}` em `cod-guerra:checkpoint:m02:v1`: usa a loja v2 da simulação (`sim.saveStore`,
// src/game/m02-save-store.js; slots exatos, staging/previous, compare-and-swap). Os saves v1 que a versão Codex gravou ficam
// intactos (nunca lidos como v2, escritos nem apagados; ver detectForeignSaves() e src/game/m02-legacy-save-inspection.js).
// A chave exportada é a da loja v2, para quem a importava continuar a apontar para o save real.
export const M02_SAVE_KEY = M02_SAVE_STORAGE_KEY;

// Browser lifecycle owns pause/UI. No wall-clock state is introduced into the deterministic mission or its snapshots.
export class M02Session {
  constructor(sim, renderer) {
    this.sim = sim;
    this.renderer = renderer;
    this.state = 'menu';
    this.lastCheckpoint = null;
    this.message = '';
    this.epilogueIndex = 0;
  }
  get playing() {
    return this.state === 'playing';
  }
  get saveAvailable() {
    try {
      return Boolean(this.sim.saveStore?.latestCheckpointId());
    } catch {
      return false;
    }
  }
  start() {
    const options = { ...this.sim.audiovisual.accessibility };
    this.sim.checkpoints.clear();
    this.sim.reset('C01');
    this.sim.setAccessibilityOptions(options);
    const initial = this.sim.checkpoints.get('cp_m02_a_preparacao');
    if (initial) initial.audiovisual = this.sim.audiovisual.snapshot();
    this.lastCheckpoint = null;
    this.state = 'playing';
    this.renderer.presentation.unlockAudio();
    this.save();
  }
  pause() {
    if (this.playing) {
      this.state = 'paused';
      this.renderer.presentation.audio.suspend();
    }
  }
  resume() {
    if (this.state === 'paused') {
      this.state = 'playing';
      this.renderer.presentation.unlockAudio();
    }
  }
  /** Persiste o checkpoint mais recente do índice em memória pela loja v2 (validada; nunca a chave v1). */
  save() {
    let latest = null;
    for (const [id, snapshot] of this.sim.checkpoints)
      if (snapshot.clock <= this.sim.clock && (!latest || snapshot.clock >= latest.snapshot.clock)) latest = { id, snapshot };
    if (!latest || !this.sim.saveStore) return;
    const result = this.sim.saveStore.commitCheckpoint(latest.id, latest.snapshot);
    this.lastCheckpoint = latest.snapshot;
    this.message = result?.ok === false ? `Não foi possível guardar neste navegador: ${result.reason}` : 'Checkpoint guardado';
  }
  /** Continua do último checkpoint persistido na loja v2 (com a mesma ordem de recurso que o F9 da bancada). */
  continue() {
    if (!this.saveAvailable) {
      this.message = 'Não há checkpoint guardado.';
      return false;
    }
    try {
      const loaded = this.sim.quickLoadCheckpoint();
      if (loaded.source === 'start') throw Error('O checkpoint guardado não é válido.');
      this.lastCheckpoint = this.sim.checkpoints.get(loaded.checkpointId) ?? null;
      this.state = 'playing';
      this.renderer.presentation.unlockAudio();
      this.message = '';
      return true;
    } catch (error) {
      this.message = error.message;
      return false;
    }
  }
  restart() {
    let best = null;
    for (const [id, snapshot] of this.sim.checkpoints)
      if (snapshot.clock <= this.sim.clock && (!best || snapshot.clock >= best.snapshot.clock)) best = { id, snapshot };
    if (!best) return this.start();
    this.sim.restoreSnapshot(best.snapshot);
    this.state = 'playing';
    this.renderer.presentation.unlockAudio();
  }
  nextEpilogue() {
    this.epilogueIndex++;
    if (this.epilogueIndex >= 3) this.state = 'debrief';
  }
  afterFrame() {
    if (!this.playing) return;
    if (this.sim.player.health <= 0) {
      this.state = 'dead';
      this.renderer.presentation.audio.suspend();
      return;
    }
    if (this.sim.areaC?.c12Completed) {
      this.state = 'epilogue';
      this.epilogueIndex = 0;
      this.sim.saveCheckpoint('cp_m02_completed');
      return;
    }
    // Os checkpoints da simulação já são persistidos pela loja v2 quando são gravados (saveCheckpoint); nada a duplicar aqui.
    for (const snapshot of this.sim.checkpoints.values())
      if (snapshot !== this.lastCheckpoint && snapshot.clock <= this.sim.clock && (!this.lastCheckpoint || snapshot.clock >= this.lastCheckpoint.clock)) {
        this.lastCheckpoint = snapshot;
        break;
      }
  }
}
