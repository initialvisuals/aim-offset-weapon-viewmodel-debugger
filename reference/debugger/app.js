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

const BALLISTICS = {
  example_smg: { speed: 62, gravity: 18, life: 1.4, tracerLen: 0.42 },
  example_rifle: { speed: 95, gravity: 9.5, life: 1.8, tracerLen: 0.55 },
  sniper_boost: { speed: 120, gravity: 6.5, life: 2.2, tracerLen: 0.65 },
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
  gunPickId: "example_smg",
  lookPickup: null,
  swayEnabled: true,
  holdBreath: false,
  breathLeft: 3,
  breathMax: 3,
};

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
  return !state.panelOpen && !state.gunModalOpen;
}
function typingFocus() {
  const t = document.activeElement;
  return t && (t.matches("input, select, textarea") || t.isContentEditable);
}

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
  if (open && document.pointerLockElement) document.exitPointerLock();
  updateHudHint();
}
function togglePanel() { setPanelOpen(!state.panelOpen); }

function setGunModal(open) {
  state.gunModalOpen = open;
  const modal = el("gunModal");
  modal.hidden = !open;
  if (open) {
    state.gunPickId = state.weaponId;
    renderGunList();
    if (document.pointerLockElement) document.exitPointerLock();
  }
  updateHudHint();
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
let opticRoot, gripMesh, aimHelper, muzzleFlash, muzzleSocket, swayRig;
let tracers = [];
let playerRoot, leanPivot;
let pickups = [];
let rangeTargets = [];
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
};

const player = {
  pos: new THREE.Vector3(0, 0.2, 2.5),
  yaw: 0,
  pitch: 0,
  leanAngle: 0,
  leanTarget: 0,
  bobPhase: 0,
  eyeHeight: 0.2,
  moveSpeed: 3.2,
  sprintMul: 1.65,
  lookSens: 0.0022,
  adsLookMul: 0.5,
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
    // Short window — peripheral frame when ADS; HUD red-dot overlay is primary reticle
    const mount = makeBox(0.042, 0.012, 0.05, 0x2a3140, 0, 0.006, 0);
    const body = makeBox(0.058, 0.048, 0.052, 0x2a8f6a, 0, 0.036, 0);
    const frameL = makeBox(0.008, 0.036, 0.04, 0x1e6b50, -0.025, 0.04, 0);
    const frameR = makeBox(0.008, 0.036, 0.04, 0x1e6b50, 0.025, 0.04, 0);
    const frameTop = makeBox(0.058, 0.008, 0.04, 0x1e6b50, 0, 0.06, 0);
    const hood = makeBox(0.056, 0.01, 0.014, 0x16553f, 0, 0.062, -0.02);
    const glass = makeLensGlass(0.018, 0.16);
    glass.position.set(0, 0.04, -0.02);
    g.add(mount, body, frameL, frameR, frameTop, hood, glass);
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
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 0.9 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 50), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.4;
  floor.position.z = -12;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(40, 40, 0x3a4560, 0x252b38);
  grid.position.y = -1.39;
  grid.position.z = -12;
  scene.add(grid);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x12161e, roughness: 1 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 0.2), wallMat);
  back.position.set(0, 0.4, -10);
  scene.add(back);

  for (let i = 0; i < 6; i++) {
    const box = makeBox(
      0.4 + Math.random() * 0.5,
      0.3 + Math.random() * 1.0,
      0.4 + Math.random() * 0.5,
      0x222833,
      (Math.random() - 0.5) * 10,
      -1.4 + (0.15 + Math.random() * 0.5),
      -4 - Math.random() * 5
    );
    scene.add(box);
  }

  buildOpticsTable();
  buildShootingRange();
}

