/** Three.js block-gun viewmodel tuner demo (ES module). */

import * as THREE from "three";

const POSE_KEYS = ["hip", "ads", "ads_holo", "ads_acog", "ads_sniper_scope"];
const AXIS_DEFS = [
  { id: "x", label: "Pos X", kind: "pos" },
  { id: "y", label: "Pos Y", kind: "pos" },
  { id: "z", label: "Pos Z", kind: "pos" },
  { id: "rotX", label: "Rot X", kind: "rot" },
  { id: "rotY", label: "Rot Y", kind: "rot" },
  { id: "rotZ", label: "Rot Z", kind: "rot" },
];
const POS_STEPS = { micro: 0.0005, fine: 0.002, med: 0.01, coarse: 0.05 };
const ROT_STEPS = { micro: 0.001, fine: 0.005, med: 0.02, coarse: 0.1 };
const ZERO_DIST_PRESETS = [25, 50, 100, 200, 300];

const OPTIC_LABELS = {
  iron: "Iron",
  holo: "Holo",
  acog: "Acog",
  sniper_scope: "Sniper scope",
};


const FOV_BY_OPTIC = {
  hip: 90,
  iron: 60,
  holo: 60,
  acog: 25,
  sniper_scope: 10,
};

/** Optional fine-tune after FOV-matched ADS look scale (defaults 1 = pure FOV ratio). */
const ADS_LOOK_MUL = {
  iron: 1,
  holo: 1,
  acog: 1,
  sniper_scope: 1,
};

const BALLISTICS = {
  // Demo units ≈ meters. .45 ACP-ish SMG vs 7.62×54R-class rifle.
  example_smg: { speed: 300, gravity: 14, life: 3.2, tracerLen: 0.55 },
  example_rifle: { speed: 800, gravity: 9.8, life: 3.5, tracerLen: 0.75 },
  sniper_boost: { speed: 860, gravity: 9.5, life: 4.0, tracerLen: 0.85 },
};


function emptyPose() {
  return { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0 };
}

const db = {
  example_smg: {
    schema_version: 1,
    weapon: "example_smg",
    hip: { x: 0.1043, y: -0.1688, z: -0.1953, rotX: 0.0165, rotY: 0, rotZ: 0 },
    ads: { x: 0.0084, y: -0.1343, z: -0.1887, rotX: 0, rotY: 0, rotZ: 0 },
    ads_holo: { x: 0.0082, y: -0.1478, z: -0.1335, rotX: 0.0115, rotY: 0, rotZ: 0 },
    ads_acog: { x: 0.0083, y: -0.15, z: -0.0724, rotX: 0.014, rotY: 0, rotZ: -0.003 },
  },
  example_rifle: {
    schema_version: 1,
    weapon: "example_rifle",
    hip: { x: 0.12, y: -0.18, z: -0.22, rotX: 0.02, rotY: 0, rotZ: 0 },
    ads: { x: 0.01, y: -0.14, z: -0.2, rotX: 0, rotY: 0, rotZ: 0 },
    ads_sniper_scope: { x: 0.006, y: -0.155, z: -0.05, rotX: 0.01, rotY: 0, rotZ: 0 },
  },
};

const attachments = {
  example_smg: {
    holo_sight: { x: 0, y: 0.02, z: 0.05, rotX: 0, rotY: 0, rotZ: 0 },
    foregrip: { x: 0, y: -0.01, z: 0.12, rotX: 0, rotY: 0, rotZ: 0 },
  },
  example_rifle: {
    holo_sight: { x: 0, y: 0.025, z: 0.04, rotX: 0, rotY: 0, rotZ: 0 },
    bipod: { x: 0, y: -0.03, z: 0.2, rotX: 0, rotY: 0, rotZ: 0 },
  },
};

const WEAPON_META = {
  example_smg: { label: "Example SMG", blurb: "Compact PDW — hip/ADS/holo/acog poses" },
  example_rifle: { label: "Example Rifle", blurb: "Long rifle — hip/ADS/sniper poses" },
};

const state = {
  mode: "weapon",
  weaponId: "example_smg",
  poseKey: "hip",
  optic: "iron",
  step: "fine",
  attStep: "fine",
  adsPreview: false,
  adsFactor: 0,
  adsTarget: 0,
  selectedAxis: 0,
  attSelectedAxis: 0,
  attachmentId: "holo_sight",
  panelOpen: false,
  gunModalOpen: false,
  settingsOpen: false,
  gunPickId: "example_smg",
  lookPickup: null,
  swayEnabled: true,
  holdBreath: false,
  score: 0,
  breathLeft: 3,
  breathMax: 3,
  crouchToggled: false,
  /** Sim (true) = HoB + ballistic zero. Arcade (false) = reticle-faithful / idealized bore=aim. */
  hobZero: true,
  /** Zero distance in demo meters. */
  zeroDist: 100,
  /** Draw sight vs bore/launch debug rays. */
  showAimRays: false,
  /** 3px hip crosshair visibility (ADS optic HUD unaffected). */
  showHipReticle: true,
};

const LOOK_SENS_BASE = 0.0022;
const ADS_LOOK_MUL_BASE = 1;

function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function resolve(p) {
  return {
    x: p.x, y: p.y, z: p.z,
    rotX: p.rotX ?? 0, rotY: p.rotY ?? 0, rotZ: p.rotZ ?? 0,
  };
}
function adsPose(cfg, profile) {
  const iron = cfg.ads;
  if (profile === "sniper_scope") return cfg.ads_sniper_scope ?? cfg.ads_acog ?? cfg.ads_holo ?? iron;
  if (profile === "acog") return cfg.ads_acog ?? cfg.ads_holo ?? iron;
  if (profile === "holo") return cfg.ads_holo ?? iron;
  return iron;
}
function blendHold(cfg, profile, t) {
  t = clamp(t, 0, 1);
  const hip = resolve(cfg.hip);
  const ads = resolve(adsPose(cfg, profile));
  return {
    x: lerp(hip.x, ads.x, t), y: lerp(hip.y, ads.y, t), z: lerp(hip.z, ads.z, t),
    rotX: lerp(hip.rotX, ads.rotX, t), rotY: lerp(hip.rotY, ads.rotY, t), rotZ: lerp(hip.rotZ, ads.rotZ, t),
  };
}
function ensurePose(cfg, key) {
  if (!cfg[key]) cfg[key] = emptyPose();
  return cfg[key];
}
function currentWeapon() { return db[state.weaponId]; }
function currentViewPose() { return ensurePose(currentWeapon(), state.poseKey); }
function currentAttPose() {
  const map = attachments[state.weaponId] || (attachments[state.weaponId] = {});
  if (!map[state.attachmentId]) map[state.attachmentId] = emptyPose();
  return map[state.attachmentId];
}
function el(id) { return document.getElementById(id); }
function fmt(n) { return (Math.round(n * 1e6) / 1e6).toString(); }

function gameplayActive() {
  return !state.panelOpen && !state.gunModalOpen && !state.settingsOpen;
}
function typingFocus() {
  const t = document.activeElement;
  return t && (t.matches("input, select, textarea") || t.isContentEditable);
}


/* ---- Cheap Web Audio SFX (no external files) ---- */
const sfx = {
  ctx: null,
  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    return this.ctx;
  },
  resume() {
    const c = this.ensure();
    if (c && c.state === "suspended") c.resume().catch(() => {});
    return c;
  },
  noiseBuffer(duration = 0.08) {
    const c = this.ensure();
    if (!c) return null;
    const n = Math.max(1, Math.floor(c.sampleRate * duration));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  },
  play(kind) {
    const c = this.resume();
    if (!c) return;
    const now = c.currentTime;
    const out = c.createGain();
    out.connect(c.destination);

    if (kind === "fire") {
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.35, now + 0.004);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      const noise = c.createBufferSource();
      noise.buffer = this.noiseBuffer(0.06);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1200;
      bp.Q.value = 0.7;
      noise.connect(bp);
      bp.connect(out);
      noise.start(now);
      noise.stop(now + 0.07);
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
      const og = c.createGain();
      og.gain.setValueAtTime(0.0001, now);
      og.gain.exponentialRampToValueAtTime(0.45, now + 0.005);
      og.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      osc.connect(og);
      og.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.11);
      return;
    }

    if (kind === "bullseye") {
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.28, now + 0.005);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      const o1 = c.createOscillator();
      o1.type = "triangle";
      o1.frequency.setValueAtTime(1480, now);
      o1.frequency.exponentialRampToValueAtTime(2200, now + 0.05);
      o1.connect(out);
      o1.start(now);
      o1.stop(now + 0.22);
      const o2 = c.createOscillator();
      o2.type = "sine";
      o2.frequency.value = 2960;
      const g2 = c.createGain();
      g2.gain.setValueAtTime(0.0001, now);
      g2.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      o2.connect(g2);
      g2.connect(c.destination);
      o2.start(now);
      o2.stop(now + 0.18);
      return;
    }

    if (kind === "hit") {
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.32, now + 0.003);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      const noise = c.createBufferSource();
      noise.buffer = this.noiseBuffer(0.05);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 780;
      bp.Q.value = 1.4;
      noise.connect(bp);
      bp.connect(out);
      noise.start(now);
      noise.stop(now + 0.05);
      const osc = c.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
      const og = c.createGain();
      og.gain.setValueAtTime(0.0001, now);
      og.gain.exponentialRampToValueAtTime(0.14, now + 0.004);
      og.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      osc.connect(og);
      og.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.14);
      return;
    }

    if (kind === "miss") {
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.22, now + 0.008);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      const noise = c.createBufferSource();
      noise.buffer = this.noiseBuffer(0.12);
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 280;
      noise.connect(lp);
      lp.connect(out);
      noise.start(now);
      noise.stop(now + 0.12);
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(70, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.15);
      const og = c.createGain();
      og.gain.setValueAtTime(0.0001, now);
      og.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
      og.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
      osc.connect(og);
      og.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  },
};

/* ---- Toast ---- */
function showToast(message, isError = false) {
  const host = el("toastHost");
  const node = document.createElement("div");
  node.className = "toast" + (isError ? " error" : "");
  node.textContent = message;
  host.appendChild(node);
  requestAnimationFrame(() => node.classList.add("show"));
  setTimeout(() => {
    node.classList.remove("show");
    setTimeout(() => node.remove(), 220);
  }, 2000);
}

async function copyText(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(okMsg);
  } catch (err) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (!ok) throw new Error("copy failed");
      showToast(okMsg);
    } catch (e2) {
      showToast("Clipboard copy failed", true);
    }
  }
}

function copyWeaponJson() {
  const cfg = { ...currentWeapon() };
  return copyText(JSON.stringify(cfg, null, 2), "Copied weapon JSON");
}
function copyAttJson() {
  const payload = {
    schema_version: 1,
    weapon: state.weaponId,
    attachment: state.attachmentId,
    offset: currentAttPose(),
  };
  return copyText(JSON.stringify(payload, null, 2), "Copied attachment JSON");
}

/* ---- Panel / gun modal ---- */
function setPanelOpen(open) {
  state.panelOpen = open;
  const panel = el("debuggerPanel");
  panel.classList.toggle("closed", !open);
  panel.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) {
    if (state.settingsOpen) setSettingsOpen(false, { nested: true });
    if (document.pointerLockElement) document.exitPointerLock();
  }
  updateHudHint();
}
function togglePanel() { setPanelOpen(!state.panelOpen); }

function setGunModal(open) {
  state.gunModalOpen = open;
  const modal = el("gunModal");
  modal.hidden = !open;
  if (open) {
    if (state.settingsOpen) setSettingsOpen(false, { nested: true });
    state.gunPickId = state.weaponId;
    renderGunList();
    if (document.pointerLockElement) document.exitPointerLock();
  }
  updateHudHint();
}

function setSettingsOpen(open, { nested = false } = {}) {
  state.settingsOpen = !!open;
  const modal = el("settingsModal");
  if (modal) modal.hidden = !open;
  if (open) {
    if (!nested && state.panelOpen) setPanelOpen(false);
    if (state.gunModalOpen) setGunModal(false);
    if (document.pointerLockElement) document.exitPointerLock();
    syncSettingsUI();
  }
  updateHudHint();
}
function toggleSettings() { setSettingsOpen(!state.settingsOpen); }

function setHipReticle(on, { toast = false } = {}) {
  state.showHipReticle = !!on;
  syncHipReticle();
  const chk = el("chkHipReticle");
  if (chk) chk.checked = state.showHipReticle;
  if (toast) showToast(state.showHipReticle ? "Hip reticle ON" : "Hip reticle OFF");
}

function syncHipReticle() {
  const hipXh = el("hipCrosshair");
  if (!hipXh) return;
  hipXh.classList.toggle("hip-hide", !state.showHipReticle);
}

function setAimRays(on, { toast = true } = {}) {
  state.showAimRays = !!on;
  const raysBtn = el("btnAimRays");
  if (raysBtn) raysBtn.setAttribute("aria-pressed", state.showAimRays ? "true" : "false");
  const chk = el("chkAimRays");
  if (chk) chk.checked = state.showAimRays;
  if (toast) showToast(state.showAimRays ? "Aim/bore rays ON" : "Aim/bore rays OFF");
  updateAimBoreRays();
}

