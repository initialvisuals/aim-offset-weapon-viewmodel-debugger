# Contracts and gotchas

Print this page. Silent “fixes” here invalidate every tuned weapon.

## 1. Forward axis is a contract

Decide and document:

- Content/viewmodel forward (e.g. −Z or +X)
- Simulation / barrel forward (often +Z)

If they differ, remap **once** at the content boundary. Do not retune numbers to paper over a remap bug.

## 2. Rotation labels are a contract

`rotX` / `rotY` / `rotZ` mean whatever *you* document (pitch/yaw/roll in a fixed order).  

**Do not** swap labels to “make the panel nicer” without retuning every weapon. If a port historically used a confusing label, keep the numbers and document the quirk.

## 3. Default missing `rotY`

A common production default: if `rotY` is omitted, treat it as `π/2`.  

Importers must apply the same default as runtime, or clipboard round-trips will drift.

## 4. Uniform scale is a knob, not a universal constant

Some projects bake a uniform viewmodel scale (e.g. `0.25`). Put it in content or a global cvar. Do not hardcode it into the schema.

## 5. Authored hold ≠ procedural motion

Apply sway / bob / inertia / recoil **after** the hold pose. Otherwise tuner values fight runtime noise and cease to be transferable.

## 6. Optic priority must match gameplay

If gameplay thinks a sniper scope is equipped but the blender falls back to iron `ads`, the tuner will “lie.” Drive `AdsOpticProfile` from the same attachment query the game uses.

## 7. Hip-only collision helpers

Barrel stuffing / wall pushback often should weaken or disable in full ADS so the sight picture stays planted.

## 8. Version your files

Include `schema_version`. When you break pose meaning (axis change, unit change), bump it and ship a migrator — don’t silently reinterpret old TOML.
