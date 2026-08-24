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
  fovHip: 70,
  fovAds: 50,
  fov: 70,
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

function makeOpticMesh(profile) {
  const g = new THREE.Group();
  g.name = "optic_" + profile;
  if (profile === "iron") {
    const rear = makeBox(0.045, 0.028, 0.018, 0x1a1f28, 0, 0.012, 0.03);
    const notchL = makeBox(0.008, 0.02, 0.012, 0x11151c, -0.014, 0.022, 0.03);
    const notchR = makeBox(0.008, 0.02, 0.012, 0x11151c, 0.014, 0.022, 0.03);
    const front = makeBox(0.012, 0.038, 0.012, 0x1a1f28, 0, 0.02, -0.1);
    const post = makeBox(0.006, 0.018, 0.006, 0xc45c2a, 0, 0.038, -0.1);
    g.add(rear, notchL, notchR, front, post);
  } else if (profile === "holo") {
    const body = makeBox(0.055, 0.04, 0.055, 0x2a8f6a, 0, 0.02, 0);
    const hood = makeBox(0.05, 0.03, 0.012, 0x1e6b50, 0, 0.035, -0.028);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.038, 0.028),
      new THREE.MeshBasicMaterial({ color: 0x7dffc8, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    glass.position.set(0, 0.035, -0.034);
    const reticle = new THREE.Mesh(
      new THREE.PlaneGeometry(0.012, 0.012),
      new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
    );
    reticle.position.set(0, 0.035, -0.033);
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.0025, 12),
      new THREE.MeshBasicMaterial({ color: 0xff6060, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false })
    );
    dot.position.set(0, 0.035, -0.032);
    g.add(body, hood, glass, reticle, dot);
  } else if (profile === "acog") {
    const mount = makeBox(0.04, 0.018, 0.08, 0x3a4558, 0, 0.008, 0);
    const tube = makeBox(0.038, 0.038, 0.14, 0x4a5568, 0, 0.035, -0.02);
    const bell = makeBox(0.048, 0.048, 0.03, 0x2c3340, 0, 0.035, -0.1);
    const eye = makeBox(0.042, 0.042, 0.025, 0x2c3340, 0, 0.035, 0.06);
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.014, 16),
      new THREE.MeshBasicMaterial({ color: 0x88ccaa, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    glass.position.set(0, 0.035, -0.116);
    g.add(mount, tube, bell, eye, glass);
  } else {
    // sniper_scope
    const mount = makeBox(0.038, 0.016, 0.1, 0x3a4558, 0, 0.006, 0);
    const tube = makeBox(0.042, 0.042, 0.22, 0x2a3140, 0, 0.038, -0.04);
    const obj = makeBox(0.06, 0.06, 0.045, 0x1a1f28, 0, 0.038, -0.16);
    const ocular = makeBox(0.05, 0.05, 0.035, 0x1a1f28, 0, 0.038, 0.09);
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.02, 20),
      new THREE.MeshBasicMaterial({ color: 0x446688, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    glass.position.set(0, 0.038, -0.184);
    g.add(mount, tube, obj, ocular, glass);
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
    const stock = makeBox(0.055, 0.09, 0.22, 0x4a3a2a, 0.01, -0.02, 0.18);
    const receiver = makeBox(0.07, 0.085, 0.32, 0x5a6578, 0, 0, 0);
    const handguard = makeBox(0.065, 0.07, 0.2, 0x3a4558, 0, 0.005, -0.22);
    const barrel = makeBox(0.028, 0.028, 0.36, 0x2c3340, 0, 0.02, -0.48);
    const mag = makeBox(0.038, 0.14, 0.055, 0x444b58, 0, -0.11, 0.02);
    const pistol = makeBox(0.04, 0.1, 0.05, 0x2a3140, 0, -0.09, 0.08);
    gripMesh = makeBox(0.04, 0.06, 0.08, 0x6b5344, 0, -0.055, -0.18);
    muzzleFlash = makeBox(0.04, 0.04, 0.04, 0xffcc66, 0, 0.02, -0.68);
    gunRoot.add(stock, receiver, handguard, barrel, mag, pistol, gripMesh, muzzleFlash);
    gripMesh.userData.base = { x: 0, y: -0.055, z: -0.18, rotX: 0, rotY: 0, rotZ: 0 };
    opticRoot = new THREE.Group();
    opticRoot.position.set(0, 0.055, -0.04);
    opticRoot.userData.base = { x: 0, y: 0.055, z: -0.04, rotX: 0, rotY: 0, rotZ: 0 };
  } else {
    const stock = makeBox(0.05, 0.07, 0.12, 0x3a4558, 0.015, -0.015, 0.12);
    const receiver = makeBox(0.065, 0.08, 0.2, 0x5a6578, 0, 0, 0);
    const handguard = makeBox(0.055, 0.06, 0.12, 0x445060, 0, 0.005, -0.14);
    const barrel = makeBox(0.03, 0.03, 0.22, 0x2c3340, 0, 0.015, -0.3);
    const mag = makeBox(0.04, 0.11, 0.055, 0x444b58, 0, -0.095, 0.015);
    const pistol = makeBox(0.038, 0.09, 0.045, 0x2a3140, 0, -0.08, 0.06);
    gripMesh = makeBox(0.038, 0.055, 0.05, 0x6b5344, 0, -0.06, -0.1);
    muzzleFlash = makeBox(0.035, 0.035, 0.035, 0xffcc66, 0, 0.015, -0.42);
    gunRoot.add(stock, receiver, handguard, barrel, mag, pistol, gripMesh, muzzleFlash);
    gripMesh.userData.base = { x: 0, y: -0.06, z: -0.1, rotX: 0, rotY: 0, rotZ: 0 };
    opticRoot = new THREE.Group();
    opticRoot.position.set(0, 0.05, -0.02);
    opticRoot.userData.base = { x: 0, y: 0.05, z: -0.02, rotX: 0, rotY: 0, rotZ: 0 };
  }

  muzzleFlash.material = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.95 });
  muzzleFlash.visible = false;
  muzzleSocket = new THREE.Object3D();
  muzzleSocket.name = "muzzleSocket";
  // Place at muzzle tip (same local as flash)
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
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.4;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(24, 48, 0x3a4560, 0x252b38);
  grid.position.y = -1.39;
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
    { id: "iron", label: "Iron", color: 0x8899aa, x: -0.55, shape: "block" },
    { id: "holo", label: "Holo", color: 0x2a8f6a, x: -0.18, shape: "cube" },
    { id: "acog", label: "Acog", color: 0x4a5568, x: 0.18, shape: "tube" },
    { id: "sniper_scope", label: "Sniper scope", color: 0x2a3140, x: 0.55, shape: "long" },
  ];
  pickups = [];
  defs.forEach((d) => {
    const group = new THREE.Group();
    group.position.set(d.x, tableY + 0.08, tableZ);
    let mesh;
    if (d.shape === "tube") {
      mesh = makeBox(0.06, 0.06, 0.16, d.color, 0, 0.04, 0);
    } else if (d.shape === "long") {
      mesh = makeBox(0.05, 0.05, 0.22, d.color, 0, 0.04, 0);
      const bell = makeBox(0.08, 0.08, 0.04, 0x1a1f28, 0, 0.04, -0.12);
      group.add(bell);
    } else if (d.shape === "cube") {
      mesh = makeBox(0.08, 0.07, 0.08, d.color, 0, 0.045, 0);
      const glass = makeBox(0.06, 0.04, 0.01, 0x7dffc8, 0, 0.05, -0.04);
      glass.material.transparent = true;
      glass.material.opacity = 0.5;
      group.add(glass);
    } else {
      mesh = makeBox(0.07, 0.05, 0.05, d.color, 0, 0.035, 0);
      const post = makeBox(0.015, 0.04, 0.015, 0xc45c2a, 0, 0.06, -0.02);
      group.add(post);
    }
    group.add(mesh);
    const highlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.02, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x6ea8ff, transparent: true, opacity: 0.0 })
    );
    highlight.position.y = 0.01;
    group.add(highlight);
    group.userData = { opticId: d.id, label: d.label, highlight, baseY: tableY + 0.08 };
    scene.add(group);
    pickups.push(group);
  });
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

