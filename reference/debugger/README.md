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

1. **3D viewport** — walkable room, optics table + weapons bench + kit table, first-person block guns, cyan aim ray (camera −Z), hip crosshair.
2. **Range** — procedural concrete bay (floor / walls / berm); circular bullseyes + knockdown silhouette lane; **berm-peak popup figures** (~410 m, random, head/shoulders only); **firing-line sandbags** + stall benches at spawn; **waist-high side-bay benches** (~15–25 m) with breakable beer bottles (glass shards, table reset restores); side-bay **floodlights with visible floor pools** (~25/80/160/280 m from spawn — shoot the **lamp head** to kill that light until reset); **floor chalk lines** + **wall stencil distances** at circular-target ranges (50/100/150/200/300/400 m from the spawn firing line). Wall numbers are meters from spawn, not raw world `|z|`. No floating text on targets.
3. **Player** (panel closed) — WASD, Shift sprint, **C** crouch toggle / **Z** crouch hold / **mouse wheel** analog crouch height (0 stand → 1 sit; sprint+crouch = short slide), mouse look, **Q/E lean (wall-clamped)**, **U cycle hold** (chest / low hip / canted; last pick persists), tiny A/D strafe tilt, RMB ADS, LMB fire, **B fire mode**, **R reload**. **Hold Space** vaults a tagged lip when prompted (tap Space is reserved; no jump yet). ADS + Space = hold-breath only.
4. **ADS** — FOV by optic (hip 90 → iron/holo 60, acog 25, sniper 10), HUD reticles + mag-optic tube/vignette, 3D iron sights. Look sens scales with optic FOV. **Viewmodel DOF:** aiming slightly softens the near gun/hands (focus stays on the range); hold-breath punches the blur. Hip fire has no extra blur. HTML HUD is not blurred.
5. **Sway / breath** — procedural `swayRig` after authored hold (header **Sway** toggle). **ADS + hold Space** hold-breath damps sway ~3s (HUD bar). Hip-fire Space does not hold breath.
6. **Shooting kit** — **long tracer streaks** that fly until impact (or a ~180s sanity cap) + ballistic drop; after a hit the streak sits ~2s as a tiny spent slug. About 1-in-16 grazing wall/floor/berm hits also kick an unflattened spent slug (reflect about the normal, ~8–18% speed, then settle like brass; dead-on impacts do not skip; paper is rarer). Sky timeout is silent (no fake miss). Fog 375/520 still hides long flights; mags follow the **seated mag** (not the optic). SMG table pickups: **20** short stick (default), **45** banana, **60** double drum (no 30). Rifle **20**-rd box. Sniper **5**-rd clip. HUD `clip/capacity · ∞` (infinite reserve). Empty = dry-click. **SMG auto, in-line recoil:** **B** toggles **SEMI / AUTO** (SMG only; rifle/sniper stay semi). AUTO hold-LMB ~1200 rpm; SEMI is one shot per click. HUD shows fire mode next to ammo. **R** reload (~1.2s SMG / ~1.4s DMR / ~2s sniper) with a viewmodel lift so the mag well is in view; inside that window the mag unseats down the well, drops with a tumble, and the seated size/shape slams in from below. Bolt sniper cycles ~0.65s between shots (handle flick). Live shots eject **shell casings** (cap default **30000**, fade **12s** after they sleep; 0 = until cap recycles; despawn picks at random from the oldest third so brass does not zipper) and a short **muzzle flash** (a mounted can tamps the flash a bit). **Barrel heat** is per-weapon 0–1 stored energy (shots-through minus exponential cool, τ ≈ 4–8 s): an SMG auto dump goes orange-hot; the rifle warms on rapid fire; the bolt barely ticks. Orange/amber emissive on the barrel / muzzle device (hotter toward the muzzle); when a **suppressor** is mounted the **can** takes some of that heat. A cheap UV haze card sits just above the tube at high heat. Settings **Barrel heat** 0–2 mul (default **1**, 0 = off). Bloom already picks up the HDR emissive. Hits spawn **small ragged crater holes + a tiny stuck metal plug** (brass/steel PBR, flush in the hole; bounce hits keep the old black scuff and skip the plug) **+ sparks** (env/sil FIFO default **30000**, fade **18s**; 0 = FIFO only). **Paper-target holes persist** until the bench **RESET TARGETS** button (cap **30000**). Screen-fixed +pts markers. Cheap Web Audio SFX with named slots (`fire` by weapon class, `dry` empty-click only, `reload_release` / `reload_insert` / `reload_seat`, `pickup`, `putdown`, `bolt`, `cycle`). Empty `sfx.slots[id]` stays procedural; a later `.ogg`/`.wav` URL or `AudioBuffer` plugs in without rewriting call sites.
7. **Sim / Arcade + HoB** — **Sim** (default: height-over-bore + ballistic zero so the gravity arc meets the sight ray at **zero distance**) vs **Arcade** (reticle-faithful, vel = camera forward). Switch from **Settings (`O`)** or the debugger Ballistics bar (not a hotkey). **`-`/`=`** cycle optic zero (25/50/100/200/300 m, default 100). **Iron sights always zero at 100 m.** Live HoB cm readout; optional aim/bore rays.
8. **Optics table** — iron / holo / acog / sniper_scope; look + **F** / click to attach. **Host limits:** SMG may use iron/holo/acog; rifle (1913 DMR) may use all four; sniper may use iron/sniper_scope. Illegal pickups dim and toast on equip; switching guns falls back to a legal default (sniper defaults to sniper_scope).
9. **Weapons bench** — Example SMG / Example Rifle / Example Sniper world props near spawn (right); look + **F** / click to equip a **fresh** default kit (new instance). A few dumped kits also sit around the stall / porch at load — **F** restores that instance (mag ammo / optic / can / fire mode). **X** tosses the held kit onto the floor (swap if you already hold one). Red **RESET TARGETS** push-button on the same table: look + **F** / click clears paper holes, stands silhouettes, drops berm popups (reshuffles timers), restores shot-out floods and bottles, and clears glass shards (score unchanged). **G** gun dialog remains an optional backup.
10. **Kit table** — left of spawn. Mag bodies (SMG 20/45/60, rifle 20, sniper 5) and a unique suppressor per gun (short SMG can, longer 7.62 rifle can, long bolt can). Look + **F** / click to seat a mag or mount/unmount that gun's can. Compatible mag/can only — the wrong gun does not highlight (no-op). Seating a mag sets capacity and refills; suppressor mounts on the muzzle and inherits barrel-heat glow.
11. **Movement extras** — analog crouch (wheel / C / Z). Sprint is a bit faster. Sprint into crouch **slides** harder and carries leftover speed into walk. **Hold Space** (~0.22s) mantles sandbags, stall benches, tables, and low crates (not bay walls / berm). Sprint into a close lip can auto-start the same vault.
12. **Debugger (` / Backquote)** — view/attachment tabs, ads_factor, six-axis editors, Copy JSON. **G** = gun picker.
13. **Settings (`O`)** — pauses gameplay; tuners persist in `localStorage` (debounced, versioned). **Reset defaults** restores shipped constants (no confirm). **Copy settings** copies pretty JSON for baking new defaults. Game style, **hip reticle** toggle, aim/bore rays, **brightness / gamma** (CSS filter + mild fog lift; defaults **1.00 / 1.00**), **Pass lab** (flat screen-space chart `off` / `gray_ramp` / `chroma` / `gamma` / `trans_checker` / `fog_vs_near`, default **off**; optional world far-quad; **PIP** center crop default **off**, source `final` / `scene` / `heat`; **Freeze & save** / **`P`** writes stamped full + PIP PNGs), **FX** (**hole cap** default **30000**, 20–30000; **casing cap** default **30000**, 10–30000; **hole fade** default **18s**, 0 = FIFO only, paper holes stay until table reset; **casing fade** default **12s** after sleep, 0 = until cap recycles; lowering a cap trims oldest immediately; **decal draw** default **900 m**, 50–2000, hides paper/env holes and crater plugs; **casing draw** default **55 m**, 8–200, hides brass and spent slugs — hide not despawn), **Lighting** (clock default **18:30** dusk, **clouds** default **0.55**, plus ambient/fill/hemi/sun/rim/moon/ACES-exposure multipliers, 1.00 = authored ToD, **god rays** default **0.90**, **bloom** default **0.22**, **dither** default **0.001** (0–0.008, scale/offset/type), **barrel heat** default **1.00**), **Materials** (**concrete wear** default **0.40**, **scale** default **1.00** (0.40–1.60), **variation** default **1.00** (0–2)), **fog** enable + near/far (linear `THREE.Fog`, defaults **ON / 375 / 520**, softer/farther — still hides long tracers), **camera far** default **2000** (looking up no longer clips at 520 m), **PLUGE** grey strip, zero distance, look sens, ADS look mul, controls cheat.

## Hotkeys

| Key | Action |
|-----|--------|
| ` (Backquote) | Toggle debugger panel |
| O | Settings (options) |
| P | Freeze & save pass lab (full frame + PIP crop PNGs, stamped). Works while Settings is open; ignored while typing in an input. |
| G | Gun select |
| B | Fire mode (semi / auto). AUTO only on Example SMG; rifle/sniper toast "Semi only" once |
| C | Crouch toggle (on = last wheel depth or full sit) |
| Z | Crouch hold (release stands unless C is latched) |
| Mouse wheel | Analog crouch height 0–100% (pointer locked; down = lower). No Ctrl bind. |
| WASD / Shift | Move / sprint (sprint blocked while crouched; sprint+crouch = slide) |
| Q / E | Lean (wall-clamped) |
| U | Cycle unaimed hold (chest / low hip / canted). Last pick persists. Sprint high-ready is an overlay, not a U step. |
| RMB | Hold ADS |
| Hold Space | Vault when `[Hold Space] Vault` is shown (needs forward intent). Tap reserved (no jump yet). |
| ADS + Space | Hold breath (damp sway). No vault while ADS. Hip-fire Space does nothing if no lip. |
| `-` / `=` | Cycle optic zero (presets 25–300 m; clamp at ends; mainly Sim). Irons stay 100 m. |
| LMB | Fire (semi = click; SMG AUTO = hold ~1200 rpm); empty = dry click; LMB on pickup equips / resets |
| X | Drop the held kit in front of you (empty hands). No-op if already empty. Caps at 8 world kits. |
| F | Bench pickup — weapon / optic / mag / suppressor / **reset-targets button**, or pick up / swap a world kit (click also works) |
| R | Reload magazine (lift / mag-out / slam-in) |
| Click canvas | Pointer lock |
| Insert | ADS preview |
| End / arrows / PgUp/PgDn | Pose / axis / step (panel open) |
| Esc | Exit lock / close settings / modal / panel |

When the panel is open, gameplay keys do not steal typing from axis inputs.

## Silhouette lane

Offset to the right of the circular bullseyes: original blocky steel/wood knockdown silhouettes (not a copy of any commercial target art). Zones: **head** (flops back), **pelvis** (kneel / torso drops), **chest** (rocker — needs 3 hits to fully drop). Watch the body move; center-mass alone does not instantly neutralize. The weapons-bench **RESET TARGETS** button (look + **F** / click) stands them back up, peels paper-target holes, restores bottles, and clears glass shards (score unchanged).

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

Switch via the **Game style** segmented control (debugger Ballistics bar) or **Settings (`O`)**. Toast on switch; HUD pill shows `SIM` / `ARCADE`. Zero distance mainly applies in Sim (controls dim in Arcade).

## Height-over-bore & zeroing

Real guns put the barrel below the optic, so the bore line and the sight line are not the same ray (**height-over-bore**). They are made to meet at a chosen **zero distance**; past that the projectile drops below the reticle under gravity.

| Control | Where | Default |
|---------|--------|---------|
| Game style (Sim / Arcade) | Ballistics bar, Settings | **Sim** (`hobZero` on) |
| Zero distance | Ballistics / Settings | **100 m** (presets 25 / 50 / 100 / 200 / 300). Optics use this; **irons always 100 m**. |
| Show aim/bore rays | Ballistics / Settings | **OFF** — cyan sight, amber launch |
| Show hip reticle | Settings | **ON** — 3px hip crosshair (ADS HUD unchanged) |
| Brightness / Gamma | Settings | **1.00 / 1.00** — CSS `brightness()`/`contrast()` on `#view3d` + mild fog/bg lift (identity / ungraded sRGB) |
| Fog | Settings | **ON** — linear `THREE.Fog` near **375** / far **520** (gentler; near 20–450, far 200–650); color tracks bg/clear. Tracers can outfly this; fog still hides them. Separate from Lighting heat-haze toggles. |
| Camera far | Settings | Default **2000** (was 520) so looking up does not clip tracers at fog distance; slider/input up to **5000**. Fog 375/520 still hides them. |
| Lighting | Settings | Clock **18:30** + intensity muls **1.00×** on ToD bases (ambient / fill / hemi / sun / rim / moon / ACES exposure) + **sun size** default **0.45°** (disc + halo only) + **sun punch** default **1.40** (soft-clamped core) + **god rays** default **0.90** (0–2, 0 = off) + **bloom** default **0.22** (0–2, 0 = off) + **dither** default **0.001** (0–0.008 step 0.0001, 0 = off; scale 1, offset 0 px, type hash, animate off) + **barrel heat** default **1.00** (0–2, 0 = off) + **heat haze master** default **ON** + **barrel heat haze (cards)** default **ON** + **ground / height-fog heat haze** default **OFF**. Display grade unchanged. |
| Show PLUGE strip | Settings | **OFF** — Black/Low/Mid/High/White overlay (unfiltered) |
| Pass lab backdrop | Settings | **off** — flat screen-space chart (`gray_ramp` / `chroma` / `gamma` / `trans_checker` / `fog_vs_near`). Optional **world** far-quad for in-scene haze. Off restores ToD sky. |
| Pass lab PIP | Settings | **OFF** — ~200 px center crop + 1 px red sample rect. Source: **final** (composite), **scene** (pre-bloom dest), **heat grab** (fills when barrel cards or ground / height-fog heat haze grab). Label shows the resolved source (falls back if that RT is idle). |
| Freeze pass lab | Settings / `P` | Download `passlab-full-…png` + `passlab-pip-…png` (source in the filename/stamp). URL `?passlab=chroma&pip=1&src=scene` opens a mode immediately (`world=1` adds the far quad). |
| Hole cap / fade | Settings FX | Cap default **30000** (20–30000, step 100). Fade default **18s** after spawn (0 = FIFO only). Env/scuff + non-paper punches; paper holes wait for table reset (cap **30000**). Berm popups still clear on hide. |
| Casing cap / fade | Settings FX | Cap default **30000** (10–30000, step 100). Fade default **12s** after sleep (0 = until cap recycles). Cap/fade despawn picks at random from the oldest third (no firing-order zipper). |
| Concrete wear | Settings Materials | Default **0.40** (0–1) — dust / edge wear on bay walls, floor, berm. 0 = clean pour. Benches stay wood. |
| Concrete scale | Settings Materials | Default **1.00** (0.40–1.60) — grain-size mul. Mid = authored grit; low = finer aggregate; high = larger blotches. |
| Concrete variation | Settings Materials | Default **1.00** (0–2) — per-panel chroma/value drift. Mid = authored; 0 = flat; 2 = strong warm/cool pours. |
| HoB readout | Live cm | Signed: + = muzzle below sight ray |

**Method (Sim):** sight point `S = aimOrigin + aimDir · Z`. Solve launch unit `u` so `muzzle + u·v·t + (0, −½g t², 0) = S` (low arc). Gravity still runs on the tracer every frame, so impacts near `Z` sit on the reticle and drop past it.

## Notes

- `blendHold(hip, ads_pose(optic), t)` → `holdRoot`; sway/recoil → child `swayRig`. Default `rotY` = 0.
- Look sensitivity: `lookSens * (effectiveFov / fovHip) * adsLookMul * ADS_LOOK_MUL[optic]` (blended by `adsFactor`); hold-breath multiplies ~0.65 after. Hip feel unchanged; full sniper ADS ≈ 10/90 of hip angular rate.
- Tracer policy: long visible streaks that live until impact (or a **180s** sanity cap — enough for an 810 m/s vertical return). Opacity follows speed, not the 180s countdown, so the streak stays readable (faint at long/slow). After a hit the mesh sits **~2s** as a tiny spent slug, then despawns. Two impact looks: **stick** (most rounds) = sharpened noisy crater + a tiny flattened brass/steel PBR plug seated in the hole (same FIFO / parent as the decal, so plugs leave with figures); **bounce** (~**1-in-16**, graze only) = the old blacked scuff, no plug, plus an unflattened boat-tail slug that reflects about the surface normal (not invert), keeps ~8–18% speed plus a little tangent scatter, then settles like brass (same oldest-third / fade family as casings). Dead-on impacts do not skip; paper is rarer; no penetration table. Sky timeout with no floor hit is a silent despawn — miss SFX + scuff only on a real floor/env hit. **Sim** = spawn at muzzle with **ballistic zero** launch at `effectiveZeroDist()` (irons 100 m; other optics `zeroDist`; documents HoB). **Arcade** = direction = camera forward (reticle-faithful). Gravity / muzzle velocity per weapon (optic does not retune the cartridge). Fog 375/520 still hides long flights; default camera far is 2000 so looking up does not clip at 520 m.
- Settings (`O`) pauses gameplay like the debugger panel; hip reticle toggle only affects the 3px hip crosshair. If the dark range looks crushed, raise **Brightness/Gamma** or check the PLUGE strip (Black should stay distinct from Low). **Lighting** is scene sun/sky (default evening) plus optional intensity muls on the current clock. Range flood **floor pools** (posts ~25/80/160/280 m, SpotLights aimed at the pool) light the lane at night; shoot the lamp head to darken a bay. Sun shadows follow the player (single ortho map). Volumetric **sun shafts / god rays** ray-march that map (half-res) as occlusion streaks (tight HG, view-gated) — not a glow ball around the disc; strongest at dawn/dusk looking toward the sun down the bay, milder at noon, off at night (optional faint flood cone if looking at a lamp). **Sun size** is the sky disc + halo only; **sun punch** is a soft-clamped pinpoint core. **HDR bloom** (3-mip dual-filter, rotated/irregular taps) glows floods, muzzle, a tiny sun core, hot barrels, and tracers after the HDR capture — the sky halo stays out of the bright-pass; 0 skips the pass. **Dither** is a post-tonemap luma banding floor (default **0.001**, 0–0.008, 0 = off) so 8-bit output does not stair-step — hash + TPDF on luma, not a pixel-grid IGN; scale / pixel offset / type (hash, ign, bayer) and an optional animate toggle (off) live under Lighting; night adds a hair more plus a tiny toe on residual scene luma (sky stays black). **Barrel heat** is a 0–2 visual mul on the per-weapon thermal (0 = off); it does not touch ADS DOF, log-depth, ACES, god rays, or sky. ACES filmic tone map; exposure ticks with the clock (slider multiplies it). Bay **floor / walls / berm** use world-space procedural concrete (poured ~5–5.5 m panels near the firing line, shader slabs farther; **concrete wear / scale / variation** sliders). Benches stay wood.
- Bore axis on these block guns is muzzleSocket local **−Z**. Zero solve is analytic low-arc under constant `g` (falls back to geometric aim-at-zero-point if unreachable).
- Port this state machine into your engine editor (Unity EditorWindow / Unreal EUW).

See ../viewmodel_math.ts and ../../docs/03-tuner-ux.md.
