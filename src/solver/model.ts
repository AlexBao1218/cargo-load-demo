import type { GLPK, LP } from "glpk.js";
import type { SolveInput } from "./index";

export interface VarMeta {
  uldId: string;
  positionId: string;
}

export const CG_VAR = "cg_long";
export const DEV_VAR = "cg_dev";
export const LAT_VAR = "lat_moment";
export const LAT_ABS_VAR = "lat_abs";
export const DEFAULT_LATERAL_WEIGHT = 0.05;
/** Deviation inside ±cgBand metres of the target costs nothing (arms are given to 0.1 m). */
export const DEFAULT_CG_BAND = 0.01;
/** Lateral imbalance inside ±lateralBand kg is treated as balanced. */
export const DEFAULT_LATERAL_BAND = 200;

const varName = (uldId: string, positionId: string) => `x_${uldId}_${positionId}`;
/** glpk.js needs a finite lb even for GLP_UP rows. */
const FREE_LB = -1e9;

/**
 * Builds the MILP (spec §4.2). Pure: no side effects, no solving.
 *
 *   min  d + (λ / W) · e
 *   s.t. Σ_j x_ij = 1            ∀ i   (every ULD loaded)
 *        Σ_i x_ij ≤ 1            ∀ j   (one ULD per position)
 *        W·g − Σ w_i a_j x_ij = 0       (CG definition)
 *        g − d ≤ t + δ,  −g − d ≤ −t + δ   (d ≥ |g − t| − δ)
 *        m − Σ w_i l_j x_ij = 0         (lateral moment)
 *        m − e ≤ β,  −m − e ≤ β        (e ≥ |m| − β)
 *        x_ij = 1 for locked pairs
 *
 * Capacity, type and lock exclusions are enforced by not creating x_ij at all.
 *
 * δ (cgBand) and β (lateralBand) are small dead bands. Without them the LP
 * relaxation bound is always 0 and branch-and-bound has to prove that no
 * loading hits the target to the millimetre — a subset-sum question that
 * blows past the time limit on the 34-ULD flights. With the bands, any
 * loading inside them has objective 0 = bound and is proven optimal at once.
 */
export function buildModel(input: SolveInput, glpk: GLPK): { lp: LP; varMap: Record<string, VarMeta> } {
  const { ulds, positions, targetCg, locked } = input;
  const lateralWeight = input.lateralWeight ?? DEFAULT_LATERAL_WEIGHT;
  const cgBand = input.cgBand ?? DEFAULT_CG_BAND;
  const lateralBand = input.lateralBand ?? DEFAULT_LATERAL_BAND;
  const totalWeight = ulds.reduce((s, u) => s + u.weight, 0);
  const lockedUldAt = new Map<string, string>();
  for (const [positionId, uldId] of Object.entries(locked)) {
    if (uldId) lockedUldAt.set(uldId, positionId);
  }

  const varMap: Record<string, VarMeta> = {};
  const binaries: string[] = [];
  const bounds: NonNullable<LP["bounds"]> = [
    { name: CG_VAR, type: glpk.GLP_FR, lb: 0, ub: 0 },
    { name: DEV_VAR, type: glpk.GLP_LO, lb: 0, ub: 0 },
    { name: LAT_VAR, type: glpk.GLP_FR, lb: 0, ub: 0 },
    { name: LAT_ABS_VAR, type: glpk.GLP_LO, lb: 0, ub: 0 },
  ];

  for (const u of ulds) {
    for (const p of positions) {
      const lockedHere = lockedUldAt.get(u.id);
      if (lockedHere !== undefined && lockedHere !== p.id) continue; // ULD pinned elsewhere
      if (locked[p.id] && locked[p.id] !== u.id) continue; // position pinned to another ULD
      if (p.maxWeight < u.weight || !p.allowedTypes.includes(u.type)) continue; // capacity / type pruning
      const name = varName(u.id, p.id);
      varMap[name] = { uldId: u.id, positionId: p.id };
      binaries.push(name);
      if (lockedHere === p.id) bounds.push({ name, type: glpk.GLP_FX, lb: 1, ub: 1 });
    }
  }

  const varsFor = (pred: (m: VarMeta) => boolean, coef: (m: VarMeta) => number) =>
    Object.entries(varMap)
      .filter(([, m]) => pred(m))
      .map(([name, m]) => ({ name, coef: coef(m) }));
  const weightOf = Object.fromEntries(ulds.map((u) => [u.id, u.weight]));
  const posOf = Object.fromEntries(positions.map((p) => [p.id, p]));

  const subjectTo: LP["subjectTo"] = [
    ...ulds
      .map((u) => ({
        name: `assign_${u.id}`,
        vars: varsFor((m) => m.uldId === u.id, () => 1),
        bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 },
      }))
      // A ULD with no feasible position has an empty row; solve() reports that
      // as infeasible before calling GLPK, so the row is simply dropped here.
      .filter((row) => row.vars.length > 0),
    ...positions.map((p) => ({
      name: `cap_${p.id}`,
      vars: varsFor((m) => m.positionId === p.id, () => 1),
      bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 },
    })),
    {
      name: "cg_def",
      vars: [{ name: CG_VAR, coef: totalWeight }, ...varsFor(() => true, (m) => -weightOf[m.uldId] * posOf[m.positionId].arm)],
      bnds: { type: glpk.GLP_FX, lb: 0, ub: 0 },
    },
    { name: "dev_pos", vars: [{ name: CG_VAR, coef: 1 }, { name: DEV_VAR, coef: -1 }], bnds: { type: glpk.GLP_UP, lb: FREE_LB, ub: targetCg + cgBand } },
    { name: "dev_neg", vars: [{ name: CG_VAR, coef: -1 }, { name: DEV_VAR, coef: -1 }], bnds: { type: glpk.GLP_UP, lb: FREE_LB, ub: -targetCg + cgBand } },
    {
      name: "lat_def",
      vars: [{ name: LAT_VAR, coef: 1 }, ...varsFor(() => true, (m) => -weightOf[m.uldId] * posOf[m.positionId].lateral)],
      bnds: { type: glpk.GLP_FX, lb: 0, ub: 0 },
    },
    { name: "lat_pos", vars: [{ name: LAT_VAR, coef: 1 }, { name: LAT_ABS_VAR, coef: -1 }], bnds: { type: glpk.GLP_UP, lb: FREE_LB, ub: lateralBand } },
    { name: "lat_neg", vars: [{ name: LAT_VAR, coef: -1 }, { name: LAT_ABS_VAR, coef: -1 }], bnds: { type: glpk.GLP_UP, lb: FREE_LB, ub: lateralBand } },
  ];

  const lp: LP = {
    name: "uld_load_planner",
    objective: {
      direction: glpk.GLP_MIN,
      name: "obj",
      vars: [
        { name: DEV_VAR, coef: 1 },
        { name: LAT_ABS_VAR, coef: totalWeight > 0 ? lateralWeight / totalWeight : 0 },
      ],
    },
    subjectTo,
    bounds,
    binaries,
  };
  return { lp, varMap };
}