function fireWeapon() {
  if (!gameplayActive()) return;
  if (player.fireCooldown > 0) return;
  if (state.lookPickup) {
    tryEquipLooked();
    return;
  }
  player.fireCooldown = 0.12;
  fireFlash();
  // Recoil punch on swayRig (not authored hold)
  player.recoilPunch.z += 0.018;
  player.recoilPunch.y += 0.006;
  player.recoilRot.x -= 0.035;
  player.recoilRot.y += (Math.random() - 0.5) * 0.02;

  // Policy A: spawn at muzzle, travel along camera aim (-Z)
  if (!muzzleSocket || !camera) return;
  muzzleSocket.updateWorldMatrix(true, false);
  const origin = new THREE.Vector3();
  muzzleSocket.getWorldPosition(origin);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir); // already -Z aim
  dir.normalize();

  const geo = new THREE.CylinderGeometry(0.008, 0.008, 0.55, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe08a });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  mesh.position.copy(origin).addScaledVector(dir, 0.28);
  scene.add(mesh);
  tracers.push({ mesh, dir, speed: 85, life: 0.9 });
}

function updateTracers(dt) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    const tr = tracers[i];
    tr.life -= dt;
    tr.mesh.position.addScaledVector(tr.dir, tr.speed * dt);
    if (tr.life <= 0) {
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

  // FOV lerp toward ADS
  const fovTarget = (state.adsFactor > 0.05 || state.adsPreview) ? lerp(player.fovHip, player.fovAds, state.adsFactor) : player.fovHip;
  player.fov = lerp(player.fov, fovTarget, 1 - Math.exp(-10 * dt));
  if (Math.abs(camera.fov - player.fov) > 0.01) {
    camera.fov = player.fov;
    camera.updateProjectionMatrix();
  }

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
  const strafeTilt = gameplayActive() ? (Number(input.left) - Number(input.right)) * 0.03 : 0;
  leanPivot.rotation.z = leanZ + strafeTilt;

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
