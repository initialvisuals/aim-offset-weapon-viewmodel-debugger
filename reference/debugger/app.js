/**
 * Reference tuner state machine — rebuild this in your engine.
 * Modes: weapon (view) | attachment
 * Shared: six axis rows, step ladder, nudge, JSON export
 */

const PI_2 = Math.PI / 2;
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

function emptyPose() {
  return { x: 0, y: 0, z: 0, rotX: 0, rotY: PI_2, rotZ: 0 };
}

/** Demo content — replace with your registry load. */
const db = {
  example_smg: {
    schema_version: 1,
    weapon: "example_smg",
    hip: { x: 0.1043, y: -0.1688, z: -0.1953, rotX: 0.0165, rotY: PI_2, rotZ: 0 },
    ads: { x: 0.0084, y: -0.1343, z: -0.1887, rotX: 0, rotY: PI_2, rotZ: 0 },
    ads_holo: { x: 0.0082, y: -0.1478, z: -0.1335, rotX: 0.0115, rotY: PI_2, rotZ: 0 },
    ads_acog: { x: 0.0083, y: -0.15, z: -0.0724, rotX: 0.014, rotY: PI_2, rotZ: -0.003 },
  },
  example_rifle: {
    schema_version: 1,
    weapon: "example_rifle",
    hip: { x: 0.12, y: -0.18, z: -0.22, rotX: 0.02, rotY: PI_2, rotZ: 0 },
    ads: { x: 0.01, y: -0.14, z: -0.2, rotX: 0, rotY: PI_2, rotZ: 0 },
    ads_sniper_scope: { x: 0.006, y: -0.155, z: -0.05, rotX: 0.01, rotY: PI_2, rotZ: 0 },
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

const state = {
  mode: "weapon", // weapon | attachment
  weaponId: "example_smg",
  poseKey: "hip",
  optic: "iron",
  step: "fine",
  attStep: "fine",
  adsPreview: false,
  adsFactor: 0,
  selectedAxis: 0,
  attSelectedAxis: 0,
  attachmentId: "holo_sight",
};

function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function resolve(p) {
  return {
    x: p.x, y: p.y, z: p.z,
    rotX: p.rotX ?? 0, rotY: p.rotY ?? PI_2, rotZ: p.rotZ ?? 0,
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

function renderAxes(containerId, pose, selectedIndex, onChange) {
  const root = el(containerId);
  root.innerHTML = "";
  AXIS_DEFS.forEach((axis, i) => {
    const row = document.createElement("div");
    row.className = "axis" + (i === selectedIndex ? " selected" : "");
    row.dataset.index = String(i);
    const val = pose[axis.id] ?? (axis.kind === "rot" && axis.id === "rotY" ? PI_2 : 0);
    row.innerHTML = `
      <span class="name">${axis.label}</span>
      <input type="number" step="any" value="${val}" data-axis="${axis.id}" />
      <div class="nudge">
        <button type="button" data-sign="-1">−</button>
        <button type="button" data-sign="1">+</button>
      </div>
    `;
    row.addEventListener("click", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
      onChange({ type: "select", index: i });
    });
    row.querySelector("input").addEventListener("change", (e) => {
      onChange({ type: "set", axis: axis.id, value: parseFloat(e.target.value) });
    });
    row.querySelectorAll("button[data-sign]").forEach((btn) => {
      btn.addEventListener("click", () => {
        onChange({ type: "nudge", axis: axis.id, sign: Number(btn.dataset.sign), index: i });
      });
    });
    root.appendChild(row);
  });
}

function fmt(n) { return (Math.round(n * 1e6) / 1e6).toString(); }

function refresh() {
  const cfg = currentWeapon();
  const t = state.adsPreview ? 1 : state.adsFactor;
  el("adsFactor").value = String(t);
  el("adsFactorVal").textContent = t.toFixed(2);
  el("btnAds").setAttribute("aria-pressed", state.adsPreview ? "true" : "false");

  renderAxes("viewAxes", currentViewPose(), state.selectedAxis, (msg) => {
    if (msg.type === "select") { state.selectedAxis = msg.index; refresh(); return; }
    const pose = currentViewPose();
    const axis = AXIS_DEFS.find((a) => a.id === msg.axis) || AXIS_DEFS[msg.index];
    if (msg.type === "set") pose[msg.axis] = msg.value;
    if (msg.type === "nudge") {
      state.selectedAxis = msg.index;
      const delta = axis.kind === "rot" ? ROT_STEPS[state.step] : POS_STEPS[state.step];
      pose[msg.axis] = (pose[msg.axis] ?? 0) + msg.sign * delta;
    }
    refresh();
  });

  const hold = blendHold(cfg, state.optic, t);
  el("holdPreview").textContent = JSON.stringify(hold, (k, v) => (typeof v === "number" ? Number(fmt(v)) : v), 2);

  renderAxes("attAxes", currentAttPose(), state.attSelectedAxis, (msg) => {
    if (msg.type === "select") { state.attSelectedAxis = msg.index; refresh(); return; }
    const pose = currentAttPose();
    const axis = AXIS_DEFS.find((a) => a.id === msg.axis) || AXIS_DEFS[msg.index];
    if (msg.type === "set") pose[msg.axis] = msg.value;
    if (msg.type === "nudge") {
      state.attSelectedAxis = msg.index;
      const delta = axis.kind === "rot" ? ROT_STEPS[state.attStep] : POS_STEPS[state.attStep];
      pose[msg.axis] = (pose[msg.axis] ?? 0) + msg.sign * delta;
    }
    refresh();
  });
  el("attPreview").textContent = JSON.stringify(currentAttPose(), null, 2);
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

function copyWeaponJson() {
  const cfg = { ...currentWeapon() };
  const text = JSON.stringify(cfg, null, 2);
  navigator.clipboard.writeText(text);
}
function copyAttJson() {
  const payload = {
    schema_version: 1,
    weapon: state.weaponId,
    attachment: state.attachmentId,
    offset: currentAttPose(),
  };
  navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
}

function cyclePose(dir) {
  const i = POSE_KEYS.indexOf(state.poseKey);
  state.poseKey = POSE_KEYS[(i + dir + POSE_KEYS.length) % POSE_KEYS.length];
  el("poseSelect").value = state.poseKey;
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

function nudgeSelected(sign) {
  const weaponMode = state.mode === "weapon";
  const axisIndex = weaponMode ? state.selectedAxis : state.attSelectedAxis;
  const axis = AXIS_DEFS[axisIndex];
  const step = weaponMode ? state.step : state.attStep;
  const delta = axis.kind === "rot" ? ROT_STEPS[step] : POS_STEPS[step];
  const pose = weaponMode ? currentViewPose() : currentAttPose();
  pose[axis.id] = (pose[axis.id] ?? 0) + sign * delta;
  refresh();
}

function onKey(e) {
  if (e.target.matches("input, select, textarea")) return;
  switch (e.key) {
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
      refresh();
      e.preventDefault();
      break;
    case "ArrowDown":
      if (state.mode === "weapon") state.selectedAxis = (state.selectedAxis + 1) % 6;
      else state.attSelectedAxis = (state.attSelectedAxis + 1) % 6;
      refresh();
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
    case "c":
    case "C":
      if (state.mode === "weapon") copyWeaponJson();
      else copyAttJson();
      e.preventDefault();
      break;
    default:
      break;
  }
}

function bind() {
  buildWeaponSelect();
  buildPoseSelect();
  buildAttSelect();
  el("tab-view").onclick = () => { setTab("weapon"); };
  el("tab-att").onclick = () => { setTab("attachment"); };
  el("weaponSelect").onchange = (e) => {
    state.weaponId = e.target.value;
    buildPoseSelect();
    buildAttSelect();
    refresh();
  };
  el("poseSelect").onchange = (e) => { state.poseKey = e.target.value; refresh(); };
  el("opticSelect").onchange = (e) => { state.optic = e.target.value; refresh(); };
  el("stepSelect").onchange = (e) => { state.step = e.target.value; };
  el("attStepSelect").onchange = (e) => { state.attStep = e.target.value; };
  el("attSelect").onchange = (e) => { state.attachmentId = e.target.value; refresh(); };
  el("adsFactor").oninput = (e) => {
    state.adsPreview = false;
    state.adsFactor = parseFloat(e.target.value);
    refresh();
  };
  el("btnAds").onclick = () => {
    state.adsPreview = !state.adsPreview;
    if (state.adsPreview) state.adsFactor = 1;
    refresh();
  };
  el("btnCopy").onclick = copyWeaponJson;
  el("btnCopyAtt").onclick = copyAttJson;
  window.addEventListener("keydown", onKey);
  setTab("weapon");
  refresh();
}

bind();
