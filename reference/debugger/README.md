# Reference debugger UI (Three.js demo)

Interactive block-gun viewmodel tuner with a live Three.js first-person preview.

Demo poses are meant to be tuned *with* the on-screen tuner — dogfooding the workflow.

## Open it

ES modules + import map need HTTP (not `file://`). The page loads Three.js from a CDN (network required).

From `reference/debugger` run:

    python3 -m http.server 8765

Then open http://localhost:8765/ in a browser. Click the canvas for mouse look (pointer lock).

## What you get

1. **3D viewport** — walkable room, optics table, first-person block guns, cyan aim ray (camera −Z), hip crosshair.
2. **Range** — circular bullseyes + knockdown silhouette lane; **firing-line sandbags** + stall benches at spawn; side-bay **floodlights with visible floor pools** (~25/80/160/280 m from spawn); **floor chalk lines** + **wall stencil distances** at circular-target ranges (50/100/150/200/300/400 m from the spawn firing line). Wall numbers are meters from spawn, not raw world `|z|`. No floating text on targets.
3. **Player** (panel closed) — WASD, Shift sprint, **C** crouch toggle / **Z** crouch hold (slower, no sprint, ducked eye), mouse look, **Q/E lean (wall-clamped)**, tiny A/D strafe tilt, RMB ADS, Space hold-breath, LMB fire, **V reload**.
4. **ADS** — FOV by optic (hip 90 → iron/holo 60, acog 25, sniper 10), HUD reticles + mag-optic tube/vignette, 3D iron sights. Look sens scales with optic FOV.
5. **Sway / breath** — procedural `swayRig` after authored hold (header **Sway** toggle). Space hold-breath damps sway ~3s (HUD bar).
6. **Shooting kit** — **long tracer streaks** + ballistic drop; mags SMG 30 / rifle 20 / sniper 5 (`mag/capacity · ∞`); empty = dry-click. **V** reload (~1.2s / ~2s sniper) with viewmodel dip. Live shots eject **shell casings** (FIFO ~28) and a short **muzzle flash**. Hits spawn **impact decals + sparks** (FIFO ~50). Screen-fixed +pts markers. Cheap Web Audio SFX.
7. **Sim / Arcade + HoB** — **B** cycles **Sim** (default: height-over-bore + ballistic zero so the gravity arc meets the sight ray at **zero distance**) vs **Arcade** (reticle-faithful, vel = camera forward). **`-`/`=`** cycle zero (25/50/100/200/300 m, default 100). Live HoB cm readout; optional aim/bore rays.
8. **Optics table** — iron / holo / acog / sniper_scope; look + click or E to equip.
9. **Debugger (` / Backquote)** — view/attachment tabs, ads_factor, six-axis editors, Copy JSON. **G** = gun picker.
10. **Settings (`O`)** — pauses gameplay: game style, **hip reticle** toggle, aim/bore rays, **brightness / gamma** (CSS filter + mild fog lift; defaults **1.30 / 1.18**), **fog** enable + near/far (linear `THREE.Fog`, defaults **ON / 90 / 430**), **PLUGE** grey strip, zero distance, look sens, ADS look mul, controls cheat.

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
| LMB | Fire (tracers; empty = dry click); LMB on pickup equips |
| V | Reload magazine (not R — R resets silhouettes; F equips optic) |
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
| Brightness / Gamma | Settings | **1.30 / 1.18** — CSS `brightness()`/`contrast()` on `#view3d` + mild fog/bg lift |
| Fog | Settings | **ON** — linear `THREE.Fog` near **90** / far **430**; color tracks bg/clear |
| Show PLUGE strip | Settings | **OFF** — Black/Low/Mid/High/White overlay (unfiltered) |
| HoB readout | Live cm | Signed: + = muzzle below sight ray |

**Method (Sim):** sight point `S = aimOrigin + aimDir · Z`. Solve launch unit `u` so `muzzle + u·v·t + (0, −½g t², 0) = S` (low arc). Gravity still runs on the tracer every frame, so impacts near `Z` sit on the reticle and drop past it.

## Notes

- `blendHold(hip, ads_pose(optic), t)` → `holdRoot`; sway/recoil → child `swayRig`. Default `rotY` = 0.
- Look sensitivity: `lookSens * (effectiveFov / fovHip) * adsLookMul * ADS_LOOK_MUL[optic]` (blended by `adsFactor`); hold-breath multiplies ~0.65 after. Hip feel unchanged; full sniper ADS ≈ 10/90 of hip angular rate.
- Tracer policy: long visible streaks. **Sim** = spawn at muzzle with **ballistic zero** launch at `zeroDist` (documents HoB). **Arcade** = direction = camera forward (reticle-faithful). Gravity per weapon/optic.
- Settings (`O`) pauses gameplay like the debugger panel; hip reticle toggle only affects the 3px hip crosshair. If the dark range looks crushed, raise **Brightness/Gamma** or check the PLUGE strip (Black should stay distinct from Low). Range flood **floor pools** (posts ~25/80/160/280 m) also light the lane at night.
- Bore axis on these block guns is muzzleSocket local **−Z**. Zero solve is analytic low-arc under constant `g` (falls back to geometric aim-at-zero-point if unreachable).
- Port this state machine into your engine editor (Unity EditorWindow / Unreal EUW).

See ../viewmodel_math.ts and ../../docs/03-tuner-ux.md.
