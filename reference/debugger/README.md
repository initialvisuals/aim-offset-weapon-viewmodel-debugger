# Reference debugger UI (Three.js demo)

Interactive block-gun viewmodel tuner with a live Three.js preview.

## Open it

ES modules + import map need HTTP (not file://). The page loads Three.js from a CDN (network required).

From reference/debugger run:

    python3 -m http.server 8765

Then open http://localhost:8765/ in a browser.

## What you get

1. 3D viewport — first-person block gun, dim room, cyan aim ray along camera -Z, crosshair.
2. HUD — Press C for Viewmodel Debugger; G for guns.
3. Debugger panel (toggle with C) — View tuning and Attachments tabs, ads_factor, six-axis editors, Copy JSON + toast.
4. Gun select — Guns button or G opens an in-engine style debug picker (example_smg, example_rifle).

## Hotkeys

| Key | Action |
|-----|--------|
| C | Toggle debugger panel |
| G | Open gun select dialogue |
| Insert | Toggle ADS preview |
| End | Cycle pose |
| Arrows | Select axis / nudge (panel open) |
| PgUp/PgDn | Step size |
| Esc | Close modal / panel |

Copy JSON via the Copy buttons (toast on success or failure).

## Notes

- blendHold(hip, ads_pose(optic), t) drives holdRoot position/rotation (XYZ). Default rotY = pi/2.
- Axis inputs use input events; switching weapon/pose/attachment resyncs field values.
- Port this state machine into your engine editor.
- Unity: EditorWindow / IMGUI tabs + float fields. Unreal: Editor Utility Widget.

See ../viewmodel_math.ts and ../../docs/03-tuner-ux.md.

