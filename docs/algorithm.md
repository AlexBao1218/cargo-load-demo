# How the load planner decides — the algorithm

What the hackathon version did, what this rebuild does, how it compares with the
weight-and-balance literature, and what a real system adds. Everything below is
verifiable in `src/solver/` and its tests.

## 1. The hackathon model (cxhack25, 2025)

The original entry solved a mixed-integer linear programme (MILP) with GLPK on a
Next.js API route, reading data from a hosted database. Transcribed from
`src/lib/glpkOptimizer.ts`:

- **Variables.** One binary `x_u{i}_p{j}` per ULD *i* and position *j* — the full
  |U|·|P| grid, no pruning. Two continuous variables: `cg_long` (free) and
  `cg_dev ≥ 0`.
- **Constraints.** Three families:
  1. `assign_uld_i`: Σ_j x_ij = 1 — every ULD is loaded;
  2. `position_capacity_j`: Σ_i x_ij ≤ 1 — at most one ULD per position;
  3. `cg_balance`: W·cg_long − Σ_ij w_i·pos_j·x_ij = 0, plus two rows
     `cg_above_target` / `cg_below_target` that linearise `cg_dev ≥ |cg_long − t|`.
- **Objective.** Minimise `cg_dev`. Score = 100 − 100·dev / 5.

Three things were missing and one was wrong: position weight limits
(`max_weight`) were never read, so a 4.8 t ULD could land on a 4.2 t nose
position; left/right balance was not modelled; ULD type compatibility (nose
positions are AKE-only) was ignored; and the `cg_balance` row used the
position's `xpos` column, which in the seed data was the *lateral* pixel
coordinate (25 / 50 / 75), while `target_cg_long` was longitudinal — the "CG"
being minimised was not the longitudinal CG. Every optimise click was also a
server round-trip.

## 2. The demo's model

The rebuild keeps the assignment core, fixes the four issues, adds a lateral
term and user-pinned positions, and runs entirely in the browser (GLPK 5.0
compiled to WebAssembly via `glpk.js`, in its own Web Worker).

**Sets and parameters.** ULDs *i* ∈ *U* with weight *w_i* and type; positions
*j* ∈ *P* with arm *a_j* (metres from datum), lateral *l_j* ∈ {−1, 0, 1},
weight limit *c_j* and allowed types; target CG *t*; total weight
*W* = Σ_i *w_i*.

**Variables.**

- *x_ij* ∈ {0, 1} — ULD *i* in position *j*. Created **only** when
  *w_i* ≤ *c_j*, the type is allowed, and neither *i* nor *j* is pinned
  elsewhere.
- *g* ∈ ℝ — longitudinal CG; *d* ≥ 0 — its deviation from target.
- *m* ∈ ℝ — lateral moment Σ *w_i l_j x_ij* (kg, left negative); *e* ≥ 0 — its
  excess.

**Constraints.**

```
Σ_j x_ij = 1                       ∀ i      every ULD loaded
Σ_i x_ij ≤ 1                       ∀ j      one ULD per position
W·g − Σ_ij w_i a_j x_ij = 0                 CG definition (linear: W is a constant)
 g − d ≤  t + δ
−g − d ≤ −t + δ                             d ≥ |g − t| − δ
m − Σ_ij w_i l_j x_ij = 0                   lateral moment
 m − e ≤ β
−m − e ≤ β                                  e ≥ |m| − β
x_ij = 1                           locked   user-pinned pairs (fixed bounds)
```

**Objective.** min *d* + λ·*e* / *W*, with λ = 0.05 (`lateralWeight`). Dividing
by *W* turns the lateral term into a CG-like offset so both terms are in metres
and the deviation term dominates.

**Score.** 100 · max(0, 1 − *d* / tolerance), rounded; tolerance is 2.0 m for the
shipped flights. The deviation shown in the UI is recomputed from the final
assignment (`computeCg`), not read from the solver's *d*, so the bands below
never inflate the score.

### Why the absolute values are linearised this way

