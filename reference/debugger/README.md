# Reference debugger UI (Three.js demo)

Interactive block-gun viewmodel tuner with a live Three.js first-person preview.

Demo poses are meant to be tuned *with* the on-screen tuner — dogfooding the workflow.

## Open it

ES modules + import map need HTTP (not `file://`). The page loads Three.js from a CDN (network required).

From `reference/debugger` run:

    python3 -m http.server 8765

Then open http://localhost:8765/ in a browser. Click the canvas for mouse look (pointer lock).

## What you get

1. **3D viewport** — walkable room, optics table, procedural shooting range (circular bullseye lanes + side knockdown silhouette lane), first-person block guns, cyan aim ray (camera −Z), crosshair.
2. **Player controls** (panel closed) — WASD, Shift sprint, C crouch toggle / Z crouch hold (slower move, no sprint, ducked eye height), mouse look, Q/E lean (full roll + lateral offset), tiny A/D strafe tilt only (~2.5% of lean max), RMB ADS, Space hold-breath, LMB fire.
3. **ADS presentation** — FOV by optic (hip 90 → iron/holo 60, acog 25, sniper 10), screen-space HUD reticle (holo dot / ACOG chevron / sniper mil-cross), peripheral tube frame + vignette for magnified optics. Iron uses 3D front-post / rear-notch geometry. Attachment offsets still move the optic mesh on the gun for hip/inspection. **Look sens scales with optic FOV** (and `adsFactor`) so sniper ~10° is ~9× slower angular than hip; optional `ADS_LOOK_MUL` / `player.adsLookMul` fine-tune on top.
4. **Sway + recoil** — procedural on a `swayRig` *after* the authored hold pose (never baked into hip/ADS JSON). Header **Sway** toggle (default ON); turn OFF for clean aim-offset tuning.
5. **Hold breath (Space)** — damps sway for up to ~3s (HUD stamina bar); release/exhaust recovers with a brief overshoot.
6. **Shooting / ballistics** — tracers spawn at the muzzle with simple ballistic drop (`vel.y -= g·dt`). **Default: height-over-bore (HoB) + ballistic zero** — sight ray = camera/optic aim; launch direction is solved so the gravity arc meets the sight ray at a chosen **zero distance** (25/50/100/200/300 m, default **100 m**). Toggle **Idealized bore=aim** for old Policy A (velocity = camera forward, hides HoB). Optional **Show aim/bore rays** draws cyan sight vs amber launch rays. Panel shows live HoB cm. SMG drops more / slower; rifle flatter; sniper scope fastest/flattest. Hits flash range targets; **+pts hit markers** stay screen-fixed HTML overlays. Range distance is marked by **subtle ground lines** across the lane floor at the circular-target distances (~50/100/150/200/300/400m) — no floating text on targets. Cheap Web Audio SFX (fire / hit / bullseye / miss) unlock on first gesture.
7. **Optics table** — iron / holo / acog / sniper_scope props match equipped style; look + click or E to equip.
8. **Debugger panel (` / Backquote)** — view/attachment tabs, ads_factor slider (synced from RMB), six-axis editors, Copy JSON + toast. **G** = gun picker.

## Hotkeys

| Key | Action |
|-----|--------|
| ` (Backquote) | Toggle debugger panel |
| G | Gun select |
| C | Crouch toggle |
| Z | Crouch hold |
| WASD / Shift | Move / sprint (sprint blocked while crouched) |
| Q / E | Lean; E also equips looked-at optic |
| RMB | Hold ADS |
| Space | Hold breath (damp sway) |
| `-` / `=` | Cycle zero distance (presets 25–300 m; clamp at ends) |
| LMB | Fire (tracers); LMB on pickup equips |
| Click canvas | Pointer lock |
| Insert | ADS preview |
| End / arrows / PgUp/PgDn | Pose / axis / step (panel open) |
| Esc | Exit lock / close modal / panel |
| R | Reset silhouette poses |

When the panel is open, gameplay keys do not steal typing from axis inputs.

## Silhouette lane

Offset to the right of the circular bullseyes: original blocky steel/wood knockdown silhouettes (not a copy of any commercial target art). Zones: **head** (flops back), **pelvis** (kneel / torso drops), **chest** (rocker — needs 3 hits to fully drop). Watch the body move; center-mass alone does not instantly neutralize. **R** resets all silhouette poses (score unchanged). HUD legend: `Silhouette: head / chest×3 / pelvis`.


## Height-over-bore & zeroing

Real guns put the barrel below the optic, so the bore line and the sight line are not the same ray (**height-over-bore**). They are made to meet at a chosen **zero distance**; past that the projectile drops below the reticle under gravity.

| Control | Where | Default |
|---------|--------|---------|
| Zero distance | Ballistics panel (View tuning) | **100 m** (presets 25 / 50 / 100 / 200 / 300) |
| HoB + zero | Toggle (pressed = on) | **ON** — ballistic zero |
| Idealized bore=aim | Same toggle off | Policy A — velocity = camera forward |
| Show aim/bore rays | Toggle | **OFF** — cyan sight, amber launch |
| HoB readout | Live cm | Signed: + = muzzle below sight ray |

**Method:** sight point `S = aimOrigin + aimDir · Z`. Solve launch unit `u` so `muzzle + u·v·t + (0, −½g t², 0) = S` (low arc). Gravity still runs on the tracer every frame, so impacts near `Z` sit on the reticle and drop past it.

## Notes

- `blendHold(hip, ads_pose(optic), t)` → `holdRoot`; sway/recoil → child `swayRig`. Default `rotY` = 0.
- Look sensitivity: `lookSens * (effectiveFov / fovHip) * adsLookMul * ADS_LOOK_MUL[optic]` (blended by `adsFactor`); hold-breath multiplies ~0.65 after. Hip feel unchanged; full sniper ADS ≈ 10/90 of hip angular rate.
- Tracer policy (default): spawn at muzzle; **ballistic zero** launch so the arc meets the sight ray at `zeroDist` (documents HoB). Optional Policy A: direction = camera forward. Gravity per weapon/optic.
- Bore axis on these block guns is muzzleSocket local **−Z**. Zero solve is analytic low-arc under constant `g` (falls back to geometric aim-at-zero-point if unreachable).
- Port this state machine into your engine editor (Unity EditorWindow / Unreal EUW).

See ../viewmodel_math.ts and ../../docs/03-tuner-ux.md.
