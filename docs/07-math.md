# Math reference

This page is the shared math. Implementations in other languages should match these definitions.

A small portable TypeScript reference lives in [`reference/viewmodel_math.ts`](../reference/viewmodel_math.ts).

## Symbols

| Symbol | Meaning |
|--------|---------|
| \(\mathbf{p}\) | Position (local to camera / viewmodel root), \(\mathbf{p} = (x,y,z)\) |
| \(\boldsymbol{\theta}\) | Euler radians \((\theta_x, \theta_y, \theta_z) = (\mathrm{rotX}, \mathrm{rotY}, \mathrm{rotZ})\) |
| \(t\) | ADS blend factor, \(t \in [0,1]\) (`ads_factor`) |
| \(P_{\mathrm{hip}}, P_{\mathrm{ads}}\) | Authored poses (position + euler) |
| \(\mathbf{d}_{\mathrm{aim}}\) | Unit gameplay aim direction in world space (from camera / aim ray) |
| \(\mathbf{o}_{\mathrm{muzzle}}\) | Muzzle world position |
| \(\mathbf{d}_{\mathrm{muzzle}}\) | Unit muzzle forward in world space |

Axis meaning for \(\theta_x,\theta_y,\theta_z\) is a **project contract** (see [gotchas](06-contracts-and-gotchas.md)). The formulas below do not care what you call “pitch,” only that authoring and runtime agree.

## 1. Scalar and vector lerp

\[
\operatorname{lerp}(a,b,t) = a + (b-a)\,t
\]

\[
\operatorname{lerp}(\mathbf{u},\mathbf{v},t) = \mathbf{u} + (\mathbf{v}-\mathbf{u})\,t
\]

Clamp the blend:

\[
t \leftarrow \operatorname{clamp}(t, 0, 1)
\]

Optional easing (not required; apply *before* pose lerp if you want a shaped ADS feel):

\[
t' = t^2 (3 - 2t) \quad \text{(smoothstep)}
\]

## 2. Hold pose blend (position)

\[
\mathbf{p}_{\mathrm{hold}}(t) = \operatorname{lerp}\bigl(\mathbf{p}_{\mathrm{hip}},\, \mathbf{p}_{\mathrm{ads}},\, t\bigr)
\]

## 3. Hold pose blend (rotation)

### 3a. Component-wise euler lerp (simple, good for small deltas)

\[
\boldsymbol{\theta}_{\mathrm{hold}}(t) = \operatorname{lerp}\bigl(\boldsymbol{\theta}_{\mathrm{hip}},\, \boldsymbol{\theta}_{\mathrm{ads}},\, t\bigr)
\]

Apply per-component. This matches many live tuners and is stable when hip/ADS eulers stay close.

### 3b. Quaternion slerp (preferred when deltas get large)

Build quaternions with your engine’s euler→quat using the **same** axis order as authoring:

\[
q_{\mathrm{hip}} = Q(\boldsymbol{\theta}_{\mathrm{hip}}),\quad
q_{\mathrm{ads}} = Q(\boldsymbol{\theta}_{\mathrm{ads}})
\]

\[
q_{\mathrm{hold}}(t) = \operatorname{slerp}(q_{\mathrm{hip}},\, q_{\mathrm{ads}},\, t)
\]

Standard slerp (with shortest-arc fix):

\[
\begin{aligned}
\cos\Omega &= \operatorname{clamp}\bigl(q_a\cdot q_b,\,-1,\,1\bigr) \\
\text{if } \cos\Omega < 0:&\quad q_b \leftarrow -q_b,\ \cos\Omega \leftarrow -\cos\Omega \\
\text{if } \cos\Omega > 1-\varepsilon:&\quad q \leftarrow \operatorname{normalize}\bigl((1-t)q_a + t q_b\bigr) \\
\text{else: }&
\Omega = \arccos(\cos\Omega),\ 
q = \frac{\sin((1-t)\Omega)}{\sin\Omega} q_a + \frac{\sin(t\Omega)}{\sin\Omega} q_b
\end{aligned}
\]

## 4. Default missing euler components

If a file omits a component, apply a documented default at import *and* at runtime. A common default used in FPS viewmodel content:

\[
\theta_y \leftarrow \begin{cases}
\text{authored }\theta_y & \text{if present} \\
\pi/2 & \text{if omitted}
\end{cases}
\]

\[
\theta_x, \theta_z \leftarrow 0 \text{ when omitted (unless you document otherwise)}
\]

**Same defaults in the importer and the game** or clipboard round-trips drift.

## 5. Optic ADS pose selection

Let \(A_{\mathrm{iron}}, A_{\mathrm{holo}}, A_{\mathrm{acog}}, A_{\mathrm{sniper}}\) be optional authored ADS poses (`ads`, `ads_holo`, `ads_acog`, `ads_sniper_scope`). Iron `ads` is required.

\[
\operatorname{ads\_pose}(\mathrm{profile}) =
\begin{cases}
A_{\mathrm{sniper}}\ \text{??}\ A_{\mathrm{acog}}\ \text{??}\ A_{\mathrm{holo}}\ \text{??}\ A_{\mathrm{iron}} & \mathrm{SniperScope} \\
A_{\mathrm{acog}}\ \text{??}\ A_{\mathrm{holo}}\ \text{??}\ A_{\mathrm{iron}} & \mathrm{Acog} \\
A_{\mathrm{holo}}\ \text{??}\ A_{\mathrm{iron}} & \mathrm{Holo} \\
A_{\mathrm{iron}} & \mathrm{Iron}
\end{cases}
\]

