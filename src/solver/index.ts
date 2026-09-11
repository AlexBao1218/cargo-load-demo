import type { Assignment, Position, Uld } from "@/domain/types";

export interface SolveInput {
  ulds: Uld[];
  positions: Position[];
  targetCg: number;
  cgTolerance: number;
  /** positionId -> uldId the user pinned; the solver must respect these. */
  locked: Assignment;
  /** objective weight for |L−R moment|, default 0.05 */
  lateralWeight?: number;
}

export type SolveStatus = "optimal" | "feasible" | "infeasible" | "error";

export interface SolveResult {
  status: SolveStatus;
  assignment: Assignment; // full map for all positions
  cg: { long: number; lateralMoment: number };
  deviation: number; // |cg.long − targetCg|
  score: number; // 0..100
  solveMs: number;
  message?: string;
}

export interface CgSummary {
  long: number;
  lateralMoment: number;
  totalWeight: number;
}

export function computeCg(assignment: Assignment, ulds: Uld[], positions: Position[]): CgSummary {
  const weightOf = new Map(ulds.map((u) => [u.id, u.weight]));
  let totalWeight = 0;
  let moment = 0;
  let lateralMoment = 0;
  for (const p of positions) {
    const uldId = assignment[p.id];
    if (!uldId) continue;
    const w = weightOf.get(uldId) ?? 0;
    totalWeight += w;
    moment += w * p.arm;
    lateralMoment += w * p.lateral;
  }
  return { long: totalWeight ? moment / totalWeight : 0, lateralMoment, totalWeight };
}

export function scoreFor(deviation: number, tolerance: number): number {
  return Math.round(100 * Math.max(0, 1 - deviation / tolerance));
}

/**
 * STUB — greedy heavy-to-centre placement so the UI can be built against the contract.
 * Workstream A replaces this function with the GLPK MILP solver (same signature).
 */
export async function solve(input: SolveInput): Promise<SolveResult> {
  const t0 = performance.now();
  const assignment: Assignment = Object.fromEntries(input.positions.map((p) => [p.id, null]));
  Object.assign(assignment, input.locked);
  const lockedUlds = new Set(Object.values(input.locked).filter(Boolean));
  const free = input.ulds.filter((u) => !lockedUlds.has(u.id)).sort((a, b) => b.weight - a.weight);
  const open = input.positions
    .filter((p) => !assignment[p.id])
    .sort((a, b) => Math.abs(a.arm - input.targetCg) - Math.abs(b.arm - input.targetCg));
  for (const u of free) {
    const slot = open.find((p) => !assignment[p.id] && p.maxWeight >= u.weight && p.allowedTypes.includes(u.type));
    if (!slot) {
      return {
        status: "infeasible",
        assignment,
        cg: { long: 0, lateralMoment: 0 },
        deviation: 0,
        score: 0,
        solveMs: performance.now() - t0,
        message: `No position fits ${u.id}`,
      };
    }
    assignment[slot.id] = u.id;
  }
  const cg = computeCg(assignment, input.ulds, input.positions);
  const deviation = Math.abs(cg.long - input.targetCg);
  return {
    status: "feasible",
    assignment,
    cg: { long: cg.long, lateralMoment: cg.lateralMoment },
    deviation,
    score: scoreFor(deviation, input.cgTolerance),
    solveMs: performance.now() - t0,
  };
}