*d* ≥ |*g* − *t*| is equivalent to the pair *d* ≥ *g* − *t* and
*d* ≥ *t* − *g*. Because *d* is minimised it never carries slack: at the optimum
it equals the larger of the two, i.e. the absolute value. Likewise *e* ≥ |*m*|.

### Why capacity is pruning rather than a constraint

The textbook row *w_i x_ij* ≤ *c_j* is, for binary *x_ij*, either vacuous or
forces *x_ij* = 0. Omitting the variable in the second case is exactly
equivalent, shrinks the model, and makes type restrictions and pins free — the
same test at variable creation. For CX2025 this drops 34·34 = 1156 to 1091
binaries.

### Why there are dead bands (δ, β) — a deviation from the design spec

The spec's model had no bands, and on the shipped data it did not terminate:
the LP relaxation can always hit the target exactly, so the bound is 0, and
branch-and-bound must then prove that *no* integer loading beats the best one
found — a subset-sum question over the ULD weights. Even with the lateral term
removed, GLPK could not prove a 0.36 mm deviation optimal on CX5678 within the
10 s limit and returned `feasible`.

Sub-millimetre optimality is meaningless: arms are given to 0.1 m and real CG
targets are bands, not points. So |*g* − *t*| ≤ δ = 0.01 m and |*m*| ≤ β = 200 kg
count as "on target". Any loading inside both bands has objective 0, equal to the
bound, and is proven optimal the moment it is found; outside them the objective
is unchanged. Both are optional `SolveInput` fields (`cgBand`, `lateralBand`).
The alternative — a constant objective offset plus GLPK's relative `mipgap` — was
tested and rejected: GLPK reports gap termination as `GLP_FEAS`, so the status
would never honestly read "optimal".

### Pre-checks before GLPK

`solve()` returns `infeasible` with a specific message, without building a
model, when there are more ULDs than positions, a ULD fits nowhere, or a pin is
inconsistent (unknown id, over the limit, wrong type, one ULD pinned twice).
A run that hits the 10 s limit with a solution in hand returns `feasible`;
solver exceptions return `error`.

## 3. Size and solve time

Rows: |U| + |P| + 6. Columns: pruned binaries + 4 continuous. Measured with
`npx vitest run src/solver` (node, glpk.js 5.0.0, Apple Silicon arm64; the
browser runs the same wasm):

| Flight | ULDs | Binaries | Status | Solve | CG dev | Lateral |
|---|---|---|---|---|---|---|
| CX2025 | 34 | 1091 | optimal | 91 ms | 0.008 m | 86 kg |
| CX1234 | 24 | 771 | optimal | 362 ms | 0.002 m | 172 kg |
| CX5678 | 16 | 517 | optimal | 36 ms | 0.006 m | −173 kg |

With the seven heaviest ULDs pinned to the tail (target unreachable, deviation
1.1 m) CX2025 still proves optimality in under 10 ms — pins remove freedom, so
the search gets easier. Wasm instantiation is a one-off on first call and is not
included above.

## 4. Literature comparison

| Paper | Problem variant | Method | What they add that this demo omits |
|---|---|---|---|
| Mongeau & Bès 2003 | Select and place uniform containers to maximise loaded weight with CG inside a target range | MILP | Cargo selection (not everything must fly), CG as a hard range, Airbus case study |
| Kaluzny & Shaw 2009 | Military airlift: non-standard rectangular items, maximise items carried, balance load | MILP with 2-D placement | Item geometry / packing, floor placement in continuous coordinates |
| Limbourg, Schyns & Laporte 2012 | Containers and pallets on a compartmentalised freighter (Boeing 747), minimise moment of inertia | MILP, ~7 000 constraints | CG envelope, lateral balance, combined and cumulative (shear) load limits, position–ULD contour compatibility |
| Vancroonenburg et al. 2014 | Profit-maximising cargo selection with CG deviation as a secondary objective | MILP | Revenue-driven selection, structural and safety constraints as hard limits, industrial partner data |
| Lurkin & Schyns 2015 | Multi-airport routes with pick-up and delivery at intermediate stops | MILP (branch-and-cut), NP-hardness proof | Multi-leg sequencing, handling cost, per-leg W&B, TNT Airways data |
| Brandt & Nickel 2019 | Survey; defines the Air Cargo Load Planning Problem as four sub-problems | Literature review | Aircraft configuration, build-up scheduling, palletisation — everything upstream of W&B |

