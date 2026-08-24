# Engine glue checklists

Use these as port checklists. The data model stays the same; only parenting, input, and UI change.

## Unity (HDRP/URP/Built-in)

- [ ] Viewmodel root is a child of the FPS camera (or copy camera TRS each `LateUpdate`)
- [ ] Offsets loaded from ScriptableObject / Addressables / JSON in StreamingAssets
- [ ] Tuner: IMGUI or UI Toolkit play-mode window; don’t require exiting play mode to save
- [ ] Clipboard via `GUIUtility.systemCopyBuffer`
- [ ] Attachments: prefer empty GameObject sockets on the gun FBX; store additive local TRS
- [ ] Euler order: document Unity’s ZXY (or whatever you use) in your project README
- [ ] Optional: assembly definition so the tuner strips from release builds

## Unreal Engine

- [ ] Camera component owns viewmodel via attach or explicit world TRS copy in Camera pipeline
- [ ] Data: DataAsset or JSON via `FJsonObjectConverter`; cook-friendly
- [ ] Tuner: Editor Utility Widget for edit-time + simple on-screen debug for PIE
- [ ] Clipboard: `FPlatformApplicationMisc::ClipboardCopy`
- [ ] Sockets: `USkeletalMeshSocket` / weapon mesh sockets; offsets as relative transforms
- [ ] Be explicit about UE’s rotation convention (pitch/yaw/roll degrees in editor vs radians in raw JSON — convert at the boundary)

## Custom / personal engines

- [ ] One function: `set_viewmodel_world_from_camera()`
- [ ] One registry: `weapon_id → WeaponOffsetConfig` (+ attachment map)
- [ ] One importer/exporter for the clipboard JSON
- [ ] Hotkeys go through a debug input layer that is compile-time or cvar gated
- [ ] Write axis remap once (`content_forward` ↔ `sim_forward`) and never sprinkle it

## Shared “definition of done” for a port

1. Can open tuner in a running build
2. Can nudge hip and see it immediately
3. Can toggle ADS preview and cycle optic poses
4. Can copy JSON and paste into a file that reloads (hot reload or restart)
5. Ship build can disable the tuner without deleting offset data
