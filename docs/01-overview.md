# Overview

## The pain

First-person weapon ADS is a multi-dimensional fitting problem:

- Hip pose must feel good in motion.
- Iron ADS must put the sight picture on the reticle.
- Each optic (holo, ACOG, scope) needs its own eye relief / mount height.
- Attachments shift mass and sockets; their local offsets drift as art changes.
- Recompiling or scrubbing opaque constants between playtests is slow and error-prone.

## The fix

Treat hold poses as **content**, not magic numbers buried in code:

1. Store per-weapon (and per-attachment) poses in JSON/TOML.
2. At runtime, parent the viewmodel to the camera and lerp hip→ADS.
3. Ship a **debug tuner** that mutates the live config with a controller-friendly hotkey grid.
4. **Copy** the tuned values to the clipboard in a paste-ready format and save them back to disk.

You keep iterating in play mode. Art and balance stay data.

## Portable core vs engine glue

**Portable (this repo):**

- Pose / optic / attachment data model
- ADS profile priority + blend math
- Tuner UX contract (modes, axes, step sizes, clipboard)
- Gotchas (axis contracts, default rotations)

**Glue (you write once per engine):**

- Camera parenting / matrix copy
- Input routing and UI toolkit
- Mesh sockets vs pure offset mounts
- Optional barrel-stuffing rays, muzzle flash sockets, etc.

## Design principles

1. **Authoring offsets ≠ procedural motion.** Sway/bob/recoil multiply or add *after* the hold pose.
2. **One clipboard format** shared across tools so different engines and ports can exchange tunes.
3. **Explicit contracts** for forward axis and rotation label meaning — silent “fixes” destroy all existing tunes.
4. **Optic-specific ADS poses** beat one ADS pose plus endless FOV hacks.
