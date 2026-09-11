import type { Assignment, Position, Uld } from "@/domain/types";

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
