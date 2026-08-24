# Reference debugger UI (Three.js demo)

Interactive block-gun viewmodel tuner with a live Three.js first-person preview.

Demo poses are meant to be tuned *with* the on-screen tuner — dogfooding the workflow.

## Open it

ES modules + import map need HTTP (not `file://`). The page loads Three.js from a CDN (network required).

From `reference/debugger` run:

    python3 -m http.server 8765

Then open http://localhost:8765/ in a browser. Click the canvas for mouse look (pointer lock).

## What you get

1. **3D viewport** — walkable room, optics table, first-person block guns, cyan aim ray (camera −Z), crosshair.
2. **Player controls** (panel closed) — WASD, Shift sprint, mouse look, Q/E lean (roll + lateral offset), RMB ADS (`ads_factor` + FOV squeeze + look sens ×0.5), Alt hold-breath, LMB/Space fire.
3. **Sway + recoil** — procedural on a `swayRig` *after* the authored hold pose (never baked into hip/ADS JSON). Header **Sway** toggle (default ON); turn OFF for clean aim-offset tuning.
4. **Hold breath (Alt)** — damps sway for up to ~3s (HUD stamina bar); release/exhaust recovers with a brief overshoot.
5. **Shooting** — tracers spawn at the muzzle socket and travel along **camera aim** (Policy A) so the aim-offset story reads clearly; light viewmodel recoil punch + muzzle flash.
6. **Optics table** — iron / holo / acog / sniper_scope; look + click or E to equip.
7. **Debugger panel (C)** — view/attachment tabs, ads_factor slider (synced from RMB), six-axis editors, Copy JSON + toast. **G** = gun picker.

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

When the panel is open, gameplay keys do not steal typing from axis inputs.

## Notes

- `blendHold(hip, ads_pose(optic), t)` → `holdRoot`; sway/recoil → child `swayRig`. Default `rotY` = π/2.
- Tracer policy: spawn at muzzle, direction = camera forward (documents aim-offset vs barrel).
- Port this state machine into your engine editor (Unity EditorWindow / Unreal EUW).

See ../viewmodel_math.ts and ../../docs/03-tuner-ux.md.