function buildOpticsTable() {
  const tableY = -0.85;
  const tableZ = -1.6;
  const top = makeBox(1.6, 0.06, 0.55, 0x5a4634, 0, tableY, tableZ);
  const legL = makeBox(0.06, 0.55, 0.06, 0x3a2e22, -0.7, tableY - 0.3, tableZ - 0.2);
  const legR = makeBox(0.06, 0.55, 0.06, 0x3a2e22, 0.7, tableY - 0.3, tableZ - 0.2);
  const legL2 = makeBox(0.06, 0.55, 0.06, 0x3a2e22, -0.7, tableY - 0.3, tableZ + 0.2);
  const legR2 = makeBox(0.06, 0.55, 0.06, 0x3a2e22, 0.7, tableY - 0.3, tableZ + 0.2);
  scene.add(top, legL, legR, legL2, legR2);

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
  const laneZ = [-8, -14, -22, -32];
  const labels = ["25m", "50m", "75m", "100m"];
  rangeTargets = [];

  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 40),
    new THREE.MeshStandardMaterial({ color: 0x161a22, roughness: 0.95 })
  );
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(0, -1.385, -18);
  scene.add(strip);

  for (const side of [-2.0, 2.0]) {
    scene.add(makeBox(0.08, 0.12, 36, 0x2a3140, side, -1.3, -18));
  }

  laneZ.forEach((z, i) => {
    scene.add(makeBox(0.08, 0.9, 0.08, 0x445060, -2.3, -0.95, z));
    scene.add(makeBox(0.08, 1.2, 0.08, 0x3a4558, 0, -0.8, z));
    scene.add(makeBox(0.9, 0.06, 0.06, 0x3a4558, 0, -0.2, z));

    const board = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 28),
      new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.85 })
    );
    board.position.set(0, 0.15, z);
    const ring1 = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.32, 28),
      new THREE.MeshBasicMaterial({ color: 0x222833, side: THREE.DoubleSide })
    );
    ring1.position.set(0, 0.15, z + 0.01);
    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(0.14, 0.18, 28),
      new THREE.MeshBasicMaterial({ color: 0xc45c2a, side: THREE.DoubleSide })
    );
    ring2.position.set(0, 0.15, z + 0.012);
    const bull = new THREE.Mesh(
      new THREE.CircleGeometry(0.05, 16),
      new THREE.MeshBasicMaterial({ color: 0xc45c2a })
    );
    bull.position.set(0, 0.15, z + 0.014);
    const flash = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 28),
      new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0, depthWrite: false })
    );
    flash.position.set(0, 0.15, z + 0.02);
    scene.add(board, ring1, ring2, bull, flash);
    rangeTargets.push({
      mesh: board,
      flash,
      center: new THREE.Vector3(0, 0.15, z),
      radius: 0.48,
      label: labels[i],
      hitUntil: 0,
    });
  });

  scene.add(makeBox(6, 3.2, 0.4, 0x2a2030, 0, 0.1, -36));
}

function clearInputFlags() {
  input.forward = input.back = input.left = input.right = false;
  input.sprint = input.leanLeft = input.leanRight = false;
  input.ads = input.shoot = false;
  input.holdBreath = false;
  state.holdBreath = false;
  player.leanTarget = 0;
  state.adsTarget = state.adsPreview ? 1 : 0;
}

function initThree() {
  const canvas = el("view3d");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0a0c10, 1);
  renderer.shadowMap.enabled = true;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(player.fovHip, 1, 0.01, 100);

  playerRoot = new THREE.Group();
  leanPivot = new THREE.Group();
  playerRoot.add(leanPivot);
  leanPivot.add(camera);
  scene.add(playerRoot);

  const amb = new THREE.AmbientLight(0x8899aa, 0.55);
  scene.add(amb);
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(2, 4, 1);
  key.castShadow = true;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6688cc, 0.25);
  fill.position.set(-2, 1, 2);
  scene.add(fill);

  holdRoot = new THREE.Group();
  camera.add(holdRoot);

  aimHelper = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 0, 0),
    4,
    0x00ffff,
    0.08,
    0.05
  );
  camera.add(aimHelper);

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

function fireWeapon() {
  if (!gameplayActive()) return;
  if (player.fireCooldown > 0) return;
  if (state.lookPickup) {
    tryEquipLooked();
    return;
  }
  player.fireCooldown = state.optic === "sniper_scope" ? 0.35 : 0.12;
  fireFlash();
  // Recoil punch on swayRig (not authored hold)
  const kick = state.optic === "sniper_scope" ? 1.6 : (state.weaponId === "example_rifle" ? 1.15 : 1);
  player.recoilPunch.z += 0.018 * kick;
  player.recoilPunch.y += 0.006 * kick;
  player.recoilRot.x -= 0.035 * kick;
  player.recoilRot.y += (Math.random() - 0.5) * 0.02 * kick;

  // Policy A: spawn at muzzle, initial dir = camera aim; gravity integrates per frame
  if (!muzzleSocket || !camera) return;
  muzzleSocket.updateWorldMatrix(true, false);
  const origin = new THREE.Vector3();
  muzzleSocket.getWorldPosition(origin);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.normalize();
  const bal = ballisticForWeapon();
  const vel = dir.clone().multiplyScalar(bal.speed);

  const geo = new THREE.CylinderGeometry(0.007, 0.007, bal.tracerLen, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe08a });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  mesh.position.copy(origin).addScaledVector(dir, 0.28);
  scene.add(mesh);
  tracers.push({ mesh, vel, gravity: bal.gravity, life: bal.life, hit: false });
}

function flashTarget(t) {
  t.hitUntil = performance.now() + 180;
  if (t.flash) t.flash.material.opacity = 0.85;
}