function setZeroDist(m, { toast = false } = {}) {
  state.zeroDist = parseFloat(m) || 100;
  const sel = el("zeroDistSelect");
  if (sel) sel.value = String(state.zeroDist);
  const ssel = el("settingsZeroDist");
  if (ssel) ssel.value = String(state.zeroDist);
  updateHobReadout();
  updateAimBoreRays();
  if (toast) showToast(`Zero ${state.zeroDist} m`);
}

function syncSettingsUI() {
  const btnSim = el("btnSettingsSim");
  const btnArcade = el("btnSettingsArcade");
  if (btnSim) btnSim.setAttribute("aria-pressed", state.hobZero ? "true" : "false");
  if (btnArcade) btnArcade.setAttribute("aria-pressed", state.hobZero ? "false" : "true");
  const hint = el("settingsArcadeZeroHint");
  if (hint) hint.hidden = !!state.hobZero;

  const chkHip = el("chkHipReticle");
  if (chkHip) chkHip.checked = state.showHipReticle;
  const chkRays = el("chkAimRays");
  if (chkRays) chkRays.checked = state.showAimRays;

  const zsel = el("settingsZeroDist");
  if (zsel) zsel.value = String(state.zeroDist);

  const lookPct = Math.round((player.lookSens / LOOK_SENS_BASE) * 100);
  const lookSlider = el("lookSensSlider");
  const lookVal = el("lookSensVal");
  if (lookSlider) lookSlider.value = String(clamp(lookPct, 50, 200));
  if (lookVal) lookVal.textContent = `${clamp(lookPct, 50, 200)}%`;

  const adsPct = Math.round((player.adsLookMul / ADS_LOOK_MUL_BASE) * 100);
  const adsSlider = el("adsLookMulSlider");
  const adsVal = el("adsLookMulVal");
  if (adsSlider) adsSlider.value = String(clamp(adsPct, 50, 150));
  if (adsVal) adsVal.textContent = `${(player.adsLookMul).toFixed(2)}×`;
}

function renderGunList() {
  const list = el("gunList");
  list.innerHTML = "";
  Object.keys(db).forEach((id) => {
    const meta = WEAPON_META[id] || { label: id, blurb: id };
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = id === state.gunPickId ? "selected" : "";
    btn.innerHTML = `<span class="gname">${meta.label}</span><span class="gmeta">${id} — ${meta.blurb}</span>`;
    btn.onclick = () => {
      state.gunPickId = id;
      renderGunList();
    };
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function equipWeapon(id) {
  if (!db[id]) return;
  state.weaponId = id;
  const keys = Object.keys(attachments[id] || { holo_sight: 1 });
  if (!keys.includes(state.attachmentId)) state.attachmentId = keys[0];
  buildWeaponSelect();
  buildPoseSelect();
  buildAttSelect();
  syncAxisInputsFromPose(true);
  syncAxisInputsFromPose(false);
  if (typeof buildBlockGun === "function" && holdRoot) buildBlockGun(id);
  refresh();
  showToast("Equipped " + id);
}

function setOptic(profile) {
  if (!OPTIC_LABELS[profile]) return;
  state.optic = profile;
  const sel = el("opticSelect");
  if (sel) sel.value = profile;
  updateOpticVisibility();
  refresh(false);
  showToast("Optic: " + OPTIC_LABELS[profile]);
  updateHudHint();
}

function buildWeaponSelect() {
  const s = el("weaponSelect");
  s.innerHTML = Object.keys(db).map((id) => `<option value="${id}">${id}</option>`).join("");
  s.value = state.weaponId;
}
function buildPoseSelect() {
  const s = el("poseSelect");
  s.innerHTML = POSE_KEYS.map((k) => `<option value="${k}">${k}</option>`).join("");
  s.value = state.poseKey;
}
function buildAttSelect() {
  const s = el("attSelect");
  const keys = Object.keys(attachments[state.weaponId] || { holo_sight: 1 });
  if (!keys.includes(state.attachmentId)) state.attachmentId = keys[0];
  s.innerHTML = keys.map((k) => `<option value="${k}">${k}</option>`).join("");
  s.value = state.attachmentId;
}

/* ---- Axis editors ---- */
const axisBuilt = { view: false, att: false };

function buildAxesOnce(containerId, which) {
  if (axisBuilt[which]) return;
  const root = el(containerId);
  root.innerHTML = "";
  AXIS_DEFS.forEach((axis, i) => {
    const row = document.createElement("div");
    row.className = "axis";
    row.dataset.index = String(i);
    row.innerHTML = `
      <span class="name">${axis.label}</span>
      <input type="number" step="any" data-axis="${axis.id}" value="0" />
      <div class="nudge">
        <button type="button" data-sign="-1">−</button>
        <button type="button" data-sign="1">+</button>
      </div>
    `;
    row.addEventListener("click", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
      if (which === "view") state.selectedAxis = i;
      else state.attSelectedAxis = i;
      updateAxisSelection();
    });
    const input = row.querySelector("input");
    input.addEventListener("input", (e) => {
      const pose = which === "view" ? currentViewPose() : currentAttPose();
      const v = parseFloat(e.target.value);
      if (Number.isFinite(v)) pose[axis.id] = v;
      refresh(false);
    });
    row.querySelectorAll("button[data-sign]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (which === "view") state.selectedAxis = i;
        else state.attSelectedAxis = i;
        const pose = which === "view" ? currentViewPose() : currentAttPose();
        const stepKey = which === "view" ? state.step : state.attStep;
        const delta = axis.kind === "rot" ? ROT_STEPS[stepKey] : POS_STEPS[stepKey];
        pose[axis.id] = (pose[axis.id] ?? 0) + Number(btn.dataset.sign) * delta;
        syncAxisInputsFromPose(which === "view");
        refresh(false);
      });
    });
    root.appendChild(row);
  });
  axisBuilt[which] = true;
}

function syncAxisInputsFromPose(isView) {
  const which = isView ? "view" : "att";
  const containerId = isView ? "viewAxes" : "attAxes";
  buildAxesOnce(containerId, which);
  const pose = isView ? currentViewPose() : currentAttPose();
  const root = el(containerId);
  AXIS_DEFS.forEach((axis) => {
    const input = root.querySelector(`input[data-axis="${axis.id}"]`);
    if (!input) return;
    const val = pose[axis.id] ?? 0;
    if (document.activeElement !== input) input.value = String(val);
  });
  updateAxisSelection();
}

function updateAxisSelection() {
  [["viewAxes", state.selectedAxis], ["attAxes", state.attSelectedAxis]].forEach(([id, sel]) => {
    const root = el(id);
    if (!root) return;
    root.querySelectorAll(".axis").forEach((row, i) => {
      row.classList.toggle("selected", i === sel);
    });
  });
}

function setTab(mode) {
  state.mode = mode;
  const view = mode === "weapon";
  el("tab-view").setAttribute("aria-selected", view ? "true" : "false");
  el("tab-att").setAttribute("aria-selected", view ? "false" : "true");
  el("panel-view").hidden = !view;
  el("panel-att").hidden = view;
  el("panel-view").classList.toggle("hidden", !view);
  el("panel-att").classList.toggle("hidden", view);
}

function cyclePose(dir) {
  const i = POSE_KEYS.indexOf(state.poseKey);
  state.poseKey = POSE_KEYS[(i + dir + POSE_KEYS.length) % POSE_KEYS.length];
  el("poseSelect").value = state.poseKey;
  syncAxisInputsFromPose(true);
  refresh();
}
function cycleStep(which, dir) {
  const order = ["micro", "fine", "med", "coarse"];
  const cur = which === "weapon" ? state.step : state.attStep;
  const i = order.indexOf(cur);
  const next = order[(i + dir + order.length) % order.length];
  if (which === "weapon") {
    state.step = next;
    el("stepSelect").value = next;
  } else {
    state.attStep = next;
    el("attStepSelect").value = next;
  }
}
function cycleZeroDist(dir) {
  let i = ZERO_DIST_PRESETS.indexOf(state.zeroDist);
  if (i < 0) i = ZERO_DIST_PRESETS.indexOf(100);
  if (i < 0) i = 2;
  const next = clamp(i + dir, 0, ZERO_DIST_PRESETS.length - 1);
  setZeroDist(ZERO_DIST_PRESETS[next], { toast: true });
}


function nudgeSelected(sign) {
  const weaponMode = state.mode === "weapon";
  const axisIndex = weaponMode ? state.selectedAxis : state.attSelectedAxis;
  const axis = AXIS_DEFS[axisIndex];
  const step = weaponMode ? state.step : state.attStep;
  const delta = axis.kind === "rot" ? ROT_STEPS[step] : POS_STEPS[step];
  const pose = weaponMode ? currentViewPose() : currentAttPose();
  pose[axis.id] = (pose[axis.id] ?? 0) + sign * delta;
  syncAxisInputsFromPose(weaponMode);
  refresh(false);
}

/* ---- Three.js scene + player ---- */
let renderer, camera, scene, holdRoot, gunRoot;
let opticRoot, gripMesh, muzzleFlash, muzzleSocket, swayRig;
let tracers = [];
let playerRoot, leanPivot;
let pickups = [];
let rangeTargets = [];
let silhouetteTargets = [];
let scorePopups = [];
let clock = new THREE.Clock();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _lookDir = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2(0, 0);

const input = {
  forward: false, back: false, left: false, right: false,
  sprint: false, leanLeft: false, leanRight: false,
  ads: false, shoot: false, holdBreath: false,
  crouchHold: false,
};

const player = {
  pos: new THREE.Vector3(0, 0.2, 2.5),
  yaw: 0,
  pitch: 0,
  leanAngle: 0,
  leanTarget: 0,
  bobPhase: 0,
  eyeHeight: 0.2,
  eyeCurrent: 0.2,
  crouchEyeMul: 0.6,
  crouchSpeedMul: 0.6,
  moveSpeed: 3.2,
  sprintMul: 1.65,
  lookSens: LOOK_SENS_BASE,
  // Global ADS coefficient on top of FOV scale (1 = hip feel × FOV ratio only).
  adsLookMul: 1,
  leanMax: 0.5,
  leanSpring: 8,
  leanLerp: 0.1,
  leanOffset: 0.5,
  fovHip: FOV_BY_OPTIC.hip,
  fovAds: FOV_BY_OPTIC.iron,
  fov: FOV_BY_OPTIC.hip,
  strafeTilt: 0,
  flashUntil: 0,
  swayT: 0,
  swayAmp: 1,
  breathRecover: 0,
  recoilPunch: new THREE.Vector3(),
  recoilRot: new THREE.Vector3(),
  fireCooldown: 0,
};


/** Subtle chalk/wood range marker lines on the floor (no floating text). */
let groundRangeLines = [];

function clearGroundRangeLines() {
  for (const mesh of groundRangeLines) {
    if (mesh.parent) mesh.parent.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material;
    if (mat) {
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
  }
  groundRangeLines = [];
}

function buildGroundRangeLines(zs) {
  clearGroundRangeLines();
  // Floor y = -1.4, strip = -1.385, grid = -1.39 — sit just above to avoid z-fight.
  const y = -1.335;
  const width = 10.8; // between side rails at ±5.5
  const depth = 0.07;
  for (const z of zs) {
    // Soft chalk body
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshBasicMaterial({
        color: 0xd4c4a4,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, y, z);
    mesh.renderOrder = 1;
    scene.add(mesh);
    groundRangeLines.push(mesh);
    // Thin brighter core so distance marks read at a glance without shouting
    const core = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.92, depth * 0.28),
      new THREE.MeshBasicMaterial({
        color: 0xe8dcc4,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    core.rotation.x = -Math.PI / 2;
    core.position.set(0, y + 0.001, z);
    core.renderOrder = 2;
    scene.add(core);
    groundRangeLines.push(core);
  }
}


/** Procedural CanvasTexture — no external downloads. */
function makeCanvasTexture(draw, size = 256, opts = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  return tex;
}

function makeDirtConcreteTexture(repeatX = 8, repeatZ = 40) {
  return makeCanvasTexture((ctx, size) => {
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, "#1c222c");
    g.addColorStop(0.45, "#232a36");
    g.addColorStop(1, "#1a1f28");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    // Speckle / wear
    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const a = 0.04 + Math.random() * 0.12;
      const v = 40 + Math.floor(Math.random() * 90);
      ctx.fillStyle = `rgba(${v},${v + 4},${v + 10},${a})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5);
    }
    // Faint cracks / scrape lines
    ctx.strokeStyle = "rgba(70,78,92,0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, Math.random() * size);
      ctx.lineTo(Math.random() * size, Math.random() * size);
      ctx.stroke();
    }
    // Soft grid suggestion
    ctx.strokeStyle = "rgba(55,64,80,0.22)";
    ctx.lineWidth = 1;
    const step = size / 8;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(size, i * step);
      ctx.stroke();
    }
  }, 256, { repeat: [repeatX, repeatZ] });
}

function makeLaneStripTexture() {
  return makeCanvasTexture((ctx, size) => {
    ctx.fillStyle = "#171b24";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const v = 28 + Math.floor(Math.random() * 50);
      ctx.fillStyle = `rgba(${v},${v + 2},${v + 8},${0.05 + Math.random() * 0.1})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    // Worn tire / footpath streaks along length (Y in UV)
    ctx.strokeStyle = "rgba(90,98,112,0.08)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const x = 30 + i * 36 + Math.random() * 8;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 10, size);
      ctx.stroke();
    }
  }, 256, { repeat: [3, 50] });
}

function makeWoodTexture() {
  return makeCanvasTexture((ctx, size) => {
    ctx.fillStyle = "#5a4634";
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 3) {
      const shade = 70 + ((y * 17) % 40);
      ctx.fillStyle = `rgba(${shade},${shade - 18},${shade - 36},0.35)`;
      ctx.fillRect(0, y, size, 2);
    }
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(40,28,18,${0.08 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.moveTo(0, Math.random() * size);
      ctx.bezierCurveTo(size * 0.3, Math.random() * size, size * 0.7, Math.random() * size, size, Math.random() * size);
      ctx.stroke();
    }
  }, 128, { repeat: [2, 1] });
}

function makeBermTexture() {
  return makeCanvasTexture((ctx, size) => {
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, "#3a3228");
    g.addColorStop(0.5, "#2e2820");
    g.addColorStop(1, "#241e18");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 55 + Math.floor(Math.random() * 45);
      const grn = r - 12 - Math.floor(Math.random() * 10);
      const b = r - 28;
      ctx.fillStyle = `rgba(${r},${grn},${b},${0.08 + Math.random() * 0.18})`;
      ctx.beginPath();
      ctx.arc(x, y, 0.6 + Math.random() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 256, { repeat: [4, 1] });
}

function makeCrate(w, h, d, x, y, z, rotY = 0) {
  const woodTex = makeWoodTexture();
  const mat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0xbca890,
    roughness: 0.85,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // Band straps
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x3a342c, roughness: 0.7, metalness: 0.25 });
  const band1 = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, h * 0.08, d * 1.02), bandMat);
  band1.position.y = h * 0.15;
  const band2 = band1.clone();
  band2.position.y = -h * 0.18;
  mesh.add(band1, band2);
  return mesh;
}

