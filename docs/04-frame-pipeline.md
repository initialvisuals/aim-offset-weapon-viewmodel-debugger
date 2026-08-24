# Frame pipeline (pseudocode)

```text
each frame:
  # 1. Viewmodel follows camera
  viewmodel.world = camera.world   # or copy position+rotation only

  # 2. Resolve optic profile from equipped attachments / ADS state
  profile = current_optic_profile()  # Iron | Holo | Acog | SniperScope

  # 3. Pick poses
  cfg = offsets[weapon_id]
  hip = cfg.hip
  ads = ads_pose(cfg, profile)      # see priority rules

  # 4. Blend hold
  t = clamp(ads_factor, 0, 1)       # 0 hip .. 1 full ADS
  hold.pos = lerp(hip.pos, ads.pos, t)
  hold.rot = lerp_euler(hip.rot, ads.rot, t)  # or slerp quats derived from euler

  # 5. Apply authored hold BEFORE procedural layers
  viewmodel.local = hold

  # 6. Procedural layers (optional, separate knobs)
  apply_sway_bob_recoil(viewmodel)

  # 7. Attachments
  for each attachment:
    parent = socket_or_weapon_root(attachment)
    local = attachment_offsets[weapon_id][attachment.id] ?? identity
    attachment.local = local

  # 8. Muzzle / VFX
  muzzle_world = weapon_socket("muzzle") or estimate_from_barrel_length()
```

## `ads_pose` priority

```text
fn ads_pose(cfg, profile):
  match profile:
    SniperScope => cfg.ads_sniper_scope ?? cfg.ads_acog ?? cfg.ads_holo ?? cfg.ads
    Acog        => cfg.ads_acog ?? cfg.ads_holo ?? cfg.ads
    Holo        => cfg.ads_holo ?? cfg.ads
    Iron        => cfg.ads
```

## Notes

- Prefer converting euler → quaternion for blend if your engine fights euler interpolation.
- Keep barrel-stuffing / wall avoidance as a **hip-only** or blend-out effect so ADS doesn’t fight the sight picture.
- Publish muzzle world pos/dir for tracers *after* final viewmodel transform.
