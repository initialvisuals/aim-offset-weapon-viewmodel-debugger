# Reference debugger UI

Open [`index.html`](index.html) in a browser (no build step).

## What you get

Two tabs that mirror a real in-engine tuner:

1. **View tuning** — weapon hold poses (`hip`, `ads`, optic ADS), ADS blend, six-axis nudge grid, step ladder, copy JSON  
2. **Attachments** — same axis grid for local attachment offsets  

Hotkeys match the [tuner UX contract](../../docs/03-tuner-ux.md). Math matches [`viewmodel_math.ts`](../viewmodel_math.ts).

## How to rebuild in your engine / Unity

Treat `app.js` as the **state machine** and `index.html` as the **panel layout**:

| Concern | Port to |
|---------|---------|
| `state.mode` weapon vs attachment | Two tabs / toolbars |
| Pose + optic + step dropdowns | Same controls |
| Six axis rows + selection index | IMGUI / UI Toolkit list |
| `nudge` + step tables | Input actions |
| `blendHold` / `adsPose` | Your gameplay viewmodel code |
| Copy JSON | Clipboard → content files |

Unity sketch: `EditorWindow` or play-mode IMGUI with `GUILayout.Toolbar` for the two tabs, `EditorGUILayout.FloatField` per axis, and `Event.current` for the hotkeys. Unreal: Editor Utility Widget + the same state fields.