function makeBarrel(r, h, x, y, z, color = 0x3d4a3a) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.35 });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.02, h, 16), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(r * 0.92, 0.025, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.5, metalness: 0.5 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = h * 0.42;
  mesh.add(rim);
  return mesh;
}

function makeBox(w, h, d, color, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.15 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function adsFovForOptic(optic) {
  if (optic === "sniper_scope") return FOV_BY_OPTIC.sniper_scope;
  if (optic === "acog") return FOV_BY_OPTIC.acog;
  if (optic === "holo") return FOV_BY_OPTIC.holo;
  return FOV_BY_OPTIC.iron;
}

function makeCyl(rTop, rBot, h, color, x, y, z, rx, ry, rz, segs = 16) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, segs);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.35 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx || 0, ry || 0, rz || 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeLensGlass(radius, opacity = 0.2) {
  return new THREE.Mesh(
    new THREE.CircleGeometry(radius, 24),
    new THREE.MeshBasicMaterial({
      color: 0x88aacc,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
}

function makeRingTube(innerR, outerR, length, color, segs = 20) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(outerR, outerR, length, segs, 1, true),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide })
  );
  outer.rotation.x = Math.PI / 2;
  const lipMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide });
  const lipF = new THREE.Mesh(new THREE.RingGeometry(innerR, outerR, segs), lipMat);
  lipF.position.z = length / 2;
  const lipB = new THREE.Mesh(new THREE.RingGeometry(innerR, outerR, segs), lipMat.clone());
  lipB.position.z = -length / 2;
  g.add(outer, lipF, lipB);
  return g;
}

function makeOpticMesh(profile) {
  const g = new THREE.Group();
  g.name = "optic_" + profile;
  if (profile === "iron") {
    // Front post + rear notch — no glass; alignment geometry for hip/ADS
    const rearBase = makeBox(0.05, 0.014, 0.022, 0x1a1f28, 0, 0.01, 0.055);
    const notchL = makeBox(0.01, 0.028, 0.014, 0x11151c, -0.016, 0.028, 0.055);
    const notchR = makeBox(0.01, 0.028, 0.014, 0x11151c, 0.016, 0.028, 0.055);
    const frontBase = makeBox(0.014, 0.01, 0.014, 0x1a1f28, 0, 0.01, -0.14);
    const post = makeBox(0.007, 0.022, 0.007, 0xc45c2a, 0, 0.026, -0.14);
    const tip = makeBox(0.009, 0.005, 0.009, 0xffaa66, 0, 0.039, -0.14);
    g.add(rearBase, notchL, notchR, frontBase, post, tip);
  } else if (profile === "holo") {
    // EOTech XPS3-ish: compact black hood, open rear window, see-through glass
    const blk = 0x12151a;
    const blk2 = 0x1c2129;
    const mount = makeBox(0.046, 0.01, 0.055, blk2, 0, 0.005, 0.005);
    // Side walls + top hood (rear open toward shooter)
    const sideL = makeBox(0.006, 0.042, 0.05, blk, -0.028, 0.032, -0.005);
    const sideR = makeBox(0.006, 0.042, 0.05, blk, 0.028, 0.032, -0.005);
    const top = makeBox(0.062, 0.007, 0.05, blk, 0, 0.055, -0.005);
    // Open front aperture (rim only) so glass is see-through
    const frontBot = makeBox(0.062, 0.006, 0.006, blk, 0, 0.012, -0.03);
    const frontL = makeBox(0.006, 0.042, 0.006, blk, -0.028, 0.032, -0.03);
    const frontR = makeBox(0.006, 0.042, 0.006, blk, 0.028, 0.032, -0.03);
    const glass = makeLensGlass(0.02, 0.1);
    glass.material.color.setHex(0xb0c4d8);
    glass.position.set(0, 0.032, -0.028);
    const batt = makeBox(0.018, 0.028, 0.028, blk2, 0.04, 0.03, 0.0);
    const hoodLip = makeBox(0.062, 0.005, 0.01, blk, 0, 0.056, 0.02);
    g.add(mount, sideL, sideR, top, frontBot, frontL, frontR, glass, batt, hoodLip);
  } else if (profile === "acog") {
    // Longer tube + eye relief; open aperture; HUD chevron when ADS
    const mount = makeBox(0.038, 0.014, 0.09, 0x3a4558, 0, 0.007, 0.01);
    const tube = makeRingTube(0.012, 0.02, 0.13, 0x4a5568, 18);
    tube.position.set(0, 0.038, -0.01);
    const bell = makeRingTube(0.014, 0.026, 0.028, 0x2c3340, 18);
    bell.position.set(0, 0.038, -0.09);
    const ocular = makeRingTube(0.011, 0.022, 0.024, 0x2c3340, 18);
    ocular.position.set(0, 0.038, 0.065);
    const glassF = makeLensGlass(0.013, 0.14);
    glassF.position.set(0, 0.038, -0.105);
    const glassB = makeLensGlass(0.011, 0.1);
    glassB.position.set(0, 0.038, 0.078);
    g.add(mount, tube, bell, ocular, glassF, glassB);
  } else {
    // sniper_scope — long tube, objective bell + ocular
    const mount = makeBox(0.036, 0.012, 0.12, 0x3a4558, 0, 0.006, 0);
    const tube = makeRingTube(0.011, 0.019, 0.2, 0x2a3140, 20);
    tube.position.set(0, 0.04, -0.02);
    const obj = makeRingTube(0.016, 0.032, 0.04, 0x1a1f28, 22);
    obj.position.set(0, 0.04, -0.14);
    const ocular = makeRingTube(0.012, 0.024, 0.032, 0x1a1f28, 20);
    ocular.position.set(0, 0.04, 0.1);
    const glassObj = makeLensGlass(0.018, 0.18);
    glassObj.position.set(0, 0.04, -0.162);
    const glassEye = makeLensGlass(0.012, 0.12);
    glassEye.position.set(0, 0.04, 0.118);
    g.add(mount, tube, obj, ocular, glassObj, glassEye);
  }
  return g;
}

function buildBlockGun(style) {
  if (gunRoot) {
    const parent = gunRoot.parent;
    if (parent) parent.remove(gunRoot);
    gunRoot.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }
  if (!swayRig) {
    swayRig = new THREE.Group();
    swayRig.name = "swayRig";
    holdRoot.add(swayRig);
  }
  gunRoot = new THREE.Group();
  const isRifle = style === "example_rifle";

  if (isRifle) {
    const stock = makeBox(0.05, 0.085, 0.2, 0x4a3a2a, 0.008, -0.015, 0.2);
    const stockPad = makeBox(0.052, 0.095, 0.03, 0x3a2e22, 0.008, -0.01, 0.31);
    const receiver = makeBox(0.062, 0.078, 0.28, 0x5a6578, 0, 0.002, 0.02);
    const rail = makeBox(0.028, 0.01, 0.26, 0x2a3140, 0, 0.046, -0.02);
    const handguard = makeBox(0.058, 0.055, 0.22, 0x3a4558, 0, 0.008, -0.22);
    const barrel = makeCyl(0.012, 0.012, 0.38, 0x2c3340, 0, 0.022, -0.52, Math.PI / 2, 0, 0, 12);
    const muzzleBrake = makeCyl(0.016, 0.014, 0.04, 0x1a1f28, 0, 0.022, -0.72, Math.PI / 2, 0, 0, 10);
    const mag = makeBox(0.036, 0.15, 0.05, 0x444b58, 0, -0.115, 0.0);
    const pistol = makeBox(0.036, 0.1, 0.048, 0x2a3140, 0, -0.085, 0.1);
    pistol.rotation.x = 0.22;
    gripMesh = makeBox(0.038, 0.055, 0.07, 0x6b5344, 0, -0.048, -0.2);
    muzzleFlash = makeBox(0.04, 0.04, 0.04, 0xffcc66, 0, 0.022, -0.76);
    gunRoot.add(stock, stockPad, receiver, rail, handguard, barrel, muzzleBrake, mag, pistol, gripMesh, muzzleFlash);
    gripMesh.userData.base = { x: 0, y: -0.048, z: -0.2, rotX: 0, rotY: 0, rotZ: 0 };
    opticRoot = new THREE.Group();
    opticRoot.position.set(0, 0.052, -0.02);
    opticRoot.userData.base = { x: 0, y: 0.052, z: -0.02, rotX: 0, rotY: 0, rotZ: 0 };
  } else {
    const stock = makeBox(0.042, 0.06, 0.1, 0x3a4558, 0.01, -0.01, 0.13);
    const receiver = makeBox(0.058, 0.072, 0.18, 0x5a6578, 0, 0.0, 0.01);
    const rail = makeBox(0.024, 0.009, 0.16, 0x2a3140, 0, 0.042, -0.01);
    const handguard = makeBox(0.05, 0.05, 0.12, 0x445060, 0, 0.006, -0.13);
    const barrel = makeCyl(0.011, 0.011, 0.2, 0x2c3340, 0, 0.016, -0.28, Math.PI / 2, 0, 0, 12);
    const muzzleDevice = makeCyl(0.014, 0.013, 0.028, 0x1a1f28, 0, 0.016, -0.4, Math.PI / 2, 0, 0, 10);
    const mag = makeBox(0.038, 0.12, 0.05, 0x444b58, 0, -0.1, 0.01);
    const pistol = makeBox(0.034, 0.088, 0.042, 0x2a3140, 0, -0.078, 0.07);
    pistol.rotation.x = 0.28;
    gripMesh = makeBox(0.034, 0.048, 0.048, 0x6b5344, 0, -0.052, -0.1);
    muzzleFlash = makeBox(0.032, 0.032, 0.032, 0xffcc66, 0, 0.016, -0.43);
    gunRoot.add(stock, receiver, rail, handguard, barrel, muzzleDevice, mag, pistol, gripMesh, muzzleFlash);
    gripMesh.userData.base = { x: 0, y: -0.052, z: -0.1, rotX: 0, rotY: 0, rotZ: 0 };
    opticRoot = new THREE.Group();
    opticRoot.position.set(0, 0.048, -0.01);
    opticRoot.userData.base = { x: 0, y: 0.048, z: -0.01, rotX: 0, rotY: 0, rotZ: 0 };
  }

  muzzleFlash.material = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.95 });
  muzzleFlash.visible = false;
  muzzleSocket = new THREE.Object3D();
  muzzleSocket.name = "muzzleSocket";
  muzzleSocket.position.copy(muzzleFlash.position);
  gunRoot.add(muzzleSocket);
  gunRoot.add(opticRoot);
  rebuildOpticMeshes();
  swayRig.add(gunRoot);
}

function rebuildOpticMeshes() {
  while (opticRoot.children.length) {
    const c = opticRoot.children.pop();
    c.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }
  ["iron", "holo", "acog", "sniper_scope"].forEach((id) => {
    const m = makeOpticMesh(id);
    m.userData.opticId = id;
    m.visible = id === state.optic;
    opticRoot.add(m);
  });
}

function updateOpticVisibility() {
  if (!opticRoot) return;
  opticRoot.children.forEach((c) => {
    c.visible = c.userData.opticId === state.optic;
  });
}

