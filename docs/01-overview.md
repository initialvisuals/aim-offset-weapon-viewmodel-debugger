# Overview

## The problem

First-person shooters sell a simple fantasy: **where you look (and where the sights sit) is where the shot goes.**

Under the hood you usually have at least three different ideas of “where”:

1. **Camera / aim ray** — the gameplay aim direction (and often the hitscan or guidance vector).
2. **Viewmodel weapon** — a gun mesh parented to the camera, framed for silhouette, weight, and brand.
3. **Muzzle / projectile origin** — where tracers, shells, and sometimes simulated bullets appear from.

If those disagree, players get the classic FP betrayal: beautiful gun, lying trajectory. Iron sights that look centered until the tracer streaks off the sight line. Hip fire that feels stylish but has no honest link to impact. Optics that sit on the rail but never truly own the reticle.

**Aim offsets** (viewmodel hold poses — hip, ADS, per-optic ADS, attachment locals) are the authored transforms that make the *visible* gun keep the **accuracy promise** of the *logical* aim.

## Why a live debugger

ADS fitting is a multi-dimensional problem:

- Hip pose must feel good in motion and in frame.
- Iron ADS must put the sight picture on the true aim point.
- Each optic needs its own eye relief and mount height.
- Attachments shift sockets; art changes invalidate old numbers.
- Recompiling or scrubbing opaque constants between playtests is slow and error-prone.

So: store poses as **data**, nudge them **in play mode** with the real FOV and mesh, validate against your aim/muzzle policy with debug traces, then **clipboard** the result back into JSON/TOML.

## How to use it (detailed loop)

1. **Disable or minimize juice** (sway/bob/recoil) so you are not tuning noise.
2. Spawn with the weapon and attachments you care about.
3. Open the **tuner**; choose WEAPON or ATTACHMENT mode.
4. For hip: frame the gun for readability and character while keeping a known relationship to the aim ray.
5. For iron ADS: look through the sights; nudge until the aperture / front post owns the aim point — that is the **iron sights accuracy promise**.
6. For each optic pose: repeat with that sight picture; do not reuse iron ADS and hope FOV saves you.
7. Draw your **aim ray** and optional **muzzle forward** in the debugger. Confirm your project’s policy (camera-authored direction vs muzzle-authored spawn, etc.) still holds visually.
8. Copy JSON, paste into content, reload, confirm cold.
9. Only then turn procedural motion back on.

## Aesthetics vs honesty

Good FP gun feel is not “muzzle welded to screen center at all times.” Hip fire is allowed to be cinematic. Guns can sit low, long, or asymmetric for style.

The rule is sharper:

- **At the moments you claim precision (especially ADS), presentation must not contradict trajectory.**
- **Everywhere else, be deliberate:** if hip fire is inaccurate, say so with UI, bloom, or spread — do not let a glamorous barrel imply laser hitscan when the sim disagrees.

Aim-offset tuning is how art and design negotiate that line without programmers editing vectors blind.

## Philosophy: for every FPS

This is not genre-specific tech. Arena shooters, tactical shooters, immersive sims, horror FP, sci-fi rifles — all of them put a gun under a camera and ask the player to trust it.

Portable ideas:

1. Gameplay aim is one truth; the viewmodel sells it.
2. Iron / optic ADS is a contract with the player.
3. Per-optic poses beat one ADS pose plus FOV hacks.
4. Authored hold poses stay separate from sway/bob/recoil.
5. Live tuner + clipboard data closes the loop in any engine.

Unity, Unreal, custom engines — same loop. Only the glue changes (see [engine glue](05-engine-glue.md)).

## Portable core vs engine glue

**Portable (this repo):**

- Pose / optic / attachment data model
- ADS profile priority + blend math
- Tuner UX contract (modes, axes, step sizes, clipboard)
- Gotchas (axis contracts, default rotations)
- Aim-vs-muzzle policy awareness

**Glue (you write once per engine):**

- Camera parenting / matrix copy
- Input routing and UI toolkit
- Mesh sockets vs pure offset mounts
- Debug draw for aim ray / muzzle
- Optional barrel-stuffing rays, muzzle flash sockets, etc.

## Design principles (short)

1. **Authoring offsets ≠ procedural motion.**
2. **One clipboard format** so tools and ports exchange tunes.
3. **Explicit contracts** for forward axis and rotation labels.
4. **Optic-specific ADS poses** over endless FOV hacks.
5. **Sight picture ↔ impact** whenever you advertise precision.

## Math

Formulas and a portable TypeScript module: [07-math.md](07-math.md), [`reference/viewmodel_math.ts`](../reference/viewmodel_math.ts).
