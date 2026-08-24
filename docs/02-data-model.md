# Data model

## PoseOffset

A single stance (hip, ADS, or attachment local):

| Field | Type | Notes |
|-------|------|--------|
| `x`,`y`,`z` | number | Local position relative to the viewmodel/camera contract |
| `rotX`,`rotY`,`rotZ` | number | Euler radians (pitch / yaw / roll in *your* labeled axes) |

Missing rotation components should follow a documented default (see [contracts](06-contracts-and-gotchas.md)). A common production default: missing `rotY` ⇒ `π/2`.

## WeaponOffsetConfig

| Field | Required | Meaning |
|-------|----------|---------|
| `schema_version` | yes | Bump when breaking the file shape |
| `weapon` | yes | Stable id (`example_smg`) |
| `hip` | yes | Default hold |
| `ads` | yes | Iron-sight ADS fallback |
| `ads_holo` | no | Holo / reflex ADS |
| `ads_acog` | no | Mid optic ADS |
| `ads_sniper_scope` | no | High-zoom ADS |

JSON Schema: [`schemas/weapon-offset-config.schema.json`](../schemas/weapon-offset-config.schema.json).

## AdsOpticProfile

Conceptual enum used when resolving which ADS pose to blend toward:

- `Iron` → `ads`
- `Holo` → `ads_holo` else `ads`
- `Acog` → `ads_acog` else `ads_holo` else `ads`
- `SniperScope` → `ads_sniper_scope` else `ads_acog` else `ads_holo` else `ads`

Priority when probing “best available” for a high optic: **sniper → acog → holo → iron**.

## Attachment offsets

Map:

```text
attachments[weaponId][attachmentId] = PoseOffset
```

Use local offset from the attachment’s parent socket (or from the weapon root if you have no sockets). Keep attachment ids stable (`holo_sight`, `foregrip`).

See [`examples/example_attachment_offsets.json`](../examples/example_attachment_offsets.json).

## Optional tuning layers

Some projects store a second file for *visual* multipliers (sway, kick, scale) separate from hold poses. Keep that optional and out of the core schema so simple ports stay small.
