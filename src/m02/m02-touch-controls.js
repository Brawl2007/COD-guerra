// Controlos por toque da bancada M02 (iPhone/Safari e telemóveis em geral).
// Só produz o MESMO objeto de controlos que o teclado/rato (forward, side, sprint, aim, lookX, lookY) e pedidos de ações
// pontuais (disparar, recarregar, agachar, granada, interagir, ordens, F5/F9). Não decide nada: a simulação continua a ser
// a única fonte de dano, visibilidade, eventos e estado da missão (ver m02-01-main.js).

export const STICK_RADIUS_PX = 58;
export const STICK_DEADZONE = 0.14;
export const STICK_SPRINT_ON = 0.92; // «empurrar até ao fim» = correr
export const STICK_SPRINT_OFF = 0.78; // histerese: só deixa de correr abaixo disto
export const LOOK_YAW_PER_PX = 0.0046; // rad por píxel arrastado (o rato usa 0.0024 por unidade de movimento)
export const LOOK_PITCH_PER_PX = 0.0038;

/** Modo toque: `?touch=1|0` força; senão `pointer: coarse`, ou ecrã tátil sem rato/ponteiro fino com hover. */
export function detectTouchMode(win = globalThis.window) {
  if (!win) return false;
  try {
    const forced = new URLSearchParams(win.location?.search ?? '').get('touch');
    if (forced === '1') return true;
    if (forced === '0') return false;
  } catch {
    /* sem location: ignora */
  }
  const mq = (q) => Boolean(win.matchMedia?.(q)?.matches);
  if (mq('(pointer: coarse)')) return true;
  const points = win.navigator?.maxTouchPoints ?? 0;
  return points > 0 && !mq('(hover: hover) and (pointer: fine)');
}

/**
 * Converte o deslocamento do dedo (px, relativo à origem do joystick) em {forward, side, sprint}.
 * `wasSprinting` dá a histerese do correr. Função pura (testada em Node).
 */
export function joystickVector(dx, dy, wasSprinting = false, radius = STICK_RADIUS_PX) {
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6 || radius <= 0) return { forward: 0, side: 0, sprint: false, magnitude: 0 };
  const raw = Math.min(1, dist / radius);
  const magnitude = raw < STICK_DEADZONE ? 0 : Math.min(1, (raw - STICK_DEADZONE) / (1 - STICK_DEADZONE));
  const forward = magnitude === 0 ? 0 : (-dy / dist) * magnitude;
  const side = magnitude === 0 ? 0 : (dx / dist) * magnitude;
  const threshold = wasSprinting ? STICK_SPRINT_OFF : STICK_SPRINT_ON;
  const sprint = raw >= threshold && forward > 0.1;
  return { forward, side, sprint, magnitude };
}

const BUTTONS = [
  { id: 'fire', label: 'Disparar', cls: 't-fire', action: 'fire' },
  { id: 'aim', label: 'Mirar', cls: 't-aim', toggle: true },
  { id: 'reload', label: 'Recarregar', cls: 't-reload', action: 'reload' },
  { id: 'grenade', label: 'Granada', cls: 't-grenade', action: 'grenade' },
  { id: 'crouch', label: 'Agachar', cls: 't-crouch', action: 'crouch' },
  { id: 'interact', label: '[E] Interagir', cls: 't-interact', action: 'interact', hidden: true },
  // Contextuais trazidos da linha Codex (m02-touch.js): só aparecem quando a ação existe (C04 água; C11 retirada antecipada).
  { id: 'water', label: 'Água', cls: 't-water', action: 'giveWater', hidden: true },
  { id: 'withdraw', label: 'Recuar', cls: 't-withdraw', action: 'giveWater', hidden: true },
  { id: 'save', label: 'Gravar', cls: 't-save', action: 'save' },
  { id: 'load', label: 'Carregar', cls: 't-load', action: 'load' },
  { id: 'cover', label: 'Cobrir', cls: 't-cover', action: 'orderCover' },
  { id: 'advance', label: 'Avançar', cls: 't-advance', action: 'orderAdvance' },
];