function buildRoom() {
  const floorTex = makeDirtConcreteTexture(6, 50);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    color: 0xc8d0dc,
    roughness: 0.92,
    metalness: 0.04,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 450), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.4;
  floor.position.z = -200;
  floor.receiveShadow = true;
  scene.add(floor);

  // Soft reference grid — quieter than before so texture can read
  const grid = new THREE.GridHelper(40, 80, 0x2e3848, 0x1c222c);
  grid.position.y = -1.39;
  grid.position.z = -200;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);

  // Low side walls / bay dividers for scale (outside the ±5.5 rails)
  const wallMat = new THREE.MeshStandardMaterial({
    map: makeDirtConcreteTexture(2, 30),
    color: 0x9aa6b4,
    roughness: 0.9,
    metalness: 0.05,
  });
  for (const side of [-12, 12]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.4, 420), wallMat.clone());
    wall.position.set(side, -0.2, -200);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  }

  buildOpticsTable();
  buildRangeProps();
  buildShootingRange();
}

function buildOpticsTable() {
  const tableY = -0.85;
  const tableZ = -1.6;
  const woodTex = makeWoodTexture();
  const topMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0xc4a882,
    roughness: 0.72,
    metalness: 0.04,
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.055, 0.58), topMat);
  top.position.set(0, tableY, tableZ);
  top.castShadow = true;
  top.receiveShadow = true;
  // Subtle edge lip / apron
  const apron = makeBox(1.68, 0.05, 0.04, 0x3a2e22, 0, tableY - 0.04, tableZ + 0.27);
  const apronB = makeBox(1.68, 0.05, 0.04, 0x3a2e22, 0, tableY - 0.04, tableZ - 0.27);
  const legMat = 0x2e241c;
  const legL = makeBox(0.07, 0.55, 0.07, legMat, -0.72, tableY - 0.3, tableZ - 0.22);
  const legR = makeBox(0.07, 0.55, 0.07, legMat, 0.72, tableY - 0.3, tableZ - 0.22);
  const legL2 = makeBox(0.07, 0.55, 0.07, legMat, -0.72, tableY - 0.3, tableZ + 0.22);
  const legR2 = makeBox(0.07, 0.55, 0.07, legMat, 0.72, tableY - 0.3, tableZ + 0.22);
  // Small shelf under top for depth
  const shelf = makeBox(1.4, 0.03, 0.4, 0x4a3a2c, 0, tableY - 0.28, tableZ);
  scene.add(top, apron, apronB, legL, legR, legL2, legR2, shelf);

  const defs = [
    { id: "iron", label: "Iron", x: -0.55 },
    { id: "holo", label: "Holo", x: -0.18 },
    { id: "acog", label: "Acog", x: 0.18 },
    { id: "sniper_scope", label: "Sniper scope", x: 0.55 },
  ];
  pickups = [];
  defs.forEach((d) => {
    const group = new THREE.Group();
    group.position.set(d.x, tableY + 0.08, tableZ);
    const prop = makeOpticMesh(d.id);
    prop.scale.setScalar(0.85);
    prop.rotation.y = 0.35;
    group.add(prop);
    const highlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.02, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x6ea8ff, transparent: true, opacity: 0.0 })
    );
    highlight.position.y = 0.01;
    group.add(highlight);
    group.userData = { opticId: d.id, label: d.label, highlight, baseY: tableY + 0.08 };
    scene.add(group);
    pickups.push(group);
  });
}

function buildShootingRange() {
  const baseLanes = [
    { z: -25, pts: 5 },
    { z: -55, pts: 8 },
    { z: -100, pts: 12 },
    { z: -160, pts: 16 },
    { z: -250, pts: 22 },
    { z: -380, pts: 30 },
  ];
  clearGroundRangeLines();
  rangeTargets = [];
  silhouetteTargets = [];
  scorePopups.forEach((p) => p.el && p.el.remove());
  scorePopups = [];
  const fl = el("floatLabels");
  if (fl) fl.innerHTML = "";

  const stripTex = makeLaneStripTexture();
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 420),
    new THREE.MeshStandardMaterial({
      map: stripTex,
      color: 0xa8b0bc,
      roughness: 0.94,
      metalness: 0.03,
    })
  );
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(0, -1.385, -200);
  strip.receiveShadow = true;
  scene.add(strip);

  for (const side of [-5.5, 5.5]) {
    const rail = makeBox(0.1, 0.14, 400, 0x343c4c, side, -1.3, -200);
    rail.material.roughness = 0.8;
    rail.material.metalness = 0.2;
    scene.add(rail);
  }

  // Nominal circular-lane distances as thin floor markers (lines only, no text).
  buildGroundRangeLines(baseLanes.map((lane) => lane.z));

  baseLanes.forEach((lane, i) => {
    const x = (Math.random() - 0.5) * 8.5;
    const z = lane.z + (Math.random() - 0.5) * 3.5;
    const y = 0.15 + (Math.random() - 0.5) * 0.2;
    const scale = 0.85 + Math.random() * 0.35;

    scene.add(makeBox(0.08, 0.9 * scale, 0.08, 0x445060, x - 0.55 * scale, -0.95, z));
    scene.add(makeBox(0.08, 1.2 * scale, 0.08, 0x3a4558, x, -0.8, z));
    scene.add(makeBox(0.9 * scale, 0.06, 0.06, 0x3a4558, x, -0.2, z));

    const faceR = 0.45 * scale;
    const woodThick = 0.036;
    // Thin wood cylinder body (axis along Z after rotate)
    const woodDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(faceR, faceR, woodThick, 28),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.9 })
    );
    woodDisc.rotation.x = Math.PI / 2;
    woodDisc.position.set(x, y, z - woodThick * 0.5);
    // Painted face toward shooter (+Z)
    const board = new THREE.Mesh(
      new THREE.CircleGeometry(faceR, 28),
      new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.85 })
    );
    board.position.set(x, y, z + 0.001);
    // Explicit wood back facing away from shooter
    const woodBack = new THREE.Mesh(
      new THREE.CircleGeometry(faceR, 28),
      new THREE.MeshStandardMaterial({ color: 0x5a3d26, roughness: 0.9 })
    );
    woodBack.rotation.y = Math.PI;
    woodBack.position.set(x, y, z - woodThick - 0.001);
    const ring1 = new THREE.Mesh(
      new THREE.RingGeometry(0.28 * scale, 0.32 * scale, 28),
      new THREE.MeshBasicMaterial({ color: 0x222833, side: THREE.DoubleSide })
    );
    ring1.position.set(x, y, z + 0.01);
    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(0.14 * scale, 0.18 * scale, 28),
      new THREE.MeshBasicMaterial({ color: 0xc45c2a, side: THREE.DoubleSide })
    );
    ring2.position.set(x, y, z + 0.012);
    const bull = new THREE.Mesh(
      new THREE.CircleGeometry(0.05 * scale, 16),
      new THREE.MeshBasicMaterial({ color: 0xc45c2a })
    );
    bull.position.set(x, y, z + 0.014);
    const flash = new THREE.Mesh(
      new THREE.CircleGeometry(0.5 * scale, 28),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
    );
    flash.position.set(x, y, z + 0.02);

    scene.add(woodDisc, board, woodBack, ring1, ring2, bull, flash);
    rangeTargets.push({
      mesh: board,
      flash,
      center: new THREE.Vector3(x, y, z),
      normal: new THREE.Vector3(0, 0, 1),
      radius: 0.48 * scale,
      bullRadius: 0.06 * scale,
      midRadius: 0.18 * scale,
      outerRadius: 0.32 * scale,
      basePts: lane.pts,
      hitUntil: 0,
    });
  });

  buildSilhouetteLane();
  buildBackBerm();
}

/** Earthen backstop berm ~400m — layered dirt/rock silhouette for distance read. */
function buildBackBerm() {
  const bermTex = makeBermTexture();
  const dirtMat = new THREE.MeshStandardMaterial({
    map: bermTex,
    color: 0xb8a890,
    roughness: 0.95,
    metalness: 0.02,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x2a241c,
    roughness: 0.96,
    metalness: 0.02,
  });
  // Main mound
  const main = new THREE.Mesh(new THREE.BoxGeometry(28, 5.2, 3.2), dirtMat);
  main.position.set(0, 0.7, -410);
  main.castShadow = true;
  main.receiveShadow = true;
  scene.add(main);
  // Front slope / face toward shooter
  const face = new THREE.Mesh(new THREE.BoxGeometry(26, 3.6, 2.4), dirtMat.clone());
  face.position.set(0, -0.15, -407.2);
  face.rotation.x = -0.35;
  face.castShadow = true;
  face.receiveShadow = true;
  scene.add(face);
  // Crest / uneven top chunks
  for (const [x, y, z, w, h, d] of [
    [-8, 3.2, -410.5, 6, 1.4, 2.2],
    [-2, 3.5, -409.8, 5, 1.8, 2.5],
    [5, 3.1, -410.2, 7, 1.3, 2.0],
    [10, 2.9, -411, 5, 1.1, 1.8],
  ]) {
    const chunk = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), darkMat.clone());
    chunk.position.set(x, y, z);
    chunk.rotation.y = (x % 3) * 0.05;
    chunk.castShadow = true;
    chunk.receiveShadow = true;
    scene.add(chunk);
  }
  // Flanking dirt piles
  for (const side of [-14, 14]) {
    const pile = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 4), dirtMat.clone());
    pile.position.set(side, 0.1, -408);
    pile.castShadow = true;
    pile.receiveShadow = true;
    scene.add(pile);
  }
}

/** Side-bay crates / barrels for depth — kept clear of the firing lane. */
function buildRangeProps() {
  const placements = [
    // near bay / optics area
    () => scene.add(makeCrate(0.55, 0.45, 0.5, -7.2, -1.15, -4.5, 0.2)),
    () => scene.add(makeCrate(0.4, 0.35, 0.4, -7.5, -1.2, -3.8, -0.4)),
    () => scene.add(makeBarrel(0.22, 0.7, -6.6, -1.05, -5.8, 0x3a4a3c)),
    () => scene.add(makeCrate(0.5, 0.4, 0.48, 7.4, -1.18, -3.5, -0.25)),
    () => scene.add(makeBarrel(0.2, 0.65, 6.8, -1.07, -4.8, 0x4a3a2e)),
    () => scene.add(makeBarrel(0.22, 0.72, 7.6, -1.04, -5.2, 0x3d4550)),
    // mid-range side silhouettes
    () => scene.add(makeCrate(0.6, 0.5, 0.55, -7.8, -1.12, -48, 0.15)),
    () => scene.add(makeBarrel(0.24, 0.8, -7.1, -1.0, -52, 0x454e3a)),
    () => scene.add(makeCrate(0.45, 0.38, 0.42, 7.5, -1.18, -70, -0.3)),
    () => scene.add(makeBarrel(0.22, 0.7, 8.0, -1.05, -95, 0x3a4048)),
    () => scene.add(makeCrate(0.7, 0.55, 0.6, -8.0, -1.1, -140, 0.4)),
    () => scene.add(makeBarrel(0.25, 0.85, 7.8, -0.98, -180, 0x4a4034)),
    () => scene.add(makeCrate(0.5, 0.42, 0.48, 7.2, -1.16, -220, -0.2)),
    () => scene.add(makeCrate(0.55, 0.48, 0.5, -7.6, -1.14, -280, 0.1)),
    () => scene.add(makeBarrel(0.23, 0.75, 7.4, -1.02, -320, 0x384438)),
  ];
  for (const place of placements) place();
}


function syncSilhouetteZones(sil) {
  const _wp = new THREE.Vector3();
  for (const z of sil.zones) {
    const mesh = sil.plates[z.id];
    if (!mesh) continue;
    mesh.getWorldPosition(_wp);
    z.center.copy(_wp);
    // Face shooter (+Z in world for upright plates; still fine when flopped)
    z.normal.set(0, 0, 1);
  }
}

