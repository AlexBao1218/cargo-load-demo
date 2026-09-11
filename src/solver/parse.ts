import type { GLPK, Result } from "glpk.js";
import type { Assignment } from "@/domain/types";
import type { SolveInput, SolveResult, SolveStatus } from "./index";
import { computeCg, scoreFor } from "./cg";
import type { VarMeta } from "./model";

export function parseResult(res: Result, varMap: Record<string, VarMeta>, input: SolveInput, glpk: GLPK, solveMs: number): SolveResult {
  const s = res.result.status;
  const status: SolveStatus =
    s === glpk.GLP_OPT ? "optimal"
    : s === glpk.GLP_FEAS ? "feasible"
    : s === glpk.GLP_NOFEAS || s === glpk.GLP_INFEAS ? "infeasible"
    : "error";
  const assignment: Assignment = Object.fromEntries(input.positions.map((p) => [p.id, null]));
  const hasSolution = status === "optimal" || status === "feasible";
  if (hasSolution) {
    for (const [name, meta] of Object.entries(varMap)) {
      if ((res.result.vars[name] ?? 0) > 0.5) assignment[meta.positionId] = meta.uldId;
    }
  }
  const cg = computeCg(assignment, input.ulds, input.positions);
  const deviation = Math.abs(cg.long - input.targetCg);
  return {
    status,
    assignment,
    cg: { long: cg.long, lateralMoment: cg.lateralMoment },
    deviation,
    score: hasSolution ? scoreFor(deviation, input.cgTolerance) : 0,
    solveMs,
    message:
      status === "infeasible" ? "No loading satisfies all constraints."
      : status === "feasible" ? "Time limit reached; showing the best loading found."
      : status === "error" ? `Solver status ${s}`
      : undefined,
  };
}
