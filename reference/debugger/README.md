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
2. **Player controls** (panel closed) — WASD, Shift sprint, C crouch toggle / Z crouch hold (slower move, no sprint, ducked eye height), mouse look, Q/E lean (full roll + lateral offset; **collision-clamped** so the camera cannot lean through walls / bay walls / berm / crates — common FPS lean-through-walls anti-cheese), tiny A/D strafe tilt only (~2.5% of lean max), RMB ADS, Space hold-breath, LMB fire.
3. **ADS presentation** — FOV by optic (hip 90 → iron/holo 60, acog 25, sniper 10), screen-space HUD reticle (holo dot / ACOG chevron / sniper mil-cross), peripheral tube frame + vignette for magnified optics. Iron uses 3D front-post / rear-notch geometry. Attachment offsets still move the optic mesh on the gun for hip/inspection. **Look sens scales with optic FOV** (and `adsFactor`) so sniper ~10° is ~9× slower angular than hip; optional `ADS_LOOK_MUL` / `player.adsLookMul` fine-tune on top.
4. **Sway + recoil** — procedural on a `swayRig` *after* the authored hold pose (never baked into hip/ADS JSON). Header **Sway** toggle (default ON); turn OFF for clean aim-offset tuning.
5. **Hold breath (Space)** — damps sway for up to ~3s (HUD stamina bar); release/exhaust recovers with a brief overshoot.
6. **Shooting / ballistics** — tracers spawn at the muzzle with simple ballistic drop (`vel.y -= g·dt`). **Game style** toggle: **Sim** (default) = height-over-bore (HoB) + ballistic zero — sight ray = camera/optic aim; launch solved so the gravity arc meets the sight ray at a chosen **zero distance** (25/50/100/200/300 m, default **100 m**). **Arcade** = reticle-faithful / idealized bore=aim (velocity = camera forward). Themes switch with the mode (cool tactical Sim vs neon Arcade) plus a top-right **SIM/ARCADE** HUD badge. Optional **Show aim/bore rays** draws cyan sight vs amber launch rays. Panel shows live HoB cm. SMG drops more / slower; rifle flatter; sniper scope fastest/flattest. Hits flash range targets; **+pts hit markers** stay screen-fixed HTML overlays. Range distance is marked by **subtle ground lines** across the lane floor at the circular-target distances (~50/100/150/200/300/400m) — no floating text on targets. Cheap Web Audio SFX (fire / hit / bullseye / miss) unlock on first gesture. **Impact marks + sparks:** tracer hits on circular targets, silhouettes, berm/floor/walls (and ground on a y-floor miss) spawn a short yellow/white spark burst (~0.15–0.35s) plus a cheap dark scorch/punch decal (PlaneGeometry + optional CanvasTexture), FIFO-capped (~50).
7. **Optics table** — iron / holo / acog / sniper_scope props match equipped style; look + click or E to equip.
8. **Debugger panel (` / Backquote)** — view/attachment tabs, ads_factor slider (synced from RMB), six-axis editors, Copy JSON + toast. **G** = gun picker. **O** = Settings.
9. **Settings (`O`)** — lightweight options overlay (pauses gameplay, frees the cursor): game style, hip reticle, aim/bore rays, zero distance, look sensitivity, ADS look mul, short controls cheat sheet.

## Hotkeys

| Key | Action |
|-----|--------|
| ` (Backquote) | Toggle debugger panel |
| O | Settings (options) |
| G | Gun select |
| B | Cycle Arcade / Sim game style |
| C | Crouch toggle |
| Z | Crouch hold |
| WASD / Shift | Move / sprint (sprint blocked while crouched) |
| Q / E | Lean (wall-clamped); E also equips looked-at optic |
| RMB | Hold ADS |
| Space | Hold breath (damp sway) |
| `-` / `=` | Cycle zero distance (presets 25–300 m; clamp at ends; mainly Sim) |
| LMB | Fire (tracers); LMB on pickup equips |
| Click canvas | Pointer lock |
| Insert | ADS preview |
| End / arrows / PgUp/PgDn | Pose / axis / step (panel open) |
| Esc | Exit lock / close settings / modal / panel |
| R | Reset silhouette poses |

When the panel is open, gameplay keys do not steal typing from axis inputs.

## Silhouette lane

Offset to the right of the circular bullseyes: original blocky steel/wood knockdown silhouettes (not a copy of any commercial target art). Zones: **head** (flops back), **pelvis** (kneel / torso drops), **chest** (rocker — needs 3 hits to fully drop). Watch the body move; center-mass alone does not instantly neutralize. **R** resets all silhouette poses (score unchanged). HUD legend: `Silhouette: head / chest×3 / pelvis`.


## Arcade vs Sim (game style)

Teaching toggle for ballistic policy + visual theme. Drives `state.hobZero` and `data-game-style` on `<body>`.

| Mode | Meaning | Theme |
|------|---------|--------|
| **Sim** (default) | HoB + ballistic zero — gravity arc meets the sight ray at the zero distance | Cool blue/teal tactical terminal |
| **Arcade** | Reticle-faithful aim — muzzle spawn, velocity = camera forward (idealized bore=aim) | Magenta/orange neon cabinet |

Switch via the **Game style** segmented control (debugger Ballistics bar), **Settings (`O`)**, or hotkey **`B`**. Toast on switch; HUD pill shows `SIM` / `ARCADE`. Zero distance mainly applies in Sim (controls dim in Arcade).

## Height-over-bore & zeroing

Real guns put the barrel below the optic, so the bore line and the sight line are not the same ray (**height-over-bore**). They are made to meet at a chosen **zero distance**; past that the projectile drops below the reticle under gravity.

| Control | Where | Default |
|---------|--------|---------|
| Game style (Sim / Arcade) | Ballistics bar, Settings, **B** | **Sim** (`hobZero` on) |
| Zero distance | Ballistics / Settings | **100 m** (presets 25 / 50 / 100 / 200 / 300) |
| Show aim/bore rays | Ballistics / Settings | **OFF** — cyan sight, amber launch |
| Show hip reticle | Settings | **ON** — 3px hip crosshair (ADS HUD unchanged) |
| HoB readout | Live cm | Signed: + = muzzle below sight ray |

**Method (Sim):** sight point `S = aimOrigin + aimDir · Z`. Solve launch unit `u` so `muzzle + u·v·t + (0, −½g t², 0) = S` (low arc). Gravity still runs on the tracer every frame, so impacts near `Z` sit on the reticle and drop past it.

## Notes

- `blendHold(hip, ads_pose(optic), t)` → `holdRoot`; sway/recoil → child `swayRig`. Default `rotY` = 0.
- Look sensitivity: `lookSens * (effectiveFov / fovHip) * adsLookMul * ADS_LOOK_MUL[optic]` (blended by `adsFactor`); hold-breath multiplies ~0.65 after. Hip feel unchanged; full sniper ADS ≈ 10/90 of hip angular rate.
- Tracer policy: **Sim** = spawn at muzzle with **ballistic zero** launch at `zeroDist` (documents HoB). **Arcade** = direction = camera forward (reticle-faithful). Gravity per weapon/optic.
- Settings (`O`) pauses gameplay like the debugger panel; hip reticle toggle only affects the 3px hip crosshair.
- Bore axis on these block guns is muzzleSocket local **−Z**. Zero solve is analytic low-arc under constant `g` (falls back to geometric aim-at-zero-point if unreachable).
- Port this state machine into your engine editor (Unity EditorWindow / Unreal EUW).

See ../viewmodel_math.ts and ../../docs/03-tuner-ux.md.
