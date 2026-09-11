import { describe, it, expect } from "vitest";
import { getGlpk } from "./engine";
import { buildModel } from "./model";
import { solve } from "./index";
import type { Position, Uld } from "@/domain/types";

const P = (id: string, arm: number, lateral: -1 | 0 | 1, maxWeight = 5000, allowedTypes: Uld["type"][] = ["AKE", "AMA"]): Position =>
  ({ id, arm, lateral, maxWeight, section: "mid", allowedTypes });
const U = (id: string, weight: number, type: Uld["type"] = "AKE"): Uld => ({ id, weight, type });

describe("buildModel", () => {
  it("omits variables for pairs that violate capacity or type", async () => {
    const glpk = await getGlpk();
    const { lp, varMap } = buildModel({
      ulds: [U("u1", 3000), U("u2", 6000, "AMA")],
      positions: [P("p1", 10, 0, 4000, ["AKE"]), P("p2", 20, 0, 7000)],
      targetCg: 15, cgTolerance: 2, locked: {},
    }, glpk);
    expect(Object.keys(varMap).sort()).toEqual(["x_u1_p1", "x_u1_p2", "x_u2_p2"]);
    expect(lp.binaries).toHaveLength(3);
  });
});

describe("solve", () => {
  it("picks the assignment closest to target", async () => {
    const r = await solve({ ulds: [U("h", 4000), U("l", 1000)], positions: [P("front", 10, 0), P("back", 30, 0)], targetCg: 26, cgTolerance: 2, locked: {} });
    expect(r.status).toBe("optimal");
    expect(r.assignment).toEqual({ front: "l", back: "h" }); // cg = (1000*10+4000*30)/5000 = 26
    expect(r.deviation).toBeCloseTo(0, 6);
    expect(r.score).toBe(100);
  });
  it("never puts a heavy ULD on a light position", async () => {
    const r = await solve({ ulds: [U("h", 4500)], positions: [P("weak", 20, 0, 4000), P("strong", 40, 0, 5000)], targetCg: 20, cgTolerance: 2, locked: {} });
    expect(r.assignment.strong).toBe("h");
  });
  it("respects locked positions", async () => {
    const r = await solve({ ulds: [U("a", 2000), U("b", 2000)], positions: [P("p1", 10, 0), P("p2", 30, 0)], targetCg: 20, cgTolerance: 2, locked: { p2: "a" } });
    expect(r.assignment).toEqual({ p1: "b", p2: "a" });
  });
  it("prefers the laterally balanced solution among CG-equal ones", async () => {
    const r = await solve({ ulds: [U("a", 3000), U("b", 3000), U("c", 1000), U("d", 1000)], positions: [P("1L", 10, -1), P("1R", 10, 1), P("2L", 30, -1), P("2R", 30, 1)], targetCg: 20, cgTolerance: 2, locked: {} });
    expect(r.cg.lateralMoment).toBe(0);
  });
  it("reports infeasible when a ULD fits nowhere", async () => {
    const r = await solve({ ulds: [U("big", 9000)], positions: [P("p", 10, 0, 5000)], targetCg: 10, cgTolerance: 2, locked: {} });
    expect(r.status).toBe("infeasible");
    expect(r.message).toMatch(/big/);
  });
  it("reports infeasible when a lock violates capacity or type", async () => {
    const r = await solve({ ulds: [U("h", 4500), U("m", 1000, "AMA")], positions: [P("weak", 20, 0, 4000), P("strong", 40, 0, 5000, ["AKE"])], targetCg: 20, cgTolerance: 2, locked: { weak: "h" } });
    expect(r.status).toBe("infeasible");
    expect(r.message).toMatch(/h .*weak/);
    const r2 = await solve({ ulds: [U("h", 4500), U("m", 1000, "AMA")], positions: [P("weak", 20, 0, 4000), P("strong", 40, 0, 5000, ["AKE"])], targetCg: 20, cgTolerance: 2, locked: { strong: "m" } });
    expect(r2.status).toBe("infeasible");
    expect(r2.message).toMatch(/AMA.*strong/);
  });
  it("proves optimality even when the target band is unreachable (heavy tail locks)", async () => {
    const { FLIGHTS } = await import("@/data/flights");
    const f = FLIGHTS[0];
    const locked = { QL: "ULD-S", QR: "ULD-R", PL: "ULD-Q", PR: "ULD-P", OL: "ULD-O", OR: "ULD-N", R1: "ULD-M" };
    const r = await solve({ ulds: f.ulds, positions: f.positions, targetCg: f.targetCg, cgTolerance: f.cgTolerance, locked });
    expect(r.status).toBe("optimal");
    for (const [p, u] of Object.entries(locked)) expect(r.assignment[p]).toBe(u);
    expect(r.deviation).toBeGreaterThan(0.5);
    expect(r.score).toBeLessThan(100);
  });
  it("solves all shipped flights optimally in under 2 s", async () => {
    const { FLIGHTS } = await import("@/data/flights");
    for (const f of FLIGHTS) {
      const r = await solve({ ulds: f.ulds, positions: f.positions, targetCg: f.targetCg, cgTolerance: f.cgTolerance, locked: {} });
      // eslint-disable-next-line no-console
      console.log(`${f.id}: ${r.status} in ${r.solveMs.toFixed(1)} ms, cg=${r.cg.long.toFixed(3)} target=${f.targetCg} dev=${r.deviation.toFixed(4)} lat=${r.cg.lateralMoment} score=${r.score}`);
      expect(r.status).toBe("optimal");
      expect(r.solveMs).toBeLessThan(2000);
      expect(r.deviation).toBeLessThan(0.5);
    }
  }, 20000);
});