function createKnockdownSilhouette(x, z, scale) {
  const group = new THREE.Group();
  group.position.set(x, -1.35, z);

  const steel = 0x6a737e;
  const steelDark = 0x4a5560;
  const wood = 0x5c4632;
  const zoneCol = 0x8a949e;

  group.add(makeBox(0.38 * scale, 0.07 * scale, 0.28 * scale, wood, 0, 0.035 * scale, 0));
  group.add(makeBox(0.07 * scale, 0.5 * scale, 0.07 * scale, steelDark, 0, 0.32 * scale, -0.04 * scale));

  // Static lower legs / lower plate
  group.add(makeBox(0.11 * scale, 0.52 * scale, 0.08 * scale, steel, -0.11 * scale, 0.52 * scale, 0));
  group.add(makeBox(0.11 * scale, 0.52 * scale, 0.08 * scale, steel, 0.11 * scale, 0.52 * scale, 0));
  group.add(makeBox(0.34 * scale, 0.1 * scale, 0.06 * scale, steelDark, 0, 0.78 * scale, 0.01 * scale));

  const hipY = 0.88 * scale;
  const pelvisHinge = new THREE.Group();
  pelvisHinge.position.set(0, hipY, 0);
  group.add(pelvisHinge);

  const pelvisPlate = makeBox(0.34 * scale, 0.2 * scale, 0.05 * scale, zoneCol, 0, 0.06 * scale, 0.025 * scale);
  pelvisHinge.add(pelvisPlate);
  const pelvisFlash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36 * scale, 0.22 * scale),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
  );
  pelvisFlash.position.set(0, 0.06 * scale, 0.055 * scale);
  pelvisHinge.add(pelvisFlash);

  // Torso rocker parented under pelvis hinge (drops on kneel / collapse)
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.14 * scale, 0);
  pelvisHinge.add(torsoPivot);

  const chestPlate = makeBox(0.38 * scale, 0.52 * scale, 0.06 * scale, steel, 0, 0.28 * scale, 0.02 * scale);
  torsoPivot.add(chestPlate);
  // Blocky shoulder stubs
  torsoPivot.add(makeBox(0.14 * scale, 0.12 * scale, 0.08 * scale, steelDark, -0.24 * scale, 0.46 * scale, 0.01 * scale));
  torsoPivot.add(makeBox(0.14 * scale, 0.12 * scale, 0.08 * scale, steelDark, 0.24 * scale, 0.46 * scale, 0.01 * scale));
  const chestFlash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4 * scale, 0.54 * scale),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
  );
  chestFlash.position.set(0, 0.28 * scale, 0.055 * scale);
  torsoPivot.add(chestFlash);

  const headHinge = new THREE.Group();
  headHinge.position.set(0, 0.56 * scale, 0);
  torsoPivot.add(headHinge);

  const headPlate = makeBox(0.2 * scale, 0.24 * scale, 0.16 * scale, zoneCol, 0, 0.13 * scale, 0.02 * scale);
  headHinge.add(headPlate);
  // Ocular strip (original block accent — not a copyrighted face)
  headHinge.add(makeBox(0.14 * scale, 0.05 * scale, 0.02 * scale, 0x9aa8b5, 0, 0.15 * scale, 0.11 * scale));
  const headFlash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22 * scale, 0.26 * scale),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
  );
  headFlash.position.set(0, 0.13 * scale, 0.12 * scale);
  headHinge.add(headFlash);

  const sil = {
    group,
    pelvisHinge,
    torsoPivot,
    headHinge,
    plates: { pelvis: pelvisPlate, chest: chestPlate, head: headPlate },
    flashes: { pelvis: pelvisFlash, chest: chestFlash, head: headFlash },
    pose: "standing",
    headDown: false,
    chestHitCount: 0,
    chestHitsNeeded: 3,
    kneelAngle: 0,
    kneelTarget: 0,
    collapseAngle: 0,
    collapseTarget: 0,
    headAngle: 0,
    headTarget: 0,
    scale,
    hitUntil: { head: 0, chest: 0, pelvis: 0 },
    zones: [
      { id: "head", center: new THREE.Vector3(), normal: new THREE.Vector3(0, 0, 1), radius: 0.13 * scale, pts: 25 },
      { id: "chest", center: new THREE.Vector3(), normal: new THREE.Vector3(0, 0, 1), radius: 0.22 * scale, pts: 5 },
      { id: "pelvis", center: new THREE.Vector3(), normal: new THREE.Vector3(0, 0, 1), radius: 0.16 * scale, pts: 15 },
    ],
  };
  scene.add(group);
  syncSilhouetteZones(sil);
  return sil;
}

function buildSilhouetteLane() {
  silhouetteTargets = [];
  const lanes = [
    { z: -42 },
    { z: -88 },
    { z: -145 },
    { z: -230 },
    { z: -340 },
  ];
  const laneX = 7.4;
  lanes.forEach((lane) => {
    const x = laneX + (Math.random() - 0.5) * 1.6;
    const z = lane.z + (Math.random() - 0.5) * 4;
    const scale = 0.92 + Math.random() * 0.22;
    silhouetteTargets.push(createKnockdownSilhouette(x, z, scale));
  });
}

function zoneActive(sil, zoneId) {
  if (zoneId === "head") return !sil.headDown;
  if (zoneId === "pelvis") return sil.pose === "standing";
  if (zoneId === "chest") return sil.pose !== "down" && sil.chestHitCount < sil.chestHitsNeeded;
  return false;
}

function pushScorePopup(pts, klass, anchor) {
  const host = el("floatLabels");
  if (host) {
    const node = document.createElement("div");
    node.className = "float-popup " + klass;
    node.textContent = "+" + pts;
    host.appendChild(node);
    const a = anchor.clone();
    a.y += 0.35;
    scorePopups.push({ el: node, anchor: a, life: 1.15, drift: 0 });
  }
  state.score = (state.score || 0) + pts;
  const hud = el("scoreHud");
  if (hud) hud.textContent = "Score " + state.score;
}

function flashSilhouetteZone(sil, zone, hitPos) {
  const id = zone.id;
  sil.hitUntil[id] = performance.now() + 220;
  if (sil.flashes[id]) sil.flashes[id].material.opacity = 1;

  let pts = zone.pts;
  let klass = "outer";
  if (id === "head") {
    klass = "bull";
    sfx.play("bullseye");
  } else {
    klass = id === "pelvis" ? "mid" : "outer";
    sfx.play("hit");
  }
  pushScorePopup(pts, klass, hitPos || zone.center);

  if (id === "head" && !sil.headDown) {
    sil.headDown = true;
    sil.headTarget = -Math.PI * 0.52; // flop back/down ~90°+
  } else if (id === "pelvis" && sil.pose === "standing") {
    sil.pose = "kneeling";
    sil.kneelTarget = 1.05; // ~60°
  } else if (id === "chest") {
    sil.chestHitCount += 1;
    if (sil.chestHitCount >= sil.chestHitsNeeded && sil.pose !== "down") {
      sil.pose = "down";
      sil.kneelTarget = Math.max(sil.kneelTarget, 0.9);
      sil.collapseTarget = 1.25; // full fold
    }
  }
}

function resetSilhouettes() {
  for (const sil of silhouetteTargets) {
    sil.pose = "standing";
    sil.headDown = false;
    sil.chestHitCount = 0;
    sil.kneelTarget = 0;
    sil.collapseTarget = 0;
    sil.headTarget = 0;
    sil.kneelAngle = 0;
    sil.collapseAngle = 0;
    sil.headAngle = 0;
    sil.pelvisHinge.rotation.x = 0;
    sil.torsoPivot.rotation.x = 0;
    sil.headHinge.rotation.x = 0;
    for (const k of Object.keys(sil.flashes)) {
      sil.flashes[k].material.opacity = 0;
      sil.hitUntil[k] = 0;
    }
    syncSilhouetteZones(sil);
  }
}

function updateSilhouettes(dt) {
  const now = performance.now();
  const k = 1 - Math.exp(-10 * dt);
  for (const sil of silhouetteTargets) {
    sil.kneelAngle = lerp(sil.kneelAngle, sil.kneelTarget, k);
    sil.collapseAngle = lerp(sil.collapseAngle, sil.collapseTarget, k);
    sil.headAngle = lerp(sil.headAngle, sil.headTarget, k);
    sil.pelvisHinge.rotation.x = sil.kneelAngle;
    sil.torsoPivot.rotation.x = sil.collapseAngle;
    sil.headHinge.rotation.x = sil.headAngle;
    for (const id of ["head", "chest", "pelvis"]) {
      const flash = sil.flashes[id];
      if (!flash) continue;
      if (now < sil.hitUntil[id]) flash.material.opacity = 1;
      else flash.material.opacity = Math.max(0, flash.material.opacity - dt * 3);
    }
    syncSilhouetteZones(sil);
  }
}

function worldToScreen(world, out = { x: 0, y: 0, visible: false }) {
  if (!camera) return out;
  const canvas = el("view3d");
  if (!canvas) return out;
  const v = world.clone().project(camera);
  const rect = canvas.getBoundingClientRect();
  const parent = el("floatLabels")?.parentElement || canvas.parentElement;
  const pref = parent.getBoundingClientRect();
  out.visible = v.z > -1 && v.z < 1 && v.x >= -1.2 && v.x <= 1.2 && v.y >= -1.2 && v.y <= 1.2;
  out.x = (v.x * 0.5 + 0.5) * rect.width + (rect.left - pref.left);
  out.y = (-v.y * 0.5 + 0.5) * rect.height + (rect.top - pref.top);
  return out;
}

function hitTargetDiskInfo(prev, curr, t) {
  const n = t.normal;
  const center = t.center;
  const seg = curr.clone().sub(prev);
  const denom = seg.dot(n);
  if (Math.abs(denom) < 1e-10) return null;
  const u = center.clone().sub(prev).dot(n) / denom;
  if (u < 0 || u > 1) return null;
  const hit = prev.clone().addScaledVector(seg, u);
  const radial = hit.clone().sub(center);
  radial.addScaledVector(n, -radial.dot(n));
  if (radial.length() > t.radius) return null;
  return { hit: center.clone().add(radial), u };
}

function hitTargetDisk(prev, curr, t) {
  const info = hitTargetDiskInfo(prev, curr, t);
  return info ? info.hit : null;
}

function flashTarget(t, hitPos) {
  t.hitUntil = performance.now() + 220;
  if (t.flash) t.flash.material.opacity = 1;
  // Planar radial distance for ring scoring (hitPos is on the target plane)
  const d = hitPos ? hitPos.distanceTo(t.center) : 0;
  let pts = t.basePts;
  let klass = "edge";
  if (d <= t.bullRadius) {
    pts = t.basePts * 2;
    klass = "bull";
  } else if (d <= t.midRadius) {
    pts = Math.round(t.basePts * 1.4);
    klass = "mid";
  } else if (d <= t.outerRadius) {
    pts = t.basePts;
    klass = "outer";
  } else {
    pts = Math.max(1, Math.round(t.basePts * 0.5));
    klass = "edge";
  }

  if (klass === "bull") sfx.play("bullseye");
  else sfx.play("hit");

  pushScorePopup(pts, klass, hitPos || t.center);
}

function updateScorePopups(dt) {
  const tmp = { x: 0, y: 0, visible: false };
  // Hit markers (+pts) stay screen-fixed HTML; range distance is shown by ground lines.

  for (let i = scorePopups.length - 1; i >= 0; i--) {
    const p = scorePopups[i];
    p.life -= dt;
    p.drift += 48 * dt; // px upward on screen, constant size
    worldToScreen(p.anchor, tmp);
    if (!tmp.visible || p.life <= 0) {
      p.el.remove();
      scorePopups.splice(i, 1);
      continue;
    }
    p.el.style.left = tmp.x + "px";
    p.el.style.top = (tmp.y - p.drift) + "px";
    p.el.style.opacity = String(Math.max(0, p.life / 1.15));
  }
}

function clearInputFlags() {
  input.forward = input.back = input.left = input.right = false;
  input.sprint = input.leanLeft = input.leanRight = false;
  input.ads = input.shoot = false;
  input.holdBreath = false;
  input.crouchHold = false;
  state.holdBreath = false;
  player.leanTarget = 0;
  state.adsTarget = state.adsPreview ? 1 : 0;
}

function initThree() {
  const canvas = el("view3d");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x141820, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141820);
  // Subtle distance fog so ~400m berm reads as far without crushing mid-lane contrast
  scene.fog = new THREE.Fog(0x141820, 90, 430);
  camera = new THREE.PerspectiveCamera(player.fovHip, 1, 0.01, 500);

  playerRoot = new THREE.Group();
  leanPivot = new THREE.Group();
  playerRoot.add(leanPivot);
  leanPivot.add(camera);
  scene.add(playerRoot);

  const hemi = new THREE.HemisphereLight(0xc2d0e0, 0x3a3428, 0.62);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0x6a7888, 0.2);
  scene.add(amb);
  const key = new THREE.DirectionalLight(0xfff1dd, 1.05);
  key.position.set(10, 22, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 90;
  key.shadow.camera.left = -24;
  key.shadow.camera.right = 24;
  key.shadow.camera.top = 24;
  key.shadow.camera.bottom = -24;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 3.5;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x7a9ccc, 0.38);
  fill.position.set(-8, 10, -2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x556677, 0.18);
  rim.position.set(0, 8, -30);
  scene.add(rim);

  holdRoot = new THREE.Group();
  camera.add(holdRoot);


  buildRoom();
  buildBlockGun(state.weaponId);
  resize();
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas.parentElement || canvas);
  clock.start();
  animate();
}

function resize() {
  const canvas = el("view3d");
  const wrap = canvas.parentElement;
  const w = wrap.clientWidth || window.innerWidth;
  const h = wrap.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
}

function applyAttachmentOffsets() {
  const map = attachments[state.weaponId] || {};
  if (opticRoot && opticRoot.userData.base) {
    const off = map.holo_sight || { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0 };
    const b = opticRoot.userData.base;
    // Iron stays at base; optic attachments nudge mounted sights
    const useOff = state.optic === "iron" ? { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0 } : off;
    opticRoot.position.set(b.x + useOff.x, b.y + useOff.y, b.z + useOff.z);
    opticRoot.rotation.set(
      b.rotX + (useOff.rotX || 0),
      b.rotY + (useOff.rotY || 0),
      b.rotZ + (useOff.rotZ || 0),
      "XYZ"
    );
  }
  updateOpticVisibility();
  if (gripMesh && gripMesh.userData.base) {
    const gripKey = map.foregrip ? "foregrip" : (map.bipod ? "bipod" : null);
    const off = gripKey ? map[gripKey] : { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0 };
    const b = gripMesh.userData.base;
    gripMesh.position.set(b.x + (off.x || 0), b.y + (off.y || 0), b.z + (off.z || 0));
    gripMesh.rotation.set(b.rotX + (off.rotX || 0), b.rotY + (off.rotY || 0), b.rotZ + (off.rotZ || 0), "XYZ");
  }
}

