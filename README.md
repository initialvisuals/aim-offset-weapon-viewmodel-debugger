# Aim Offset / Weapon Viewmodel Debugger

**Engine-agnostic docs, schemas, and examples** for live first-person weapon pose tuning — hip fire, iron ADS, optic-specific ADS, and attachment mounts.

This is a **general knowledge-share module** for FPS work in any engine (Unity, Unreal, Source-likes, custom / personal engines). It is not a drop-in plugin or a standalone app. The portable value is the **problem framing, data model, tuner workflow, and frame pipeline** so you can build the same tool inside *your* game.

## Why this exists

Every FPS eventually hits the same quiet betrayal:

You look down the iron sights. The reticle (or the sight aperture) says the shot goes *here*. The **3D bullet** (trace, projectile, hitscan) is spawned from some point tied to the **camera** or a logical aim ray. The **muzzle** on the viewmodel gun is somewhere else in camera space. If those three disagree — screen aim, muzzle, and sim trajectory — players feel it instantly, even when they cannot name it.

That mismatch shows up as:

- Bullets that visibly leave the barrel but “hit” where the camera was looking (or the reverse)
- Hip fire that looks cool but has no honest relationship to where rounds go
- ADS that *looks* aligned until you fire and the tracer betrays you
- Optics that sit pretty on the rail but pull the sight picture off the true aim point

**Aim offsets / viewmodel hold poses** are how you reconcile **aesthetics** (how the gun sits in frame, how heavy it feels, how clean the iron-sight picture is) with **the accuracy promise**: when the sights say center mass, the trajectory should honor that.

This workflow treats that reconciliation as **content you tune live**, not magic numbers you recompile twenty times.

## The philosophy (good for all FPS games)

1. **One truth for aim.** Gameplay aim is a camera (or aim) ray. The viewmodel is a *presentation* of that truth, not a second competing shooter.
2. **Iron sights are a contract.** If you offer irons (or any optic), ADS is a promise: sight picture ↔ impact. Break that and the gun fantasy collapses.
3. **Hip fire is allowed to be expressive.** Hip poses can prioritize silhouette, brand, and motion — but they still need a known relationship to the aim ray (and often a visible hip reticle or clear bloom rules).
4. **Optics get their own poses.** Holo, ACOG, and scope eye relief are different fittings. One ADS pose plus FOV hacks is how you get “close enough” forever.
5. **Authored hold ≠ juice.** Sway, bob, and recoil are layers *on top of* tuned offsets. Do not bake noise into the numbers you ship.
6. **Engine-agnostic on purpose.** The math and the tuner loop are the same whether you are in Unity, Unreal, or a homemade renderer. Only parenting, input, and UI change.

If you are shipping any first-person shooter — arena, tac, horror, sci-fi, hybrid — this problem is yours. The module is written so the solution can travel.

## How you use the tool (the loop)

In play mode, with the real gun mesh and the real camera:

1. **Open the tuner** (debug hotkey / panel).
2. Pick **WEAPON** mode and the pose you care about (`hip`, `ads`, `ads_holo`, …) — or **ATTACHMENT** mode for grips / optics mounts.
3. **Nudge** position and rotation on one axis at a time with stepped precision (micro → coarse).
4. **Toggle ADS preview** and cycle optic profiles so you see the sight picture you are actually shipping.
5. Fire or draw debug traces from your **gameplay aim origin** and, if you want, from the **muzzle socket** — confirm the story matches: where the camera aims, where the barrel points, where the projectile goes.
6. **Copy** the tuned pose to the clipboard as paste-ready JSON/TOML and save it into your content files.
7. Keep procedural motion off (or minimal) while tuning so you are not chasing sway.

You stop guessing constants in a header file. You look through the sights, move the gun until honesty and beauty agree, and write that down as data.

## Mental model (30 seconds)

1. The **viewmodel root follows the camera** every frame.
2. A **hold pose** (position + euler rotation) comes from authored data: `hip` vs ADS poses.
3. ADS pose depends on the active **optic profile** (iron / holo / ACOG / sniper), with a documented fallback priority.
4. Blend with `ads_factor` in `0..1`: `pose = lerp(hip, ads_pose, ads_factor)`.
5. **Attachments** get local offsets (or sockets + offsets).
6. Bullets / traces use the **gameplay aim** (and optionally validate against muzzle); the viewmodel is dressed to sell that aim.
7. The **tuner** nudges live poses and **copies JSON/TOML** back to disk.

## Camera aim, muzzle, and trajectory

Three spaces people mix up:

| Idea | Role |
|------|------|
| **Camera / aim ray** | Gameplay truth — where the shot is *allowed* to go |
| **Viewmodel gun + irons/optic** | Player-facing aesthetics and the sight picture |
| **Muzzle / projectile spawn** | VFX and (sometimes) sim origin for projectiles |

A healthy FPS picks an explicit policy, for example:

- Hitscan / traces from camera (or a stable aim point), viewmodel tuned so irons sit on that ray at ADS
- Projectiles spawned at muzzle but **direction** taken from aim ray (common compromise)
- True muzzle-authoritative ballistics only when the viewmodel and camera are rigorously locked together

Whatever you choose, **document it**, then use aim-offset tuning so the **visible gun does not lie** about that policy. The debugger is how you keep the iron-sight promise under that policy without destroying hip-fire framing.

## Who this is for

- Anyone building or prototyping FPS / hybrid viewmodels in any engine
- Teams that want a clear data model before writing Editor tools
- Developers tired of “tweak, compile, playtest, forget which axis”

## Repo map

| Path | What |
|------|------|
| [`docs/01-overview.md`](docs/01-overview.md) | Problem, philosophy, usage in depth |
| [`docs/02-data-model.md`](docs/02-data-model.md) | Pose + weapon + attachment schemas |
| [`docs/03-tuner-ux.md`](docs/03-tuner-ux.md) | Recommended hotkey / panel contract |
| [`docs/04-frame-pipeline.md`](docs/04-frame-pipeline.md) | Pseudocode for one frame |
| [`docs/05-engine-glue.md`](docs/05-engine-glue.md) | Unity / Unreal / custom checklists |
| [`docs/06-contracts-and-gotchas.md`](docs/06-contracts-and-gotchas.md) | Axes, defaults, retune hazards |
| [`docs/07-math.md`](docs/07-math.md) | Shared formulas (lerp, slerp, optic select, aim vs muzzle) |
| [`reference/`](reference/) | Math module + [two-tab debugger UI](reference/debugger/) |
| [`schemas/`](schemas/) | JSON Schema |
| [`examples/`](examples/) | Generic TOML/JSON samples |

## Quick start

1. Read [overview](docs/01-overview.md) + [data model](docs/02-data-model.md).
2. Copy [`examples/example_smg.toml`](examples/example_smg.toml) into your content pipeline.
3. Implement the [frame pipeline](docs/04-frame-pipeline.md) in your engine.
4. Add the [tuner UX](docs/03-tuner-ux.md) (IMGUI, egui, UMG, Editor window — your call).
5. Keep [contracts](docs/06-contracts-and-gotchas.md) taped above your monitor.
6. Implement against [math](docs/07-math.md) / [`reference/viewmodel_math.ts`](reference/viewmodel_math.ts).
7. Open the [reference debugger](reference/debugger/index.html) to see the two-tab tool structure.

## What this is not

- Not a full debugger binary
- Not a dump of any proprietary game project
- Not mesh / animation / IP packs

The portable value is the **workflow + schema + math**. Engine UI adapters can come later; the formulas are already here.

## License

MIT — see [LICENSE](LICENSE).
