# Math reference

Shared definitions for ports. If your engine disagrees, change the port or bump `schema_version` — do not silently reinterpret old numbers.

**Code:** [`reference/viewmodel_math.ts`](../reference/viewmodel_math.ts)

Formulas below are shown as **code**, not LaTeX, so they render on GitHub.

---

## Symbols

| Name | Meaning |
|------|---------|
| `p` | Position `(x, y, z)` in viewmodel / camera local space |
| `rot` / `θ` | Euler radians `(rotX, rotY, rotZ)` — axis meaning is your [project contract](06-contracts-and-gotchas.md) |
| `t` | ADS blend `ads_factor` in `[0, 1]` |
| `hip`, `ads` | Authored poses (position + euler) |
| `aimDir` | Unit gameplay aim direction (world) |
| `aimOrigin` | Aim ray origin (usually camera) |
| `muzzlePos` | Muzzle world position |
| `muzzleDir` | Unit muzzle forward (world) |

---

## 1. Lerp

```text
lerp(a, b, t) = a + (b - a) * t

lerp(u, v, t) = (                       # vectors, component-wise
  lerp(u.x, v.x, t),
  lerp(u.y, v.y, t),
  lerp(u.z, v.z, t)
)

t = clamp(t, 0, 1)
```

Optional ADS shaping (apply to `t` *before* pose lerp):

```text
smoothstep(t) = t * t * (3 - 2 * t)     # t already clamped to [0, 1]
```

---

## 2. Hold pose — position

```text
hold.pos = lerp(hip.pos, ads.pos, t)
```

---

## 3. Hold pose — rotation

### 3a. Euler lerp (simple; fine when hip/ADS are close)

```text
hold.rotX = lerp(hip.rotX, ads.rotX, t)
hold.rotY = lerp(hip.rotY, ads.rotY, t)
hold.rotZ = lerp(hip.rotZ, ads.rotZ, t)
```

This is what most live tuners mutate directly.

### 3b. Quaternion slerp (better for large deltas)

```text
qHip = quatFromEuler(hip.rot)     # same euler order as authoring
qAds = quatFromEuler(ads.rot)
qHold = slerp(qHip, qAds, t)
```

`slerp` with shortest-arc fix:

```text
dot = clamp(dot(qA, qB), -1, 1)

if dot < 0:
  qB = -qB
  dot = -dot

if dot > 1 - eps:
  q = normalize((1 - t) * qA + t * qB)
else:
  omega = acos(dot)
  q = (sin((1 - t) * omega) / sin(omega)) * qA
    + (sin(t * omega)       / sin(omega)) * qB
```

See `slerp` / `quatFromEulerXYZ` in the TypeScript reference.

---

## 4. Defaults for missing euler fields

Apply the **same** defaults at import and at runtime (or clipboard round-trips drift):

```text
rotX = authored.rotX ?? 0
rotY = authored.rotY ?? (PI / 2)    # common FPS viewmodel default
rotZ = authored.rotZ ?? 0
```

Document your defaults in your project if they differ.

---

## 5. Optic ADS pose selection

Iron `ads` is required. Others are optional. `??` means “first pose that exists.”

```text
ads_pose(profile):
  sniper_scope -> ads_sniper_scope ?? ads_acog ?? ads_holo ?? ads
  acog         -> ads_acog ?? ads_holo ?? ads
  holo         -> ads_holo ?? ads
  iron         -> ads
```

Then:

```text
adsPose = ads_pose(currentOpticProfile)
hold.pos = lerp(hip.pos, adsPose.pos, t)
hold.rot = lerp(hip.rot, adsPose.rot, t)   # or slerp quats
```

---

## 6. Viewmodel root from camera

Every frame, before applying local hold:

```text
viewmodel.world = camera.world
# or copy translation + rotation only if scale is separate
```

Authored `hold` is applied in **viewmodel local space** (camera child).

---

## 7. Composition order (critical)

Policy (multiply order depends on row vs column vectors — keep one convention):

```text
1. Parent to camera
2. Apply authored hold(t)
3. Apply procedural sway / bob / recoil
4. Apply attachment locals under sockets
```

```text
final = camera * hold(t) * procedural * attachment
```

Do **not** bake procedural motion into authored `hip` / `ads` data.

---

## 8. Aim ray vs muzzle (honesty)

Aim ray:

```text
aimPoint(s) = aimOrigin + aimDir * s      # s >= 0, aimDir unit-length
```

Muzzle forward from final viewmodel rotation `R` and content forward `contentForward` (e.g. `(1,0,0)` or `(0,0,-1)`):

```text
muzzleDir = normalize(R * contentForward)
```

### Policy A — camera-authored direction

Gameplay uses `aimDir`. At full ADS (`t = 1`), tune the viewmodel so the sight picture sits on the aim ray. Projectiles may still **spawn** at `muzzlePos` but use `aimDir` for direction.

### Policy B — muzzle-authored direction

Gameplay uses `muzzleDir`. Then ADS tuning must drive `muzzleDir ≈ aimDir` at `t = 1`, or the iron-sight promise fails.

### Debug metrics

```text
dirError   = 1 - dot(muzzleDir, aimDir)          # 0 = parallel

sightError = length(cross(sightPos - aimOrigin, aimDir))
# distance from a sight aperture point to the aim ray
```

Tune until both are small at ADS — that is the measurable iron-sight accuracy promise.


### Height-over-bore & zero distance

Optics sit above the bore, so the **sight ray** (camera / reticle) and **bore ray** (muzzle forward) diverge. A **zero** pitches the bore so the projectile path meets the sight ray at range `Z`.

In the reference debugger (default):

```text
S = aimOrigin + aimDir * Z
# solve low-arc u under constant g:
# muzzle + u * v * t + (0, -0.5 * g * t^2, 0) = S
```

Toggle **Idealized bore=aim** to restore Policy A (`dir = aimDir`) for A/B comparison. See [reference/debugger/README.md](../reference/debugger/README.md).

---

## 9. Tuner nudge

```text
value = value + sign * delta      # sign is -1 or +1
```

Example step ladder (scale to your units):

| Step | Position delta | Rotation delta (rad) |
|------|----------------|----------------------|
| MICRO | `0.0005` | `0.001` |
| FINE | `0.002` | `0.005` |
| MED | `0.01` | `0.02` |
| COARSE | `0.05` | `0.1` |

---

## 10. Attachment local

```text
attachment.local = socket.local * offsetPose
```

`offsetPose` uses the same `(x,y,z,rotX,rotY,rotZ)` schema as weapon holds.

---

## Related

- [Tuner UX](03-tuner-ux.md) — hotkeys / panel contract  
- [Frame pipeline](04-frame-pipeline.md) — full frame outline  
- [Reference debugger](../reference/debugger/) — two-tab structural UI  
- [viewmodel_math.ts](../reference/viewmodel_math.ts) — runnable definitions  
