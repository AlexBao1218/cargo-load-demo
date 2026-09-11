import type { Assignment, Position, Uld } from "@/domain/types";
import { getGlpk } from "./engine";
import { buildModel } from "./model";
import { parseResult } from "./parse";

export type { CgSummary } from "./cg";
export { computeCg, scoreFor } from "./cg";
export { buildModel } from "./model";

export interface SolveInput {
  ulds: Uld[];
  positions: Position[];
  targetCg: number;
  cgTolerance: number;
  /** positionId -> uldId the user pinned; the solver must respect these. */
  locked: Assignment;
  /** objective weight for |L−R moment|, default 0.05 */
  lateralWeight?: number;
  /** metres; |cg − target| below this costs nothing (default 0.01). Keeps branch-and-bound from chasing millimetres. */
  cgBand?: number;
  /** kg; |L − R| below this is treated as balanced (default 200). */
  lateralBand?: number;
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

/** Wall-clock cap for one GLPK run, seconds. */
const TIME_LIMIT_S = 10;

/**
 * Solves the ULD assignment MILP with GLPK (wasm). Pure with respect to its
 * input; safe to call from the main thread because glpk.js runs the solver in
 * its own Web Worker in the browser (synchronously in node for tests).
 */
export async function solve(input: SolveInput): Promise<SolveResult> {
  const t0 = performance.now();
  const empty = (status: SolveStatus, message: string): SolveResult => ({
    status,
    assignment: Object.fromEntries(input.positions.map((p) => [p.id, null])),
    cg: { long: 0, lateralMoment: 0 },
    deviation: 0,
    score: 0,
    solveMs: performance.now() - t0,
    message,
  });

  if (input.ulds.length > input.positions.length) {
    return empty("infeasible", `${input.ulds.length} ULDs but only ${input.positions.length} positions.`);
  }
  const lockCheck = checkLocks(input);
  if (lockCheck) return empty("infeasible", lockCheck);
  for (const u of input.ulds) {
    const fits = input.positions.some((p) => p.maxWeight >= u.weight && p.allowedTypes.includes(u.type));
    if (!fits) return empty("infeasible", `${u.id} (${u.weight} kg, ${u.type}) fits no position.`);
  }

  try {
    const glpk = await getGlpk();
    const { lp, varMap } = buildModel(input, glpk);
    const res = await glpk.solve(lp, { msglev: glpk.GLP_MSG_OFF, presol: true, tmlim: TIME_LIMIT_S });
    return parseResult(res, varMap, input, glpk, performance.now() - t0);
  } catch (err) {
    return empty("error", err instanceof Error ? err.message : String(err));
  }
}

/** Returns a message when the locked pairs are inconsistent, else null. */
function checkLocks(input: SolveInput): string | null {
  const uldById = new Map(input.ulds.map((u) => [u.id, u]));
  const posById = new Map(input.positions.map((p) => [p.id, p]));
  const seen = new Map<string, string>();
  for (const [positionId, uldId] of Object.entries(input.locked)) {
    if (!uldId) continue;
    const p = posById.get(positionId);
    const u = uldById.get(uldId);
    if (!p) return `Locked position ${positionId} does not exist.`;
    if (!u) return `Locked ULD ${uldId} is not on this flight.`;
    const prev = seen.get(uldId);
    if (prev) return `${uldId} is locked to both ${prev} and ${positionId}.`;
    seen.set(uldId, positionId);
    if (p.maxWeight < u.weight) return `${uldId} (${u.weight} kg) exceeds ${positionId} limit (${p.maxWeight} kg).`;
    if (!p.allowedTypes.includes(u.type)) return `${u.type} is not allowed at ${positionId}.`;
  }
  return null;
}
