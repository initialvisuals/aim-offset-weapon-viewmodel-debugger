# Tuner UX contract

This is a **recommended** reference UX. Match the *behaviors*; rebind keys to taste.

## Modes

| Mode | Edits |
|------|--------|
| **WEAPON** | Active pose key on the current weapon (`hip`, `ads`, `ads_holo`, …) |
| **ATTACHMENT** | Local offset for the selected attachment on the current weapon |

## Suggested hotkeys

| Input | Action |
|-------|--------|
| Home | Open / focus tuner (or cycle debug tabs if you embed it) |
| Esc | Dismiss (optional) |
| Insert | Toggle ADS preview (`ads_factor` → 1 or animate) |
| End | Cycle pose key within WEAPON mode |
| ↑ / ↓ | Select axis row: Pos X/Y/Z, Rot X/Y/Z |
| ← / → or Numpad ± | Nudge selected component |
| Page Up / Page Down | Cycle step size: MICRO → FINE → MED → COARSE |
| Delete (or dedicated Copy) | Copy paste-ready JSON for the current weapon to clipboard |
| Optional: Ctrl+Z | Undo (~20 deep is plenty) |
| Optional: Space | Test-fire kick preview without a full sim shot |

## Step sizes

Expose named steps so pad/keyboard tuning stays controllable. Example magnitudes (tune for your unit scale):

| Step | Position Δ | Rotation Δ (rad) |
|------|------------|------------------|
| MICRO | 0.0005 | 0.001 |
| FINE | 0.002 | 0.005 |
| MED | 0.01 | 0.02 |
| COARSE | 0.05 | 0.1 |

## Panel chrome

Show at minimum:

- Weapon id + mode
- Active pose key + optic preview
- Six axis rows with live values
- Step size label
- Buttons: Copy JSON, Save to disk, Paste/import, Undo

## Clipboard format

Prefer a single JSON object matching the weapon config (poses nested under pose keys) so tools and ports can share tunes. TOML on disk is fine; JSON on the clipboard is easy to paste into chat, PRs, and importers.
