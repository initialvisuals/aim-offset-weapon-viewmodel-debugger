/**
 * Portable viewmodel / aim-offset math reference.
 * No engine deps. Port freely to C#, C++, Rust, etc.
 *
 * Conventions:
 * - Positions in viewmodel/camera local space.
 * - Euler angles in radians (rotX, rotY, rotZ) — axis meaning is your project contract.
 * - Missing rotY defaults to PI/2; missing rotX/rotZ default to 0.
 */

export type Vec3 = { x: number; y: number; z: number };

export type PoseOffset = {
  x: number;
  y: number;
  z: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
};

export type WeaponOffsetConfig = {
  schema_version: number;
  weapon: string;
  hip: PoseOffset;
  ads: PoseOffset;
  ads_holo?: PoseOffset;
  ads_acog?: PoseOffset;
  ads_sniper_scope?: PoseOffset;
};

export type AdsOpticProfile = "iron" | "holo" | "acog" | "sniper_scope";

export type ResolvedPose = {
  pos: Vec3;
  rot: Vec3; // radians, fully defaulted
};

export const PI_2 = Math.PI / 2;

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
}

/** Smoothstep on t in [0,1]. Optional ADS shaping. */
export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function resolvePose(p: PoseOffset): ResolvedPose {
  return {
    pos: { x: p.x, y: p.y, z: p.z },
    rot: {
      x: p.rotX ?? 0,
      y: p.rotY ?? PI_2,
      z: p.rotZ ?? 0,
    },
  };
}

/**
 * Optic ADS selection with fallback priority:
 * sniper → acog → holo → iron(ads)
 */
export function adsPose(
  cfg: WeaponOffsetConfig,
  profile: AdsOpticProfile
): PoseOffset {
  const iron = cfg.ads;
  switch (profile) {
    case "sniper_scope":
      return (
        cfg.ads_sniper_scope ?? cfg.ads_acog ?? cfg.ads_holo ?? iron
      );
    case "acog":
      return cfg.ads_acog ?? cfg.ads_holo ?? iron;
    case "holo":
      return cfg.ads_holo ?? iron;
    case "iron":
    default:
      return iron;
  }
}

/** Authored hold pose at ADS blend t. Euler component lerp. */
export function blendHoldPoseEuler(
  cfg: WeaponOffsetConfig,
  profile: AdsOpticProfile,
  adsFactor: number,
  ease: boolean = false
): ResolvedPose {
  let t = clamp(adsFactor, 0, 1);
  if (ease) t = smoothstep(t);

  const hip = resolvePose(cfg.hip);
  const ads = resolvePose(adsPose(cfg, profile));

  return {
    pos: lerpVec3(hip.pos, ads.pos, t),
    rot: lerpVec3(hip.rot, ads.rot, t),
  };
}

export type Quat = { x: number; y: number; z: number; w: number };

export function quatDot(a: Quat, b: Quat): number {
  return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
}

export function quatNormalize(q: Quat): Quat {
  const n = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };
}

/** Shortest-arc slerp. */
export function slerp(a: Quat, b: Quat, t: number): Quat {
  let q1 = a;
  let q2 = b;
  let cosOmega = clamp(quatDot(q1, q2), -1, 1);
  if (cosOmega < 0) {
    q2 = { x: -q2.x, y: -q2.y, z: -q2.z, w: -q2.w };
    cosOmega = -cosOmega;
  }
  if (cosOmega > 1 - 1e-6) {
    return quatNormalize({
      x: lerp(q1.x, q2.x, t),
      y: lerp(q1.y, q2.y, t),
      z: lerp(q1.z, q2.z, t),
      w: lerp(q1.w, q2.w, t),
    });
  }
  const omega = Math.acos(cosOmega);
  const sinOmega = Math.sin(omega);
  const s1 = Math.sin((1 - t) * omega) / sinOmega;
  const s2 = Math.sin(t * omega) / sinOmega;
  return {
    x: s1 * q1.x + s2 * q2.x,
    y: s1 * q1.y + s2 * q2.y,
    z: s1 * q1.z + s2 * q2.z,
    w: s1 * q1.w + s2 * q2.w,
  };
}

/**
 * Example XYZ euler (radians) → quaternion.
 * Replace with your engine's exact euler order if different — but be consistent.
 */
export function quatFromEulerXYZ(rot: Vec3): Quat {
  const hx = rot.x * 0.5;
  const hy = rot.y * 0.5;
  const hz = rot.z * 0.5;
  const cx = Math.cos(hx), sx = Math.sin(hx);
  const cy = Math.cos(hy), sy = Math.sin(hy);
  const cz = Math.cos(hz), sz = Math.sin(hz);
  return {
    w: cx * cy * cz + sx * sy * sz,
    x: sx * cy * cz - cx * sy * sz,
    y: cx * sy * cz + sx * cy * sz,
    z: cx * cy * sz - sx * sy * cz,
  };
}

export function blendHoldPoseSlerp(
  cfg: WeaponOffsetConfig,
  profile: AdsOpticProfile,
  adsFactor: number,
  ease: boolean = false
): { pos: Vec3; rot: Quat } {
  let t = clamp(adsFactor, 0, 1);
  if (ease) t = smoothstep(t);
  const hip = resolvePose(cfg.hip);
  const ads = resolvePose(adsPose(cfg, profile));
  return {
    pos: lerpVec3(hip.pos, ads.pos, t),
    rot: slerp(quatFromEulerXYZ(hip.rot), quatFromEulerXYZ(ads.rot), t),
  };
}

/** Direction alignment error: 0 = parallel, up to 2 = opposite. */
export function directionError(aimDir: Vec3, muzzleDir: Vec3): number {
  return 1 - (aimDir.x * muzzleDir.x + aimDir.y * muzzleDir.y + aimDir.z * muzzleDir.z);
}

/** Distance from point to ray (origin + s * dir), dir assumed unit. */
export function distancePointToRay(point: Vec3, origin: Vec3, dirUnit: Vec3): number {
  const ox = point.x - origin.x;
  const oy = point.y - origin.y;
  const oz = point.z - origin.z;
  const cx = oy * dirUnit.z - oz * dirUnit.y;
  const cy = oz * dirUnit.x - ox * dirUnit.z;
  const cz = ox * dirUnit.y - oy * dirUnit.x;
  return Math.hypot(cx, cy, cz);
}

export type StepName = "micro" | "fine" | "med" | "coarse";

export const POSITION_STEPS: Record<StepName, number> = {
  micro: 0.0005,
  fine: 0.002,
  med: 0.01,
  coarse: 0.05,
};

export const ROTATION_STEPS: Record<StepName, number> = {
  micro: 0.001,
  fine: 0.005,
  med: 0.02,
  coarse: 0.1,
};

export function nudge(value: number, sign: 1 | -1, delta: number): number {
  return value + sign * delta;
}