In Brandt & Nickel's taxonomy the demo is a small **Weight and Balance Problem**
alone: cargo is already palletised, the configuration is fixed, all ULDs must
fly, and the objectives are CG deviation and lateral balance. It is closest to
Mongeau & Bès (assignment binaries, linear CG row) with the CG range replaced by
a soft target and selection dropped.

## 5. What a real weight-and-balance system adds

- **CG in %MAC against an envelope**, not a point: forward and aft limits at
  zero-fuel, take-off and landing weight, satisfied along the whole flight.
- **Fuel.** Burn and tank sequencing move the CG in cruise; the loadsheet
  covers the trajectory.
- **Structural limits** beyond per-position weight: floor running loads
  (kg/m), area loads, cumulative (shear) curves along the fuselage, lateral
  imbalance and door/sill limits.
- **ULD contours.** Each position accepts specific base sizes and height
  contours; a 96×125 pallet does not go where an AKE does.
- **Multi-leg** routings with offloads and uplifts at each stop.
- **Dangerous goods** segregation, live animals, priority and offload rules,
  must-fly / cannot-fly-together shipments.
- **Certification.** The output is a signed loadsheet validated against the
  manufacturer's W&B manual.

## 6. Honest limits of this demo

- Positions, arms, limits and ULD lists are the hackathon's synthetic values
  re-scaled to a plausible metric frame — not Boeing 747-8F data.
- Lateral balance uses a unit-less {−1, 0, +1} column index; "200 kg" of
  imbalance is a proxy, not a moment about the centreline.
- One CG target and tolerance per flight; no envelope, fuel or multi-leg.
- Capacity is per position; no running, area, cumulative or door limits.
- GLPK lacks the cuts and heuristics of commercial solvers. The dead bands make
  the shipped cases fast, but a pathological hand-built scenario can still hit
  the 10 s limit, in which case the UI shows the best loading found.

## 7. References

All entries verified against Crossref metadata on 2026-09-11.

1. Mongeau, M. and Bès, C. (2003). Optimization of aircraft container loading.
   *IEEE Transactions on Aerospace and Electronic Systems*, 39(1), 140–150.
   doi:10.1109/TAES.2003.1188899
2. Kaluzny, B. L. and Shaw, R. H. A. D. (2009). Optimal aircraft load
   balancing. *International Transactions in Operational Research*, 16(6),
   767–787. doi:10.1111/j.1475-3995.2009.00723.x
3. Limbourg, S., Schyns, M. and Laporte, G. (2012). Automatic aircraft cargo
   load planning. *Journal of the Operational Research Society*, 63(9),
   1271–1283. doi:10.1057/jors.2011.134
4. Vancroonenburg, W., Verstichel, J., Tavernier, K. and Vanden Berghe, G.
   (2014). Automatic air cargo selection and weight balancing: a mixed integer
   programming approach. *Transportation Research Part E: Logistics and
   Transportation Review*, 65, 70–83. doi:10.1016/j.tre.2013.12.013
5. Lurkin, V. and Schyns, M. (2015). The Airline Container Loading Problem with
   pickup and delivery. *European Journal of Operational Research*, 244(3),
   955–965. doi:10.1016/j.ejor.2015.02.027
6. Brandt, F. and Nickel, S. (2019). The air cargo load planning problem — a
   consolidated problem definition and literature review on related problems.
   *European Journal of Operational Research*, 275(2), 399–410.
   doi:10.1016/j.ejor.2018.07.013
7. GLPK (GNU Linear Programming Kit) 5.0, Free Software Foundation;
   `glpk.js` 5.0.0, WebAssembly build by Jan Vaillant,
   https://github.com/jvail/glpk.js