function applyHoldToScene() {
  if (!holdRoot) return;
  const cfg = currentWeapon();
  const t = state.adsPreview ? 1 : state.adsFactor;
  const hold = blendHold(cfg, state.optic, t);
  // Authored pose only on holdRoot — sway/recoil live on swayRig child
  holdRoot.position.set(hold.x, hold.y, hold.z);
  holdRoot.rotation.set(hold.rotX, hold.rotY, hold.rotZ, "XYZ");
  applyAttachmentOffsets();
  return hold;
}

function applySwayAndRecoil(dt, moving) {
  if (!swayRig) return;
  player.swayT += dt;
  const adsT = state.adsPreview ? 1 : state.adsFactor;
  let amp = state.swayEnabled ? 1 : 0;
  // Move increases sway; ADS reduces; hold-breath damps hard
  if (moving) amp *= input.sprint ? 1.35 : 1.1;
  else amp *= 0.55;
  amp *= lerp(1, 0.35, adsT);
  if (state.holdBreath && state.breathLeft > 0) amp *= 0.08;
  // brief overshoot when breath ends
  if (player.breathRecover > 0) {
    amp *= 1 + player.breathRecover * 0.8;
    player.breathRecover = Math.max(0, player.breathRecover - dt * 1.2);
  }
  player.swayAmp = lerp(player.swayAmp, amp, 1 - Math.exp(-6 * dt));
  const a = player.swayAmp;
  const t = player.swayT;
  const sx = Math.sin(t * 1.3) * 0.0035 * a + Math.sin(t * 0.4) * 0.0015 * a;
  const sy = Math.cos(t * 1.1) * 0.0045 * a + Math.sin(t * 0.55) * 0.0012 * a;
  const sz = Math.sin(t * 0.9) * 0.002 * a;
  const rx = Math.sin(t * 1.05) * 0.012 * a;
  const ry = Math.cos(t * 0.85) * 0.01 * a;
  const rz = Math.sin(t * 0.7) * 0.008 * a;

  // Recoil decay (procedural, never baked into pose JSON)
  player.recoilPunch.multiplyScalar(Math.exp(-10 * dt));
  player.recoilRot.multiplyScalar(Math.exp(-9 * dt));

  swayRig.position.set(
    sx + player.recoilPunch.x,
    sy + player.recoilPunch.y,
    sz + player.recoilPunch.z
  );
  swayRig.rotation.set(
    rx + player.recoilRot.x,
    ry + player.recoilRot.y,
    rz + player.recoilRot.z,
    "XYZ"
  );
}

function updateHoldBreath(dt) {
  const bar = el("breathBar");
  const fill = el("breathFill");
  const want = gameplayActive() && input.holdBreath && state.breathLeft > 0;
  if (want) {
    if (!state.holdBreath) state.holdBreath = true;
    state.breathLeft = Math.max(0, state.breathLeft - dt);
    if (state.breathLeft <= 0) {
      state.holdBreath = false;
      player.breathRecover = 1;
    }
  } else {
    if (state.holdBreath) {
      state.holdBreath = false;
      if (state.breathLeft < state.breathMax * 0.95) player.breathRecover = 0.55;
    }
    // recharge when not holding
    if (!input.holdBreath) {
      state.breathLeft = Math.min(state.breathMax, state.breathLeft + dt * 0.55);
    }
  }
  if (bar && fill) {
    const show = input.holdBreath || state.breathLeft < state.breathMax - 0.05;
    bar.hidden = !show || !gameplayActive();
    const pct = state.breathLeft / state.breathMax;
    fill.style.transform = "scaleX(" + pct.toFixed(3) + ")";
    fill.style.background = pct < 0.2 ? "var(--danger)" : "var(--accent)";
  }
}

function ballisticForWeapon() {
  const base = BALLISTICS[state.weaponId] || BALLISTICS.example_smg;
  if (state.optic === "sniper_scope") {
    return {
      speed: BALLISTICS.sniper_boost.speed,
      gravity: BALLISTICS.sniper_boost.gravity,
      life: BALLISTICS.sniper_boost.life,
      tracerLen: BALLISTICS.sniper_boost.tracerLen,
    };
  }
  return base;
}

/* ---- Height-over-bore + zeroing (teaching model) ----
 * Sight ray = camera / optic aim.
 * Natural bore = muzzleSocket local −Z (barrel extends toward −Z on these block guns).
 * Zero: choose launch dir so the constant-g arc meets the sight point at zeroDist.
 * Arcade toggle: velocity = camera forward (reticle-faithful / hides HoB).
 */
const _sightO = new THREE.Vector3();
const _sightD = new THREE.Vector3();
const _muzzleO = new THREE.Vector3();
const _boreD = new THREE.Vector3();
const _launchD = new THREE.Vector3();
const _zeroPt = new THREE.Vector3();
const _tmpHob = new THREE.Vector3();
const _camUp = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camFwd = new THREE.Vector3();
const _yUp = new THREE.Vector3(0, 1, 0);

let aimRayLine = null;
let boreRayLine = null;

function getSightRay(outO, outD) {
  camera.getWorldPosition(outO);
  camera.getWorldDirection(outD);
  outD.normalize();
}

/** Barrel forward in world space (gun content −Z). */
function getBoreForward(outD) {
  outD.set(0, 0, -1).transformDirection(muzzleSocket.matrixWorld).normalize();
}

/**
 * Analytic low-arc launch direction under constant gravity (vel.y -= g each frame).
 * pos(t) = muzzle + u*v*t + (0, -0.5*g*t^2, 0). Solves ||D + (0, 0.5*g*t^2, 0)|| = v*t.
 * Falls back to geometric aim-at-target if no real positive root.
 */
function solveBallisticLaunchDir(muzzle, target, speed, gravity, outDir) {
  const Dx = target.x - muzzle.x;
  const Dy = target.y - muzzle.y;
  const Dz = target.z - muzzle.z;
  const R2 = Dx * Dx + Dy * Dy + Dz * Dz;
  const g = gravity;
  const v = speed;
  const v2 = v * v;
  const a = 0.25 * g * g;
  const b = Dy * g - v2;
  const c = R2;
  if (a < 1e-14 || !(R2 > 1e-10) || !(v > 1e-6)) {
    outDir.set(Dx, Dy, Dz).normalize();
    return false;
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) {
    outDir.set(Dx, Dy, Dz).normalize();
    return false;
  }
  const sqrtDisc = Math.sqrt(disc);
  const inv2a = 0.5 / a;
  const w1 = (-b - sqrtDisc) * inv2a;
  const w2 = (-b + sqrtDisc) * inv2a;
  let w = Infinity;
  if (w1 > 1e-8) w = Math.min(w, w1);
  if (w2 > 1e-8) w = Math.min(w, w2);
  if (!Number.isFinite(w)) {
    outDir.set(Dx, Dy, Dz).normalize();
    return false;
  }
  const t = Math.sqrt(w);
  outDir.set(Dx, Dy + 0.5 * g * t * t, Dz).multiplyScalar(1 / (v * t));
  const len = outDir.length();
  if (len < 1e-8) {
    outDir.set(Dx, Dy, Dz).normalize();
    return false;
  }
  outDir.multiplyScalar(1 / len);
  return true;
}

/** Signed HoB in meters: + = muzzle below the sight ray (classic). */
function computeHobMeters() {
  if (!muzzleSocket || !camera) return 0;
  muzzleSocket.updateWorldMatrix(true, false);
  muzzleSocket.getWorldPosition(_muzzleO);
  getSightRay(_sightO, _sightD);
  camera.matrixWorld.extractBasis(_camRight, _camUp, _camFwd);
  _tmpHob.copy(_muzzleO).sub(_sightO);
  const along = _tmpHob.dot(_sightD);
  _tmpHob.addScaledVector(_sightD, -along); // vector from ray to muzzle (perp)
  // Positive when muzzle is below sight (opposite camera-up)
  return -_tmpHob.dot(_camUp);
}

function ensureAimBoreRays() {
  if (aimRayLine && boreRayLine) return;
  const mk = (color) => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
    });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    line.visible = false;
    scene.add(line);
    return line;
  };
  aimRayLine = mk(0x5ec8ff);   // cyan-ish sight
  boreRayLine = mk(0xff9a4a); // amber bore / launch
}

function setRayEndpoints(line, a, b) {
  const pos = line.geometry.attributes.position;
  pos.setXYZ(0, a.x, a.y, a.z);
  pos.setXYZ(1, b.x, b.y, b.z);
  pos.needsUpdate = true;
  line.geometry.computeBoundingSphere();
}

function updateAimBoreRays() {
  if (!state.showAimRays || !muzzleSocket || !camera || !scene) {
    if (aimRayLine) aimRayLine.visible = false;
    if (boreRayLine) boreRayLine.visible = false;
    return;
  }
  ensureAimBoreRays();
  muzzleSocket.updateWorldMatrix(true, false);
  muzzleSocket.getWorldPosition(_muzzleO);
  getSightRay(_sightO, _sightD);
  getBoreForward(_boreD);

  const Z = Math.max(5, state.zeroDist || 100);
  // Sight: camera → zero point
  _zeroPt.copy(_sightO).addScaledVector(_sightD, Z);
  setRayEndpoints(aimRayLine, _sightO, _zeroPt);
  aimRayLine.visible = true;

  // Bore/launch: muzzle → along fire dir for length Z (or camera dir in Arcade)
  if (state.hobZero) {
    const bal = ballisticForWeapon();
    solveBallisticLaunchDir(_muzzleO, _zeroPt, bal.speed, bal.gravity, _launchD);
  } else {
    _launchD.copy(_sightD);
  }
  _tmpHob.copy(_muzzleO).addScaledVector(_launchD, Z);
  setRayEndpoints(boreRayLine, _muzzleO, _tmpHob);
  boreRayLine.visible = true;
}

function updateHobReadout() {
  const node = el("hobReadout");
  if (!node) return;
  const hobM = computeHobMeters();
  const cm = hobM * 100;
  const mode = state.hobZero ? "Sim" : "Arcade";
  node.textContent = `HoB ${cm >= 0 ? "+" : ""}${cm.toFixed(1)} cm · ${mode} · Z=${state.zeroDist} m`;
}

/** Apply Arcade vs Sim theme + hobZero. Sim = true, Arcade = false. */
function setGameStyle(sim, { toast = true } = {}) {
  state.hobZero = !!sim;
  const style = state.hobZero ? "sim" : "arcade";
  document.body.setAttribute("data-game-style", style);

  const badge = el("gameStyleBadge");
  if (badge) badge.textContent = state.hobZero ? "SIM" : "ARCADE";

  const btnSim = el("btnGameSim");
  const btnArcade = el("btnGameArcade");
  if (btnSim) btnSim.setAttribute("aria-pressed", state.hobZero ? "true" : "false");
  if (btnArcade) btnArcade.setAttribute("aria-pressed", state.hobZero ? "false" : "true");

  const sSim = el("btnSettingsSim");
  const sArcade = el("btnSettingsArcade");
  if (sSim) sSim.setAttribute("aria-pressed", state.hobZero ? "true" : "false");
  if (sArcade) sArcade.setAttribute("aria-pressed", state.hobZero ? "false" : "true");

  const bar = el("ballisticsBar");
  if (bar) bar.classList.toggle("arcade-dim", !state.hobZero);
  const hint = el("arcadeZeroHint");
  if (hint) hint.hidden = !!state.hobZero;
  const sHint = el("settingsArcadeZeroHint");
  if (sHint) sHint.hidden = !!state.hobZero;

  updateHobReadout();
  updateAimBoreRays();
  if (toast) {
    showToast(
      state.hobZero
        ? "Sim: HoB + ballistic zero"
        : "Arcade: reticle-faithful aim"
    );
  }
}

function toggleGameStyle() {
  setGameStyle(!state.hobZero);
}

function fireLaunchDirection(muzzlePos, outDir) {
  if (!state.hobZero) {
    camera.getWorldDirection(outDir);
    outDir.normalize();
    return;
  }
  getSightRay(_sightO, _sightD);
  _zeroPt.copy(_sightO).addScaledVector(_sightD, Math.max(1, state.zeroDist || 100));
  const bal = ballisticForWeapon();
  solveBallisticLaunchDir(muzzlePos, _zeroPt, bal.speed, bal.gravity, outDir);
}

function fireWeapon() {
  if (!gameplayActive()) return;
  if (player.fireCooldown > 0) return;
  if (state.lookPickup) {
    tryEquipLooked();
    return;
  }
  sfx.resume();
  sfx.play("fire");
  player.fireCooldown = state.optic === "sniper_scope" ? 0.35 : 0.12;
  fireFlash();
  // Recoil punch on swayRig (not authored hold)
  const kick = state.optic === "sniper_scope" ? 1.6 : (state.weaponId === "example_rifle" ? 1.15 : 1);
  player.recoilPunch.z += 0.018 * kick;
  player.recoilPunch.y += 0.006 * kick;
  player.recoilRot.x -= 0.035 * kick;
  player.recoilRot.y += (Math.random() - 0.5) * 0.02 * kick;

  // Sim (hobZero): spawn at muzzle, launch so arc meets sight at Z.
  // Arcade: spawn at muzzle, initial dir = camera aim (reticle-faithful).
  if (!muzzleSocket || !camera) return;
  muzzleSocket.updateWorldMatrix(true, false);
  const origin = new THREE.Vector3();
  muzzleSocket.getWorldPosition(origin);
  const dir = new THREE.Vector3();
  fireLaunchDirection(origin, dir);
  const bal = ballisticForWeapon();
  const vel = dir.clone().multiplyScalar(bal.speed);

  const geo = new THREE.CylinderGeometry(0.007, 0.007, bal.tracerLen, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe08a });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  mesh.position.copy(origin).addScaledVector(dir, 0.28);
  scene.add(mesh);
  tracers.push({ mesh, vel, gravity: bal.gravity, life: bal.life, hit: false, prev: mesh.position.clone() });
}

