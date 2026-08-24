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
2. **Player controls** (panel closed) — WASD, Shift sprint, mouse look, Q/E lean (full roll + lateral offset), tiny A/D strafe tilt only (~2.5% of lean max), RMB ADS, Alt hold-breath, LMB/Space fire.
3. **ADS presentation** — FOV by optic (hip 90 → iron/holo 60, acog 25, sniper 10), screen-space HUD reticle (holo dot / ACOG chevron / sniper mil-cross), peripheral tube frame + vignette for magnified optics. Iron uses 3D front-post / rear-notch geometry. Attachment offsets still move the optic mesh on the gun for hip/inspection. **Look sens scales with optic FOV** (and `adsFactor`) so sniper ~10° is ~9× slower angular than hip; optional `ADS_LOOK_MUL` / `player.adsLookMul` fine-tune on top.
4. **Sway + recoil** — procedural on a `swayRig` *after* the authored hold pose (never baked into hip/ADS JSON). Header **Sway** toggle (default ON); turn OFF for clean aim-offset tuning.
5. **Hold breath (Alt)** — damps sway for up to ~3s (HUD stamina bar); release/exhaust recovers with a brief overshoot.
6. **Shooting** — tracers spawn at the muzzle and travel along **camera aim** (Policy A) with simple ballistic drop (`vel.y -= g·dt`). SMG drops more / slower; rifle flatter; sniper scope fastest/flattest. Hits flash range targets; **+pts hit markers** stay screen-fixed HTML overlays. Range distance is marked by **subtle ground lines** across the lane floor at the circular-target distances (~50/100/150/200/300/400m) — no floating text on targets. Cheap Web Audio SFX (fire / hit / bullseye / miss) unlock on first gesture.
7. **Optics table** — iron / holo / acog / sniper_scope props match equipped style; look + click or E to equip.
8. **Debugger panel (C)** — view/attachment tabs, ads_factor slider (synced from RMB), six-axis editors, Copy JSON + toast. **G** = gun picker.

## Hotkeys

| Key | Action |
|-----|--------|
| C | Toggle debugger panel |
| G | Gun select |
| WASD / Shift | Move / sprint |
| Q / E | Lean; E also equips looked-at optic |
| RMB | Hold ADS |
| Alt | Hold breath (damp sway) |
| LMB / Space | Fire (tracers); LMB on pickup equips |
| Click canvas | Pointer lock |
| Insert | ADS preview |
| End / arrows / PgUp/PgDn | Pose / axis / step (panel open) |
| Esc | Exit lock / close modal / panel |
| R | Reset silhouette poses |

When the panel is open, gameplay keys do not steal typing from axis inputs.

## Silhouette lane

Offset to the right of the circular bullseyes: original blocky steel/wood knockdown silhouettes (not a copy of any commercial target art). Zones: **head** (flops back), **pelvis** (kneel / torso drops), **chest** (rocker — needs 3 hits to fully drop). Watch the body move; center-mass alone does not instantly neutralize. **R** resets all silhouette poses (score unchanged). HUD legend: `Silhouette: head / chest×3 / pelvis`.

## Notes

- `blendHold(hip, ads_pose(optic), t)` → `holdRoot`; sway/recoil → child `swayRig`. Default `rotY` = 0.
- Look sensitivity: `lookSens * (effectiveFov / fovHip) * adsLookMul * ADS_LOOK_MUL[optic]` (blended by `adsFactor`); hold-breath multiplies ~0.65 after. Hip feel unchanged; full sniper ADS ≈ 10/90 of hip angular rate.
- Tracer policy: spawn at muzzle, initial direction = camera forward, gravity per weapon/optic (documents aim-offset vs barrel + drop).
- Port this state machine into your engine editor (Unity EditorWindow / Unreal EUW).

See ../viewmodel_math.ts and ../../docs/03-tuner-ux.md.