export class M02TouchControls {
  /**
   * @param {object} opts
   * @param {Document} opts.document
   * @param {Window} opts.window
   * @param {Record<string, () => void>} opts.actions fire, reload, crouch, grenade, interact, orderCover, orderAdvance, save, load
   * @param {() => void} [opts.onGesture] chamado em cada toque (desbloqueia o WebAudio no iOS)
   */
  constructor({ document: doc, window: win, actions, onGesture }) {
    this.doc = doc;
    this.win = win;
    this.actions = actions;
    this.onGesture = onGesture ?? (() => {});
    this.stick = { id: null, ox: 0, oy: 0, dx: 0, dy: 0, sprint: false };
    this.look = { id: null, lx: 0, ly: 0, accX: 0, accY: 0 };
    this.aim = false;
    this.menuOpen = false;
    this.buttons = new Map();
    this.buttonPointers = new Map(); // pointerId -> button id
    this.toastTimer = null;
    this.mount();
  }

  mount() {
    const doc = this.doc;
    const body = doc.body;
    body.classList.add('touch');
    const mk = (tag, cls, id) => {
      const el = doc.createElement(tag);
      if (cls) el.className = cls;
      if (id) el.id = id;
      return el;
    };

    // zonas de captura: esquerda = joystick flutuante; direita = olhar
    this.zoneLeft = mk('div', 't-zone t-zone-left', 't-zone-left');
    this.zoneRight = mk('div', 't-zone t-zone-right', 't-zone-right');
    this.stickBase = mk('div', 't-stick t-stick-idle', 't-stick');
    this.stickKnob = mk('div', 't-knob');
    this.stickBase.appendChild(this.stickKnob);
    body.append(this.zoneLeft, this.zoneRight, this.stickBase);

    // estado compacto (vida, munição, granadas, objetivo curto)
    this.status = mk('div', 't-status', 't-status');
    this.elHealth = mk('span', 't-chip t-health', 't-health');
    this.elAmmo = mk('span', 't-chip t-ammo', 't-ammo');
    this.elGrenades = mk('span', 't-chip t-gren', 't-grenades');
    const row = mk('div', 't-status-row');
    row.append(this.elHealth, this.elAmmo, this.elGrenades);
    this.elObjective = mk('div', 't-objective', 't-objective');
    this.status.append(row, this.elObjective);
    body.appendChild(this.status);

    for (const def of BUTTONS) {
      const b = mk('button', `t-btn ${def.cls}`, `t-btn-${def.id}`);
      b.type = 'button';
      b.textContent = def.label;
      b.dataset.touchAction = def.id;
      if (def.hidden) b.hidden = true;
      if (def.toggle) b.setAttribute('aria-pressed', 'false');
      this.buttons.set(def.id, b);
      body.appendChild(b);
      this.#bindButton(b, def);
    }

    this.menuBtn = mk('button', 't-btn t-menu', 't-menu');
    this.menuBtn.type = 'button';
    this.menuBtn.textContent = '☰ Bancada';
    this.menuBtn.setAttribute('aria-expanded', 'false');
    this.menuBtn.addEventListener('click', () => this.setMenuOpen(!this.menuOpen));
    body.appendChild(this.menuBtn);

    this.toastEl = mk('div', 't-toast', 't-toast');
    this.toastEl.hidden = true;
    this.rotateEl = mk('div', 't-rotate', 't-rotate');
    this.rotateEl.textContent = 'Roda o telemóvel para paisagem';
    body.append(this.toastEl, this.rotateEl);

    this.#bindStick();
    this.#bindLook();
    this.#bindGlobal();
  }

