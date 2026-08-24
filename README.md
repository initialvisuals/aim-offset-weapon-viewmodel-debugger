# Aim Offset / Weapon Viewmodel Debugger

**Engine-agnostic docs and schemas** for live first-person weapon pose tuning — hip, ADS, optic-specific ADS, and attachment mounts — so iron sights and optics line up with the reticle without recompile-and-guess loops.

This repo is a **knowledge share**, not a drop-in Unity/Unreal plugin or standalone app. It documents a practical workflow: author hold offsets as data, nudge them live in play mode, and clipboard them back into files.

## Who this is for

- Indie / personal engine authors shipping FPS or hybrid viewmodels
- Unity / Unreal teams that want a clear data model before writing Editor tools
- Anyone who has asked “how do you tune ADS offsets without going insane?”

## Mental model (30 seconds)

1. The **viewmodel root follows the camera** every frame.
2. A **hold pose** (position + euler rotation) is chosen from authored data: `hip` vs ADS poses.
3. ADS pose depends on the active **optic profile** (iron / holo / ACOG / sniper), with a documented fallback priority.
4. Blend with `ads_factor` in `0..1`: `pose = lerp(hip, ads_pose, ads_factor)`.
5. **Attachments** (grips, optics) get their own local offsets (or sockets + offsets).
6. A **tuner** nudges the active pose live and **copies JSON/TOML** back to disk.

Runtime juice (sway, bob, recoil kick) stays **separate** from authored hold offsets.

## Repo map

| Path | What |
|------|------|
| [`docs/01-overview.md`](docs/01-overview.md) | Why this exists |
| [`docs/02-data-model.md`](docs/02-data-model.md) | Pose + weapon + attachment schemas |
| [`docs/03-tuner-ux.md`](docs/03-tuner-ux.md) | Recommended hotkey / panel contract |
| [`docs/04-frame-pipeline.md`](docs/04-frame-pipeline.md) | Pseudocode for one frame |
| [`docs/05-engine-glue.md`](docs/05-engine-glue.md) | Unity / Unreal / custom checklists |
| [`docs/06-contracts-and-gotchas.md`](docs/06-contracts-and-gotchas.md) | Axes, defaults, retune hazards |
| [`schemas/`](schemas/) | JSON Schema |
| [`examples/`](examples/) | Generic TOML/JSON samples |

## Quick start

1. Read [overview](docs/01-overview.md) + [data model](docs/02-data-model.md).
2. Copy [`examples/example_smg.toml`](examples/example_smg.toml) into your content pipeline.
3. Implement the [frame pipeline](docs/04-frame-pipeline.md) in your engine.
4. Add the [tuner UX](docs/03-tuner-ux.md) (IMGUI, egui, UMG, Editor window — your call).
5. Keep [contracts](docs/06-contracts-and-gotchas.md) taped above your monitor.

## What this is not

- Not a full debugger binary
- Not a dump of any proprietary game project
- Not mesh / animation / IP packs

Optional tiny language cores or engine adapters can come later if people want them. The portable value is the **workflow + schema**.

## License

MIT — see [LICENSE](LICENSE).