function updateTracers(dt) {
  const now = performance.now();
  rangeTargets.forEach((t) => {
    if (t.flash) {
      if (now < t.hitUntil) t.flash.material.opacity = 0.7;
      else t.flash.material.opacity = Math.max(0, t.flash.material.opacity - dt * 3);
    }
  });

  for (let i = tracers.length - 1; i >= 0; i--) {
    const tr = tracers[i];
    tr.life -= dt;
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

    // Hit test vs range targets
    if (!tr.hit) {
      for (const t of rangeTargets) {
        const d = tr.mesh.position.distanceTo(t.center);
        if (d < t.radius) {
          tr.hit = true;
          tr.life = Math.min(tr.life, 0.02);
          flashTarget(t);
          break;
        }
      }
    }

    if (tr.life <= 0 || tr.mesh.position.y < -2.5) {
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

  // Movement on XZ
  let mx = 0, mz = 0;
  if (gameplayActive()) {
    if (input.forward) mz -= 1;
    if (input.back) mz += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
  }
  const moving = Math.abs(mx) + Math.abs(mz) > 0;
  if (moving) {
    const len = Math.hypot(mx, mz) || 1;
    mx /= len; mz /= len;
    const speed = player.moveSpeed * (input.sprint ? player.sprintMul : 1);
    const cy = Math.cos(player.yaw), sy = Math.sin(player.yaw);
    // yaw 0 looks down -Z
    player.pos.x += (mx * cy + mz * sy) * speed * dt;
    player.pos.z += (-mx * sy + mz * cy) * speed * dt;
    player.pos.x = clamp(player.pos.x, -10, 10);
    player.pos.z = clamp(player.pos.z, -10, 10);
  }

  // View bob
  const bobAmp = moving ? (input.sprint ? 0.025 : 0.014) : 0;
  player.bobPhase += dt * (moving ? (input.sprint ? 12 : 8) : 0);
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

  // Apply yaw/pitch on playerRoot / camera
  playerRoot.position.set(player.pos.x + bobX, player.pos.y + bobY, player.pos.z);
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
  // Strafe tilt only — tiny roll from lateral move (<< Q/E lean). Cap ~3% of leanMax.
  const lateral = gameplayActive() ? (Number(input.left) - Number(input.right)) : 0;
  const strafeTarget = lateral * player.leanMax * 0.025;
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
  updateTracers(dt);
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
  if (hipXh) hipXh.classList.toggle("ads-hide", adsOn);
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
  if (state.panelOpen) {
    hint.textContent = "";
    hint.innerHTML = `Debugger open — <kbd>C</kbd> close · <kbd>G</kbd> guns`;
  } else {
    hint.innerHTML = `<kbd>C</kbd> Debugger · WASD · mouse look · <kbd>Q</kbd>/<kbd>E</kbd> lean · RMB ADS · <kbd>Alt</kbd> breath · LMB fire (aim=camera)`;
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

  if (state.gunModalOpen) {
    if (e.key === "Escape") { setGunModal(false); e.preventDefault(); }
    return;
  }

  const k = e.key;
  const code = e.code;

  // Always allow C / G / Esc
  if (k === "c" || k === "C") {
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

  // Gameplay movement / lean — only when panel closed
  if (gameplayActive()) {
    if (code === "KeyW") input.forward = true;
    if (code === "KeyS") input.back = true;
    if (code === "KeyA") input.left = true;
    if (code === "KeyD") input.right = true;
    if (code === "ShiftLeft" || code === "ShiftRight") input.sprint = true;
    if (code === "KeyQ") input.leanLeft = true;
    if (code === "KeyE") {
      input.leanRight = true;
      if (state.lookPickup && !e.repeat) tryEquipLooked();
    }
    if (k === " " || code === "Space") {
      fireWeapon();
      e.preventDefault();
    }
    if (code === "AltLeft" || code === "AltRight") {
      input.holdBreath = true;
      e.preventDefault();
    }
    if (k === "f" || k === "F") {
      if (state.lookPickup) tryEquipLooked();
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
  if (code === "KeyQ") input.leanLeft = false;
  if (code === "KeyE") input.leanRight = false;
  if (code === "AltLeft" || code === "AltRight") input.holdBreath = false;
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
  let adsMul = (input.ads || state.adsFactor > 0.5) ? player.adsLookMul : 1;
  if (state.holdBreath && state.breathLeft > 0) adsMul *= 0.65;
  const sens = player.lookSens * adsMul;
  player.yaw -= e.movementX * sens;
  player.pitch -= e.movementY * sens;
  player.pitch = clamp(player.pitch, -1.2, 1.2);
}

function bindPointerLock() {
  const canvas = el("view3d");
  canvas.addEventListener("click", () => {
    if (gameplayActive() && !document.pointerLockElement) canvas.requestPointerLock();
  });
  document.addEventListener("pointerlockchange", () => {
    if (!document.pointerLockElement) {
      input.ads = false;
      input.leanLeft = input.leanRight = false;
      input.holdBreath = false;
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
  el("btnCopy").onclick = () => copyWeaponJson();
  el("btnCopyAtt").onclick = () => copyAttJson();
  el("btnCloseDbg").onclick = () => setPanelOpen(false);
  el("btnGuns").onclick = () => setGunModal(true);
  el("btnGunCancel").onclick = () => setGunModal(false);
  el("btnGunEquip").onclick = () => {
    const id = state.gunPickId;
    setGunModal(false);
    equipWeapon(id);
  };
  el("gunModal").addEventListener("click", (e) => {
    if (e.target === el("gunModal")) setGunModal(false);
  });

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