function updateTracers(dt) {
  const now = performance.now();
  rangeTargets.forEach((t) => {
    if (t.flash) {
      if (now < t.hitUntil) t.flash.material.opacity = 1;
      else t.flash.material.opacity = Math.max(0, t.flash.material.opacity - dt * 3);
    }
  });

  for (let i = tracers.length - 1; i >= 0; i--) {
    const tr = tracers[i];
    tr.life -= dt;
    // Save position before integrate, then move, then disk-plane hit test
    const prev = tr.mesh.position.clone();
    // Simple ballistic: vel.y -= g*dt; pos += vel*dt
    tr.vel.y -= tr.gravity * dt;
    tr.mesh.position.addScaledVector(tr.vel, dt);
    const speed = tr.vel.length();
    if (speed > 1e-4) {
      tr.mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        tr.vel.clone().normalize()
      );
    }

    // First hit along segment: circular bullseyes + silhouette zones
    if (!tr.hit) {
      let best = null;
      for (const t of rangeTargets) {
        const info = hitTargetDiskInfo(prev, tr.mesh.position, t);
        if (info && (!best || info.u < best.u)) {
          best = { kind: "circle", target: t, hit: info.hit, u: info.u };
        }
      }
      for (const sil of silhouetteTargets) {
        for (const zone of sil.zones) {
          if (!zoneActive(sil, zone.id)) continue;
          const info = hitTargetDiskInfo(prev, tr.mesh.position, zone);
          if (info && (!best || info.u < best.u)) {
            best = { kind: "sil", sil, zone, hit: info.hit, u: info.u };
          }
        }
      }
      if (best) {
        tr.hit = true;
        tr.life = Math.min(tr.life, 0.02);
        if (best.kind === "circle") flashTarget(best.target, best.hit);
        else flashSilhouetteZone(best.sil, best.zone, best.hit);
      }
    }
    if (tr.prev) tr.prev.copy(tr.mesh.position);
    else tr.prev = tr.mesh.position.clone();

    if (tr.life <= 0 || tr.mesh.position.y < -2.5) {
      if (!tr.hit) sfx.play("miss");
      scene.remove(tr.mesh);
      tr.mesh.geometry.dispose();
      tr.mesh.material.dispose();
      tracers.splice(i, 1);
    }
  }
}

function updatePlayer(dt) {
  // ADS factor spring (RMB hold) — also syncs slider via refresh path
  if (!state.adsPreview) {
    const adsSpeed = 8;
    state.adsTarget = input.ads ? 1 : 0;
    state.adsFactor = lerp(state.adsFactor, state.adsTarget, 1 - Math.exp(-adsSpeed * dt));
    if (Math.abs(state.adsFactor - state.adsTarget) < 0.001) state.adsFactor = state.adsTarget;
  } else {
    state.adsFactor = 1;
  }

  // Lean spring toward ±leanMax while Q/E held
  if (input.leanLeft && !input.leanRight) player.leanTarget = player.leanMax;
  else if (input.leanRight && !input.leanLeft) player.leanTarget = -player.leanMax;
  else player.leanTarget = 0;
  player.leanAngle = lerp(player.leanAngle, player.leanTarget, 1 - Math.exp(-player.leanSpring * dt));

  // Crouch (Z hold or C toggle) — sticky toggle survives unlock; no Ctrl (browser steals it)
  const crouching = input.crouchHold || state.crouchToggled;
  const eyeTarget = player.eyeHeight * (crouching ? player.crouchEyeMul : 1);
  player.eyeCurrent = lerp(player.eyeCurrent, eyeTarget, 1 - Math.exp(-12 * dt));
  if (Math.abs(player.eyeCurrent - eyeTarget) < 0.0005) player.eyeCurrent = eyeTarget;
  // Keep pos.y as standing reference; root uses lerped eye before bob
  player.pos.y = player.eyeHeight;

  // Movement on XZ
  let mx = 0, mz = 0;
  if (gameplayActive()) {
    if (input.forward) mz -= 1;
    if (input.back) mz += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
  }
  const moving = Math.abs(mx) + Math.abs(mz) > 0;
  const sprinting = input.sprint && !crouching;
  if (moving) {
    const len = Math.hypot(mx, mz) || 1;
    mx /= len; mz /= len;
    let speed = player.moveSpeed;
    if (crouching) speed *= player.crouchSpeedMul;
    else if (sprinting) speed *= player.sprintMul;
    const cy = Math.cos(player.yaw), sy = Math.sin(player.yaw);
    // yaw 0 looks down -Z
    player.pos.x += (mx * cy + mz * sy) * speed * dt;
    player.pos.z += (-mx * sy + mz * cy) * speed * dt;
    player.pos.x = clamp(player.pos.x, -10, 10);
    player.pos.z = clamp(player.pos.z, -410, 4);
  }

  // View bob
  const bobAmp = moving ? (sprinting ? 0.025 : 0.014) : 0;
  player.bobPhase += dt * (moving ? (sprinting ? 12 : 8) : 0);
  const bobY = Math.sin(player.bobPhase) * bobAmp;
  const bobX = Math.cos(player.bobPhase * 0.5) * bobAmp * 0.5;

  // FOV lerp toward optic-specific ADS FOV (hip 90 / iron·holo 60 / acog 25 / sniper 10)
  player.fovAds = adsFovForOptic(state.optic);
  const fovTarget = lerp(player.fovHip, player.fovAds, state.adsPreview ? 1 : state.adsFactor);
  player.fov = lerp(player.fov, fovTarget, 1 - Math.exp(-10 * dt));
  if (Math.abs(camera.fov - player.fov) > 0.01) {
    camera.fov = player.fov;
    camera.updateProjectionMatrix();
  }
  syncOpticHud();

  // Apply yaw/pitch on playerRoot / camera (eyeCurrent = standing/crouch base before bob)
  playerRoot.position.set(player.pos.x + bobX, player.eyeCurrent + bobY, player.pos.z);
  playerRoot.rotation.order = "YXZ";
  playerRoot.rotation.y = player.yaw;
  playerRoot.rotation.x = 0;
  playerRoot.rotation.z = 0;
  camera.rotation.order = "YXZ";
  camera.rotation.x = player.pitch;
  camera.rotation.y = 0;

  // Lean: lerp roll + lateral offset along flat right
  const leanZ = lerp(leanPivot.rotation.z, player.leanAngle, player.leanLerp);
  leanPivot.rotation.z = leanZ;
  // light strafe tilt
  // Strafe tilt only — tiny roll from lateral move (<< Q/E lean). Cap ~0.4% of leanMax — barely noticeable.
  const lateral = gameplayActive() ? (Number(input.left) - Number(input.right)) : 0;
  const strafeTarget = lateral * player.leanMax * 0.002;
  player.strafeTilt = lerp(player.strafeTilt || 0, strafeTarget, 1 - Math.exp(-10 * dt));
  leanPivot.rotation.z = leanZ + player.strafeTilt;

  const leanRatio = leanZ / player.leanMax;
  // flat right from yaw (world XZ)
  const rightX = Math.cos(player.yaw);
  const rightZ = -Math.sin(player.yaw);
  leanPivot.position.x = -leanRatio * player.leanOffset * rightX;
  leanPivot.position.z = -leanRatio * player.leanOffset * rightZ;
  // Keep lean offset in camera-local space instead — leanPivot is child of playerRoot
  // so offset should be local +X (right)
  leanPivot.position.set(-leanRatio * player.leanOffset, 0, 0);

  // Muzzle flash
  if (muzzleFlash) {
    const on = performance.now() < player.flashUntil;
    muzzleFlash.visible = on;
    if (on) muzzleFlash.rotation.z += dt * 20;
  }

  if (player.fireCooldown > 0) player.fireCooldown -= dt;

  updateHoldBreath(dt);
  updatePickupHover();
  syncAdsSlider();
  applyHoldToScene();
  applySwayAndRecoil(dt, moving);
  updateAimBoreRays();
  updateHobReadout();
  updateTracers(dt);
  updateSilhouettes(dt);
  updateScorePopups(dt);
}

function syncAdsSlider() {
  const t = state.adsPreview ? 1 : state.adsFactor;
  const slider = el("adsFactor");
  const val = el("adsFactorVal");
  if (slider && document.activeElement !== slider) slider.value = String(t);
  if (val) val.textContent = t.toFixed(2);
  el("btnAds").setAttribute("aria-pressed", state.adsPreview ? "true" : "false");
  const swayBtn = el("btnSway");
  if (swayBtn) swayBtn.setAttribute("aria-pressed", state.swayEnabled ? "true" : "false");
}

function updatePickupHover() {
  state.lookPickup = null;
  if (!pickups.length || !camera) return;
  _raycaster.setFromCamera(_ndc, camera);
  const hits = _raycaster.intersectObjects(pickups, true);
  let found = null;
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.opticId) o = o.parent;
    if (o && o.userData.opticId) {
      // proximity: also require near table
      const dx = o.position.x - player.pos.x;
      const dz = o.position.z - player.pos.z;
      if (Math.hypot(dx, dz) < 2.8) {
        found = o;
        break;
      }
    }
  }
  pickups.forEach((p) => {
    const hl = p.userData.highlight;
    const active = found === p;
    if (hl) hl.material.opacity = active ? 0.55 : 0.0;
    p.position.y = p.userData.baseY + (active ? 0.02 : 0);
    p.rotation.y += active ? 0.02 : 0.005;
  });
  state.lookPickup = found;
  updateEquipPrompt();
}

function updateEquipPrompt() {
  const prompt = el("equipPrompt");
  if (!prompt) return;
  if (state.lookPickup && gameplayActive()) {
    const id = state.lookPickup.userData.opticId;
    const label = state.lookPickup.userData.label;
    const equipped = state.optic === id;
    prompt.hidden = false;
    prompt.textContent = equipped
      ? `Looking at ${label} (equipped)`
      : `[E] Equip ${label}  ·  click to equip`;
  } else {
    prompt.hidden = true;
  }
}

function syncOpticHud() {
  const hud = el("opticHud");
  const hipXh = el("hipCrosshair");
  const vig = el("opticVignette");
  const tube = el("opticTubeFrame");
  const holo = el("reticleHolo");
  const acog = el("reticleAcog");
  const sniper = el("reticleSniper");
  if (!hud) return;
  const t = state.adsPreview ? 1 : state.adsFactor;
  const adsOn = t > 0.12;
  const optic = state.optic;
  // Screen-space reticle is primary for glass optics; iron uses 3D posts
  const showOverlay = adsOn && optic !== "iron";
  hud.hidden = !showOverlay;
  hud.setAttribute("aria-hidden", showOverlay ? "false" : "true");
  hud.classList.toggle("active", showOverlay);
  const fade = showOverlay ? clamp((t - 0.12) / 0.55, 0, 1) : 0;
  hud.style.opacity = String(fade);
  if (hipXh) {
    hipXh.classList.toggle("ads-hide", adsOn);
    hipXh.classList.toggle("hip-hide", !state.showHipReticle);
  }
  if (holo) holo.hidden = !(showOverlay && optic === "holo");
  if (acog) acog.hidden = !(showOverlay && optic === "acog");
  if (sniper) sniper.hidden = !(showOverlay && optic === "sniper_scope");
  if (vig) {
    vig.classList.remove("heavy", "medium");
    if (showOverlay && optic === "sniper_scope") vig.classList.add("heavy");
    else if (showOverlay && optic === "acog") vig.classList.add("medium");
  }
  if (tube) {
    const tubeOn = showOverlay && (optic === "acog" || optic === "sniper_scope" || optic === "holo");
    tube.classList.toggle("show", tubeOn);
    if (optic === "holo") tube.style.opacity = String(0.28 * fade);
    else if (optic === "acog") tube.style.opacity = String(0.75 * fade);
    else if (optic === "sniper_scope") tube.style.opacity = String(0.9 * fade);
    else tube.style.opacity = "0";
  }
}

function updateHudHint() {
  const hint = el("hudHint");
  if (!hint) return;
  if (state.settingsOpen) {
    hint.innerHTML = `Settings open — <kbd>O</kbd> / Esc close · <kbd>B</kbd> Arcade/Sim`;
  } else if (state.panelOpen) {
    hint.innerHTML = `Debugger open — <kbd>\`</kbd> close · <kbd>G</kbd> guns · <kbd>O</kbd> settings`;
  } else {
    hint.innerHTML = `<kbd>\`</kbd> Debugger · <kbd>O</kbd> Settings · <kbd>C</kbd> crouch · <kbd>Z</kbd> hold crouch · WASD · mouse look · <kbd>Q</kbd>/<kbd>E</kbd> lean · RMB ADS · <kbd>Space</kbd> breath · LMB fire`;
  }
}

function tryEquipLooked() {
  if (!state.lookPickup) return;
  setOptic(state.lookPickup.userData.opticId);
}

