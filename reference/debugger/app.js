/** Three.js block-gun viewmodel tuner demo (ES module). */

import * as THREE from "three";

const POSE_KEYS = ["hip", "hip_low", "hip_cant", "sprint_high", "ads", "ads_cant", "ads_holo", "ads_acog", "ads_sniper_scope"];
const HOME_HOLD_KEYS = ["hip", "hip_low", "hip_cant"];
const HOME_HOLD_LABELS = { hip: "chest", hip_low: "low hip", hip_cant: "canted" };
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
  // Demo units ≈ meters. Tracers fly until impact (see TRACER_SANITY_LIFE), not these old 3–4s lives.
  example_smg: { speed: 300, gravity: 14, tracerLen: 0.55 }, // .45 ACP-ish PDW
  // 7.62×51 from a 20" DMR. 785 m/s ≈ 2571 fps.
  example_rifle: { speed: 785, gravity: 9.8, tracerLen: 0.75 },
  // 7.62×51 24"-class bolt (M24-ish). ~810 m/s.
  example_sniper: { speed: 810, gravity: 9.8, tracerLen: 0.85 },
};

/** Tracers are not timed cartridges — live until impact. 180s covers an 810 m/s vertical return (~165s). */
const TRACER_SANITY_LIFE = 180;
/** After a hit, sit as a tiny spent slug before despawn. Rare grazing skip is a separate mesh. */
const TRACER_LINGER = 2;
const TRACER_SLUG_LEN = 0.07;


function emptyPose() {
  return { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0 };
}

const db = {
  example_smg: {
    schema_version: 1,
    weapon: "example_smg",
    hip: { x: 0.1043, y: -0.1688, z: -0.1953, rotX: 0.0165, rotY: 0, rotZ: 0 },
    hip_low: { x: 0.1043, y: -0.2788, z: -0.1753, rotX: 0.0765, rotY: 0, rotZ: 0 },
    hip_cant: { x: 0.1393, y: -0.1938, z: -0.2103, rotX: 0.0365, rotY: 0.04, rotZ: 0.785 },
    sprint_high: { x: 0.21, y: 0.018, z: -0.215, rotX: 0.52, rotY: 0.05, rotZ: -0.10 },
    ads: { x: 0.0084, y: -0.1343, z: -0.1887, rotX: 0, rotY: 0, rotZ: 0 },
    ads_cant: { x: 0.034, y: -0.142, z: -0.172, rotX: 0.02, rotY: 0.035, rotZ: 0.785 },
    ads_holo: { x: 0.0082, y: -0.1478, z: -0.1335, rotX: 0.0115, rotY: 0, rotZ: 0 },
    ads_acog: { x: 0.0083, y: -0.15, z: -0.0724, rotX: 0.014, rotY: 0, rotZ: -0.003 },
  },
  example_rifle: {
    schema_version: 1,
    weapon: "example_rifle",
    hip: { x: 0.12, y: -0.18, z: -0.22, rotX: 0.02, rotY: 0, rotZ: 0 },
    hip_low: { x: 0.12, y: -0.29, z: -0.20, rotX: 0.08, rotY: 0, rotZ: 0 },
    hip_cant: { x: 0.155, y: -0.205, z: -0.235, rotX: 0.04, rotY: 0.04, rotZ: 0.785 },
    sprint_high: { x: 0.22, y: 0.012, z: -0.24, rotX: 0.54, rotY: 0.05, rotZ: -0.10 },
    ads: { x: 0.01, y: -0.14, z: -0.2, rotX: 0, rotY: 0, rotZ: 0 },
    ads_cant: { x: 0.036, y: -0.148, z: -0.182, rotX: 0.02, rotY: 0.035, rotZ: 0.785 },
    ads_holo: { x: 0.01, y: -0.15, z: -0.15, rotX: 0.0115, rotY: 0, rotZ: 0 },
    ads_acog: { x: 0.01, y: -0.152, z: -0.08, rotX: 0.014, rotY: 0, rotZ: 0 },
    ads_sniper_scope: { x: 0.006, y: -0.155, z: -0.05, rotX: 0.01, rotY: 0, rotZ: 0 },
  },
  example_sniper: {
    schema_version: 1,
    weapon: "example_sniper",
    hip: { x: 0.125, y: -0.185, z: -0.24, rotX: 0.018, rotY: 0, rotZ: 0 },
    hip_low: { x: 0.125, y: -0.295, z: -0.22, rotX: 0.078, rotY: 0, rotZ: 0 },
    hip_cant: { x: 0.16, y: -0.21, z: -0.255, rotX: 0.038, rotY: 0.04, rotZ: 0.785 },
    sprint_high: { x: 0.23, y: 0.008, z: -0.255, rotX: 0.56, rotY: 0.055, rotZ: -0.10 },
    ads: { x: 0.01, y: -0.14, z: -0.2, rotX: 0, rotY: 0, rotZ: 0 },
    ads_cant: { x: 0.037, y: -0.148, z: -0.182, rotX: 0.02, rotY: 0.035, rotZ: 0.785 },
    ads_sniper_scope: { x: 0.006, y: -0.158, z: -0.04, rotX: 0.01, rotY: 0, rotZ: 0 },
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
  example_sniper: {
    holo_sight: { x: 0, y: 0.02, z: 0.02, rotX: 0, rotY: 0, rotZ: 0 },
  },
};

const WEAPON_META = {
  example_smg: { label: "MP9-Z", blurb: "SMG auto, in-line recoil — iron / holo / acog" },
  example_rifle: { label: "SR-25", blurb: "7.62 DMR — iron / holo / acog / sniper" },
  example_sniper: { label: "M24 Sniper", blurb: "Bolt 7.62 — iron / sniper_scope only" },
};

/** Which optic profiles each weapon may equip (iron = native default). */
const WEAPON_OPTICS = {
  example_smg: ["iron", "holo", "acog"],
  example_rifle: ["iron", "holo", "acog", "sniper_scope"], // 1913 rail DMR — slap whatever on it
  example_sniper: ["iron", "sniper_scope"],
};

const DEFAULT_OPTIC = {
  example_smg: "iron",
  example_rifle: "iron",
  example_sniper: "sniper_scope",
};

/** Mag catalog. Capacity follows the seated mag, not the optic. Infinite reserve. */
const MAG_KINDS = {
  smg_20: { id: "smg_20", weaponId: "example_smg", capacity: 20, shape: "stick", label: "MP9-Z 20" },
  smg_45: { id: "smg_45", weaponId: "example_smg", capacity: 45, shape: "banana", label: "MP9-Z 45" },
  smg_60: { id: "smg_60", weaponId: "example_smg", capacity: 60, shape: "drum", label: "MP9-Z 60" },
  rifle_20: { id: "rifle_20", weaponId: "example_rifle", capacity: 20, shape: "box", label: "SR-25 20" },
  sniper_5: { id: "sniper_5", weaponId: "example_sniper", capacity: 5, shape: "clip", label: "M24 5" },
};
const DEFAULT_MAG = {
  example_smg: "smg_20",
  example_rifle: "rifle_20",
  example_sniper: "sniper_5",
};
/** Reload window by weapon. Mag motion plays inside this. */
const MAG_RELOAD_SEC = {
  example_smg: 1.2,
  example_rifle: 1.4,
  example_sniper: 2.0,
};
/** Per-gun suppressor: short SMG can, longer 7.62 rifle can, unique long bolt can. */
const SUPPRESSOR_SPEC = {
  example_smg: { label: ".45 suppressor", mount: [0, 0.016, -0.405], tipZ: -0.507, y: 0.016 },
  example_rifle: { label: "7.62 suppressor", mount: [0, 0.018, -0.805], tipZ: -0.970, y: 0.018 },
  example_sniper: { label: "7.62 long suppressor", mount: [0, 0.014, -0.852], tipZ: -1.052, y: 0.014 },
};

function magsForWeapon(weaponId) {
  return Object.keys(MAG_KINDS).filter((id) => MAG_KINDS[id].weaponId === weaponId);
}

/** Per-weapon allow lists. Empty / missing slot = that class cannot go on the gun.
 *  randomizeLoadout() rolls optic / mag / can only. Grip + stock keys are reserved:
 *  SMG / rifle are slotty (lists stay empty until items exist); bolt has no grip/stock. */
const WEAPON_KIT = {
  example_smg: {
    optics: WEAPON_OPTICS.example_smg,
    mags: magsForWeapon("example_smg"),
    suppressor: !!SUPPRESSOR_SPEC.example_smg,
    grip: [],
    stock: [],
  },
  example_rifle: {
    optics: WEAPON_OPTICS.example_rifle,
    mags: magsForWeapon("example_rifle"),
    suppressor: !!SUPPRESSOR_SPEC.example_rifle,
    grip: [],
    stock: [],
  },
  example_sniper: {
    optics: WEAPON_OPTICS.example_sniper,
    mags: magsForWeapon("example_sniper"),
    suppressor: !!SUPPRESSOR_SPEC.example_sniper,
    grip: [],
    stock: [],
  },
};

/** Bolt-action cycle (example_sniper only). Semi DMR does not use this. */
const BOLT_CYCLE_SEC = 0.65;
/** SMG AUTO interval — ~1200 rpm (50 ms). Semi is still one shot per click. */
const SMG_AUTO_SEC = 0.05;
/**
 * Barrel heat: energy per shot / thermal mass, plus cool time-constant (s).
 * Stored heat is shots-through minus exponential cool — not a flat glow.
 * SMG auto (~20 rps) cooks a mag; DMR semi (~7 rps) warms; bolt (~1.5 rps) barely ticks.
 */
const BARREL_HEAT_SPEC = {
  example_smg: { add: 0.052, tau: 4.2 },
  example_rifle: { add: 0.028, tau: 6.0 },
  example_sniper: { add: 0.011, tau: 7.5 },
};
const barrelHeatAmt = { example_smg: 0, example_rifle: 0, example_sniper: 0 };
let barrelHeatClock = 0;
let barrelHeatEmissiveMap = null;
let heatHazeDummyTex = null;
let heatHazeGrabRT = null;
let heatHazePost = null;
let barrelHeatHazeLive = false;
/** Recoil pattern index resets after this gap of not firing. */
const RECOIL_RESET_MS = 200;

/** Viewmodel isolation — ADS near-blur without smearing the range / HUD. */
const VIEWMODEL_LAYER = 1;
/** Barrel heat-haze cards — drawn after the scene grab so they can sample tScene. */
const HEAT_HAZE_LAYER = 2;
/** Disc radius (UV x) at ads=1 on the half-res viewmodel RT. Hint, not milk. */
const ADS_DOF_RADIUS = 0.0028;
const ADS_DOF_RADIUS_MIN = 0;
const ADS_DOF_RADIUS_MAX = 0.012;
/** Ring tap count (plus center + inner ring). Settings default. */
const ADS_DOF_TAPS_DEFAULT = 12;
const ADS_DOF_TAPS_MIN = 4;
const ADS_DOF_TAPS_MAX = 24;
/** Hold-breath multiplies near-blur (Space during ADS). */
const ADS_DOF_BREATH_MUL = 1.6;
/** Half-res volumetric sun-shaft march steps (shadow-map occluded). */
const GOD_RAYS_STEPS = 48;
/** Settings default; 0 skips the pass. */
const GOD_RAYS_DEFAULT = 0.9;
/** Settings default; 0 skips the pass. */
const BLOOM_DEFAULT = 0.22;
/** Final-output luma dither after ACES (luma units). 0 skips the pass. */
const DITHER_DEFAULT = 0.001;
const DITHER_MAX = 0.008;
const DITHER_SCALE_DEFAULT = 1;
const DITHER_SCALE_MIN = 0.25;
const DITHER_SCALE_MAX = 8;
const DITHER_OFF_MIN = -32;
const DITHER_OFF_MAX = 32;
const DITHER_TYPE_DEFAULT = "hash";
const DITHER_TYPES = ["hash", "ign", "bayer"];
/** Mesh sun angular diameter (degrees). Real sun ~0.53; default a hair smaller. */
const SUN_SIZE_DEFAULT = 0.45;
/** Core heat of the disc. Soft-clamped so it never floods; halo stays LDR. */
const SUN_PUNCH_DEFAULT = 1.4;
/** Pinpoint HDR seed (degrees). Independent of sun size — does not grow bloom. */
const SUN_CORE_DEG = 0.10;
/** Bright-pass luminance floor (HDR). Raised so the sky disc/halo stay out. */
const BLOOM_THRESHOLD = 1.28;
const BLOOM_KNEE = 0.14;
/** Dual-filter pyramid depth (half / quarter / eighth). */
const BLOOM_MIPS = 3;
/** Settings default; 0 skips the glow. Multiplies barrel emissive only. */
const BARREL_HEAT_DEFAULT = 1;
/** Settings max (0–2). */
const BARREL_HEAT_MUL_MAX = 2;
/** Colorless heat-haze warp / vert displace (0 = off). Mid-slider is the authored look. */
const HEAT_HAZE_STRENGTH_DEFAULT = 1;
const HEAT_HAZE_STRENGTH_MAX = 2;
/** Noise-cell / volume-height mul. 1 = authored (~0.46 m ground, ~11 cm barrel). */
const HEAT_HAZE_SIZE_DEFAULT = 1;
const HEAT_HAZE_SIZE_MIN = 0.35;
const HEAT_HAZE_SIZE_MAX = 2;
/**
 * Fullscreen world/height-fog heat post. OFF by default — prior ships slapped
 * sky-blue fog on fire/heat. Barrel cards stay the only heat-distortion path
 * until this is proven safe. Settings checkbox can re-enable for experiments.
 * On load, a one-time migration forces persisted true → false (old builds).
 */
const GROUND_HEAT_HAZE_DEFAULT = false;
/** Cache-bust token + America/Toronto build stamp (bump both with index.html ?v=). */
const APP_CACHE_BUST = "20260824v57";
const APP_BUILD_STAMP = "2026-09-03 22:26";
const GROUND_HAZE_H = 0.46;
const BARREL_HAZE_H = 0.11;
/** Settings default cloud cover (0 = clear). */
const CLOUDS_DEFAULT = 0.55;
/** Dust / edge wear on bay concrete (0 = clean pour). Shared GPU uniform. */
const CONCRETE_WEAR_DEFAULT = 0.4;
const uConcreteWear = { value: CONCRETE_WEAR_DEFAULT };
/** Grain-size mul on authored per-kind scale. Mid-slider = authored look. */
const CONCRETE_SCALE_DEFAULT = 1;
const CONCRETE_SCALE_MIN = 0.4;
const CONCRETE_SCALE_MAX = 1.6;
const uConcreteScale = { value: CONCRETE_SCALE_DEFAULT };
/** Panel value mul on authored variation (no hue swing). Mid-slider = authored look. */
const CONCRETE_VAR_DEFAULT = 1;
const CONCRETE_VAR_MIN = 0;
const CONCRETE_VAR_MAX = 2;
const uConcreteVar = { value: CONCRETE_VAR_DEFAULT };
const concreteMaterials = [];
const concreteTextures = [];
const concreteVariantMats = Object.create(null);
const CONCRETE_TINT_VARIANTS = 8;
let concreteTexBundle = null;
/** Warm HDR lamp glass — pops under threshold without lifting the bay. */
const FLOOD_LAMP_HDR = [3.15, 2.65, 1.78];
/** Spawn-porch tube cookie — sodium-ish, dimmer/oranger than the bay floods. */
const TUBE_LAMP_HDR = [2.72, 1.68, 0.52];

const state = {
  mode: "weapon",
  weaponId: "example_smg",
  poseKey: "hip",
  /** Last U-cycled unaimed hold. Persisted. hip = chest. */
  homeHold: "hip",
  /** 0..1 blend onto sprint_high while Shift sprinting. */
  sprintHoldT: 0,
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
  /** True after X-drop until a pickup / table / G equip. */
  handsEmpty: false,
  /** Instance id of the held kit. Null while empty-handed. */
  heldInstanceId: null,
  swayEnabled: true,
  holdBreath: false,
  score: 0,
  breathLeft: 3,
  breathMax: 3,
  crouchToggled: false,
  /** 0 = stand, 1 = full sit. Wheel / C / Z / slide drive this. */
  crouchGrad: 0,
  /** Last analog crouch depth for C-toggle (default full sit). */
  crouchLastDepth: 1,
  sliding: false,
  slideT: 0,
  slideDur: 0.7,
  slideFx: 0,
  slideFz: 0,
  slideSpeed: 0,
  vaulting: false,
  vaultT: 0,
  vaultDur: 0.36,
  vaultFrom: null,
  vaultLip: null,
  vaultTo: null,
  vaultSupportTo: 0,
  lookVault: null,
  spaceHoldT: 0,
  /** Sim (true) = HoB + ballistic zero. Arcade (false) = reticle-faithful / idealized bore=aim. */
  hobZero: true,
  /** Stored optic zero (m). Irons ignore this and always ballistic-zero at 100 via effectiveZeroDist(). */
  zeroDist: 100,
  /** PerspectiveCamera near/far — tunable in Settings (O) for depth teaching. */
  camNear: 0.05,
  camFar: 2000,
  /** Draw sight vs bore/launch debug rays. */
  showAimRays: false,
  /** 3px hip crosshair visibility (ADS optic HUD unaffected). */
  showHipReticle: true,
  /** Seated mag id per weapon (table pickup). */
  magByWeapon: {
    example_smg: "smg_20",
    example_rifle: "rifle_20",
    example_sniper: "sniper_5",
  },
  /** Suppressor mounted per weapon (table toggle). */
  suppressorByWeapon: {
    example_smg: false,
    example_rifle: false,
    example_sniper: false,
  },
  /** Rounds currently in the magazine. */
  ammoInMag: 20,
  /** True while a timed reload is in progress (blocks fire). */
  reloading: false,
  /** Seconds elapsed in the current reload. */
  reloadElapsed: 0,
  /** Active reload duration (sec). */
  reloadDuration: 1.2,
  /** Bolt-action cycle in progress (example_sniper). */
  boltCycling: false,
  boltElapsed: 0,
  boltDuration: 0.65,
  boltEjected: false,
  /** Fire selector: "semi" | "auto". AUTO only does anything on example_smg. */
  fireMode: "auto",
  recoilPatternIndex: 0,
  lastShotMs: 0,
  /** Toast "Semi only" once per semi-only weapon until you switch guns. */
  semiOnlyToasted: false,
  /** Viewport CSS brightness (0.5–1.5). Identity 1.00 = ungraded sRGB. */
  brightness: 1.00,
  /** Viewport CSS contrast / “gamma” feel (0.8–1.6). Identity 1.00 = ungraded sRGB. */
  gamma: 1.00,
  /** Linear distance fog (THREE.Fog) — tunable in Settings (O). */
  fogEnabled: true,
  fogNear: 375,
  fogFar: 520,
  /** Overlay Black/Low/Mid/High/White strip on viewport corner. */
  showPluge: false,
  /** Debugger performance HUD (backtick panel Perf toggle). Default off. */
  showPerf: false,
  /** Hours 0–24. Default evening matches the dusk range look. */
  timeOfDay: 18.5,
  /** Scene-light multipliers on the current ToD bases (1.00 = authored). */
  lightAmbMul: 1,
  lightFillMul: 1,
  lightHemiMul: 1,
  lightKeyMul: 1,
  lightRimMul: 1,
  lightMoonMul: 1,
  /** Multiplier on ToD ACES exposure (1.00 = authored clock). */
  exposureMul: 1,
  /** Env/scuff + non-paper punch hole FIFO cap. Paper holes use PAPER_DECAL_MAX. */
  holeCap: 30000,
  /** Brass casing FIFO cap. */
  casingCap: 30000,
  /** Dust / edge wear on bay floor, walls, berm (0–1). */
  concreteWear: CONCRETE_WEAR_DEFAULT,
  /** Grain-size mul (0.4–1.6). 1 = authored grit. */
  concreteScale: CONCRETE_SCALE_DEFAULT,
  /** Per-panel value mul (0–2). 1 = authored pour drift (no hue swing). */
  concreteVar: CONCRETE_VAR_DEFAULT,
  /** Seconds after spawn before env/scuff holes despawn. 0 = FIFO only. */
  holeFade: 18,
  /** Seconds after a casing sleeps before despawn. 0 = stay until cap recycles. */
  casingFade: 12,
  /** Hide casings/spent slugs beyond this player XZ distance (m). Not despawn. */
  casingDraw: 55,
  /** Hide holes/crater plugs beyond this player XZ distance (m). Not despawn. */
  decalDraw: 900,
  /** Volumetric sun shafts (0 = off, 2 = strong). */
  godRays: GOD_RAYS_DEFAULT,
  /** HDR bloom (0 = off, 2 = strong). Independent of god rays. */
  bloom: BLOOM_DEFAULT,
  /** Post-tonemap luma dither / banding floor (0 = off, 0.008 = strong). */
  dither: DITHER_DEFAULT,
  /** Pattern frequency (1 = pixel scale). */
  ditherScale: DITHER_SCALE_DEFAULT,
  /** Pattern phase in pixels. */
  ditherOffX: 0,
  ditherOffY: 0,
  /** "hash" (default luma TPDF) | "ign" | "bayer". */
  ditherType: DITHER_TYPE_DEFAULT,
  /** Frame-crawl the pattern. Off by default — crawl looks digital. */
  ditherAnimate: false,
  /** ADS viewmodel DOF ring taps (plus center + half-radius inner ring). */
  adsDofTaps: ADS_DOF_TAPS_DEFAULT,
  /** ADS viewmodel DOF disc radius (UV x) at ads=1. */
  adsDofRadius: ADS_DOF_RADIUS,
  /** Barrel heat glow mul (0 = off, 2 = strong). Default 1. */
  barrelHeat: BARREL_HEAT_DEFAULT,
  /** Colorless haze warp / displace (0 = off). Independent of barrel emissive. */
  heatHazeStrength: HEAT_HAZE_STRENGTH_DEFAULT,
  /** Noise scale + height-fog band mul. 1 = authored. */
  heatHazeSize: HEAT_HAZE_SIZE_DEFAULT,
  /** Fullscreen ground/height-fog heat post. Default OFF (fog slap). */
  groundHeatHaze: GROUND_HEAT_HAZE_DEFAULT,
  /** Visual disc + sky-shader halo (degrees). Must not enlarge the bloom kernel. */
  sunSize: SUN_SIZE_DEFAULT,
  /** Core brightness of the disc. Soft-clamped; halo stays dimmer. */
  sunPunch: SUN_PUNCH_DEFAULT,
  /** Procedural cloud cover (0 = clear). Stars follow the clock. */
  clouds: CLOUDS_DEFAULT,
};

const LOOK_SENS_BASE = 0.0022;
const ADS_LOOK_MUL_BASE = 1;

function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smooth01(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}
/** Ease in, hold the lifted pose, ease out over a 0–1 reload clock. */
function reloadLiftEnvelope(u) {
  const enter = smooth01(u / 0.2);
  const leave = 1 - smooth01((u - 0.8) / 0.2);
  return enter * leave;
}
function resolve(p) {
  return {
    x: p.x, y: p.y, z: p.z,
    rotX: p.rotX ?? 0, rotY: p.rotY ?? 0, rotZ: p.rotZ ?? 0,
  };
}
function adsCantedHome() {
  // Runtime: U-cycle homeHold. Authoring: unaimedHoldKey() (poseKey) plus ads_cant dropdown.
  if (state.panelOpen && state.poseKey === "ads_cant") return true;
  return unaimedHoldKey() === "hip_cant";
}
function adsPose(cfg, profile) {
  const iron = cfg.ads;
  if (adsCantedHome()) return cfg.ads_cant ?? iron;
  if (profile === "sniper_scope") return cfg.ads_sniper_scope ?? cfg.ads_acog ?? cfg.ads_holo ?? iron;
  if (profile === "acog") return cfg.ads_acog ?? cfg.ads_holo ?? iron;
  if (profile === "holo") return cfg.ads_holo ?? iron;
  return iron;
}
function blendPoses(a, b, t) {
  t = clamp(t, 0, 1);
  return {
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t),
    rotX: lerp(a.rotX, b.rotX, t), rotY: lerp(a.rotY, b.rotY, t), rotZ: lerp(a.rotZ, b.rotZ, t),
  };
}
function normalizeHomeHold(key) {
  return HOME_HOLD_KEYS.includes(key) ? key : "hip";
}
function unaimedHoldKey() {
  if (state.panelOpen && (HOME_HOLD_KEYS.includes(state.poseKey) || state.poseKey === "sprint_high")) {
    return state.poseKey;
  }
  return normalizeHomeHold(state.homeHold);
}
function unaimedHoldPose(cfg) {
  const key = unaimedHoldKey();
  return resolve(cfg[key] || cfg.hip);
}
function cycleHomeHold() {
  const cur = normalizeHomeHold(state.homeHold);
  const i = HOME_HOLD_KEYS.indexOf(cur);
  state.homeHold = HOME_HOLD_KEYS[(i + 1) % HOME_HOLD_KEYS.length];
  scheduleSaveSettings();
  showToast("Hold: " + HOME_HOLD_LABELS[state.homeHold]);
}
function blendHold(cfg, profile, t, sprintT) {
  t = clamp(t, 0, 1);
  if (sprintT == null) sprintT = state.sprintHoldT || 0;
  sprintT = clamp(sprintT, 0, 1);
  let hip = unaimedHoldPose(cfg);
  if (sprintT > 0.001 && unaimedHoldKey() !== "sprint_high") {
    hip = blendPoses(hip, resolve(cfg.sprint_high || cfg.hip), sprintT);
  }
  // Sprint steals high-ready for the whole sprint — do not lerp toward ads / ads_cant.
  const adsT = t * (1 - sprintT);
  if (adsT < 0.001) return hip;
  const ads = resolve(adsPose(cfg, profile));
  return blendPoses(hip, ads, adsT);
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

function currentMagId(weaponId = state.weaponId) {
  return state.magByWeapon[weaponId] || DEFAULT_MAG[weaponId] || "smg_20";
}

function magSpecForLoadout() {
  // Capacity follows the seated mag, not the optic — a scope on the DMR keeps the 20-rd mag.
  const mag = MAG_KINDS[currentMagId()] || MAG_KINDS.smg_20;
  return {
    capacity: mag.capacity,
    reloadSec: MAG_RELOAD_SEC[state.weaponId] || 1.2,
    magId: mag.id,
    shape: mag.shape,
  };
}

function suppressorMounted(weaponId = state.weaponId) {
  return !!state.suppressorByWeapon[weaponId];
}

function magAllowedOnWeapon(magId, weaponId = state.weaponId) {
  const mag = MAG_KINDS[magId];
  return !!(mag && mag.weaponId === weaponId);
}

function isBoltGun(weaponId = state.weaponId) {
  return weaponId === "example_sniper";
}

function weaponSupportsAuto(weaponId = state.weaponId) {
  return weaponId === "example_smg";
}

function isAutoFire() {
  return state.fireMode === "auto" && weaponSupportsAuto();
}

function updateFireModeHud() {
  const node = el("fireModeHud");
  if (!node) return;
  node.style.visibility = state.handsEmpty ? "hidden" : "";
  if (state.handsEmpty) return;
  const auto = isAutoFire();
  node.textContent = auto ? "AUTO" : "SEMI";
  node.classList.toggle("auto", auto);
}

function toggleFireMode() {
  if (state.handsEmpty) return;
  if (!weaponSupportsAuto()) {
    if (!state.semiOnlyToasted) {
      state.semiOnlyToasted = true;
      showToast("Semi only");
    }
    updateFireModeHud();
    return;
  }
  state.fireMode = state.fireMode === "auto" ? "semi" : "auto";
  updateFireModeHud();
  showToast(state.fireMode === "auto" ? "AUTO" : "SEMI");
}

function cancelBoltCycle() {
  state.boltCycling = false;
  state.boltElapsed = 0;
  state.boltEjected = false;
  resetBoltVisual();
}

function beginBoltCycle() {
  state.boltCycling = true;
  state.boltElapsed = 0;
  state.boltDuration = BOLT_CYCLE_SEC;
  state.boltEjected = false;
}

function resetBoltVisual() {
  if (!boltMesh || !boltMesh.userData.base) return;
  const b = boltMesh.userData.base;
  boltMesh.position.set(b.x, b.y, b.z);
  boltMesh.rotation.set(b.rotX || 0, b.rotY || 0, b.rotZ || 0, "XYZ");
}

function updateBoltCycle(dt) {
  if (!state.boltCycling) {
    resetBoltVisual();
    return;
  }
  state.boltElapsed += dt;
  const dur = Math.max(0.05, state.boltDuration || BOLT_CYCLE_SEC);
  const u = Math.min(1, state.boltElapsed / dur);
  // Lift 0.08–0.22, pull back 0.18–0.42, return 0.48–0.82, drop 0.70–0.92.
  const lift = smooth01((u - 0.08) / 0.14) * (1 - smooth01((u - 0.70) / 0.18));
  const back = smooth01((u - 0.18) / 0.18) * (1 - smooth01((u - 0.48) / 0.22));
  if (boltMesh && boltMesh.userData.base) {
    const b = boltMesh.userData.base;
    boltMesh.position.set(b.x, b.y, b.z + 0.055 * back);
    boltMesh.rotation.set(b.rotX || 0, b.rotY || 0, (b.rotZ || 0) - 0.85 * lift, "XYZ");
  }
  if (!state.boltEjected && u >= 0.32) {
    spawnCasing();
    state.boltEjected = true;
    sfx.play("dry");
  }
  if (u >= 1) cancelBoltCycle();
}

function syncAmmoForLoadout({ refill = false } = {}) {
  const spec = magSpecForLoadout();
  state.reloadDuration = spec.reloadSec;
  if (refill || state.ammoInMag > spec.capacity) {
    state.ammoInMag = spec.capacity;
  }
  if (state.reloading) {
    // Cancel in-progress reload on weapon/optic swap; keep remaining rounds.
    state.reloading = false;
    state.reloadElapsed = 0;
  }
  cancelBoltCycle();
  resetMagVisual();
  updateAmmoHud();
  updateFireModeHud();
}

function resetMagVisual() {
  if (!magMesh) return;
  magMesh.visible = true;
  magMesh.position.set(0, 0, 0);
  magMesh.rotation.set(0, 0, 0);
  magMesh.scale.set(1, 1, 1);
}

function updateAmmoHud() {
  const cluster = el("ammoCluster");
  if (cluster) cluster.hidden = !!state.handsEmpty;
  const node = el("ammoHud");
  if (!node) return;
  if (state.handsEmpty) return;
  const cap = magSpecForLoadout().capacity;
  if (state.reloading) {
    node.textContent = `RELOADING… ${state.ammoInMag}/${cap}`;
    node.classList.add("reloading");
  } else {
    node.textContent = `${state.ammoInMag}/${cap} · ∞`;
    node.classList.toggle("empty", state.ammoInMag <= 0);
    node.classList.remove("reloading");
  }
}

function beginReload() {
  if (!gameplayActive()) return;
  if (state.handsEmpty) return;
  if (state.reloading) return;
  const spec = magSpecForLoadout();
  if (state.ammoInMag >= spec.capacity) return;
  cancelBoltCycle();
  state.reloading = true;
  state.reloadElapsed = 0;
  state.reloadDuration = spec.reloadSec;
  sfx.play("dry"); // existing click — mag release
  updateAmmoHud();
}

function finishReload() {
  const spec = magSpecForLoadout();
  state.ammoInMag = spec.capacity; // infinite reserve
  state.reloading = false;
  state.reloadElapsed = 0;
  resetMagVisual();
  sfx.play("dry"); // existing click — mag seated
  updateAmmoHud();
}

function updateReload(dt) {
  if (!state.reloading) {
    resetMagVisual();
    return;
  }
  state.reloadElapsed += dt;
  const dur = Math.max(0.05, state.reloadDuration || 1.2);
  const t = Math.min(1, state.reloadElapsed / dur);
  // Mag unseats down the well, drops, then the seated size/shape slams in from below.
  if (magMesh) {
    applyReloadMagMotion(t);
  }
  if (t >= 1) finishReload();
  else updateAmmoHud();
}

function applyReloadMagMotion(u) {
  const m = magMesh;
  if (!m) return;
  m.scale.set(1, 1, 1);
  // Bottom-feed along the well. Sniper clip also kicks a bit forward-down (muzzle is -Z).
  const sniper = state.weaponId === "example_sniper";
  const kickX = sniper ? 0.03 : 0.012;
  const kickZ = sniper ? -0.22 : 0.03;
  if (u < 0.16) {
    // Unseat downward along the well — readable slide, not a centimetre nudge.
    const k = smooth01(u / 0.16);
    m.visible = true;
    m.position.set(0.006 * k, -0.10 * k, (sniper ? -0.02 : 0.006) * k);
    m.rotation.set(0.10 * k, 0, 0.05 * k);
  } else if (u < 0.44) {
    // Clear the lips and fall with a tumble — tens of cm in viewmodel space.
    const k = (u - 0.16) / 0.28;
    const fall = k * k;
    m.visible = k < 0.9;
    m.position.set(kickX * fall, -0.10 - 0.38 * fall, kickZ * fall);
    m.rotation.set(0.10 + 1.15 * k, 0.45 * k, 0.05 + 1.05 * k);
  } else if (u < 0.56) {
    m.visible = false;
    m.position.set(kickX, -0.48, kickZ);
    m.rotation.set(0.7, 0.3, 0.55);
  } else if (u < 0.86) {
    const t = (u - 0.56) / 0.30;
    const k = t * t; // ease-in: travel is visible, last beat slams the well
    m.visible = true;
    // Same seated shape rises from below and slams into the well.
    const y = lerp(-0.38, 0.018, k);
    m.position.set(lerp(0.02, 0, k), y, lerp(-0.04, 0, k));
    m.rotation.set(lerp(0.38, 0, k), 0, lerp(-0.14, 0, k));
  } else {
    const k = smooth01((u - 0.86) / 0.14);
    m.visible = true;
    m.position.set(0, lerp(0.018, 0, k), 0);
    m.rotation.set(0, 0, 0);
  }
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
  noiseBufs: Object.create(null),
  noiseBuffer(duration = 0.08) {
    const c = this.ensure();
    if (!c) return null;
    const key = String(duration);
    const hit = this.noiseBufs[key];
    if (hit && hit.sampleRate === c.sampleRate) return hit;
    const n = Math.max(1, Math.floor(c.sampleRate * duration));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBufs[key] = buf;
    return buf;
  },
  /** Build glass + fizzle noise + silently tick the graph so first bulb-pop is not first-use. */
  prewarmGlass() {
    const c = this.ensure();
    if (!c) return;
    this.noiseBuffer(0.08);
    this.noiseBuffer(0.7);
    if (c.state !== "running") return;
    try {
      const now = c.currentTime;
      const out = c.createGain();
      out.gain.value = 0;
      out.connect(c.destination);
      const noise = c.createBufferSource();
      noise.buffer = this.noiseBuffer(0.08);
      noise.connect(out);
      noise.start(now);
      noise.stop(now + 0.001);
      const fizz = c.createBufferSource();
      fizz.buffer = this.noiseBuffer(0.7);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1800;
      fizz.connect(bp);
      bp.connect(out);
      fizz.start(now);
      fizz.stop(now + 0.001);
    } catch (_) {}
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
      return;
    }

    if (kind === "dry") {
      // Short metallic click — empty mag, no tracer
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.18, now + 0.002);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      const osc = c.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);
      osc.connect(out);
      osc.start(now);
      osc.stop(now + 0.06);
      const click = c.createOscillator();
      click.type = "square";
      click.frequency.value = 1100;
      const cg = c.createGain();
      cg.gain.setValueAtTime(0.0001, now);
      cg.gain.exponentialRampToValueAtTime(0.08, now + 0.001);
      cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
      click.connect(cg);
      cg.connect(c.destination);
      click.start(now);
      click.stop(now + 0.03);
      return;
    }

    if (kind === "glass") {
      // Cheap bulb pop — high noise + two tinkle tones.
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.28, now + 0.003);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      const noise = c.createBufferSource();
      noise.buffer = this.noiseBuffer(0.08);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 4200;
      bp.Q.value = 0.9;
      noise.connect(bp);
      bp.connect(out);
      noise.start(now);
      noise.stop(now + 0.08);
      const tinkle = (freq, delay, dur) => {
        const osc = c.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + delay);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.55, now + delay + dur);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, now + delay);
        g.gain.exponentialRampToValueAtTime(0.16, now + delay + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur + 0.02);
      };
      tinkle(2480, 0, 0.14);
      tinkle(3720, 0.018, 0.12);
      return;
    }

    if (kind === "fizzle") {
      // Dying-filament zzzz — filtered noise, pitch + gain falling.
      const dur = 0.35 + Math.random() * 0.35;
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.14, now + 0.01);
      out.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      const noise = c.createBufferSource();
      noise.buffer = this.noiseBuffer(0.7);
      noise.loop = true;
      noise.playbackRate.setValueAtTime(1.15, now);
      noise.playbackRate.exponentialRampToValueAtTime(0.32, now + dur);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(3200, now);
      bp.frequency.exponentialRampToValueAtTime(420, now + dur);
      bp.Q.setValueAtTime(7.5, now);
      bp.Q.linearRampToValueAtTime(2.4, now + dur);
      noise.connect(bp);
      bp.connect(out);
      noise.start(now);
      noise.stop(now + dur);
      return;
    }

    if (kind === "shatter") {
      // Cheap bottle break — burst noise + a few falling tinkles.
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.32, now + 0.002);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      const noise = c.createBufferSource();
      noise.buffer = this.noiseBuffer(0.11);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 3100;
      bp.Q.value = 0.7;
      noise.connect(bp);
      bp.connect(out);
      noise.start(now);
      noise.stop(now + 0.1);
      const tinkle = (freq, delay, dur, peak) => {
        const osc = c.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + delay);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.45, now + delay + dur);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, now + delay);
        g.gain.exponentialRampToValueAtTime(peak, now + delay + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
        osc.connect(g);
        g.connect(c.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur + 0.02);
      };
      tinkle(2650, 0, 0.16, 0.18);
      tinkle(3920, 0.012, 0.14, 0.14);
      tinkle(1840, 0.028, 0.18, 0.10);
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
  scheduleSaveSettings();
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
  scheduleSaveSettings();
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
  scheduleSaveSettings();
}

/** Ballistic zero in meters. Irons are locked at 100; holo / acog / sniper use stored zeroDist. */
function effectiveZeroDist() {
  return state.optic === "iron" ? 100 : (state.zeroDist || 100);
}

function applyCameraClip() {
  if (!camera) return;
  const near = Math.max(0.001, Math.min(2, Number(state.camNear) || 0.05));
  const far = Math.max(near + 10, Math.min(5000, Number(state.camFar) || 2000));
  state.camNear = near;
  state.camFar = far;
  camera.near = near;
  camera.far = far;
  camera.updateProjectionMatrix();
}

function setCamNear(v, { toast = false } = {}) {
  state.camNear = parseFloat(v);
  applyCameraClip();
  const inp = el("camNearInput");
  if (inp) inp.value = String(state.camNear);
  const slider = el("camNearSlider");
  if (slider) slider.value = String(state.camNear);
  const val = el("camNearVal");
  if (val) val.textContent = state.camNear.toFixed(3);
  if (toast) showToast(`Camera near ${state.camNear}`);
  scheduleSaveSettings();
}

function setCamFar(v, { toast = false } = {}) {
  state.camFar = parseFloat(v);
  applyCameraClip();
  const inp = el("camFarInput");
  if (inp) inp.value = String(Math.round(state.camFar));
  const slider = el("camFarSlider");
  if (slider) slider.value = String(state.camFar);
  const val = el("camFarVal");
  if (val) val.textContent = String(Math.round(state.camFar));
  if (toast) showToast(`Camera far ${Math.round(state.camFar)}`);
  scheduleSaveSettings();
}

/** Apply linear scene fog from Settings; null when disabled. Color tracks bg/clear. */
function applyFog() {
  if (!scene) return;
  const near = clamp(Number(state.fogNear) || 375, 20, 450);
  let far = clamp(Number(state.fogFar) || 520, 200, 650);
  if (far <= near) far = Math.min(650, near + 10);
  state.fogNear = near;
  state.fogFar = far;

  if (!state.fogEnabled) {
    scene.fog = null;
    return;
  }

  // Night: pull fog in a little so near floods read, still hide the 410 m berm.
  const pal = sampleTod(state.timeOfDay);
  const nightBlend = clamp((0.25 - (pal.sunI || 0)) / 0.25, 0, 1);
  let nearUse = near;
  let farUse = far;
  if (nightBlend > 0) {
    const nightNear = Math.max(220, near * 0.78);
    const nightFar = Math.max(nightNear + 40, Math.min(far, 450));
    nearUse = lerp(near, nightNear, nightBlend);
    farUse = lerp(far, nightFar, nightBlend);
  }

  let hex = SCENE_BG_BASE;
  if (scene.background && scene.background.isColor) {
    hex = scene.background.getHex();
  }
  if (scene.fog && scene.fog.isFog) {
    scene.fog.near = nearUse;
    scene.fog.far = farUse;
    scene.fog.color.setHex(hex);
  } else {
    scene.fog = new THREE.Fog(hex, nearUse, farUse);
  }
}

function setFogEnabled(on, { toast = false } = {}) {
  state.fogEnabled = !!on;
  applyFog();
  const chk = el("chkFog");
  if (chk) chk.checked = state.fogEnabled;
  if (toast) showToast(state.fogEnabled ? "Fog ON" : "Fog OFF");
  scheduleSaveSettings();
}

function setFogNear(v, { toast = false } = {}) {
  state.fogNear = parseFloat(v);
  applyFog();
  const slider = el("fogNearSlider");
  const val = el("fogNearVal");
  if (slider) slider.value = String(state.fogNear);
  if (val) val.textContent = String(Math.round(state.fogNear));
  const farSlider = el("fogFarSlider");
  const farVal = el("fogFarVal");
  if (farSlider) farSlider.value = String(state.fogFar);
  if (farVal) farVal.textContent = String(Math.round(state.fogFar));
  if (toast) showToast(`Fog near ${Math.round(state.fogNear)}`);
  scheduleSaveSettings();
}

function setFogFar(v, { toast = false } = {}) {
  state.fogFar = parseFloat(v);
  applyFog();
  const slider = el("fogFarSlider");
  const val = el("fogFarVal");
  if (slider) slider.value = String(state.fogFar);
  if (val) val.textContent = String(Math.round(state.fogFar));
  const nearSlider = el("fogNearSlider");
  const nearVal = el("fogNearVal");
  if (nearSlider) nearSlider.value = String(state.fogNear);
  if (nearVal) nearVal.textContent = String(Math.round(state.fogNear));
  if (toast) showToast(`Fog far ${Math.round(state.fogFar)}`);
  scheduleSaveSettings();
}

function formatFadeLabel(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n) || n <= 0) return "never";
  return `${Math.round(n)}s`;
}

function formatDrawLabel(m) {
  const n = Number(m);
  if (!Number.isFinite(n)) return "0 m";
  return `${Math.round(n)} m`;
}

function syncFxSettingsUI() {
  const holeCapSlider = el("holeCapSlider");
  const holeCapVal = el("holeCapVal");
  if (holeCapSlider && document.activeElement !== holeCapSlider) holeCapSlider.value = String(state.holeCap);
  if (holeCapVal) holeCapVal.textContent = String(Math.round(state.holeCap));
  const casingCapSlider = el("casingCapSlider");
  const casingCapVal = el("casingCapVal");
  if (casingCapSlider && document.activeElement !== casingCapSlider) casingCapSlider.value = String(state.casingCap);
  if (casingCapVal) casingCapVal.textContent = String(Math.round(state.casingCap));
  const holeFadeSlider = el("holeFadeSlider");
  const holeFadeVal = el("holeFadeVal");
  if (holeFadeSlider && document.activeElement !== holeFadeSlider) holeFadeSlider.value = String(state.holeFade);
  if (holeFadeVal) holeFadeVal.textContent = formatFadeLabel(state.holeFade);
  const casingFadeSlider = el("casingFadeSlider");
  const casingFadeVal = el("casingFadeVal");
  if (casingFadeSlider && document.activeElement !== casingFadeSlider) casingFadeSlider.value = String(state.casingFade);
  if (casingFadeVal) casingFadeVal.textContent = formatFadeLabel(state.casingFade);
  const casingDrawSlider = el("casingDrawSlider");
  const casingDrawVal = el("casingDrawVal");
  if (casingDrawSlider && document.activeElement !== casingDrawSlider) casingDrawSlider.value = String(state.casingDraw);
  if (casingDrawVal) casingDrawVal.textContent = formatDrawLabel(state.casingDraw);
  const decalDrawSlider = el("decalDrawSlider");
  const decalDrawVal = el("decalDrawVal");
  if (decalDrawSlider && document.activeElement !== decalDrawSlider) decalDrawSlider.value = String(state.decalDraw);
  if (decalDrawVal) decalDrawVal.textContent = formatDrawLabel(state.decalDraw);
}

function setHoleCap(v, { toast = false } = {}) {
  state.holeCap = Math.round(clamp(parseFloat(v), IMPACT_DECAL_CAP_MIN, IMPACT_DECAL_CAP_MAX));
  if (!Number.isFinite(state.holeCap)) state.holeCap = IMPACT_DECAL_MAX;
  trimImpactDecals();
  syncFxSettingsUI();
  if (toast) showToast(`Hole cap ${state.holeCap}`);
  scheduleSaveSettings();
}

function setCasingCap(v, { toast = false } = {}) {
  state.casingCap = Math.round(clamp(parseFloat(v), CASING_CAP_MIN, CASING_CAP_MAX));
  if (!Number.isFinite(state.casingCap)) state.casingCap = CASING_MAX;
  trimCasings();
  trimSpentSlugs();
  syncFxSettingsUI();
  if (toast) showToast(`Casing cap ${state.casingCap}`);
  scheduleSaveSettings();
}

function setHoleFade(v, { toast = false } = {}) {
  state.holeFade = Math.round(clamp(parseFloat(v), 0, HOLE_FADE_MAX));
  if (!Number.isFinite(state.holeFade)) state.holeFade = HOLE_FADE_SEC;
  expireImpactDecals();
  syncFxSettingsUI();
  if (toast) showToast(state.holeFade <= 0 ? "Hole fade off (FIFO)" : `Hole fade ${state.holeFade}s`);
  scheduleSaveSettings();
}

function setCasingFade(v, { toast = false } = {}) {
  state.casingFade = Math.round(clamp(parseFloat(v), 0, CASING_FADE_MAX));
  if (!Number.isFinite(state.casingFade)) state.casingFade = CASING_FADE_SEC;
  expireCasings();
  syncFxSettingsUI();
  if (toast) showToast(state.casingFade <= 0 ? "Casing fade off (cap)" : `Casing fade ${state.casingFade}s`);
  scheduleSaveSettings();
}

function setCasingDraw(v, { toast = false } = {}) {
  state.casingDraw = Math.round(clamp(parseFloat(v), CASING_DRAW_MIN, CASING_DRAW_MAX));
  if (!Number.isFinite(state.casingDraw)) state.casingDraw = CASING_DRAW_DEFAULT;
  applyFxDrawDistances();
  syncFxSettingsUI();
  if (toast) showToast(`Casing draw ${state.casingDraw} m`);
  scheduleSaveSettings();
}

function setDecalDraw(v, { toast = false } = {}) {
  state.decalDraw = Math.round(clamp(parseFloat(v), DECAL_DRAW_MIN, DECAL_DRAW_MAX) / 10) * 10;
  if (!Number.isFinite(state.decalDraw)) state.decalDraw = DECAL_DRAW_DEFAULT;
  applyFxDrawDistances();
  syncFxSettingsUI();
  if (toast) showToast(`Decal draw ${state.decalDraw} m`);
  scheduleSaveSettings();
}

function wrapHour(h) {
  const x = Number(h);
  if (!Number.isFinite(x)) return TOD_DEFAULT;
  let v = x % 24;
  if (v < 0) v += 24;
  return v;
}

function formatClock(h) {
  const x = wrapHour(h);
  let hh = Math.floor(x + 1e-8);
  let mm = Math.round((x - hh) * 60);
  if (mm >= 60) { mm = 0; hh += 1; }
  if (hh >= 24) hh = 0;
  return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}

/** Keyframed scene lighting. 18:30 keeps the dusk range (SCENE_BG_BASE / warm key) with a stronger key vs cooler fill. */
const TOD_KEYS = [
  { h: 0, sky: 0x000000, hemiSky: 0x141c28, hemiGnd: 0x0c0a08, amb: 0x121820, sun: 0x1a2430, fill: 0x6a7c94, rim: 0x283038, sunI: 0, hemiI: 0.06, ambI: 0.03, fillI: 0.04, rimI: 0.03, moonI: 0.08, exp: 1.05 },
  { h: 5.2, sky: 0x000000, hemiSky: 0x2a2438, hemiGnd: 0x14100c, amb: 0x1c1828, sun: 0xff8860, fill: 0x5a6c88, rim: 0x2a2434, sunI: 0, hemiI: 0.08, ambI: 0.04, fillI: 0.06, rimI: 0.04, moonI: 0.06, exp: 1.04 },
  { h: 6.05, sky: 0x241c1e, hemiSky: 0xffb090, hemiGnd: 0x4a3020, amb: 0x8a6050, sun: 0xff9966, fill: 0x6a7898, rim: 0x4a3c50, sunI: 0.32, hemiI: 0.18, ambI: 0.08, fillI: 0.14, rimI: 0.10, moonI: 0.03, exp: 1.02 },
  { h: 6.7, sky: 0x4a5468, hemiSky: 0xffd0b0, hemiGnd: 0x5a4030, amb: 0xa07860, sun: 0xffb080, fill: 0x7a90b8, rim: 0x5a4c60, sunI: 0.58, hemiI: 0.26, ambI: 0.10, fillI: 0.18, rimI: 0.12, moonI: 0.01, exp: 0.98 },
  { h: 9.0, sky: 0x6a8aa0, hemiSky: 0xd8e4f0, hemiGnd: 0x5a5448, amb: 0x9098a0, sun: 0xfff0dc, fill: 0x88a0c0, rim: 0x5a6878, sunI: 0.78, hemiI: 0.34, ambI: 0.12, fillI: 0.20, rimI: 0.14, moonI: 0, exp: 0.94 },
  { h: 12.0, sky: 0x7a96aa, hemiSky: 0xe4ecf2, hemiGnd: 0x6a6458, amb: 0xa0a8b0, sun: 0xe8eef2, fill: 0x90a8c4, rim: 0x687888, sunI: 0.86, hemiI: 0.36, ambI: 0.12, fillI: 0.22, rimI: 0.14, moonI: 0, exp: 0.92 },
  { h: 16.0, sky: 0x5a7488, hemiSky: 0xe0d0b8, hemiGnd: 0x5a4c40, amb: 0x988878, sun: 0xffd4a8, fill: 0x7890b0, rim: 0x586878, sunI: 0.80, hemiI: 0.32, ambI: 0.11, fillI: 0.20, rimI: 0.14, moonI: 0, exp: 0.96 },
  { h: 18.5, sky: 0x1c2430, hemiSky: 0x8a9aac, hemiGnd: 0x3a3228, amb: 0x4a5460, sun: 0xfff1dd, fill: 0x5a7aaa, rim: 0x445566, sunI: 1.18, hemiI: 0.32, ambI: 0.12, fillI: 0.28, rimI: 0.18, moonI: 0, exp: 1.00 },
  { h: 20.0, sky: 0x010101, hemiSky: 0x2a3444, hemiGnd: 0x181410, amb: 0x1c2430, sun: 0xff7040, fill: 0x4a6080, rim: 0x283038, sunI: 0.04, hemiI: 0.10, ambI: 0.05, fillI: 0.08, rimI: 0.05, moonI: 0.05, exp: 1.04 },
  { h: 21.0, sky: 0x000000, hemiSky: 0x141c28, hemiGnd: 0x0c0a08, amb: 0x121820, sun: 0x202830, fill: 0x6a7c94, rim: 0x283038, sunI: 0, hemiI: 0.06, ambI: 0.03, fillI: 0.04, rimI: 0.03, moonI: 0.08, exp: 1.05 },
  { h: 22.0, sky: 0x000000, hemiSky: 0x141c28, hemiGnd: 0x0c0a08, amb: 0x121820, sun: 0x202830, fill: 0x6a7c94, rim: 0x283038, sunI: 0, hemiI: 0.06, ambI: 0.03, fillI: 0.04, rimI: 0.03, moonI: 0.08, exp: 1.05 },
  { h: 24.0, sky: 0x000000, hemiSky: 0x141c28, hemiGnd: 0x0c0a08, amb: 0x121820, sun: 0x1a2430, fill: 0x6a7c94, rim: 0x283038, sunI: 0, hemiI: 0.06, ambI: 0.03, fillI: 0.04, rimI: 0.03, moonI: 0.08, exp: 1.05 },
];

function hexRgb(hex) {
  return [((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255];
}

function sampleTod(hour) {
  const h = wrapHour(hour);
  const keys = TOD_KEYS;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].h <= h) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const span = Math.max(1e-6, b.h - a.h);
  const t = clamp((h - a.h) / span, 0, 1);
  const u = t * t * (3 - 2 * t);
  const mixC = (ka, kb) => {
    const ca = hexRgb(a[ka]);
    const cb = hexRgb(b[kb || ka]);
    return new THREE.Color(lerp(ca[0], cb[0], u), lerp(ca[1], cb[1], u), lerp(ca[2], cb[2], u));
  };
  const mixN = (k) => lerp(a[k], b[k], u);
  return {
    sky: mixC("sky"),
    hemiSky: mixC("hemiSky"),
    hemiGnd: mixC("hemiGnd"),
    amb: mixC("amb"),
    sun: mixC("sun"),
    fill: mixC("fill"),
    rim: mixC("rim"),
    sunI: mixN("sunI"),
    hemiI: mixN("hemiI"),
    ambI: mixN("ambI"),
    fillI: mixN("fillI"),
    rimI: mixN("rimI"),
    moonI: mixN("moonI"),
    exp: mixN("exp"),
  };
}

/** Simple sun path: rise ~6:05, set ~19:42, noon elevation capped. Not an astro sim. */
function sunPath(hour) {
  const h = wrapHour(hour);
  const rise = 6.05;
  const set = 19.7;
  const span = set - rise;
  const dayT = (h - rise) / span;
  let elevDeg;
  if (dayT > 0 && dayT < 1) {
    elevDeg = Math.sin(dayT * Math.PI) * 56;
  } else {
    const nightSpan = 24 - span;
    const nt = h < rise ? (h + (24 - set)) / nightSpan : (h - set) / nightSpan;
    elevDeg = -6 - 16 * Math.sin(clamp(nt, 0, 1) * Math.PI);
  }
  let azDeg = 90 + dayT * 180;
  azDeg = ((azDeg % 360) + 360) % 360;
  return { elevDeg, azDeg, dayT };
}

function ensureSkyDiscs() {
  if (!scene) return;
  if (!sunDisc) {
    // Tiny HDR seed for bloom. Sky shader already draws the sun halo.
    sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe4b8, fog: false, depthTest: true, depthWrite: false, toneMapped: false })
    );
    sunDisc.material.color.setRGB(1.6, 1.35, 0.95);
    sunDisc.renderOrder = -10;
    sunDisc.raycast = () => {};
    scene.add(sunDisc);
  }
  if (!moonDisc) {
    moonDisc = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xc8d4e4, fog: false, depthTest: true, depthWrite: false, transparent: true, opacity: 0.55, toneMapped: false })
    );
    moonDisc.renderOrder = -9;
    moonDisc.raycast = () => {};
    scene.add(moonDisc);
  }
  ensureSkyDome();
}

/** Inverted sky sphere: ToD gradient, sun/moon halo, hashed stars, FBM clouds. */
function ensureSkyDome() {
  if (!scene || skyDome) return;
  skyMat = new THREE.ShaderMaterial({
    name: "ProceduralSky",
    uniforms: {
      sunDir: { value: new THREE.Vector3(0.35, 0.78, 0.4) },
      moonDir: { value: new THREE.Vector3(-0.35, 0.78, -0.4) },
      zenithColor: { value: new THREE.Color(0x101820) },
      horizonColor: { value: new THREE.Color(SCENE_BG_BASE) },
      twilightColor: { value: new THREE.Color(0xff9966) },
      fogColor: { value: new THREE.Color(SCENE_BG_BASE) },
      sunColor: { value: new THREE.Color(0xfff1dd) },
      moonColor: { value: new THREE.Color(0xb8c8dc) },
      cloudColor: { value: new THREE.Color(0xd8c8b4) },
      sunHalo: { value: 1 },
      sunAngular: { value: (SUN_SIZE_DEFAULT * Math.PI / 180) * 0.5 },
      moonHalo: { value: 0 },
      starAmt: { value: 0 },
      cloudAmt: { value: CLOUDS_DEFAULT },
      twilightAmt: { value: 0.5 },
      hazeAmt: { value: 0.7 },
      skyTime: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec3 vWorldDir;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldDir = world.xyz - cameraPosition;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 sunDir;
      uniform vec3 moonDir;
      uniform vec3 zenithColor;
      uniform vec3 horizonColor;
      uniform vec3 twilightColor;
      uniform vec3 fogColor;
      uniform vec3 sunColor;
      uniform vec3 moonColor;
      uniform vec3 cloudColor;
      uniform float sunHalo;
      uniform float sunAngular;
      uniform float moonHalo;
      uniform float starAmt;
      uniform float cloudAmt;
      uniform float twilightAmt;
      uniform float hazeAmt;
      uniform float skyTime;
      varying vec3 vWorldDir;

      #include <common>
      #include <logdepthbuf_pars_fragment>

      float hash13(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.zyx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      float vnoise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        vec3 u = f * f * (3.0 - 2.0 * f);
        float n000 = hash13(i);
        float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
        float nx00 = mix(n000, n100, u.x);
        float nx10 = mix(n010, n110, u.x);
        float nx01 = mix(n001, n101, u.x);
        float nx11 = mix(n011, n111, u.x);
        return mix(mix(nx00, nx10, u.y), mix(nx01, nx11, u.y), u.z);
      }

      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 6; i++) {
          v += a * vnoise(p);
          p = p * 2.07 + vec3(11.2, 4.7, 19.1);
          a *= 0.5;
        }
        return v;
      }

      float starLayer(vec3 dir, float scale, float thresh, float time, float twSpeed) {
        vec3 p = dir * scale;
        vec3 i = floor(p);
        vec3 f = fract(p) - 0.5;
        float n = hash13(i);
        if (n < thresh) return 0.0;
        vec3 j = vec3(
          hash13(i + vec3(1.7, 0.2, 4.1)),
          hash13(i + vec3(3.1, 2.4, 0.8)),
          hash13(i + vec3(0.3, 5.2, 1.9))
        ) - 0.5;
        float dist = length(f - j * 0.42);
        float tw = 0.72 + 0.28 * sin(time * twSpeed + n * 41.0);
        float mag = (n - thresh) / max(1e-4, 1.0 - thresh);
        return smoothstep(0.038, 0.0, dist) * mag * tw;
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float elev = dir.y;
        float zenMix = smoothstep(-0.06, 0.72, elev);
        zenMix = pow(clamp(zenMix, 0.0, 1.0), 0.82);
        vec3 col = mix(horizonColor, zenithColor, zenMix);

        float hBand = exp(-pow(elev / 0.13, 2.0));
        vec3 sunAz = normalize(vec3(sunDir.x, 0.0, sunDir.z) + vec3(1e-5, 0.0, 0.0));
        vec3 dirAz = normalize(vec3(dir.x, 0.0, dir.z) + vec3(1e-5, 0.0, 0.0));
        float towardSun = clamp(dot(dirAz, sunAz) * 0.5 + 0.5, 0.0, 1.0);
        float tw = hBand * twilightAmt * (0.28 + 0.72 * towardSun);
        col = mix(col, twilightColor, tw);

        float haze = exp(-pow(max(elev, 0.0) / 0.20, 2.0));
        float below = smoothstep(0.04, -0.12, elev);
        col = mix(col, fogColor, haze * hazeAmt);
        col = mix(col, fogColor * 0.45, below * 0.85);

        float mu = clamp(dot(dir, normalize(sunDir)), -1.0, 1.0);
        float ang = acos(mu);
        float halfA = max(sunAngular, 8e-4);
        float disc = 1.0 - smoothstep(halfA * 0.78, halfA * 1.06, ang);
        col += sunColor * sunHalo * disc * 0.82;

        float haloW = halfA * 8.0;
        float glow = exp(-pow(ang / max(haloW, 1e-4), 2.05));
        float scatter = exp(-pow(ang / max(haloW * 2.4, 1e-4), 1.25));
        float limb = exp(-pow(ang / max(haloW * 1.55, 1e-4), 1.8)) * hBand;
        col += sunColor * sunHalo * (1.0 - disc) * (glow * 0.32 + scatter * 0.09 + limb * 0.14);

        float muM = clamp(dot(dir, normalize(moonDir)), 0.0, 1.0);
        col += moonColor * moonHalo * (pow(muM, 48.0) * 0.85 + pow(muM, 10.0) * 0.16);

        if (starAmt > 0.008 && elev > 0.018) {
          float skyFade = smoothstep(0.018, 0.14, elev);
          float s = starLayer(dir, 148.0, 0.9964, skyTime, 1.55);
          s += starLayer(dir, 76.0, 0.9938, skyTime, 0.85) * 0.42;
          s += starLayer(dir, 210.0, 0.9978, skyTime, 2.15) * 0.7;
          col += vec3(0.82, 0.88, 1.0) * s * starAmt * skyFade;
        }

        if (cloudAmt > 0.004 && elev > -0.06) {
          vec3 d1 = vec3(skyTime * 0.011, 0.0, skyTime * 0.0065);
          vec3 d2 = vec3(-skyTime * 0.0058, skyTime * 0.0016, skyTime * 0.0038);
          float n1 = fbm(dir * vec3(2.55, 0.92, 2.55) + d1);
          float n2 = fbm(dir * vec3(4.35, 1.45, 4.35) + vec3(17.0, 9.0, 4.0) + d2);
          float cloud = n1 * 0.64 + n2 * 0.36;
          cloud = smoothstep(0.40, 0.74, cloud);
          float band = smoothstep(-0.03, 0.13, elev) * smoothstep(0.94, 0.40, elev);
          cloud *= cloudAmt * band;
          vec3 ccol = cloudColor;
          ccol = mix(ccol, twilightColor, twilightAmt * 0.5 * (0.4 + 0.6 * towardSun));
          float shade = 0.72 + 0.28 * n2;
          col = mix(col, ccol * shade, cloud * 0.78);
        }

        gl_FragColor = vec4(col, 1.0);
        #include <logdepthbuf_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false,
    lights: false,
    toneMapped: true,
  });
  skyDome = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), skyMat);
  skyDome.scale.setScalar(90);
  skyDome.renderOrder = -20;
  skyDome.frustumCulled = false;
  skyDome.castShadow = false;
  skyDome.receiveShadow = false;
  skyDome.raycast = () => {};
  scene.add(skyDome);
}

function syncSkyUniforms(pal, path) {
  if (!skyMat) return;
  const u = skyMat.uniforms;
  const elDeg = path.elevDeg;
  const night = clamp((0.10 - (pal.sunI || 0)) / 0.10, 0, 1);
  const day = 1 - night;
  const twilight = smooth01(clamp((22 - Math.abs(elDeg)) / 18, 0, 1)) * (elDeg > -8 ? 1 : clamp((elDeg + 14) / 6, 0, 1));

  const zen = pal.sky.clone().lerp(pal.hemiSky, lerp(0.20, 0.035, night));
  if (night > 0.5) zen.multiplyScalar(lerp(1, 0.12, (night - 0.5) * 2));
  u.zenithColor.value.copy(zen);
  u.horizonColor.value.copy(pal.sky);
  const twc = pal.sun.clone().lerp(new THREE.Color(0xff7a4a), 0.45);
  twc.lerp(new THREE.Color(0xffc8a0), 0.25);
  u.twilightColor.value.copy(twc);
  if (scene.fog && scene.fog.color) u.fogColor.value.copy(scene.fog.color);
  else u.fogColor.value.copy(pal.sky);
  u.sunColor.value.copy(pal.sun);
  u.moonColor.value.setHex(0xb8c8dc);

  const cloudDay = new THREE.Color(0xe8e4dc);
  const cloudDusk = new THREE.Color(0xf0b080);
  const cloudNight = new THREE.Color(0x0a0c10);
  const cc = cloudDay.clone().lerp(cloudDusk, twilight * 0.85).lerp(cloudNight, night * 0.92);
  u.cloudColor.value.copy(cc);

  u.sunDir.value.copy(_keySunDir);
  _moonDir.copy(_keySunDir).multiplyScalar(-1);
  if (_moonDir.y < 0.18) {
    _moonDir.y = 0.18;
    _moonDir.normalize();
  }
  u.moonDir.value.copy(_moonDir);

  u.sunHalo.value = clamp((elDeg + 5.5) / 11, 0, 1);
  u.sunAngular.value = sunHalfAngleRad();
  u.moonHalo.value = (pal.moonI > 0.04 && elDeg < 8) ? clamp(pal.moonI * 3.2, 0.2, 1) : 0;
  u.starAmt.value = night * clamp((-elDeg + 2) / 10, 0, 1);
  u.cloudAmt.value = state.clouds ?? CLOUDS_DEFAULT;
  u.twilightAmt.value = twilight * day + twilight * 0.25;
  u.hazeAmt.value = state.fogEnabled ? 0.74 : 0.22;
}

function skyFollowRadius() {
  const far = (camera && camera.far) || 2000;
  return Math.max(28, Math.min(220, far * 0.42));
}

/** Sun/moon mesh distance: just inside far clip so the disc is sky, not a finite ball in the bay. */
function skyDiscDistance() {
  const far = (camera && camera.far) || 2000;
  return far * 0.92;
}

function updateSkyDome(dt) {
  if (!skyDome || !camera) return;
  camera.getWorldPosition(_skyCamPos);
  skyDome.position.copy(_skyCamPos);
  const R = skyFollowRadius();
  skyDome.scale.setScalar(Math.max(20, R * 0.55));
  if (skyMat) skyMat.uniforms.skyTime.value += dt;
  if (skyMat) skyMat.uniforms.sunAngular.value = sunHalfAngleRad();
  const discR = skyDiscDistance();
  const coreRad = (SUN_CORE_DEG * Math.PI / 180) * 0.5;
  const sunScale = Math.max(0.035, discR * Math.tan(coreRad));
  if (sunDisc && sunDisc.visible) {
    sunDisc.position.copy(_skyCamPos).addScaledVector(_keySunDir, discR);
    sunDisc.scale.setScalar(sunScale);
  }
  if (moonDisc && moonDisc.visible) {
    moonDisc.position.copy(_skyCamPos).addScaledVector(_moonDir, discR);
    moonDisc.scale.setScalar(discR / SKY_DISC_R);
  }
}


/** Place the sun shadow ortho camera on the player XZ (floor Y). Direction from ToD sun path. */
function updateKeyLightShadow() {
  if (!keyLight) return;
  const px = (player && player.pos) ? player.pos.x : 0;
  const pz = (player && player.pos) ? player.pos.z : SPAWN_Z;
  const ty = FLOOR_Y;
  const dir = (keyLight.userData && keyLight.userData.sunDir) || _keySunDir;
  let dx = dir.x, dy = dir.y, dz = dir.z;
  if (dy < 0.14) {
    dy = 0.14;
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len; dy /= len; dz /= len;
  }
  keyLight.target.position.set(px, ty, pz);
  keyLight.position.set(
    px + dx * KEY_SHADOW_DIST,
    ty + dy * KEY_SHADOW_DIST,
    pz + dz * KEY_SHADOW_DIST
  );
  keyLight.target.updateMatrixWorld();
  keyLight.updateMatrixWorld();
}

function applyTimeOfDay() {
  const pal = sampleTod(state.timeOfDay);
  const path = sunPath(state.timeOfDay);
  const elRad = path.elevDeg * (Math.PI / 180);
  const azRad = path.azDeg * (Math.PI / 180);
  const dist = 90;
  const cosE = Math.cos(elRad);
  const sunX = Math.sin(azRad) * cosE * dist;
  const sunY = Math.sin(elRad) * dist;
  const sunZ = Math.cos(azRad) * cosE * dist;
  if (keyLight) {
    _keySunDir.set(Math.sin(azRad) * cosE, Math.sin(elRad), Math.cos(azRad) * cosE);
    if (_keySunDir.lengthSq() < 1e-8) _keySunDir.set(0.35, 0.78, 0.4);
    _keySunDir.normalize();
    keyLight.userData.sunDir = _keySunDir;
    keyLight.color.copy(pal.sun);
    keyLight.userData.todBase = pal.sunI;
    keyLight.castShadow = pal.sunI > 0.05;
    updateKeyLightShadow();
  }
  if (hemiLight) {
    hemiLight.color.copy(pal.hemiSky);
    hemiLight.groundColor.copy(pal.hemiGnd);
    hemiLight.userData.todBase = pal.hemiI;
  }
  if (ambLight) {
    ambLight.color.copy(pal.amb);
    ambLight.userData.todBase = pal.ambI;
  }
  if (fillLight) {
    fillLight.position.set(-sunX * 0.35, 14, -sunZ * 0.2);
    fillLight.color.copy(pal.fill);
    fillLight.userData.todBase = pal.fillI;
  }
  if (rimLight) {
    rimLight.position.set(0, 10, -40);
    rimLight.color.copy(pal.rim);
    rimLight.userData.todBase = pal.rimI;
  }
  if (moonLight) {
    moonLight.position.set(-sunX * 0.6, Math.max(18, -sunY * 0.4 + 16), -sunZ * 0.6);
    moonLight.color.setHex(0xb8c8dc);
    moonLight.userData.todBase = pal.moonI;
  }
  ensureSkyDiscs();
  if (sunDisc) {
    const up = path.elevDeg > -1.5;
    sunDisc.visible = up;
    if (up) {
      sunDisc.material.color.copy(pal.sun);
      sunDisc.material.color.multiplyScalar(sunPunchGain(state.sunPunch ?? SUN_PUNCH_DEFAULT));
    }
  }
  if (moonDisc) {
    const show = pal.moonI > 0.04 && path.elevDeg < 8;
    moonDisc.visible = show;
    if (show) {
      moonDisc.material.opacity = clamp(pal.moonI * 2.8, 0.16, 0.5);
    }
  }
  if (scene) {
    if (scene.background && scene.background.isColor) scene.background.copy(pal.sky);
    else scene.background = pal.sky.clone();
  }
  return pal;
}

function setTimeOfDay(v, { toast = false } = {}) {
  state.timeOfDay = clamp(parseFloat(v), 0, 24);
  if (!Number.isFinite(state.timeOfDay)) state.timeOfDay = TOD_DEFAULT;
  applyDisplayLook();
  const slider = el("todSlider");
  const val = el("todVal");
  if (slider && document.activeElement !== slider) slider.value = String(state.timeOfDay);
  if (val) val.textContent = formatClock(state.timeOfDay);
  if (toast) showToast("Time " + formatClock(state.timeOfDay));
  scheduleSaveSettings();
}

/** Map Settings brightness/gamma → CSS filter on #view3d + mild fog/bg/light lift. */
function applyDisplayLook() {
  const b = clamp(Number(state.brightness) || 1, 0.5, 1.5);
  const g = clamp(Number(state.gamma) || 1, 0.8, 1.6);
  state.brightness = b;
  state.gamma = g;

  const canvas = el("view3d");
  if (canvas) canvas.style.filter = `brightness(${b}) contrast(${g})`;

  const pal = applyTimeOfDay();

  // Mild clear/fog/bg lift so far lane isn’t crushed before the CSS filter.
  // Grade only — time of day owns hue; brightness/gamma stay display.
  const lift = clamp((b - 1) * 0.45 + (g - 1) * 0.2, -0.2, 0.4);
  const sky = (scene && scene.background && scene.background.isColor)
    ? scene.background
    : (pal && pal.sky) || new THREE.Color(SCENE_BG_BASE);
  const r = clamp(sky.r + lift * 0.1, 0, 1);
  const gv = clamp(sky.g + lift * 0.1, 0, 1);
  const bv = clamp(sky.b + lift * 0.12, 0, 1);
  sky.setRGB(r, gv, bv);
  if (renderer) renderer.setClearColor(sky, 1);
  if (scene) {
    if (scene.background && scene.background.isColor) scene.background.copy(sky);
    else scene.background = sky.clone();
  }
  applyFog();
  syncSkyUniforms(pal, sunPath(state.timeOfDay));
  updateSkyDome(0);

  if (renderer) {
    const exp = pal && pal.exp != null ? pal.exp : 1;
    renderer.toneMappingExposure = exp * (state.exposureMul ?? 1);
  }

  const lightMul = 0.88 + 0.12 * b;
  const todI = (obj, fallback, mul = 1) => {
    if (!obj) return;
    const base = (obj.userData && obj.userData.todBase != null) ? obj.userData.todBase : fallback;
    obj.intensity = base * lightMul * mul;
  };
  todI(hemiLight, HEMI_INT_BASE, state.lightHemiMul);
  todI(ambLight, AMB_INT_BASE, state.lightAmbMul);
  todI(keyLight, KEY_INT_BASE, state.lightKeyMul);
  todI(fillLight, FILL_INT_BASE, state.lightFillMul);
  todI(rimLight, RIM_INT_BASE, state.lightRimMul);
  todI(moonLight, 0, state.lightMoonMul);
  const fixtures = floodFixtures.length ? floodFixtures : floodLights.map((L) => ({ light: L, shotOut: !!(L.userData && L.userData.shotOut) }));
  for (const fx of fixtures) {
    const L = fx.light || fx;
    if (!L) continue;
    if (fx.shotOut || (L.userData && L.userData.shotOut)) {
      if (!fx.die) L.intensity = 0;
      continue;
    }
    const base = (L.userData && L.userData.floodIntBase) || 55;
    L.intensity = base * lightMul;
  }

  const overlay = el("plugeOverlay");
  if (overlay) {
    overlay.hidden = !state.showPluge;
    overlay.setAttribute("aria-hidden", state.showPluge ? "false" : "true");
  }
}

const LIGHT_MUL_UI = {
  lightAmbMul: { slider: "lightAmbSlider", val: "lightAmbVal", label: "Ambient" },
  lightFillMul: { slider: "lightFillSlider", val: "lightFillVal", label: "Fill" },
  lightHemiMul: { slider: "lightHemiSlider", val: "lightHemiVal", label: "Hemisphere" },
  lightKeyMul: { slider: "lightKeySlider", val: "lightKeyVal", label: "Sun / key" },
  lightRimMul: { slider: "lightRimSlider", val: "lightRimVal", label: "Rim" },
  lightMoonMul: { slider: "lightMoonSlider", val: "lightMoonVal", label: "Moon" },
  exposureMul: { slider: "exposureSlider", val: "exposureVal", label: "ACES exposure" },
};

function syncLightMulUI(key) {
  const meta = LIGHT_MUL_UI[key];
  if (!meta) return;
  const n = state[key] ?? 1;
  const slider = el(meta.slider);
  const val = el(meta.val);
  if (slider && document.activeElement !== slider) slider.value = String(n);
  if (val) val.textContent = Number(n).toFixed(2) + "×";
}

function syncGodRaysUI() {
  const n = state.godRays ?? GOD_RAYS_DEFAULT;
  const slider = el("godRaysSlider");
  const val = el("godRaysVal");
  if (slider && document.activeElement !== slider) slider.value = String(n);
  if (val) val.textContent = Number(n).toFixed(2);
}

function setGodRays(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), 0, 2);
  state.godRays = Number.isFinite(n) ? n : GOD_RAYS_DEFAULT;
  syncGodRaysUI();
  if (toast) showToast(`God rays ${state.godRays.toFixed(2)}`);
  scheduleSaveSettings();
}

function syncBloomUI() {
  const n = state.bloom ?? BLOOM_DEFAULT;
  const slider = el("bloomSlider");
  const val = el("bloomVal");
  if (slider && document.activeElement !== slider) slider.value = String(n);
  if (val) val.textContent = Number(n).toFixed(2);
}

function setBloom(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), 0, 2);
  state.bloom = Number.isFinite(n) ? n : BLOOM_DEFAULT;
  syncBloomUI();
  if (toast) showToast(`Bloom ${state.bloom.toFixed(2)}`);
  scheduleSaveSettings();
}

function ditherAmount() {
  return clamp(state.dither ?? 0, 0, DITHER_MAX);
}

function normalizeDitherType(v) {
  return DITHER_TYPES.includes(v) ? v : DITHER_TYPE_DEFAULT;
}

function ditherTypeId() {
  const t = normalizeDitherType(state.ditherType);
  if (t === "ign") return 1;
  if (t === "bayer") return 2;
  return 0;
}

function syncDitherUI() {
  const n = ditherAmount();
  const slider = el("ditherSlider");
  const val = el("ditherVal");
  if (slider && document.activeElement !== slider) slider.value = String(n);
  if (val) val.textContent = Number(n).toFixed(4);

  const sc = clamp(state.ditherScale ?? DITHER_SCALE_DEFAULT, DITHER_SCALE_MIN, DITHER_SCALE_MAX);
  const scSlider = el("ditherScaleSlider");
  const scVal = el("ditherScaleVal");
  if (scSlider && document.activeElement !== scSlider) scSlider.value = String(sc);
  if (scVal) scVal.textContent = Number(sc).toFixed(2);

  const ox = clamp(state.ditherOffX ?? 0, DITHER_OFF_MIN, DITHER_OFF_MAX);
  const oy = clamp(state.ditherOffY ?? 0, DITHER_OFF_MIN, DITHER_OFF_MAX);
  const oxSlider = el("ditherOffXSlider");
  const oxVal = el("ditherOffXVal");
  if (oxSlider && document.activeElement !== oxSlider) oxSlider.value = String(ox);
  if (oxVal) oxVal.textContent = Number(ox).toFixed(2);
  const oySlider = el("ditherOffYSlider");
  const oyVal = el("ditherOffYVal");
  if (oySlider && document.activeElement !== oySlider) oySlider.value = String(oy);
  if (oyVal) oyVal.textContent = Number(oy).toFixed(2);

  const typeSel = el("ditherTypeSelect");
  const type = normalizeDitherType(state.ditherType);
  if (typeSel && document.activeElement !== typeSel) typeSel.value = type;

  const chk = el("chkDitherAnimate");
  if (chk) chk.checked = !!state.ditherAnimate;
}

function setDither(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), 0, DITHER_MAX);
  state.dither = Number.isFinite(n) ? n : DITHER_DEFAULT;
  syncDitherUI();
  if (toast) showToast(`Dither ${state.dither.toFixed(4)}`);
  scheduleSaveSettings();
}

function setDitherScale(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), DITHER_SCALE_MIN, DITHER_SCALE_MAX);
  state.ditherScale = Number.isFinite(n) ? n : DITHER_SCALE_DEFAULT;
  syncDitherUI();
  if (toast) showToast(`Dither scale ${state.ditherScale.toFixed(2)}`);
  scheduleSaveSettings();
}

function setDitherOffX(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), DITHER_OFF_MIN, DITHER_OFF_MAX);
  state.ditherOffX = Number.isFinite(n) ? n : 0;
  syncDitherUI();
  if (toast) showToast(`Dither offset X ${state.ditherOffX.toFixed(2)} px`);
  scheduleSaveSettings();
}

function setDitherOffY(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), DITHER_OFF_MIN, DITHER_OFF_MAX);
  state.ditherOffY = Number.isFinite(n) ? n : 0;
  syncDitherUI();
  if (toast) showToast(`Dither offset Y ${state.ditherOffY.toFixed(2)} px`);
  scheduleSaveSettings();
}

function setDitherType(v, { toast = false } = {}) {
  state.ditherType = normalizeDitherType(v);
  syncDitherUI();
  if (toast) showToast(`Dither type ${state.ditherType}`);
  scheduleSaveSettings();
}

function setDitherAnimate(on, { toast = false } = {}) {
  state.ditherAnimate = !!on;
  syncDitherUI();
  if (toast) showToast(state.ditherAnimate ? "Dither animate on" : "Dither animate off");
  scheduleSaveSettings();
}

function syncAdsDofUI() {
  const taps = state.adsDofTaps ?? ADS_DOF_TAPS_DEFAULT;
  const tapsSlider = el("adsDofTapsSlider");
  const tapsVal = el("adsDofTapsVal");
  if (tapsSlider && document.activeElement !== tapsSlider) tapsSlider.value = String(taps);
  if (tapsVal) tapsVal.textContent = String(taps);

  const r = state.adsDofRadius ?? ADS_DOF_RADIUS;
  const rSlider = el("adsDofRadiusSlider");
  const rVal = el("adsDofRadiusVal");
  if (rSlider && document.activeElement !== rSlider) rSlider.value = String(r);
  if (rVal) rVal.textContent = Number(r).toFixed(4);
}

function setAdsDofTaps(v, { toast = false } = {}) {
  const n = Math.round(clamp(parseFloat(v), ADS_DOF_TAPS_MIN, ADS_DOF_TAPS_MAX));
  state.adsDofTaps = Number.isFinite(n) ? n : ADS_DOF_TAPS_DEFAULT;
  syncAdsDofUI();
  if (toast) showToast(`DOF taps ${state.adsDofTaps}`);
  scheduleSaveSettings();
}

function setAdsDofRadius(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), ADS_DOF_RADIUS_MIN, ADS_DOF_RADIUS_MAX);
  state.adsDofRadius = Number.isFinite(n) ? n : ADS_DOF_RADIUS;
  syncAdsDofUI();
  if (toast) showToast(`DOF blur ${state.adsDofRadius.toFixed(4)}`);
  scheduleSaveSettings();
}

function syncBarrelHeatUI() {
  const n = state.barrelHeat ?? BARREL_HEAT_DEFAULT;
  const slider = el("barrelHeatSlider");
  const val = el("barrelHeatVal");
  if (slider && document.activeElement !== slider) slider.value = String(n);
  if (val) val.textContent = Number(n).toFixed(2);
}

function setBarrelHeat(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), 0, BARREL_HEAT_MUL_MAX);
  state.barrelHeat = Number.isFinite(n) ? n : BARREL_HEAT_DEFAULT;
  syncBarrelHeatUI();
  applyBarrelHeatVisual();
  if (toast) showToast(`Barrel heat ${state.barrelHeat.toFixed(2)}`);
  scheduleSaveSettings();
}

function syncBuildStamp() {
  const node = el("buildStamp");
  if (!node) return;
  const m = /v(\d+)/.exec(APP_CACHE_BUST);
  const ver = m ? m[1] : APP_CACHE_BUST;
  node.textContent = `v${ver} · ${APP_BUILD_STAMP}`;
}

function syncHeatHazeUI() {
  const st = state.heatHazeStrength ?? HEAT_HAZE_STRENGTH_DEFAULT;
  const sz = state.heatHazeSize ?? HEAT_HAZE_SIZE_DEFAULT;
  const stSlider = el("heatHazeStrengthSlider");
  const stVal = el("heatHazeStrengthVal");
  if (stSlider) stSlider.value = String(st);
  if (stVal) stVal.textContent = Number(st).toFixed(2);
  const szSlider = el("heatHazeSizeSlider");
  const szVal = el("heatHazeSizeVal");
  if (szSlider) szSlider.value = String(sz);
  if (szVal) szVal.textContent = Number(sz).toFixed(2);
  const chk = el("chkGroundHeatHaze");
  if (chk) chk.checked = !!state.groundHeatHaze;
}

function setHeatHazeStrength(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), 0, HEAT_HAZE_STRENGTH_MAX);
  state.heatHazeStrength = Number.isFinite(n) ? n : HEAT_HAZE_STRENGTH_DEFAULT;
  applyHeatHazeUniforms();
  syncHeatHazeUI();
  if (toast) showToast(`Heat haze ${state.heatHazeStrength.toFixed(2)}`);
  scheduleSaveSettings();
}

function setHeatHazeSize(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), HEAT_HAZE_SIZE_MIN, HEAT_HAZE_SIZE_MAX);
  state.heatHazeSize = Number.isFinite(n) ? n : HEAT_HAZE_SIZE_DEFAULT;
  applyHeatHazeUniforms();
  syncHeatHazeMeshScales();
  syncHeatHazeUI();
  if (toast) showToast(`Heat haze size ${state.heatHazeSize.toFixed(2)}`);
  scheduleSaveSettings();
}

function setGroundHeatHaze(on, { toast = false } = {}) {
  state.groundHeatHaze = !!on;
  const chk = el("chkGroundHeatHaze");
  if (chk) chk.checked = state.groundHeatHaze;
  applyHeatHazeUniforms();
  scheduleSaveSettings();
  if (toast) showToast(state.groundHeatHaze ? "Ground heat haze ON" : "Ground heat haze OFF");
}

function syncSunSizeUI() {
  const n = state.sunSize ?? SUN_SIZE_DEFAULT;
  const slider = el("sunSizeSlider");
  const val = el("sunSizeVal");
  if (slider && document.activeElement !== slider) slider.value = String(n);
  if (val) val.textContent = Number(n).toFixed(2) + "\u00b0";
}

function setSunSize(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), 0.08, 8);
  state.sunSize = Number.isFinite(n) ? n : SUN_SIZE_DEFAULT;
  updateSkyDome(0);
  syncSunSizeUI();
  if (toast) showToast("Sun size " + state.sunSize.toFixed(2) + "\u00b0");
  scheduleSaveSettings();
}

function syncSunPunchUI() {
  const n = state.sunPunch ?? SUN_PUNCH_DEFAULT;
  const slider = el("sunPunchSlider");
  const val = el("sunPunchVal");
  if (slider && document.activeElement !== slider) slider.value = String(n);
  if (val) val.textContent = Number(n).toFixed(2);
}

function setSunPunch(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), 0, 4);
  state.sunPunch = Number.isFinite(n) ? n : SUN_PUNCH_DEFAULT;
  applyTimeOfDay();
  updateSkyDome(0);
  syncSunPunchUI();
  if (toast) showToast("Sun punch " + state.sunPunch.toFixed(2));
  scheduleSaveSettings();
}


function syncCloudsUI() {
  const n = state.clouds ?? CLOUDS_DEFAULT;
  const slider = el("cloudsSlider");
  const val = el("cloudsVal");
  if (slider && document.activeElement !== slider) slider.value = String(n);
  if (val) val.textContent = Number(n).toFixed(2);
}

function setClouds(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), 0, 1);
  state.clouds = Number.isFinite(n) ? n : CLOUDS_DEFAULT;
  if (skyMat) skyMat.uniforms.cloudAmt.value = state.clouds;
  syncCloudsUI();
  if (toast) showToast(`Clouds ${state.clouds.toFixed(2)}`);
  scheduleSaveSettings();
}

function syncConcreteUniforms() {
  uConcreteWear.value = state.concreteWear ?? CONCRETE_WEAR_DEFAULT;
  uConcreteScale.value = state.concreteScale ?? CONCRETE_SCALE_DEFAULT;
  uConcreteVar.value = state.concreteVar ?? CONCRETE_VAR_DEFAULT;
  if (concreteTexBundle) applyConcreteLook();
}

function syncConcreteWearUI() {
  const n = state.concreteWear ?? CONCRETE_WEAR_DEFAULT;
  const slider = el("concreteWearSlider");
  const val = el("concreteWearVal");
  if (slider && document.activeElement !== slider) slider.value = String(n);
  if (val) val.textContent = Number(n).toFixed(2);
}

function setConcreteWear(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), 0, 1);
  state.concreteWear = Number.isFinite(n) ? n : CONCRETE_WEAR_DEFAULT;
  syncConcreteUniforms();
  syncConcreteWearUI();
  if (toast) showToast(`Concrete wear ${state.concreteWear.toFixed(2)}`);
  scheduleSaveSettings();
}

function syncConcreteScaleUI() {
  const n = state.concreteScale ?? CONCRETE_SCALE_DEFAULT;
  const slider = el("concreteScaleSlider");
  const val = el("concreteScaleVal");
  if (slider && document.activeElement !== slider) slider.value = String(n);
  if (val) val.textContent = Number(n).toFixed(2);
}

function setConcreteScale(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), CONCRETE_SCALE_MIN, CONCRETE_SCALE_MAX);
  state.concreteScale = Number.isFinite(n) ? n : CONCRETE_SCALE_DEFAULT;
  syncConcreteUniforms();
  syncConcreteScaleUI();
  if (toast) showToast(`Concrete scale ${state.concreteScale.toFixed(2)}`);
  scheduleSaveSettings();
}

function syncConcreteVarUI() {
  const n = state.concreteVar ?? CONCRETE_VAR_DEFAULT;
  const slider = el("concreteVarSlider");
  const val = el("concreteVarVal");
  if (slider && document.activeElement !== slider) slider.value = String(n);
  if (val) val.textContent = Number(n).toFixed(2);
}

function setConcreteVar(v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), CONCRETE_VAR_MIN, CONCRETE_VAR_MAX);
  state.concreteVar = Number.isFinite(n) ? n : CONCRETE_VAR_DEFAULT;
  syncConcreteUniforms();
  syncConcreteVarUI();
  if (toast) showToast(`Concrete variation ${state.concreteVar.toFixed(2)}`);
  scheduleSaveSettings();
}

function setLightMul(key, v, { toast = false } = {}) {
  const n = clamp(parseFloat(v), 0, 2.5);
  state[key] = Number.isFinite(n) ? n : 1;
  applyDisplayLook();
  syncLightMulUI(key);
  const meta = LIGHT_MUL_UI[key];
  if (toast && meta) showToast(`${meta.label} ${state[key].toFixed(2)}×`);
  scheduleSaveSettings();
}

function setBrightness(v, { toast = false } = {}) {
  state.brightness = clamp(parseFloat(v) || 1.00, 0.5, 1.5);
  applyDisplayLook();
  const slider = el("brightnessSlider");
  const val = el("brightnessVal");
  if (slider) slider.value = String(state.brightness);
  if (val) val.textContent = state.brightness.toFixed(2);
  if (toast) showToast(`Brightness ${state.brightness.toFixed(2)}`);
  scheduleSaveSettings();
}

function setGamma(v, { toast = false } = {}) {
  state.gamma = clamp(parseFloat(v) || 1.00, 0.8, 1.6);
  applyDisplayLook();
  const slider = el("gammaSlider");
  const val = el("gammaVal");
  if (slider) slider.value = String(state.gamma);
  if (val) val.textContent = state.gamma.toFixed(2);
  if (toast) showToast(`Gamma ${state.gamma.toFixed(2)}`);
  scheduleSaveSettings();
}

function setPluge(on, { toast = false } = {}) {
  state.showPluge = !!on;
  applyDisplayLook();
  const chk = el("chkPluge");
  if (chk) chk.checked = state.showPluge;
  if (toast) showToast(state.showPluge ? "PLUGE strip ON" : "PLUGE strip OFF");
  scheduleSaveSettings();
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

  const nearInp = el("camNearInput");
  const nearSlider = el("camNearSlider");
  const nearVal = el("camNearVal");
  if (nearInp) nearInp.value = String(state.camNear);
  if (nearSlider) nearSlider.value = String(state.camNear);
  if (nearVal) nearVal.textContent = Number(state.camNear).toFixed(3);

  const farInp = el("camFarInput");
  const farSlider = el("camFarSlider");
  const farVal = el("camFarVal");
  if (farInp) farInp.value = String(Math.round(state.camFar));
  if (farSlider) farSlider.value = String(state.camFar);
  if (farVal) farVal.textContent = String(Math.round(state.camFar));

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

  const brightSlider = el("brightnessSlider");
  const brightVal = el("brightnessVal");
  if (brightSlider) brightSlider.value = String(state.brightness);
  if (brightVal) brightVal.textContent = Number(state.brightness).toFixed(2);

  const gammaSlider = el("gammaSlider");
  const gammaVal = el("gammaVal");
  if (gammaSlider) gammaSlider.value = String(state.gamma);
  if (gammaVal) gammaVal.textContent = Number(state.gamma).toFixed(2);

  const chkFog = el("chkFog");
  if (chkFog) chkFog.checked = !!state.fogEnabled;
  const fogNearSlider = el("fogNearSlider");
  const fogNearVal = el("fogNearVal");
  if (fogNearSlider) fogNearSlider.value = String(state.fogNear);
  if (fogNearVal) fogNearVal.textContent = String(Math.round(state.fogNear));
  const fogFarSlider = el("fogFarSlider");
  const fogFarVal = el("fogFarVal");
  if (fogFarSlider) fogFarSlider.value = String(state.fogFar);
  if (fogFarVal) fogFarVal.textContent = String(Math.round(state.fogFar));

  const chkPluge = el("chkPluge");
  if (chkPluge) chkPluge.checked = !!state.showPluge;

  const todSlider = el("todSlider");
  const todVal = el("todVal");
  if (todSlider) todSlider.value = String(state.timeOfDay);
  if (todVal) todVal.textContent = formatClock(state.timeOfDay);

  Object.keys(LIGHT_MUL_UI).forEach(syncLightMulUI);

  syncGodRaysUI();
  syncBloomUI();
  syncDitherUI();
  syncAdsDofUI();
  syncSunSizeUI();
  syncSunPunchUI();
  syncCloudsUI();
  syncConcreteWearUI();
  syncConcreteScaleUI();
  syncConcreteVarUI();
  syncBarrelHeatUI();
  syncHeatHazeUI();
  syncFxSettingsUI();
  syncCrouchSlider();
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


function allowedOpticsFor(weaponId = state.weaponId) {
  return WEAPON_OPTICS[weaponId] || ["iron"];
}

function weaponAllowsOptic(optic, weaponId = state.weaponId) {
  return allowedOpticsFor(weaponId).includes(optic);
}

function mintInstanceId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (_) { /* ignore */ }
  return "w-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function kitSlots(weaponId) {
  return WEAPON_KIT[weaponId] || {
    optics: WEAPON_OPTICS[weaponId] || ["iron"],
    mags: magsForWeapon(weaponId),
    suppressor: !!SUPPRESSOR_SPEC[weaponId],
    grip: [],
    stock: [],
  };
}

function pickUniform(list) {
  if (!list || !list.length) return null;
  return list[(Math.random() * list.length) | 0];
}

function cloneLoadout(src) {
  if (!src) return null;
  return {
    id: src.id,
    weaponId: src.weaponId,
    optic: src.optic,
    magId: src.magId,
    ammoInMag: src.ammoInMag,
    suppressor: !!src.suppressor,
    fireMode: src.fireMode,
  };
}

/** Uniform roll from WEAPON_KIT slots. No default-mag / iron bias. */
function randomizeLoadout(weaponId) {
  const slots = kitSlots(weaponId);
  const magId = pickUniform(slots.mags) || DEFAULT_MAG[weaponId] || "smg_20";
  const mag = MAG_KINDS[magId];
  const cap = mag ? mag.capacity : 20;
  return {
    id: mintInstanceId(),
    weaponId,
    optic: pickUniform(slots.optics) || DEFAULT_OPTIC[weaponId] || "iron",
    magId,
    ammoInMag: 1 + ((Math.random() * cap) | 0),
    suppressor: slots.suppressor ? Math.random() < 0.5 : false,
    fireMode: weaponSupportsAuto(weaponId) ? (Math.random() < 0.5 ? "auto" : "semi") : "semi",
  };
}

function snapshotHeldLoadout() {
  return {
    id: state.heldInstanceId || mintInstanceId(),
    weaponId: state.weaponId,
    optic: state.optic,
    magId: currentMagId(),
    ammoInMag: state.ammoInMag,
    suppressor: suppressorMounted(),
    fireMode: state.fireMode,
  };
}

function holdingWeapon() {
  return !state.handsEmpty;
}

function setHandsEmpty(empty) {
  state.handsEmpty = !!empty;
  if (empty) {
    state.heldInstanceId = null;
    state.adsTarget = 0;
    state.adsFactor = 0;
    state.reloading = false;
    state.reloadElapsed = 0;
    cancelBoltCycle();
  }
  if (holdRoot) holdRoot.visible = !empty;
  updateAmmoHud();
  updateFireModeHud();
}

function rebuildHeldGun() {
  const id = state.weaponId;
  const keys = Object.keys(attachments[id] || { holo_sight: 1 });
  if (!keys.includes(state.attachmentId)) state.attachmentId = keys[0];
  buildWeaponSelect();
  buildPoseSelect();
  buildAttSelect();
  buildOpticSelect();
  syncAxisInputsFromPose(true);
  syncAxisInputsFromPose(false);
  if (typeof buildBlockGun === "function" && holdRoot) buildBlockGun(id);
  refreshOpticsTableAvailability();
  refresh();
  state.semiOnlyToasted = false;
  state.recoilPatternIndex = 0;
  state.lastShotMs = 0;
  if (player) {
    player.camRecoilP = 0;
    player.camRecoilY = 0;
  }
  updateFireModeHud();
}

/** Restore a world-kit snapshot. Does not refill ammo. Keeps the instance id. */
function applyLoadout(snap) {
  if (!snap || !db[snap.weaponId]) return;
  const id = snap.weaponId;
  setHandsEmpty(false);
  state.weaponId = id;
  state.heldInstanceId = snap.id || mintInstanceId();
  const slots = kitSlots(id);
  const magId = slots.mags.includes(snap.magId) ? snap.magId : (slots.mags[0] || DEFAULT_MAG[id]);
  state.magByWeapon[id] = magId;
  state.suppressorByWeapon[id] = slots.suppressor && !!snap.suppressor;
  state.optic = slots.optics.includes(snap.optic) ? snap.optic : (slots.optics[0] || "iron");
  state.fireMode = snap.fireMode === "auto" && weaponSupportsAuto(id) ? "auto" : "semi";
  rebuildHeldGun();
  syncAmmoForLoadout({ refill: false });
  const cap = magSpecForLoadout().capacity;
  const ammo = Number(snap.ammoInMag);
  state.ammoInMag = Number.isFinite(ammo) ? clamp(ammo, 0, cap) : 0;
  updateAmmoHud();
  const lab = (WEAPON_META[id] && WEAPON_META[id].label) || id;
  showToast("Picked up " + lab);
}

/** Table / G / debugger: mint a NEW instance, fresh defaults, refill. */
function equipWeapon(id) {
  if (!db[id]) return;
  setHandsEmpty(false);
  state.weaponId = id;
  state.heldInstanceId = mintInstanceId();
  state.magByWeapon[id] = DEFAULT_MAG[id] || currentMagId(id);
  state.suppressorByWeapon[id] = false;
  state.optic = DEFAULT_OPTIC[id] || "iron";
  state.fireMode = weaponSupportsAuto(id) ? "auto" : "semi";
  rebuildHeldGun();
  syncAmmoForLoadout({ refill: true });
  showToast("Equipped " + ((WEAPON_META[id] && WEAPON_META[id].label) || id));
}

function setOptic(profile) {
  if (!OPTIC_LABELS[profile]) return;
  if (!weaponAllowsOptic(profile)) {
    const w = (WEAPON_META[state.weaponId] && WEAPON_META[state.weaponId].label) || state.weaponId;
    showToast((OPTIC_LABELS[profile] || profile) + " not available on " + w, true);
    const sel = el("opticSelect");
    if (sel) sel.value = state.optic;
    return;
  }
  state.optic = profile;
  const sel = el("opticSelect");
  if (sel) sel.value = profile;
  updateOpticVisibility();
  syncAmmoForLoadout({ refill: true });
  refresh(false);
  showToast("Optic: " + OPTIC_LABELS[profile]);
  updateHudHint();
}

function buildOpticSelect() {
  const s = el("opticSelect");
  if (!s) return;
  const allowed = allowedOpticsFor();
  s.innerHTML = allowed
    .map((k) => `<option value="${k}">${OPTIC_LABELS[k] || k}</option>`)
    .join("");
  if (!allowed.includes(state.optic)) state.optic = "iron";
  s.value = state.optic;
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
let _ironsZeroLockToasted = false;
function cycleZeroDist(dir) {
  let i = ZERO_DIST_PRESETS.indexOf(state.zeroDist);
  if (i < 0) i = ZERO_DIST_PRESETS.indexOf(100);
  if (i < 0) i = 2;
  const next = clamp(i + dir, 0, ZERO_DIST_PRESETS.length - 1);
  const onIrons = state.optic === "iron";
  setZeroDist(ZERO_DIST_PRESETS[next], { toast: !onIrons });
  if (onIrons && !_ironsZeroLockToasted) {
    _ironsZeroLockToasted = true;
    showToast("Irons locked at 100 m");
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
/** Half-res viewmodel RT + fullscreen composite for ADS DOF. */
let adsDof = null;
/** Half-res volumetric sun shafts (shadow-map ray march). */
let godRays = null;
/** HDR scene RT + 3-mip dual-filter bloom (Jimenez-style). */
let hdrBloom = null;
/** Full-res HalfFloat capture for post-ACES luma dither onto the 8-bit backbuffer. */
let outputDither = null;
/** Kept so Settings brightness/gamma can nudge intensities + fog. */
let hemiLight, ambLight, keyLight, fillLight, rimLight, moonLight;
let sunDisc = null;
let moonDisc = null;
/** Fullscreen-ish sky dome (gradient, halo, stars, FBM clouds). Follows the camera. */
let skyDome = null;
let skyMat = null;
const _skyCamPos = new THREE.Vector3();
const _moonDir = new THREE.Vector3(0, 1, 0);
const SKY_DISC_R = 180;

function sunHalfAngleRad() {
  const sizeDeg = state.sunSize ?? SUN_SIZE_DEFAULT;
  return Math.max(1e-4, (sizeDeg * Math.PI / 180) * 0.5);
}

/** Soft shoulder: 1.4 is a hot pin, 4 never washes the frame. */
function sunPunchGain(punch) {
  const p = clamp(parseFloat(punch), 0, 4);
  if (!Number.isFinite(p) || p <= 0) return 0;
  return (p * 1.45) / (1 + p * 0.28);
}
/** Side-bay flood SpotLights (+ fake floor pools) so the long lane reads at night. */
let floodLights = [];
/** Fixture records: lamp/head hit, optional pool, shot-out flag. kind "tube" = spawn strip. */
let floodFixtures = [];
const SCENE_BG_BASE = 0x1c2430;
/** Default clock (18:30) — palettes below are keyed so this hour matches SCENE_BG_BASE. */
const TOD_DEFAULT = 18.5;
const HEMI_INT_BASE = 0.32;
const AMB_INT_BASE = 0.12;
const KEY_INT_BASE = 1.18;
const FILL_INT_BASE = 0.28;
const RIM_INT_BASE = 0.18;
/** Player-follow sun shadow: single ortho cascade around the player (not CSM). */
const KEY_SHADOW_EXTENT = 23;
const KEY_SHADOW_DIST = 46;
const _keySunDir = new THREE.Vector3(0.35, 0.78, 0.4);
let opticRoot, gripMesh, muzzleFlash, muzzleSocket, ejectionPort, swayRig, magMesh, magSocket, boltMesh, suppressorRoot;
let tracers = [];
/** Short-lived bullet spark bursts (MeshBasic quads). */
let impactSparks = [];
/** Electrical spark cards from shot-out flood bulbs. */
let bulbSparks = [];
/** World impact marks — FIFO capped (walls / berm / silhouettes). Live cap in Settings. */
let impactDecals = [];
const IMPACT_DECAL_MAX = 30000;
const IMPACT_DECAL_CAP_MIN = 20;
const IMPACT_DECAL_CAP_MAX = 30000;
/** Seconds after spawn; 0 = FIFO only. Paper holes never use this TTL. */
const HOLE_FADE_SEC = 18;
const HOLE_FADE_MAX = 60;
/** Paper-target holes — persist until table reset (not in the FIFO TTL pool). */
let paperDecals = [];
const PAPER_DECAL_MAX = 30000;
const _decalParentQ = new THREE.Quaternion();
const _decalWorldQ = new THREE.Quaternion();
const _decalLocal = new THREE.Vector3();
const _vaultFwd = new THREE.Vector3();
const _vaultOrigin = new THREE.Vector3();
const _vaultDown = new THREE.Vector3(0, -1, 0);
const _vaultBox = new THREE.Box3();
const VAULT_HOLD_SEC = 0.22;
const VAULT_MIN_H = 0.38;
const VAULT_MAX_H = 1.18;
const VAULT_REACH = 1.45;
const FLOOR_Y = -1.4;
/** Loose world kits (X-drop + start scatter). Oldest despawns past the cap. */
const WORLD_DROP_CAP = 8;
const WORLD_DROP_SCALE = 1.0;
/** Spawn / fallback origin. Sleep pose bbox-sits the kit on FLOOR_Y. */
const WORLD_DROP_REST_Y = FLOOR_Y + 0.18;
const _dropRestBox = new THREE.Box3();
const _dropHlQ = new THREE.Quaternion();
/** Weapons-bench table pickups — honest enough to read as guns, under 1.0 so three fit. */
const WEAPON_BENCH_SCALE = 0.9;
let worldDrops = [];
/** Ejected brass casings — FIFO-capped, sleep after bounce, then optional TTL. */
let casings = [];
const CASING_MAX = 30000;
const CASING_CAP_MIN = 10;
const CASING_CAP_MAX = 30000;
const CASING_FADE_SEC = 12;
const CASING_FADE_MAX = 60;
/** Hide (not despawn) brass / spent slugs beyond this player XZ range. */
const CASING_DRAW_MIN = 8;
const CASING_DRAW_MAX = 200;
const CASING_DRAW_DEFAULT = 55;
/** Hide (not despawn) holes / crater plugs. Min 50 still covers the bay. */
const DECAL_DRAW_MIN = 50;
const DECAL_DRAW_MAX = 2000;
const DECAL_DRAW_DEFAULT = 900;
const _fxDrawTmp = new THREE.Vector3();
const CASING_GRAVITY = 12;
/** Breakable beer bottles on the 15–25 m side benches. */
let beerBottles = [];
/** Tiny glass shards from broken bottles — bounce, then TTL or table reset. */
let glassShards = [];
const GLASS_SHARD_MAX = 48;
const GLASS_SHARD_LIFE = 6.5;
let _shardGeo = null;
const MUZZLE_FLASH_MS = 80;
let _casingGeo = null;
let _casingMat = null;
/** Rare unflattened spent slugs — graze skip, then settle like brass. */
let spentSlugs = [];
let _slugBodyGeo = null;
let _slugTailGeo = null;
let _slugNoseGeo = null;
let _slugMat = null;
let _plugWideGeo = null;
let _plugMidGeo = null;
let _plugNubGeo = null;
let _plugBrassMat = null;
let _plugSteelMat = null;
const _slugN = new THREE.Vector3();
const _slugVel = new THREE.Vector3();
const _slugTmp = new THREE.Vector3();
const _slugT1 = new THREE.Vector3();
const _slugT2 = new THREE.Vector3();
const SLUG_CHANCE = 1 / 16;
const SLUG_PAPER_CHANCE = 1 / 48;
/** |n·vhat| above this is dead-on — no skip. Cheap graze gate, not an angle table. */
const SLUG_GRAZE_MAX = 0.52;
const SLUG_KEEP_MIN = 0.08;
const SLUG_KEEP_MAX = 0.18;
const SLUG_SPEED_MIN = 2.2;
const SLUG_SPEED_MAX = 16;
let _holePunchMaps = [];
let _holeScuffMaps = [];
const IMPACT_HOLE_VARIANTS = 10;
let _impactDecalGeo = null;
let _impactSparkGeo = null;
let _bulbSparkGeo = null;
let _bulbSparkTexWhite = null;
let _bulbSparkTexCyan = null;
let _bulbSparkMatWhite = null;
let _bulbSparkMatCyan = null;
let _impactSparkMatWhite = null;
let _impactSparkMatYellow = null;
let _shotFxPrewarmed = false;
const PREWARM_CACHE = "prewarm-v1";
const _impactN = new THREE.Vector3();
const _impactSeg = new THREE.Vector3();
const _impactUp = new THREE.Vector3(0, 0, 1);
const _sparkAxis = new THREE.Vector3(0, 1, 0);
const _sparkMtx = new THREE.Matrix4();
const _sparkX = new THREE.Vector3();
const _sparkY = new THREE.Vector3();
const _sparkZ = new THREE.Vector3();
const _sparkToCam = new THREE.Vector3();
const _bulbSparkOrigin = new THREE.Vector3();
let playerRoot, leanPivot;
/** Meshes lean probes may hit (walls, berm, crates, solid props) — never player/viewmodel. */
let leanSolids = [];
const _leanOrigin = new THREE.Vector3();
const _leanDir = new THREE.Vector3();
let pickups = [];
let rangeTargets = [];
let silhouetteTargets = [];
let bermPopupTargets = [];
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
  spaceDown: false,
};

/** Spawn / firing-line world Z. Range art distances are meters downrange (−Z) from here. */
const SPAWN_Z = 2.5;
/** World Z for `meters` downrange of the spawn firing line. */
function rangeZ(meters) {
  return SPAWN_Z - meters;
}
/** Wall chalk + stencil distances (meters from spawn firing line). */
const RANGE_MARK_DISTANCES = [50, 100, 150, 200, 300, 400];

const player = {
  pos: new THREE.Vector3(0, 0.2, SPAWN_Z),
  yaw: 0,
  pitch: 0,
  leanAngle: 0,
  leanTarget: 0,
  bobPhase: 0,
  /** Lagged follow of bobPhase for sprint gun mass (seconds of lag via low-pass). */
  gunBobPhase: 0,
  gunBobW: 0,
  eyeHeight: 0.2,
  eyeCurrent: 0.2,
  crouchEyeMul: 0.6,
  /** Meters above support at gradient=1 (sit on heels). Standing is ~1.6 m above floor. */
  crouchSitHeight: 0.82,
  /** Foot support world Y (floor or vaulted table top). */
  supportY: FLOOR_Y,
  planarSpeed: 0,
  fwdIntent: 0,
  wasSprint: false,
  wasCrouched: false,
  crouchSpeedMul: 0.6,
  velX: 0,
  velZ: 0,
  moveAccel: 16,
  moveFriction: 9,
  moveSpeed: 3.2,
  sprintMul: 1.95,
  lookSens: LOOK_SENS_BASE,
  // Global ADS coefficient on top of FOV scale (1 = hip feel × FOV ratio only).
  adsLookMul: 1,
  leanMax: 0.5,
  leanSpring: 8,
  leanLerp: 0.1,
  leanOffset: 0.5,
  /** Skin gap (m) so leaned camera stops just short of the surface. */
  leanSkin: 0.08,
  fovHip: FOV_BY_OPTIC.hip,
  fovAds: FOV_BY_OPTIC.iron,
  fov: FOV_BY_OPTIC.hip,
  strafeTilt: 0,
  /** Barrel heat-card top lean (opposite sway/strafe), smoothed. */
  hazeLeanX: 0,
  hazeLeanUp: 0,
  flashUntil: 0,
  swayT: 0,
  swayAmp: 1,
  breathRecover: 0,
  recoilPunch: new THREE.Vector3(),
  recoilRot: new THREE.Vector3(),
  fireCooldown: 0,
  /** Camera pitch/yaw overlay (in-line SMG walk); decays when you pause. */
  camRecoilP: 0,
  camRecoilY: 0,
};

/* ---- Settings persist (localStorage) ---- */
const SETTINGS_VERSION = 1;
const SETTINGS_STORAGE_KEY = "aimOffset.settings";
const SETTINGS_SAVE_DEBOUNCE_MS = 150;

/** O-panel tuners only. Ephemeral gameplay (ammo, ads, reload, heat energy, lock) stays out. */
const SETTINGS_FIELDS = [
  { key: "hobZero", src: "state", type: "bool" },
  { key: "zeroDist", src: "state", type: "num" },
  { key: "camNear", src: "state", type: "num" },
  { key: "camFar", src: "state", type: "num" },
  { key: "showAimRays", src: "state", type: "bool" },
  { key: "showHipReticle", src: "state", type: "bool" },
  { key: "brightness", src: "state", type: "num" },
  { key: "gamma", src: "state", type: "num" },
  { key: "fogEnabled", src: "state", type: "bool" },
  { key: "fogNear", src: "state", type: "num" },
  { key: "fogFar", src: "state", type: "num" },
  { key: "showPluge", src: "state", type: "bool" },
  { key: "showPerf", src: "state", type: "bool" },
  { key: "timeOfDay", src: "state", type: "num" },
  { key: "lightAmbMul", src: "state", type: "num" },
  { key: "lightFillMul", src: "state", type: "num" },
  { key: "lightHemiMul", src: "state", type: "num" },
  { key: "lightKeyMul", src: "state", type: "num" },
  { key: "lightRimMul", src: "state", type: "num" },
  { key: "lightMoonMul", src: "state", type: "num" },
  { key: "exposureMul", src: "state", type: "num" },
  { key: "holeCap", src: "state", type: "num" },
  { key: "casingCap", src: "state", type: "num" },
  { key: "concreteWear", src: "state", type: "num" },
  { key: "concreteScale", src: "state", type: "num" },
  { key: "concreteVar", src: "state", type: "num" },
  { key: "holeFade", src: "state", type: "num" },
  { key: "casingFade", src: "state", type: "num" },
  { key: "casingDraw", src: "state", type: "num" },
  { key: "decalDraw", src: "state", type: "num" },
  { key: "godRays", src: "state", type: "num" },
  { key: "bloom", src: "state", type: "num" },
  { key: "dither", src: "state", type: "num" },
  { key: "ditherScale", src: "state", type: "num" },
  { key: "ditherOffX", src: "state", type: "num" },
  { key: "ditherOffY", src: "state", type: "num" },
  { key: "ditherType", src: "state", type: "str" },
  { key: "ditherAnimate", src: "state", type: "bool" },
  { key: "adsDofTaps", src: "state", type: "num" },
  { key: "adsDofRadius", src: "state", type: "num" },
  { key: "barrelHeat", src: "state", type: "num" },
  { key: "heatHazeStrength", src: "state", type: "num" },
  { key: "heatHazeSize", src: "state", type: "num" },
  { key: "groundHeatHaze", src: "state", type: "bool" },
  { key: "sunSize", src: "state", type: "num" },
  { key: "sunPunch", src: "state", type: "num" },
  { key: "clouds", src: "state", type: "num" },
  { key: "crouchGrad", src: "state", type: "num" },
  { key: "crouchLastDepth", src: "state", type: "num" },
  { key: "homeHold", src: "state", type: "str" },
  { key: "lookSens", src: "player", type: "num" },
  { key: "adsLookMul", src: "player", type: "num" },
];

function settingsHost(src) {
  return src === "player" ? player : state;
}

function collectSettingsBlob() {
  const blob = { settingsVersion: SETTINGS_VERSION };
  for (const f of SETTINGS_FIELDS) {
    blob[f.key] = settingsHost(f.src)[f.key];
  }
  return blob;
}

/** Shipped constants — captured before localStorage hydrate. */
const SETTINGS_SHIPPED = collectSettingsBlob();

let settingsSaveTimer = 0;
let settingsHydrating = false;

function saveSettingsNow() {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(collectSettingsBlob()));
  } catch (err) {
    /* quota / private mode */
  }
}

function scheduleSaveSettings() {
  if (settingsHydrating) return;
  if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
  settingsSaveTimer = setTimeout(() => {
    settingsSaveTimer = 0;
    saveSettingsNow();
  }, SETTINGS_SAVE_DEBOUNCE_MS);
}

function applySettingsBlob(blob) {
  if (!blob || typeof blob !== "object") return;
  if (blob.settingsVersion !== SETTINGS_VERSION) return;
  for (const f of SETTINGS_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(blob, f.key)) continue;
    const raw = blob[f.key];
    if (f.type === "bool") {
      if (typeof raw !== "boolean") continue;
      settingsHost(f.src)[f.key] = raw;
    } else if (f.type === "str") {
      if (typeof raw !== "string") continue;
      settingsHost(f.src)[f.key] = raw;
    } else {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) continue;
      settingsHost(f.src)[f.key] = n;
    }
  }
  if (state.crouchGrad > 0.04) state.crouchToggled = true;
  else if (state.crouchGrad < 0.02) state.crouchToggled = false;
  state.dither = clamp(state.dither ?? DITHER_DEFAULT, 0, DITHER_MAX);
  state.ditherScale = clamp(state.ditherScale ?? DITHER_SCALE_DEFAULT, DITHER_SCALE_MIN, DITHER_SCALE_MAX);
  state.ditherOffX = clamp(state.ditherOffX ?? 0, DITHER_OFF_MIN, DITHER_OFF_MAX);
  state.ditherOffY = clamp(state.ditherOffY ?? 0, DITHER_OFF_MIN, DITHER_OFF_MAX);
  state.ditherType = normalizeDitherType(state.ditherType);
  state.ditherAnimate = !!state.ditherAnimate;
  state.concreteWear = clamp(state.concreteWear ?? CONCRETE_WEAR_DEFAULT, 0, 1);
  state.concreteScale = clamp(state.concreteScale ?? CONCRETE_SCALE_DEFAULT, CONCRETE_SCALE_MIN, CONCRETE_SCALE_MAX);
  state.concreteVar = clamp(state.concreteVar ?? CONCRETE_VAR_DEFAULT, CONCRETE_VAR_MIN, CONCRETE_VAR_MAX);
  state.heatHazeStrength = clamp(state.heatHazeStrength ?? HEAT_HAZE_STRENGTH_DEFAULT, 0, HEAT_HAZE_STRENGTH_MAX);
  state.heatHazeSize = clamp(state.heatHazeSize ?? HEAT_HAZE_SIZE_DEFAULT, HEAT_HAZE_SIZE_MIN, HEAT_HAZE_SIZE_MAX);
  state.groundHeatHaze = !!(state.groundHeatHaze ?? GROUND_HEAT_HAZE_DEFAULT);
  state.casingDraw = Math.round(clamp(state.casingDraw ?? CASING_DRAW_DEFAULT, CASING_DRAW_MIN, CASING_DRAW_MAX));
  state.decalDraw = Math.round(clamp(state.decalDraw ?? DECAL_DRAW_DEFAULT, DECAL_DRAW_MIN, DECAL_DRAW_MAX) / 10) * 10;
  state.homeHold = normalizeHomeHold(state.homeHold);
}

function loadPersistedSettings() {
  settingsHydrating = true;
  let migrateGroundHeatOff = false;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return;
    applySettingsBlob(JSON.parse(raw));
    // Older builds could persist groundHeatHaze:true → fullscreen blue fog slap.
    // One-time migration: force OFF and rewrite settings; checkbox can re-enable later.
    if (state.groundHeatHaze) {
      state.groundHeatHaze = false;
      migrateGroundHeatOff = true;
    }
  } catch (err) {
    /* keep code defaults */
  } finally {
    settingsHydrating = false;
  }
  if (migrateGroundHeatOff) scheduleSaveSettings();
}

/** Push current state into scene / sliders / HUD after a reset (scene already exists). */
function applySettingsSideEffects() {
  setGameStyle(state.hobZero, { toast: false });
  setHipReticle(state.showHipReticle, { toast: false });
  setAimRays(state.showAimRays, { toast: false });
  setZeroDist(state.zeroDist, { toast: false });
  applyCameraClip();
  applyDisplayLook();
  if (skyMat && skyMat.uniforms && skyMat.uniforms.cloudAmt) {
    skyMat.uniforms.cloudAmt.value = state.clouds;
  }
  syncConcreteUniforms();
  applyBarrelHeatVisual();
  applyHeatHazeUniforms();
  syncHeatHazeMeshScales();
  setCrouchGrad(state.crouchGrad, { remember: false });
  setPerfOverlay(!!state.showPerf, { toast: false });
  trimImpactDecals();
  expireImpactDecals();
  trimCasings();
  trimSpentSlugs();
  expireCasings();
  applyFxDrawDistances();
  syncSettingsUI();
}

function resetSettingsToShipped() {
  settingsHydrating = true;
  try {
    applySettingsBlob(SETTINGS_SHIPPED);
    applySettingsSideEffects();
  } finally {
    settingsHydrating = false;
  }
  saveSettingsNow();
  showToast("Settings reset to defaults");
}

function copySettingsJson() {
  if (settingsSaveTimer) {
    clearTimeout(settingsSaveTimer);
    settingsSaveTimer = 0;
    saveSettingsNow();
  }
  return copyText(JSON.stringify(collectSettingsBlob(), null, 2), "Copied settings JSON");
}

loadPersistedSettings();
syncConcreteUniforms();


/** Subtle chalk/wood range marker lines on the floor (no floating text). */
let groundRangeLines = [];
/** Painted stencil range numbers on bay walls. */
let wallRangeNumbers = [];

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
  clearWallRangeNumbers();
}

function buildGroundRangeLines(zs) {
  clearGroundRangeLines();
  // Floor y = -1.4, strip = -1.385, grid = -1.39 — sit just above to avoid z-fight.
  const y = -1.328;
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


function clearWallRangeNumbers() {
  for (const mesh of wallRangeNumbers) {
    if (mesh.parent) mesh.parent.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material;
    if (mat) {
      if (mat.map) mat.map.dispose();
      if (Array.isArray(mat)) mat.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      else mat.dispose();
    }
  }
  wallRangeNumbers = [];
}

/** White stencil-style distance number painted on bay walls. */
function makeRangeNumberTexture(label) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 256);
  // Soft dark edge / stencil shadow
  ctx.font = "bold 140px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 14;
  ctx.strokeStyle = "rgba(20, 24, 32, 0.55)";
  ctx.strokeText(String(label), 128, 132);
  ctx.fillStyle = "#f4f6f8";
  ctx.fillText(String(label), 128, 132);
  // Small "m" unit mark
  ctx.font = "bold 42px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "rgba(244, 246, 248, 0.85)";
  ctx.fillText("m", 128, 210);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Paint big range numbers on inner faces of side bay walls at chalk Z.
 * Offset off the wall surface to avoid coplanar z-fighting with wall albedo.
 */
function buildWallRangeNumbers(lanes) {
  clearWallRangeNumbers();
  // Walls sit at x=±12, half-thickness 0.275 → inner faces ≈ ±11.725
  const wallHalf = 0.275;
  const inset = 0.045; // pull off wall toward lane center
  const y = 0.35;
  const planeW = 2.4;
  const planeH = 2.4;
  for (const lane of lanes) {
    const label = lane.m != null ? lane.m : Math.round(Math.abs(lane.z));
    const z = lane.z;
    for (const side of [-12, 12]) {
      const tex = makeRangeNumberTexture(label);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), mat);
      const inner = side > 0 ? side - wallHalf - inset : side + wallHalf + inset;
      mesh.position.set(inner, y, z);
      // Face toward lane center
      mesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      mesh.renderOrder = 2;
      scene.add(mesh);
      wallRangeNumbers.push(mesh);
    }
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
  tex.colorSpace = opts.colorSpace != null ? opts.colorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  return tex;
}

function conHash11(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

const CONCRETE_DUST = new THREE.Color(0xb8aa94);

function paintConcreteAlbedo(ctx, size, contrast) {
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const k = contrast;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const blotch = conHash11(Math.floor(x / 26) + Math.floor(y / 20) * 9.1 + 2.4);
      const blotch2 = conHash11(Math.floor(x / 14) + Math.floor(y / 18) * 5.7 + 8.2);
      const n2 = conHash11(x * 0.17 + y * 0.31 + 1.3);
      const n3 = conHash11(x * 0.53 + y * 0.19 + 4.2);
      const n4 = conHash11(x * 1.07 + y * 0.71 + 11.8);
      let r = 204 + (blotch - 0.5) * 54 * k;
      let g = 198 + (blotch - 0.42) * 38 * k;
      let b = 188 + (0.52 - blotch) * 46 * k;
      r += (blotch2 - 0.5) * 22 * k;
      g += (blotch2 - 0.5) * 16 * k;
      b += (0.5 - blotch2) * 20 * k;
      if (n2 > 0.78) {
        r -= 62 * k; g -= 56 * k; b -= 48 * k;
      } else if (n2 > 0.66) {
        r += 36 * k; g += 22 * k; b += 8 * k;
      } else if (n3 > 0.84) {
        r -= 14 * k; g -= 4 * k; b += 22 * k;
      }
      if (n4 > 0.93) {
        r += 18; g += 16; b += 12;
      } else if (n4 < 0.07) {
        r -= 28; g -= 26; b -= 22;
      }
      const stain = conHash11(Math.floor(x / 40) * 3.7 + Math.floor(y / 36) * 11.2);
      if (stain > 0.72) {
        const s = (stain - 0.72) / 0.28 * 0.28 * k;
        r += 18 * s; g -= 8 * s; b -= 22 * s;
      } else if (stain < 0.22) {
        const s = (0.22 - stain) / 0.22 * 0.22 * k;
        r -= 16 * s; g -= 6 * s; b += 10 * s;
      }
      const edge = Math.min(u, 1 - u, v, 1 - v);
      const groutW = 0.034;
      if (edge < groutW) {
        const t = 1 - edge / groutW;
        const wobble = 0.85 + 0.15 * conHash11(x * 0.4 + y * 0.37);
        const gt = Math.min(1, t * t * 1.15) * wobble;
        r = r * (1 - 0.56 * gt) + 68 * 0.56 * gt;
        g = g * (1 - 0.56 * gt) + 64 * 0.56 * gt;
        b = b * (1 - 0.56 * gt) + 58 * 0.56 * gt;
      }
      const crack = Math.abs(Math.sin((x + y * 0.35) * 0.09 + 1.7));
      if (crack < 0.018) {
        const ct = 1 - crack / 0.018;
        r *= 1 - 0.28 * ct * k;
        g *= 1 - 0.30 * ct * k;
        b *= 1 - 0.32 * ct * k;
      }
      const i = (y * size + x) * 4;
      d[i] = Math.max(0, Math.min(255, r));
      d[i + 1] = Math.max(0, Math.min(255, g));
      d[i + 2] = Math.max(0, Math.min(255, b));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function paintConcreteRough(ctx, size) {
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = conHash11(x * 0.21 + y * 0.27 + 3.1);
      const agg = conHash11(x * 0.63 + y * 0.41 + 6.6);
      let g = 198 + (n - 0.5) * 36;
      if (agg > 0.8) g += 28;
      else if (agg < 0.12) g -= 22;
      const edge = Math.min(u, 1 - u, v, 1 - v);
      if (edge < 0.034) g = Math.min(255, g + 42 * (1 - edge / 0.034));
      const i = (y * size + x) * 4;
      const v8 = Math.max(0, Math.min(255, g));
      d[i] = d[i + 1] = d[i + 2] = v8;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function paintConcreteBump(ctx, size) {
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = conHash11(x * 0.19 + y * 0.29 + 2.2);
      const agg = conHash11(x * 0.71 + y * 0.47 + 9.4);
      let h = 150 + (n - 0.5) * 28;
      if (agg > 0.78) h += 38;
      else if (agg < 0.1) h -= 18;
      const edge = Math.min(u, 1 - u, v, 1 - v);
      if (edge < 0.034) h -= 70 * (1 - edge / 0.034);
      const i = (y * size + x) * 4;
      const v8 = Math.max(0, Math.min(255, h));
      d[i] = d[i + 1] = d[i + 2] = v8;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function makeConcreteTexture() {
  if (concreteTexBundle) return concreteTexBundle;
  const albedo = makeCanvasTexture((ctx, size) => paintConcreteAlbedo(ctx, size, 1), 256);
  const albedoSoft = makeCanvasTexture((ctx, size) => paintConcreteAlbedo(ctx, size, 0.55), 256);
  const rough = makeCanvasTexture(paintConcreteRough, 256, { colorSpace: THREE.NoColorSpace });
  const bump = makeCanvasTexture(paintConcreteBump, 256, { colorSpace: THREE.NoColorSpace });
  concreteTextures.push(albedo, albedoSoft, rough, bump);
  concreteTexBundle = { albedo, albedoSoft, rough, bump };
  return concreteTexBundle;
}


/** World-space procedural concrete — MeshStandard so lights / shadows / fog / log-depth stay. */
const CONCRETE_KINDS = {
  floor: {
    scale: 0.42, variation: 0.70, wear: 0.32, grime: 0.48, moisture: 0.16, rust: 0.08,
    ground: 0.55, groundH: 0.45, grout: 0.72, tile: 5.0, warmth: 0.42, roughness: 0.86, color: 0x8a8680,
  },
  lane: {
    scale: 0.45, variation: 0.66, wear: 0.30, grime: 0.50, moisture: 0.14, rust: 0.06,
    ground: 0.58, groundH: 0.40, grout: 0.88, tile: 5.0, warmth: 0.50, roughness: 0.88, color: 0x7c7872,
  },
  wall: {
    scale: 0.52, variation: 0.74, wear: 0.48, grime: 0.38, moisture: 0.20, rust: 0.16,
    ground: 0.72, groundH: 0.85, grout: 0.62, tile: 5.5, warmth: 0.40, roughness: 0.80, color: 0x908c86,
  },
  berm: {
    scale: 0.72, variation: 0.68, wear: 0.42, grime: 0.52, moisture: 0.18, rust: 0.12,
    ground: 0.78, groundH: 1.15, grout: 0.0, tile: 5.0, warmth: 0.55, roughness: 0.90, color: 0x7a7468,
  },
  bermDark: {
    scale: 0.50, variation: 0.64, wear: 0.50, grime: 0.55, moisture: 0.12, rust: 0.18,
    ground: 0.62, groundH: 0.90, grout: 0.0, tile: 5.0, warmth: 0.48, roughness: 0.88, color: 0x5c584e,
  },
};

const CONCRETE_GLSL_UNIFORMS = /* glsl */`
uniform float uConcreteWear;
uniform float uConcreteScale;
uniform float uConcreteVar;
uniform float uConScale;
uniform float uConVar;
uniform float uConWear;
uniform float uConGrime;
uniform float uConMoisture;
uniform float uConRust;
uniform float uConGround;
uniform float uConGroundH;
uniform float uConGrout;
uniform float uConTile;
uniform float uConWarmth;
uniform float uConRough;
uniform float uConFloorY;

varying vec3 vConWP;
varying vec3 vConWN;

vec3 rangeConDetailN;
float rangeConLod;
`;

const CONCRETE_GLSL_FNS = /* glsl */`
float conHash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float conNoise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = conHash12(i);
  float b = conHash12(i + vec2(1.0, 0.0));
  float c = conHash12(i + vec2(0.0, 1.0));
  float d = conHash12(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float conFbm2(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 4; i++) {
    value += amp * conNoise2(p * freq);
    freq *= 2.05;
    amp *= 0.52;
  }
  return value;
}

vec3 conTriW(vec3 n) {
  vec3 w = pow(abs(n), vec3(4.0));
  return w / max(dot(w, vec3(1.0)), 0.0001);
}

float conTriplanar(vec3 wp, vec3 n, float scale) {
  vec3 p = wp / max(scale, 0.05);
  vec3 w = conTriW(n);
  float sx = conFbm2(p.yz * 1.15 + vec2(0.17, 0.43));
  float sy = conFbm2(p.xz * 1.15 + vec2(1.07, 0.29));
  float sz = conFbm2(p.xy * 1.15 + vec2(2.11, 0.61));
  return sx * w.x + sy * w.y + sz * w.z;
}

float conMacro(vec3 wp, float scale) {
  vec3 p = wp / max(scale * 3.5, 0.2);
  return conFbm2(p.xz * 0.35 + vec2(4.2, 1.8));
}

float conBay(vec3 wp) {
  return conFbm2(vec2(wp.x * 0.018, wp.z * 0.007) + vec2(2.1, 9.4));
}

float conPitting(vec3 wp, float scale) {
  vec3 p = wp / max(scale * 0.22, 0.06);
  return conFbm2(p.xz * 3.6 + vec2(1.9, 4.7));
}

float conMoisture(vec3 wp, vec3 n, float strength) {
  if (strength < 0.01) return 0.0;
  float streak;
  if (n.y > 0.55) {
    vec2 uv = wp.xz * 0.08;
    streak = conFbm2(vec2(uv.x * 0.35 + uv.y * 2.4, uv.y * 6.0));
    return smoothstep(0.55, 0.82, streak) * strength * 0.40;
  }
  float u = abs(n.x) > abs(n.z) ? wp.z : wp.x;
  streak = conFbm2(vec2(u * 0.028 + wp.y * 1.85, wp.y * 4.2));
  return smoothstep(0.55, 0.82, streak) * strength;
}

float conRust(vec3 wp, vec3 n, float strength) {
  if (strength < 0.01) return 0.0;
  vec2 cell = floor(wp.xz * 0.14);
  float seed = conHash12(cell + vec2(3.7, 11.2));
  float u = abs(n.x) > abs(n.z) ? wp.z : wp.x;
  float streak = conFbm2(vec2(u * 0.11 + seed * 4.0 + wp.y * 2.1, wp.y * 6.4));
  float vert = smoothstep(0.50, 0.80, streak);
  float wallBias = 1.0 - step(0.62, n.y);
  float h = max(wp.y - uConFloorY, 0.0);
  float heightBias = smoothstep(2.8, 0.15, h);
  return vert * strength * mix(0.28, 1.0, wallBias) * heightBias;
}

float conEdgeWear(vec3 n, float wear) {
  vec3 an = abs(normalize(n));
  float corner = 1.0 - min(min(an.x, an.y), an.z);
  float edge = clamp(length(fwidth(n)) * 8.0, 0.0, 1.0);
  return clamp((corner * 0.65 + edge * 0.35) * wear, 0.0, 1.0);
}

float conCavity(vec3 n, float grime) {
  vec3 an = abs(normalize(n));
  float concavity = 1.0 - max(max(an.x, an.y), an.z);
  return concavity * grime;
}

float conGround(vec3 wp, vec3 n, float strength, float falloffH) {
  if (strength < 0.01) return 0.0;
  float falloff = max(falloffH, 0.08);
  float height = max(wp.y - uConFloorY, 0.0);
  float floorMask = smoothstep(falloff, 0.0, height) * step(0.35, n.y);
  float wallMask = smoothstep(falloff, 0.0, height) * (1.0 - step(0.35, n.y));
  return clamp((floorMask + wallMask * 0.88) * strength, 0.0, 1.0);
}

vec2 conPanelCell(vec3 wp, vec3 n) {
  if (n.y > 0.45) {
    float ts = max(uConTile, 0.5);
    return floor(wp.xz / ts);
  }
  float run = abs(n.x) > abs(n.z) ? wp.z : wp.x;
  return floor(vec2(run / 5.5, (wp.y - uConFloorY) / 1.2));
}

vec2 conGrout(vec3 wp, vec3 n, float tileSize, float groutStr) {
  if (groutStr < 0.01) return vec2(0.0);
  float ts = max(tileSize, 0.25);
  vec2 grid;
  float edgeW;
  if (n.y >= 0.45) {
    grid = wp.xz / ts;
    edgeW = 0.018;
  } else {
    float run = abs(n.x) > abs(n.z) ? wp.z : wp.x;
    grid = vec2(run / max(ts, 5.0), (wp.y - uConFloorY) / 1.2);
    edgeW = 0.014;
  }
  vec2 cell = floor(grid);
  vec2 f = fract(grid);
  float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
  float grout = (1.0 - smoothstep(0.0, edgeW, edge)) * groutStr;
  float grit = grout * conHash12(cell + vec2(17.3, 9.1)) * 0.55 * groutStr;
  return vec2(grout, grit);
}

float conFormTies(vec3 wp, vec3 n, float str) {
  if (n.y > 0.45 || str < 0.01) return 0.0;
  float run = abs(n.x) > abs(n.z) ? wp.z : wp.x;
  vec2 g = vec2(run, wp.y - uConFloorY) / 0.82;
  vec2 cell = floor(g);
  float alive = step(0.18, conHash12(cell + vec2(4.4, 2.1)));
  vec2 f = fract(g) - 0.5;
  float hole = 1.0 - smoothstep(0.026, 0.058, length(f));
  return hole * alive * str;
}

float conPourSeam(vec3 wp, vec3 n, float wearK) {
  if (n.y > 0.45 || wearK < 0.02) return 0.0;
  float lift = fract((wp.y - uConFloorY) / 1.25);
  float seam = 1.0 - smoothstep(0.0, 0.032, min(lift, 1.0 - lift));
  float wobble = conFbm2(wp.xz * 0.22 + vec2(8.1, 3.4));
  return seam * mix(0.35, 1.0, wobble) * wearK;
}

void applyRangeConcreteAlbedo(inout vec4 diffuseColor, inout float roughnessFactor) {
  vec3 n = normalize(vConWN);
  vec3 wp = vConWP;
  float dist = length(cameraPosition - wp);
  rangeConLod = smoothstep(52.0, 240.0, dist);

  float wCtrl = clamp(uConcreteWear, 0.0, 1.0);
  float k = wCtrl / 0.4;
  float scale = max(uConScale * max(uConcreteScale, 0.05), 0.08);
  float variation = clamp(uConVar * uConcreteVar, 0.0, 1.75);
  float wearStr = clamp(uConWear * k, 0.0, 1.0);
  float grime = clamp(uConGrime * k, 0.0, 1.0);
  float moisture = clamp(uConMoisture * k, 0.0, 1.0);
  float rustStr = clamp(uConRust * k, 0.0, 1.0);
  float groundStr = clamp(uConGround * k, 0.0, 1.0);
  float groutStr = clamp(uConGrout * mix(0.55, 1.0, wCtrl), 0.0, 1.0);

  float micro = conTriplanar(wp, n, scale);
  float mac = conMacro(wp, scale);
  float patch = mix(micro, mac, mix(0.40, 0.78, rangeConLod));
  float pit = mix(conPitting(wp, scale), 0.5, rangeConLod);
  float bay = conBay(wp);

  vec3 albedo = diffuseColor.rgb;
  albedo *= mix(0.74, 1.20, patch);
  albedo *= mix(1.0, 0.70, variation * (1.0 - patch) * mix(1.0, 0.40, rangeConLod));
  albedo *= mix(0.86, 1.10, bay);

  vec2 pcell = conPanelCell(wp, n);
  float pid = conHash12(pcell + vec2(3.1, 8.7));
  float pid2 = conHash12(pcell + vec2(19.4, 2.6));
  float vMul = mix(0.68, 1.28, pid);
  vec3 hue = mix(vec3(1.03, 1.00, 0.97), vec3(0.97, 0.99, 1.01), pid2);
  float panelAmt = variation * mix(0.82, 0.55, rangeConLod);
  albedo *= mix(vec3(1.0), hue * vMul, panelAmt);

  float ao = conCavity(n, grime);
  albedo *= 1.0 - ao * 0.55;

  float wear = conEdgeWear(n, wearStr);
  albedo = mix(albedo, albedo * 1.10 + vec3(0.03), wear * (1.0 - rangeConLod * 0.4));

  float wet = conMoisture(wp, n, moisture);
  albedo *= 1.0 - wet * 0.22;

  float rust = conRust(wp, n, rustStr);
  albedo = mix(albedo, albedo * vec3(1.10, 0.86, 0.70), rust * 0.48);

  float contact = conGround(wp, n, groundStr, uConGroundH);
  albedo = mix(albedo, albedo * vec3(0.74, 0.72, 0.68), contact * 0.70);
  albedo = mix(albedo, albedo * vec3(1.05, 0.95, 0.84), contact * uConWarmth);

  vec2 tileFx = conGrout(wp, n, uConTile, groutStr);
  albedo *= 1.0 - tileFx.x * 0.72;
  albedo *= 1.0 - tileFx.y * 0.40;

  float seam = conPourSeam(wp, n, clamp(k * 0.85, 0.0, 1.0));
  albedo *= 1.0 - seam * 0.22;

  float ties = conFormTies(wp, n, mix(0.35, 1.0, clamp(variation, 0.0, 1.0)) * mix(1.0, 0.4, rangeConLod));
  albedo *= 1.0 - ties * 0.38;
  albedo = mix(albedo, albedo * vec3(0.78, 0.74, 0.68), ties * 0.55);

  float agg = smoothstep(0.64, 0.80, micro) * variation * (1.0 - rangeConLod);
  albedo *= mix(1.0, 0.91, agg);

  float rough = uConRough;
  rough = mix(rough, rough * 0.78, wear);
  rough = mix(rough, min(rough + 0.06, 1.0), wet);
  rough = mix(rough, rough * 0.92, rust);
  rough = mix(rough, rough * 1.05, patch * variation);
  rough = mix(rough, min(rough + 0.12, 1.0), contact);
  rough = mix(rough, min(rough + 0.10, 1.0), tileFx.x);
  rough = mix(rough, min(rough + 0.08, 1.0), ties);
  rough = mix(rough, rough * (0.94 + pit * 0.10), variation);
  roughnessFactor = clamp(rough, 0.08, 1.0);

  float eps = max(scale * 0.04, 0.02);
  float dx = conTriplanar(wp + vec3(eps, 0.0, 0.0), n, scale)
    - conTriplanar(wp - vec3(eps, 0.0, 0.0), n, scale);
  float dz = conTriplanar(wp + vec3(0.0, 0.0, eps), n, scale)
    - conTriplanar(wp - vec3(0.0, 0.0, eps), n, scale);
  float nAmt = 0.28 * variation * (1.0 - rangeConLod);
  vec3 pitN = vec3(pit - 0.5, 0.0, pit - 0.5) * (0.16 * variation * (1.0 - rangeConLod));
  rangeConDetailN = normalize(n + vec3(-dx, 0.0, -dz) * nAmt + pitN);

  diffuseColor.rgb = albedo;
}

void applyRangeConcreteNormal(inout vec3 normal) {
  vec3 dnView = normalize((viewMatrix * vec4(rangeConDetailN, 0.0)).xyz);
  float amt = 0.55 * (1.0 - rangeConLod);
  normal = normalize(mix(normal, dnView, amt));
}
`;

let concreteShaderFailed = false;

function fallbackConcreteMaterials() {
  if (concreteShaderFailed) return;
  concreteShaderFailed = true;
  console.warn("[concrete] custom shader failed; grit stays on the albedo map");
  if (scene) {
    scene.traverse((obj) => {
      const list = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
      for (const m of list) {
        if (!m || !m.userData || !m.userData.concreteKind) continue;
        m.onBeforeCompile = () => {};
        m.customProgramCacheKey = () => "rangeConcreteFallback";
        m.needsUpdate = true;
      }
    });
  }
  applyConcreteLook();
}

function compileRangeConcrete(shader, cfg) {
  if (concreteShaderFailed) return;
  const vs = shader.vertexShader;
  const fs = shader.fragmentShader;
  if (
    !vs.includes("#include <common>") ||
    !vs.includes("#include <worldpos_vertex>") ||
    !fs.includes("#include <common>") ||
    !fs.includes("#include <roughnessmap_fragment>")
  ) {
    console.warn("[concrete] missing shader chunks; using MeshStandardMaterial");
    fallbackConcreteMaterials();
    return;
  }

  shader.uniforms.uConcreteWear = uConcreteWear;
  shader.uniforms.uConcreteScale = uConcreteScale;
  shader.uniforms.uConcreteVar = uConcreteVar;
  shader.uniforms.uConScale = { value: cfg.scale };
  shader.uniforms.uConVar = { value: cfg.variation };
  shader.uniforms.uConWear = { value: cfg.wear };
  shader.uniforms.uConGrime = { value: cfg.grime };
  shader.uniforms.uConMoisture = { value: cfg.moisture };
  shader.uniforms.uConRust = { value: cfg.rust };
  shader.uniforms.uConGround = { value: cfg.ground };
  shader.uniforms.uConGroundH = { value: cfg.groundH };
  shader.uniforms.uConGrout = { value: cfg.grout };
  shader.uniforms.uConTile = { value: cfg.tile };
  shader.uniforms.uConWarmth = { value: cfg.warmth };
  shader.uniforms.uConRough = { value: cfg.roughness };
  shader.uniforms.uConFloorY = { value: FLOOR_Y };

  shader.vertexShader = shader.vertexShader.replace(
    "#include <common>",
    `#include <common>
varying vec3 vConWP;
varying vec3 vConWN;
`
  );
  shader.vertexShader = shader.vertexShader.replace(
    "#include <worldpos_vertex>",
    `#include <worldpos_vertex>
    vConWP = (modelMatrix * vec4(transformed, 1.0)).xyz;
    vConWN = normalize(mat3(modelMatrix) * objectNormal);
    `
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <common>",
    "#include <common>\n" + CONCRETE_GLSL_UNIFORMS
  );
  shader.fragmentShader = shader.fragmentShader.replace(
    "void main()",
    CONCRETE_GLSL_FNS + "\nvoid main()"
  );
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <roughnessmap_fragment>",
    `#include <roughnessmap_fragment>
    applyRangeConcreteAlbedo(diffuseColor, roughnessFactor);
    `
  );
  if (shader.fragmentShader.includes("#include <normal_fragment_begin>")) {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_begin>",
      `#include <normal_fragment_begin>
    applyRangeConcreteNormal(normal);
    `
    );
  }
}

function applyConcreteLook() {
  const scale = state.concreteScale ?? CONCRETE_SCALE_DEFAULT;
  const variation = state.concreteVar ?? CONCRETE_VAR_DEFAULT;
  const wear = state.concreteWear ?? CONCRETE_WEAR_DEFAULT;
  const repeat = 1 / Math.max(scale, 0.08);
  for (const tex of concreteTextures) tex.repeat.set(repeat, repeat);
  const bundle = concreteTexBundle || makeConcreteTexture();
  const amt = clamp(variation, 0, CONCRETE_VAR_MAX);
  for (const mat of concreteMaterials) {
    if (!mat || !mat.userData || !mat.userData.concreteKind) continue;
    const cfg = CONCRETE_KINDS[mat.userData.concreteKind] || CONCRETE_KINDS.floor;
    const seed = mat.userData.concreteSeed ?? 0.5;
    mat.map = amt < 0.35 ? bundle.albedoSoft : bundle.albedo;
    mat.roughnessMap = bundle.rough;
    mat.bumpMap = bundle.bump;
    const c = new THREE.Color(cfg.color);
    const vMul = 1 + (seed - 0.5) * 0.44 * amt;
    c.r = Math.max(0.05, Math.min(1, c.r * vMul));
    c.g = Math.max(0.05, Math.min(1, c.g * vMul));
    c.b = Math.max(0.05, Math.min(1, c.b * vMul));
    c.lerp(CONCRETE_DUST, wear * 0.30);
    mat.color.copy(c);
    mat.roughness = clamp((cfg.roughness != null ? cfg.roughness : 0.86) + wear * 0.10, 0.35, 1);
    mat.bumpScale = (0.18 + wear * 0.12) / Math.max(scale, 0.35);
    mat.metalness = 0.02;
  }
}

function makeConcreteMaterial(kind) {
  const cfg = CONCRETE_KINDS[kind] || CONCRETE_KINDS.floor;
  const tex = makeConcreteTexture();
  const mat = new THREE.MeshStandardMaterial({
    name: "RangeConcrete_" + kind,
    color: cfg.color,
    map: tex.albedo,
    roughnessMap: tex.rough,
    bumpMap: tex.bump,
    bumpScale: 0.18,
    roughness: cfg.roughness,
    metalness: 0.02,
    dithering: false,
  });
  mat.userData.concreteKind = kind;
  concreteMaterials.push(mat);
  if (!concreteShaderFailed) {
    mat.onBeforeCompile = (shader) => {
      try {
        compileRangeConcrete(shader, cfg);
      } catch (err) {
        console.warn("[concrete] onBeforeCompile failed", err);
        fallbackConcreteMaterials();
      }
    };
    mat.customProgramCacheKey = () => "rangeConcrete_" + kind;
  }
  applyConcreteLook();
  return mat;
}

function getConcreteVariant(kind, seed) {
  const k = CONCRETE_KINDS[kind] ? kind : "floor";
  if (!concreteVariantMats[k]) {
    let base = concreteMaterials.find((m) => m.userData && m.userData.concreteKind === k && m.userData.concreteSeed == null);
    if (!base) base = makeConcreteMaterial(k);
    const list = [];
    for (let i = 0; i < CONCRETE_TINT_VARIANTS; i++) {
      const m = i === 0 ? base : base.clone();
      m.userData.concreteKind = k;
      m.userData.concreteSeed = (i + 0.37) / CONCRETE_TINT_VARIANTS;
      if (i > 0) {
        m.onBeforeCompile = base.onBeforeCompile;
        m.customProgramCacheKey = base.customProgramCacheKey;
        concreteMaterials.push(m);
      }
      list.push(m);
    }
    concreteVariantMats[k] = list;
    applyConcreteLook();
  }
  const list = concreteVariantMats[k];
  const s = Number.isFinite(seed) ? seed : 0.5;
  const t = s - Math.floor(s);
  return list[Math.floor(t * list.length) % list.length];
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

/** Register world solids for lean anti-clip probes (excludes player / gun / targets). */
function registerLeanSolid(obj) {
  if (!obj) return obj;
  obj.traverse((c) => {
    if (c.isMesh && !c.userData.leanSolid && !c.userData.breakable) {
      c.userData.leanSolid = true;
      leanSolids.push(c);
    }
  });
  return obj;
}

/** Tag a prop as a vault lip (sandbags, benches, tables, low crates). */
function markVaultable(obj) {
  if (!obj) return obj;
  obj.userData.vaultable = true;
  obj.traverse((c) => {
    c.userData.vaultable = true;
  });
  return obj;
}

function isAdsNow() {
  if (input.ads) return true;
  const t = state.adsPreview ? 1 : state.adsFactor;
  return t > 0.22;
}

function hasFwdIntent() {
  return player.fwdIntent >= 0.18 || player.planarSpeed > 1.6 || state.sliding;
}

function standEyeWorld() {
  return player.supportY + (player.eyeHeight - FLOOR_Y);
}

function sitEyeWorld() {
  return player.supportY + player.crouchSitHeight;
}

function syncCrouchSlider() {
  const slider = el("crouchHeightSlider");
  const val = el("crouchHeightVal");
  const pct = Math.round(clamp(state.crouchGrad, 0, 1) * 100);
  if (slider && document.activeElement !== slider) slider.value = String(pct);
  if (val) val.textContent = pct + "%";
}

function setCrouchGrad(g, { remember = true } = {}) {
  state.crouchGrad = clamp(g, 0, 1);
  if (remember && state.crouchGrad > 0.04) state.crouchLastDepth = state.crouchGrad;
  if (state.crouchGrad < 0.02) {
    state.crouchGrad = 0;
    state.crouchToggled = false;
  }
  syncCrouchSlider();
  scheduleSaveSettings();
}

function addLeanSolid(obj) {
  scene.add(obj);
  return registerLeanSolid(obj);
}

/**
 * Sideways clearance from unleaned head toward lean direction.
 * sign > 0 = lean left (camera local −X), sign < 0 = lean right.
 * Returns meters of free lateral travel before skin gap (0..leanOffset+).
 */
function probeLeanClearance(sign) {
  if (!sign || !leanSolids.length) return player.leanOffset;
  const rightX = Math.cos(player.yaw);
  const rightZ = -Math.sin(player.yaw);
  // Positive leanAngle moves leanPivot −local X (world left = −flatRight).
  _leanDir.set(-sign * rightX, 0, -sign * rightZ);
  if (_leanDir.lengthSq() < 1e-8) return player.leanOffset;
  _leanDir.normalize();
  _leanOrigin.set(player.pos.x, player.eyeCurrent, player.pos.z);
  const skin = player.leanSkin;
  const maxDist = player.leanOffset + skin;
  _raycaster.near = 0;
  _raycaster.far = maxDist;
  _raycaster.set(_leanOrigin, _leanDir);
  const hits = _raycaster.intersectObjects(leanSolids, false);
  if (!hits.length) return player.leanOffset;
  // Ignore grazing / embedded hits (self-overlap style zero-distance cheese)
  let dist = hits[0].distance;
  for (const h of hits) {
    if (h.distance > 1e-4) {
      dist = h.distance;
      break;
    }
  }
  if (dist <= 1e-4) return player.leanOffset;
  return Math.max(0, dist - skin);
}

/** Clamp desired lean target (±leanMax) by wall/prop clearance. */
function clampLeanTarget(desired) {
  if (!desired) return 0;
  const sign = Math.sign(desired);
  const clear = probeLeanClearance(sign);
  const allowedRatio = Math.min(1, clear / player.leanOffset);
  return sign * player.leanMax * allowedRatio;
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
  return markVaultable(mesh);
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
  return markVaultable(mesh);
}

/** Tan canvas bag — simple stacked boxes for the firing-line stall. */
function makeSandbagMat(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.97,
    metalness: 0.02,
  });
}

function makeSandbag(w, h, d, x, y, z, rotY, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), makeSandbagMat(color));
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY || 0;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Brick-pattern stack sitting on the floor at (cx, cz).
 * Slight size/yaw variation so it reads as bags, not one crate.
 */
function makeSandbagStack(cx, cz, opts = {}) {
  const group = new THREE.Group();
  group.position.set(cx, FLOOR_Y, cz);
  group.rotation.y = opts.rotY || 0;
  const bagW = opts.bagW != null ? opts.bagW : 0.50;
  const bagH = opts.bagH != null ? opts.bagH : 0.155;
  const bagD = opts.bagD != null ? opts.bagD : 0.30;
  const rows = opts.rows != null ? opts.rows : 5;
  const cols = opts.cols != null ? opts.cols : 2;
  const tans = [0xcbb58a, 0xc2aa7c, 0xd4c094, 0xb89d70, 0xc8b082];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const brick = (r % 2) * 0.10;
      const w = bagW * (0.96 + ((r + c) % 3) * 0.025);
      const d = bagD * (0.94 + ((r * 2 + c) % 3) * 0.03);
      const lx = ((r + c) % 2) * 0.025 - 0.012;
      const ly = bagH * 0.5 + r * bagH * 0.97;
      const lz = (c - (cols - 1) * 0.5) * (bagD * 0.90) + brick;
      const yaw = ((r * 3 + c * 5) % 7 - 3) * 0.035;
      const color = tans[(r + c * 3) % tans.length];
      group.add(makeSandbag(w, bagH, d, lx, ly, lz, yaw, color));
    }
  }
  return markVaultable(group);
}

/** Low timber rest in front of bags — short, side-bay only (not a lane barrier). */
function makeStallBench(cx, cz, seatW = 1.1) {
  const group = new THREE.Group();
  group.position.set(cx, FLOOR_Y, cz);
  const woodTex = makeWoodTexture();
  const plank = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0x9a7548,
    roughness: 0.86,
    metalness: 0.04,
  });
  const postMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0x6e5030,
    roughness: 0.9,
    metalness: 0.03,
  });
  const seatH = 0.065;
  const seatD = 0.20;
  const seatY = 0.40;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW, seatH, seatD), plank);
  seat.position.set(0, seatY, 0);
  seat.castShadow = true;
  seat.receiveShadow = true;
  group.add(seat);
  const legH = seatY - seatH * 0.5;
  const inset = seatW * 0.38;
  for (const dx of [-inset, inset]) {
    for (const dz of [-0.06, 0.06]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.055, legH, 0.055), postMat);
      leg.position.set(dx, legH * 0.5, dz);
      leg.castShadow = true;
      leg.receiveShadow = true;
      group.add(leg);
    }
  }
  return markVaultable(group);
}

/** Waist-high wood range bench — plank language matches spawn tables, vaultable lip. */
function makeRangePicnicBench(cx, cz, opts = {}) {
  const group = new THREE.Group();
  group.position.set(cx, FLOOR_Y, cz);
  group.rotation.y = opts.rotY || 0;
  const woodTex = makeWoodTexture();
  const plank = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0xa07a4c,
    roughness: 0.88,
    metalness: 0.04,
  });
  const postMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0x6a4c2c,
    roughness: 0.9,
    metalness: 0.03,
  });
  const seatW = opts.seatW != null ? opts.seatW : 1.52;
  const seatD = 0.42;
  const seatH = 0.055;
  const seatY = 0.96;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW, seatH, seatD), plank);
  seat.position.set(0, seatY, 0);
  seat.castShadow = true;
  seat.receiveShadow = true;
  group.add(seat);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(seatW + 0.03, 0.04, 0.035), postMat);
  apron.position.set(0, seatY - 0.04, seatD * 0.5 - 0.01);
  apron.castShadow = true;
  apron.receiveShadow = true;
  group.add(apron);
  const apronB = apron.clone();
  apronB.position.z = -seatD * 0.5 + 0.01;
  group.add(apronB);
  const legH = seatY - seatH * 0.5;
  const ix = seatW * 0.42;
  const iz = seatD * 0.32;
  for (const dx of [-ix, ix]) {
    for (const dz of [-iz, iz]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, legH, 0.06), postMat);
      leg.position.set(dx, legH * 0.5, dz);
      leg.castShadow = true;
      leg.receiveShadow = true;
      group.add(leg);
    }
  }
  const stretch = new THREE.Mesh(new THREE.BoxGeometry(seatW * 0.78, 0.04, 0.04), postMat);
  stretch.position.set(0, 0.28, 0);
  stretch.castShadow = true;
  stretch.receiveShadow = true;
  group.add(stretch);
  group.userData.seatTop = seatY + seatH * 0.5;
  group.userData.seatW = seatW;
  markVaultable(group);
  return group;
}

/** Simple beer bottle — body + shoulder + neck + cap. Origin at the base. */
function makeBeerBottle(colorHex) {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.22,
    metalness: 0.12,
    transparent: true,
    opacity: 0.78,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.118, 10), glass);
  body.position.y = 0.059;
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.026, 0.028, 10), glass);
  shoulder.position.y = 0.132;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.048, 8), glass);
  neck.position.y = 0.170;
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.013, 0.013, 0.01, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a7a38, roughness: 0.45, metalness: 0.55 })
  );
  cap.position.y = 0.199;
  g.add(body, shoulder, neck, cap);
  g.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
      c.userData.breakable = true;
    }
  });
  return g;
}

/** Side-bay waist-high benches ~15–25 m downrange, clear of the 0-lane walk. */
function buildRangeBenches() {
  beerBottles = [];
  const greens = [0x1e5a32, 0x245c38];
  const browns = [0x5a3218, 0x6a3a1c];
  const layouts = [
    { x: -6.15, meters: 16.5, rotY: 0.04, n: 4 },
    { x: 6.25, meters: 20.5, rotY: -0.05, n: 3 },
    { x: -5.9, meters: 24.0, rotY: 0.07, n: 4 },
  ];
  for (const L of layouts) {
    const bench = makeRangePicnicBench(L.x, rangeZ(L.meters), { rotY: L.rotY });
    const seatTop = bench.userData.seatTop || 0.9875;
    const seatW = bench.userData.seatW || 1.52;
    const span = seatW * 0.32;
    for (let i = 0; i < L.n; i++) {
      const hex = (i % 2 === 0) ? greens[i % greens.length] : browns[i % browns.length];
      const bottle = makeBeerBottle(hex);
      const t = L.n === 1 ? 0.5 : i / (L.n - 1);
      const lx = -span + 2 * span * t;
      const lz = ((i % 2) * 2 - 1) * 0.08;
      bottle.position.set(lx, seatTop, lz);
      bottle.rotation.y = (i - 1.2) * 0.11;
      bench.add(bottle);
      const rec = {
        group: bottle,
        color: hex,
        broken: false,
        zone: { center: new THREE.Vector3(), radius: 0.048 },
      };
      bottle.userData.beerBottle = rec;
      beerBottles.push(rec);
    }
    addLeanSolid(bench);
  }
  syncBeerBottleZones();
}

function syncBeerBottleZones() {
  const wp = new THREE.Vector3();
  for (const bot of beerBottles) {
    if (!bot.group || !bot.zone) continue;
    bot.group.getWorldPosition(wp);
    bot.zone.center.set(wp.x, wp.y + 0.09, wp.z);
  }
}

function getShardGeo() {
  if (!_shardGeo) _shardGeo = new THREE.BoxGeometry(0.02, 0.012, 0.006);
  return _shardGeo;
}

function spawnGlassShards(pos, color) {
  if (!scene || !pos) return;
  const n = 4 + Math.floor(Math.random() * 5);
  for (let i = 0; i < n; i++) {
    let rec;
    if (glassShards.length >= GLASS_SHARD_MAX) {
      rec = glassShards.shift();
      if (rec.mesh.parent) rec.mesh.parent.remove(rec.mesh);
      if (rec.mesh.material) rec.mesh.material.dispose();
    }
    const mat = new THREE.MeshStandardMaterial({
      color: color || 0x2a6a38,
      roughness: 0.2,
      metalness: 0.08,
      transparent: true,
      opacity: 0.85,
    });
    rec = {
      mesh: new THREE.Mesh(getShardGeo(), mat),
      vel: new THREE.Vector3(),
      angVel: new THREE.Vector3(),
      bounced: false,
      sleeping: false,
      life: GLASS_SHARD_LIFE,
    };
    rec.mesh.castShadow = false;
    rec.mesh.receiveShadow = true;
    rec.mesh.position.copy(pos);
    rec.mesh.position.y += 0.02;
    rec.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rec.mesh.scale.set(0.55 + Math.random() * 0.9, 0.45 + Math.random() * 0.8, 0.6 + Math.random() * 1.1);
    rec.vel.set(
      (Math.random() - 0.5) * 3.6,
      1.25 + Math.random() * 2.15,
      (Math.random() - 0.5) * 3.6
    );
    rec.angVel.set(
      (Math.random() - 0.5) * 22,
      (Math.random() - 0.5) * 16,
      (Math.random() - 0.5) * 22
    );
    scene.add(rec.mesh);
    glassShards.push(rec);
  }
}

function updateGlassShards(dt) {
  const floorY = FLOOR_Y + 0.006;
  for (let i = glassShards.length - 1; i >= 0; i--) {
    const s = glassShards[i];
    s.life -= dt;
    if (s.life <= 0) {
      if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
      if (s.mesh.material) s.mesh.material.dispose();
      glassShards.splice(i, 1);
      continue;
    }
    if (s.mesh.material && s.life < 1.1) {
      s.mesh.material.opacity = 0.85 * Math.max(0, s.life / 1.1);
    }
    if (s.sleeping) continue;
    s.vel.y -= CASING_GRAVITY * dt;
    s.mesh.position.addScaledVector(s.vel, dt);
    s.mesh.rotation.x += s.angVel.x * dt;
    s.mesh.rotation.y += s.angVel.y * dt;
    s.mesh.rotation.z += s.angVel.z * dt;
    if (s.mesh.position.y <= floorY) {
      s.mesh.position.y = floorY;
      if (!s.bounced) {
        s.bounced = true;
        s.vel.y = Math.abs(s.vel.y) * 0.28;
        s.vel.x *= 0.45;
        s.vel.z *= 0.45;
        s.angVel.multiplyScalar(0.4);
        if (s.vel.y < 0.4) s.vel.y = 0.4;
      } else if (s.vel.y <= 0) {
        s.vel.set(0, 0, 0);
        s.angVel.set(0, 0, 0);
        s.sleeping = true;
      }
    }
  }
}

function breakBeerBottle(bot, hitPos) {
  if (!bot || bot.broken) return;
  bot.broken = true;
  if (bot.group) bot.group.visible = false;
  sfx.play("shatter");
  const p = hitPos || (bot.zone && bot.zone.center);
  spawnGlassShards(p, bot.color);
}

function restoreBeerBottles() {
  for (const bot of beerBottles) {
    bot.broken = false;
    if (bot.group) bot.group.visible = true;
  }
}

function clearGlassShards() {
  for (const s of glassShards) {
    if (s.mesh && s.mesh.parent) s.mesh.parent.remove(s.mesh);
    if (s.mesh && s.mesh.material) s.mesh.material.dispose();
  }
  glassShards = [];
}

/** Optional matOpts: { roughness, metalness } — metal vs polymer separation on guns. */
function makeBox(w, h, d, color, x, y, z, matOpts = null) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: matOpts && matOpts.roughness != null ? matOpts.roughness : 0.65,
    metalness: matOpts && matOpts.metalness != null ? matOpts.metalness : 0.15,
  });
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

function makeCyl(rTop, rBot, h, color, x, y, z, rx, ry, rz, segs = 16, matOpts = null) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, segs);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: matOpts && matOpts.roughness != null ? matOpts.roughness : 0.55,
    metalness: matOpts && matOpts.metalness != null ? matOpts.metalness : 0.35,
  });
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


/** Gun mesh material presets — polymer (matte) vs metal (shinier). */
const GUN_MAT = {
  polymer: { roughness: 0.78, metalness: 0.06 },
  polymerDark: { roughness: 0.82, metalness: 0.04 },
  metal: { roughness: 0.42, metalness: 1.0 },
  darkMetal: { roughness: 0.46, metalness: 1.0 },
  bronze: { roughness: 0.45, metalness: 0.55 },
};

/** Picatinny-ish rail: base + overlapping tooth boxes for readable bevel. */
function makePicRail(width, height, length, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(makeBox(width, height * 0.5, length, 0x1a1f28, 0, -height * 0.12, 0, GUN_MAT.darkMetal));
  const teeth = Math.max(5, Math.floor(length / 0.017));
  for (let i = 0; i < teeth; i++) {
    const tz = (i / (teeth - 1) - 0.5) * (length * 0.9);
    g.add(makeBox(width * 0.94, height * 0.55, 0.0075, 0x2a3140, 0, height * 0.28, tz, GUN_MAT.darkMetal));
  }
  // Side rails for bevel read
  g.add(makeBox(0.004, height * 0.7, length * 0.98, 0x151920, -width * 0.48, 0.0, 0, GUN_MAT.darkMetal));
  g.add(makeBox(0.004, height * 0.7, length * 0.98, 0x151920, width * 0.48, 0.0, 0, GUN_MAT.darkMetal));
  return g;
}

/** Additive muzzle flash (position = muzzle tip). HDR core + pooled tongues, reshaped per shot. */
function makeMuzzleFlashSprite(x, y, z, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.name = "muzzleFlash";
  const mkMat = (hex, opacity) =>
    new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.018 * scale, 10, 10), mkMat(0xfffaf0, 1));
  core.material.color.setRGB(4.8, 4.4, 3.6);
  g.add(core);
  const tongueGeo = new THREE.PlaneGeometry(1, 1);
  const tongues = [];
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(tongueGeo, mkMat(0xffcc66, 1));
    t.visible = false;
    g.add(t);
    tongues.push(t);
  }
  g.visible = false;
  g.userData.flashScale = scale;
  g.userData.core = core;
  g.userData.tongues = tongues;
  g.userData.shotScale = 1;
  g.userData.flashMs = MUZZLE_FLASH_MS;
  g.userData.settleRate = 0;
  return g;
}

/** Roll a new burst: irregular tongues, bore roll, heat jitter. No continuous spin. */
function rollMuzzleBurst() {
  if (!muzzleFlash) return;
  const ud = muzzleFlash.userData;
  const tongues = ud.tongues || [];
  const s = ud.flashScale || 1;
  const suppressed = suppressorMounted();
  const smg = state.weaponId === "example_smg";
  const bolt = isBoltGun();

  let shotScale = 0.75 + Math.random() * 0.6;
  if (smg) shotScale *= 0.9;
  else if (bolt) shotScale *= 1.12;
  ud.shotScale = shotScale;

  muzzleFlash.rotation.set(
    (Math.random() - 0.5) * 0.06,
    (Math.random() - 0.5) * 0.06,
    Math.random() * Math.PI * 2
  );
  ud.settleRate = (Math.random() - 0.5) * 1.6;

  let ms = MUZZLE_FLASH_MS + (Math.random() * 18 - 8);
  if (smg) ms *= 0.86;
  else if (bolt) ms *= 1.1;
  if (suppressed) ms *= 0.55;
  ud.flashMs = clamp(ms, 36, 130);
  player.flashUntil = performance.now() + ud.flashMs;

  const core = ud.core;
  if (core) {
    const heat = 0.88 + Math.random() * 0.28;
    core.material.color.setRGB(5.0 * heat, 4.4 * heat, 3.3 * heat * (0.75 + Math.random() * 0.4));
    core.material.opacity = suppressed ? 0.7 : 1;
    const cr = 0.82 + Math.random() * 0.4;
    core.scale.set(cr, cr, 0.75 + Math.random() * 0.4);
  }

  const n = 3 + (Math.random() * 4 | 0);
  for (let i = 0; i < tongues.length; i++) {
    const t = tongues[i];
    if (i >= n) {
      t.visible = false;
      continue;
    }
    t.visible = true;
    const kind = Math.random();
    if (kind < 0.32) {
      t.material.color.setRGB(4.5 + Math.random() * 0.7, 3.9 + Math.random() * 0.5, 2.5 + Math.random() * 0.7);
    } else if (kind < 0.7) {
      t.material.color.setRGB(3.5 + Math.random() * 0.6, 2.1 + Math.random() * 0.55, 0.5 + Math.random() * 0.35);
    } else {
      t.material.color.setRGB(2.9 + Math.random() * 0.5, 1.35 + Math.random() * 0.45, 0.2 + Math.random() * 0.22);
    }
    t.material.opacity = (suppressed ? 0.68 : 0.9) + Math.random() * 0.1;

    if (i === 0) {
      const len = (0.15 + Math.random() * 0.07) * s;
      const wid = (0.016 + Math.random() * 0.016) * s;
      t.scale.set(wid, len, 1);
      t.rotation.set(
        -Math.PI / 2 + (Math.random() - 0.5) * 0.22,
        (Math.random() - 0.5) * 0.28,
        (Math.random() - 0.5) * 0.5
      );
      t.position.set((Math.random() - 0.5) * 0.01 * s, (Math.random() - 0.5) * 0.01 * s, -len * 0.28);
    } else {
      const fat = Math.random() < 0.42;
      const len = (fat ? 0.05 : 0.078) * (0.65 + Math.random() * 0.75) * s;
      const wid = (fat ? 0.036 : 0.015) * (0.65 + Math.random() * 0.7) * s;
      t.scale.set(len, wid, 1);
      const ang = Math.random() * Math.PI * 2;
      t.rotation.set(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        ang
      );
      t.position.set(
        Math.cos(ang) * len * 0.12,
        Math.sin(ang) * len * 0.12,
        (Math.random() - 0.5) * 0.012 * s
      );
    }
  }
}

function makeRingTube(innerR, outerR, length, color, segs = 20, matOpts = null) {
  const g = new THREE.Group();
  const roughness = matOpts && matOpts.roughness != null ? matOpts.roughness : 0.42;
  const metalness = matOpts && matOpts.metalness != null ? matOpts.metalness : 0.55;
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(outerR, outerR, length, segs, 1, true),
    new THREE.MeshStandardMaterial({ color, roughness, metalness, side: THREE.DoubleSide })
  );
  outer.rotation.x = Math.PI / 2;
  const lipMat = new THREE.MeshStandardMaterial({ color, roughness, metalness, side: THREE.DoubleSide });
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
  const scopeMat = GUN_MAT.darkMetal;
  if (profile === "iron") {
    // Believable block-gun irons: dark steel, thin front blade + rear U-notch / ghost-ring
    const steel = 0x2a3038;
    const steelDark = 0x1a1f28;
    const tipEdge = 0x4a5560; // slight lighter tip edge for ADS readability (not candy)
    // Rear — closer to eye (+Z), aperture / U-notch peep plate
    const rearBase = makeBox(0.046, 0.009, 0.02, steelDark, 0, 0.007, 0.055, scopeMat);
    const rearPlate = makeBox(0.04, 0.026, 0.009, steel, 0, 0.024, 0.055, scopeMat);
    const notchL = makeBox(0.009, 0.02, 0.011, steelDark, -0.013, 0.033, 0.055, scopeMat);
    const notchR = makeBox(0.009, 0.02, 0.011, steelDark, 0.013, 0.033, 0.055, scopeMat);
    const lipL = makeBox(0.003, 0.016, 0.008, tipEdge, -0.0075, 0.034, 0.055, scopeMat);
    const lipR = makeBox(0.003, 0.016, 0.008, tipEdge, 0.0075, 0.034, 0.055, scopeMat);
    // Front — near muzzle end (−Z), thin tapered blade + tiny protective wings
    const frontBase = makeBox(0.014, 0.007, 0.014, steelDark, 0, 0.007, -0.14, scopeMat);
    const postLow = makeBox(0.0065, 0.01, 0.0065, steel, 0, 0.016, -0.14, scopeMat);
    const postMid = makeBox(0.0045, 0.012, 0.0045, steel, 0, 0.026, -0.14, scopeMat);
    const postTip = makeBox(0.0035, 0.007, 0.0035, tipEdge, 0, 0.035, -0.14, scopeMat); // square tip
    const wingL = makeBox(0.007, 0.009, 0.0025, steelDark, -0.009, 0.02, -0.14, scopeMat);
    const wingR = makeBox(0.007, 0.009, 0.0025, steelDark, 0.009, 0.02, -0.14, scopeMat);
    g.add(rearBase, rearPlate, notchL, notchR, lipL, lipR, frontBase, postLow, postMid, postTip, wingL, wingR);
  } else if (profile === "holo") {
    // EOTech XPS3-ish: crisp black hood, open rear, clean edges
    const blk = 0x0e1014;
    const blk2 = 0x1a1e26;
    const edge = 0x2a303a;
    const mount = makeBox(0.048, 0.009, 0.056, blk2, 0, 0.005, 0.004, scopeMat);
    const sideL = makeBox(0.005, 0.044, 0.05, blk, -0.029, 0.033, -0.005, scopeMat);
    const sideR = makeBox(0.005, 0.044, 0.05, blk, 0.029, 0.033, -0.005, scopeMat);
    const top = makeBox(0.063, 0.006, 0.05, blk, 0, 0.057, -0.005, scopeMat);
    // Edge bevel strips (overlapping) for cleaner hood silhouette
    const topEdge = makeBox(0.065, 0.003, 0.048, edge, 0, 0.061, -0.005, scopeMat);
    const frontBot = makeBox(0.063, 0.005, 0.005, blk, 0, 0.012, -0.031, scopeMat);
    const frontL = makeBox(0.005, 0.044, 0.005, blk, -0.029, 0.033, -0.031, scopeMat);
    const frontR = makeBox(0.005, 0.044, 0.005, blk, 0.029, 0.033, -0.031, scopeMat);
    const glass = makeLensGlass(0.02, 0.09);
    glass.material.color.setHex(0xc8d8e8);
    glass.position.set(0, 0.033, -0.029);
    const batt = makeBox(0.017, 0.03, 0.03, blk2, 0.041, 0.031, 0.0, scopeMat);
    const battCap = makeBox(0.019, 0.008, 0.032, edge, 0.041, 0.048, 0.0, scopeMat);
    const hoodLip = makeBox(0.063, 0.004, 0.01, blk, 0, 0.057, 0.021, scopeMat);
    g.add(mount, sideL, sideR, top, topEdge, frontBot, frontL, frontR, glass, batt, battCap, hoodLip);
  } else if (profile === "acog") {
    // Cleaner anodized tube — less muddy blues
    const body = 0x2e3542;
    const dark = 0x161b24;
    const mount = makeBox(0.038, 0.013, 0.09, body, 0, 0.007, 0.01, scopeMat);
    const mountLip = makeBox(0.042, 0.004, 0.086, dark, 0, 0.015, 0.01, scopeMat);
    const tube = makeRingTube(0.012, 0.019, 0.13, body, 18, scopeMat);
    tube.position.set(0, 0.038, -0.01);
    const bell = makeRingTube(0.014, 0.025, 0.028, dark, 18, scopeMat);
    bell.position.set(0, 0.038, -0.09);
    const ocular = makeRingTube(0.011, 0.021, 0.024, dark, 18, scopeMat);
    ocular.position.set(0, 0.038, 0.065);
    const glassF = makeLensGlass(0.013, 0.13);
    glassF.material.color.setHex(0xa8c0d8);
    glassF.position.set(0, 0.038, -0.105);
    const glassB = makeLensGlass(0.011, 0.09);
    glassB.material.color.setHex(0xb0c8dc);
    glassB.position.set(0, 0.038, 0.078);
    g.add(mount, mountLip, tube, bell, ocular, glassF, glassB);
  } else {
    // sniper_scope — long tube, crisp dark housing
    const body = 0x1e2430;
    const dark = 0x10141a;
    const mount = makeBox(0.036, 0.011, 0.12, 0x2a3140, 0, 0.006, 0, scopeMat);
    const mountLip = makeBox(0.04, 0.0035, 0.116, dark, 0, 0.013, 0, scopeMat);
    const tube = makeRingTube(0.011, 0.018, 0.2, body, 20, scopeMat);
    tube.position.set(0, 0.04, -0.02);
    const obj = makeRingTube(0.016, 0.031, 0.04, dark, 22, scopeMat);
    obj.position.set(0, 0.04, -0.14);
    const ocular = makeRingTube(0.012, 0.023, 0.032, dark, 20, scopeMat);
    ocular.position.set(0, 0.04, 0.1);
    const glassObj = makeLensGlass(0.018, 0.16);
    glassObj.material.color.setHex(0x9eb6cc);
    glassObj.position.set(0, 0.04, -0.162);
    const glassEye = makeLensGlass(0.012, 0.11);
    glassEye.material.color.setHex(0xb4c8dc);
    glassEye.position.set(0, 0.04, 0.118);
    g.add(mount, mountLip, tube, obj, ocular, glassObj, glassEye);
  }
  return g;
}

/* ---- Barrel heat (rounds-through, exponential cool) ----
 * Per-weapon 0–1 stored heat. Each shot adds energy/mass; cool is e^{-t/τ}
 * (τ ≈ 4–8 s), not a linear snap. Heat *color* is orange/amber emissive on
 * the barrel + muzzle device only (not receiver / optic). Air above the
 * tube is a colorless rising haze (displacement mask / warp, not a white sheet). Bloom already in stack.
 */
function getBarrelHeatSpec(weaponId = state.weaponId) {
  return BARREL_HEAT_SPEC[weaponId] || BARREL_HEAT_SPEC.example_smg;
}

function addBarrelHeatShot(weaponId = state.weaponId) {
  const spec = getBarrelHeatSpec(weaponId);
  const h = barrelHeatAmt[weaponId] || 0;
  // Soft saturate so a long dump holds orange-hot instead of clipping hard.
  barrelHeatAmt[weaponId] = clamp(h + spec.add * (1 - h * 0.28), 0, 1);
}

function coolBarrelHeat(dt) {
  const ids = Object.keys(barrelHeatAmt);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const h = barrelHeatAmt[id];
    if (h <= 1e-5) {
      barrelHeatAmt[id] = 0;
      continue;
    }
    const spec = getBarrelHeatSpec(id);
    barrelHeatAmt[id] = h * Math.exp(-dt / spec.tau);
  }
}

function getBarrelHeatEmissiveMap() {
  if (barrelHeatEmissiveMap) return barrelHeatEmissiveMap;
  const w = 8;
  const h = 64;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  // Canvas top → v=1 (cylinder +Y / muzzle after rotX). Hotter toward muzzle.
  for (let y = 0; y < h; y++) {
    const t = 1 - y / (h - 1);
    const g = 0.20 + 0.80 * Math.pow(t, 1.55);
    const v = Math.round(g * 255);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, w, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.flipY = true;
  barrelHeatEmissiveMap = tex;
  return tex;
}

function getHeatHazeDummyTex() {
  if (heatHazeDummyTex) return heatHazeDummyTex;
  const data = new Uint8Array([0, 0, 0, 0]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  heatHazeDummyTex = tex;
  return tex;
}

const HEAT_HAZE_NOISE_GLSL = /* glsl */`
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }
      float fbm(vec2 p) {
        float s = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          s += a * noise(p);
          p = p * 2.11 + vec2(1.7, 9.2);
          a *= 0.5;
        }
        return s;
      }
      void heatField(vec3 wp, vec2 vu, out float mask, out vec2 nxy, out float haze) {
        vec2 ns = uNScale / max(uSize, 0.2);
        vec2 uv;
        // Barrel cards: rise along card UV.y (up the plane). Height-fog post: world XZ + world Y.
        if (uBarrelCard > 0.5) {
          float along = (vu.x - 0.5) * ns.x * 0.28;
          float rise = vu.y * ns.y - uTime * uRise;
          uv = vec2(along, rise);
        } else {
          vec2 field = vec2(wp.x, wp.z) * ns.x;
          float y = wp.y * ns.y - uTime * uRise;
          uv = vec2(field.x, y);
        }
        float n1 = fbm(uv);
        float n2 = fbm(uv * 1.63 + vec2(5.1, -uTime * 0.22));
        vec2 warped = uv + (vec2(n1, n2) - 0.5) * uWarp;
        haze = fbm(warped);
        float wiggle = abs(n1 - n2);
        float body = smoothstep(0.22, 0.68, haze) * (0.55 + 0.45 * wiggle);
        float height = 1.0;
        if (uHeightFog > 0.5) {
          float edgeX = smoothstep(0.0, 0.12, vu.x) * smoothstep(1.0, 0.88, vu.x);
          float edgeY = smoothstep(0.0, 0.04, vu.y) * smoothstep(1.0, 0.92, vu.y);
          float hAbove = wp.y - uFloorY;
          float fogN = fbm(vec2(wp.x, wp.z) * (0.09 / max(uSize, 0.2)) + vec2(uTime * 0.04, 3.1));
          float band = uBandH * uSize * (0.48 + 1.35 * fogN);
          height = (1.0 - smoothstep(band * 0.12, band, hAbove)) * smoothstep(-0.05, 0.04, hAbove);
          body = max(body, height * (0.40 + 0.60 * haze));
          mask = body * edgeX * edgeY * height;
        } else if (uBarrelCard > 0.5) {
          // Soft safe zone: L/R/top dead / feathered; bottom seats on tube; active lobe bottom-mid → top-third.
          float padLR = 0.26;
          float edgeX = smoothstep(0.0, padLR, vu.x) * smoothstep(1.0, 1.0 - padLR, vu.x);
          float seat = smoothstep(-0.04, 0.05, vu.y);
          float topCut = smoothstep(0.72, 0.38, vu.y);
          float dx = (vu.x - 0.5) / 0.40;
          float dy = (vu.y - 0.05) / 0.55;
          float dome = 1.0 - smoothstep(0.38, 1.12, dx * dx + dy * dy * 0.88);
          float vignette = edgeX * seat * topCut * clamp(dome, 0.0, 1.0);
          mask = body * vignette;
        } else {
          float edgeX = smoothstep(0.0, 0.12, vu.x) * smoothstep(1.0, 0.88, vu.x);
          float edgeY = smoothstep(0.0, 0.08, vu.y) * smoothstep(1.0, 0.34, vu.y);
          mask = body * edgeX * edgeY;
        }
        nxy = vec2(n1, n2);
      }
`;

function makeHeatHazeMaterial(opts = {}) {
  const mat = new THREE.ShaderMaterial({
    name: opts.name || "heatHaze",
    uniforms: {
      uTime: { value: 0 },
      uHeat: { value: 0 },
      uRise: { value: opts.rise != null ? opts.rise : 0.38 },
      uWarp: { value: opts.warp != null ? opts.warp : 0.18 },
      uNScale: { value: new THREE.Vector2(opts.nx != null ? opts.nx : 8, opts.ny != null ? opts.ny : 6) },
      uAmp: { value: opts.amp != null ? opts.amp : 0.14 },
      uStrength: { value: HEAT_HAZE_STRENGTH_DEFAULT },
      uSize: { value: HEAT_HAZE_SIZE_DEFAULT },
      uDisp: { value: opts.disp != null ? opts.disp : 0.02 },
      uHeightFog: { value: opts.heightFog ? 1 : 0 },
      uBarrelCard: { value: opts.barrelCard ? 1 : 0 },
      uFloorY: { value: FLOOR_Y },
      uBandH: { value: opts.bandH != null ? opts.bandH : GROUND_HAZE_H },
      tScene: { value: getHeatHazeDummyTex() },
      uHasScene: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      cameraFar: { value: 2000 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: false,
    lights: false,
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform float uHeat;
      uniform float uRise;
      uniform float uWarp;
      uniform vec2 uNScale;
      uniform float uAmp;
      uniform float uStrength;
      uniform float uSize;
      uniform float uDisp;
      uniform float uHeightFog;
      uniform float uBarrelCard;
      uniform float uFloorY;
      uniform float uBandH;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec2 vNxy;
      varying float vMask;
      #include <common>
      #include <logdepthbuf_pars_vertex>
` + HEAT_HAZE_NOISE_GLSL + /* glsl */`
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float mask = 0.0;
        vec2 nxy = vec2(0.0);
        float haze = 0.0;
        heatField(wp.xyz, uv, mask, nxy, haze);
        mask *= uHeat;
        if (uStrength > 0.01 && mask > 0.002) {
          vec3 up = vec3(0.0, 1.0, 0.0);
          vec3 toCam = cameraPosition - wp.xyz;
          vec3 viewTan = normalize(cross(up, normalize(toCam + vec3(1e-5, 0.0, 0.0))));
          float disp = (haze - 0.5) * mask * uStrength * uDisp;
          wp.xyz += up * disp;
          wp.xyz += viewTan * (nxy.x - 0.5) * mask * uStrength * uDisp * 0.55;
        }
        vWorldPos = wp.xyz;
        vNxy = nxy;
        vMask = mask;
        gl_Position = projectionMatrix * viewMatrix * wp;
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform float uHeat;
      uniform float uRise;
      uniform float uWarp;
      uniform vec2 uNScale;
      uniform float uAmp;
      uniform float uStrength;
      uniform float uSize;
      uniform float uDisp;
      uniform float uHeightFog;
      uniform float uBarrelCard;
      uniform float uFloorY;
      uniform float uBandH;
      uniform sampler2D tScene;
      uniform float uHasScene;
      uniform vec2 uResolution;
      uniform float cameraFar;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec2 vNxy;
      varying float vMask;
      #include <common>
      #include <logdepthbuf_pars_fragment>
` + HEAT_HAZE_NOISE_GLSL + /* glsl */`
      void main() {
        #include <logdepthbuf_fragment>
        if (uHeat < 0.01 || uStrength < 0.01) discard;
        float mask = 0.0;
        vec2 nxy = vec2(0.0);
        float haze = 0.0;
        heatField(vWorldPos, vUv, mask, nxy, haze);
        mask *= uHeat;
        if (mask < 0.003) discard;
        if (uHasScene < 0.5) discard;
        // Subtle refraction: mix base + warped, low alpha. Never fog-decal the gun.
        vec2 suv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
        vec2 off = (nxy - 0.5) * mask * uStrength * 0.014;
        vec4 baseSamp = texture2D(tScene, clamp(suv, 0.0, 1.0));
        vec3 base = baseSamp.rgb;
        vec3 warped = texture2D(tScene, clamp(suv + off, 0.0, 1.0)).rgb;
        float warpAmt = clamp(mask * uStrength * 0.50, 0.0, 0.42);
        vec3 col = mix(base, warped, warpAmt);
        // Depth gate (grab packs log-depth in A): crush over near viewmodel / hands.
        float packed = baseSamp.a;
        float clipW = exp2(packed * log2(max(cameraFar, 1.0) + 1.0)) - 1.0;
        float nearGate = smoothstep(1.8, 4.0, clipW);
        if (packed <= 1e-4) nearGate = 0.0;
        float a = clamp(mask * 0.28, 0.0, 0.28) * nearGate;
        if (a < 0.004) discard;
        gl_FragColor = vec4(col, a);
      }
    `,
  });
  if ("forceSinglePass" in mat) mat.forceSinglePass = true;
  return mat;
}

function tagBarrelHeatMesh(mesh, role) {
  if (!mesh || !mesh.material) return;
  mesh.userData.barrelHeat = role || "tube";
  const mat = mesh.material;
  mat.emissive = new THREE.Color(0x000000);
  mat.emissiveIntensity = 0;
  if (role === "tube") {
    mat.emissiveMap = getBarrelHeatEmissiveMap();
  }
}

function addBarrelHeatShimmer(x, y, z, length) {
  const len = Math.max(0.1, length);
  const hazeH = BARREL_HAZE_H;
  const mat = makeHeatHazeMaterial({
    name: "barrelHeatHaze",
    rise: 0.55,
    warp: 0.28,
    nx: 8,
    ny: 26,
    amp: 0.20,
    disp: 0.008,
    bandH: hazeH,
    heightFog: false,
    barrelCard: true,
  });
  const group = new THREE.Group();
  group.name = "barrelHeatHaze";
  group.position.set(x, y, z);
  group.rotation.y = Math.PI / 2;
  // Three cards (not ±cross): A left shorter/lower, B center taller/longer toward body, C mirror of A.
  // Plane local X = along barrel (after group yaw); Y = up; Z = lateral.
  // local −X points toward the gun body (group sits near tip).
  const sz = clamp(state.heatHazeSize ?? HEAT_HAZE_SIZE_DEFAULT, HEAT_HAZE_SIZE_MIN, HEAT_HAZE_SIZE_MAX);
  const specs = [
    { name: "barrelHeatShimmerL", lat: -0.016, wMul: 0.70, hMul: 0.78, along: -0.01, seat: 0.46, roll: 0.10 },
    { name: "barrelHeatShimmer", lat: 0, wMul: 1.12, hMul: 1.28, along: -0.055, seat: 0.48, roll: 0 },
    { name: "barrelHeatShimmerR", lat: 0.016, wMul: 0.70, hMul: 0.78, along: -0.01, seat: 0.46, roll: -0.10 },
  ];
  for (const spec of specs) {
    const cardW = len * 1.22 * spec.wMul;
    const cardH = hazeH * 1.48 * spec.hMul;
    const geo = new THREE.PlaneGeometry(cardW, cardH, 24, 12);
    const base = new Float32Array(geo.attributes.position.array);
    const card = new THREE.Mesh(geo, mat);
    // Seat plane bottom on the tube/can so hard seams hide against steel.
    card.position.set(spec.along, cardH * spec.seat * sz, spec.lat);
    card.scale.y = sz;
    card.rotation.x = spec.roll;
    card.renderOrder = 6;
    card.visible = false;
    card.name = spec.name;
    card.userData.barrelHeatShimmer = true;
    card.userData.hazeH0 = cardH;
    card.userData.hazeSeat = spec.seat;
    card.userData.hazeBasePos = base;
    card.layers.set(HEAT_HAZE_LAYER);
    card.frustumCulled = false;
    card.raycast = () => {};
    group.add(card);
  }
  gunRoot.add(group);
}

function applyBarrelHeatVisual() {
  if (!gunRoot) return;
  barrelHeatHazeLive = false;
  const mul = state.barrelHeat ?? BARREL_HEAT_DEFAULT;
  const raw = barrelHeatAmt[state.weaponId] || 0;
  const h = mul < 0.01 ? 0 : raw;
  const r = 1.0;
  const g = lerp(0.14, 0.70, h);
  const b = lerp(0.025, 0.16, h * h);
  const punch = Math.pow(h, 1.45) * (0.2 + 3.1 * h) * mul;
  gunRoot.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.barrelHeat && o.material) {
      const role = o.userData.barrelHeat;
      const tip = role === "tip" ? 1.28 : role === "can" ? 1.38 : 1;
      o.material.emissive.setRGB(r, g * (role === "tip" || role === "can" ? 1.05 : 1), b);
      o.material.emissiveIntensity = punch * tip;
    }
    if (o.userData.barrelHeatShimmer && o.material && o.material.uniforms) {
      const str = state.heatHazeStrength ?? HEAT_HAZE_STRENGTH_DEFAULT;
      const show = h > 0.38 && mul >= 0.01 && str >= 0.01;
      o.visible = show;
      o.material.uniforms.uHeat.value = show ? clamp((h - 0.38) * 1.2 * mul, 0, 1) : 0;
      o.material.uniforms.uTime.value = barrelHeatClock;
      if (show) barrelHeatHazeLive = true;
    }
  });
  applyHeatHazeUniforms();
}

function tickBarrelHeat(dt) {
  barrelHeatClock += dt;
  coolBarrelHeat(dt);
  applyBarrelHeatVisual();
  updateBarrelHeatCardMorph(dt);
  tickGroundHeatHaze();
}

/** Sun-weighted bake on the pour. Key-up is hot; true night is gone. */
function groundHeatAmount() {
  const path = sunPath(state.timeOfDay);
  const pal = sampleTod(state.timeOfDay);
  const elev = path.elevDeg;
  if (elev < 1.5) return 0;
  const elevAmt = clamp((elev - 2) / 32, 0, 1);
  const keyAmt = clamp((pal.sunI || 0) * (state.lightKeyMul ?? 1), 0, 1.3);
  return clamp(elevAmt * (0.22 + 0.78 * Math.min(1, keyAmt / 0.85)), 0, 1);
}

function tickGroundHeatHaze() {
  if (!heatHazePost || !heatHazePost.hazeMat) return;
  if (!state.groundHeatHaze) {
    heatHazePost.hazeMat.uniforms.uHeat.value = 0;
    return;
  }
  const h = groundHeatAmount();
  heatHazePost.hazeMat.uniforms.uTime.value = barrelHeatClock;
  heatHazePost.hazeMat.uniforms.uHeat.value = h;
  applyHeatHazeUniforms();
}

function eachHeatHazeMat(fn) {
  if (heatHazePost && heatHazePost.hazeMat) fn(heatHazePost.hazeMat);
  if (!gunRoot) return;
  const seen = new Set();
  gunRoot.traverse((o) => {
    if (!o.userData.barrelHeatShimmer || !o.material || !o.material.uniforms) return;
    if (seen.has(o.material)) return;
    seen.add(o.material);
    fn(o.material);
  });
}

function applyHeatHazeUniforms() {
  const str = clamp(state.heatHazeStrength ?? HEAT_HAZE_STRENGTH_DEFAULT, 0, HEAT_HAZE_STRENGTH_MAX);
  const sz = clamp(state.heatHazeSize ?? HEAT_HAZE_SIZE_DEFAULT, HEAT_HAZE_SIZE_MIN, HEAT_HAZE_SIZE_MAX);
  eachHeatHazeMat((mat) => {
    mat.uniforms.uStrength.value = str;
    mat.uniforms.uSize.value = sz;
    if (mat.uniforms.uFloorY) mat.uniforms.uFloorY.value = FLOOR_Y;
  });
}

function syncHeatHazeMeshScales() {
  const sz = clamp(state.heatHazeSize ?? HEAT_HAZE_SIZE_DEFAULT, HEAT_HAZE_SIZE_MIN, HEAT_HAZE_SIZE_MAX);
  if (!gunRoot) return;
  gunRoot.traverse((o) => {
    if (!o.userData.barrelHeatShimmer) return;
    const h0 = o.userData.hazeH0 || BARREL_HAZE_H;
    const seat = o.userData.hazeSeat != null ? o.userData.hazeSeat : 0.48;
    o.scale.y = sz;
    o.position.y = h0 * seat * sz;
  });
}

/** Bottom edge stays seated on the tube; top free-floats opposite sway/strafe + a bit up. */
function updateBarrelHeatCardMorph(dt) {
  if (!gunRoot) return;
  const sx = swayRig ? swayRig.position.x : 0;
  const rz = swayRig ? swayRig.rotation.z : 0;
  const strafe = player.strafeTilt || 0;
  // Inertia opposite viewmodel swing: gun right → heat leans left.
  const targetX = clamp(-(sx * 28 + rz * 0.55 + strafe * 4.0), -1, 1);
  const targetUp = 0.35 + Math.min(0.65, Math.abs(targetX) * 0.55);
  const k = 1 - Math.exp(-9 * Math.max(0.0001, dt));
  player.hazeLeanX = lerp(player.hazeLeanX || 0, targetX, k);
  player.hazeLeanUp = lerp(player.hazeLeanUp || 0, targetUp, k);
  const leanX = player.hazeLeanX;
  const leanUp = player.hazeLeanUp;
  gunRoot.traverse((o) => {
    if (!o.userData.barrelHeatShimmer || !o.userData.hazeBasePos || !o.geometry) return;
    const pos = o.geometry.attributes.position;
    if (!pos) return;
    const base = o.userData.hazeBasePos;
    const h = o.userData.hazeH0 || BARREL_HAZE_H;
    const halfH = h * 0.5;
    const arr = pos.array;
    for (let i = 0, n = pos.count; i < n; i++) {
      const ix = i * 3;
      const y0 = base[ix + 1];
      const t = clamp((y0 / halfH + 1) * 0.5, 0, 1);
      const w = t * t;
      arr[ix] = base[ix];
      arr[ix + 1] = base[ix + 1] + leanUp * w * 0.028;
      arr[ix + 2] = base[ix + 2] + leanX * w * 0.038;
    }
    pos.needsUpdate = true;
  });
}

function heatHazePassWanted() {
  const str = state.heatHazeStrength ?? HEAT_HAZE_STRENGTH_DEFAULT;
  if (str < 0.01) return false;
  // Height-fog fullscreen post is opt-in (default OFF) — barrel cards only otherwise.
  if (state.groundHeatHaze && groundHeatAmount() > 0.035) return true;
  return !!barrelHeatHazeLive;
}

function initHeatHazePost() {
  if (heatHazePost) return;
  heatHazeGrabRT = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
  });
  heatHazeGrabRT.texture.colorSpace = THREE.LinearSRGBColorSpace;

  const vs = /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  const copyMat = new THREE.ShaderMaterial({
    name: "heatHazeCopy",
    uniforms: {
      tColor: { value: null },
      tDepth: { value: getHeatHazeDummyTex() },
      uHasDepth: { value: 0 },
    },
    vertexShader: vs,
    fragmentShader: /* glsl */`
      uniform sampler2D tColor;
      uniform sampler2D tDepth;
      uniform float uHasDepth;
      varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tColor, vUv).rgb;
        float d = uHasDepth > 0.5 ? texture2D(tDepth, vUv).r : 1.0;
        gl_FragColor = vec4(c, d);
      }
    `,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    fog: false,
    lights: false,
    transparent: false,
    blending: THREE.NoBlending,
  });

  const hazeMat = new THREE.ShaderMaterial({
    name: "heatHazeHeightFog",
    uniforms: {
      uTime: { value: 0 },
      uHeat: { value: 0 },
      uRise: { value: 0.16 },
      uWarp: { value: 0.20 },
      uNScale: { value: new THREE.Vector2(0.55, 4.2) },
      uStrength: { value: HEAT_HAZE_STRENGTH_DEFAULT },
      uSize: { value: HEAT_HAZE_SIZE_DEFAULT },
      uHeightFog: { value: 1 },
      uBarrelCard: { value: 0 },
      uFloorY: { value: FLOOR_Y },
      uBandH: { value: GROUND_HAZE_H },
      tScene: { value: getHeatHazeDummyTex() },
      uHasScene: { value: 0 },
      uHasDepth: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      projInverse: { value: new THREE.Matrix4() },
      viewInverse: { value: new THREE.Matrix4() },
      cameraFar: { value: 2000 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
    toneMapped: false,
    fog: false,
    lights: false,
    vertexShader: vs,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform float uHeat;
      uniform float uRise;
      uniform float uWarp;
      uniform vec2 uNScale;
      uniform float uStrength;
      uniform float uSize;
      uniform float uHeightFog;
      uniform float uBarrelCard;
      uniform float uFloorY;
      uniform float uBandH;
      uniform sampler2D tScene;
      uniform float uHasScene;
      uniform float uHasDepth;
      uniform vec2 uResolution;
      uniform mat4 projInverse;
      uniform mat4 viewInverse;
      uniform float cameraFar;
      varying vec2 vUv;
` + HEAT_HAZE_NOISE_GLSL + /* glsl */`
      void main() {
        // Hard no-op if grab/depth missing — never paint a full-frame fog fill.
        if (uHeat < 0.01 || uStrength < 0.01 || uHasScene < 0.5 || uHasDepth < 0.5) discard;
        float packed = texture2D(tScene, vUv).a;
        // Sky / cleared depth, or absurd near values → skip (pass-through).
        if (packed >= 0.997 || packed <= 1e-4) discard;
        vec4 clip = vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
        vec4 viewH = projInverse * clip;
        float vw = max(abs(viewH.w), 1e-6);
        vec3 viewDir = normalize(viewH.xyz / vw);
        if (abs(viewDir.z) < 1e-3) discard;
        float clipW = exp2(packed * log2(cameraFar + 1.0)) - 1.0;
        if (clipW < 1.5 || clipW > cameraFar * 0.98) discard;
        float rayLen = clipW / max(1e-4, abs(viewDir.z));
        vec3 viewPos = viewDir * rayLen;
        vec3 wp = (viewInverse * vec4(viewPos, 1.0)).xyz;
        // Keep the band glued to the pour — off-floor Y means bad reconstruct or sky leak.
        float hAbove = wp.y - uFloorY;
        float bandMax = uBandH * max(uSize, 0.2) * 2.0;
        if (hAbove < -0.08 || hAbove > bandMax) discard;
        float mask = 0.0;
        vec2 nxy = vec2(0.0);
        float haze = 0.0;
        heatField(wp, vec2(0.5), mask, nxy, haze);
        mask *= uHeat;
        if (mask < 0.003) discard;
        // Subtle refraction + low alpha; crush near so viewmodel never gets fog-painted.
        float nearGate = smoothstep(2.0, 5.0, clipW);
        float a = clamp(mask * 0.28, 0.0, 0.28) * nearGate;
        if (a < 0.004) discard;
        vec2 off = (nxy - 0.5) * mask * uStrength * 0.014;
        vec3 base = texture2D(tScene, vUv).rgb;
        vec3 warped = texture2D(tScene, clamp(vUv + off, 0.0, 1.0)).rgb;
        float warpAmt = clamp(mask * uStrength * 0.50, 0.0, 0.42);
        vec3 col = mix(base, warped, warpAmt);
        gl_FragColor = vec4(col, a);
      }
    `,
  });
  if ("forceSinglePass" in copyMat) copyMat.forceSinglePass = true;
  if ("forceSinglePass" in hazeMat) hazeMat.forceSinglePass = true;

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMat);
  quad.frustumCulled = false;
  const fsScene = new THREE.Scene();
  fsScene.add(quad);
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  heatHazePost = { copyMat, hazeMat, quad, fsScene, fsCam, _clear: new THREE.Color() };
}

function resizeHeatHazeGrab(w, h) {
  if (!heatHazeGrabRT) return;
  const tw = Math.max(1, w | 0);
  const th = Math.max(1, h | 0);
  if (heatHazeGrabRT.width !== tw || heatHazeGrabRT.height !== th) {
    heatHazeGrabRT.setSize(tw, th);
  }
}

function blitHeatHaze(mat, target) {
  heatHazePost.quad.material = mat;
  renderer.setRenderTarget(target);
  renderer.render(heatHazePost.fsScene, heatHazePost.fsCam);
}

/** Copy dest color (+ packed depth in A) into the dedicated grab. Never bloom/dither. */
function grabHeatHazeScene(dest) {
  if (!heatHazePost || !heatHazeGrabRT || !dest || !dest.texture) return false;
  if (dest.width < 1 || dest.height < 1) return false;
  if (dest === heatHazeGrabRT) return false;
  resizeHeatHazeGrab(dest.width, dest.height);
  if (heatHazeGrabRT.width !== dest.width || heatHazeGrabRT.height !== dest.height) return false;
  const depthTex = dest.depthTexture || null;
  const u = heatHazePost.copyMat.uniforms;
  u.tColor.value = dest.texture;
  u.tDepth.value = depthTex || getHeatHazeDummyTex();
  u.uHasDepth.value = depthTex ? 1 : 0;
  try {
    const prevAutoClear = renderer.autoClear;
    renderer.getClearColor(heatHazePost._clear);
    const prevClearAlpha = renderer.getClearAlpha();
    // Black clear — never leave sky/fog color in the grab if a texel is skipped.
    renderer.setClearColor(0x000000, 1);
    renderer.autoClear = true;
    blitHeatHaze(heatHazePost.copyMat, heatHazeGrabRT);
    renderer.setClearColor(heatHazePost._clear, prevClearAlpha);
    renderer.autoClear = prevAutoClear;
    u.tColor.value = null;
    u.tDepth.value = getHeatHazeDummyTex();
    return true;
  } catch (err) {
    u.tColor.value = null;
    u.tDepth.value = getHeatHazeDummyTex();
    return false;
  }
}

function bindHeatHazeGrab(tex, resx, resy) {
  const dummy = getHeatHazeDummyTex();
  const has = tex ? 1 : 0;
  applyHeatHazeUniforms();
  const far = (camera && camera.far) || 2000;
  eachHeatHazeMat((mat) => {
    if (!mat.uniforms.tScene) return;
    mat.uniforms.tScene.value = tex || dummy;
    mat.uniforms.uHasScene.value = has;
    if (mat.uniforms.uResolution) mat.uniforms.uResolution.value.set(resx, resy);
    if (mat.uniforms.cameraFar) mat.uniforms.cameraFar.value = far;
  });
}

/** After the world (and ADS) land in dest, grab that RT. Height-fog is a
 * fullscreen UV warp from dest depth; barrel cards stay local to the tube.
 */
function renderHeatHaze(dest) {
  if (!camera || !scene || !renderer || !heatHazePassWanted()) return;
  if (!dest || !dest.texture || dest.width < 1) return;
  if (!heatHazePost) initHeatHazePost();
  if (!grabHeatHazeScene(dest)) return;

  const resx = dest.width;
  const resy = dest.height;
  const grabTex = heatHazeGrabRT.texture;
  const hasDepth = !!(dest.depthTexture);
  bindHeatHazeGrab(grabTex, resx, resy);

  const prevAutoClear = renderer.autoClear;
  const prevShadowAuto = renderer.shadowMap.autoUpdate;
  renderer.autoClear = false;
  renderer.shadowMap.autoUpdate = false;

  const h = groundHeatAmount();
  const str = state.heatHazeStrength ?? HEAT_HAZE_STRENGTH_DEFAULT;
  const depthOk = hasDepth && dest.depthTexture.image &&
    dest.depthTexture.image.width === dest.width &&
    dest.depthTexture.image.height === dest.height;
  // Height-fog fullscreen post: default OFF (fog slap). Even when enabled, bad depth → skip.
  if (state.groundHeatHaze && h > 0.035 && str >= 0.01 && depthOk) {
    camera.updateMatrixWorld();
    const u = heatHazePost.hazeMat.uniforms;
    u.tScene.value = grabTex;
    u.uHasScene.value = 1;
    u.uHasDepth.value = 1;
    u.uHeat.value = h;
    u.uTime.value = barrelHeatClock;
    u.uStrength.value = clamp(str, 0, HEAT_HAZE_STRENGTH_MAX);
    u.uSize.value = clamp(state.heatHazeSize ?? HEAT_HAZE_SIZE_DEFAULT, HEAT_HAZE_SIZE_MIN, HEAT_HAZE_SIZE_MAX);
    u.uFloorY.value = FLOOR_Y;
    u.uResolution.value.set(resx, resy);
    u.projInverse.value.copy(camera.projectionMatrixInverse);
    u.viewInverse.value.copy(camera.matrixWorld);
    u.cameraFar.value = camera.far;
    blitHeatHaze(heatHazePost.hazeMat, dest);
  }

  if (barrelHeatHazeLive) {
    camera.layers.set(HEAT_HAZE_LAYER);
    renderer.setRenderTarget(dest);
    renderer.render(scene, camera);
    restoreCameraLayers();
  }

  renderer.autoClear = prevAutoClear;
  renderer.shadowMap.autoUpdate = prevShadowAuto;
  bindHeatHazeGrab(null, resx, resy);
}



/* ---- Mag + suppressor meshes (table pickups + viewmodel) ----
 * Beer-bottle quality: basic shapes, decent segs, a bit of material care.
 * SMG: 20 stick / 45 banana / 60 double drum. Rifle: 20 box. Sniper: 5-rd clip.
 */
function magKind(id) {
  return MAG_KINDS[id] || MAG_KINDS.smg_20;
}

function makeMagMesh(magId) {
  const spec = magKind(magId);
  const g = new THREE.Group();
  g.name = "mag_" + spec.id;
  g.userData.magId = spec.id;
  const poly = GUN_MAT.polymer;
  const polyD = GUN_MAT.polymerDark;
  const dark = GUN_MAT.darkMetal;
  const metal = GUN_MAT.metal;
  if (spec.shape === "banana") {
    // Curved 45 — stacked segments along a forward arc (bottom toward muzzle).
    const n = 8;
    const R = 0.155;
    const arc = 0.7;
    g.add(makeBox(0.036, 0.014, 0.046, 0x323840, 0, -0.006, 0, poly));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const a = t * arc;
      const y = -R * Math.sin(a);
      const z = -R * (1 - Math.cos(a));
      const h = (R * arc) / n * 1.12;
      const col = i === n - 1 ? 0x1a1e26 : (i % 2 ? 0x2a3038 : 0x262c34);
      const seg = makeBox(0.034, h, 0.042, col, 0, y, z, polyD);
      seg.rotation.x = -a;
      g.add(seg);
    }
    const aEnd = arc;
    const plate = makeBox(
      0.038, 0.01, 0.048, 0x1c2028,
      0, -R * Math.sin(aEnd) - 0.002, -R * (1 - Math.cos(aEnd)),
      poly
    );
    plate.rotation.x = -aEnd;
    g.add(plate);
    const rib = makeBox(
      0.037, 0.008, 0.044, 0x3a404c,
      0, -R * Math.sin(arc * 0.35), -R * (1 - Math.cos(arc * 0.35)),
      poly
    );
    rib.rotation.x = -arc * 0.35;
    g.add(rib);
  } else if (spec.shape === "drum") {
    // Double drum 60 — feed tower + two side drums (axes along the barrel).
    const tower = makeBox(0.036, 0.044, 0.044, 0x2e343e, 0, -0.022, 0, polyD);
    const towerLip = makeBox(0.038, 0.01, 0.046, 0x3a404c, 0, -0.004, 0, poly);
    const left = makeCyl(0.038, 0.038, 0.04, 0x1e2228, -0.038, -0.072, 0, Math.PI / 2, 0, 0, 16, polyD);
    const right = makeCyl(0.038, 0.038, 0.04, 0x1e2228, 0.038, -0.072, 0, Math.PI / 2, 0, 0, 16, polyD);
    const hubL = makeCyl(0.012, 0.012, 0.044, 0x4a5568, -0.038, -0.072, 0, Math.PI / 2, 0, 0, 10, metal);
    const hubR = makeCyl(0.012, 0.012, 0.044, 0x4a5568, 0.038, -0.072, 0, Math.PI / 2, 0, 0, 10, metal);
    const coupler = makeBox(0.078, 0.028, 0.036, 0x2a3038, 0, -0.072, 0, poly);
    const frontPlate = makeBox(0.082, 0.006, 0.042, 0x323840, 0, -0.072, -0.022, polyD);
    const floor = makeBox(0.08, 0.01, 0.04, 0x161a20, 0, -0.112, 0, poly);
    g.add(towerLip, tower, left, right, hubL, hubR, coupler, frontPlate, floor);
  } else if (spec.shape === "box") {
    // Rifle 20-rd — fatter 7.62 body, slight forward rake, floorplate.
    const body = makeBox(0.04, 0.122, 0.05, 0x1c2028, 0, -0.064, 0.004, polyD);
    body.rotation.x = 0.06;
    const lip = makeBox(0.042, 0.012, 0.052, 0x2a3038, 0, -0.006, 0, poly);
    const rib = makeBox(0.043, 0.01, 0.054, 0x323840, 0, -0.042, 0.002, poly);
    const rib2 = makeBox(0.043, 0.01, 0.054, 0x323840, 0, -0.078, 0.006, poly);
    const plate = makeBox(0.044, 0.01, 0.056, 0x161a20, 0, -0.128, 0.01, poly);
    plate.rotation.x = 0.06;
    const spine = makeBox(0.008, 0.1, 0.048, 0x242a32, 0, -0.062, 0.004, polyD);
    g.add(lip, body, rib, rib2, plate, spine);
  } else if (spec.shape === "clip") {
    // Sniper 5-rd box clip — short metal/polymer protrusion.
    const body = makeBox(0.03, 0.042, 0.044, 0x2a3038, 0, -0.024, 0, polyD);
    const lip = makeBox(0.032, 0.008, 0.046, 0x4a5568, 0, -0.004, 0, metal);
    const plate = makeBox(0.034, 0.008, 0.048, 0x1a1e24, 0, -0.048, 0, dark);
    const catch_ = makeBox(0.012, 0.008, 0.016, 0x6e7a8c, 0.018, -0.02, 0, metal);
    g.add(lip, body, plate, catch_);
  } else {
    // SMG 20 — short straight stick (default). Not a 30.
    const lip = makeBox(0.034, 0.012, 0.044, 0x3a404c, 0, -0.006, 0, poly);
    const body = makeBox(0.032, 0.056, 0.04, 0x2e343e, 0, -0.04, 0, polyD);
    const taper = makeBox(0.03, 0.016, 0.038, 0x262c34, 0, -0.074, 0, polyD);
    const plate = makeBox(0.036, 0.008, 0.046, 0x1a1e24, 0, -0.086, 0, poly);
    const rib = makeBox(0.035, 0.008, 0.042, 0x3a404c, 0, -0.028, 0, poly);
    const notch = makeBox(0.01, 0.01, 0.014, 0x4a5568, 0.02, -0.02, 0, metal);
    g.add(lip, body, taper, plate, rib, notch);
  }
  return g;
}

function sitOnTable(obj) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (Number.isFinite(box.min.y)) obj.position.y -= box.min.y;
  return obj;
}

function makeSuppressorMesh(weaponId, { heat = false } = {}) {
  const g = new THREE.Group();
  g.name = "suppressor_" + weaponId;
  const dark = GUN_MAT.darkMetal;
  const metal = GUN_MAT.metal;
  const tag = (mesh, role) => { if (heat) tagBarrelHeatMesh(mesh, role); return mesh; };
  const cyl = (r0, r1, h, col, z, segs, mat, role) =>
    tag(makeCyl(r0, r1, h, col, 0, 0, z, Math.PI / 2, 0, 0, segs, mat), role);
  if (weaponId === "example_rifle") {
    // Longer 7.62 can
    g.add(cyl(0.016, 0.017, 0.024, 0x2a3038, -0.012, 12, metal, "can"));
    g.add(cyl(0.021, 0.021, 0.128, 0x1a1e26, -0.088, 14, dark, "tube"));
    g.add(cyl(0.0225, 0.0225, 0.007, 0x12161c, -0.042, 14, dark, "can"));
    g.add(cyl(0.0225, 0.0225, 0.007, 0x12161c, -0.088, 14, dark, "can"));
    g.add(cyl(0.0225, 0.0225, 0.007, 0x12161c, -0.128, 14, dark, "can"));
    const cap = makeRingTube(0.0075, 0.02, 0.014, 0x12161c, 16, dark);
    cap.position.z = -0.158;
    cap.traverse((o) => { if (o.isMesh) tag(o, "tip"); });
    g.add(cap);
  } else if (weaponId === "example_sniper") {
    // Unique long precision can (bolt can take one)
    g.add(cyl(0.014, 0.015, 0.02, 0x2a3140, -0.01, 12, metal, "can"));
    g.add(cyl(0.016, 0.018, 0.16, 0x161a22, -0.10, 16, dark, "tube"));
    g.add(cyl(0.019, 0.019, 0.008, 0x0e1014, -0.055, 14, dark, "can"));
    g.add(cyl(0.019, 0.019, 0.008, 0x0e1014, -0.12, 14, dark, "can"));
    g.add(cyl(0.017, 0.015, 0.028, 0x1a1e26, -0.186, 14, dark, "tip"));
    const cap = makeRingTube(0.0065, 0.015, 0.012, 0x10141a, 16, dark);
    cap.position.z = -0.206;
    cap.traverse((o) => { if (o.isMesh) tag(o, "tip"); });
    g.add(cap);
  } else {
    // Short SMG can
    g.add(cyl(0.015, 0.016, 0.018, 0x2a3038, -0.009, 12, metal, "can"));
    g.add(cyl(0.019, 0.019, 0.07, 0x1a1e26, -0.053, 14, dark, "tube"));
    g.add(cyl(0.0205, 0.0205, 0.006, 0x12161c, -0.03, 14, dark, "can"));
    g.add(cyl(0.0205, 0.0205, 0.006, 0x12161c, -0.072, 14, dark, "can"));
    const cap = makeRingTube(0.007, 0.018, 0.012, 0x12161c, 14, dark);
    cap.position.z = -0.094;
    cap.traverse((o) => { if (o.isMesh) tag(o, "tip"); });
    g.add(cap);
  }
  return g;
}

function makeMagSocket(x, y, z) {
  magSocket = new THREE.Group();
  magSocket.name = "magSocket";
  magSocket.position.set(x, y, z);
  return magSocket;
}

function attachSeatedMag() {
  if (!magSocket) return;
  while (magSocket.children.length) {
    const c = magSocket.children.pop();
    c.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }
  magMesh = makeMagMesh(currentMagId());
  magMesh.name = "mag";
  magSocket.add(magMesh);
  resetMagVisual();
  if (holdRoot) stampViewmodelLayer(magSocket);
}

function mountSuppressorForGun(style) {
  if (suppressorRoot && suppressorRoot.parent) suppressorRoot.parent.remove(suppressorRoot);
  suppressorRoot = makeSuppressorMesh(style, { heat: true });
  const spec = SUPPRESSOR_SPEC[style] || SUPPRESSOR_SPEC.example_smg;
  suppressorRoot.position.set(spec.mount[0], spec.mount[1], spec.mount[2]);
  gunRoot.add(suppressorRoot);
  syncSuppressorVisual();
}

function syncSuppressorVisual() {
  if (!gunRoot) return;
  const on = suppressorMounted();
  const spec = SUPPRESSOR_SPEC[state.weaponId] || SUPPRESSOR_SPEC.example_smg;
  if (suppressorRoot) suppressorRoot.visible = on;
  gunRoot.traverse((o) => {
    if (o.userData && o.userData.hideWhenSuppressed) o.visible = !on;
  });
  if (muzzleFlash) {
    if (!muzzleFlash.userData.nativePos) {
      muzzleFlash.userData.nativePos = muzzleFlash.position.clone();
    }
    const native = muzzleFlash.userData.nativePos;
    if (on) muzzleFlash.position.set(native.x, spec.y, spec.tipZ);
    else muzzleFlash.position.copy(native);
  }
  if (muzzleSocket) {
    if (!muzzleSocket.userData.nativePos) {
      muzzleSocket.userData.nativePos = muzzleSocket.position.clone();
    }
    const native = muzzleSocket.userData.nativePos;
    if (on) muzzleSocket.position.set(native.x, spec.y, spec.tipZ);
    else muzzleSocket.position.copy(native);
  }
  if (holdRoot) stampViewmodelLayer(gunRoot);
  applyBarrelHeatVisual();
}

function equipMag(magId) {
  const mag = MAG_KINDS[magId];
  if (!mag || mag.weaponId !== state.weaponId) return;
  if (currentMagId() === magId) {
    showToast(mag.label + " already seated");
    return;
  }
  state.magByWeapon[state.weaponId] = magId;
  attachSeatedMag();
  syncAmmoForLoadout({ refill: true });
  refreshTableAvailability();
  showToast("Mag: " + mag.label + "  (" + mag.capacity + ")");
}

function toggleSuppressor(weaponId) {
  if (weaponId !== state.weaponId) return;
  state.suppressorByWeapon[weaponId] = !state.suppressorByWeapon[weaponId];
  syncSuppressorVisual();
  const spec = SUPPRESSOR_SPEC[weaponId];
  const lab = (spec && spec.label) || "Suppressor";
  showToast(suppressorMounted(weaponId) ? lab + " on" : lab + " off");
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
  const isSniper = style === "example_sniper";
  const poly = GUN_MAT.polymer;
  const polyD = GUN_MAT.polymerDark;
  const metal = GUN_MAT.metal;
  const dark = GUN_MAT.darkMetal;
  boltMesh = null;

  if (isRifle) {
    // 7.62 AR DMR — long rail, fixed stock.
    // Stock — dark polymer M16A2 fixed (in-line, no wood comb)
    const buffer = makeBox(0.036, 0.036, 0.09, 0x3a4048, 0, 0.006, 0.168, poly);
    const stock = makeBox(0.046, 0.074, 0.16, 0x2a3038, 0, -0.012, 0.248, poly);
    const stockWeb = makeBox(0.038, 0.022, 0.12, 0x323840, 0, 0.026, 0.24, polyD);
    const stockPad = makeBox(0.052, 0.092, 0.034, 0x161a20, 0, -0.01, 0.342, polyD);
    const stockPadLip = makeBox(0.054, 0.012, 0.036, 0x0e1014, 0, 0.036, 0.342, polyD);
    // Receiver — AR-10 scaled flat-top, slightly lighter upper metal
    const lower = makeBox(0.06, 0.038, 0.19, 0x4a5568, 0, -0.022, 0.04, dark);
    const receiver = makeBox(0.056, 0.05, 0.23, 0x6e7a8c, 0, 0.018, 0.028, metal);
    const receiverTop = makeBox(0.054, 0.01, 0.23, 0x5a6578, 0, 0.044, 0.026, metal);
    const ejectionHood = makeBox(0.01, 0.026, 0.05, 0x1a2030, 0.03, 0.008, 0.018, dark);
    // Charging handle hump at rear of upper
    const chHump = makeBox(0.022, 0.014, 0.03, 0x4a5568, 0, 0.046, 0.122, dark);
    const chLatch = makeBox(0.046, 0.008, 0.012, 0x3a4558, 0, 0.044, 0.136, dark);
    const rail = makePicRail(0.028, 0.012, 0.28, 0, 0.052, 0.0);
    // Long free-float RAS (11.35"-class) — dark, overlapping top rail, no wood forend
    const handguard = makeBox(0.054, 0.048, 0.30, 0x2a3038, 0, 0.008, -0.28, poly);
    const hgTop = makeBox(0.048, 0.008, 0.29, 0x1e242c, 0, 0.034, -0.28, polyD);
    const hgBevelL = makeBox(0.006, 0.036, 0.29, 0x323840, -0.028, 0.008, -0.28, poly);
    const hgBevelR = makeBox(0.006, 0.036, 0.29, 0x323840, 0.028, 0.008, -0.28, poly);
    const hgRail = makePicRail(0.026, 0.01, 0.28, 0, 0.048, -0.28);
    const hgSideL = makeBox(0.004, 0.016, 0.26, 0x1a1f28, -0.03, 0.008, -0.28, dark);
    const hgSideR = makeBox(0.004, 0.016, 0.26, 0x1a1f28, 0.03, 0.008, -0.28, dark);
    // 20"-class barrel, gas block, flip-up front BUIS
    const barrel = makeCyl(0.009, 0.012, 0.44, 0x1e2430, 0, 0.018, -0.56, Math.PI / 2, 0, 0, 12, dark);
    tagBarrelHeatMesh(barrel, "tube");
    const gasBlock = makeBox(0.024, 0.024, 0.032, 0x2a3140, 0, 0.032, -0.42, metal);
    const frontBuis = makeBox(0.016, 0.02, 0.014, 0x1a2030, 0, 0.048, -0.42, dark);
    // Birdcage / 3-prong flash hider (not a hunting brake)
    const flashBody = makeCyl(0.013, 0.011, 0.026, 0x12161c, 0, 0.018, -0.795, Math.PI / 2, 0, 0, 10, dark);
    tagBarrelHeatMesh(flashBody, "tip");
    const prongT = makeBox(0.005, 0.016, 0.018, 0x0a0c10, 0, 0.028, -0.81, dark);
    const prongL = makeBox(0.014, 0.005, 0.018, 0x0a0c10, -0.009, 0.018, -0.81, dark);
    const prongR = makeBox(0.014, 0.005, 0.018, 0x0a0c10, 0.009, 0.018, -0.81, dark);
    tagBarrelHeatMesh(prongT, "tip");
    tagBarrelHeatMesh(prongL, "tip");
    tagBarrelHeatMesh(prongR, "tip");
    flashBody.userData.hideWhenSuppressed = true;
    prongT.userData.hideWhenSuppressed = true;
    prongL.userData.hideWhenSuppressed = true;
    prongR.userData.hideWhenSuppressed = true;
    // 20-round 7.62 mag well — seated mag comes from makeMagMesh
    const magWell = makeBox(0.046, 0.024, 0.062, 0x4a5568, 0, -0.044, 0.005, metal);
    const magSock = makeMagSocket(0, -0.054, 0.005);
    // A2 pistol grip — dark polymer
    const pistol = makeBox(0.032, 0.10, 0.042, 0x2a3038, 0, -0.088, 0.095, poly);
    pistol.rotation.x = 0.28;
    const pistolBump = makeBox(0.034, 0.016, 0.028, 0x1e242c, 0, -0.052, 0.102, polyD);
    // RAS bottom rail / bipod pad (attachment host) — not a wood forend
    gripMesh = makeBox(0.03, 0.016, 0.09, 0x2a3038, 0, -0.022, -0.26, poly);
    muzzleFlash = makeMuzzleFlashSprite(0, 0.018, -0.83, 1.15);
    addBarrelHeatShimmer(0, 0.038, -0.70, 0.28);
    gunRoot.add(
      buffer, stock, stockWeb, stockPad, stockPadLip,
      lower, receiver, receiverTop, ejectionHood, chHump, chLatch, rail,
      handguard, hgTop, hgBevelL, hgBevelR, hgRail, hgSideL, hgSideR,
      barrel, gasBlock, frontBuis, flashBody, prongT, prongL, prongR,
      magWell, magSock, pistol, pistolBump, gripMesh, muzzleFlash
    );
    gripMesh.userData.base = { x: 0, y: -0.022, z: -0.26, rotX: 0, rotY: 0, rotZ: 0 };
    opticRoot = new THREE.Group();
    opticRoot.position.set(0, 0.052, -0.02);
    opticRoot.userData.base = { x: 0, y: 0.052, z: -0.02, rotX: 0, rotY: 0, rotZ: 0 };
  } else if (isSniper) {
    // Bolt/precision — M24-class: long free-float barrel, no RAS, 5-rd mag, bolt handle.
    const stock = makeBox(0.048, 0.082, 0.22, 0x2a3238, 0.002, -0.018, 0.22, poly);
    const stockComb = makeBox(0.044, 0.026, 0.14, 0x323840, 0.002, 0.032, 0.20, polyD);
    const stockPad = makeBox(0.054, 0.096, 0.032, 0x161a20, 0.002, -0.014, 0.346, polyD);
    const stockWrist = makeBox(0.036, 0.09, 0.05, 0x2a3038, 0, -0.08, 0.08, poly);
    stockWrist.rotation.x = 0.18;
    // Round-ish receiver with short 1913 rail
    const receiver = makeBox(0.042, 0.048, 0.16, 0x5a6578, 0, 0.016, 0.02, metal);
    const receiverTop = makeBox(0.038, 0.01, 0.15, 0x6e7a8c, 0, 0.042, 0.018, metal);
    const rail = makePicRail(0.026, 0.011, 0.14, 0, 0.052, 0.01);
    // Bolt group — body along Z, handle out to +X (right)
    const bolt = new THREE.Group();
    bolt.name = "bolt";
    bolt.position.set(0, 0.028, 0.04);
    bolt.add(makeCyl(0.008, 0.008, 0.11, 0x8a9098, 0, 0, 0, Math.PI / 2, 0, 0, 10, metal));
    bolt.add(makeCyl(0.005, 0.005, 0.055, 0x6e7a8c, 0.032, 0, 0.038, 0, 0, Math.PI / 2, 8, metal));
    bolt.add(makeCyl(0.009, 0.009, 0.016, 0x4a5568, 0.062, 0, 0.038, 0, 0, Math.PI / 2, 8, dark));
    boltMesh = bolt;
    boltMesh.userData.base = { x: 0, y: 0.028, z: 0.04, rotX: 0, rotY: 0, rotZ: 0 };
    // Simple free-float forend — no RAS clutter
    const forend = makeBox(0.042, 0.036, 0.22, 0x2a3038, 0, 0.0, -0.18, poly);
    const forendTip = makeBox(0.038, 0.028, 0.04, 0x1e242c, 0, 0.0, -0.30, polyD);
    // 24"-class barrel, target crown (no flash hider)
    const barrel = makeCyl(0.008, 0.012, 0.52, 0x1e2430, 0, 0.014, -0.58, Math.PI / 2, 0, 0, 12, dark);
    tagBarrelHeatMesh(barrel, "tube");
    const crown = makeCyl(0.011, 0.009, 0.016, 0x12161c, 0, 0.014, -0.85, Math.PI / 2, 0, 0, 10, dark);
    tagBarrelHeatMesh(crown, "tip");
    const magWell = makeBox(0.036, 0.016, 0.052, 0x4a5568, 0, -0.028, 0.01, metal);
    const magSock = makeMagSocket(0, -0.036, 0.01);
    crown.userData.hideWhenSuppressed = true;
    gripMesh = makeBox(0.028, 0.014, 0.08, 0x2a3038, 0, -0.022, -0.2, poly);
    muzzleFlash = makeMuzzleFlashSprite(0, 0.014, -0.87, 1.2);
    addBarrelHeatShimmer(0, 0.034, -0.72, 0.32);
    gunRoot.add(
      stock, stockComb, stockPad, stockWrist,
      receiver, receiverTop, rail, bolt,
      forend, forendTip, barrel, crown,
      magWell, magSock, gripMesh, muzzleFlash
    );
    gripMesh.userData.base = { x: 0, y: -0.022, z: -0.2, rotX: 0, rotY: 0, rotZ: 0 };
    opticRoot = new THREE.Group();
    opticRoot.position.set(0, 0.052, 0.01);
    opticRoot.userData.base = { x: 0, y: 0.052, z: 0.01, rotX: 0, rotY: 0, rotZ: 0 };
  } else {
    // Compact PDW — polymer shell, metal upper
    const stock = makeBox(0.04, 0.055, 0.09, 0x2e343e, 0.01, -0.008, 0.128, poly);
    const stockPad = makeBox(0.044, 0.062, 0.02, 0x1e2228, 0.01, -0.006, 0.178, polyD);
    const receiver = makeBox(0.056, 0.068, 0.17, 0x6e7a8c, 0, 0.002, 0.01, metal);
    const receiverTop = makeBox(0.058, 0.01, 0.16, 0x5a6578, 0, 0.038, 0.008, metal);
    const rail = makePicRail(0.024, 0.011, 0.16, 0, 0.048, -0.01);
    const handguard = makeBox(0.048, 0.046, 0.115, 0x323840, 0, 0.004, -0.13, poly);
    const hgBevel = makeBox(0.05, 0.008, 0.11, 0x3a4048, 0, 0.03, -0.13, polyD);
    const barrel = makeCyl(0.0085, 0.012, 0.2, 0x1e2430, 0, 0.016, -0.28, Math.PI / 2, 0, 0, 12, dark);
    tagBarrelHeatMesh(barrel, "tube");
    const muzzleDevice = makeCyl(0.015, 0.012, 0.03, 0x12161c, 0, 0.016, -0.4, Math.PI / 2, 0, 0, 12, dark);
    tagBarrelHeatMesh(muzzleDevice, "tip");
    const flashHiderRing = makeCyl(0.016, 0.015, 0.01, 0x0a0c10, 0, 0.016, -0.418, Math.PI / 2, 0, 0, 10, dark);
    tagBarrelHeatMesh(flashHiderRing, "tip");
    const magWell = makeBox(0.044, 0.02, 0.056, 0x4a5568, 0, -0.04, 0.01, metal);
    const magSock = makeMagSocket(0, -0.048, 0.01);
    muzzleDevice.userData.hideWhenSuppressed = true;
    flashHiderRing.userData.hideWhenSuppressed = true;
    const pistol = makeBox(0.032, 0.084, 0.04, 0x2a3038, 0, -0.078, 0.07, poly);
    pistol.rotation.x = 0.28;
    gripMesh = makeBox(0.032, 0.046, 0.046, 0x5c4a3a, 0, -0.052, -0.1, poly);
    const gripBevel = makeBox(0.034, 0.008, 0.04, 0x4a3a2e, 0, -0.028, -0.1, polyD);
    gripMesh.add(gripBevel);
    muzzleFlash = makeMuzzleFlashSprite(0, 0.016, -0.43, 0.95);
    addBarrelHeatShimmer(0, 0.034, -0.34, 0.16);
    gunRoot.add(
      stock, stockPad, receiver, receiverTop, rail,
      handguard, hgBevel, barrel, muzzleDevice, flashHiderRing,
      magWell, magSock, pistol, gripMesh, muzzleFlash
    );
    gripMesh.userData.base = { x: 0, y: -0.052, z: -0.1, rotX: 0, rotY: 0, rotZ: 0 };
    opticRoot = new THREE.Group();
    opticRoot.position.set(0, 0.048, -0.01);
    opticRoot.userData.base = { x: 0, y: 0.048, z: -0.01, rotX: 0, rotY: 0, rotZ: 0 };
  }

  muzzleFlash.visible = false;
  muzzleSocket = new THREE.Object3D();
  muzzleSocket.name = "muzzleSocket";
  muzzleSocket.position.copy(muzzleFlash.position);
  gunRoot.add(muzzleSocket);
  ejectionPort = new THREE.Object3D();
  ejectionPort.name = "ejectionPort";
  // Right side of receiver, slightly above mag (pose-independent world spawn).
  if (isSniper) ejectionPort.position.set(0.03, 0.018, 0.055);
  else if (isRifle) ejectionPort.position.set(0.038, 0.008, 0.018);
  else ejectionPort.position.set(0.036, -0.014, 0.018);
  gunRoot.add(ejectionPort);
  gunRoot.add(opticRoot);
  rebuildOpticMeshes();
  attachSeatedMag();
  mountSuppressorForGun(style);
  swayRig.add(gunRoot);
  stampViewmodelLayer(holdRoot);
  applyBarrelHeatVisual();
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
  stampViewmodelLayer(opticRoot);
}

function updateOpticVisibility() {
  if (!opticRoot) return;
  opticRoot.children.forEach((c) => {
    c.visible = c.userData.opticId === state.optic;
  });
}

function pickupCompatible(p) {
  const ud = (p && p.userData) || {};
  if (ud.droppedLoadout || ud.resetTargets) return true;
  if (ud.weaponId) return true;
  if (state.handsEmpty) return false;
  if (ud.magId) return magAllowedOnWeapon(ud.magId);
  if (ud.suppressorWeaponId) return ud.suppressorWeaponId === state.weaponId;
  if (ud.opticId) return weaponAllowsOptic(ud.opticId);
  return true;
}

/** Dim table props the current weapon cannot host. Optics stay lookable; mags/cans do not highlight. */
function refreshOpticsTableAvailability() {
  refreshTableAvailability();
}

function refreshTableAvailability() {
  if (!pickups || !pickups.length) return;
  pickups.forEach((p) => {
    const ud = p.userData || {};
    if (!ud.opticId && !ud.magId && !ud.suppressorWeaponId) return;
    const ok = pickupCompatible(p);
    p.userData.allowed = ok;
    p.traverse((o) => {
      if (!o.isMesh || o === p.userData.highlight || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m.userData._baseOp == null) m.userData._baseOp = m.opacity != null ? m.opacity : 1;
        if (m.userData._baseColor == null && m.color) m.userData._baseColor = m.color.getHex();
        m.transparent = true;
        m.opacity = ok ? m.userData._baseOp : Math.max(0.12, m.userData._baseOp * 0.28);
        if (m.color && m.userData._baseColor != null) {
          m.color.setHex(ok ? m.userData._baseColor : 0x3a4048);
        }
        m.needsUpdate = true;
      });
    });
  });
}

function pourUnit(i, salt) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Scale existing 0-1 UVs so 1 UV unit is 1 world meter on that face. */
function applyMeterUVs(geo, uMeters, vMeters) {
  const uv = geo.getAttribute("uv");
  if (!uv) return geo;
  if (uMeters != null && vMeters != null) {
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uMeters, uv.getY(i) * vMeters);
    uv.needsUpdate = true;
    return geo;
  }
  const p = geo.parameters || {};
  if (p.depth != null) {
    const w = p.width;
    const h = p.height;
    const d = p.depth;
    const faceUV = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) {
      const um = faceUV[f][0];
      const vm = faceUV[f][1];
      for (let i = 0; i < 4; i++) {
        const vi = f * 4 + i;
        if (vi >= uv.count) break;
        uv.setXY(vi, uv.getX(vi) * um, uv.getY(vi) * vm);
      }
    }
    uv.needsUpdate = true;
    return geo;
  }
  if (p.width != null && p.height != null) return applyMeterUVs(geo, p.width, p.height);
  return geo;
}

/** World-phase meter UVs so same-size slabs don't stamp the same 0-origin tile.
 *  1 UV unit stays 1 meter. Walls pass rotRad = 0 so seams stay square. */
function worldPhaseUVs(geo, uOff, vOff, rotRad) {
  const uv = geo.getAttribute("uv");
  if (!uv) return geo;
  const rot = rotRad || 0;
  const ou = uOff || 0;
  const ov = vOff || 0;
  if (rot === 0 && ou === 0 && ov === 0) return geo;
  let cu = 0;
  let cv = 0;
  if (rot !== 0) {
    let uMin = Infinity;
    let uMax = -Infinity;
    let vMin = Infinity;
    let vMax = -Infinity;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      if (u < uMin) uMin = u;
      if (u > uMax) uMax = u;
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
    cu = (uMin + uMax) * 0.5;
    cv = (vMin + vMax) * 0.5;
  }
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i < uv.count; i++) {
    let u = uv.getX(i);
    let v = uv.getY(i);
    if (rot !== 0) {
      const du = u - cu;
      const dv = v - cv;
      u = du * c - dv * s + cu;
      v = du * s + dv * c + cv;
    }
    uv.setXY(i, u + ou, v + ov);
  }
  uv.needsUpdate = true;
  return geo;
}

function pourUvSpin(i, salt) {
  return (pourUnit(i, salt) - 0.5) * (Math.PI / 180) * 2.2;
}

/** Greedy merge: walk a grid, expand width then height, mark used. Same-key cells become one rect. */
function greedyMergeRects(nx, nz, keyAt) {
  const used = new Array(nz);
  for (let zi = 0; zi < nz; zi++) used[zi] = new Array(nx).fill(false);
  const rects = [];
  for (let zi = 0; zi < nz; zi++) {
    for (let xi = 0; xi < nx; xi++) {
      if (used[zi][xi]) continue;
      const key = keyAt(xi, zi);
      let w = 1;
      while (xi + w < nx && !used[zi][xi + w] && keyAt(xi + w, zi) === key) w++;
      let h = 1;
      expand: while (zi + h < nz) {
        for (let dx = 0; dx < w; dx++) {
          if (used[zi + h][xi + dx] || keyAt(xi + dx, zi + h) !== key) break expand;
        }
        h++;
      }
      for (let dz = 0; dz < h; dz++) {
        for (let dx = 0; dx < w; dx++) used[zi + dz][xi + dx] = true;
      }
      rects.push({ x: xi, z: zi, w, h });
    }
  }
  return rects;
}

/** World-phase meter UVs on a Y-up plane that will be rotated -PI/2 onto XZ (UV.x = worldX, UV.y = -worldZ). */
function worldPhaseFloorUVs(geo, xc, zc, width, depth) {
  return worldPhaseUVs(
    applyMeterUVs(geo, width, depth),
    xc - width * 0.5,
    -(zc + depth * 0.5)
  );
}

/** Near-bay pour slabs + cheaper far planes. Same total coverage; greedy-merge coplanar same-material cells. */
function addPouredGround(mat, across, along, centerZ, y, nearZ0, nearZ1, slab, impact) {
  const kind = mat && mat.userData && mat.userData.concreteKind ? mat.userData.concreteKind : "floor";
  const zMin = centerZ - along * 0.5;
  const zMax = centerZ + along * 0.5;
  const n0 = Math.max(zMin, nearZ0);
  const n1 = Math.min(zMax, nearZ1);
  const nx = Math.max(1, Math.round(across / slab));
  const slabX = across / nx;
  const rows = [];
  for (let z = n0; z < n1 - 1e-4; z += slab) {
    const depth = Math.min(slab, n1 - z);
    rows.push({ z0: z, depth });
  }
  const nz = rows.length;
  const cellMat = (xi, zi) => getConcreteVariant(kind, pourUnit(zi * 17 + xi, 1.7));
  const keyAt = (xi, zi) => cellMat(xi, zi).uuid + ":" + rows[zi].depth.toFixed(4);
  const stamp = (width, depth, xc, zc, material) => {
    const mesh = new THREE.Mesh(
      worldPhaseFloorUVs(new THREE.PlaneGeometry(width, depth), xc, zc, width, depth),
      material
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(xc, y, zc);
    mesh.receiveShadow = true;
    if (impact) mesh.userData.impactSurface = impact;
    scene.add(mesh);
  };
  if (nz > 0) {
    for (const r of greedyMergeRects(nx, nz, keyAt)) {
      const width = r.w * slabX;
      let depth = 0;
      for (let dz = 0; dz < r.h; dz++) depth += rows[r.z + dz].depth;
      const xc = -across * 0.5 + (r.x + r.w * 0.5) * slabX;
      const zc = rows[r.z].z0 + depth * 0.5;
      stamp(width, depth, xc, zc, cellMat(r.x, r.z));
    }
  }
  const cheap = (zA, zB) => {
    const len = zB - zA;
    if (len < 0.05) return;
    const zc = (zA + zB) * 0.5;
    stamp(across, len, 0, zc, getConcreteVariant(kind, pourUnit(Math.round(zA + len), 8.8)));
  };
  cheap(zMin, n0);
  cheap(n1, zMax);
}

function addBayWallPanels(wallMat, rangeCenterZ) {
  const wallLen = 430;
  const wallH = 2.4;
  const wallT = 0.55;
  const n = Math.round(wallLen / 5.5);
  const panelLen = wallLen / n;
  const z0 = rangeCenterZ - wallLen * 0.5;
  const hullMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  for (const side of [-12, 12]) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, wallLen), hullMat);
    hull.position.set(side, -0.2, rangeCenterZ);
    hull.castShadow = false;
    hull.receiveShadow = false;
    hull.userData.impactSurface = "wall";
    addLeanSolid(hull);
    for (let i = 0; i < n; i++) {
      const zc = z0 + (i + 0.5) * panelLen;
      const geo = worldPhaseUVs(
        applyMeterUVs(new THREE.BoxGeometry(wallT, wallH, panelLen)),
        zc,
        -0.2,
        0
      );
      const panel = new THREE.Mesh(geo, getConcreteVariant(wallMat.userData.concreteKind || "wall", pourUnit(i, side + 1.4)));
      panel.position.set(side, -0.2, zc);
      panel.castShadow = false;
      panel.receiveShadow = true;
      panel.userData.impactSurface = "wall";
      scene.add(panel);
    }
  }
}

function buildRoom() {
  leanSolids = [];
  const floorMat = makeConcreteMaterial("floor");
  // Bay geometry centered on the 200 m mark so spawn→berm (~410 m) stays covered.
  const rangeCenterZ = rangeZ(200);
  const nearZ0 = rangeZ(40);
  const nearZ1 = SPAWN_Z + 10;
  addPouredGround(floorMat, 40, 460, rangeCenterZ, FLOOR_Y, nearZ0, nearZ1, 5, "floor");

  // Soft reference grid — quiet so world-space concrete can read
  const grid = new THREE.GridHelper(40, 80, 0x2e3848, 0x1c222c);
  grid.position.y = -1.39;
  grid.position.z = rangeCenterZ;
  grid.material.transparent = true;
  grid.material.opacity = 0.16;
  scene.add(grid);

  // Low side walls as ~5.5 m pour panels (outside the ±5.5 rails)
  addBayWallPanels(makeConcreteMaterial("wall"), rangeCenterZ);

  buildOpticsTable();
  buildWeaponsBench();
  buildKitTable();
  buildRangeProps();
  buildFiringLineStall();
  buildRangeBenches();
  try {
    buildRangeFloodlights();
  } catch (err) {
    console.error('[flood] buildRangeFloodlights failed', err);
  }
  try {
    buildSpawnShelter();
  } catch (err) {
    console.error('[shelter] buildSpawnShelter failed', err);
  }
  buildShootingRange();
  scatterStartAreaDrops();
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
  markVaultable(top);
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
  registerLeanSolid(top);
  registerLeanSolid(apron);
  registerLeanSolid(apronB);
  registerLeanSolid(legL);
  registerLeanSolid(legR);
  registerLeanSolid(legL2);
  registerLeanSolid(legR2);
  registerLeanSolid(shelf);

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
    group.userData = { opticId: d.id, label: d.label, highlight, baseY: tableY + 0.08, allowed: true };
    scene.add(group);
    pickups.push(group);
  });
  refreshOpticsTableAvailability();
}

/** World/bench silhouette reuse of buildBlockGun (author meters; callers scale). */
function makeWeaponBenchProp(style) {
  const g = new THREE.Group();
  g.name = "weaponProp_" + style;
  const poly = GUN_MAT.polymer;
  const polyD = GUN_MAT.polymerDark;
  const metal = GUN_MAT.metal;
  const dark = GUN_MAT.darkMetal;
  const isRifle = style === "example_rifle";
  const isSniper = style === "example_sniper";
  if (isRifle) {
    // 7.62 DMR — fixed stock, long rail, 20" barrel, 20-rd mag
    g.add(makeBox(0.046, 0.074, 0.16, 0x2a3038, 0, -0.012, 0.248, poly));
    g.add(makeBox(0.056, 0.05, 0.23, 0x6e7a8c, 0, 0.018, 0.028, metal));
    g.add(makeBox(0.054, 0.048, 0.30, 0x2a3038, 0, 0.008, -0.28, poly));
    g.add(makeCyl(0.009, 0.012, 0.44, 0x1e2430, 0, 0.018, -0.56, Math.PI / 2, 0, 0, 12, dark));
    g.add(makeCyl(0.013, 0.011, 0.026, 0x12161c, 0, 0.018, -0.795, Math.PI / 2, 0, 0, 10, dark));
    const magR = makeMagMesh("rifle_20");
    magR.position.set(0, -0.054, 0.005);
    g.add(magR);
    const pistol = makeBox(0.032, 0.10, 0.042, 0x2a3038, 0, -0.088, 0.095, poly);
    pistol.rotation.x = 0.28;
    g.add(pistol);
  } else if (isSniper) {
    // M24-class bolt — long barrel, no RAS, 5-rd mag, bolt handle
    g.add(makeBox(0.048, 0.082, 0.22, 0x2a3238, 0.002, -0.018, 0.22, poly));
    g.add(makeBox(0.042, 0.048, 0.16, 0x5a6578, 0, 0.016, 0.02, metal));
    g.add(makeBox(0.042, 0.036, 0.22, 0x2a3038, 0, 0.0, -0.18, poly));
    g.add(makeCyl(0.008, 0.012, 0.52, 0x1e2430, 0, 0.014, -0.58, Math.PI / 2, 0, 0, 12, dark));
    const magS = makeMagMesh("sniper_5");
    magS.position.set(0, -0.036, 0.01);
    g.add(magS);
    g.add(makeCyl(0.005, 0.005, 0.055, 0x6e7a8c, 0.032, 0.028, 0.078, 0, 0, Math.PI / 2, 8, metal));
    const wrist = makeBox(0.036, 0.09, 0.05, 0x2a3038, 0, -0.08, 0.08, poly);
    wrist.rotation.x = 0.18;
    g.add(wrist);
  } else {
    g.add(makeBox(0.04, 0.055, 0.09, 0x2e343e, 0.01, -0.008, 0.128, poly));
    g.add(makeBox(0.056, 0.068, 0.17, 0x6e7a8c, 0, 0.002, 0.01, metal));
    g.add(makeBox(0.048, 0.046, 0.115, 0x323840, 0, 0.004, -0.13, poly));
    g.add(makeCyl(0.0085, 0.012, 0.2, 0x1e2430, 0, 0.016, -0.28, Math.PI / 2, 0, 0, 12, dark));
    const magP = makeMagMesh("smg_20");
    magP.position.set(0, -0.048, 0.01);
    g.add(magP);
    const pistol = makeBox(0.032, 0.084, 0.04, 0x2a3038, 0, -0.078, 0.07, poly);
    pistol.rotation.x = 0.28;
    g.add(pistol);
  }
  return g;
}

function opticRestOnProp(weaponId) {
  if (weaponId === "example_rifle") return { x: 0, y: 0.052, z: -0.02 };
  if (weaponId === "example_sniper") return { x: 0, y: 0.052, z: 0.01 };
  return { x: 0, y: 0.048, z: -0.01 };
}

function replacePropMag(g, magId) {
  if (!magId) return;
  let oldMag = null;
  g.traverse((o) => {
    if (!oldMag && o.name && o.name.indexOf("mag_") === 0) oldMag = o;
  });
  if (oldMag && oldMag.userData && oldMag.userData.magId === magId) return;
  const mag = makeMagMesh(magId);
  if (oldMag) {
    mag.position.copy(oldMag.position);
    mag.rotation.copy(oldMag.rotation);
    const parent = oldMag.parent || g;
    parent.remove(oldMag);
    parent.add(mag);
  } else {
    mag.position.set(0, -0.048, 0.01);
    g.add(mag);
  }
}

/** World-kit mesh: bench silhouette plus seated mag / optic / can from the snapshot. */
function makeDroppedKitMesh(loadout) {
  const weaponId = loadout.weaponId;
  const g = makeWeaponBenchProp(weaponId);
  replacePropMag(g, loadout.magId);
  if (loadout.optic && loadout.optic !== "iron") {
    const optic = makeOpticMesh(loadout.optic);
    const rest = opticRestOnProp(weaponId);
    optic.position.set(rest.x, rest.y, rest.z);
    g.add(optic);
  }
  if (loadout.suppressor) {
    const can = makeSuppressorMesh(weaponId, { heat: false });
    const spec = SUPPRESSOR_SPEC[weaponId] || SUPPRESSOR_SPEC.example_smg;
    can.position.set(spec.mount[0], spec.mount[1], spec.mount[2]);
    g.add(can);
  }
  return g;
}

function disposeObject3D(root) {
  if (!root) return;
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material.dispose();
    }
  });
}

function removePickup(group) {
  const i = pickups.indexOf(group);
  if (i >= 0) pickups.splice(i, 1);
  if (state.lookPickup === group) state.lookPickup = null;
}

/** World-kit silhouette child — skip the hover pad so AABB is the gun. */
function droppedGunProp(mesh) {
  const hl = mesh && mesh.userData && mesh.userData.highlight;
  if (!mesh || !mesh.children) return mesh;
  for (let i = 0; i < mesh.children.length; i++) {
    if (mesh.children[i] !== hl) return mesh.children[i];
  }
  return mesh;
}

/** Thin floor pad under a rested kit. Cancels parent roll so Y stays up. */
function flattenDropHighlight(mesh) {
  const hl = mesh.userData && mesh.userData.highlight;
  if (!hl) return;
  hl.raycast = () => {};
  hl.rotation.order = "YXZ";
  hl.rotation.set(0, 0, -mesh.rotation.z, "YXZ");
  const lift = FLOOR_Y + 0.014 - mesh.position.y;
  hl.position.set(0, lift, 0).applyQuaternion(_dropHlQ.copy(mesh.quaternion).invert());
}

function restDroppedGun(mesh, yaw) {
  mesh.rotation.order = "YXZ";
  mesh.rotation.y = yaw != null ? yaw : mesh.rotation.y;
  mesh.rotation.x = 0;
  // Flat on the long side: barrel along local -Z, mag (local -Y) out to the side.
  const z0 = Math.atan2(Math.sin(mesh.rotation.z), Math.cos(mesh.rotation.z));
  mesh.rotation.z = (Math.abs(z0) < 1e-3)
    ? (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2)
    : (z0 >= 0 ? Math.PI / 2 : -Math.PI / 2);
  mesh.updateMatrixWorld(true);
  const prop = droppedGunProp(mesh);
  const box = _dropRestBox.setFromObject(prop || mesh);
  if (Number.isFinite(box.min.y)) mesh.position.y += FLOOR_Y - box.min.y;
  else mesh.position.y = WORLD_DROP_REST_Y;
  mesh.userData.baseY = mesh.position.y;
  flattenDropHighlight(mesh);
}

function despawnWorldDrop(rec) {
  if (!rec) return;
  const mesh = rec.mesh;
  const i = worldDrops.indexOf(rec);
  if (i >= 0) worldDrops.splice(i, 1);
  if (mesh) {
    removePickup(mesh);
    if (mesh.parent) mesh.parent.remove(mesh);
    disposeObject3D(mesh);
  }
}

function spawnWorldDrop(loadout, opts = {}) {
  if (!scene || !loadout || !db[loadout.weaponId]) return null;
  const snap = cloneLoadout(loadout);
  if (!snap.id) snap.id = mintInstanceId();
  while (worldDrops.length >= WORLD_DROP_CAP) despawnWorldDrop(worldDrops[0]);

  const group = new THREE.Group();
  const prop = makeDroppedKitMesh(snap);
  prop.scale.setScalar(WORLD_DROP_SCALE);
  group.add(prop);
  const highlight = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.025, 0.95),
    new THREE.MeshBasicMaterial({ color: 0x6ea8ff, transparent: true, opacity: 0.0 })
  );
  highlight.position.y = 0.014;
  highlight.raycast = () => {};
  group.add(highlight);
  const meta = WEAPON_META[snap.weaponId] || { label: snap.weaponId };
  group.userData = {
    weaponId: snap.weaponId,
    droppedLoadout: snap,
    label: meta.label,
    highlight,
    baseY: WORLD_DROP_REST_Y,
    worldDrop: true,
    allowed: true,
  };

  const x = opts.x != null ? opts.x : 0;
  const z = opts.z != null ? opts.z : SPAWN_Z;
  const y = opts.y != null ? opts.y : WORLD_DROP_REST_Y;
  group.position.set(x, y, z);
  group.rotation.order = "YXZ";
  if (opts.settled) {
    restDroppedGun(group, opts.yaw || 0);
  } else {
    group.rotation.set(
      (Math.random() - 0.5) * 1.4,
      opts.yaw != null ? opts.yaw : Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 1.4,
      "YXZ"
    );
  }

  const rec = {
    mesh: group,
    vel: opts.vel ? opts.vel.clone() : new THREE.Vector3(),
    angVel: opts.angVel ? opts.angVel.clone() : new THREE.Vector3(),
    bounced: !!opts.settled,
    sleeping: !!opts.settled,
  };
  scene.add(group);
  pickups.push(group);
  worldDrops.push(rec);
  return rec;
}

function dropHeldWeapon({ atFeet = false } = {}) {
  if (state.handsEmpty) return null;
  if (!camera || !player) return null;
  const snap = snapshotHeldLoadout();
  camera.getWorldDirection(_fwd);
  _fwd.y = 0;
  if (_fwd.lengthSq() < 1e-8) _fwd.set(0, 0, -1);
  else _fwd.normalize();
  const dist = atFeet ? 0.38 : 0.62;
  const x = player.pos.x + _fwd.x * dist;
  const z = player.pos.z + _fwd.z * dist;
  const y = atFeet ? (FLOOR_Y + 0.32) : (player.eyeCurrent - 0.18);
  const vel = new THREE.Vector3();
  if (atFeet) {
    vel.set(_fwd.x * 0.55, 0.55, _fwd.z * 0.55);
  } else {
    vel.set(
      _fwd.x * (2.15 + Math.random() * 0.35),
      1.45 + Math.random() * 0.35,
      _fwd.z * (2.15 + Math.random() * 0.35)
    );
  }
  const angVel = new THREE.Vector3(
    (Math.random() - 0.5) * 8,
    (Math.random() - 0.5) * 6,
    (Math.random() - 0.5) * 8
  );
  const rec = spawnWorldDrop(snap, {
    x, y, z,
    yaw: Math.atan2(_fwd.x, _fwd.z),
    vel,
    angVel,
  });
  setHandsEmpty(true);
  const lab = (WEAPON_META[snap.weaponId] && WEAPON_META[snap.weaponId].label) || snap.weaponId;
  showToast("Dropped " + lab);
  return rec;
}

function consumeWorldDrop(group) {
  if (!group) return;
  const rec = worldDrops.find((d) => d.mesh === group);
  if (rec) despawnWorldDrop(rec);
  else {
    removePickup(group);
    if (group.parent) group.parent.remove(group);
    disposeObject3D(group);
  }
}

function pickupWorldDrop(group) {
  if (!group || !group.userData || !group.userData.droppedLoadout) return;
  const snap = cloneLoadout(group.userData.droppedLoadout);
  consumeWorldDrop(group);
  if (holdingWeapon()) dropHeldWeapon({ atFeet: true });
  applyLoadout(snap);
}

function updateWorldDrops(dt) {
  for (let i = 0; i < worldDrops.length; i++) {
    const d = worldDrops[i];
    if (!d || d.sleeping || !d.mesh) continue;
    d.vel.y -= CASING_GRAVITY * dt;
    d.mesh.position.addScaledVector(d.vel, dt);
    d.mesh.rotation.x += d.angVel.x * dt;
    d.mesh.rotation.y += d.angVel.y * dt;
    d.mesh.rotation.z += d.angVel.z * dt;
    d.mesh.updateMatrixWorld(true);
    const box = _dropRestBox.setFromObject(droppedGunProp(d.mesh));
    if (Number.isFinite(box.min.y) && box.min.y <= FLOOR_Y) {
      d.mesh.position.y += FLOOR_Y - box.min.y;
      if (!d.bounced) {
        d.bounced = true;
        d.vel.y = Math.abs(d.vel.y) * 0.28;
        d.vel.x *= 0.46;
        d.vel.z *= 0.46;
        d.angVel.multiplyScalar(0.4);
        if (d.vel.y < 0.4) d.vel.y = 0.4;
      } else if (d.vel.y <= 0) {
        d.vel.set(0, 0, 0);
        d.angVel.set(0, 0, 0);
        d.sleeping = true;
        restDroppedGun(d.mesh, d.mesh.rotation.y);
      }
    }
  }
}

/** 5 dumped kits around the stall / porch. Mix of the 3 guns; kit from WEAPON_KIT only. */
function scatterStartAreaDrops() {
  const spots = [
    { x: -2.78, z: -0.12, yaw: Math.PI * 0.52 },
    { x: 2.82, z: -0.28, yaw: -Math.PI * 0.50 },
    { x: -2.88, z: -3.12, yaw: Math.PI * 0.58 },
    { x: -2.38, z: 0.55, yaw: Math.PI * 0.18 },
    { x: 2.92, z: -2.38, yaw: -Math.PI * 0.42 },
  ];
  const types = Object.keys(WEAPON_KIT);
  if (!types.length) return;
  for (let i = 0; i < spots.length; i++) {
    const weaponId = types[i % types.length];
    const loadout = randomizeLoadout(weaponId);
    spawnWorldDrop(loadout, {
      x: spots[i].x,
      z: spots[i].z,
      y: WORLD_DROP_REST_Y,
      yaw: spots[i].yaw + (Math.random() - 0.5) * 0.18,
      settled: true,
    });
  }
}

/** Second table near spawn/optics area with SMG / Rifle / Sniper pickups. */
function buildWeaponsBench() {
  const tableY = -0.85;
  const tableZ = -0.35;
  const tableX = 2.08; // slightly right so a 3-gun table stays inside walk clamp / clear of optics table
  const topW = 1.78;
  const topD = 0.72;
  const woodTex = makeWoodTexture();
  const topMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0xb89872,
    roughness: 0.74,
    metalness: 0.04,
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(topW, 0.055, topD), topMat);
  top.position.set(tableX, tableY, tableZ);
  top.castShadow = true;
  top.receiveShadow = true;
  markVaultable(top);
  const apronZ = topD * 0.5 - 0.02;
  const apron = makeBox(topW + 0.04, 0.05, 0.04, 0x3a2e22, tableX, tableY - 0.04, tableZ + apronZ);
  const apronB = makeBox(topW + 0.04, 0.05, 0.04, 0x3a2e22, tableX, tableY - 0.04, tableZ - apronZ);
  const legMat = 0x2e241c;
  const legX = topW * 0.5 - 0.09;
  const legZ = topD * 0.5 - 0.12;
  const legL = makeBox(0.06, 0.55, 0.06, legMat, tableX - legX, tableY - 0.3, tableZ - legZ);
  const legR = makeBox(0.06, 0.55, 0.06, legMat, tableX + legX, tableY - 0.3, tableZ - legZ);
  const legL2 = makeBox(0.06, 0.55, 0.06, legMat, tableX - legX, tableY - 0.3, tableZ + legZ);
  const legR2 = makeBox(0.06, 0.55, 0.06, legMat, tableX + legX, tableY - 0.3, tableZ + legZ);
  scene.add(top, apron, apronB, legL, legR, legL2, legR2);
  registerLeanSolid(top);
  registerLeanSolid(apron);
  registerLeanSolid(apronB);
  registerLeanSolid(legL);
  registerLeanSolid(legR);
  registerLeanSolid(legL2);
  registerLeanSolid(legR2);

  // Honest-meter guns along table length (X); spaced across depth so ~1 m rifles don't overlap.
  const benchY = tableY + 0.03;
  const defs = [
    { id: "example_smg", label: "MP9-Z", z: tableZ + 0.08 },
    { id: "example_rifle", label: "SR-25", z: tableZ - 0.08 },
    { id: "example_sniper", label: "M24 Sniper", z: tableZ - 0.22 },
  ];
  defs.forEach((d) => {
    const group = new THREE.Group();
    group.position.set(tableX, benchY, d.z);
    const prop = makeWeaponBenchProp(d.id);
    prop.scale.setScalar(WEAPON_BENCH_SCALE);
    prop.rotation.order = "YXZ";
    prop.rotation.y = -Math.PI / 2;
    prop.rotation.x = -0.05;
    prop.rotation.z = 0.05;
    sitOnTable(prop);
    group.add(prop);
    const highlight = new THREE.Mesh(
      new THREE.BoxGeometry(1.20, 0.03, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x6ea8ff, transparent: true, opacity: 0.0 })
    );
    highlight.position.set(0.22, 0.012, 0);
    group.add(highlight);
    group.userData = {
      weaponId: d.id,
      label: d.label,
      highlight,
      baseY: benchY,
      allowed: true,
    };
    scene.add(group);
    pickups.push(group);
  });
  buildRangeResetButton(tableX, tableY, tableZ);
}


/** Left kit table: mag bodies + per-gun cans. F like guns/optics. */
function buildKitTable() {
  const tableY = -0.85;
  const tableZ = -0.35;
  const tableX = -2.12;
  const woodTex = makeWoodTexture();
  const topMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0xb89872,
    roughness: 0.74,
    metalness: 0.04,
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.055, 0.62), topMat);
  top.position.set(tableX, tableY, tableZ);
  top.castShadow = true;
  top.receiveShadow = true;
  markVaultable(top);
  const apron = makeBox(1.92, 0.05, 0.04, 0x3a2e22, tableX, tableY - 0.04, tableZ + 0.29);
  const apronB = makeBox(1.92, 0.05, 0.04, 0x3a2e22, tableX, tableY - 0.04, tableZ - 0.29);
  const legMat = 0x2e241c;
  const legL = makeBox(0.06, 0.55, 0.06, legMat, tableX - 0.84, tableY - 0.3, tableZ - 0.22);
  const legR = makeBox(0.06, 0.55, 0.06, legMat, tableX + 0.84, tableY - 0.3, tableZ - 0.22);
  const legL2 = makeBox(0.06, 0.55, 0.06, legMat, tableX - 0.84, tableY - 0.3, tableZ + 0.22);
  const legR2 = makeBox(0.06, 0.55, 0.06, legMat, tableX + 0.84, tableY - 0.3, tableZ + 0.22);
  scene.add(top, apron, apronB, legL, legR, legL2, legR2);
  registerLeanSolid(top);
  registerLeanSolid(apron);
  registerLeanSolid(apronB);
  registerLeanSolid(legL);
  registerLeanSolid(legR);
  registerLeanSolid(legL2);
  registerLeanSolid(legR2);

  const magDefs = [
    { id: "smg_20", x: -0.72 },
    { id: "smg_45", x: -0.36 },
    { id: "smg_60", x: 0.0 },
    { id: "rifle_20", x: 0.36 },
    { id: "sniper_5", x: 0.72 },
  ];
  magDefs.forEach((d) => {
    const mag = magKind(d.id);
    const group = new THREE.Group();
    const y = tableY + 0.03;
    group.position.set(tableX + d.x, y, tableZ + 0.14);
    const prop = makeMagMesh(d.id);
    prop.scale.setScalar(1.15);
    prop.rotation.y = 0.35;
    sitOnTable(prop);
    group.add(prop);
    const highlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.018, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x6ea8ff, transparent: true, opacity: 0.0 })
    );
    highlight.position.y = 0.006;
    group.add(highlight);
    group.userData = {
      magId: d.id,
      label: mag.label,
      highlight,
      baseY: y,
      allowed: true,
    };
    scene.add(group);
    pickups.push(group);
  });

  const canDefs = [
    { id: "example_smg", x: -0.52 },
    { id: "example_rifle", x: 0.0 },
    { id: "example_sniper", x: 0.52 },
  ];
  canDefs.forEach((d) => {
    const spec = SUPPRESSOR_SPEC[d.id];
    const group = new THREE.Group();
    const y = tableY + 0.04;
    group.position.set(tableX + d.x, y, tableZ - 0.14);
    const prop = makeSuppressorMesh(d.id, { heat: false });
    prop.rotation.y = 0.55;
    prop.rotation.x = 0.18;
    sitOnTable(prop);
    group.add(prop);
    const highlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.018, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x6ea8ff, transparent: true, opacity: 0.0 })
    );
    highlight.position.y = 0.006;
    group.add(highlight);
    group.userData = {
      suppressorWeaponId: d.id,
      label: spec.label,
      highlight,
      baseY: y,
      allowed: true,
    };
    scene.add(group);
    pickups.push(group);
  });
  refreshTableAvailability();
}

function makeResetLabelTexture() {
  return makeCanvasTexture((ctx, size) => {
    ctx.fillStyle = "#16181c";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(10, 10, size - 20, size - 20);
    ctx.fillStyle = "#1c1e22";
    ctx.fillRect(18, 18, size - 36, size - 36);
    ctx.fillStyle = "#f4ead0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 54px Arial, Helvetica, sans-serif";
    ctx.fillText("RESET", size / 2, size / 2 - 20);
    ctx.font = "bold 34px Arial, Helvetica, sans-serif";
    ctx.fillText("TARGETS", size / 2, size / 2 + 32);
  }, 256);
}

/** Chunky industrial reset on the weapons bench (look + F / click). */
function buildRangeResetButton(tableX, tableY, tableZ) {
  const group = new THREE.Group();
  const y = tableY + 0.05;
  group.position.set(tableX - 0.68, y, tableZ + 0.28);
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.02, 0.17),
    new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.42, metalness: 0.58 })
  );
  plate.position.y = 0.01;
  plate.castShadow = true;
  group.add(plate);
  const bezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.054, 0.018, 22),
    new THREE.MeshStandardMaterial({ color: 0x3a424c, roughness: 0.38, metalness: 0.62 })
  );
  bezel.position.y = 0.024;
  group.add(bezel);
  const btn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.04, 0.03, 22),
    new THREE.MeshStandardMaterial({
      color: 0xb42318,
      roughness: 0.32,
      metalness: 0.22,
      emissive: 0x3a0606,
      emissiveIntensity: 0.4,
    })
  );
  btn.position.y = 0.042;
  btn.castShadow = true;
  group.add(btn);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.075),
    new THREE.MeshBasicMaterial({ map: makeResetLabelTexture() })
  );
  label.position.set(0, 0.034, 0.09);
  group.add(label);
  const highlight = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.018, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xff6644, transparent: true, opacity: 0.0 })
  );
  highlight.position.y = 0.004;
  group.add(highlight);
  group.userData = {
    resetTargets: true,
    label: "Reset targets",
    highlight,
    baseY: y,
    allowed: true,
    buttonMesh: btn,
  };
  scene.add(group);
  pickups.push(group);
}

function buildShootingRange() {
  const ptsByM = { 50: 5, 100: 8, 150: 12, 200: 16, 300: 22, 400: 30 };
  const baseLanes = RANGE_MARK_DISTANCES.map((m) => ({
    z: rangeZ(m),
    m,
    pts: ptsByM[m],
  }));
  clearGroundRangeLines();
  rangeTargets = [];
  silhouetteTargets = [];
  bermPopupTargets.forEach((f) => { if (f.group && f.group.parent) f.group.parent.remove(f.group); });
  bermPopupTargets = [];
  scorePopups.forEach((p) => p.el && p.el.remove());
  scorePopups = [];
  const fl = el("floatLabels");
  if (fl) fl.innerHTML = "";

  const rangeCenterZ = rangeZ(200);
  addPouredGround(
    makeConcreteMaterial("lane"),
    18,
    430,
    rangeCenterZ,
    -1.385,
    rangeZ(40),
    SPAWN_Z + 10,
    5,
    "floor"
  );

  // Folded into the pour: ~2.5 cm proud, tops just under flood cookies so the orange wash hits them.
  const railH = 0.026;
  const railY = FLOOR_Y + 0.023; // top ~3.6 cm above floor / ~2 mm under cookie discs
  for (const side of [-5.5, 5.5]) {
    const rail = makeBox(0.1, railH, 410, 0x2a3038, side, railY, rangeCenterZ);
    rail.material.roughness = 0.52;
    rail.material.metalness = 1;
    rail.castShadow = false;
    rail.receiveShadow = true;
    scene.add(rail);
  }

  // Nominal circular-lane distances as thin floor markers + wall stencil numbers.
  buildGroundRangeLines(baseLanes.map((lane) => lane.z));
  buildWallRangeNumbers(baseLanes);

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
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false })
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
  buildBermPopupFigures();
}

/** Crest chunks on the ~410 m backstop: [x, y, zOff, w, h, d]. */
const BERM_CREST_CHUNKS = [
  [-8, 3.2, -0.5, 6, 1.4, 2.2],
  [-2, 3.5, 0.2, 5, 1.8, 2.5],
  [5, 3.1, -0.2, 7, 1.3, 2.0],
  [10, 2.9, -1.0, 5, 1.1, 1.8],
];

function bermPopupRandDelay() { return 2 + Math.random() * 6; }
function bermPopupUpTime() { return 1.5 + Math.random() * 2; }
function bermPopupAnimDur() { return 0.15 + Math.random() * 0.1; }

function syncBermPopupZones(fig) {
  const wp = new THREE.Vector3();
  for (const z of fig.zones) {
    const mesh = fig.plates[z.id];
    if (!mesh) continue;
    mesh.getWorldPosition(wp);
    z.center.copy(wp);
    z.normal.set(0, 0, 1);
  }
}

function bermPopupZoneActive(fig, zoneId) {
  if (!fig || fig.lift < 0.72) return false;
  if (fig.phase === "falling" && fig.lift < 0.85) return false;
  if (zoneId === "head") return true;
  if (zoneId === "chest") return true;
  return false;
}

/**
 * Darker steel/cardboard popup figure — slightly smaller than lane silhouettes.
 * Head is a facing disc (visual + hit). Lower body exists but sits behind the crest.
 */
function createBermPopupFigure(x, z, yUp, yDown, scale) {
  const group = new THREE.Group();
  group.position.set(x, yDown, z);

  const steel = 0x3e444c;
  const steelDark = 0x2a3036;
  const card = 0x3a322a;
  const matOpts = { roughness: 0.82, metalness: 0.18 };
  const s = scale;

  group.add(makeBox(0.28 * s, 0.05 * s, 0.18 * s, 0x4a3a2c, 0, 0.03 * s, 0, matOpts));
  group.add(makeBox(0.09 * s, 0.46 * s, 0.07 * s, steelDark, -0.09 * s, 0.46 * s, 0, matOpts));
  group.add(makeBox(0.09 * s, 0.46 * s, 0.07 * s, steelDark, 0.09 * s, 0.46 * s, 0, matOpts));
  group.add(makeBox(0.28 * s, 0.14 * s, 0.06 * s, card, 0, 0.78 * s, 0.01 * s, matOpts));

  const chestY = 1.12 * s;
  const chestPlate = makeBox(0.32 * s, 0.40 * s, 0.055 * s, steel, 0, chestY, 0.02 * s, matOpts);
  group.add(chestPlate);
  group.add(makeBox(0.11 * s, 0.10 * s, 0.07 * s, steelDark, -0.20 * s, 1.34 * s, 0.01 * s, matOpts));
  group.add(makeBox(0.11 * s, 0.10 * s, 0.07 * s, steelDark, 0.20 * s, 1.34 * s, 0.01 * s, matOpts));

  const chestFlash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34 * s, 0.42 * s),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false })
  );
  chestFlash.position.set(0, chestY, 0.055 * s);
  group.add(chestFlash);

  const headY = 1.62 * s;
  const headR = 0.105 * s;
  const headDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(headR, headR, 0.07 * s, 14),
    new THREE.MeshStandardMaterial({ color: 0x353a40, roughness: 0.78, metalness: 0.22 })
  );
  headDisc.rotation.x = Math.PI / 2;
  headDisc.position.set(0, headY, 0.02 * s);
  headDisc.castShadow = true;
  group.add(headDisc);

  const headFlash = new THREE.Mesh(
    new THREE.CircleGeometry(headR * 1.15, 14),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false })
  );
  headFlash.position.set(0, headY, 0.06 * s);
  group.add(headFlash);

  const now = performance.now() * 0.001;
  const fig = {
    group,
    plates: { head: headDisc, chest: chestPlate },
    flashes: { head: headFlash, chest: chestFlash },
    hitUntil: { head: 0, chest: 0 },
    scale: s,
    yUp,
    yDown,
    lift: 0,
    phase: "down",
    animT: 0,
    animDur: 0.2,
    hideAt: 0,
    nextAt: now + 0.6 + Math.random() * 2.5,
    knocked: false,
    homeX: x,
    xOffset: 0,
    xMin: x - 1.2,
    xMax: x + 1.2,
    xJitterMax: 1.0,
    zones: [
      { id: "head", center: new THREE.Vector3(), normal: new THREE.Vector3(0, 0, 1), radius: headR * 1.05, pts: 50 },
      { id: "chest", center: new THREE.Vector3(), normal: new THREE.Vector3(0, 0, 1), radius: 0.18 * s, pts: 20 },
    ],
  };
  scene.add(group);
  syncBermPopupZones(fig);
  return fig;
}

function clearBermPopupDecals(fig) {
  if (!fig) return;
  for (let i = impactDecals.length - 1; i >= 0; i--) {
    const mesh = impactDecals[i];
    if (!mesh) continue;
    let attached = !!(mesh.userData && mesh.userData.bermPopup === fig);
    if (!attached && fig.group) {
      let p = mesh.parent;
      while (p) {
        if (p === fig.group) { attached = true; break; }
        p = p.parent;
      }
    }
    if (!attached) continue;
    disposeImpactDecal(mesh);
    impactDecals.splice(i, 1);
  }
}

function applyBermPopupXJitter(fig) {
  clearBermPopupDecals(fig);
  if (!fig || !fig.group) return;
  const home = fig.homeX;
  const lo = fig.xMin;
  const hi = fig.xMax;
  const maxOff = fig.xJitterMax || 1.0;
  const prev = fig.xOffset || 0;
  let off = prev;
  let x = home + off;
  for (let n = 0; n < 8; n++) {
    off = (Math.random() * 2 - 1) * maxOff;
    x = home + off;
    if (x < lo) x = lo;
    if (x > hi) x = hi;
    off = x - home;
    let crowded = false;
    for (const other of bermPopupTargets) {
      if (other === fig || !other.group) continue;
      if (Math.abs(other.group.position.x - x) < 1.5) { crowded = true; break; }
    }
    if (!crowded && (Math.abs(off - prev) >= 0.25 || n === 7)) break;
  }
  fig.xOffset = off;
  fig.group.position.x = home + off;
}

function scheduleBermPopup(fig, now, extra = 0) {
  clearBermPopupDecals(fig);
  fig.phase = "down";
  fig.lift = 0;
  fig.knocked = false;
  fig.animT = 0;
  fig.group.position.y = fig.yDown;
  fig.group.rotation.x = 0;
  fig.nextAt = now + extra + bermPopupRandDelay();
}

function buildBermPopupFigures() {
  bermPopupTargets.forEach((f) => { if (f.group && f.group.parent) f.group.parent.remove(f.group); });
  bermPopupTargets = [];
  const bermZ = rangeZ(410);
  const scale = 0.76;
  const shoulderTopRel = 1.44 * scale;
  const headTopRel = 1.725 * scale;
  // Left / center-right / right peaks (skip the center-left chunk so they don't stack).
  const slots = [0, 2, 3];
  const now = performance.now() * 0.001;
  slots.forEach((idx, i) => {
    const [x0, y, zOff, w, h, d] = BERM_CREST_CHUNKS[idx];
    const crestTop = y + h * 0.5;
    const x = x0 + (Math.random() - 0.5) * Math.min(1.6, w * 0.22);
    const z = bermZ + zOff - d * 0.38;
    const yUp = crestTop + 0.07 - shoulderTopRel;
    const yDown = crestTop - 0.48 - headTopRel;
    const fig = createBermPopupFigure(x, z, yUp, yDown, scale);
    fig.homeX = x;
    fig.xOffset = 0;
    const margin = 0.40 * scale;
    fig.xMin = x0 - w * 0.5 + margin;
    fig.xMax = x0 + w * 0.5 - margin;
    if (fig.xMin > fig.xMax) {
      fig.xMin = x0;
      fig.xMax = x0;
    }
    const slack = Math.max(0, Math.min(fig.homeX - fig.xMin, fig.xMax - fig.homeX));
    fig.xJitterMax = Math.min(1.2, Math.max(0.4, slack));
    fig.nextAt = now + 0.9 + i * 2.4 + Math.random() * 2.8;
    bermPopupTargets.push(fig);
  });
}

function resetBermPopups() {
  const now = performance.now() * 0.001;
  bermPopupTargets.forEach((fig, i) => {
    for (const k of Object.keys(fig.flashes)) {
      fig.flashes[k].material.opacity = 0;
      fig.hitUntil[k] = 0;
    }
    scheduleBermPopup(fig, now, i * 1.6);
    syncBermPopupZones(fig);
  });
}

function flashBermPopupZone(fig, zone, hitPos) {
  const id = zone.id;
  fig.hitUntil[id] = performance.now() + 220;
  if (fig.flashes[id]) fig.flashes[id].material.opacity = 1;
  const pts = zone.pts;
  const klass = id === "head" ? "bull" : "mid";
  if (id === "head") sfx.play("bullseye");
  else sfx.play("hit");
  pushScorePopup(pts, klass, hitPos || zone.center);
  fig.knocked = true;
  fig.phase = "falling";
  fig.animT = 0;
  fig.animDur = bermPopupAnimDur();
}

function updateBermPopups(dt) {
  const now = performance.now() * 0.001;
  for (const fig of bermPopupTargets) {
    if (fig.phase === "down") {
      if (now >= fig.nextAt) {
        applyBermPopupXJitter(fig);
        fig.phase = "rising";
        fig.animT = 0;
        fig.animDur = bermPopupAnimDur();
        fig.knocked = false;
      }
    } else if (fig.phase === "rising") {
      fig.animT += dt;
      const u = clamp(fig.animT / fig.animDur, 0, 1);
      fig.lift = u * u * (3 - 2 * u);
      if (u >= 1) {
        fig.lift = 1;
        fig.phase = "up";
        fig.hideAt = now + bermPopupUpTime();
      }
    } else if (fig.phase === "up") {
      fig.lift = 1;
      if (now >= fig.hideAt) {
        fig.phase = "falling";
        fig.animT = 0;
        fig.animDur = bermPopupAnimDur();
      }
    } else if (fig.phase === "falling") {
      fig.animT += dt;
      const u = clamp(fig.animT / fig.animDur, 0, 1);
      fig.lift = 1 - u * u * (3 - 2 * u);
      if (u >= 1) {
        scheduleBermPopup(fig, now, 0);
      }
    }
    fig.group.position.y = fig.yDown + (fig.yUp - fig.yDown) * fig.lift;
    fig.group.rotation.x = fig.knocked ? (1 - fig.lift) * 0.55 : 0;
    const tnow = performance.now();
    for (const id of ["head", "chest"]) {
      const flash = fig.flashes[id];
      if (!flash) continue;
      if (tnow < fig.hitUntil[id]) flash.material.opacity = 1;
      else flash.material.opacity = Math.max(0, flash.material.opacity - dt * 3);
    }
    syncBermPopupZones(fig);
  }
}

/** Range backstop berm ~410 m from spawn — procedural concrete mound for distance read. */
function buildBackBerm() {
  makeConcreteMaterial("berm");
  makeConcreteMaterial("bermDark");
  // Just past the 400 m mark so the end-wall reads as the range backstop.
  const bermZ = rangeZ(410);
  // Main mound
  const main = new THREE.Mesh(worldPhaseUVs(applyMeterUVs(new THREE.BoxGeometry(28, 5.2, 3.2)), 0, bermZ), getConcreteVariant("berm", 0.12));
  main.position.set(0, 0.7, bermZ);
  main.castShadow = false;
  main.receiveShadow = true;
  addLeanSolid(main);
  // Front slope / face toward shooter
  const face = new THREE.Mesh(worldPhaseUVs(applyMeterUVs(new THREE.BoxGeometry(26, 3.6, 2.4)), 0, bermZ + 2.8), getConcreteVariant("berm", 0.41));
  face.position.set(0, -0.15, bermZ + 2.8);
  face.rotation.x = -0.35;
  face.castShadow = false;
  face.receiveShadow = true;
  addLeanSolid(face);
  // Crest / uneven top chunks
  for (const [x, y, zOff, w, h, d] of BERM_CREST_CHUNKS) {
    const chunk = new THREE.Mesh(worldPhaseUVs(applyMeterUVs(new THREE.BoxGeometry(w, h, d)), x, bermZ + zOff), getConcreteVariant("bermDark", pourUnit(Math.round(x + 20), 3.3)));
    chunk.position.set(x, y, bermZ + zOff);
    chunk.rotation.y = (x % 3) * 0.05;
    chunk.castShadow = false;
    chunk.receiveShadow = true;
    addLeanSolid(chunk);
  }
  // Flanking dirt piles
  for (const side of [-14, 14]) {
    const pile = new THREE.Mesh(worldPhaseUVs(applyMeterUVs(new THREE.BoxGeometry(6, 3.2, 4)), side, bermZ + 2), getConcreteVariant("berm", side < 0 ? 0.22 : 0.77));
    pile.position.set(side, 0.1, bermZ + 2);
    pile.castShadow = false;
    pile.receiveShadow = true;
    addLeanSolid(pile);
  }
}

/** Side-bay crates / barrels for depth — kept clear of the firing lane. */
function buildRangeProps() {
  const placements = [
    // near bay / optics area
    () => addLeanSolid(makeCrate(0.55, 0.45, 0.5, -7.2, -1.15, -4.5, 0.2)),
    () => addLeanSolid(makeCrate(0.4, 0.35, 0.4, -7.5, -1.2, -3.8, -0.4)),
    () => addLeanSolid(makeBarrel(0.22, 0.7, -6.6, -1.05, -5.8, 0x3a4a3c)),
    () => addLeanSolid(makeCrate(0.5, 0.4, 0.48, 7.4, -1.18, -3.5, -0.25)),
    () => addLeanSolid(makeBarrel(0.2, 0.65, 6.8, -1.07, -4.8, 0x4a3a2e)),
    () => addLeanSolid(makeBarrel(0.22, 0.72, 7.6, -1.04, -5.2, 0x3d4550)),
    // mid-range side props at spawn-relative distances
    () => addLeanSolid(makeCrate(0.6, 0.5, 0.55, -7.8, -1.12, rangeZ(48), 0.15)),
    () => addLeanSolid(makeBarrel(0.24, 0.8, -7.1, -1.0, rangeZ(52), 0x454e3a)),
    () => addLeanSolid(makeCrate(0.45, 0.38, 0.42, 7.5, -1.18, rangeZ(70), -0.3)),
    () => addLeanSolid(makeBarrel(0.22, 0.7, 8.0, -1.05, rangeZ(95), 0x3a4048)),
    () => addLeanSolid(makeCrate(0.7, 0.55, 0.6, -8.0, -1.1, rangeZ(140), 0.4)),
    () => addLeanSolid(makeBarrel(0.25, 0.85, 7.8, -0.98, rangeZ(180), 0x4a4034)),
    () => addLeanSolid(makeCrate(0.5, 0.42, 0.48, 7.2, -1.16, rangeZ(220), -0.2)),
    () => addLeanSolid(makeCrate(0.55, 0.48, 0.5, -7.6, -1.14, rangeZ(280), 0.1)),
    () => addLeanSolid(makeBarrel(0.23, 0.75, 7.4, -1.02, rangeZ(320), 0x384438)),
  ];
  for (const place of placements) place();
}

/** Firing-line stall near spawn: side sandbags + low benches so the bay reads as a stall, not an empty road. */
function buildFiringLineStall() {
  // z ~0 to -4, |x| ~3.2 — inside the ±5.5 rails, clear of optic table (~±0.83 / z~-1.6)
  // and the walkable lane center. Flood pools start ~25 m downrange.
  addLeanSolid(makeSandbagStack(-3.15, -0.20, { rotY: 0.04 }));
  addLeanSolid(makeSandbagStack(-3.28, -2.35, { rotY: -0.06 }));
  addLeanSolid(makeSandbagStack(3.18, -0.35, { rotY: -0.05 }));
  addLeanSolid(makeSandbagStack(3.32, -2.50, { rotY: 0.07 }));
  addLeanSolid(makeStallBench(-3.20, -3.35, 1.15));
  addLeanSolid(makeStallBench(3.24, -3.48, 1.12));
}


/** Shared radial CanvasTextures for fake flood floor pools (warm spill). */
let _floodPoolTex = null;
let _floodPoolCoreTex = null;

function makeFloodPoolRadialTexture(centerAlpha = 0.85) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const c = size * 0.5;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  // Center warm #ffe2b0 → edge alpha 0 so AdditiveBlending reads as a bright pool, not a grey smudge.
  g.addColorStop(0, `rgba(255, 226, 176, ${centerAlpha})`);
  g.addColorStop(0.28, `rgba(255, 210, 140, ${centerAlpha * 0.55})`);
  g.addColorStop(0.55, `rgba(255, 185, 100, ${centerAlpha * 0.22})`);
  g.addColorStop(0.82, `rgba(255, 170, 80, ${centerAlpha * 0.06})`);
  g.addColorStop(1, "rgba(255, 226, 176, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function getFloodPoolTexture(kind = "outer") {
  if (kind === "core") {
    if (!_floodPoolCoreTex) _floodPoolCoreTex = makeFloodPoolRadialTexture(0.95);
    return _floodPoolCoreTex;
  }
  if (!_floodPoolTex) _floodPoolTex = makeFloodPoolRadialTexture(0.85);
  return _floodPoolTex;
}

function makeFloodPoolMaterial(map) {
  // Floor is opaque MeshStandard now — depth-test so walls/bench/player occlude the spill.
  // polygonOffset + a few cm above FLOOR_Y keeps the discs on the concrete without z-fight.
  const mat = new THREE.MeshBasicMaterial({
    map,
    color: 0xffd0a0,
    transparent: true,
    opacity: 0.62,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
  if ("toneMapped" in mat) mat.toneMapped = false;
  // Helps transparent materials under logarithmicDepthBuffer when available (r152+).
  if ("forceSinglePass" in mat) mat.forceSinglePass = true;
  return mat;
}

/**
 * Cheap range floodlight: steel post + arm + glowing fixture head.
 * Uses a warm SpotLight aimed at the floor pool (tight cone, no shadow map)
 * plus a large soft fake floor pool disc so lanes read even when realtime lights struggle vs fog/albedo.
 */
function makeFloodlight(x, z, opts = {}) {
  const inward = x >= 0 ? -1 : 1;
  const postH = 5.5;
  const armLen = 1.2;
  const group = new THREE.Group();
  group.position.set(x, FLOOR_Y, z);

  const steel = new THREE.MeshStandardMaterial({ color: 0x3c4652, roughness: 0.5, metalness: 0.5 });
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.48, metalness: 0.62 });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x2a3138,
    roughness: 0.48,
    metalness: 0.55,
    emissive: 0xffc070,
    emissiveIntensity: 2.4,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.12, 8), steelDark);
  base.position.y = 0.06;
  base.castShadow = true;
  base.receiveShadow = true;

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, postH, 8), steel);
  post.position.y = postH * 0.5;
  post.castShadow = true;
  post.receiveShadow = true;

  const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.07, 0.07), steel);
  arm.position.set(inward * (armLen * 0.5), postH - 0.1, 0);
  arm.castShadow = true;
  arm.receiveShadow = true;

  const headX = inward * armLen;
  const headY = postH - 0.22;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.28), headMat);
  head.position.set(headX, headY, -0.04);
  head.rotation.z = inward * 0.48;
  head.rotation.x = -0.32;
  head.castShadow = true;
  head.receiveShadow = true;

  // Unlit warm glass so the fixture reads as on even at distance.
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.045, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xffe2b0 })
  );
  lamp.material.color.setRGB(FLOOD_LAMP_HDR[0], FLOOD_LAMP_HDR[1], FLOOD_LAMP_HDR[2]);
  lamp.position.set(headX + inward * 0.02, headY - 0.1, -0.02);
  lamp.rotation.z = inward * 0.48;
  lamp.rotation.x = -0.32;

  group.add(base, post, arm, head, lamp);

  // Floor pool under the fixture (visual only — no raycast / lean).
  // radius ~10–14, y=0.04, inward 4–6; depth-tested, renderOrder after the floor.
  const poolR = opts.poolRadius != null ? opts.poolRadius : 14;
  const poolInward = opts.poolInward != null ? opts.poolInward : 5;
  const poolX = inward * poolInward;
  const poolY = 0.04;
  const poolZ = opts.poolZ != null ? opts.poolZ : 0; // under the light, not aimZ*0.35 downrange

  const intensity = opts.intensity != null ? opts.intensity : 55;
  const distance = opts.distance != null ? opts.distance : 50;
  const lightY = headY - 0.06;
  const aimLen = Math.hypot(poolX - headX, poolY - lightY, poolZ + 0.04);
  const coverR = Math.min(poolR * 0.5, 7.2);
  const angle = clamp(Math.atan(coverR / Math.max(aimLen, 1.5)), 0.40, 0.68);
  // Isolated cones, no overlapping, no shadow maps (sun follow is enough).
  const light = new THREE.SpotLight(0xffe0b8, intensity, distance, angle, 0.45, 2);
  light.castShadow = false;
  light.position.set(headX, lightY, -0.04);
  light.target.position.set(poolX, poolY, poolZ);
  group.add(light);
  group.add(light.target);
  light.userData.floodIntBase = intensity;

  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(poolR, 48),
    makeFloodPoolMaterial(getFloodPoolTexture("outer"))
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(poolX, poolY, poolZ);
  pool.renderOrder = 1;
  pool.raycast = () => {};
  group.add(pool);

  // Tighter hot core so the spill stays readable from spawn.
  const coreR = opts.poolCoreRadius != null ? opts.poolCoreRadius : poolR * 0.32;
  let core = null;
  if (coreR > 0.5) {
    core = new THREE.Mesh(
      new THREE.CircleGeometry(coreR, 32),
      makeFloodPoolMaterial(getFloodPoolTexture("core"))
    );
    core.rotation.x = -Math.PI / 2;
    core.position.set(poolX, poolY + 0.005, poolZ);
    core.renderOrder = 2;
    core.raycast = () => {};
    group.add(core);
  }

  const fixture = {
    group,
    light,
    head,
    lamp,
    pool,
    core,
    shotOut: false,
    zone: {
      center: new THREE.Vector3(),
      normal: new THREE.Vector3(0, 0, 1),
      radius: 0.15,
    },
  };
  head.userData.floodFixture = fixture;
  lamp.userData.floodFixture = fixture;
  // Pole / arm / base stay generic env — they must not kill the light.
  return fixture;
}

/** Side-bay floodlight posts at ~25 / 80 / 160 / 280 m from spawn — SpotLights + fake pools. */
function buildRangeFloodlights() {
  floodLights = [];
  floodFixtures = [];
  // SpotLight intensity/distance sized to read on MeshStandard; soft peach discs sell the spill.
  // Pool radii ~10–14 m under fixture; depth-tested NormalBlending so walls occlude them.
  const posts = [
    { x: -9.2, meters: 25, intensity: 48, distance: 45, poolRadius: 14, poolCoreRadius: 4.5, poolInward: 5.5 },
    { x: 9.4, meters: 80, intensity: 58, distance: 52, poolRadius: 13, poolCoreRadius: 4.2, poolInward: 5.2 },
    { x: -9.2, meters: 160, intensity: 68, distance: 56, poolRadius: 12, poolCoreRadius: 4, poolInward: 5 },
    { x: 9.4, meters: 280, intensity: 78, distance: 60, poolRadius: 11, poolCoreRadius: 3.5, poolInward: 5 },
  ];
  for (const p of posts) {
    const fx = makeFloodlight(p.x, rangeZ(p.meters), p);
    addLeanSolid(fx.group);
    floodLights.push(fx.light);
    floodFixtures.push(fx);
  }
}

/**
 * Little firing-line porch over spawn: posts + thin corrugated slab, open toward the berm.
 * Tables sit just downrange of the front edge so the roof does not bury them.
 */
function buildSpawnShelter() {
  const group = new THREE.Group();
  const zc = 1.90;
  group.position.set(0, FLOOR_Y, zc);

  const roofW = 5.6;
  const roofD = 3.4;
  const roofH = 2.50;
  const slabT = 0.07;
  const halfW = roofW * 0.5;
  const halfD = roofD * 0.5;

  const steel = new THREE.MeshStandardMaterial({ color: 0x3c4652, roughness: 0.5, metalness: 1 });
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.48, metalness: 1 });
  const sheet = new THREE.MeshStandardMaterial({ color: 0x4a545c, roughness: 0.58, metalness: 1 });
  const timber = new THREE.MeshStandardMaterial({
    map: makeWoodTexture(),
    color: 0x6e5030,
    roughness: 0.9,
    metalness: 0.03,
  });

  const postInsetX = halfW - 0.22;
  const postInsetZ = halfD - 0.18;
  const posts = [
    { x: -postInsetX, z: -postInsetZ, wood: false },
    { x: postInsetX, z: -postInsetZ, wood: false },
    { x: -postInsetX, z: postInsetZ, wood: true },
    { x: postInsetX, z: postInsetZ, wood: true },
  ];
  for (const p of posts) {
    const s = p.wood ? 0.12 : 0.10;
    const mat = p.wood ? timber : steel;
    const post = new THREE.Mesh(new THREE.BoxGeometry(s, roofH, s), mat);
    post.position.set(p.x, roofH * 0.5, p.z);
    post.castShadow = true;
    post.receiveShadow = true;
    group.add(post);
  }

  const beamY = roofH - 0.04;
  const beamFront = new THREE.Mesh(new THREE.BoxGeometry(roofW - 0.16, 0.09, 0.09), steelDark);
  beamFront.position.set(0, beamY, -halfD + 0.08);
  beamFront.castShadow = true;
  beamFront.receiveShadow = true;
  const beamBack = beamFront.clone();
  beamBack.position.z = halfD - 0.08;
  group.add(beamFront, beamBack);
  for (const x of [-postInsetX, postInsetX]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, roofD - 0.2), steel);
    side.position.set(x, beamY, 0);
    side.castShadow = true;
    side.receiveShadow = true;
    group.add(side);
  }

  const slab = new THREE.Mesh(new THREE.BoxGeometry(roofW, slabT, roofD), sheet);
  slab.position.set(0, roofH + slabT * 0.5, 0);
  slab.castShadow = true;
  slab.receiveShadow = true;
  group.add(slab);

  const nRibs = 7;
  for (let i = 0; i < nRibs; i++) {
    const z = -halfD + 0.28 + i * ((roofD - 0.56) / (nRibs - 1));
    const rib = new THREE.Mesh(new THREE.BoxGeometry(roofW - 0.12, 0.035, 0.07), steelDark);
    rib.position.set(0, roofH + slabT + 0.01, z);
    rib.castShadow = false;
    rib.receiveShadow = true;
    group.add(rib);
  }

  const fx = makeShelterTube(group, roofH);
  addLeanSolid(group);
  if (fx) {
    floodLights.push(fx.light);
    floodFixtures.push(fx);
  }
}

/** 4-foot-class strip under the porch: metal trough + emissive cookie + PointLight. */
function makeShelterTube(parent, roofH) {
  const wrap = new THREE.Group();
  wrap.position.set(0, roofH - 0.10, 0.40);
  parent.add(wrap);

  const headMat = new THREE.MeshStandardMaterial({
    color: 0x2a3138,
    roughness: 0.46,
    metalness: 1,
    emissive: 0xffb060,
    emissiveIntensity: 0.45,
  });
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.055, 0.15), headMat);
  head.position.set(0, 0.02, 0);
  head.castShadow = true;
  head.receiveShadow = true;
  wrap.add(head);
  for (const x of [-0.64, 0.64]) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.16), headMat);
    cap.position.set(x, 0.01, 0);
    cap.castShadow = true;
    wrap.add(cap);
  }

  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1.18, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffe2a8,
      roughness: 0.28,
      metalness: 0.04,
      emissive: 0xffc060,
      emissiveIntensity: 2.4,
    })
  );
  lamp.material.color.setRGB(TUBE_LAMP_HDR[0], TUBE_LAMP_HDR[1], TUBE_LAMP_HDR[2]);
  if ("toneMapped" in lamp.material) lamp.material.toneMapped = false;
  lamp.rotation.z = Math.PI / 2;
  lamp.position.set(0, -0.042, 0);
  wrap.add(lamp);

  const intensity = 18;
  const light = new THREE.PointLight(0xffc070, intensity, 12, 2);
  light.castShadow = false;
  light.position.set(0, -0.085, 0);
  light.userData.floodIntBase = intensity;
  wrap.add(light);

  const fixture = {
    kind: "tube",
    group: wrap,
    light,
    head,
    lamp,
    pool: null,
    core: null,
    shotOut: false,
    lampHdr: TUBE_LAMP_HDR,
    lampEmissive: 2.4,
    headEmissive: 0.45,
    headEmissiveHex: 0xffb060,
    zone: {
      center: new THREE.Vector3(),
      normal: new THREE.Vector3(0, -1, 0),
      radius: 0.62,
    },
  };
  head.userData.floodFixture = fixture;
  lamp.userData.floodFixture = fixture;
  wrap.traverse((c) => {
    if (c.isMesh && !c.userData.floodFixture) c.userData.floodFixture = fixture;
  });
  return fixture;
}

function syncFloodLampZones() {
  const wp = new THREE.Vector3();
  for (const fx of floodFixtures) {
    if (!fx.lamp || !fx.zone) continue;
    fx.lamp.getWorldPosition(wp);
    fx.zone.center.copy(wp);
    if (fx.kind === "tube") fx.zone.normal.set(0, -1, 0);
    else fx.zone.normal.set(0, 0, 1);
  }
}

/** lit: 0 = dead glass, 1 = normal on, >1 = HDR pop spike. Never toggles light.visible. */
function applyFloodDeathLook(fx, lit) {
  const on = lit > 0.03;
  if (fx.light) {
    const base = (fx.light.userData && fx.light.userData.floodIntBase) || 55;
    const b = clamp(Number(state.brightness) || 1, 0.5, 1.5);
    fx.light.intensity = on ? base * (0.88 + 0.12 * b) * lit : 0;
  }
  const hdr = fx.lampHdr || FLOOD_LAMP_HDR;
  const headEm = fx.headEmissive != null ? fx.headEmissive : 2.4;
  const headHex = fx.headEmissiveHex != null ? fx.headEmissiveHex : 0xffc070;
  const lampEm = fx.lampEmissive != null ? fx.lampEmissive : 1;
  if (fx.head && fx.head.material) {
    if (on) {
      if (fx.head.material.emissive) fx.head.material.emissive.setHex(headHex);
      fx.head.material.emissiveIntensity = headEm * lit;
    } else {
      fx.head.material.emissiveIntensity = 0;
      if (fx.head.material.emissive) fx.head.material.emissive.setHex(0x000000);
    }
  }
  if (fx.lamp && fx.lamp.material) {
    if (fx.lamp.material.emissiveIntensity != null) {
      fx.lamp.material.emissiveIntensity = on ? lampEm * lit : 0;
    }
    if (fx.lamp.material.color) {
      if (on) {
        fx.lamp.material.color.setRGB(hdr[0] * lit, hdr[1] * lit, hdr[2] * lit);
      } else {
        fx.lamp.material.color.setHex(0x1a1612);
      }
    }
  }
  const poolOp = on ? 0.62 * Math.min(1, lit) : 0;
  if (fx.pool) {
    fx.pool.visible = on;
    if (fx.pool.material) fx.pool.material.opacity = poolOp;
  }
  if (fx.core) {
    fx.core.visible = on;
    if (fx.core.material) fx.core.material.opacity = poolOp;
  }
}

function finishFloodDeath(fx) {
  fx.die = null;
  applyFloodDeathLook(fx, 0);
}

function startFloodDeath(fx) {
  const flicker = Math.random() < 0.52;
  const die = { t: 0, flicker };
  if (flicker) {
    const span = 0.2 + Math.random() * 0.35;
    const n = 2 + ((Math.random() * 3) | 0);
    const segs = [{ at: 0, on: true, spike: true }];
    let t = 0.028 + Math.random() * 0.03;
    for (let i = 0; i < n; i++) {
      segs.push({ at: t, on: false });
      t += 0.02 + Math.random() * 0.07;
      segs.push({ at: t, on: true, spike: Math.random() < 0.3 });
      t += 0.018 + Math.random() * 0.055;
    }
    segs.push({ at: t, on: false });
    const last = Math.max(t, 0.05);
    const k = span / last;
    for (const s of segs) s.at *= k;
    die.segs = segs;
    die.dur = span;
  } else {
    die.dur = 0.15 + Math.random() * 0.2;
  }
  fx.die = die;
  applyFloodDeathLook(fx, 2.2);
}

function updateFloodDeaths(dt) {
  for (const fx of floodFixtures) {
    const die = fx.die;
    if (!die) continue;
    die.t += dt;
    if (die.flicker) {
      if (die.t >= die.dur) {
        finishFloodDeath(fx);
        continue;
      }
      let on = false;
      let spike = false;
      for (const s of die.segs) {
        if (die.t >= s.at) {
          on = s.on;
          spike = !!s.spike;
        }
      }
      applyFloodDeathLook(fx, on ? (spike ? 2.2 : 1) : 0);
    } else if (die.t >= die.dur) {
      finishFloodDeath(fx);
    } else {
      const u = 1 - die.t / die.dur;
      applyFloodDeathLook(fx, 2.2 * u * u);
    }
  }
}

function shootOutFlood(fx, hitPos, normal) {
  if (!fx || fx.shotOut) return;
  fx.shotOut = true;
  // Keep the light in the scene. Hiding it drops NUM_*_LIGHTS and
  // recompiles every MeshStandard shader (first-shot hitch).
  if (fx.light && fx.light.userData) fx.light.userData.shotOut = true;
  startFloodDeath(fx);
  const n = normal || new THREE.Vector3(0, 0, 1);
  if (fx.lamp) fx.lamp.getWorldPosition(_bulbSparkOrigin);
  else if (hitPos) _bulbSparkOrigin.copy(hitPos);
  else if (fx.zone && fx.zone.center) _bulbSparkOrigin.copy(fx.zone.center);
  spawnImpactDecal(_bulbSparkOrigin, n, "punch");
  spawnBulbSparks(_bulbSparkOrigin);
  sfx.play("glass");
  sfx.play("fizzle");
}

function restoreFloodlights() {
  const b = clamp(Number(state.brightness) || 1, 0.5, 1.5);
  const lightMul = 0.88 + 0.12 * b;
  for (const fx of floodFixtures) {
    fx.shotOut = false;
    fx.die = null;
    if (fx.light) {
      if (fx.light.userData) fx.light.userData.shotOut = false;
      const base = (fx.light.userData && fx.light.userData.floodIntBase) || 55;
      fx.light.intensity = base * lightMul;
    }
    const hdr = fx.lampHdr || FLOOD_LAMP_HDR;
    const headEm = fx.headEmissive != null ? fx.headEmissive : 2.4;
    const headHex = fx.headEmissiveHex != null ? fx.headEmissiveHex : 0xffc070;
    const lampEm = fx.lampEmissive != null ? fx.lampEmissive : 1;
    if (fx.head && fx.head.material) {
      if (fx.head.material.emissive) fx.head.material.emissive.setHex(headHex);
      fx.head.material.emissiveIntensity = headEm;
    }
    if (fx.lamp && fx.lamp.material) {
      if (fx.lamp.material.emissiveIntensity != null) fx.lamp.material.emissiveIntensity = lampEm;
      if (fx.lamp.material.color) fx.lamp.material.color.setRGB(hdr[0], hdr[1], hdr[2]);
    }
    if (fx.pool) {
      fx.pool.visible = true;
      if (fx.pool.material) fx.pool.material.opacity = 0.62;
    }
    if (fx.core) {
      fx.core.visible = true;
      if (fx.core.material) fx.core.material.opacity = 0.62;
    }
  }
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
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false })
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
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false })
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
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false })
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
  // Off the circular-target marks so both lanes read distinctly.
  const lanes = [80, 140, 190, 280, 370].map((m) => ({ z: rangeZ(m), m }));
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

function clearPaperDecals() {
  for (const mesh of paperDecals) {
    disposeDecalPlug(mesh);
    if (mesh.parent) mesh.parent.remove(mesh);
    if (mesh.material) mesh.material.dispose();
  }
  paperDecals = [];
}

/** Table-button / F reset: new paper + stand silhouettes back up. Score stays. */
function resetRangeTargets() {
  resetSilhouettes();
  resetBermPopups();
  restoreFloodlights();
  restoreBeerBottles();
  clearGlassShards();
  clearBulbSparks();
  clearPaperDecals();
  showToast("Targets reset");
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

function hitSphereSegment(prev, curr, center, radius) {
  const dx = curr.x - prev.x, dy = curr.y - prev.y, dz = curr.z - prev.z;
  const fx = prev.x - center.x, fy = prev.y - center.y, fz = prev.z - center.z;
  const a = dx * dx + dy * dy + dz * dz;
  if (a < 1e-10) return null;
  const b = 2 * (fx * dx + fy * dy + fz * dz);
  const c0 = fx * fx + fy * fy + fz * fz - radius * radius;
  const disc = b * b - 4 * a * c0;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  let t = (-b - s) / (2 * a);
  if (t < 0 || t > 1) t = (-b + s) / (2 * a);
  if (t < 0 || t > 1) return null;
  const hit = new THREE.Vector3(prev.x + dx * t, prev.y + dy * t, prev.z + dz * t);
  const n = hit.clone().sub(center);
  if (n.lengthSq() < 1e-8) n.set(0, 1, 0);
  else n.normalize();
  return { hit, normal: n, u: t };
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
  input.spaceDown = false;
  state.spaceHoldT = 0;
  state.holdBreath = false;
  player.leanTarget = 0;
  state.adsTarget = state.adsPreview ? 1 : 0;
}


/* ---- ADS viewmodel DOF (near gun softens; range stays sharp) ----
 * EffectComposer/BokehPass fight logarithmicDepthBuffer (linear CoC vs log
 * depth) and would smear distant targets / HUD-adjacent 3D. Isolate the
 * viewmodel on VIEWMODEL_LAYER, render it to a half-res RT, cheap disc blur,
 * composite over the world. Hip fire stays a single scene render. HTML HUD
 * is untouched.
 */
function stampViewmodelLayer(root) {
  if (!root) return;
  root.traverse((o) => {
    if (o.userData.barrelHeatShimmer) return;
    o.layers.set(VIEWMODEL_LAYER);
  });
}

function enableViewmodelLighting() {
  [hemiLight, ambLight, keyLight, fillLight, rimLight, moonLight].forEach((L) => {
    if (L) L.layers.enable(VIEWMODEL_LAYER);
  });
}

function adsDofAmount() {
  const ads = state.adsPreview ? 1 : state.adsFactor;
  if (ads < 0.02) return 0;
  let a = ads;
  if (state.holdBreath && state.breathLeft > 0) a *= ADS_DOF_BREATH_MUL;
  if (state.vaulting) {
    const vaultB = 1 - Math.abs(state.vaultT / Math.max(0.12, state.vaultDur) - 0.5) * 2;
    a *= 1 - clamp(vaultB, 0, 1);
  }
  if (state.reloading) {
    const dur = Math.max(0.05, state.reloadDuration || 1.2);
    const u = Math.min(1, state.reloadElapsed / dur);
    a *= 1 - reloadLiftEnvelope(u) * 0.85;
  }
  return a;
}

function initAdsDof() {
  const rt = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    depthBuffer: true,
    stencilBuffer: false,
  });
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace;

  const material = new THREE.ShaderMaterial({
    name: "AdsViewmodelDof",
    uniforms: {
      tDiffuse: { value: rt.texture },
      radius: { value: 0 },
      aspect: { value: 1 },
      taps: { value: ADS_DOF_TAPS_DEFAULT },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse;
      uniform float radius;
      uniform float aspect;
      uniform float taps;
      varying vec2 vUv;

      vec4 fetchPremul(vec2 uv) {
        vec4 t = texture2D(tDiffuse, uv);
        return vec4(t.rgb * t.a, t.a);
      }

      void main() {
        vec2 a = vec2(1.0, aspect);
        vec4 c = fetchPremul(vUv);
        if (radius > 1e-6) {
          int ni = int(clamp(taps, 4.0, 24.0) + 0.5);
          float nf = float(ni);
          float twoPi = 6.283185307179586;
          float count = 1.0;
          for (int i = 0; i < 24; i++) {
            if (i >= ni) break;
            float ang = twoPi * float(i) / nf;
            vec2 d = vec2(cos(ang), sin(ang));
            c += fetchPremul(vUv + d * a * radius);
            float ang2 = ang + twoPi / (nf * 2.0);
            vec2 d2 = vec2(cos(ang2), sin(ang2));
            c += fetchPremul(vUv + d2 * a * radius * 0.5);
            count += 2.0;
          }
          c /= count;
        }
        vec3 rgb = c.a > 1e-4 ? c.rgb / c.a : vec3(0.0);
        gl_FragColor = vec4(rgb, c.a);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const fsScene = new THREE.Scene();
  fsScene.add(quad);
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  adsDof = { rt, material, quad, fsScene, fsCam, _clear: new THREE.Color() };
  resizeAdsDof();
}

function resizeAdsDof() {
  if (!adsDof || !renderer) return;
  const canvas = el("view3d");
  const wrap = canvas && canvas.parentElement;
  const w = (wrap && wrap.clientWidth) || (canvas && canvas.clientWidth) || window.innerWidth;
  const h = (wrap && wrap.clientHeight) || (canvas && canvas.clientHeight) || window.innerHeight;
  const pr = renderer.getPixelRatio();
  const dw = Math.max(1, Math.floor(w * pr * 0.5));
  const dh = Math.max(1, Math.floor(h * pr * 0.5));
  adsDof.rt.setSize(dw, dh);
  adsDof.material.uniforms.aspect.value = dh > 0 ? dw / dh : 1;
}

function restoreCameraLayers() {
  if (!camera) return;
  camera.layers.enable(0);
  camera.layers.enable(VIEWMODEL_LAYER);
}

function renderScene() {
  _perfMeshes = 0;
  const amount = adsDofAmount();
  const bloomOn = bloomWanted();
  const ditherOn = ditherWanted();
  const dest = bloomOn ? hdrBloom.sceneRT : (ditherOn ? outputDither.rt : null);
  const prevTM = renderer.toneMapping;
  if (bloomOn) renderer.toneMapping = THREE.NoToneMapping;

  if (!adsDof || amount < 0.02) {
    restoreCameraLayers();
    renderer.setRenderTarget(dest);
    renderer.render(scene, camera);
    snapshotPerfMeshes();
  } else {
    const prevAutoClear = renderer.autoClear;
    const prevShadowAuto = renderer.shadowMap.autoUpdate;
    const prevBg = scene.background;
    renderer.getClearColor(adsDof._clear);
    const prevClearAlpha = renderer.getClearAlpha();

    camera.layers.set(0);
    renderer.autoClear = true;
    renderer.setRenderTarget(dest);
    renderer.render(scene, camera);
    snapshotPerfMeshes();

    camera.layers.set(VIEWMODEL_LAYER);
    scene.background = null;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(adsDof.rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    scene.background = prevBg;
    renderer.setClearColor(adsDof._clear, prevClearAlpha);
    renderer.shadowMap.autoUpdate = prevShadowAuto;

    adsDof.material.uniforms.tDiffuse.value = adsDof.rt.texture;
    adsDof.material.uniforms.radius.value = (state.adsDofRadius ?? ADS_DOF_RADIUS) * amount;
    adsDof.material.uniforms.taps.value = state.adsDofTaps ?? ADS_DOF_TAPS_DEFAULT;

    renderer.autoClear = false;
    renderer.setRenderTarget(dest);
    renderer.render(adsDof.fsScene, adsDof.fsCam);
    renderer.autoClear = prevAutoClear;
    restoreCameraLayers();
  }

  renderHeatHaze(dest);

  const out = ditherOn ? outputDither.rt : null;
  if (bloomOn) {
    renderer.toneMapping = prevTM;
    renderBloom(out);
  } else {
    renderer.setRenderTarget(out);
    renderer.toneMapping = prevTM;
  }
  renderGodRays(out);
  if (ditherOn) renderOutputDither();
}

/* ---- Volumetric sun shafts (god rays) ----
 * EffectComposer radial blurs fight logarithmicDepthBuffer and smear a
 * 2D wash. After the world (and ADS) render, ray-march view rays through
 * a participating medium and occlude with the existing sun ortho shadow
 * map (2048²). Beer-Lambert + Henyey-Greenstein. Half-res + dither /
 * temporal blend. Night: no sun shafts; optional faint nearest-flood cone.
 */
function makeHalfResTarget(withDepth) {
  const rt = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    depthBuffer: !!withDepth,
    stencilBuffer: false,
  });
  rt.texture.colorSpace = THREE.NoColorSpace;
  return rt;
}

function initGodRays() {
  const depthRT = makeHalfResTarget(true);
  const volumeRT = makeHalfResTarget(false);
  const historyRT = makeHalfResTarget(false);

  const depthMat = new THREE.ShaderMaterial({
    name: "GodRayViewZ",
    uniforms: {
      cameraFar: { value: 520 },
    },
    vertexShader: /* glsl */`
      varying float vViewZ;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewZ = -mv.z;
        gl_Position = projectionMatrix * mv;
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: /* glsl */`
      uniform float cameraFar;
      varying float vViewZ;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main() {
        #include <logdepthbuf_fragment>
        float z = clamp(vViewZ / max(cameraFar, 1.0), 0.0, 1.0);
        gl_FragColor = vec4(z, 0.0, 0.0, 1.0);
      }
    `,
    fog: false,
    toneMapped: false,
    lights: false,
  });

  const volumeMat = new THREE.ShaderMaterial({
    name: "GodRayVolume",
    defines: { STEPS: GOD_RAYS_STEPS },
    uniforms: {
      tDepth: { value: null },
      tShadow: { value: null },
      tHistory: { value: null },
      shadowMatrix: { value: new THREE.Matrix4() },
      projInverse: { value: new THREE.Matrix4() },
      viewInverse: { value: new THREE.Matrix4() },
      cameraPos: { value: new THREE.Vector3() },
      cameraFar: { value: 520 },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunColor: { value: new THREE.Vector3(1, 0.92, 0.78) },
      sunAmt: { value: 0 },
      intensity: { value: GOD_RAYS_DEFAULT },
      volumeMax: { value: 80 },
      shadowBias: { value: 0.0024 },
      frame: { value: 0 },
      historyBlend: { value: 0 },
      dustTime: { value: 0 },
      floodPos: { value: new THREE.Vector3() },
      floodDir: { value: new THREE.Vector3(0, -1, 0) },
      floodColor: { value: new THREE.Vector3(1.0, 0.86, 0.62) },
      floodRange: { value: 40 },
      floodCos: { value: 0.7 },
      floodAmt: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      #include <packing>
      uniform sampler2D tDepth;
      uniform sampler2D tShadow;
      uniform sampler2D tHistory;
      uniform mat4 shadowMatrix;
      uniform mat4 projInverse;
      uniform mat4 viewInverse;
      uniform vec3 cameraPos;
      uniform float cameraFar;
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      uniform float sunAmt;
      uniform float intensity;
      uniform float volumeMax;
      uniform float shadowBias;
      uniform float frame;
      uniform float historyBlend;
      uniform float dustTime;
      uniform vec3 floodPos;
      uniform vec3 floodDir;
      uniform vec3 floodColor;
      uniform float floodRange;
      uniform float floodCos;
      uniform float floodAmt;
      varying vec2 vUv;

      const float PI = 3.14159265359;

      float ign(vec2 p) {
        return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
      }

      float hash13(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.zyx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      float hgPhase(float mu, float g) {
        float g2 = g * g;
        float denom = max(1e-4, 1.0 + g2 - 2.0 * g * mu);
        return (1.0 - g2) / (4.0 * PI * pow(denom, 1.5));
      }

      float dustDensity(vec3 p) {
        float n = hash13(floor(p * 0.62 + dustTime));
        float n2 = hash13(floor(p * 1.85 + 19.0 - dustTime * 0.4));
        // Subtle motes, not a noise storm.
        return 0.78 + 0.28 * n + 0.10 * n2;
      }

      float sampleSunShadow(vec3 worldPos) {
        vec4 sc = shadowMatrix * vec4(worldPos, 1.0);
        if (abs(sc.w) < 1e-6) return 0.0;
        sc.xyz /= sc.w;
        if (sc.x < 0.002 || sc.x > 0.998 || sc.y < 0.002 || sc.y > 0.998 || sc.z < 0.0 || sc.z > 1.0) {
          return 0.0;
        }
        vec2 jitter = (vec2(hash13(worldPos), hash13(worldPos.yzx)) - 0.5) * 0.0012;
        float closest = unpackRGBAToDepth(texture2D(tShadow, sc.xy + jitter));
        return step(sc.z - shadowBias, closest);
      }

      float sampleFlood(vec3 p) {
        if (floodAmt < 1e-4) return 0.0;
        vec3 toL = floodPos - p;
        float dist = length(toL);
        if (dist < 0.12 || dist > floodRange) return 0.0;
        vec3 ldir = toL / dist;
        float cone = dot(-ldir, floodDir);
        float inner = mix(floodCos, 1.0, 0.38);
        float spot = smoothstep(floodCos, inner, cone);
        float att = pow(clamp(1.0 - dist / floodRange, 0.0, 1.0), 1.65);
        return spot * att;
      }

      void main() {
        vec4 clip = vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
        vec4 viewH = projInverse * clip;
        vec3 viewDir = normalize(viewH.xyz / max(viewH.w, 1e-6));
        vec3 worldDir = normalize((viewInverse * vec4(viewDir, 0.0)).xyz);

        float sceneZ = texture2D(tDepth, vUv).r * cameraFar;
        float rayLen = sceneZ / max(1e-4, abs(viewDir.z));
        float marchLen = min(rayLen, volumeMax);
        if (marchLen < 0.35 || intensity < 1e-4) {
          vec3 hist0 = texture2D(tHistory, vUv).rgb;
          gl_FragColor = vec4(mix(vec3(0.0), hist0, historyBlend * 0.5), 1.0);
          return;
        }

        float dither = ign(gl_FragCoord.xy);
        dither = fract(dither + frame * 0.61803398875);

        float dt = marchLen / float(STEPS);
        float T = 1.0;
        vec3 acc = vec3(0.0);
        float gSun = 0.94;
        float gFlood = 0.72;
        float sigmaT = 0.040;
        float sigmaS = 0.058;

        float muSun = clamp(dot(worldDir, sunDir), -1.0, 1.0);
        float phaseSun = hgPhase(muSun, gSun);
        // Shafts, not a glow ball: kill side-scatter when looking off the sun.
        float viewGate = smoothstep(0.14, 0.64, muSun);
        phaseSun *= viewGate;
        // Low sun: longer air mass, stronger shafts. Noon is milder, not off.
        float elev = clamp(sunDir.y, 0.0, 1.0);
        float lowSun = pow(1.0 - elev / 0.86, 1.18);
        float todPunch = mix(0.52, 1.12, lowSun);

        for (int i = 0; i < STEPS; i++) {
          float t = (float(i) + dither) * dt;
          if (t >= marchLen - 0.08) break;
          vec3 p = cameraPos + worldDir * t;
          float dens = dustDensity(p);
          // Slightly richer near the floor so the lane reads; keep sky shafts alive.
          float h = p.y + 1.4;
          dens *= 0.72 + 0.40 * exp(-max(0.0, h) * 0.11);

          float stepT = exp(-sigmaT * dens * dt);
          T *= stepT;

          if (sunAmt > 1e-4) {
            float lit = sampleSunShadow(p);
            acc += T * lit * sunColor * sunAmt * todPunch * sigmaS * dens * phaseSun * dt;
          }
          if (floodAmt > 1e-4) {
            float f = sampleFlood(p);
            vec3 toL = floodPos - p;
            float muF = dot(worldDir, normalize(toL + vec3(0.0, 1e-5, 0.0)));
            float phaseF = hgPhase(clamp(muF, -1.0, 1.0), gFlood);
            acc += T * f * floodColor * floodAmt * sigmaS * dens * phaseF * dt * 0.55;
          }
        }

        // Linear-ish intensity: brighter / longer streaks, not a wider sphere.
        acc *= intensity * 1.28;
        acc = acc / (1.0 + acc * 0.38);

        vec3 hist = texture2D(tHistory, vUv).rgb;
        vec3 mixed = mix(acc, hist, historyBlend);
        gl_FragColor = vec4(mixed, 1.0);
      }
    `,
    fog: false,
    toneMapped: false,
    depthTest: false,
    depthWrite: false,
  });

  const compositeMat = new THREE.ShaderMaterial({
    name: "GodRayComposite",
    uniforms: {
      tVolume: { value: null },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D tVolume;
      varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tVolume, vUv).rgb;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    fog: false,
    blending: THREE.AdditiveBlending,
  });

  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const volQuad = new THREE.Mesh(quadGeo, volumeMat);
  volQuad.frustumCulled = false;
  const volScene = new THREE.Scene();
  volScene.add(volQuad);

  const compQuad = new THREE.Mesh(quadGeo.clone(), compositeMat);
  compQuad.frustumCulled = false;
  const fsScene = new THREE.Scene();
  fsScene.add(compQuad);
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  godRays = {
    depthRT,
    volumeRT,
    historyRT,
    depthMat,
    volumeMat,
    compositeMat,
    volScene,
    fsScene,
    fsCam,
    _clear: new THREE.Color(),
    _hidden: [],
    _camPos: new THREE.Vector3(),
    _prevCamPos: new THREE.Vector3(),
    _camQ: new THREE.Quaternion(),
    _prevCamQ: new THREE.Quaternion(),
    _floodPos: new THREE.Vector3(),
    _floodTgt: new THREE.Vector3(),
    _floodDir: new THREE.Vector3(),
    frame: 0,
    historyValid: false,
  };
  resizeGodRays();
}

function resizeGodRays() {
  if (!godRays || !renderer) return;
  const canvas = el("view3d");
  const wrap = canvas && canvas.parentElement;
  const w = (wrap && wrap.clientWidth) || (canvas && canvas.clientWidth) || window.innerWidth;
  const h = (wrap && wrap.clientHeight) || (canvas && canvas.clientHeight) || window.innerHeight;
  const pr = renderer.getPixelRatio();
  const dw = Math.max(1, Math.floor(w * pr * 0.5));
  const dh = Math.max(1, Math.floor(h * pr * 0.5));
  godRays.depthRT.setSize(dw, dh);
  godRays.volumeRT.setSize(dw, dh);
  godRays.historyRT.setSize(dw, dh);
  godRays.historyValid = false;
}

function hideGodRayDepthSkip(list) {
  list.length = 0;
  if (!scene) return;
  scene.traverse((o) => {
    if (!o.visible) return;
    if (o.isLine || o.isPoints || o.isSprite) {
      o.visible = false;
      list.push(o);
      return;
    }
    if (!o.isMesh) return;
    const m = o.material;
    if (!m) return;
    const mat0 = Array.isArray(m) ? m[0] : m;
    if (!mat0) return;
    if (mat0.transparent === true || mat0.depthWrite === false || (mat0.opacity != null && mat0.opacity < 0.99)) {
      o.visible = false;
      list.push(o);
    }
  });
}

function restoreGodRayDepthSkip(list) {
  for (let i = 0; i < list.length; i++) list[i].visible = true;
  list.length = 0;
}

function pickNightFlood() {
  if (!godRays || !camera || !floodFixtures.length) return null;
  camera.getWorldPosition(godRays._camPos);
  const fwdX = -camera.matrixWorld.elements[8];
  const fwdY = -camera.matrixWorld.elements[9];
  const fwdZ = -camera.matrixWorld.elements[10];
  let bestFx = null;
  let bestScore = 0;
  let bestLook = 0;
  let bx = 0, by = 0, bz = 0;
  for (let i = 0; i < floodFixtures.length; i++) {
    const fx = floodFixtures[i];
    if (!fx || fx.shotOut || !fx.light || !fx.light.isSpotLight) continue;
    fx.light.getWorldPosition(godRays._floodPos);
    const dx = godRays._floodPos.x - godRays._camPos.x;
    const dy = godRays._floodPos.y - godRays._camPos.y;
    const dz = godRays._floodPos.z - godRays._camPos.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > 58 || dist < 0.4) continue;
    const inv = 1 / dist;
    const look = fwdX * dx * inv + fwdY * dy * inv + fwdZ * dz * inv;
    if (look < 0.18) continue;
    const score = look * (1 / (1 + dist * 0.018));
    if (score > bestScore) {
      bestScore = score;
      bestFx = fx;
      bestLook = look;
      bx = godRays._floodPos.x;
      by = godRays._floodPos.y;
      bz = godRays._floodPos.z;
    }
  }
  if (!bestFx) return null;
  godRays._floodPos.set(bx, by, bz);
  bestFx.light.target.getWorldPosition(godRays._floodTgt);
  godRays._floodDir.subVectors(godRays._floodTgt, godRays._floodPos);
  if (godRays._floodDir.lengthSq() < 1e-8) godRays._floodDir.set(0, -1, 0);
  else godRays._floodDir.normalize();
  return {
    pos: godRays._floodPos,
    dir: godRays._floodDir,
    range: bestFx.light.distance || 45,
    angle: bestFx.light.angle || 0.5,
    look: bestLook,
  };
}

function godRaysWanted() {
  const amt = state.godRays ?? 0;
  if (amt < 0.01) return false;
  const pal = sampleTod(state.timeOfDay);
  const sunOn = !!(keyLight && keyLight.castShadow && pal.sunI > 0.05);
  if (sunOn) return true;
  // Night: only if a flood is in view — skip the pass entirely otherwise.
  return !!pickNightFlood();
}

function renderGodRays(dest = null) {
  if (!godRays || !renderer || !scene || !camera) return;
  if (!godRaysWanted()) return;

  const pal = sampleTod(state.timeOfDay);
  const sunOn = !!(keyLight && keyLight.castShadow && keyLight.shadow && keyLight.shadow.map && pal.sunI > 0.05);
  const flood = sunOn ? null : pickNightFlood();
  if (!sunOn && !flood) return;

  const prevAutoClear = renderer.autoClear;
  const prevShadowAuto = renderer.shadowMap.autoUpdate;
  const prevOverride = scene.overrideMaterial;
  const prevBg = scene.background;
  renderer.getClearColor(godRays._clear);
  const prevClearAlpha = renderer.getClearAlpha();
  renderer.shadowMap.autoUpdate = false;

  restoreCameraLayers();
  hideGodRayDepthSkip(godRays._hidden);

  godRays.depthMat.uniforms.cameraFar.value = camera.far;
  scene.overrideMaterial = godRays.depthMat;
  scene.background = null;
  renderer.autoClear = true;
  renderer.setRenderTarget(godRays.depthRT);
  renderer.setClearColor(0xffffff, 1);
  renderer.clear();
  renderer.render(scene, camera);
  scene.overrideMaterial = prevOverride;
  restoreGodRayDepthSkip(godRays._hidden);
  scene.background = prevBg;

  camera.getWorldPosition(godRays._camPos);
  camera.getWorldQuaternion(godRays._camQ);
  const jump = godRays.historyValid ? godRays._prevCamPos.distanceTo(godRays._camPos) : 99;
  const ang = godRays.historyValid ? godRays._prevCamQ.angleTo(godRays._camQ) : 99;
  const hist = (jump > 1.15 || ang > 0.16) ? 0.05 : 0.32;
  godRays._prevCamPos.copy(godRays._camPos);
  godRays._prevCamQ.copy(godRays._camQ);
  godRays.frame = (godRays.frame + 1) % 4096;

  const u = godRays.volumeMat.uniforms;
  u.tDepth.value = godRays.depthRT.texture;
  u.tHistory.value = godRays.historyRT.texture;
  u.projInverse.value.copy(camera.projectionMatrixInverse);
  u.viewInverse.value.copy(camera.matrixWorld);
  u.cameraPos.value.copy(godRays._camPos);
  u.cameraFar.value = camera.far;
  u.intensity.value = state.godRays;
  u.volumeMax.value = 34 + (state.godRays ?? 0) * 62;
  u.frame.value = godRays.frame;
  u.historyBlend.value = godRays.historyValid ? hist : 0;
  u.dustTime.value = (performance.now() * 0.00015) % 256;

  if (sunOn) {
    const dir = (keyLight.userData && keyLight.userData.sunDir) || _keySunDir;
    u.sunDir.value.copy(dir).normalize();
    u.sunColor.value.set(keyLight.color.r, keyLight.color.g, keyLight.color.b);
    const keyMul = state.lightKeyMul ?? 1;
    u.sunAmt.value = Math.max(0, pal.sunI * keyMul);
    u.tShadow.value = keyLight.shadow.map.texture;
    u.shadowMatrix.value.copy(keyLight.shadow.matrix);
    u.shadowBias.value = 0.0024;
    u.floodAmt.value = 0;
  } else {
    u.sunAmt.value = 0;
    u.tShadow.value = godRays.depthRT.texture;
    u.floodAmt.value = (state.godRays * 0.55) * Math.min(1, 0.35 + flood.look);
    u.floodPos.value.copy(flood.pos);
    u.floodDir.value.copy(flood.dir);
    u.floodRange.value = flood.range;
    u.floodCos.value = Math.cos(flood.angle);
  }

  renderer.setRenderTarget(godRays.volumeRT);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.render(godRays.volScene, godRays.fsCam);

  const tmp = godRays.volumeRT;
  godRays.volumeRT = godRays.historyRT;
  godRays.historyRT = tmp;
  godRays.historyValid = true;

  godRays.compositeMat.uniforms.tVolume.value = godRays.historyRT.texture;
  renderer.setRenderTarget(dest);
  renderer.autoClear = false;
  renderer.setClearColor(godRays._clear, prevClearAlpha);
  renderer.render(godRays.fsScene, godRays.fsCam);

  renderer.autoClear = prevAutoClear;
  renderer.shadowMap.autoUpdate = prevShadowAuto;
  restoreCameraLayers();
}

/* ---- HDR bloom (3-mip dual-filter, irregular taps) ----
 * UnrealBloomPass fights logarithmicDepthBuffer / ACES and milks LDR.
 * Capture the scene (and ADS composite) to a HalfFloat RT with tone
 * mapping off, bright-pass at threshold ~1.28 (sky disc/halo stay out),
 * full-res prefilter so thin barrels/muzzle/sun-core do not box-filter,
 * then a 3-mip pyramid whose taps rotate / offset / weight-jitter per
 * mip so the halo is round, not a stamped diamond. God rays still
 * composite after. Slider 0 skips the capture so the direct ACES path
 * stays untouched. Barrel-heat emissive is left alone — only the halo.
 */
function makeBloomTarget(withDepth) {
  const rt = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    depthBuffer: !!withDepth,
    stencilBuffer: false,
  });
  if (withDepth) {
    rt.depthTexture = new THREE.DepthTexture(1, 1);
    rt.depthTexture.format = THREE.DepthFormat;
    rt.depthTexture.type = THREE.UnsignedIntType;
  }
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
  return rt;
}

function bloomWanted() {
  return !!(hdrBloom && (state.bloom ?? 0) >= 0.01);
}

function setBloomTaps(mat, mip, kind) {
  const gold = 2.399963229728653;
  mat.uniforms.rot.value = mip * 0.463647609 + (kind ? 0.29 : 0.16);
  mat.uniforms.shunt.value = Math.sin(mip * gold + kind * 1.11) * 0.26;
}

function initHdrBloom() {
  const sceneRT = makeBloomTarget(true);
  const prefilterRT = makeBloomTarget(false);
  const down = [];
  const up = [];
  for (let i = 0; i < BLOOM_MIPS; i++) down.push(makeBloomTarget(false));
  for (let i = 0; i < BLOOM_MIPS - 1; i++) up.push(makeBloomTarget(false));

  const vs = /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  const prefilterMat = new THREE.ShaderMaterial({
    name: "BloomPrefilter",
    uniforms: {
      tInput: { value: null },
      threshold: { value: BLOOM_THRESHOLD },
      knee: { value: BLOOM_KNEE },
    },
    vertexShader: vs,
    fragmentShader: /* glsl */`
      uniform sampler2D tInput;
      uniform float threshold;
      uniform float knee;
      varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tInput, vUv).rgb;
        float br = max(c.r, max(c.g, c.b));
        float k = max(threshold * knee, 1e-4);
        float soft = clamp(br - threshold + k, 0.0, 2.0 * k);
        soft = (soft * soft) / (4.0 * k + 1e-4);
        float contrib = max(br - threshold, soft) / max(br, 1e-4);
        c *= contrib;
        c = min(c, vec3(12.0));
        gl_FragColor = vec4(c, 1.0);
      }
    `,
    fog: false,
    toneMapped: false,
    depthTest: false,
    depthWrite: false,
  });

  const downMat = new THREE.ShaderMaterial({
    name: "BloomDownsample",
    uniforms: {
      tInput: { value: null },
      texel: { value: new THREE.Vector2(1, 1) },
      rot: { value: 0 },
      shunt: { value: 0 },
    },
    vertexShader: vs,
    fragmentShader: /* glsl */`
      uniform sampler2D tInput;
      uniform vec2 texel;
      uniform float rot;
      uniform float shunt;
      varying vec2 vUv;
      void main() {
        vec3 acc = texture2D(tInput, vUv).rgb * 0.26;
        float wSum = 0.26;
        for (int i = 0; i < 8; i++) {
          float fi = float(i);
          float a = rot + fi * 0.78539816339 + shunt * 0.33;
          float radJ = 1.0 + 0.17 * sin(fi * 2.17 + rot * 3.1);
          vec2 d = vec2(cos(a), sin(a)) * texel * (1.12 * radJ);
          float w = 0.058 * (1.0 + 0.12 * cos(fi * 1.63 + shunt * 2.0));
          acc += texture2D(tInput, vUv + d).rgb * w;
          wSum += w;
        }
        for (int i = 0; i < 8; i++) {
          float fi = float(i);
          float a = rot + 0.41 + fi * 0.78539816339 + shunt * 0.18;
          float radJ = 1.0 + 0.14 * cos(fi * 1.81 + rot * 2.4);
          vec2 d = vec2(cos(a), sin(a)) * texel * (2.08 * radJ);
          float w = 0.026 * (1.0 + 0.15 * sin(fi * 2.05 + shunt));
          acc += texture2D(tInput, vUv + d).rgb * w;
          wSum += w;
        }
        gl_FragColor = vec4(acc / max(wSum, 1e-4), 1.0);
      }
    `,
    fog: false,
    toneMapped: false,
    depthTest: false,
    depthWrite: false,
  });

  const upMat = new THREE.ShaderMaterial({
    name: "BloomUpsample",
    uniforms: {
      tLow: { value: null },
      tHigh: { value: null },
      texel: { value: new THREE.Vector2(1, 1) },
      combine: { value: 1 },
      rot: { value: 0 },
      shunt: { value: 0 },
    },
    vertexShader: vs,
    fragmentShader: /* glsl */`
      uniform sampler2D tLow;
      uniform sampler2D tHigh;
      uniform vec2 texel;
      uniform float combine;
      uniform float rot;
      uniform float shunt;
      varying vec2 vUv;
      void main() {
        vec3 acc = texture2D(tLow, vUv).rgb * 0.30;
        float wSum = 0.30;
        for (int i = 0; i < 8; i++) {
          float fi = float(i);
          float a = rot + 0.22 + fi * 0.78539816339 + shunt * 0.27;
          float radJ = 1.0 + 0.15 * sin(fi * 1.94 + rot * 2.7);
          vec2 d = vec2(cos(a), sin(a)) * texel * (0.95 * radJ);
          float w = 0.055 * (1.0 + 0.10 * cos(fi * 1.41 + shunt * 1.7));
          acc += texture2D(tLow, vUv + d).rgb * w;
          wSum += w;
        }
        for (int i = 0; i < 8; i++) {
          float fi = float(i);
          float a = rot + 0.63 + fi * 0.78539816339 - shunt * 0.21;
          float radJ = 1.0 + 0.12 * cos(fi * 2.33 + rot * 1.9);
          vec2 d = vec2(cos(a), sin(a)) * texel * (1.85 * radJ);
          float w = 0.024 * (1.0 + 0.13 * sin(fi * 1.77 + shunt * 2.2));
          acc += texture2D(tLow, vUv + d).rgb * w;
          wSum += w;
        }
        acc /= max(wSum, 1e-4);
        if (combine > 0.5) acc += texture2D(tHigh, vUv).rgb;
        gl_FragColor = vec4(acc, 1.0);
      }
    `,
    fog: false,
    toneMapped: false,
    depthTest: false,
    depthWrite: false,
  });

  const compositeMat = new THREE.ShaderMaterial({
    name: "BloomComposite",
    uniforms: {
      tScene: { value: null },
      tBloom: { value: null },
      intensity: { value: BLOOM_DEFAULT },
    },
    vertexShader: vs,
    fragmentShader: /* glsl */`
      uniform sampler2D tScene;
      uniform sampler2D tBloom;
      uniform float intensity;
      varying vec2 vUv;
      void main() {
        vec3 scene = texture2D(tScene, vUv).rgb;
        vec3 bloom = texture2D(tBloom, vUv).rgb;
        gl_FragColor = vec4(scene + bloom * intensity, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    fog: false,
    toneMapped: true,
    depthTest: false,
    depthWrite: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), prefilterMat);
  quad.frustumCulled = false;
  const fsScene = new THREE.Scene();
  fsScene.add(quad);
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  hdrBloom = {
    sceneRT,
    prefilterRT,
    down,
    up,
    prefilterMat,
    downMat,
    upMat,
    compositeMat,
    quad,
    fsScene,
    fsCam,
    _clear: new THREE.Color(),
  };
  resizeHdrBloom();
}

function resizeHdrBloom() {
  if (!hdrBloom || !renderer) return;
  const canvas = el("view3d");
  const wrap = canvas && canvas.parentElement;
  const w = (wrap && wrap.clientWidth) || (canvas && canvas.clientWidth) || window.innerWidth;
  const h = (wrap && wrap.clientHeight) || (canvas && canvas.clientHeight) || window.innerHeight;
  const pr = renderer.getPixelRatio();
  const fw = Math.max(1, Math.floor(w * pr));
  const fh = Math.max(1, Math.floor(h * pr));
  hdrBloom.sceneRT.setSize(fw, fh);
  hdrBloom.prefilterRT.setSize(fw, fh);
  let mw = Math.max(1, Math.floor(fw * 0.5));
  let mh = Math.max(1, Math.floor(fh * 0.5));
  for (let i = 0; i < BLOOM_MIPS; i++) {
    hdrBloom.down[i].setSize(mw, mh);
    if (i < hdrBloom.up.length) hdrBloom.up[i].setSize(mw, mh);
    mw = Math.max(1, Math.floor(mw * 0.5));
    mh = Math.max(1, Math.floor(mh * 0.5));
  }
}

function blitBloom(mat, target) {
  hdrBloom.quad.material = mat;
  renderer.setRenderTarget(target);
  renderer.render(hdrBloom.fsScene, hdrBloom.fsCam);
}

function renderBloom(dest = null) {
  if (!hdrBloom || !renderer) return;
  const prevAutoClear = renderer.autoClear;
  renderer.getClearColor(hdrBloom._clear);
  const prevClearAlpha = renderer.getClearAlpha();
  renderer.autoClear = true;
  renderer.setClearColor(0x000000, 1);

  const sceneTex = hdrBloom.sceneRT.texture;
  hdrBloom.prefilterMat.uniforms.tInput.value = sceneTex;
  hdrBloom.prefilterMat.uniforms.threshold.value = BLOOM_THRESHOLD;
  hdrBloom.prefilterMat.uniforms.knee.value = BLOOM_KNEE;
  blitBloom(hdrBloom.prefilterMat, hdrBloom.prefilterRT);

  setBloomTaps(hdrBloom.downMat, 0, 0);
  hdrBloom.downMat.uniforms.tInput.value = hdrBloom.prefilterRT.texture;
  hdrBloom.downMat.uniforms.texel.value.set(
    1 / Math.max(1, hdrBloom.prefilterRT.width),
    1 / Math.max(1, hdrBloom.prefilterRT.height)
  );
  blitBloom(hdrBloom.downMat, hdrBloom.down[0]);

  for (let i = 0; i < BLOOM_MIPS - 1; i++) {
    const src = hdrBloom.down[i];
    setBloomTaps(hdrBloom.downMat, i + 1, 0);
    hdrBloom.downMat.uniforms.tInput.value = src.texture;
    hdrBloom.downMat.uniforms.texel.value.set(1 / Math.max(1, src.width), 1 / Math.max(1, src.height));
    blitBloom(hdrBloom.downMat, hdrBloom.down[i + 1]);
  }

  let low = hdrBloom.down[BLOOM_MIPS - 1];
  for (let i = BLOOM_MIPS - 2; i >= 0; i--) {
    const dest = hdrBloom.up[i];
    const high = hdrBloom.down[i];
    setBloomTaps(hdrBloom.upMat, i, 1);
    hdrBloom.upMat.uniforms.tLow.value = low.texture;
    hdrBloom.upMat.uniforms.tHigh.value = high.texture;
    hdrBloom.upMat.uniforms.texel.value.set(1 / Math.max(1, low.width), 1 / Math.max(1, low.height));
    hdrBloom.upMat.uniforms.combine.value = 1;
    blitBloom(hdrBloom.upMat, dest);
    low = dest;
  }

  hdrBloom.compositeMat.uniforms.tScene.value = sceneTex;
  hdrBloom.compositeMat.uniforms.tBloom.value = low.texture;
  hdrBloom.compositeMat.uniforms.intensity.value = state.bloom;
  renderer.setClearColor(hdrBloom._clear, prevClearAlpha);
  blitBloom(hdrBloom.compositeMat, dest);

  renderer.autoClear = prevAutoClear;
}

/* ---- Final-output luma dither ----
 * After ACES (and bloom / shafts), capture in HalfFloat so the noise
 * floor hits before 8-bit quantization. Default is cheap hash + TPDF
 * on luma (not a pixel-grid IGN). Night: a hair more dither + a tiny
 * toe on residual scene luma; true-black sky stays black.
 */
function ditherWanted() {
  return !!(outputDither && ditherAmount() >= 1e-4);
}

function ditherNightAmt() {
  const pal = sampleTod(state.timeOfDay);
  const path = sunPath(state.timeOfDay);
  const fromElev = clamp((6 - path.elevDeg) / 10, 0, 1);
  const fromClock = clamp((0.12 - (pal.sunI || 0)) / 0.12, 0, 1);
  return Math.max(fromElev, fromClock);
}

function initOutputDither() {
  const rt = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    depthBuffer: true,
    stencilBuffer: false,
  });
  rt.depthTexture = new THREE.DepthTexture(1, 1);
  rt.depthTexture.format = THREE.DepthFormat;
  rt.depthTexture.type = THREE.UnsignedIntType;
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace;

  const material = new THREE.ShaderMaterial({
    name: "OutputDither",
    uniforms: {
      tInput: { value: null },
      amount: { value: DITHER_DEFAULT },
      nightAmt: { value: 0 },
      frame: { value: 0 },
      scale: { value: DITHER_SCALE_DEFAULT },
      offset: { value: new THREE.Vector2(0, 0) },
      typeId: { value: 0 },
      animate: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D tInput;
      uniform float amount;
      uniform float nightAmt;
      uniform float frame;
      uniform float scale;
      uniform vec2 offset;
      uniform float typeId;
      uniform float animate;
      varying vec2 vUv;

      float ign(vec2 p) {
        return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
      }

      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      float bayer8(vec2 p) {
        float x = mod(floor(p.x), 8.0);
        float y = mod(floor(p.y), 8.0);
        float v = 0.0;
        v += mod(x, 2.0) * 32.0;
        v += mod(y, 2.0) * 16.0;
        v += mod(floor(x * 0.5), 2.0) * 8.0;
        v += mod(floor(y * 0.5), 2.0) * 4.0;
        v += mod(floor(x * 0.25), 2.0) * 2.0;
        v += mod(floor(y * 0.25), 2.0) * 1.0;
        return (v + 0.5) / 64.0;
      }

      float ditherNoise(vec2 p) {
        float u1;
        float u2;
        if (typeId > 1.5) {
          if (animate > 0.5) p += vec2(frame, frame * 0.37);
          return bayer8(p) * 2.0 - 1.0;
        }
        if (typeId < 0.5) {
          u1 = hash12(p);
          u2 = hash12(p + vec2(17.13, 91.7));
        } else {
          u1 = ign(p);
          u2 = ign(p + vec2(19.19, 47.47));
        }
        if (animate > 0.5) {
          u1 = fract(u1 + frame * 0.61803398875);
          u2 = fract(u2 + frame * 0.38196601125);
        }
        return u1 + u2 - 1.0;
      }

      void main() {
        vec3 c = texture2D(tInput, vUv).rgb;
        float luma = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.0);

        // Toe only on pixels that already have some scene light — sky at 0 stays 0.
        float gate = smoothstep(0.003, 0.040, luma);
        float toe = nightAmt * 0.016 * luma / (luma + 0.05);
        toe *= (1.0 - smoothstep(0.10, 0.38, luma));
        c += vec3(toe * gate);

        vec2 p = gl_FragCoord.xy * max(scale, 0.001) + offset;
        float tri = ditherNoise(p);

        // Hair lift at night — 0.001 must not read like the old 0.025 IGN.
        float amp = amount * (1.0 + nightAmt * 0.20);
        amp *= 1.0 - 0.30 * smoothstep(0.45, 0.95, luma);
        // Monochrome residual: same add on RGB, no color sparkle.
        c += vec3(tri * amp);

        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }
    `,
    fog: false,
    toneMapped: false,
    depthTest: false,
    depthWrite: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const fsScene = new THREE.Scene();
  fsScene.add(quad);
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  outputDither = { rt, material, quad, fsScene, fsCam, frame: 0 };
  resizeOutputDither();
}

function resizeOutputDither() {
  if (!outputDither || !renderer) return;
  const canvas = el("view3d");
  const wrap = canvas && canvas.parentElement;
  const w = (wrap && wrap.clientWidth) || (canvas && canvas.clientWidth) || window.innerWidth;
  const h = (wrap && wrap.clientHeight) || (canvas && canvas.clientHeight) || window.innerHeight;
  const pr = renderer.getPixelRatio();
  const fw = Math.max(1, Math.floor(w * pr));
  const fh = Math.max(1, Math.floor(h * pr));
  outputDither.rt.setSize(fw, fh);
}

function renderOutputDither() {
  if (!outputDither || !renderer) return;
  const amt = ditherAmount();
  if (amt < 1e-4) return;
  const u = outputDither.material.uniforms;
  u.tInput.value = outputDither.rt.texture;
  u.amount.value = amt;
  u.nightAmt.value = ditherNightAmt();
  u.scale.value = clamp(state.ditherScale ?? DITHER_SCALE_DEFAULT, DITHER_SCALE_MIN, DITHER_SCALE_MAX);
  u.offset.value.set(
    clamp(state.ditherOffX ?? 0, DITHER_OFF_MIN, DITHER_OFF_MAX),
    clamp(state.ditherOffY ?? 0, DITHER_OFF_MIN, DITHER_OFF_MAX)
  );
  u.typeId.value = ditherTypeId();
  const anim = !!state.ditherAnimate;
  u.animate.value = anim ? 1 : 0;
  if (anim) outputDither.frame = (outputDither.frame + 1) % 4096;
  u.frame.value = anim ? outputDither.frame : 0;
  const prevAutoClear = renderer.autoClear;
  renderer.autoClear = true;
  renderer.setRenderTarget(null);
  renderer.render(outputDither.fsScene, outputDither.fsCam);
  renderer.autoClear = prevAutoClear;
}

function initThree() {
  const canvas = el("view3d");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(SCENE_BG_BASE, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.debug.checkShaderErrors = true;
  renderer.debug.onShaderError = (gl, program, glVertexShader, glFragmentShader) => {
    const vsSrc = gl.getShaderSource(glVertexShader) || "";
    const fsSrc = gl.getShaderSource(glFragmentShader) || "";
    const vsLog = gl.getShaderInfoLog(glVertexShader) || "";
    const fsLog = gl.getShaderInfoLog(glFragmentShader) || "";
    const pLog = gl.getProgramInfoLog(program) || "";
    console.error("[shader]", pLog, vsLog, fsLog);
    if (
      vsSrc.includes("vConWP") ||
      fsSrc.includes("applyRangeConcreteAlbedo") ||
      fsSrc.includes("uConScale")
    ) {
      fallbackConcreteMaterials();
    }
  };

  scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_BG_BASE);
  // Subtle distance fog so ~410 m berm (from spawn) reads as far without crushing mid-lane contrast
  applyFog();
  // near slightly above 0.01 improves distant depth precision; far clears ~410 m berm from spawn.
  // logarithmicDepthBuffer on the renderer further reduces distant z-fighting.
  camera = new THREE.PerspectiveCamera(player.fovHip, 1, state.camNear, state.camFar);
  camera.layers.enable(VIEWMODEL_LAYER);

  playerRoot = new THREE.Group();
  leanPivot = new THREE.Group();
  playerRoot.add(leanPivot);
  leanPivot.add(camera);
  scene.add(playerRoot);

  hemiLight = new THREE.HemisphereLight(0x8a9aac, 0x3a3228, HEMI_INT_BASE);
  scene.add(hemiLight);
  ambLight = new THREE.AmbientLight(0x4a5460, AMB_INT_BASE);
  scene.add(ambLight);
  keyLight = new THREE.DirectionalLight(0xfff1dd, KEY_INT_BASE);
  keyLight.position.set(10, 22, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = KEY_SHADOW_DIST + KEY_SHADOW_EXTENT + 16;
  keyLight.shadow.camera.left = -KEY_SHADOW_EXTENT;
  keyLight.shadow.camera.right = KEY_SHADOW_EXTENT;
  keyLight.shadow.camera.top = KEY_SHADOW_EXTENT;
  keyLight.shadow.camera.bottom = -KEY_SHADOW_EXTENT;
  keyLight.shadow.bias = -0.0002;
  keyLight.shadow.normalBias = 0.035;
  keyLight.shadow.radius = 2.5;
  keyLight.shadow.camera.updateProjectionMatrix();
  scene.add(keyLight);
  scene.add(keyLight.target);
  fillLight = new THREE.DirectionalLight(0x5a7aaa, FILL_INT_BASE);
  fillLight.position.set(-8, 10, -2);
  scene.add(fillLight);
  rimLight = new THREE.DirectionalLight(0x445566, RIM_INT_BASE);
  rimLight.position.set(0, 8, -30);
  scene.add(rimLight);
  moonLight = new THREE.DirectionalLight(0xb8c8dc, 0);
  moonLight.position.set(-12, 20, -8);
  moonLight.castShadow = false;
  scene.add(moonLight);
  enableViewmodelLighting();

  holdRoot = new THREE.Group();
  camera.add(holdRoot);


  buildRoom();
  buildBlockGun(state.weaponId);
  initAdsDof();
  initGodRays();
  initHdrBloom();
  initOutputDither();
  initHeatHazePost();
  resize();
  applyDisplayLook();
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas.parentElement || canvas);
  void prewarmShotFx().catch(() => {}).finally(() => {
    clock.start();
    animate();
  });
}

function resize() {
  const canvas = el("view3d");
  const wrap = canvas.parentElement;
  const w = wrap.clientWidth || window.innerWidth;
  const h = wrap.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
  resizeAdsDof();
  resizeGodRays();
  resizeHdrBloom();
  resizeOutputDither();
  if (hdrBloom) resizeHeatHazeGrab(hdrBloom.sceneRT.width, hdrBloom.sceneRT.height);
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
  // Camera walk recovers if you pause; slower while the trigger is held.
  const camLambda = (input.shoot && isAutoFire()) ? 1.6 : 9;
  player.camRecoilP *= Math.exp(-camLambda * dt);
  player.camRecoilY *= Math.exp(-camLambda * dt);

  // Reload lift: raise + cant on swayRig so the mag well is in first-person view.
  // Hold while the mag is out, then settle. Viewmodel only — camera stays put.
  let reloadLiftY = 0, reloadLiftZ = 0, reloadLiftRx = 0, reloadLiftRy = 0, reloadLiftRz = 0;
  if (state.reloading) {
    const dur = Math.max(0.05, state.reloadDuration || 1.2);
    const u = Math.min(1, state.reloadElapsed / dur);
    const envelope = reloadLiftEnvelope(u);
    reloadLiftY = 0.16 * envelope;    // 16 cm up — bigger than the old 7 cm dip
    reloadLiftZ = 0.035 * envelope;   // slightly closer
    reloadLiftRx = -0.24 * envelope;  // muzzle a bit down so the well faces the lens
    reloadLiftRy = 0.10 * envelope;   // yaw the receiver inward
    reloadLiftRz = -0.46 * envelope;  // roll the well toward camera (~26 deg)
  }

  const crouchB = clamp(state.crouchGrad, 0, 1);
  const vaultB = state.vaulting ? 1 - Math.abs(state.vaultT / Math.max(0.12, state.vaultDur) - 0.5) * 2 : 0;
  const tuck = Math.max(crouchB, state.sliding ? 0.7 : 0, clamp(vaultB, 0, 1));
  const crouchDipY = -0.06 * tuck;
  const crouchDipZ = 0.03 * tuck;

  // Sprint gun mass: follow camera bobPhase with ~0.38s lag, heavier down-thud + slight roll.
  const sprintW = clamp(state.sprintHoldT || 0, 0, 1);
  player.gunBobW = lerp(player.gunBobW || 0, sprintW, 1 - Math.exp(-7 * dt));
  if (player.gunBobW < 0.001) player.gunBobW = 0;
  const gunLag = 1 / 0.38;
  player.gunBobPhase = lerp(player.gunBobPhase || 0, player.bobPhase, 1 - Math.exp(-gunLag * dt));
  const gw = player.gunBobW;
  const gp = player.gunBobPhase;
  const step = Math.sin(gp);
  const down = Math.min(0, step);
  const gunBobX = Math.cos(gp * 0.5) * 0.018 * gw;
  const gunBobY = (step * 0.018 + down * 0.032) * gw;
  const gunBobZ = step * 0.007 * gw;
  const gunBobRx = down * 0.055 * gw;
  const gunBobRz = step * 0.06 * gw;

  swayRig.position.set(
    sx + player.recoilPunch.x + gunBobX,
    sy + player.recoilPunch.y + reloadLiftY + crouchDipY + gunBobY,
    sz + player.recoilPunch.z + crouchDipZ + reloadLiftZ + gunBobZ
  );
  let boltYaw = 0;
  if (state.boltCycling) {
    const dur = Math.max(0.05, state.boltDuration || BOLT_CYCLE_SEC);
    const u = Math.min(1, state.boltElapsed / dur);
    boltYaw = 0.05 * Math.sin(u * Math.PI); // tiny viewmodel yaw through the cycle
  }
  swayRig.rotation.set(
    rx + player.recoilRot.x + reloadLiftRx + 0.04 * tuck + gunBobRx,
    ry + player.recoilRot.y + boltYaw + reloadLiftRy,
    rz + player.recoilRot.z + reloadLiftRz + gunBobRz,
    "XYZ"
  );
}

function updateHoldBreath(dt) {
  const bar = el("breathBar");
  const fill = el("breathFill");
  const want = gameplayActive() && isAdsNow() && input.holdBreath && state.breathLeft > 0 && !state.vaulting;
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
  return BALLISTICS[state.weaponId] || BALLISTICS.example_smg;
}

function fireCooldownForLoadout() {
  if (isBoltGun()) return BOLT_CYCLE_SEC;
  if (state.weaponId === "example_rifle") return 0.14;
  if (isAutoFire()) return SMG_AUTO_SEC;
  return 0.12;
}

function recoilKickForLoadout() {
  if (isBoltGun()) return 1.75;
  if (state.weaponId === "example_rifle") return 1.15;
  return 1;
}

/* ---- Height-over-bore + zeroing (teaching model) ----
 * Sight ray = camera / optic aim.
 * Natural bore = muzzleSocket local −Z (barrel extends toward −Z on these block guns).
 * Zero: choose launch dir so the constant-g arc meets the sight point at effectiveZeroDist().
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

  const Z = Math.max(5, effectiveZeroDist());
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
  const z = effectiveZeroDist();
  const zLabel = state.optic === "iron" ? `Z=${z} m (irons)` : `Z=${z} m`;
  node.textContent = `HoB ${cm >= 0 ? "+" : ""}${cm.toFixed(1)} cm · ${mode} · ${zLabel}`;
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
  scheduleSaveSettings();
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
  _zeroPt.copy(_sightO).addScaledVector(_sightD, Math.max(1, effectiveZeroDist()));
  const bal = ballisticForWeapon();
  solveBallisticLaunchDir(muzzlePos, _zeroPt, bal.speed, bal.gravity, outDir);
}

function getCasingGeo() {
  // ~2.25× prior size so ejected brass reads at range / night.
  if (!_casingGeo) _casingGeo = new THREE.CylinderGeometry(0.0095, 0.011, 0.045, 7);
  return _casingGeo;
}

function getCasingMat() {
  if (!_casingMat) {
    _casingMat = new THREE.MeshStandardMaterial({
      color: 0xf0d078,
      roughness: 0.28,
      metalness: 0.88,
      emissive: 0x6a4018,
      emissiveIntensity: 0.45,
    });
  }
  return _casingMat;
}

function retireCasing(c) {
  if (c && c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh);
}

function liveCasingCap() {
  return Math.round(clamp(Number(state.casingCap) || CASING_MAX, CASING_CAP_MIN, CASING_CAP_MAX));
}

function liveCasingFade() {
  const n = Number(state.casingFade);
  return Number.isFinite(n) ? Math.max(0, n) : CASING_FADE_SEC;
}

function liveCasingDraw() {
  const n = Number(state.casingDraw);
  return Number.isFinite(n) ? clamp(n, CASING_DRAW_MIN, CASING_DRAW_MAX) : CASING_DRAW_DEFAULT;
}

function liveDecalDraw() {
  const n = Number(state.decalDraw);
  return Number.isFinite(n) ? clamp(n, DECAL_DRAW_MIN, DECAL_DRAW_MAX) : DECAL_DRAW_DEFAULT;
}

function fxWorldXZ(obj) {
  if (!obj) return null;
  if (!obj.parent || obj.parent === scene) {
    _fxDrawTmp.x = obj.position.x;
    _fxDrawTmp.z = obj.position.z;
    return _fxDrawTmp;
  }
  obj.getWorldPosition(_fxDrawTmp);
  return _fxDrawTmp;
}

function setFxVisibleByDist(obj, px, pz, r2) {
  if (!obj) return false;
  const p = fxWorldXZ(obj);
  const dx = p.x - px;
  const dz = p.z - pz;
  const vis = (dx * dx + dz * dz) <= r2;
  obj.visible = vis;
  return vis;
}

/** Per-frame draw-distance hide. Does not despawn; walking back shows items again. */
function applyFxDrawDistances() {
  if (!player || !player.pos) return;
  const px = player.pos.x;
  const pz = player.pos.z;
  const cR = liveCasingDraw();
  const dR = liveDecalDraw();
  const cR2 = cR * cR;
  const dR2 = dR * dR;
  for (let i = 0; i < casings.length; i++) {
    const m = casings[i] && casings[i].mesh;
    if (m) setFxVisibleByDist(m, px, pz, cR2);
  }
  for (let i = 0; i < spentSlugs.length; i++) {
    const m = spentSlugs[i] && spentSlugs[i].mesh;
    if (m) setFxVisibleByDist(m, px, pz, cR2);
  }
  const visDecal = (mesh) => {
    if (!mesh) return;
    const vis = setFxVisibleByDist(mesh, px, pz, dR2);
    const plug = mesh.userData && mesh.userData.plug;
    if (plug) plug.visible = vis;
  };
  for (let i = 0; i < impactDecals.length; i++) visDecal(impactDecals[i]);
  for (let i = 0; i < paperDecals.length; i++) visDecal(paperDecals[i]);
}

/** Oldest third of live casings by spawn time — random pick, never spawn-order walk. */
function oldestThirdCasingIndices() {
  const n = casings.length;
  if (!n) return [];
  const k = Math.max(1, Math.ceil(n / 3));
  const idxs = new Array(n);
  for (let i = 0; i < n; i++) idxs[i] = i;
  idxs.sort((a, b) => (casings[a].bornAt || 0) - (casings[b].bornAt || 0));
  idxs.length = k;
  return idxs;
}

function takeCasingFromOldestThird() {
  const pool = oldestThirdCasingIndices();
  if (!pool.length) return null;
  const i = pool[(Math.random() * pool.length) | 0];
  return casings.splice(i, 1)[0];
}

function trimCasings() {
  const cap = liveCasingCap();
  while (casings.length > cap) {
    const rec = takeCasingFromOldestThird();
    retireCasing(rec);
  }
}

function expireCasings(nowMs) {
  const fade = liveCasingFade();
  if (fade <= 0) return;
  const now = nowMs != null ? nowMs : performance.now();
  const ttl = fade * 1000;
  const pool = oldestThirdCasingIndices();
  if (!pool.length) return;
  const eligible = [];
  for (let p = 0; p < pool.length; p++) {
    const i = pool[p];
    const c = casings[i];
    if (c && c.sleeping && c.sleepAt && now - c.sleepAt >= ttl) eligible.push(i);
  }
  if (!eligible.length) return;
  const take = Math.max(1, Math.ceil(eligible.length / 6));
  const doomed = [];
  for (let t = 0; t < take && eligible.length; t++) {
    const p = (Math.random() * eligible.length) | 0;
    doomed.push(eligible[p]);
    eligible[p] = eligible[eligible.length - 1];
    eligible.pop();
  }
  doomed.sort((a, b) => b - a);
  for (let d = 0; d < doomed.length; d++) {
    const rec = casings.splice(doomed[d], 1)[0];
    retireCasing(rec);
  }
}

/** Spawn a cheap brass casing from the receiver ejection port (live shots only). */
function spawnCasing() {
  if (!scene || !ejectionPort || !camera) return;
  ejectionPort.updateWorldMatrix(true, false);
  camera.updateMatrixWorld();
  _right.setFromMatrixColumn(camera.matrixWorld, 0);
  if (_right.lengthSq() < 1e-8) _right.set(1, 0, 0);
  else _right.normalize();

  const cap = liveCasingCap();
  let rec;
  if (casings.length >= cap) {
    rec = takeCasingFromOldestThird();
    retireCasing(rec);
  } else {
    rec = {
      mesh: new THREE.Mesh(getCasingGeo(), getCasingMat()),
      vel: new THREE.Vector3(),
      angVel: new THREE.Vector3(),
      bounced: false,
      sleeping: false,
      sleepAt: 0,
      bornAt: 0,
    };
    rec.mesh.castShadow = false;
    rec.mesh.receiveShadow = true;
  }
  ejectionPort.getWorldPosition(rec.mesh.position);
  rec.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  const speedR = 2.15 + Math.random() * 0.7;
  rec.vel.copy(_right).multiplyScalar(speedR);
  rec.vel.y += 2.05 + Math.random() * 0.95;
  rec.vel.x += (Math.random() - 0.5) * 0.45;
  rec.vel.y += (Math.random() - 0.5) * 0.35;
  rec.vel.z += (Math.random() - 0.5) * 0.45;
  rec.angVel.set(
    (Math.random() - 0.5) * 26,
    (Math.random() - 0.5) * 18,
    (Math.random() - 0.5) * 26
  );
  rec.bounced = false;
  rec.sleeping = false;
  rec.sleepAt = 0;
  rec.bornAt = performance.now();
  if (rec.mesh) rec.mesh.visible = true;
  scene.add(rec.mesh);
  casings.push(rec);
}

function updateCasings(dt) {
  const floorY = FLOOR_Y + 0.016; // ~half of scaled casing height
  const now = performance.now();
  for (let i = 0; i < casings.length; i++) {
    const c = casings[i];
    if (c.sleeping) continue;
    c.vel.y -= CASING_GRAVITY * dt;
    c.mesh.position.addScaledVector(c.vel, dt);
    c.mesh.rotation.x += c.angVel.x * dt;
    c.mesh.rotation.y += c.angVel.y * dt;
    c.mesh.rotation.z += c.angVel.z * dt;
    if (c.mesh.position.y <= floorY) {
      c.mesh.position.y = floorY;
      if (!c.bounced) {
        c.bounced = true;
        c.vel.y = Math.abs(c.vel.y) * 0.32;
        c.vel.x *= 0.48;
        c.vel.z *= 0.48;
        c.angVel.multiplyScalar(0.42);
        if (c.vel.y < 0.55) c.vel.y = 0.55;
      } else if (c.vel.y <= 0) {
        c.vel.set(0, 0, 0);
        c.angVel.set(0, 0, 0);
        c.sleeping = true;
        c.sleepAt = now;
      }
    }
  }
  expireCasings(now);
}


const SLUG_FLOOR_Y = FLOOR_Y + 0.012;

function spentSlugChance(kind) {
  if (kind === "flood" || kind === "bottle") return 0;
  if (kind === "circle") return SLUG_PAPER_CHANCE;
  return SLUG_CHANCE;
}

function getSlugBodyGeo() {
  if (!_slugBodyGeo) _slugBodyGeo = new THREE.CylinderGeometry(0.0064, 0.0064, 0.015, 10);
  return _slugBodyGeo;
}
function getSlugTailGeo() {
  // Narrower at the rear (−Y). Same stacked-cylinder language as the beer bottles.
  if (!_slugTailGeo) _slugTailGeo = new THREE.CylinderGeometry(0.0064, 0.0040, 0.007, 10);
  return _slugTailGeo;
}
function getSlugNoseGeo() {
  if (!_slugNoseGeo) _slugNoseGeo = new THREE.CylinderGeometry(0.0014, 0.0064, 0.010, 10);
  return _slugNoseGeo;
}
function getSlugMat() {
  if (!_slugMat) {
    _slugMat = new THREE.MeshStandardMaterial({
      color: 0xc48a3a,
      roughness: 0.34,
      metalness: 0.82,
      emissive: 0x3a220c,
      emissiveIntensity: 0.22,
    });
  }
  return _slugMat;
}

function makeSpentSlugMesh() {
  const g = new THREE.Group();
  const mat = getSlugMat();
  const body = new THREE.Mesh(getSlugBodyGeo(), mat);
  const tail = new THREE.Mesh(getSlugTailGeo(), mat);
  const nose = new THREE.Mesh(getSlugNoseGeo(), mat);
  tail.position.y = -0.011;
  nose.position.y = 0.0125;
  g.add(body, tail, nose);
  g.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = false;
      c.receiveShadow = true;
    }
  });
  return g;
}

function retireSpentSlug(s) {
  if (s && s.mesh && s.mesh.parent) s.mesh.parent.remove(s.mesh);
}

function oldestThirdSlugIndices() {
  const n = spentSlugs.length;
  if (!n) return [];
  const k = Math.max(1, Math.ceil(n / 3));
  const idxs = new Array(n);
  for (let i = 0; i < n; i++) idxs[i] = i;
  idxs.sort((a, b) => (spentSlugs[a].bornAt || 0) - (spentSlugs[b].bornAt || 0));
  idxs.length = k;
  return idxs;
}

function takeSlugFromOldestThird() {
  const pool = oldestThirdSlugIndices();
  if (!pool.length) return null;
  const i = pool[(Math.random() * pool.length) | 0];
  return spentSlugs.splice(i, 1)[0];
}

function trimSpentSlugs() {
  const cap = liveCasingCap();
  while (spentSlugs.length > cap) {
    retireSpentSlug(takeSlugFromOldestThird());
  }
}

function expireSpentSlugs(nowMs) {
  const fade = liveCasingFade();
  if (fade <= 0) return;
  const now = nowMs != null ? nowMs : performance.now();
  const ttl = fade * 1000;
  const pool = oldestThirdSlugIndices();
  if (!pool.length) return;
  const eligible = [];
  for (let p = 0; p < pool.length; p++) {
    const i = pool[p];
    const s = spentSlugs[i];
    if (s && s.sleeping && s.sleepAt && now - s.sleepAt >= ttl) eligible.push(i);
  }
  if (!eligible.length) return;
  const take = Math.max(1, Math.ceil(eligible.length / 6));
  const doomed = [];
  for (let t = 0; t < take && eligible.length; t++) {
    const p = (Math.random() * eligible.length) | 0;
    doomed.push(eligible[p]);
    eligible[p] = eligible[eligible.length - 1];
    eligible.pop();
  }
  doomed.sort((a, b) => b - a);
  for (let d = 0; d < doomed.length; d++) {
    retireSpentSlug(spentSlugs.splice(doomed[d], 1)[0]);
  }
}

/**
 * Cheap graze skip: 1-in-16 on wall/floor/berm (paper rarer).
 * Reflect incoming vel about the surface normal, keep ~8–18% speed, add tangent scatter.
 * Dead-on impacts do not skip. Not a real ricochet table.
 */
function trySpawnSpentSlugBounce(pos, normal, incomingVel, kind) {
  if (!scene || !pos || !normal || !incomingVel) return false;
  const chance = spentSlugChance(kind);
  if (chance <= 0) return false;
  const speed = incomingVel.length();
  if (speed < 1e-3) return false;
  _slugN.copy(normal);
  if (_slugN.lengthSq() < 1e-10) return false;
  _slugN.normalize();
  const vDotN = incomingVel.dot(_slugN) / speed;
  // Require a graze; dead-on does not skip. Cheap gate, not an angle table.
  if (vDotN >= -0.02) return false;
  if (-vDotN > SLUG_GRAZE_MAX) return false;
  if (Math.random() >= chance) return false;
  spawnSpentSlug(pos, incomingVel, speed);
  return true;
}

function spawnSpentSlug(pos, incomingVel, speed) {
  // r = v - 2 n (v·n) — reflect about normal, not invert.
  const vn = incomingVel.dot(_slugN);
  _slugVel.copy(incomingVel).addScaledVector(_slugN, -2 * vn);
  const keep = SLUG_KEEP_MIN + Math.random() * (SLUG_KEEP_MAX - SLUG_KEEP_MIN);
  let outSpeed = speed * keep;
  if (outSpeed < SLUG_SPEED_MIN) outSpeed = SLUG_SPEED_MIN;
  if (outSpeed > SLUG_SPEED_MAX) outSpeed = SLUG_SPEED_MAX;
  if (_slugVel.lengthSq() < 1e-10) _slugVel.copy(_slugN);
  _slugVel.setLength(outSpeed);
  // Tangent-plane scatter so it is not a perfect mirror.
  _slugTmp.set(0, 1, 0);
  if (Math.abs(_slugN.y) > 0.92) _slugTmp.set(1, 0, 0);
  _slugT1.copy(_slugN).cross(_slugTmp);
  if (_slugT1.lengthSq() < 1e-10) _slugT1.set(0, 0, 1);
  _slugT1.normalize();
  _slugT2.copy(_slugN).cross(_slugT1).normalize();
  const scatter = outSpeed * (0.12 + Math.random() * 0.18);
  _slugVel.addScaledVector(_slugT1, (Math.random() - 0.5) * scatter);
  _slugVel.addScaledVector(_slugT2, (Math.random() - 0.5) * scatter);
  // Keep a little outgoing so a graze skips along the wall instead of digging in.
  const out = _slugVel.dot(_slugN);
  if (out < 0.35) _slugVel.addScaledVector(_slugN, 0.4 - out);

  const cap = liveCasingCap();
  let rec;
  if (spentSlugs.length >= cap) {
    rec = takeSlugFromOldestThird();
    retireSpentSlug(rec);
  } else {
    rec = {
      mesh: makeSpentSlugMesh(),
      vel: new THREE.Vector3(),
      angVel: new THREE.Vector3(),
      bounced: false,
      sleeping: false,
      sleepAt: 0,
      bornAt: 0,
    };
  }
  rec.mesh.position.copy(pos).addScaledVector(_slugN, 0.02);
  rec.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _slugVel.clone().normalize());
  rec.vel.copy(_slugVel);
  rec.angVel.set(
    (Math.random() - 0.5) * 22,
    (Math.random() - 0.5) * 16,
    (Math.random() - 0.5) * 22
  );
  rec.bounced = false;
  rec.sleeping = false;
  rec.sleepAt = 0;
  rec.bornAt = performance.now();
  rec.mesh.visible = true;
  scene.add(rec.mesh);
  spentSlugs.push(rec);
}

function updateSpentSlugs(dt) {
  const now = performance.now();
  for (let i = 0; i < spentSlugs.length; i++) {
    const s = spentSlugs[i];
    if (s.sleeping) continue;
    s.vel.y -= CASING_GRAVITY * dt;
    s.mesh.position.addScaledVector(s.vel, dt);
    s.mesh.rotation.x += s.angVel.x * dt;
    s.mesh.rotation.y += s.angVel.y * dt;
    s.mesh.rotation.z += s.angVel.z * dt;
    if (s.mesh.position.y <= SLUG_FLOOR_Y) {
      s.mesh.position.y = SLUG_FLOOR_Y;
      if (!s.bounced) {
        s.bounced = true;
        s.vel.y = Math.abs(s.vel.y) * 0.32;
        s.vel.x *= 0.48;
        s.vel.z *= 0.48;
        s.angVel.multiplyScalar(0.42);
        if (s.vel.y < 0.55) s.vel.y = 0.55;
      } else if (s.vel.y <= 0) {
        s.vel.set(0, 0, 0);
        s.angVel.set(0, 0, 0);
        s.sleeping = true;
        s.sleepAt = now;
      }
    }
  }
  expireSpentSlugs(now);
}

/** Mild horizontal walk (SMG AUTO). Pattern index resets after RECOIL_RESET_MS idle. */
const SMG_YAW_WALK = [
  0.18, 0.42, -0.16, 0.58, -0.38, 0.72, -0.22, 0.48,
  -0.52, 0.32, 0.64, -0.44, 0.22, -0.58, 0.38,
];

function applyShotRecoil() {
  const now = performance.now();
  if (now - (state.lastShotMs || 0) > RECOIL_RESET_MS) {
    state.recoilPatternIndex = 0;
  }
  state.lastShotMs = now;

  if (state.weaponId !== "example_smg") {
    const kick = recoilKickForLoadout();
    player.recoilPunch.z += 0.018 * kick;
    player.recoilPunch.y += 0.006 * kick;
    player.recoilRot.x -= 0.035 * kick;
    player.recoilRot.y += (Math.random() - 0.5) * 0.02 * kick;
    return;
  }

  const adsT = state.adsPreview ? 1 : state.adsFactor;
  const adsMod = lerp(1, 0.6, adsT);
  const idx = state.recoilPatternIndex;
  const h = SMG_YAW_WALK[idx % SMG_YAW_WALK.length];
  // High ROF, little muzzle flip (in-line push); mild yaw walk.
  const pitch = 0.012 * (0.85 + 0.03 * Math.min(idx, 6));
  const yaw = 0.008 * h;
  state.recoilPatternIndex = idx + 1;

  player.camRecoilP += pitch * adsMod;
  player.camRecoilY += yaw * adsMod;

  player.recoilPunch.z += 0.010 * adsMod;
  player.recoilPunch.y += 0.002 * adsMod;
  player.recoilRot.x -= pitch * 1.35 * adsMod;
  player.recoilRot.y += yaw * 1.5 * adsMod;
}

function fireWeapon({ fromHold = false } = {}) {
  if (!gameplayActive()) return;
  if (state.vaulting) return;
  if (player.fireCooldown > 0 || state.boltCycling) return;
  if (state.lookPickup) {
    if (fromHold) return;
    tryEquipLooked();
    return;
  }
  if (state.handsEmpty) return;
  if (state.reloading) return;
  sfx.resume();
  if (state.ammoInMag <= 0) {
    sfx.play("dry");
    player.fireCooldown = 0.18;
    updateAmmoHud();
    return;
  }
  state.ammoInMag -= 1;
  updateAmmoHud();
  sfx.play("fire");
  player.fireCooldown = fireCooldownForLoadout();
  addBarrelHeatShot();
  fireFlash();
  if (isBoltGun()) beginBoltCycle();
  else spawnCasing();
  applyShotRecoil();

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

  // Visual streak: unit-length cylinder with tip at local y=0 (body in -Y).
  // Each frame scale.y stretches to visualLength; mesh.position stays the tip for hits.
  const TRACER_BASE_LEN = 1;
  const tracerR = 0.015;
  const geo = new THREE.CylinderGeometry(tracerR * 0.85, tracerR, TRACER_BASE_LEN, 8);
  geo.translate(0, -TRACER_BASE_LEN * 0.5, 0);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xe8c878,
    transparent: true,
    opacity: 0.78,
    blending: THREE.NormalBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  });
  mat.color.setRGB(2.85, 2.25, 0.95);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  // Start past the barrel so the streak does not draw inside the receiver.
  mesh.position.copy(origin).addScaledVector(dir, 0.7);
  const speed0 = vel.length();
  const visualLength0 = Math.min(18, Math.max(1.5, speed0 * 0.035));
  mesh.scale.set(1, visualLength0 / TRACER_BASE_LEN, 1);
  mesh.renderOrder = 8;
  scene.add(mesh);
  tracers.push({
    mesh,
    vel,
    gravity: bal.gravity,
    life: TRACER_SANITY_LIFE,
    maxLife: TRACER_SANITY_LIFE,
    hit: false,
    prev: mesh.position.clone(),
    baseLen: TRACER_BASE_LEN,
  });
}


/* ---- Impact decals + bullet sparks (cheap, no external textures) ---- */
function _holeHash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/** Hard-edged warped blob — terminal outline + rim chips, not a soft radial disc. */
function drawImpactHole(ctx, size, punch, variant) {
  const cx = size * 0.5;
  const cy = size * 0.5;
  ctx.clearRect(0, 0, size, size);
  const s = variant * 1.847 + (punch ? 0.31 : 2.17);
  const verts = 22;
  const baseR = size * (punch ? 0.19 : 0.26);
  ctx.beginPath();
  for (let i = 0; i < verts; i++) {
    const a = (i / verts) * Math.PI * 2;
    const wobble =
      0.13 * Math.sin(a * 2 + s) +
      0.09 * Math.sin(a * 5 + s * 1.73) +
      0.055 * Math.sin(a * 9 + s * 0.61);
    const jag = (_holeHash(variant * 13.3 + i * 7.1) - 0.5) * (punch ? 0.22 : 0.16);
    const r = Math.max(size * (punch ? 0.10 : 0.12), baseR * (1 + wobble + jag));
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = punch ? "rgba(4,3,2,0.98)" : "rgba(14,11,9,0.84)";
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = 1.15;
  ctx.strokeStyle = punch ? "rgba(0,0,0,1)" : "rgba(5,4,3,0.95)";
  ctx.stroke();
  const chips = punch ? 5 : 5;
  for (let k = 0; k < chips; k++) {
    const a = (k / chips) * Math.PI * 2 + s * 0.4;
    const rr = baseR * (0.88 + _holeHash(s + k) * 0.12);
    ctx.beginPath();
    ctx.ellipse(
      cx + Math.cos(a) * rr,
      cy + Math.sin(a) * rr,
      1.4 + _holeHash(s * 2 + k) * 1.6,
      0.7 + _holeHash(s * 3 + k) * 0.9,
      a,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.fill();
  }
}

function getImpactHoleTexture(isPunch) {
  const pool = isPunch ? _holePunchMaps : _holeScuffMaps;
  if (!pool.length) {
    for (let v = 0; v < IMPACT_HOLE_VARIANTS; v++) {
      const punch = !!isPunch;
      const variant = v;
      const tex = makeCanvasTexture((ctx, size) => {
        drawImpactHole(ctx, size, punch, variant);
      }, 64);
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(1, 1);
      pool.push(tex);
    }
  }
  return pool[(Math.random() * pool.length) | 0];
}

function getImpactDecalGeo() {
  if (!_impactDecalGeo) _impactDecalGeo = new THREE.PlaneGeometry(1, 1);
  return _impactDecalGeo;
}

function getImpactSparkGeo() {
  if (!_impactSparkGeo) _impactSparkGeo = new THREE.PlaneGeometry(0.014, 0.065);
  return _impactSparkGeo;
}

function orientFlatToNormal(mesh, normal) {
  _impactN.copy(normal);
  if (_impactN.lengthSq() < 1e-8) _impactN.set(0, 1, 0);
  else _impactN.normalize();
  // PlaneGeometry faces +Z; align to hit normal
  mesh.quaternion.setFromUnitVectors(_impactUp, _impactN);
}

function makeAdditiveSparkMat(color, map) {
  const mat = new THREE.MeshBasicMaterial({
    map: map || null,
    color,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  if ("toneMapped" in mat) mat.toneMapped = false;
  return mat;
}

function getImpactSparkMaterial(white) {
  if (white) {
    if (!_impactSparkMatWhite) _impactSparkMatWhite = makeAdditiveSparkMat(0xffffff, null);
    return _impactSparkMatWhite;
  }
  if (!_impactSparkMatYellow) _impactSparkMatYellow = makeAdditiveSparkMat(0xffe08a, null);
  return _impactSparkMatYellow;
}

function getBulbSparkMaterial(cyan) {
  const map = getBulbSparkTexture(cyan);
  if (cyan) {
    if (!_bulbSparkMatCyan) _bulbSparkMatCyan = makeAdditiveSparkMat(0xa8ffff, map);
    return _bulbSparkMatCyan;
  }
  if (!_bulbSparkMatWhite) _bulbSparkMatWhite = makeAdditiveSparkMat(0xffffff, map);
  return _bulbSparkMatWhite;
}

/** Spawn yellow/white streak sparks that fade in ~0.15–0.35s. */
function spawnImpactSparks(pos, normal) {
  if (!scene || !pos) return;
  _impactN.copy(normal || _impactUp);
  if (_impactN.lengthSq() < 1e-8) _impactN.set(0, 1, 0);
  else _impactN.normalize();
  const count = 5 + ((Math.random() * 4) | 0);
  const geo = getImpactSparkGeo();
  for (let i = 0; i < count; i++) {
    const life = 0.15 + Math.random() * 0.2;
    const white = Math.random() <= 0.35;
    const mat = getImpactSparkMaterial(white).clone();
    mat.opacity = 0.95;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 6;
    const dir = _impactN.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.6
      )
    );
    if (dir.lengthSq() < 1e-8) dir.copy(_impactN);
    dir.normalize();
    mesh.quaternion.setFromUnitVectors(_sparkAxis, dir);
    mesh.position.copy(pos).addScaledVector(_impactN, 0.025);
    const speed = 2.2 + Math.random() * 5.5;
    scene.add(mesh);
    impactSparks.push({
      mesh,
      vel: dir.multiplyScalar(speed),
      life,
      maxLife: life,
    });
  }
}

function getBulbSparkGeo() {
  if (!_bulbSparkGeo) _bulbSparkGeo = new THREE.PlaneGeometry(1, 1);
  return _bulbSparkGeo;
}

function sparkCardCacheUrl(kind) {
  return new URL("./prewarm/spark-" + kind + ".png", import.meta.url).href;
}

function applySparkCardTexSettings(tex) {
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function persistSparkCardCanvas(kind, canvas) {
  if (typeof caches === "undefined") return;
  try {
    canvas.toBlob((blob) => {
      if (!blob) return;
      caches.open(PREWARM_CACHE).then((cache) => {
        cache.put(
          sparkCardCacheUrl(kind),
          new Response(blob, { headers: { "Content-Type": "image/png" } })
        );
      }).catch(() => {});
    }, "image/png");
  } catch (_) {}
}

async function loadCachedSparkCardTexture(kind) {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(PREWARM_CACHE);
    const hit = await cache.match(sparkCardCacheUrl(kind));
    if (!hit) return null;
    const blob = await hit.blob();
    if (!blob || blob.size < 32) return null;
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(blob);
      return applySparkCardTexSettings(new THREE.Texture(bitmap));
    }
    const url = URL.createObjectURL(blob);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    URL.revokeObjectURL(url);
    return applySparkCardTexSettings(new THREE.Texture(img));
  } catch (_) {
    return null;
  }
}

/** Tiny hot-dot card: white or cyan core, transparent rim. 16x16 so 8 is not too crunchy. */
function drawSparkCardCanvas(kind) {
  const size = 16;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  const cx = size * 0.5;
  const cy = size * 0.5;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.46);
  if (kind === "cyan") {
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.22, "rgba(190,255,255,1)");
    g.addColorStop(0.5, "rgba(70,220,255,0.55)");
    g.addColorStop(1, "rgba(0,40,70,0)");
  } else {
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.28, "rgba(235,248,255,0.95)");
    g.addColorStop(0.58, "rgba(190,210,230,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

function makeSparkCardTexture(kind) {
  const canvas = drawSparkCardCanvas(kind);
  persistSparkCardCanvas(kind, canvas);
  return applySparkCardTexSettings(new THREE.CanvasTexture(canvas));
}

function getBulbSparkTexture(cyan) {
  if (cyan) {
    if (!_bulbSparkTexCyan) _bulbSparkTexCyan = makeSparkCardTexture("cyan");
    return _bulbSparkTexCyan;
  }
  if (!_bulbSparkTexWhite) _bulbSparkTexWhite = makeSparkCardTexture("white");
  return _bulbSparkTexWhite;
}

/** Face camera as much as possible with local Y stretched along velocity. */
function orientSparkCard(mesh, vel) {
  _sparkY.copy(vel);
  if (_sparkY.lengthSq() < 1e-10) {
    if (camera) mesh.lookAt(camera.position);
    return;
  }
  _sparkY.normalize();
  if (camera) {
    camera.getWorldPosition(_sparkToCam);
    _sparkToCam.sub(mesh.position);
  } else {
    _sparkToCam.set(0, 0, 1);
  }
  _sparkX.copy(_sparkY).cross(_sparkToCam);
  if (_sparkX.lengthSq() < 1e-10) {
    mesh.quaternion.setFromUnitVectors(_sparkAxis, _sparkY);
    return;
  }
  _sparkX.normalize();
  _sparkZ.copy(_sparkX).cross(_sparkY).normalize();
  _sparkMtx.makeBasis(_sparkX, _sparkY, _sparkZ);
  mesh.quaternion.setFromRotationMatrix(_sparkMtx);
}

/** ~10–16 stretched white/cyan/yellow/orange cards at a dying flood lamp head. */
function spawnBulbSparks(pos) {
  if (!scene || !pos) return;
  const n = 10 + ((Math.random() * 7) | 0);
  const geo = getBulbSparkGeo();
  for (let i = 0; i < n; i++) {
    const roll = Math.random();
    let useCyan = false;
    let tint = 0xffffff;
    if (roll < 0.25) { useCyan = true; tint = 0xb8ffff; }
    else if (roll < 0.5) { tint = 0xffffff; }
    else if (roll < 0.75) { tint = 0xffe066; }
    else { tint = 0xff6a22; }
    const tail = Math.random() < 0.22;
    const life = tail ? 0.5 + Math.random() * 0.45 : 0.22 + Math.random() * 0.28;
    const w = 0.02 + Math.random() * 0.02;
    const len = 0.16 + Math.random() * 0.16;
    const mat = getBulbSparkMaterial(useCyan).clone();
    mat.color.setHex(tint);
    mat.opacity = 1;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 8;
    mesh.position.copy(pos);
    mesh.scale.set(w, len, 1);
    const vel = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() * 0.55,
      Math.random() - 0.5
    );
    if (vel.lengthSq() < 1e-6) vel.set(0, 1, 0);
    vel.normalize();
    vel.multiplyScalar(2.4 + Math.random() * 3.4);
    vel.y += 1.1 + Math.random() * 1.7;
    orientSparkCard(mesh, vel);
    scene.add(mesh);
    bulbSparks.push({
      mesh,
      vel,
      life,
      maxLife: life,
      width: w,
      length: len,
    });
  }
}

function updateBulbSparks(dt) {
  for (let i = bulbSparks.length - 1; i >= 0; i--) {
    const s = bulbSparks[i];
    s.life -= dt;
    s.vel.y -= CASING_GRAVITY * dt;
    s.mesh.position.addScaledVector(s.vel, dt);
    orientSparkCard(s.mesh, s.vel);
    const t = Math.max(0, s.life / s.maxLife);
    s.mesh.material.opacity = t;
    s.mesh.scale.set(s.width, s.length * (0.72 + 0.28 * t), 1);
    if (s.life <= 0) {
      scene.remove(s.mesh);
      s.mesh.material.dispose();
      bulbSparks.splice(i, 1);
    }
  }
}

function clearBulbSparks() {
  for (const s of bulbSparks) {
    if (s.mesh && s.mesh.parent) s.mesh.parent.remove(s.mesh);
    if (s.mesh && s.mesh.material) s.mesh.material.dispose();
  }
  bulbSparks = [];
}

/**
 * Dark scorch / punch mark as a small plane on the surface.
 * kind: "punch" (targets) | "scuff" (floor / berm / walls).
 * Env/scuff + non-paper punches cap via Settings hole cap (FIFO) + optional TTL.
 * Sticky paper-target holes persist until table reset (PAPER_DECAL_MAX only).
 */
function makeImpactDecalMesh(isPunch) {
  return new THREE.Mesh(
    getImpactDecalGeo(),
    new THREE.MeshBasicMaterial({
      map: getImpactHoleTexture(isPunch),
      color: isPunch ? 0x1a1a1a : 0x14100c,
      transparent: true,
      opacity: isPunch ? 0.9 : 0.78,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      side: THREE.DoubleSide,
    })
  );
}

function liveHoleCap() {
  return Math.round(clamp(Number(state.holeCap) || IMPACT_DECAL_MAX, IMPACT_DECAL_CAP_MIN, IMPACT_DECAL_CAP_MAX));
}

function liveHoleFade() {
  const n = Number(state.holeFade);
  return Number.isFinite(n) ? Math.max(0, n) : HOLE_FADE_SEC;
}

function getPlugWideGeo() {
  if (!_plugWideGeo) _plugWideGeo = new THREE.CylinderGeometry(0.0072, 0.0078, 0.0023, 10);
  return _plugWideGeo;
}
function getPlugMidGeo() {
  if (!_plugMidGeo) _plugMidGeo = new THREE.CylinderGeometry(0.0054, 0.0072, 0.0020, 10);
  return _plugMidGeo;
}
function getPlugNubGeo() {
  if (!_plugNubGeo) _plugNubGeo = new THREE.CylinderGeometry(0.0028, 0.0054, 0.0017, 8);
  return _plugNubGeo;
}
function getPlugMat(steel) {
  if (steel) {
    if (!_plugSteelMat) {
      _plugSteelMat = new THREE.MeshStandardMaterial({
        color: 0x8a9098,
        roughness: 0.42,
        metalness: 0.9,
        emissive: 0x111214,
        emissiveIntensity: 0.08,
      });
    }
    return _plugSteelMat;
  }
  if (!_plugBrassMat) {
    _plugBrassMat = new THREE.MeshStandardMaterial({
      color: 0xd4a24a,
      roughness: 0.38,
      metalness: 0.85,
      emissive: 0x3a2208,
      emissiveIntensity: 0.12,
    });
  }
  return _plugBrassMat;
}

function addPrewarmDummy(geo, mat, disposeMat) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.position.set(0, 0, -0.15);
  mesh.scale.setScalar(0.0001);
  camera.add(mesh);
  return { mesh, disposeMat: !!disposeMat };
}

/**
 * First flood hit used to hitch on spark-card canvases, punch hole maps,
 * plug geos, and compiling a unique additive MeshBasic per spark.
 * Build those once at init and compile hidden dummies — not the full decal path.
 */
async function prewarmShotFx() {
  if (_shotFxPrewarmed || !renderer || !scene || !camera) return;
  _shotFxPrewarmed = true;
  try {
    const cached = await Promise.race([
      Promise.all([
        _bulbSparkTexWhite ? Promise.resolve(null) : loadCachedSparkCardTexture("white"),
        _bulbSparkTexCyan ? Promise.resolve(null) : loadCachedSparkCardTexture("cyan"),
      ]),
      new Promise((resolve) => setTimeout(() => resolve(null), 80)),
    ]);
    if (cached) {
      if (cached[0] && !_bulbSparkTexWhite) _bulbSparkTexWhite = cached[0];
      if (cached[1] && !_bulbSparkTexCyan) _bulbSparkTexCyan = cached[1];
    }
  } catch (_) {}
  getBulbSparkTexture(false);
  getBulbSparkTexture(true);
  getImpactHoleTexture(true);
  getImpactDecalGeo();
  getImpactSparkGeo();
  getBulbSparkGeo();
  getPlugWideGeo();
  getPlugMidGeo();
  getPlugNubGeo();
  getPlugMat(false);
  getPlugMat(true);
  getImpactSparkMaterial(true);
  getImpactSparkMaterial(false);
  getBulbSparkMaterial(false);
  getBulbSparkMaterial(true);

  const dummies = [
    addPrewarmDummy(getBulbSparkGeo(), getBulbSparkMaterial(false), false),
    addPrewarmDummy(getBulbSparkGeo(), getBulbSparkMaterial(true), false),
    addPrewarmDummy(getImpactSparkGeo(), getImpactSparkMaterial(true), false),
    addPrewarmDummy(getImpactDecalGeo(), makeImpactDecalMesh(true).material, true),
    addPrewarmDummy(getPlugWideGeo(), getPlugMat(false), false),
    addPrewarmDummy(getPlugWideGeo(), getPlugMat(true), false),
  ];
  camera.updateMatrixWorld(true);
  try {
    renderer.compile(scene, camera);
  } catch (_) {}
  for (const d of dummies) {
    if (d.mesh.parent) d.mesh.parent.remove(d.mesh);
    if (d.disposeMat && d.mesh.material) d.mesh.material.dispose();
  }
  if (sfx && typeof sfx.prewarmGlass === "function") sfx.prewarmGlass();
}

/** Flattened stuck slug — stacked squat cylinders, beer-bottle geo, flush in the crater. */
function makeImpactPlugMesh() {
  const g = new THREE.Group();
  const steel = state.weaponId !== "example_smg";
  const mat = getPlugMat(steel);
  const wide = new THREE.Mesh(getPlugWideGeo(), mat);
  const mid = new THREE.Mesh(getPlugMidGeo(), mat);
  const nub = new THREE.Mesh(getPlugNubGeo(), mat);
  mid.position.y = 0.00215;
  nub.position.y = 0.0040;
  g.add(wide, mid, nub);
  const s = 0.88 + Math.random() * 0.28;
  g.scale.setScalar(s);
  g.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = false;
      c.receiveShadow = true;
    }
  });
  return g;
}

function disposeDecalPlug(mesh) {
  const plug = mesh && mesh.userData && mesh.userData.plug;
  if (!plug) return;
  if (plug.parent) plug.parent.remove(plug);
  mesh.userData.plug = null;
}

function disposeImpactDecal(mesh) {
  if (!mesh) return;
  disposeDecalPlug(mesh);
  if (mesh.parent) mesh.parent.remove(mesh);
  if (mesh.material) mesh.material.dispose();
  if (mesh.userData) mesh.userData.bermPopup = null;
}

function trimImpactDecals() {
  const cap = liveHoleCap();
  while (impactDecals.length > cap) {
    const mesh = impactDecals.shift();
    disposeImpactDecal(mesh);
  }
}

function expireImpactDecals(nowMs) {
  const fade = liveHoleFade();
  if (fade <= 0) return;
  const now = nowMs != null ? nowMs : performance.now();
  const ttl = fade * 1000;
  for (let i = impactDecals.length - 1; i >= 0; i--) {
    const mesh = impactDecals[i];
    if (!mesh || (mesh.userData && mesh.userData.paperPersist)) continue;
    const born = (mesh.userData && mesh.userData.born) || 0;
    if (now - born >= ttl) {
      disposeImpactDecal(mesh);
      impactDecals.splice(i, 1);
    }
  }
}

function recycleDecalFrom(list, isPunch) {
  const mesh = list.shift();
  disposeDecalPlug(mesh);
  if (mesh.parent) mesh.parent.remove(mesh);
  mesh.visible = true;
  mesh.userData.bermPopup = null;
  mesh.userData.born = performance.now();
  mesh.material.color.setHex(isPunch ? 0x1a1a1a : 0x14100c);
  mesh.material.map = getImpactHoleTexture(isPunch);
  mesh.material.opacity = isPunch ? 0.9 : 0.78;
  mesh.material.needsUpdate = true;
  return mesh;
}

function spawnImpactDecal(pos, normal, kind, opts) {
  if (!scene || !pos) return;
  const isPunch = kind === "punch";
  const paper = !!(opts && opts.paperTarget && opts.parent);
  const parent = (opts && opts.parent && opts.parent.isObject3D) ? opts.parent : null;
  const size = isPunch
    ? 0.032 + Math.random() * 0.018
    : 0.044 + Math.random() * 0.028;
  let mesh;
  if (paper) {
    if (paperDecals.length >= PAPER_DECAL_MAX) mesh = recycleDecalFrom(paperDecals, isPunch);
    else mesh = makeImpactDecalMesh(isPunch);
    mesh.renderOrder = 3;
    mesh.userData.paperPersist = true;
    mesh.userData.bermPopup = null;
  } else {
    const cap = liveHoleCap();
    if (impactDecals.length >= cap) mesh = recycleDecalFrom(impactDecals, isPunch);
    else mesh = makeImpactDecalMesh(isPunch);
    mesh.renderOrder = 3;
    mesh.userData.paperPersist = false;
    mesh.userData.bermPopup = (opts && opts.bermPopup) || null;
  }
  orientFlatToNormal(mesh, normal);
  mesh.scale.set(size, size * (0.7 + Math.random() * 0.62), 1);
  mesh.rotateZ(Math.random() * Math.PI * 2);
  if (parent) {
    parent.updateWorldMatrix(true, false);
    _decalLocal.copy(pos).addScaledVector(_impactN, paper ? 0.005 : 0.012);
    parent.worldToLocal(_decalLocal);
    mesh.position.copy(_decalLocal);
    parent.getWorldQuaternion(_decalParentQ);
    _decalWorldQ.copy(mesh.quaternion);
    mesh.quaternion.copy(_decalParentQ).invert().multiply(_decalWorldQ);
    parent.add(mesh);
  } else {
    mesh.position.copy(pos).addScaledVector(_impactN, 0.012);
    scene.add(mesh);
  }
  mesh.visible = true;
  mesh.userData.born = performance.now();
  mesh.userData.plug = null;
  if (opts && opts.plug) {
    const plug = makeImpactPlugMesh();
    plug.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _impactN);
    if (parent) {
      parent.updateWorldMatrix(true, false);
      _decalLocal.copy(pos).addScaledVector(_impactN, paper ? 0.004 : 0.007);
      parent.worldToLocal(_decalLocal);
      plug.position.copy(_decalLocal);
      parent.getWorldQuaternion(_decalParentQ);
      _decalWorldQ.copy(plug.quaternion);
      plug.quaternion.copy(_decalParentQ).invert().multiply(_decalWorldQ);
      parent.add(plug);
    } else {
      plug.position.copy(pos).addScaledVector(_impactN, 0.007);
      scene.add(plug);
    }
    mesh.userData.plug = plug;
  }
  if (paper) paperDecals.push(mesh);
  else impactDecals.push(mesh);
}

function spawnImpactFX(pos, normal, kind, opts) {
  spawnImpactSparks(pos, normal);
  spawnImpactDecal(pos, normal, kind || "scuff", opts);
}

/** Floor plane hit along tracer segment (y = FLOOR_Y). */
function hitFloorSegment(prev, curr) {
  const y0 = prev.y;
  const y1 = curr.y;
  if (y0 >= FLOOR_Y && y1 < FLOOR_Y) {
    const dy = y1 - y0;
    if (Math.abs(dy) < 1e-10) return null;
    const u = (FLOOR_Y - y0) / dy;
    if (u < 0 || u > 1) return null;
    const hit = prev.clone().lerp(curr, u);
    hit.y = FLOOR_Y;
    return { hit, normal: new THREE.Vector3(0, 1, 0), u, surface: "floor" };
  }
  return null;
}

/** Walls / berm / crates via leanSolids raycast along segment. */
function hitEnvSolidsSegment(prev, curr) {
  if (!leanSolids.length) return null;
  _impactSeg.copy(curr).sub(prev);
  const dist = _impactSeg.length();
  if (dist < 1e-5) return null;
  _impactSeg.multiplyScalar(1 / dist);
  _raycaster.near = 0;
  _raycaster.far = dist;
  _raycaster.set(prev, _impactSeg);
  const hits = _raycaster.intersectObjects(leanSolids, false);
  if (!hits.length) return null;
  const h = hits[0];
  let n;
  if (h.normal && h.normal.lengthSq() > 1e-8) {
    n = h.normal.clone().normalize();
  } else if (h.face) {
    n = h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize();
  } else {
    n = new THREE.Vector3(0, 1, 0);
  }
  // Prefer outward toward shooter if normal points away from segment start
  if (n.dot(_impactSeg) > 0) n.negate();
  return { hit: h.point.clone(), normal: n, u: h.distance / dist, surface: "solid", object: h.object };
}

function hitEnvironmentSegment(prev, curr) {
  let best = null;
  const floorHit = hitFloorSegment(prev, curr);
  if (floorHit) best = floorHit;
  const solidHit = hitEnvSolidsSegment(prev, curr);
  if (solidHit && (!best || solidHit.u < best.u)) best = solidHit;
  return best;
}

function updateImpactFX(dt) {
  for (let i = impactSparks.length - 1; i >= 0; i--) {
    const s = impactSparks[i];
    s.life -= dt;
    s.mesh.position.addScaledVector(s.vel, dt);
    s.vel.multiplyScalar(Math.exp(-10 * dt));
    const t = Math.max(0, s.life / s.maxLife);
    s.mesh.material.opacity = 0.95 * t;
    const sc = 0.55 + 0.7 * t;
    s.mesh.scale.set(sc, sc, 1);
    if (s.life <= 0) {
      scene.remove(s.mesh);
      s.mesh.material.dispose();
      impactSparks.splice(i, 1);
    }
  }
  expireImpactDecals();
}

function updateTracers(dt) {
  const now = performance.now();
  rangeTargets.forEach((t) => {
    if (t.flash) {
      if (now < t.hitUntil) t.flash.material.opacity = 1;
      else t.flash.material.opacity = Math.max(0, t.flash.material.opacity - dt * 3);
    }
  });

  syncFloodLampZones();
  syncBeerBottleZones();
  for (let i = tracers.length - 1; i >= 0; i--) {
    const tr = tracers[i];
    const baseLen = tr.baseLen || 1;

    if (tr.hit) {
      // Linger as a spent slug at the impact. No fake miss on this despawn.
      tr.life -= dt;
      const lingerMax = tr.maxLife || TRACER_LINGER;
      tr.mesh.material.opacity = Math.max(0, (tr.life / lingerMax) * 0.55);
      if (tr.life <= 0) {
        scene.remove(tr.mesh);
        tr.mesh.geometry.dispose();
        tr.mesh.material.dispose();
        tracers.splice(i, 1);
      }
      continue;
    }

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
    // Stretch cylinder along velocity so it reads as a long streak (tip = mesh.position).
    const visualLength = Math.min(18, Math.max(1.5, speed * 0.035));
    tr.mesh.scale.set(1, visualLength / baseLen, 1);

    // First hit along segment: circular bullseyes + silhouettes + env (floor/berm/walls)
    let best = null;
    for (const t of rangeTargets) {
      const info = hitTargetDiskInfo(prev, tr.mesh.position, t);
      if (info && (!best || info.u < best.u)) {
        best = { kind: "circle", target: t, hit: info.hit, normal: t.normal, u: info.u };
      }
    }
    for (const sil of silhouetteTargets) {
      for (const zone of sil.zones) {
        if (!zoneActive(sil, zone.id)) continue;
        const info = hitTargetDiskInfo(prev, tr.mesh.position, zone);
        if (info && (!best || info.u < best.u)) {
          best = { kind: "sil", sil, zone, hit: info.hit, normal: zone.normal, u: info.u };
        }
      }
    }
    for (const fig of bermPopupTargets) {
      for (const zone of fig.zones) {
        if (!bermPopupZoneActive(fig, zone.id)) continue;
        const info = hitTargetDiskInfo(prev, tr.mesh.position, zone);
        if (info && (!best || info.u < best.u)) {
          best = { kind: "berm", fig, zone, hit: info.hit, normal: zone.normal, u: info.u };
        }
      }
    }
    for (const fx of floodFixtures) {
      if (fx.shotOut || !fx.zone) continue;
      const info = hitTargetDiskInfo(prev, tr.mesh.position, fx.zone);
      if (info && (!best || info.u < best.u)) {
        best = { kind: "flood", fixture: fx, hit: info.hit, normal: fx.zone.normal, u: info.u };
      }
    }
    for (const bot of beerBottles) {
      if (bot.broken || !bot.zone) continue;
      const info = hitSphereSegment(prev, tr.mesh.position, bot.zone.center, bot.zone.radius);
      if (info && (!best || info.u < best.u)) {
        best = { kind: "bottle", bottle: bot, hit: info.hit, normal: info.normal, u: info.u };
      }
    }
    const env = hitEnvironmentSegment(prev, tr.mesh.position);
    if (env && (!best || env.u < best.u)) {
      const fx = env.object && env.object.userData && env.object.userData.floodFixture;
      if (fx && !fx.shotOut) {
        best = { kind: "flood", fixture: fx, hit: env.hit, normal: env.normal, u: env.u };
      } else {
        best = { kind: "env", hit: env.hit, normal: env.normal, u: env.u, surface: env.surface };
      }
    }
    if (best) {
      tr.hit = true;
      tr.life = TRACER_LINGER;
      tr.maxLife = TRACER_LINGER;
      tr.mesh.position.copy(best.hit);
      tr.mesh.scale.set(1.35, TRACER_SLUG_LEN / baseLen, 1.35);
      tr.mesh.material.opacity = 0.55;
      const bounced = trySpawnSpentSlugBounce(best.hit, best.normal, tr.vel, best.kind);
      const mark = bounced ? "scuff" : "punch";
      const plug = !bounced;
      if (best.kind === "circle") {
        flashTarget(best.target, best.hit);
        spawnImpactFX(best.hit, best.normal, mark, {
          paperTarget: true,
          parent: best.target.mesh,
          plug,
        });
      } else if (best.kind === "sil") {
        flashSilhouetteZone(best.sil, best.zone, best.hit);
        spawnImpactFX(best.hit, best.normal, mark, {
          parent: (best.sil.plates && best.sil.plates[best.zone.id]) || best.sil.group,
          plug,
        });
      } else if (best.kind === "berm") {
        flashBermPopupZone(best.fig, best.zone, best.hit);
        spawnImpactFX(best.hit, best.normal, mark, {
          parent: best.fig.group,
          bermPopup: best.fig,
          plug,
        });
      } else if (best.kind === "flood") {
        shootOutFlood(best.fixture, best.hit, best.normal);
      } else if (best.kind === "bottle") {
        breakBeerBottle(best.bottle, best.hit);
      } else {
        sfx.play("miss");
        spawnImpactFX(best.hit, best.normal, mark, { plug });
      }
    } else {
      // Speed/streak age, not the 180s countdown — stay readable; faint at long/slow.
      tr.mesh.material.opacity = Math.max(0.22, Math.min(0.82, 0.22 + speed * 0.0007));
    }
    if (tr.prev) tr.prev.copy(tr.mesh.position);
    else tr.prev = tr.mesh.position.clone();

    if (!tr.hit && (tr.life <= 0 || tr.mesh.position.y < -2.5)) {
      // Floor punch-through still scuffs + miss. Sky sanity timeout is silent (no fake impact).
      if (tr.mesh.position.y < FLOOR_Y) {
        sfx.play("miss");
        const ground = tr.mesh.position.clone();
        ground.y = FLOOR_Y;
        {
          const up = new THREE.Vector3(0, 1, 0);
          const bounced = trySpawnSpentSlugBounce(ground, up, tr.vel, "env");
          spawnImpactFX(ground, up, bounced ? "scuff" : "punch", { plug: !bounced });
        }
      }
      scene.remove(tr.mesh);
      tr.mesh.geometry.dispose();
      tr.mesh.material.dispose();
      tracers.splice(i, 1);
    }
  }
}

function vaultRootFor(obj) {
  let o = obj;
  let best = obj;
  while (o) {
    if (o.userData && o.userData.vaultable) best = o;
    o = o.parent;
  }
  return best;
}

function findVaultCandidate() {
  if (!camera || state.vaulting) return null;
  if (!gameplayActive()) return null;
  if (!document.pointerLockElement) return null;
  if (isAdsNow()) return null;
  const fx = -Math.sin(player.yaw);
  const fz = -Math.cos(player.yaw);
  _vaultFwd.set(fx, 0, fz);
  if (_vaultFwd.lengthSq() < 1e-8) return null;
  _vaultFwd.normalize();
  const chestY = lerp(player.supportY + 0.42, player.eyeCurrent, 0.28);
  _vaultOrigin.set(player.pos.x, chestY, player.pos.z);
  _raycaster.near = 0.05;
  _raycaster.far = VAULT_REACH;
  _raycaster.set(_vaultOrigin, _vaultFwd);
  const hits = _raycaster.intersectObjects(leanSolids, false);
  let hit = null;
  for (const h of hits) {
    if (h.distance < 0.06) continue;
    let o = h.object;
    let ok = false;
    while (o) {
      if (o.userData && o.userData.vaultable) { ok = true; break; }
      o = o.parent;
    }
    if (!ok) continue;
    hit = h;
    break;
  }
  if (!hit) return null;
  const root = vaultRootFor(hit.object);
  _vaultBox.setFromObject(root);
  const topY = _vaultBox.max.y;
  const topH = topY - player.supportY;
  // Height is measured from the current support (usually floor).
  const fromFloor = topY - FLOOR_Y;
  if (fromFloor < VAULT_MIN_H || fromFloor > VAULT_MAX_H) return null;
  const sizeX = _vaultBox.max.x - _vaultBox.min.x;
  const sizeZ = _vaultBox.max.z - _vaultBox.min.z;
  const thick = Math.min(sizeX, sizeZ);
  const overDist = clamp(thick * 0.55 + 0.32, 0.42, 1.05);
  const landX = hit.point.x + _vaultFwd.x * overDist;
  const landZ = hit.point.z + _vaultFwd.z * overDist;
  // Down probe: land on the surface we cleared if it is wide, else floor.
  _vaultOrigin.set(landX, topY + 0.85, landZ);
  _raycaster.near = 0;
  _raycaster.far = topY + 0.85 - (FLOOR_Y - 0.2);
  _raycaster.set(_vaultOrigin, _vaultDown);
  const downs = _raycaster.intersectObjects(leanSolids, false);
  let landSupport = FLOOR_Y;
  let landedOnTop = false;
  if (downs.length) {
    const d = downs[0];
    let dRoot = d.object;
    let dVault = false;
    while (dRoot) {
      if (dRoot.userData && dRoot.userData.vaultable) { dVault = true; break; }
      dRoot = dRoot.parent;
    }
    const hy = d.point.y;
    const hFromFloor = hy - FLOOR_Y;
    if (dVault && hFromFloor >= VAULT_MIN_H - 0.05 && hFromFloor <= VAULT_MAX_H + 0.15) {
      landSupport = hy;
      landedOnTop = true;
    } else if (!dVault && hFromFloor > 1.3) {
      // Tall non-vaultable (bay wall / berm) — abort.
      return null;
    }
  }
  const lipY = topY + 0.16;
  return {
    hit,
    root,
    landX,
    landZ,
    landSupport,
    lipY,
    landedOnTop,
    dist: hit.distance,
  };
}

function startVault(cand) {
  if (!cand || state.vaulting) return;
  state.vaulting = true;
  state.vaultT = 0;
  state.vaultDur = 0.34 + Math.min(0.08, cand.dist * 0.04);
  state.vaultFrom = new THREE.Vector3(player.pos.x, player.eyeCurrent, player.pos.z);
  state.vaultLip = new THREE.Vector3(
    lerp(player.pos.x, cand.landX, 0.42),
    cand.lipY,
    lerp(player.pos.z, cand.landZ, 0.42)
  );
  const landEye = cand.landSupport + (player.eyeHeight - FLOOR_Y);
  state.vaultTo = new THREE.Vector3(cand.landX, landEye, cand.landZ);
  state.vaultSupportTo = cand.landSupport;
  state.sliding = false;
  player.velX = 0;
  player.velZ = 0;
  state.spaceHoldT = 0;
  // Stand up through the vault; crouch restores after if Z still held.
  setCrouchGrad(0, { remember: false });
}

function finishVault() {
  player.pos.x = state.vaultTo.x;
  player.pos.z = state.vaultTo.z;
  player.supportY = state.vaultSupportTo;
  player.eyeCurrent = state.vaultTo.y;
  state.vaulting = false;
  state.vaultT = 0;
  // Resume crouch only if Z still held (C toggle was cleared on start).
  if (input.crouchHold) {
    state.crouchToggled = false;
    setCrouchGrad(state.crouchLastDepth > 0.05 ? state.crouchLastDepth : 1);
  } else {
    setCrouchGrad(0, { remember: false });
  }
}

function updateVault(dt) {
  if (!state.vaulting) return false;
  state.vaultT += dt;
  const u = clamp(state.vaultT / Math.max(0.12, state.vaultDur), 0, 1);
  const s = smooth01(u);
  const from = state.vaultFrom;
  const lip = state.vaultLip;
  const to = state.vaultTo;
  let x, y, z;
  if (u < 0.38) {
    const t = smooth01(u / 0.38);
    x = lerp(from.x, lip.x, t);
    z = lerp(from.z, lip.z, t);
    y = lerp(from.y, lip.y, t);
  } else if (u < 0.72) {
    const t = smooth01((u - 0.38) / 0.34);
    x = lerp(lip.x, lerp(lip.x, to.x, 0.7), t);
    z = lerp(lip.z, lerp(lip.z, to.z, 0.7), t);
    y = lerp(lip.y, lerp(lip.y, to.y, 0.15), t);
  } else {
    const t = smooth01((u - 0.72) / 0.28);
    x = lerp(lerp(lip.x, to.x, 0.7), to.x, t);
    z = lerp(lerp(lip.z, to.z, 0.7), to.z, t);
    y = lerp(lerp(lip.y, to.y, 0.15), to.y, t);
  }
  // Small dip then recover — not a cartoon hop.
  const dip = -0.045 * Math.sin(Math.PI * s);
  player.pos.x = x;
  player.pos.z = z;
  player.pos.x = clamp(player.pos.x, -10, 10);
  player.pos.z = clamp(player.pos.z, rangeZ(412), SPAWN_Z + 1.5);
  player.eyeCurrent = y + dip;
  player.supportY = lerp(FLOOR_Y, state.vaultSupportTo, s);
  player.planarSpeed = 2.4;
  if (u >= 1) finishVault();
  return true;
}

function startSlide() {
  if (state.sliding || state.vaulting || isAdsNow()) return;
  if (!gameplayActive()) return;
  state.sliding = true;
  state.slideT = 0;
  state.slideDur = 0.88;
  state.slideFx = -Math.sin(player.yaw);
  state.slideFz = -Math.cos(player.yaw);
  if (input.left && !input.right) {
    // slight steer from strafe at start
    const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
    state.slideFx -= rx * 0.25;
    state.slideFz -= rz * 0.25;
  } else if (input.right && !input.left) {
    const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
    state.slideFx += rx * 0.25;
    state.slideFz += rz * 0.25;
  }
  const len = Math.hypot(state.slideFx, state.slideFz) || 1;
  state.slideFx /= len;
  state.slideFz /= len;
  state.slideSpeed = 9.6;
  setCrouchGrad(Math.max(state.crouchGrad, 0.88));
}

function updateSlide(dt) {
  if (!state.sliding) return false;
  state.slideT += dt;
  const u = state.slideT / state.slideDur;
  state.slideSpeed *= Math.exp(-1.2 * dt);
  player.velX = state.slideFx * state.slideSpeed;
  player.velZ = state.slideFz * state.slideSpeed;
  player.pos.x += player.velX * dt;
  player.pos.z += player.velZ * dt;
  player.pos.x = clamp(player.pos.x, -10, 10);
  player.pos.z = clamp(player.pos.z, rangeZ(412), SPAWN_Z + 1.5);
  player.planarSpeed = state.slideSpeed;
  if (u >= 1 || state.slideSpeed < 1.15) {
    state.sliding = false;
    // Keep leftover planar vel into walk instead of snapping to 3.2 / 0.
    // Stay crouched if C/Z still want it; else stand.
    if (!input.crouchHold && !state.crouchToggled) setCrouchGrad(0, { remember: true });
  }
  return true;
}

function updateSupport(dt) {
  if (state.vaulting) return;
  // Step off tables: if nothing vaultable under us, drop support back to floor.
  _vaultOrigin.set(player.pos.x, player.eyeCurrent + 0.1, player.pos.z);
  _raycaster.near = 0;
  _raycaster.far = (player.eyeCurrent + 0.1) - (FLOOR_Y - 0.15);
  _raycaster.set(_vaultOrigin, _vaultDown);
  const hits = _raycaster.intersectObjects(leanSolids, false);
  let want = FLOOR_Y;
  if (hits.length) {
    const h = hits[0];
    let o = h.object;
    let ok = false;
    while (o) {
      if (o.userData && o.userData.vaultable) { ok = true; break; }
      o = o.parent;
    }
    const hy = h.point.y;
    if (ok && (hy - FLOOR_Y) >= VAULT_MIN_H - 0.08 && (hy - FLOOR_Y) <= VAULT_MAX_H + 0.2) {
      want = hy;
    }
  }
  player.supportY = lerp(player.supportY, want, 1 - Math.exp(-10 * dt));
  if (Math.abs(player.supportY - want) < 0.01) player.supportY = want;
}

function updateVaultPrompt(baseText) {
  const prompt = el("equipPrompt");
  if (!prompt) return;
  const cand = state.lookVault;
  const showVault = !!(cand && gameplayActive() && !isAdsNow() && !state.vaulting);
  if (baseText) {
    prompt.hidden = false;
    prompt.textContent = showVault ? baseText + "  ·  [Hold Space] Vault" : baseText;
    return;
  }
  if (showVault) {
    prompt.hidden = false;
    prompt.textContent = "[Hold Space] Vault";
  } else if (!state.lookPickup) {
    prompt.hidden = true;
  }
}

function updatePlayer(dt) {
  // Analog crouch (C toggle / Z hold / wheel). No Ctrl — browsers steal it.
  // Z hold: press from stand goes to last depth; release stands unless C is latched.
  if (input.crouchHold && state.crouchGrad < 0.04 && !state.vaulting) {
    setCrouchGrad(state.crouchLastDepth > 0.05 ? state.crouchLastDepth : 1);
  }
  if (!input.crouchHold && !state.crouchToggled && !state.sliding && !state.vaulting) {
    // Wheel-sticky crouch stays; Z-release stands only if Z was the latch.
    // (Z-up handler zeros grad when not C-toggled.)
  }
  const crouchBusy = state.crouchGrad > 0.04 || input.crouchHold || state.crouchToggled || state.sliding;
  const sprintingNow = input.sprint && !crouchBusy && !state.sliding && !state.vaulting;

  // ADS factor spring (RMB hold). Sprint interrupts — high-ready wins until sprintHoldT dies.
  if (!state.adsPreview) {
    const adsSpeed = 8;
    const sprintBlock = sprintingNow || (state.sprintHoldT || 0) > 0.04;
    state.adsTarget = (input.ads && !sprintBlock && !state.handsEmpty) ? 1 : 0;
    state.adsFactor = lerp(state.adsFactor, state.adsTarget, 1 - Math.exp(-adsSpeed * dt));
    if (Math.abs(state.adsFactor - state.adsTarget) < 0.001) state.adsFactor = state.adsTarget;
  } else {
    state.adsFactor = 1;
  }
  let eyeTarget = lerp(standEyeWorld(), sitEyeWorld(), clamp(state.crouchGrad, 0, 1));
  if (state.sliding) eyeTarget -= 0.05 * (1 - clamp(state.slideT / state.slideDur, 0, 1));

  // Hold-Space vault charge (not ADS). Tap does nothing (jump reserved).
  if (gameplayActive() && !state.vaulting) {
    state.lookVault = findVaultCandidate();
    if (input.spaceDown && isAdsNow()) {
      input.holdBreath = true;
    } else if (input.spaceDown && !isAdsNow()) {
      input.holdBreath = false;
      if (state.lookVault && hasFwdIntent()) {
        state.spaceHoldT += dt;
        if (state.spaceHoldT >= VAULT_HOLD_SEC) startVault(state.lookVault);
      } else {
        state.spaceHoldT = 0;
      }
    } else if (!isAdsNow()) {
      state.spaceHoldT = 0;
    }
    // Optional auto-vault: sprint into a close lip.
    if (!state.vaulting && state.lookVault && input.sprint && input.forward && !isAdsNow()
        && state.lookVault.dist < 0.52 && player.fwdIntent > 0.22) {
      startVault(state.lookVault);
    }
  } else if (!state.vaulting) {
    state.lookVault = null;
  }

  const vaultingNow = updateVault(dt);
  if (!vaultingNow) updateSlide(dt);
  if (!vaultingNow) updateSupport(dt);

  if (!state.vaulting) {
    player.eyeCurrent = lerp(player.eyeCurrent, eyeTarget, 1 - Math.exp(-12 * dt));
    if (Math.abs(player.eyeCurrent - eyeTarget) < 0.0005) player.eyeCurrent = eyeTarget;
  }
  player.pos.y = standEyeWorld();

  // Lean spring toward ±leanMax while Q/E held — clamped so camera cannot clip solids
  // (probe uses eyeCurrent so crouch lean height stays honest)
  let leanDesired = 0;
  if (input.leanLeft && !input.leanRight) leanDesired = player.leanMax;
  else if (input.leanRight && !input.leanLeft) leanDesired = -player.leanMax;
  player.leanTarget = clampLeanTarget(leanDesired);
  player.leanAngle = lerp(player.leanAngle, player.leanTarget, 1 - Math.exp(-player.leanSpring * dt));
  if (Math.abs(player.leanAngle) > 1e-4) {
    const maxAbs = Math.abs(clampLeanTarget(Math.sign(player.leanAngle) * player.leanMax));
    if (Math.abs(player.leanAngle) > maxAbs) {
      player.leanAngle = Math.sign(player.leanAngle) * maxAbs;
    }
  }

  // Movement on XZ (vault/slide own their translation). Accel toward wish; friction when no input.
  let mx = 0, mz = 0;
  if (gameplayActive() && !state.vaulting && !state.sliding) {
    if (input.forward) mz -= 1;
    if (input.back) mz += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
  }
  const moving = Math.abs(mx) + Math.abs(mz) > 0 || state.sliding;
  const sprinting = input.sprint && !crouchBusy && !state.sliding && !state.vaulting;
  const sprintPose = sprinting ? 1 : 0;
  state.sprintHoldT = lerp(state.sprintHoldT || 0, sprintPose, 1 - Math.exp(-9 * dt));
  if (Math.abs(state.sprintHoldT - sprintPose) < 0.001) state.sprintHoldT = sprintPose;
  if (!state.vaulting && !state.sliding) {
    const len = Math.hypot(mx, mz);
    if (len > 0 && gameplayActive()) {
      mx /= len; mz /= len;
      let speed = player.moveSpeed;
      if (state.crouchGrad > 0.3 || input.crouchHold) speed *= player.crouchSpeedMul;
      else if (sprinting) speed *= player.sprintMul;
      const cy = Math.cos(player.yaw), sy = Math.sin(player.yaw);
      const wishX = (mx * cy + mz * sy) * speed;
      const wishZ = (-mx * sy + mz * cy) * speed;
      const a = 1 - Math.exp(-player.moveAccel * dt);
      player.velX = lerp(player.velX, wishX, a);
      player.velZ = lerp(player.velZ, wishZ, a);
    } else {
      const f = Math.exp(-player.moveFriction * dt);
      player.velX *= f;
      player.velZ *= f;
      if (Math.hypot(player.velX, player.velZ) < 0.05) {
        player.velX = 0;
        player.velZ = 0;
      }
    }
    player.pos.x += player.velX * dt;
    player.pos.z += player.velZ * dt;
    player.pos.x = clamp(player.pos.x, -10, 10);
    player.pos.z = clamp(player.pos.z, rangeZ(412), SPAWN_Z + 1.5);
    player.planarSpeed = Math.hypot(player.velX, player.velZ);
  }
  if (input.forward && gameplayActive()) player.fwdIntent = Math.min(1.2, player.fwdIntent + dt);
  else player.fwdIntent = Math.max(0, player.fwdIntent - dt * 2.4);

  // Sprint + crouch rising edge → power slide
  if (gameplayActive() && !state.vaulting && !state.sliding) {
    const wantCrouch = state.crouchGrad > 0.2 || input.crouchHold || state.crouchToggled;
    if (player.wasSprint && wantCrouch && !player.wasCrouched) startSlide();
    player.wasSprint = !!(input.sprint && (moving || input.forward) && !wantCrouch);
    player.wasCrouched = wantCrouch;
  }

  // View bob
  const bobAmp = (moving && !state.vaulting) ? (sprinting ? 0.025 : (state.sliding ? 0.008 : 0.014)) : 0;
  player.bobPhase += dt * (moving && !state.vaulting ? (sprinting ? 12 : 8) : 0);
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
  playerRoot.rotation.y = player.yaw + (player.camRecoilY || 0);
  playerRoot.rotation.x = 0;
  playerRoot.rotation.z = 0;
  camera.rotation.order = "YXZ";
  camera.rotation.x = clamp(player.pitch + (player.camRecoilP || 0), -1.2, 1.2);
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

  // Muzzle flash — per-shot burst; fade/scale only (no rotor spin)
  if (muzzleFlash) {
    const now = performance.now();
    const on = now < player.flashUntil;
    muzzleFlash.visible = on;
    if (on) {
      const ud = muzzleFlash.userData;
      if (ud.settleRate) muzzleFlash.rotation.z += ud.settleRate * dt;
      const flashMs = ud.flashMs || MUZZLE_FLASH_MS;
      const remain = Math.max(0, player.flashUntil - now) / flashMs;
      const base = ud.flashScale || 1;
      const shot = ud.shotScale || 1;
      const canMul = suppressorMounted() ? 0.42 : 1;
      const sc = base * shot * canMul * (1.05 + 0.95 * remain);
      muzzleFlash.scale.setScalar(sc);
    } else {
      muzzleFlash.scale.setScalar(muzzleFlash.userData.flashScale || 1);
    }
  }

  if (player.fireCooldown > 0) player.fireCooldown -= dt;
  if (isAutoFire() && input.shoot && !state.handsEmpty && !state.reloading && state.ammoInMag > 0) {
    fireWeapon({ fromHold: true });
  }

  updateReload(dt);
  updateBoltCycle(dt);
  updateHoldBreath(dt);
  updatePickupHover();
  syncAdsSlider();
  applyHoldToScene();
  applySwayAndRecoil(dt, moving);
  updateAimBoreRays();
  updateHobReadout();
  updateTracers(dt);
  updateCasings(dt);
  updateWorldDrops(dt);
  updateSpentSlugs(dt);
  updateGlassShards(dt);
  updateImpactFX(dt);
  updateFloodDeaths(dt);
  updateBulbSparks(dt);
  tickBarrelHeat(dt);
  updateSilhouettes(dt);
  updateBermPopups(dt);
  updateScorePopups(dt);
  applyFxDrawDistances();
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

function isPickupNode(o) {
  if (!o || !o.userData) return false;
  return !!(o.userData.opticId || o.userData.weaponId || o.userData.resetTargets
    || o.userData.magId || o.userData.suppressorWeaponId);
}

function updatePickupHover() {
  state.lookPickup = null;
  if (!pickups.length || !camera) return;
  _raycaster.setFromCamera(_ndc, camera);
  const hits = _raycaster.intersectObjects(pickups, true);
  let found = null;
  for (const h of hits) {
    let o = h.object;
    while (o && !isPickupNode(o)) o = o.parent;
    if (o && isPickupNode(o)) {
      // Wrong-gun mag/can: no highlight, skip (F no-ops). Optics stay lookable.
      if ((o.userData.magId || o.userData.suppressorWeaponId) && !pickupCompatible(o)) continue;
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
    if (p.userData.worldDrop) return;
    if (p.userData.resetTargets) {
      p.position.y = p.userData.baseY + (active ? 0.008 : 0);
      if (p.userData.buttonMesh) p.userData.buttonMesh.position.y = active ? 0.03 : 0.042;
    } else {
      p.position.y = p.userData.baseY + (active ? 0.02 : 0);
      if (!p.userData.weaponId) p.rotation.y += active ? 0.02 : 0.005;
    }
  });
  state.lookPickup = found;
  updateEquipPrompt();
}

function updateEquipPrompt() {
  const prompt = el("equipPrompt");
  if (!prompt) return;
  if (state.lookPickup && gameplayActive()) {
    const pu = state.lookPickup.userData;
    const label = pu.label;
    prompt.hidden = false;
    if (pu.resetTargets) {
      updateVaultPrompt("[F] Reset targets  ·  click to reset");
      return;
    }
    if (pu.droppedLoadout) {
      if (state.handsEmpty) {
        updateVaultPrompt(`[F] Pick up ${label}  ·  click to pick up`);
      } else {
        updateVaultPrompt(`[F] Swap for ${label}  ·  click to swap`);
      }
    } else if (pu.weaponId) {
      const equipped = !state.handsEmpty && state.weaponId === pu.weaponId;
      if (equipped) {
        updateVaultPrompt(`Looking at ${label} (equipped)`);
      } else {
        updateVaultPrompt(`[F] Equip ${label}  ·  click to equip`);
      }
    } else if (pu.magId) {
      const seated = currentMagId() === pu.magId;
      if (seated) {
        updateVaultPrompt(`Looking at ${label} (seated)`);
      } else {
        updateVaultPrompt(`[F] Seat ${label}  ·  click to seat`);
      }
    } else if (pu.suppressorWeaponId) {
      const on = suppressorMounted(pu.suppressorWeaponId);
      if (on) {
        updateVaultPrompt(`[F] Unmount ${label}  ·  click to unmount`);
      } else {
        updateVaultPrompt(`[F] Mount ${label}  ·  click to mount`);
      }
    } else {
      const id = pu.opticId;
      const equipped = state.optic === id;
      const allowed = weaponAllowsOptic(id);
      if (!allowed) {
        const w = (WEAPON_META[state.weaponId] && WEAPON_META[state.weaponId].label) || state.weaponId;
        updateVaultPrompt(`${label} — not available on ${w}`);
      } else if (equipped) {
        updateVaultPrompt(`Looking at ${label} (equipped)`);
      } else {
        updateVaultPrompt(`[F] Attach ${label}  ·  click to equip`);
      }
    }
  } else {
    updateVaultPrompt(null);
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
    hint.innerHTML = `Settings open — <kbd>O</kbd> / Esc close`;
  } else if (state.panelOpen) {
    hint.innerHTML = `Debugger open — <kbd>\`</kbd> close · <kbd>G</kbd> guns · <kbd>O</kbd> settings`;
  } else {
    hint.innerHTML = `<kbd>\`</kbd> Debugger · <kbd>O</kbd> Settings · <kbd>C</kbd>/<kbd>Z</kbd> crouch · wheel height · WASD · mouse look · <kbd>Q</kbd>/<kbd>E</kbd> lean · <kbd>U</kbd> cycle hold · <kbd>F</kbd> bench / world kit · <kbd>X</kbd> drop kit · RMB ADS · hold Space vault (ADS: breath) · LMB fire · <kbd>B</kbd> fire mode · <kbd>R</kbd> reload · <kbd>G</kbd> guns`;
  }
}

function tryEquipLooked() {
  if (!state.lookPickup) return;
  const pu = state.lookPickup.userData;
  if (pu.resetTargets) {
    resetRangeTargets();
    return;
  }
  if (pu.droppedLoadout) {
    pickupWorldDrop(state.lookPickup);
    return;
  }
  if (pu.weaponId) {
    if (!state.handsEmpty && state.weaponId === pu.weaponId) {
      showToast((pu.label || pu.weaponId) + " already equipped");
      return;
    }
    equipWeapon(pu.weaponId);
    return;
  }
  if (state.handsEmpty) return;
  if (pu.magId) {
    equipMag(pu.magId);
    return;
  }
  if (pu.suppressorWeaponId) {
    toggleSuppressor(pu.suppressorWeaponId);
    return;
  }
  const id = pu.opticId;
  if (!id) return;
  if (!weaponAllowsOptic(id)) {
    const w = (WEAPON_META[state.weaponId] && WEAPON_META[state.weaponId].label) || state.weaponId;
    showToast((OPTIC_LABELS[id] || id) + " not available on " + w, true);
    return;
  }
  setOptic(id);
}

function fireFlash() {
  rollMuzzleBurst();
}


/* ---- Debugger performance overlay ---- */
const PERF_WINDOW_SEC = 0.35;
let _perfMeshes = 0;
let _perfAcc = 0;
let _perfFrames = 0;
let _perfFps = 0;
let _perfMs = 0;
let _perfNodes = null;

function perfNodes() {
  if (_perfNodes) return _perfNodes;
  _perfNodes = {
    root: el("perfOverlay"),
    fps: el("perfFps"),
    ms: el("perfMs"),
    meshes: el("perfMeshes"),
    decals: el("perfDecals"),
    shells: el("perfShells"),
    slugs: el("perfSlugs"),
  };
  return _perfNodes;
}

function perfTint(fps) {
  if (fps < 30) return "#ff4444";
  if (fps < 60) return "#ff8c00";
  if (fps > 75) return "#6ea8ff";
  return "#ffffff";
}

function setPerfOverlay(on, { toast = false } = {}) {
  const next = !!on;
  const changed = state.showPerf !== next;
  state.showPerf = next;
  const n = perfNodes();
  if (n.root) {
    n.root.hidden = !state.showPerf;
    n.root.setAttribute("aria-hidden", state.showPerf ? "false" : "true");
  }
  const btn = el("btnPerf");
  if (btn) btn.setAttribute("aria-pressed", state.showPerf ? "true" : "false");
  if (!state.showPerf) {
    _perfAcc = 0;
    _perfFrames = 0;
  }
  if (toast) showToast(state.showPerf ? "Perf overlay ON" : "Perf overlay OFF");
  if (changed) scheduleSaveSettings();
}

function snapshotPerfMeshes() {
  if (!state.showPerf || !renderer || !renderer.info || !renderer.info.render) return;
  _perfMeshes += renderer.info.render.calls | 0;
}

function updatePerfOverlay(rawDt) {
  if (!state.showPerf) return;
  const n = perfNodes();
  if (!n.root) return;
  const dt = Number(rawDt);
  if (Number.isFinite(dt) && dt > 0) {
    _perfAcc += dt;
    _perfFrames += 1;
    if (_perfAcc >= PERF_WINDOW_SEC) {
      _perfMs = (_perfAcc / _perfFrames) * 1000;
      _perfFps = 1000 / _perfMs;
      _perfAcc = 0;
      _perfFrames = 0;
      const tint = perfTint(_perfFps);
      if (n.fps) {
        n.fps.textContent = _perfFps.toFixed(0);
        n.fps.style.color = tint;
      }
      if (n.ms) {
        n.ms.textContent = _perfMs.toFixed(1);
        n.ms.style.color = tint;
      }
    }
  }
  if (n.meshes) n.meshes.textContent = String(_perfMeshes);
  if (n.decals) n.decals.textContent = String(impactDecals.length + paperDecals.length);
  if (n.shells) n.shells.textContent = String(casings.length);
  if (n.slugs) n.slugs.textContent = String(spentSlugs.length);
}

function animate() {
  requestAnimationFrame(animate);
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  updatePlayer(dt);
  updateKeyLightShadow();
  updateSkyDome(dt);
  renderScene();
  updatePerfOverlay(rawDt);
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
      if (state.crouchGrad < 0.04 && !state.vaulting) {
        setCrouchGrad(state.crouchLastDepth > 0.05 ? state.crouchLastDepth : 1);
      }
      e.preventDefault();
    }
    if ((k === "c" || k === "C") && !e.repeat) {
      if (state.crouchToggled) {
        state.crouchToggled = false;
        setCrouchGrad(0, { remember: true });
      } else {
        state.crouchToggled = true;
        const depth = state.crouchGrad > 0.05 ? state.crouchGrad : (state.crouchLastDepth > 0.05 ? state.crouchLastDepth : 1);
        setCrouchGrad(depth);
      }
      e.preventDefault();
    }
    if (code === "KeyQ") input.leanLeft = true;
    if (code === "KeyE") input.leanRight = true;
    if ((k === "u" || k === "U") && !e.repeat) {
      cycleHomeHold();
      e.preventDefault();
    }
    if (k === " " || code === "Space") {
      input.spaceDown = true;
      if (isAdsNow() && !state.vaulting) input.holdBreath = true;
      else input.holdBreath = false;
      e.preventDefault();
    }
    // F = bench + world kit pickup; X = drop held kit; E is lean only; G remains gun dialog backup
    if ((k === "f" || k === "F") && !e.repeat) {
      if (state.lookPickup) tryEquipLooked();
      e.preventDefault();
    }
    if ((k === "x" || k === "X") && !e.repeat) {
      dropHeldWeapon();
      e.preventDefault();
    }
    if ((k === "r" || k === "R") && !e.repeat) {
      beginReload();
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
      toggleFireMode();
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
  if (code === "KeyZ") {
    input.crouchHold = false;
    if (!state.crouchToggled && !state.vaulting && !state.sliding) {
      setCrouchGrad(0, { remember: true });
    }
  }
  if (code === "KeyQ") input.leanLeft = false;
  if (code === "KeyE") input.leanRight = false;
  if (code === "Space") {
    input.holdBreath = false;
    input.spaceDown = false;
    state.spaceHoldT = 0;
  }
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
    if (state.lookPickup) {
      tryEquipLooked();
      return;
    }
    input.shoot = true;
    fireWeapon();
  }
}

function onMouseUp(e) {
  if (e.button === 2) {
    input.ads = false;
    e.preventDefault();
  }
  if (e.button === 0) input.shoot = false;
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
  if (state.vaulting) adsMul *= 0.35;
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
      input.shoot = false;
      input.leanLeft = input.leanRight = false;
      input.holdBreath = false;
      input.crouchHold = false;
      input.spaceDown = false;
      state.spaceHoldT = 0;
    }
  });
}

function onWheel(e) {
  if (!gameplayActive() || !document.pointerLockElement) return;
  e.preventDefault();
  if (state.vaulting) return;
  const down = e.deltaY > 0;
  const mag = Math.abs(e.deltaY);
  const notches = mag > 180 ? 2 : 1;
  const step = 0.14 * notches;
  const next = state.crouchGrad + (down ? step : -step);
  if (next > 0.02) state.crouchToggled = false; // analog path; C latch not required
  setCrouchGrad(next);
  if (input.crouchHold && state.crouchGrad > 0.04) {
    // wheel while Z held changes hold depth
  }
}

function bind() {
  buildWeaponSelect();
  buildPoseSelect();
  buildAttSelect();
  buildOpticSelect();
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
  const perfBtn = el("btnPerf");
  if (perfBtn) {
    perfBtn.onclick = () => setPerfOverlay(!state.showPerf, { toast: true });
  }
  setPerfOverlay(!!state.showPerf, { toast: false });
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
  const btnSettingsReset = el("btnSettingsReset");
  if (btnSettingsReset) btnSettingsReset.onclick = () => resetSettingsToShipped();
  const btnSettingsCopy = el("btnSettingsCopy");
  if (btnSettingsCopy) btnSettingsCopy.onclick = () => copySettingsJson();
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
      scheduleSaveSettings();
    };
  }
  const adsMulSlider = el("adsLookMulSlider");
  if (adsMulSlider) {
    adsMulSlider.oninput = (e) => {
      const pct = parseFloat(e.target.value) || 100;
      player.adsLookMul = ADS_LOOK_MUL_BASE * (pct / 100);
      const adsVal = el("adsLookMulVal");
      if (adsVal) adsVal.textContent = `${player.adsLookMul.toFixed(2)}×`;
      scheduleSaveSettings();
    };
  }
  const adsDofTapsSlider = el("adsDofTapsSlider");
  if (adsDofTapsSlider) {
    adsDofTapsSlider.value = String(state.adsDofTaps);
    adsDofTapsSlider.oninput = (e) => setAdsDofTaps(e.target.value);
  }
  const adsDofRadiusSlider = el("adsDofRadiusSlider");
  if (adsDofRadiusSlider) {
    adsDofRadiusSlider.value = String(state.adsDofRadius);
    adsDofRadiusSlider.oninput = (e) => setAdsDofRadius(e.target.value);
  }
  syncAdsDofUI();
  const crouchSlider = el("crouchHeightSlider");
  if (crouchSlider) {
    crouchSlider.oninput = (e) => {
      const pct = clamp(parseFloat(e.target.value) || 0, 0, 100);
      const g = pct / 100;
      state.crouchToggled = g > 0.04;
      setCrouchGrad(g);
    };
    syncCrouchSlider();
  }

  const camNearSlider = el("camNearSlider");
  const camNearInput = el("camNearInput");
  if (camNearSlider) {
    camNearSlider.oninput = (e) => setCamNear(e.target.value);
  }
  if (camNearInput) {
    camNearInput.onchange = (e) => setCamNear(e.target.value, { toast: true });
  }
  const camFarSlider = el("camFarSlider");
  const camFarInput = el("camFarInput");
  if (camFarSlider) {
    camFarSlider.oninput = (e) => setCamFar(e.target.value);
  }
  if (camFarInput) {
    camFarInput.onchange = (e) => setCamFar(e.target.value, { toast: true });
  }

  const chkFog = el("chkFog");
  if (chkFog) {
    chkFog.checked = state.fogEnabled;
    chkFog.onchange = (e) => setFogEnabled(e.target.checked, { toast: true });
  }
  const fogNearSlider = el("fogNearSlider");
  if (fogNearSlider) {
    fogNearSlider.oninput = (e) => setFogNear(e.target.value);
  }
  const fogFarSlider = el("fogFarSlider");
  if (fogFarSlider) {
    fogFarSlider.oninput = (e) => setFogFar(e.target.value);
  }

  const brightnessSlider = el("brightnessSlider");
  if (brightnessSlider) {
    brightnessSlider.oninput = (e) => setBrightness(e.target.value);
  }
  const gammaSlider = el("gammaSlider");
  if (gammaSlider) {
    gammaSlider.oninput = (e) => setGamma(e.target.value);
  }
  const chkPluge = el("chkPluge");
  if (chkPluge) {
    chkPluge.checked = state.showPluge;
    chkPluge.onchange = (e) => setPluge(e.target.checked, { toast: true });
  }
  const todSlider = el("todSlider");
  if (todSlider) {
    todSlider.value = String(state.timeOfDay);
    todSlider.oninput = (e) => setTimeOfDay(e.target.value);
  }
  const todVal = el("todVal");
  if (todVal) todVal.textContent = formatClock(state.timeOfDay);

  const godRaysSlider = el("godRaysSlider");
  if (godRaysSlider) {
    godRaysSlider.value = String(state.godRays);
    godRaysSlider.oninput = (e) => setGodRays(e.target.value);
  }
  syncGodRaysUI();

  const bloomSlider = el("bloomSlider");
  if (bloomSlider) {
    bloomSlider.value = String(state.bloom);
    bloomSlider.oninput = (e) => setBloom(e.target.value);
  }
  syncBloomUI();
  const ditherSlider = el("ditherSlider");
  if (ditherSlider) {
    ditherSlider.value = String(ditherAmount());
    ditherSlider.oninput = (e) => setDither(e.target.value);
  }
  const ditherScaleSlider = el("ditherScaleSlider");
  if (ditherScaleSlider) {
    ditherScaleSlider.oninput = (e) => setDitherScale(e.target.value);
  }
  const ditherOffXSlider = el("ditherOffXSlider");
  if (ditherOffXSlider) {
    ditherOffXSlider.oninput = (e) => setDitherOffX(e.target.value);
  }
  const ditherOffYSlider = el("ditherOffYSlider");
  if (ditherOffYSlider) {
    ditherOffYSlider.oninput = (e) => setDitherOffY(e.target.value);
  }
  const ditherTypeSelect = el("ditherTypeSelect");
  if (ditherTypeSelect) {
    ditherTypeSelect.onchange = (e) => setDitherType(e.target.value, { toast: true });
  }
  const chkDitherAnimate = el("chkDitherAnimate");
  if (chkDitherAnimate) {
    chkDitherAnimate.onchange = (e) => setDitherAnimate(e.target.checked, { toast: true });
  }
  syncDitherUI();
  const barrelHeatSlider = el("barrelHeatSlider");
  if (barrelHeatSlider) {
    barrelHeatSlider.value = String(state.barrelHeat);
    barrelHeatSlider.oninput = (e) => setBarrelHeat(e.target.value);
  }
  syncBarrelHeatUI();
  const heatHazeStrengthSlider = el("heatHazeStrengthSlider");
  if (heatHazeStrengthSlider) {
    heatHazeStrengthSlider.value = String(state.heatHazeStrength);
    heatHazeStrengthSlider.oninput = (e) => setHeatHazeStrength(e.target.value);
  }
  const heatHazeSizeSlider = el("heatHazeSizeSlider");
  if (heatHazeSizeSlider) {
    heatHazeSizeSlider.value = String(state.heatHazeSize);
    heatHazeSizeSlider.oninput = (e) => setHeatHazeSize(e.target.value);
  }
  const chkGroundHeatHaze = el("chkGroundHeatHaze");
  if (chkGroundHeatHaze) {
    chkGroundHeatHaze.checked = !!state.groundHeatHaze;
    chkGroundHeatHaze.onchange = (e) => setGroundHeatHaze(e.target.checked, { toast: true });
  }
  syncHeatHazeUI();
  syncBuildStamp();
  const sunSizeSlider = el("sunSizeSlider");
  if (sunSizeSlider) {
    sunSizeSlider.value = String(state.sunSize);
    sunSizeSlider.oninput = (e) => setSunSize(e.target.value);
  }
  syncSunSizeUI();

  const sunPunchSlider = el("sunPunchSlider");
  if (sunPunchSlider) {
    sunPunchSlider.value = String(state.sunPunch);
    sunPunchSlider.oninput = (e) => setSunPunch(e.target.value);
  }
  syncSunPunchUI();


  const cloudsSlider = el("cloudsSlider");
  if (cloudsSlider) {
    cloudsSlider.value = String(state.clouds);
    cloudsSlider.oninput = (e) => setClouds(e.target.value);
  }
  syncCloudsUI();

  const concreteWearSlider = el("concreteWearSlider");
  if (concreteWearSlider) {
    concreteWearSlider.value = String(state.concreteWear);
    concreteWearSlider.oninput = (e) => setConcreteWear(e.target.value);
  }
  syncConcreteWearUI();
  const concreteScaleSlider = el("concreteScaleSlider");
  if (concreteScaleSlider) {
    concreteScaleSlider.value = String(state.concreteScale);
    concreteScaleSlider.oninput = (e) => setConcreteScale(e.target.value);
  }
  syncConcreteScaleUI();
  const concreteVarSlider = el("concreteVarSlider");
  if (concreteVarSlider) {
    concreteVarSlider.value = String(state.concreteVar);
    concreteVarSlider.oninput = (e) => setConcreteVar(e.target.value);
  }
  syncConcreteVarUI();

  Object.keys(LIGHT_MUL_UI).forEach((key) => {
    const meta = LIGHT_MUL_UI[key];
    const slider = el(meta.slider);
    if (!slider) return;
    slider.value = String(state[key] ?? 1);
    slider.oninput = (e) => setLightMul(key, e.target.value);
    syncLightMulUI(key);
  });

  const holeCapSlider = el("holeCapSlider");
  if (holeCapSlider) holeCapSlider.oninput = (e) => setHoleCap(e.target.value);
  const casingCapSlider = el("casingCapSlider");
  if (casingCapSlider) casingCapSlider.oninput = (e) => setCasingCap(e.target.value);
  const holeFadeSlider = el("holeFadeSlider");
  if (holeFadeSlider) holeFadeSlider.oninput = (e) => setHoleFade(e.target.value);
  const casingFadeSlider = el("casingFadeSlider");
  if (casingFadeSlider) casingFadeSlider.oninput = (e) => setCasingFade(e.target.value);
  const casingDrawSlider = el("casingDrawSlider");
  if (casingDrawSlider) casingDrawSlider.oninput = (e) => setCasingDraw(e.target.value);
  const decalDrawSlider = el("decalDrawSlider");
  if (decalDrawSlider) decalDrawSlider.oninput = (e) => setDecalDraw(e.target.value);
  syncFxSettingsUI();

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("wheel", onWheel, { passive: false });
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
  syncAmmoForLoadout({ refill: true });
  if (!state.heldInstanceId) state.heldInstanceId = mintInstanceId();
  updateFireModeHud();
  updateHudHint();
  syncSettingsUI();
  initThree();
  refresh();
}

bind();