where \(\text{??}\) means “first present pose.”

Then:

\[
P_{\mathrm{ads}} = \operatorname{ads\_pose}(\mathrm{profile}),\quad
\mathbf{p}_{\mathrm{hold}} = \operatorname{lerp}(P_{\mathrm{hip}}.\mathbf{p},\, P_{\mathrm{ads}}.\mathbf{p},\, t)
\]

(and likewise for rotation).

## 6. Viewmodel root from camera

Each frame, before local hold:

\[
X_{\mathrm{vm}}^{\mathrm{world}} = X_{\mathrm{cam}}^{\mathrm{world}}
\]

(or copy translation + rotation only if you keep scale separate). Authored \(\mathbf{p}_{\mathrm{hold}}, q_{\mathrm{hold}}\) are applied in **viewmodel local space** (camera child).

## 7. Composition order (critical)

\[
X_{\mathrm{final}} =
X_{\mathrm{cam}}
\cdot
X_{\mathrm{hold}}(t)
\cdot
X_{\mathrm{procedural}}
\cdot
X_{\mathrm{attachment}}
\]

Exact multiply order depends on row/column convention, but the **policy** is:

1. Parent to camera  
2. Apply **authored hold**  
3. Apply **procedural** sway / bob / recoil  
4. Apply **attachment** locals under sockets  

Do not bake procedural motion into \(P_{\mathrm{hip}}/P_{\mathrm{ads}}\).

## 8. Aim ray vs muzzle (honesty math)

Camera aim origin \(\mathbf{o}_{\mathrm{aim}}\) and direction \(\mathbf{d}_{\mathrm{aim}}\) (unit):

\[
\mathbf{r}_{\mathrm{aim}}(s) = \mathbf{o}_{\mathrm{aim}} + s\,\mathbf{d}_{\mathrm{aim}},\quad s \ge 0
\]

Muzzle:

\[
\mathbf{d}_{\mathrm{muzzle}} = \operatorname{normalize}\bigl(R_{\mathrm{vm}}\,\mathbf{f}_{\mathrm{content}}\bigr)
\]

where \(\mathbf{f}_{\mathrm{content}}\) is your content forward (e.g. \((1,0,0)\) or \((0,0,-1)\)) and \(R_{\mathrm{vm}}\) is the final viewmodel rotation.

### Policy A — camera-authored hitscan / direction

Gameplay uses \(\mathbf{d}_{\mathrm{aim}}\). Viewmodel is tuned so that at \(t=1\) (full ADS) the sight line visually coincides with \(\mathbf{r}_{\mathrm{aim}}\). Projectiles may still *spawn* at \(\mathbf{o}_{\mathrm{muzzle}}\) but use \(\mathbf{d}_{\mathrm{aim}}\) for direction.

### Policy B — muzzle-authored direction

Gameplay uses \(\mathbf{d}_{\mathrm{muzzle}}\). Then ADS tuning must drive \(\mathbf{d}_{\mathrm{muzzle}} \approx \mathbf{d}_{\mathrm{aim}}\) at \(t=1\), or the iron-sight promise fails.

### Alignment error (debug metric)

\[
e_{\mathrm{dir}} = 1 - \mathbf{d}_{\mathrm{muzzle}}\cdot\mathbf{d}_{\mathrm{aim}}
\]

\[
e_{\mathrm{sight}} = \bigl\| (\mathbf{o}_{\mathrm{sight}} - \mathbf{o}_{\mathrm{aim}}) \times \mathbf{d}_{\mathrm{aim}} \bigr\|
\]

(distance from a sight aperture point \(\mathbf{o}_{\mathrm{sight}}\) to the aim ray). Tune until \(e_{\mathrm{dir}}\) and \(e_{\mathrm{sight}}\) are small at ADS — that is the measurable form of the iron-sight accuracy promise.

## 9. Nudge step (tuner)

For selected component \(c\) and step \(\Delta\):

\[
c \leftarrow c + \sigma\,\Delta,\quad \sigma \in \{-1,+1\}
\]

Example step ladders (scale to your unit system):

| Step | \(\Delta p\) | \(\Delta \theta\) (rad) |
|------|--------------|-------------------------|
| MICRO | \(5\cdot10^{-4}\) | \(10^{-3}\) |
| FINE | \(2\cdot10^{-3}\) | \(5\cdot10^{-3}\) |
| MED | \(10^{-2}\) | \(2\cdot10^{-2}\) |
| COARSE | \(5\cdot10^{-2}\) | \(10^{-1}\) |

## 10. Attachment local

\[
X_{\mathrm{att}} = X_{\mathrm{socket}} \cdot X_{\mathrm{offset}}
\]

with \(X_{\mathrm{offset}}\) from the attachment pose table (same \(\mathbf{p},\boldsymbol{\theta}\) schema as weapon holds).

---

If your port disagrees with this page, **change the port** or **bump `schema_version`** — do not silently reinterpret old numbers.