function fireFlash() {
  player.flashUntil = performance.now() + 60;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  updatePlayer(dt);
  renderer.render(scene, camera);
}

function refresh(syncInputs = true) {
  const cfg = currentWeapon();
  const t = state.adsPreview ? 1 : state.adsFactor;
  syncAdsSlider();

  buildAxesOnce("viewAxes", "view");
  buildAxesOnce("attAxes", "att");
  if (syncInputs) {
    syncAxisInputsFromPose(true);
    syncAxisInputsFromPose(false);
  } else {
    updateAxisSelection();
  }

  const hold = applyHoldToScene() || blendHold(cfg, state.optic, t);
  el("holdPreview").textContent = JSON.stringify(
    hold,
    (k, v) => (typeof v === "number" ? Number(fmt(v)) : v),
    2
  );
  el("attPreview").textContent = JSON.stringify(currentAttPose(), null, 2);
  const opticSel = el("opticSelect");
  if (opticSel && opticSel.value !== state.optic) opticSel.value = state.optic;
}

function onKeyDown(e) {
  if (typingFocus()) return;

  const k = e.key;
  const code = e.code;

  // Settings: O toggles globally; Esc closes (before other UI)
  if ((k === "o" || k === "O") && !e.repeat) {
    toggleSettings();
    e.preventDefault();
    return;
  }
  if (state.settingsOpen) {
    if (k === "Escape") {
      setSettingsOpen(false);
      e.preventDefault();
    }
    if ((k === "b" || k === "B") && !e.repeat) {
      toggleGameStyle();
      e.preventDefault();
    }
    return;
  }

  if (state.gunModalOpen) {
    if (k === "Escape") { setGunModal(false); e.preventDefault(); }
    return;
  }

  // Always allow Backquote / G / Esc
  if (code === "Backquote" || k === "`") {
    togglePanel();
    e.preventDefault();
    return;
  }
  if (k === "g" || k === "G") {
    setGunModal(true);
    e.preventDefault();
    return;
  }
  if (k === "Escape") {
    if (document.pointerLockElement) document.exitPointerLock();
    else if (state.panelOpen) setPanelOpen(false);
    e.preventDefault();
    return;
  }

  // Gameplay movement / lean / crouch — only when panel closed
  if (gameplayActive()) {
    if (code === "KeyW") input.forward = true;
    if (code === "KeyS") input.back = true;
    if (code === "KeyA") input.left = true;
    if (code === "KeyD") input.right = true;
    if (code === "ShiftLeft" || code === "ShiftRight") input.sprint = true;
    if (code === "KeyZ") {
      input.crouchHold = true;
      e.preventDefault();
    }
    if ((k === "c" || k === "C") && !e.repeat) {
      state.crouchToggled = !state.crouchToggled;
      e.preventDefault();
    }
    if (code === "KeyQ") input.leanLeft = true;
    if (code === "KeyE") {
      input.leanRight = true;
      if (state.lookPickup && !e.repeat) tryEquipLooked();
    }
    if (k === " " || code === "Space") {
      input.holdBreath = true;
      e.preventDefault();
    }
    if (k === "f" || k === "F") {
      if (state.lookPickup) tryEquipLooked();
    }
    if ((k === "r" || k === "R") && !e.repeat) {
      resetSilhouettes();
      e.preventDefault();
    }
    if ((k === "-" || code === "Minus") && !e.repeat) {
      cycleZeroDist(-1);
      e.preventDefault();
    }
    if ((k === "=" || code === "Equal") && !e.repeat) {
      cycleZeroDist(1);
      e.preventDefault();
    }
    if ((k === "b" || k === "B") && !e.repeat) {
      toggleGameStyle();
      e.preventDefault();
    }
  }

  // Debugger hotkeys when panel open
  if (state.panelOpen) {
    switch (k) {
      case "Insert":
        state.adsPreview = !state.adsPreview;
        if (state.adsPreview) state.adsFactor = 1;
        refresh();
        e.preventDefault();
        break;
      case "End":
        if (state.mode === "weapon") cyclePose(1);
        e.preventDefault();
        break;
      case "ArrowUp":
        if (state.mode === "weapon") state.selectedAxis = (state.selectedAxis + 5) % 6;
        else state.attSelectedAxis = (state.attSelectedAxis + 5) % 6;
        updateAxisSelection();
        e.preventDefault();
        break;
      case "ArrowDown":
        if (state.mode === "weapon") state.selectedAxis = (state.selectedAxis + 1) % 6;
        else state.attSelectedAxis = (state.attSelectedAxis + 1) % 6;
        updateAxisSelection();
        e.preventDefault();
        break;
      case "ArrowLeft":
        nudgeSelected(-1);
        e.preventDefault();
        break;
      case "ArrowRight":
        nudgeSelected(1);
        e.preventDefault();
        break;
      case "PageUp":
        cycleStep(state.mode === "weapon" ? "weapon" : "att", -1);
        e.preventDefault();
        break;
      case "PageDown":
        cycleStep(state.mode === "weapon" ? "weapon" : "att", 1);
        e.preventDefault();
        break;
      default:
        break;
    }
  } else {
    // Insert ADS preview still useful in gameplay
    if (k === "Insert") {
      state.adsPreview = !state.adsPreview;
      if (state.adsPreview) state.adsFactor = 1;
      refresh();
      e.preventDefault();
    }
  }
}

function onKeyUp(e) {
  const code = e.code;
  if (code === "KeyW") input.forward = false;
  if (code === "KeyS") input.back = false;
  if (code === "KeyA") input.left = false;
  if (code === "KeyD") input.right = false;
  if (code === "ShiftLeft" || code === "ShiftRight") input.sprint = false;
  if (code === "KeyZ") input.crouchHold = false;
  if (code === "KeyQ") input.leanLeft = false;
  if (code === "KeyE") input.leanRight = false;
  if (code === "Space") input.holdBreath = false;
}

function onMouseDown(e) {
  const canvas = el("view3d");
  if (e.target !== canvas && !canvas.contains(e.target)) {
    // allow UI
  }
  if (!gameplayActive()) return;

  if (e.button === 2) {
    input.ads = true;
    state.adsPreview = false;
    e.preventDefault();
    return;
  }
  if (e.button === 0) {
    if (!document.pointerLockElement) {
      canvas.requestPointerLock();
      return;
    }
    fireWeapon();
  }
}

function onMouseUp(e) {
  if (e.button === 2) {
    input.ads = false;
    e.preventDefault();
  }
}

function onMouseMove(e) {
  if (!document.pointerLockElement) return;
  if (!gameplayActive()) return;
  // FOV-matched ADS look: angular sens scales with zoom so far targets stay controllable.
  // adsMul ≈ effectiveFov/fovHip (iron·holo ~0.67, acog ~0.28, sniper ~0.11), then
  // player.adsLookMul (global) × ADS_LOOK_MUL[optic] (per-optic fine-tune, default 1).
  const adsT = state.adsPreview ? 1 : state.adsFactor;
  const effectiveFov = lerp(player.fovHip, adsFovForOptic(state.optic), adsT);
  let adsMul = (effectiveFov / player.fovHip) * player.adsLookMul;
  const opticMul = ADS_LOOK_MUL[state.optic] ?? 1;
  adsMul *= lerp(1, opticMul, adsT);
  if (state.holdBreath && state.breathLeft > 0) adsMul *= 0.65;
  const sens = player.lookSens * adsMul;
  player.yaw -= e.movementX * sens;
  player.pitch -= e.movementY * sens;
  player.pitch = clamp(player.pitch, -1.2, 1.2);
}

function bindPointerLock() {
  const canvas = el("view3d");
  canvas.addEventListener("click", () => {
    if (gameplayActive() && !document.pointerLockElement) { sfx.resume(); canvas.requestPointerLock(); }
  });
  document.addEventListener("pointerlockchange", () => {
    if (!document.pointerLockElement) {
      input.ads = false;
      input.leanLeft = input.leanRight = false;
      input.holdBreath = false;
      input.crouchHold = false;
    }
  });
}

function bind() {
  buildWeaponSelect();
  buildPoseSelect();
  buildAttSelect();
  buildAxesOnce("viewAxes", "view");
  buildAxesOnce("attAxes", "att");

  el("tab-view").onclick = () => setTab("weapon");
  el("tab-att").onclick = () => setTab("attachment");
  el("weaponSelect").onchange = (e) => { equipWeapon(e.target.value); };
  el("poseSelect").onchange = (e) => {
    state.poseKey = e.target.value;
    syncAxisInputsFromPose(true);
    refresh();
  };
  el("opticSelect").onchange = (e) => { setOptic(e.target.value); };
  el("stepSelect").onchange = (e) => { state.step = e.target.value; };
  el("attStepSelect").onchange = (e) => { state.attStep = e.target.value; };
  el("attSelect").onchange = (e) => {
    state.attachmentId = e.target.value;
    syncAxisInputsFromPose(false);
    refresh();
  };
  el("adsFactor").oninput = (e) => {
    state.adsPreview = false;
    state.adsFactor = parseFloat(e.target.value);
    state.adsTarget = state.adsFactor;
    refresh(false);
  };
  el("btnAds").onclick = () => {
    state.adsPreview = !state.adsPreview;
    if (state.adsPreview) state.adsFactor = 1;
    refresh();
  };
  const swayBtn = el("btnSway");
  if (swayBtn) {
    swayBtn.onclick = () => {
      state.swayEnabled = !state.swayEnabled;
      swayBtn.setAttribute("aria-pressed", state.swayEnabled ? "true" : "false");
      showToast(state.swayEnabled ? "Sway ON" : "Sway OFF (clean tuning)");
    };
  }
  const zeroSel = el("zeroDistSelect");
  if (zeroSel) {
    zeroSel.value = String(state.zeroDist);
    zeroSel.onchange = (e) => setZeroDist(e.target.value);
  }
  const btnSim = el("btnGameSim");
  const btnArcade = el("btnGameArcade");
  if (btnSim) btnSim.onclick = () => setGameStyle(true);
  if (btnArcade) btnArcade.onclick = () => setGameStyle(false);
  setGameStyle(state.hobZero, { toast: false });
  syncHipReticle();
  const raysBtn = el("btnAimRays");
  if (raysBtn) {
    raysBtn.setAttribute("aria-pressed", state.showAimRays ? "true" : "false");
    raysBtn.onclick = () => setAimRays(!state.showAimRays);
  }
  el("btnCopy").onclick = () => copyWeaponJson();
  el("btnCopyAtt").onclick = () => copyAttJson();
  el("btnCloseDbg").onclick = () => setPanelOpen(false);
  el("btnGuns").onclick = () => setGunModal(true);
  const btnSettings = el("btnSettings");
  if (btnSettings) btnSettings.onclick = () => setSettingsOpen(true);
  el("btnGunCancel").onclick = () => setGunModal(false);
  el("btnGunEquip").onclick = () => {
    const id = state.gunPickId;
    setGunModal(false);
    equipWeapon(id);
  };
  el("gunModal").addEventListener("click", (e) => {
    if (e.target === el("gunModal")) setGunModal(false);
  });

  // Settings overlay controls
  const btnSettingsClose = el("btnSettingsClose");
  if (btnSettingsClose) btnSettingsClose.onclick = () => setSettingsOpen(false);
  const settingsModal = el("settingsModal");
  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) setSettingsOpen(false);
    });
  }
  const btnSettingsSim = el("btnSettingsSim");
  const btnSettingsArcade = el("btnSettingsArcade");
  if (btnSettingsSim) btnSettingsSim.onclick = () => setGameStyle(true);
  if (btnSettingsArcade) btnSettingsArcade.onclick = () => setGameStyle(false);
  const chkHip = el("chkHipReticle");
  if (chkHip) {
    chkHip.checked = state.showHipReticle;
    chkHip.onchange = (e) => setHipReticle(e.target.checked, { toast: true });
  }
  const chkRays = el("chkAimRays");
  if (chkRays) {
    chkRays.checked = state.showAimRays;
    chkRays.onchange = (e) => setAimRays(e.target.checked);
  }
  const settingsZero = el("settingsZeroDist");
  if (settingsZero) {
    settingsZero.value = String(state.zeroDist);
    settingsZero.onchange = (e) => setZeroDist(e.target.value, { toast: true });
  }
  const lookSlider = el("lookSensSlider");
  if (lookSlider) {
    lookSlider.oninput = (e) => {
      const pct = parseFloat(e.target.value) || 100;
      player.lookSens = LOOK_SENS_BASE * (pct / 100);
      const lookVal = el("lookSensVal");
      if (lookVal) lookVal.textContent = `${Math.round(pct)}%`;
    };
  }
  const adsMulSlider = el("adsLookMulSlider");
  if (adsMulSlider) {
    adsMulSlider.oninput = (e) => {
      const pct = parseFloat(e.target.value) || 100;
      player.adsLookMul = ADS_LOOK_MUL_BASE * (pct / 100);
      const adsVal = el("adsLookMulVal");
      if (adsVal) adsVal.textContent = `${player.adsLookMul.toFixed(2)}×`;
    };
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("contextmenu", (e) => {
    if (gameplayActive()) e.preventDefault();
  });
  window.addEventListener("blur", clearInputFlags);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearInputFlags();
  });

  bindPointerLock();
  setTab("weapon");
  setPanelOpen(false);
  updateHudHint();
  initThree();
  refresh();
}

bind();
