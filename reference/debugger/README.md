# Reference debugger UI (Three.js demo)

Interactive block-gun viewmodel tuner with a live Three.js first-person **range**.

This is a **tech FPS demo that supports the weapon tuner** — not a shipped multiplayer game. The live range is how you prove viewmodel hold, ballistics, and movement feel in a browser. The data model / math / tuner contract stay engine-agnostic so they can later sit on a dedicated host + web client.

Demo poses are meant to be tuned *with* the on-screen tuner — dogfooding the workflow.

## Open it

ES modules + import map need HTTP (not `file://`). The page loads Three.js from a CDN (network required).

From `reference/debugger` run:

    python3 -m http.server 8765

Then open http://localhost:8765/ in a browser. Click the canvas for mouse look (pointer lock).

## What you get

1. **3D viewport** — walkable room, optics table + weapons bench, first-person block guns, cyan aim ray (camera −Z), hip crosshair.
2. **Range** — circular bullseyes + knockdown silhouette lane; **berm-peak popup figures** (~410 m, random, head/shoulders only); **firing-line sandbags** + stall benches at spawn; **waist-high side-bay benches** (~15–25 m) with breakable beer bottles (glass shards, table reset restores); side-bay **floodlights with visible floor pools** (~25/80/160/280 m from spawn — shoot the **lamp head** to kill that light until reset); **floor chalk lines** + **wall stencil distances** at circular-target ranges (50/100/150/200/300/400 m from the spawn firing line). Wall numbers are meters from spawn, not raw world `|z|`. No floating text on targets.
3. **Player** (panel closed) — WASD, Shift sprint, **C** crouch toggle / **Z** crouch hold / **mouse wheel** analog crouch height (0 stand → 1 sit; sprint+crouch = short slide), mouse look, **Q/E lean (wall-clamped)**, tiny A/D strafe tilt, RMB ADS, LMB fire, **R reload**. **Hold Space** vaults a tagged lip when prompted (tap Space is reserved; no jump yet). ADS + Space = hold-breath only.
4. **ADS** — FOV by optic (hip 90 → iron/holo 60, acog 25, sniper 10), HUD reticles + mag-optic tube/vignette, 3D iron sights. Look sens scales with optic FOV.
5. **Sway / breath** — procedural `swayRig` after authored hold (header **Sway** toggle). **ADS + hold Space** hold-breath damps sway ~3s (HUD bar). Hip-fire Space does not hold breath.
6. **Shooting kit** — **long tracer streaks** + ballistic drop; mags SMG 30 / DMR 20 / bolt sniper 5 (`mag/capacity · ∞`) — capacity follows the **weapon**, not the optic (a scope on the DMR keeps 20). Empty = dry-click. **R** reload (~1.2s SMG / ~1.4s DMR / ~2s sniper) with viewmodel dip. Bolt sniper cycles ~0.65s between shots (handle flick). Live shots eject **shell casings** (FIFO ~28) and a short **muzzle flash**. Hits spawn **small ragged impact holes + sparks** (env/sil FIFO ~50). **Paper-target holes persist** until the bench **RESET TARGETS** button. Screen-fixed +pts markers. Cheap Web Audio SFX.
7. **Sim / Arcade + HoB** — **B** cycles **Sim** (default: height-over-bore + ballistic zero so the gravity arc meets the sight ray at **zero distance**) vs **Arcade** (reticle-faithful, vel = camera forward). **`-`/`=`** cycle optic zero (25/50/100/200/300 m, default 100). **Iron sights always zero at 100 m.** Live HoB cm readout; optional aim/bore rays.
8. **Optics table** — iron / holo / acog / sniper_scope; look + **F** / click to attach. **Host limits:** SMG may use iron/holo/acog; rifle (1913 DMR) may use all four; sniper may use iron/sniper_scope. Illegal pickups dim and toast on equip; switching guns falls back to a legal default (sniper defaults to sniper_scope).
9. **Weapons bench** — Example SMG / Example Rifle / Example Sniper world props near spawn; look + **F** / click to equip (refreshes optic host rules). Red **RESET TARGETS** push-button on the same table: look + **F** / click clears paper holes, stands silhouettes, drops berm popups (reshuffles timers), restores shot-out floods and bottles, and clears glass shards (score unchanged). **G** gun dialog remains an optional backup.
10. **Movement extras** — analog crouch (wheel / C / Z; Settings crouch-height slider). Sprint into crouch **slides**. **Hold Space** (~0.22s) mantles sandbags, stall benches, tables, and low crates (not bay walls / berm). Sprint into a close lip can auto-start the same vault.
11. **Debugger (` / Backquote)** — view/attachment tabs, ads_factor, six-axis editors, Copy JSON. **G** = gun picker.
12. **Settings (`O`)** — pauses gameplay: game style, **hip reticle** toggle, aim/bore rays, **brightness / gamma** (CSS filter + mild fog lift; defaults **1.00 / 1.00**), **time of day** (0–24 h clock, default **18:30** dusk), **fog** enable + near/far (linear `THREE.Fog`, defaults **ON / 375 / 520**, softer/farther), **PLUGE** grey strip, zero distance, look sens, ADS look mul, **crouch height** 0–100%, controls cheat.

## Hotkeys

| Key | Action |
|-----|--------|
| ` (Backquote) | Toggle debugger panel |
| O | Settings (options) |
| G | Gun select |
| B | Cycle Arcade / Sim game style |
| C | Crouch toggle (on = last wheel depth or full sit) |
| Z | Crouch hold (release stands unless C is latched) |
| Mouse wheel | Analog crouch height 0–100% (pointer locked; down = lower). No Ctrl bind. |
| WASD / Shift | Move / sprint (sprint blocked while crouched; sprint+crouch = slide) |
| Q / E | Lean (wall-clamped) |
| RMB | Hold ADS |
| Hold Space | Vault when `[Hold Space] Vault` is shown (needs forward intent). Tap reserved (no jump yet). |
| ADS + Space | Hold breath (damp sway). No vault while ADS. Hip-fire Space does nothing if no lip. |
| `-` / `=` | Cycle optic zero (presets 25–300 m; clamp at ends; mainly Sim). Irons stay 100 m. |
| LMB | Fire (tracers; empty = dry click); LMB on pickup equips / resets |
| F | Bench pickup — weapon / optic / **reset-targets button** (click also works) |
| R | Reload magazine |
| Click canvas | Pointer lock |
| Insert | ADS preview |
| End / arrows / PgUp/PgDn | Pose / axis / step (panel open) |
| Esc | Exit lock / close settings / modal / panel |

When the panel is open, gameplay keys do not steal typing from axis inputs.

## Silhouette lane

Offset to the right of the circular bullseyes: original blocky steel/wood knockdown silhouettes (not a copy of any commercial target art). Zones: **head** (flops back), **pelvis** (kneel / torso drops), **chest** (rocker — needs 3 hits to fully drop). Watch the body move; center-mass alone does not instantly neutralize. The weapons-bench **RESET TARGETS** button (look + **F** / click) stands them back up, peels paper-target holes, restores bottles, and clears glass shards (score unchanged). HUD legend: `Silhouette: head / chest×3 / pelvis · berm popups · table resets`.

## Berm popups

Two–three dark steel/cardboard figures sit on the **410 m berm peaks**, slightly behind the crest so from spawn you only see **head and shoulders**. They stay down, then independently pop up for ~1.5–3.5 s (2–8 s between pops), each time jittering a bit along that peak so the same X cannot be pre-aimed. Head **50** / shoulder-chest **20**. Hit knocks them down until the next random pop; table reset drops them and reshuffles timers (score stays). Extra-good shooters only.

## Flood lamps

The glowing **fixture head** (glass/housing) is a tight hit disc. Shoot it out: that SpotLight and floor pool die, bulb goes dark, a few stretched cyan/white spark cards, glass-pop SFX. Pole and arm are generic env if you clip them — they do **not** kill the light. Table reset (or reload) restores them. Not a scoring target.


## Arcade vs Sim (game style)

Teaching toggle for ballistic policy + visual theme. Drives `state.hobZero` and `data-game-style` on `<body>`.

| Mode | Meaning | Theme |
|------|---------|--------|
| **Sim** (default) | HoB + ballistic zero — gravity arc meets the sight ray at the zero distance | Cool blue/teal tactical terminal |
| **Arcade** | Reticle-faithful aim — muzzle spawn, velocity = camera forward (idealized bore=aim) | Magenta/orange neon cabinet |

Switch via the **Game style** segmented control (debugger Ballistics bar), **Settings (`O`)**, or hotkey **`B`**. Toast on switch; HUD pill shows `SIM` / `ARCADE`. Zero distance mainly applies in Sim (controls dim in Arcade).

## Height-over-bore & zeroing

Real guns put the barrel below the optic, so the bore line and the sight line are not the same ray (**height-over-bore**). They are made to meet at a chosen **zero distance**; past that the projectile drops below the reticle under gravity.

| Control | Where | Default |
|---------|--------|---------|
| Game style (Sim / Arcade) | Ballistics bar, Settings, **B** | **Sim** (`hobZero` on) |
| Zero distance | Ballistics / Settings | **100 m** (presets 25 / 50 / 100 / 200 / 300). Optics use this; **irons always 100 m**. |
| Show aim/bore rays | Ballistics / Settings | **OFF** — cyan sight, amber launch |
| Show hip reticle | Settings | **ON** — 3px hip crosshair (ADS HUD unchanged) |
| Brightness / Gamma | Settings | **1.00 / 1.00** — CSS `brightness()`/`contrast()` on `#view3d` + mild fog/bg lift (identity / ungraded sRGB) |
| Fog | Settings | **ON** — linear `THREE.Fog` near **375** / far **520** (gentler; near 20–450, far 200–650); color tracks bg/clear |
| Time of day | Settings | **18:30** — scene sun/sky/fog (display brightness/gamma unchanged) |
| Show PLUGE strip | Settings | **OFF** — Black/Low/Mid/High/White overlay (unfiltered) |
| HoB readout | Live cm | Signed: + = muzzle below sight ray |

**Method (Sim):** sight point `S = aimOrigin + aimDir · Z`. Solve launch unit `u` so `muzzle + u·v·t + (0, −½g t², 0) = S` (low arc). Gravity still runs on the tracer every frame, so impacts near `Z` sit on the reticle and drop past it.

## Notes

- `blendHold(hip, ads_pose(optic), t)` → `holdRoot`; sway/recoil → child `swayRig`. Default `rotY` = 0.
- Look sensitivity: `lookSens * (effectiveFov / fovHip) * adsLookMul * ADS_LOOK_MUL[optic]` (blended by `adsFactor`); hold-breath multiplies ~0.65 after. Hip feel unchanged; full sniper ADS ≈ 10/90 of hip angular rate.
- Tracer policy: long visible streaks. **Sim** = spawn at muzzle with **ballistic zero** launch at `effectiveZeroDist()` (irons 100 m; other optics `zeroDist`; documents HoB). **Arcade** = direction = camera forward (reticle-faithful). Gravity / muzzle velocity per weapon (optic does not retune the cartridge).
- Settings (`O`) pauses gameplay like the debugger panel; hip reticle toggle only affects the 3px hip crosshair. If the dark range looks crushed, raise **Brightness/Gamma** or check the PLUGE strip (Black should stay distinct from Low). **Time of day** is scene lighting (default evening). Range flood **floor pools** (posts ~25/80/160/280 m, SpotLights aimed at the pool) light the lane at night; shoot the lamp head to darken a bay. Sun shadows follow the player (single ortho map). ACES filmic tone map; exposure ticks with the clock.
- Bore axis on these block guns is muzzleSocket local **−Z**. Zero solve is analytic low-arc under constant `g` (falls back to geometric aim-at-zero-point if unreachable).
- Port this state machine into your engine editor (Unity EditorWindow / Unreal EUW).

See ../viewmodel_math.ts and ../../docs/03-tuner-ux.md.