  #bindStick() {
    const z = this.zoneLeft;
    z.addEventListener('pointerdown', (e) => {
      if (this.stick.id !== null) return;
      e.preventDefault();
      this.onGesture();
      try {
        z.setPointerCapture(e.pointerId);
      } catch {
        /* ponteiro sintético sem captura */
      }
      const w = this.win.innerWidth;
      const h = this.win.innerHeight;
      const m = STICK_RADIUS_PX + 8;
      this.stick = {
        id: e.pointerId,
        ox: Math.min(Math.max(e.clientX, m), Math.max(m, w - m)),
        oy: Math.min(Math.max(e.clientY, m), Math.max(m, h - m)),
        dx: 0,
        dy: 0,
        sprint: false,
      };
      this.stick.dx = e.clientX - this.stick.ox;
      this.stick.dy = e.clientY - this.stick.oy;
      this.#renderStick();
    });
    z.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stick.id) return;
      e.preventDefault();
      this.stick.dx = e.clientX - this.stick.ox;
      this.stick.dy = e.clientY - this.stick.oy;
      this.#renderStick();
    });
    const end = (e) => {
      if (e.pointerId !== this.stick.id) return;
      this.#releaseStick();
    };
    z.addEventListener('pointerup', (e) => {
      this.onGesture();
      end(e);
    });
    z.addEventListener('pointercancel', end);
    z.addEventListener('lostpointercapture', end);
  }

  #releaseStick() {
    this.stick = { id: null, ox: 0, oy: 0, dx: 0, dy: 0, sprint: false };
    this.stickBase.classList.add('t-stick-idle');
    this.stickBase.style.left = '';
    this.stickBase.style.top = '';
    this.stickKnob.style.transform = '';
  }

  #renderStick() {
    const s = this.stick;
    this.stickBase.classList.remove('t-stick-idle');
    this.stickBase.style.left = `${s.ox}px`;
    this.stickBase.style.top = `${s.oy}px`;
    const dist = Math.hypot(s.dx, s.dy);
    const k = dist > STICK_RADIUS_PX ? STICK_RADIUS_PX / dist : 1;
    this.stickKnob.style.transform = `translate(${s.dx * k}px, ${s.dy * k}px)`;
  }

  #bindLook() {
    const z = this.zoneRight;
    z.addEventListener('pointerdown', (e) => {
      if (this.look.id !== null) return;
      e.preventDefault();
      this.onGesture();
      try {
        z.setPointerCapture(e.pointerId);
      } catch {
        /* ponteiro sintético sem captura */
      }
      this.look.id = e.pointerId;
      this.look.lx = e.clientX;
      this.look.ly = e.clientY;
    });
    z.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.look.id) return;
      e.preventDefault();
      this.look.accX += e.clientX - this.look.lx;
      this.look.accY += e.clientY - this.look.ly;
      this.look.lx = e.clientX;
      this.look.ly = e.clientY;
    });
    const end = (e) => {
      if (e.pointerId === this.look.id) this.look.id = null;
    };
    z.addEventListener('pointerup', (e) => {
      this.onGesture();
      end(e);
    });
    z.addEventListener('pointercancel', end);
    z.addEventListener('lostpointercapture', end);
  }

  #bindButton(el, def) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.onGesture();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ponteiro sintético sem captura */
      }
      this.buttonPointers.set(e.pointerId, def.id);
      el.classList.add('is-down');
      if (def.toggle) {
        this.aim = !this.aim;
        el.setAttribute('aria-pressed', String(this.aim));
        el.classList.toggle('is-on', this.aim);
        return;
      }
      this.actions[def.action]?.();
    });
    const up = (e) => {
      if (!this.buttonPointers.delete(e.pointerId)) return;
      if (![...this.buttonPointers.values()].includes(def.id)) el.classList.remove('is-down');
    };
    el.addEventListener('pointerup', (e) => {
      this.onGesture();
      up(e);
    });
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  #bindGlobal() {
    const doc = this.doc;
    const win = this.win;
    // iOS Safari ignora user-scalable=no: bloqueia o gesto de pinça e o scroll fora do painel «Bancada».
    for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
      doc.addEventListener(type, (e) => e.preventDefault(), { passive: false });
    }
    doc.addEventListener(
      'touchmove',
      (e) => {
        if (!this.menuOpen) e.preventDefault();
      },
      { passive: false },
    );
    doc.addEventListener('contextmenu', (e) => e.preventDefault());
    // primeiro toque desbloqueia o WebAudio (o iOS exige gesto: pointerup/touchend/click)
    for (const type of ['touchend', 'click']) win.addEventListener(type, () => this.onGesture(), { passive: true });
    const relayout = () => {
      win.dispatchEvent(new win.Event('resize'));
    };
    win.addEventListener('orientationchange', () => win.setTimeout(relayout, 250));
    const releaseAll = () => {
      this.#releaseStick();
      this.look.id = null;
      this.buttonPointers.clear();
      for (const [id, b] of this.buttons) if (id !== 'aim') b.classList.remove('is-down');
    };
    win.addEventListener('blur', releaseAll);
    doc.addEventListener('visibilitychange', () => {
      if (doc.hidden) releaseAll();
    });
    this.releaseAll = releaseAll;
  }

  setMenuOpen(open) {
    this.menuOpen = Boolean(open);
    this.doc.body.classList.toggle('menu-open', this.menuOpen);
    this.menuBtn.setAttribute('aria-expanded', String(this.menuOpen));
    this.menuBtn.textContent = this.menuOpen ? '✕ Fechar' : '☰ Bancada';
    if (this.menuOpen) this.releaseAll?.();
  }

  /** Estado dos controlos para este fotograma. Consome o arrasto de olhar acumulado. */
  poll() {
    const s = this.stick;
    const v = s.id === null ? { forward: 0, side: 0, sprint: false } : joystickVector(s.dx, s.dy, s.sprint);
    s.sprint = v.sprint;
    const lookX = this.look.accX * LOOK_YAW_PER_PX;
    const lookY = this.look.accY * LOOK_PITCH_PER_PX;
    this.look.accX = 0;
    this.look.accY = 0;
    return { forward: v.forward, side: v.side, sprint: v.sprint, aim: this.aim, lookX, lookY };
  }

  /** Só apresentação: valores lidos da simulação. */
  setStatus({ health, mag, reserve, grenades, objective, crouched }) {
    const set = (el, text) => {
      if (el.textContent !== text) el.textContent = text;
    };
    set(this.elHealth, `♥ ${health}`);
    set(this.elAmmo, `▮ ${mag} / ${reserve}`);
    set(this.elGrenades, `● ${grenades}`);
    set(this.elObjective, objective);
    this.buttons.get('crouch')?.classList.toggle('is-on', Boolean(crouched));
  }

  setInteractVisible(visible) {
    const b = this.buttons.get('interact');
    if (b && b.hidden === visible) b.hidden = !visible;
  }

  /**
   * Botões contextuais (Codex): «Água» quando o ferido de C04 pode receber água; «Recuar (n)» na casa de socorro em C11, que passa
   * a «Confirmar» depois do primeiro toque (a retirada antecipada exige um segundo toque deliberado; m02-retreat-confirmation.js).
   */
  setContextual({ water = false, withdraw = null } = {}) {
    const w = this.buttons.get('water');
    if (w && w.hidden === Boolean(water)) w.hidden = !water;
    const r = this.buttons.get('withdraw');
    if (!r) return;
    if (r.hidden === Boolean(withdraw)) r.hidden = !withdraw;
    const text = withdraw ? (withdraw.armed ? 'Confirmar' : `Recuar (${withdraw.count})`) : 'Recuar';
    if (r.textContent !== text) r.textContent = text;
  }

  toast(text, ms = 1800) {
    this.toastEl.textContent = text;
    this.toastEl.hidden = false;
    this.win.clearTimeout(this.toastTimer);
    this.toastTimer = this.win.setTimeout(() => {
      this.toastEl.hidden = true;
    }, ms);
  }
}
