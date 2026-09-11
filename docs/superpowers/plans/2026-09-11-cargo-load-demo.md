# Cargo Load Planner Demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the cxhack25 ULD load planner as a browser-only, airline-app-style interactive demo with an extended GLPK MILP solver, plus research doc and zijun.cloud integration.

**Architecture:** Vite + React SPA. `src/solver/` is a pure module (model builder + result parser) that talks to `glpk.js` (which runs GLPK wasm in its own Web Worker in the browser, synchronously in node for tests). `src/store/` (zustand) holds the current flight, assignment and locks; components under `src/components/` render a horizontally scrollable fuselage and a ULD tray, and call the store. Data is three static scenarios in `src/data/flights.ts`.

**Tech Stack:** Vite 6, React 19, TypeScript 5 strict, Tailwind CSS v4 (`@tailwindcss/vite`), zustand 5, @dnd-kit/core 6, glpk.js 5.0.0, lucide-react, @fontsource/ibm-plex-sans, vitest 3.

Spec: `docs/superpowers/specs/2026-09-11-cargo-load-demo-design.md` (read it first).
Source of truth for the original app: `/private/tmp/claude-501/-Users-asuna-Desktop-zijun-cloud--claude-worktrees-airline-app-optimization-1a0b61/97f28e60-1136-44f5-aa99-64d2b8b0ffd3/scratchpad/cxhack25` (read-only reference; never copy files from it wholesale).

---

## Workstreams and ownership

Task 0 (scaffold) is done first by the integrator. Then three agents run in parallel. **Ownership is exclusive — never edit files outside your workstream. Do not run `git commit`; the integrator commits.**

| Workstream | Owns | Must not touch |
|---|---|---|
| A · Solver + research | `src/solver/**`, `docs/algorithm.md` | everything else |
| B · UI | `src/components/**`, `src/store/**`, `src/app/**`, `src/index.css`, `src/main.tsx`, `index.html` | `src/solver/**`, `src/domain/**`, `src/data/**` |
| C · Docs + site | `PROJECT.md`, `README.md`, `docs/case-study.md`, zijun.cloud `content/projects/cathay-hackathon/{en,zh}.json` | `src/**` |

Shared, frozen after Task 0: `src/domain/types.ts`, `src/data/flights.ts`, `src/solver/index.ts` public signatures.

---

## File structure

```
cargo-load-demo/
  index.html
  package.json
  vite.config.ts            # react + tailwind plugins, vitest alias glpk.js -> glpk.js/node
  tsconfig.json
  eslint.config.js
  src/
    main.tsx                # mounts <App/>
    index.css               # @import "tailwindcss"; @theme tokens; font import
    domain/types.ts         # Uld, Position, Flight, Assignment (spec §3)
    data/flights.ts         # 3 scenarios
    solver/
      index.ts              # public API: solve(), computeCg(), SolveInput/SolveResult
      model.ts              # buildModel(input, glpk) -> { lp, varMap }
      parse.ts              # parseResult(result, varMap, input) -> SolveResult
      engine.ts             # lazy singleton: await GLPK()
      solver.test.ts
    store/useLoadStore.ts
    app/App.tsx             # layout shell
    components/
      TopBar.tsx
      SectionTabs.tsx
      AircraftView.tsx      # scroll container + fuselage svg + tile grid
      Fuselage.tsx          # the SVG outline only
      PositionTile.tsx
      UldTray.tsx
      UldChip.tsx
      StatusBar.tsx
      CgGauge.tsx
      HowItWorksDrawer.tsx
      Toast.tsx             # tiny toast store + view
      layout.ts             # position -> {x,y} pixel map for the fuselage
  docs/
    algorithm.md
    case-study.md
  PROJECT.md
  README.md
```

---

## Task 0: Scaffold (integrator)

**Files:** everything under "File structure" that is shared: `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `index.html`, `src/main.tsx`, `src/index.css`, `src/domain/types.ts`, `src/data/flights.ts`, `src/solver/index.ts` (stub), `src/app/App.tsx` (placeholder), `.gitignore`.

- [ ] **Step 1: Create the Vite project and install deps**

```bash
cd ~/Desktop/cargo-load-demo
npm create vite@latest . -- --template react-ts   # answer "Ignore files and continue" if prompted
npm i react@19 react-dom@19 zustand@5 @dnd-kit/core@6 glpk.js@5.0.0 lucide-react @fontsource/ibm-plex-sans
npm i -D tailwindcss@4 @tailwindcss/vite@4 vitest@3 @types/node
```

- [ ] **Step 2: `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    alias: { "glpk.js": "glpk.js/node" },
  },
});
```

- [ ] **Step 3: `tsconfig.app.json` — add path alias and vitest types**

Add to `compilerOptions`: `"baseUrl": ".", "paths": { "@/*": ["src/*"] }, "types": ["vite/client"]`.

- [ ] **Step 4: `package.json` scripts**

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "typecheck": "tsc -b --noEmit",
  "lint": "eslint .",
  "test": "vitest run"
}
```

- [ ] **Step 5: `src/index.css`**

```css
@import "tailwindcss";
@import "@fontsource/ibm-plex-sans/400.css";
@import "@fontsource/ibm-plex-sans/500.css";
@import "@fontsource/ibm-plex-sans/600.css";

@theme {
  --font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --color-bg: #f5f6f7;
  --color-surface: #ffffff;
  --color-ink: #1c1f23;
  --color-muted: #5b6470;
  --color-line: #d8dde4;
  --color-line-soft: #c9ced6;
  --color-fuselage: #fbfbfc;
  --color-jade: #0f6f6a;
  --color-jade-deep: #0c5a56;
  --color-jade-soft: rgba(15, 111, 106, 0.12);
  --color-amber: #b7791f;
  --color-danger: #b42318;
}

html, body, #root { height: 100%; }
body { background: var(--color-bg); color: var(--color-ink); font-family: var(--font-sans); }
.tabular { font-variant-numeric: tabular-nums; }
```

- [ ] **Step 6: `src/domain/types.ts`** — exactly spec §3 (copy the block verbatim).

- [ ] **Step 7: `src/data/flights.ts`**

Port from the hackathon JSON. Arm formula: `arm = round((5 + y/30) * 10) / 10`. Lateral: `x 25 → -1, 50 → 0, 75 → 1`. Sections: A1/A2/B1 nose; C–G fwd; H–L mid; M–Q aft; R1 tail. `allowedTypes`: nose `["AKE"]`, others `["AKE","AMA"]`. ULD lists: CX2025 all 34 from `cx2025.json`; CX1234 first 24 from `cx1234.json`; CX5678 first 16 from `cx5678.json` (drop `volume`/`isPriority`). Targets/tolerance: CX2025 `targetCg: 36.0`, CX1234 `34.0`, CX5678 `38.0`; `cgTolerance: 2.0` for all. Notes: "Full load · 34 ULDs", "Partial load · 24 ULDs", "Light load · 16 ULDs".

Structure:

```ts
import type { Flight, Position, Uld, UldType } from "@/domain/types";

const ROWS = ["C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q"] as const;
const SECTION_OF_ROW: Record<(typeof ROWS)[number], Position["section"]> = { C:"fwd",D:"fwd",E:"fwd",F:"fwd",G:"fwd",H:"mid",I:"mid",J:"mid",K:"mid",L:"mid",M:"aft",N:"aft",O:"aft",P:"aft",Q:"aft" };
const arm = (y: number) => Math.round((5 + y / 30) * 10) / 10;
const ALL: UldType[] = ["AKE", "AMA"];

export const POSITIONS: Position[] = [
  { id: "A1", arm: arm(80),  lateral: 0, maxWeight: 4200, section: "nose", allowedTypes: ["AKE"] },
  { id: "A2", arm: arm(170), lateral: 0, maxWeight: 4200, section: "nose", allowedTypes: ["AKE"] },
  { id: "B1", arm: arm(260), lateral: 0, maxWeight: 4300, section: "nose", allowedTypes: ["AKE"] },
  ...ROWS.flatMap((row, i): Position[] => {
    const y = 390 + i * 90;
    const [maxL, maxR] = [[4700,4800],[4820,4920],[4940,5040],[5060,5160]][i % 4];
    return [
      { id: `${row}L`, arm: arm(y), lateral: -1, maxWeight: maxL, section: SECTION_OF_ROW[row], allowedTypes: ALL },
      { id: `${row}R`, arm: arm(y), lateral: 1,  maxWeight: maxR, section: SECTION_OF_ROW[row], allowedTypes: ALL },
    ];
  }),
  { id: "R1", arm: arm(1800), lateral: 0, maxWeight: 6000, section: "tail", allowedTypes: ALL },
];
```

(Check the `[i % 4]` cycle against the JSON: C 4700/4800, D 4820/4920, E 4940/5040, F 5060/5160, G 4700/4800 … it matches.) Then a helper `uld(id, weight, type)` and the three ULD arrays literally transcribed, and

```ts
export const FLIGHTS: Flight[] = [
  { id: "CX2025", aircraft: "747-8F", targetCg: 36.0, cgTolerance: 2.0, positions: POSITIONS, ulds: CX2025_ULDS, note: "Full load · 34 ULDs" },
  { id: "CX1234", aircraft: "747-8F", targetCg: 34.0, cgTolerance: 2.0, positions: POSITIONS, ulds: CX1234_ULDS, note: "Partial load · 24 ULDs" },
  { id: "CX5678", aircraft: "747-8F", targetCg: 38.0, cgTolerance: 2.0, positions: POSITIONS, ulds: CX5678_ULDS, note: "Light load · 16 ULDs" },
];
```

- [ ] **Step 8: `src/solver/index.ts` stub (contract for B; replaced by A)**

```ts
import type { Assignment, Position, Uld } from "@/domain/types";

export interface SolveInput {
  ulds: Uld[];
  positions: Position[];
  targetCg: number;
  cgTolerance: number;
  locked: Assignment;
  lateralWeight?: number;
}

export type SolveStatus = "optimal" | "feasible" | "infeasible" | "error";

export interface SolveResult {
  status: SolveStatus;
  assignment: Assignment;
  cg: { long: number; lateralMoment: number };
  deviation: number;
  score: number;
  solveMs: number;
  message?: string;
}

export interface CgSummary { long: number; lateralMoment: number; totalWeight: number }

export function computeCg(assignment: Assignment, ulds: Uld[], positions: Position[]): CgSummary {
  const weightOf = new Map(ulds.map((u) => [u.id, u.weight]));
  let totalWeight = 0, moment = 0, lateralMoment = 0;
  for (const p of positions) {
    const uldId = assignment[p.id];
    if (!uldId) continue;
    const w = weightOf.get(uldId) ?? 0;
    totalWeight += w; moment += w * p.arm; lateralMoment += w * p.lateral;
  }
  return { long: totalWeight ? moment / totalWeight : 0, lateralMoment, totalWeight };
}

export function scoreFor(deviation: number, tolerance: number): number {
  return Math.round(100 * Math.max(0, 1 - deviation / tolerance));
}

/** STUB — greedy heavy-to-centre. Workstream A replaces this file's body with the GLPK solver. */
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
    if (!slot) return { status: "infeasible", assignment, cg: { long: 0, lateralMoment: 0 }, deviation: 0, score: 0, solveMs: performance.now() - t0, message: `No position fits ${u.id}` };
    assignment[slot.id] = u.id;
  }
  const cg = computeCg(assignment, input.ulds, input.positions);
  const deviation = Math.abs(cg.long - input.targetCg);
  return { status: "feasible", assignment, cg: { long: cg.long, lateralMoment: cg.lateralMoment }, deviation, score: scoreFor(deviation, input.cgTolerance), solveMs: performance.now() - t0 };
}
```

- [ ] **Step 9: Placeholder `src/app/App.tsx` and `src/main.tsx`**

```tsx
// src/app/App.tsx
export default function App() {
  return <main className="p-6">Cargo Load Planner — scaffold</main>;
}
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import App from "@/app/App";
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
```

`index.html`: title `Cargo Load Planner`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, delete Vite's default svg/css.

- [ ] **Step 10: Verify and commit**

```bash
npm run typecheck && npm run lint && npm run build && npm run test   # test: "no test files found" is fine (exit 0 with --passWithNoTests) 
git add -A && git commit -m "chore: scaffold vite app, domain types, flight data, solver contract"
```

Add `"test": "vitest run --passWithNoTests"` if vitest exits 1 on no tests.

---

## Workstream A: Solver + research

### Task A1: Engine wrapper

**Files:** Create `src/solver/engine.ts`

- [ ] **Step 1: Write it**

```ts
import GLPK from "glpk.js";
import type { GLPK as GlpkApi } from "glpk.js";

// glpk.js 5: `await GLPK()` in both browser (returns an async worker-backed api)
// and node via the "glpk.js/node" export (sync api). `await glpk.solve()` works for both.
let instance: Promise<GlpkApi> | null = null;

export function getGlpk(): Promise<GlpkApi> {
  if (!instance) instance = GLPK();
  return instance;
}
```

If TypeScript cannot resolve `glpk.js` types (it should via `exports["."].types`), add `src/solver/glpk.d.ts`: `declare module "glpk.js" { export * from "glpk.js/dist/index"; export { default } from "glpk.js/dist/index"; }`.

### Task A2: Model builder (TDD)

**Files:** Create `src/solver/model.ts`, `src/solver/solver.test.ts`

- [ ] **Step 1: Failing test — variable pruning and constraint counts**

```ts
// src/solver/solver.test.ts
import { describe, it, expect } from "vitest";
import { getGlpk } from "./engine";
import { buildModel } from "./model";
import type { Position, Uld } from "@/domain/types";

const P = (id: string, arm: number, lateral: -1|0|1, maxWeight = 5000, allowedTypes: Uld["type"][] = ["AKE","AMA"]): Position =>
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
```

- [ ] **Step 2: Run** `npx vitest run src/solver` → FAIL (`./model` not found).

- [ ] **Step 3: Implement `src/solver/model.ts`**

```ts
import type { GLPK, LP } from "glpk.js";
import type { SolveInput } from "./index";

export interface VarMeta { uldId: string; positionId: string }
export const CG_VAR = "cg_long";
export const DEV_VAR = "cg_dev";
export const LAT_VAR = "lat_moment";
export const LAT_ABS_VAR = "lat_abs";

const varName = (uldId: string, positionId: string) => `x_${uldId}_${positionId}`;
const FREE_LB = -1e9; // glpk.js needs a finite lb even for GLP_UP rows

export function buildModel(input: SolveInput, glpk: GLPK): { lp: LP; varMap: Record<string, VarMeta> } {
  const { ulds, positions, targetCg, locked } = input;
  const lateralWeight = input.lateralWeight ?? 0.05;
  const totalWeight = ulds.reduce((s, u) => s + u.weight, 0);
  const lockedUldAt = new Map(Object.entries(locked).filter(([, v]) => v).map(([p, u]) => [u as string, p]));

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
      if (lockedHere !== undefined && lockedHere !== p.id) continue;          // ULD pinned elsewhere
      if (locked[p.id] && locked[p.id] !== u.id) continue;                    // position pinned to another ULD
      if (p.maxWeight < u.weight || !p.allowedTypes.includes(u.type)) continue; // capacity / type pruning
      const name = varName(u.id, p.id);
      varMap[name] = { uldId: u.id, positionId: p.id };
      binaries.push(name);
      if (lockedHere === p.id) bounds.push({ name, type: glpk.GLP_FX, lb: 1, ub: 1 });
    }
  }

  const varsFor = (pred: (m: VarMeta) => boolean, coef: (m: VarMeta) => number) =>
    Object.entries(varMap).filter(([, m]) => pred(m)).map(([name, m]) => ({ name, coef: coef(m) }));
  const weightOf = Object.fromEntries(ulds.map((u) => [u.id, u.weight]));
  const posOf = Object.fromEntries(positions.map((p) => [p.id, p]));

  const subjectTo: LP["subjectTo"] = [
    ...ulds.map((u) => ({ name: `assign_${u.id}`, vars: varsFor((m) => m.uldId === u.id, () => 1), bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 } })),
    ...positions.map((p) => ({ name: `cap_${p.id}`, vars: varsFor((m) => m.positionId === p.id, () => 1), bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 } })),
    { name: "cg_def", vars: [{ name: CG_VAR, coef: totalWeight }, ...varsFor(() => true, (m) => -weightOf[m.uldId] * posOf[m.positionId].arm)], bnds: { type: glpk.GLP_FX, lb: 0, ub: 0 } },
    { name: "dev_pos", vars: [{ name: CG_VAR, coef: 1 }, { name: DEV_VAR, coef: -1 }], bnds: { type: glpk.GLP_UP, lb: FREE_LB, ub: targetCg } },
    { name: "dev_neg", vars: [{ name: CG_VAR, coef: -1 }, { name: DEV_VAR, coef: -1 }], bnds: { type: glpk.GLP_UP, lb: FREE_LB, ub: -targetCg } },
    { name: "lat_def", vars: [{ name: LAT_VAR, coef: 1 }, ...varsFor(() => true, (m) => -weightOf[m.uldId] * posOf[m.positionId].lateral)], bnds: { type: glpk.GLP_FX, lb: 0, ub: 0 } },
    { name: "lat_pos", vars: [{ name: LAT_VAR, coef: 1 }, { name: LAT_ABS_VAR, coef: -1 }], bnds: { type: glpk.GLP_UP, lb: FREE_LB, ub: 0 } },
    { name: "lat_neg", vars: [{ name: LAT_VAR, coef: -1 }, { name: LAT_ABS_VAR, coef: -1 }], bnds: { type: glpk.GLP_UP, lb: FREE_LB, ub: 0 } },
  ];

  const lp: LP = {
    name: "uld_load_planner",
    objective: { direction: glpk.GLP_MIN, name: "obj", vars: [{ name: DEV_VAR, coef: 1 }, { name: LAT_ABS_VAR, coef: lateralWeight / totalWeight }] },
    subjectTo,
    bounds,
    binaries,
  };
  return { lp, varMap };
}
```

Filter out any `assign_*` row whose `vars` is empty before returning — that ULD has no feasible position; `solve()` reports `infeasible` for it up front (Task A3), so `buildModel` may simply skip building in that case. Keep `buildModel` pure.

- [ ] **Step 4: Run** → PASS. Do not commit (integrator commits).

### Task A3: Parse + solve (TDD)

**Files:** Create `src/solver/parse.ts`; replace `src/solver/index.ts` body (keep every exported name and type from the stub — B depends on them).

- [ ] **Step 1: Failing tests (append to `solver.test.ts`)**

```ts
import { solve } from "./index";

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
  it("solves all shipped flights optimally in under 2 s", async () => {
    const { FLIGHTS } = await import("@/data/flights");
    for (const f of FLIGHTS) {
      const r = await solve({ ulds: f.ulds, positions: f.positions, targetCg: f.targetCg, cgTolerance: f.cgTolerance, locked: {} });
      expect(r.status).toBe("optimal");
      expect(r.solveMs).toBeLessThan(2000);
      expect(r.deviation).toBeLessThan(0.5);
    }
  }, 20000);
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement `src/solver/parse.ts`**

```ts
import type { GLPK, Result } from "glpk.js";
import type { Assignment } from "@/domain/types";
import type { SolveInput, SolveResult, SolveStatus } from "./index";
import { computeCg, scoreFor } from "./index";
import type { VarMeta } from "./model";

export function parseResult(res: Result, varMap: Record<string, VarMeta>, input: SolveInput, glpk: GLPK, solveMs: number): SolveResult {
  const s = res.result.status;
  const status: SolveStatus = s === glpk.GLP_OPT ? "optimal" : s === glpk.GLP_FEAS ? "feasible" : s === glpk.GLP_NOFEAS || s === glpk.GLP_INFEAS ? "infeasible" : "error";
  const assignment: Assignment = Object.fromEntries(input.positions.map((p) => [p.id, null]));
  if (status === "optimal" || status === "feasible") {
    for (const [name, meta] of Object.entries(varMap)) {
      if ((res.result.vars[name] ?? 0) > 0.5) assignment[meta.positionId] = meta.uldId;
    }
  }
  const cg = computeCg(assignment, input.ulds, input.positions);
  const deviation = Math.abs(cg.long - input.targetCg);
  return {
    status, assignment, cg: { long: cg.long, lateralMoment: cg.lateralMoment }, deviation,
    score: status === "optimal" || status === "feasible" ? scoreFor(deviation, input.cgTolerance) : 0,
    solveMs, message: status === "infeasible" ? "No loading satisfies all constraints." : status === "error" ? `Solver status ${s}` : undefined,
  };
}
```

- [ ] **Step 4: Replace the stub `solve` in `src/solver/index.ts`**

Keep `SolveInput`, `SolveResult`, `SolveStatus`, `CgSummary`, `computeCg`, `scoreFor` exactly as they are. Replace only `solve`:

```ts
import { getGlpk } from "./engine";
import { buildModel } from "./model";
import { parseResult } from "./parse";

export async function solve(input: SolveInput): Promise<SolveResult> {
  const t0 = performance.now();
  const empty = (status: SolveStatus, message: string): SolveResult => ({
    status, assignment: Object.fromEntries(input.positions.map((p) => [p.id, null])),
    cg: { long: 0, lateralMoment: 0 }, deviation: 0, score: 0, solveMs: performance.now() - t0, message,
  });
  if (input.ulds.length > input.positions.length) return empty("infeasible", `${input.ulds.length} ULDs but only ${input.positions.length} positions.`);
  for (const u of input.ulds) {
    const fits = input.positions.some((p) => p.maxWeight >= u.weight && p.allowedTypes.includes(u.type));
    if (!fits) return empty("infeasible", `${u.id} (${u.weight} kg, ${u.type}) fits no position.`);
  }
  try {
    const glpk = await getGlpk();
    const { lp, varMap } = buildModel(input, glpk);
    const res = await glpk.solve(lp, { msglev: glpk.GLP_MSG_OFF, presol: true, tmlim: 10 });
    return parseResult(res, varMap, input, glpk, performance.now() - t0);
  } catch (err) {
    return empty("error", err instanceof Error ? err.message : String(err));
  }
}
```

Note the circular import (`parse.ts` imports from `index.ts`, `index.ts` imports `parse.ts`): move `computeCg` and `scoreFor` into `src/solver/cg.ts` and re-export them from `index.ts` to avoid it.

- [ ] **Step 5: Run** `npx vitest run` → all PASS. Run `npm run typecheck`.

### Task A4: `docs/algorithm.md` (research deliverable)

**Files:** Create `docs/algorithm.md`

- [ ] **Step 1: Research.** Use WebSearch/WebFetch to confirm citations (author, year, venue, one-line contribution) for at least: Mongeau & Bès 2003 "Optimization of aircraft container loading" (IEEE Trans. Aerospace & Electronic Systems); Limbourg, Schyns & Laporte 2012 "Automatic aircraft cargo load planning" (JORS); Vancroonenburg, Verstichel, Tavernier & Vanden Berghe 2014 "Automatic air cargo selection and weight balancing: a mixed integer optimization approach" (Transportation Research E); Brandt & Nickel 2019 "The air cargo load planning problem — a consolidated problem definition and literature review" (EJOR); Lurkin & Schyns 2015 (multi-leg). Do not cite anything you could not verify.

- [ ] **Step 2: Write** with these sections, each with real content:
  1. What the hackathon model was (transcribe the original formulation from `cxhack25/src/lib/glpkOptimizer.ts`: variables, 3 constraint families, objective; note it ignored `max_weight`, lateral balance, types, and that it was solved server-side)
  2. The demo's model (spec §4.2 as displayed math; explain the absolute-value linearisation and why capacity is enforced by variable pruning instead of a constraint)
  3. Size and solve time (34×34 → ≤1156 binaries, measured ms from the test run)
  4. Literature comparison table: paper · problem variant · method · what they add that we don't
  5. What a real W&B / load planning system adds (CG envelope in %MAC vs ZFW/TOW, fuel burn shifting CG, floor/linear loads, cumulative shear, lateral limits, ULD contours per position, multi-leg, dangerous goods segregation, priority/offload)
  6. Honest limits of this demo
  7. References (verified)

Length 900–1500 words. British or American spelling, consistent.

---

## Workstream B: UI

Before coding read the spec §5 fully. Use only tokens from `src/index.css`; no raw hex in components. Import solver via `import { solve, computeCg, scoreFor } from "@/solver"` and data via `import { FLIGHTS } from "@/data/flights"`. All text English.

### Task B1: Store

**Files:** Create `src/store/useLoadStore.ts`

- [ ] **Step 1: Write it**

```ts
import { create } from "zustand";
import type { Assignment, Flight, Position, Uld } from "@/domain/types";
import { FLIGHTS } from "@/data/flights";
import { solve, type SolveResult } from "@/solver";

export type PlaceCheck = { ok: true } | { ok: false; reason: string };

interface LoadState {
  flight: Flight;
  assignment: Assignment;
  locked: Record<string, true>;
  selectedUldId: string | null;
  solving: boolean;
  lastSolve: SolveResult | null;
  recentlyChanged: string[];
  selectFlight: (id: string) => void;
  select: (uldId: string | null) => void;
  canPlace: (uldId: string, positionId: string) => PlaceCheck;
  place: (uldId: string, positionId: string) => PlaceCheck;   // handles move + swap
  unassign: (positionId: string) => void;
  toggleLock: (positionId: string) => void;
  optimize: () => Promise<SolveResult>;
  reset: () => void;
  clearRecent: () => void;
}

const emptyAssignment = (f: Flight): Assignment => Object.fromEntries(f.positions.map((p) => [p.id, null]));

export const useLoadStore = create<LoadState>((set, get) => ({
  flight: FLIGHTS[0], assignment: emptyAssignment(FLIGHTS[0]), locked: {}, selectedUldId: null, solving: false, lastSolve: null, recentlyChanged: [],

  selectFlight: (id) => { const flight = FLIGHTS.find((f) => f.id === id) ?? FLIGHTS[0]; set({ flight, assignment: emptyAssignment(flight), locked: {}, selectedUldId: null, lastSolve: null, recentlyChanged: [] }); },
  select: (uldId) => set({ selectedUldId: uldId }),

  canPlace: (uldId, positionId) => {
    const { flight, assignment, locked } = get();
    const uld = flight.ulds.find((u) => u.id === uldId)!;
    const pos = flight.positions.find((p) => p.id === positionId)!;
    if (locked[positionId]) return { ok: false, reason: `${positionId} is locked` };
    if (!pos.allowedTypes.includes(uld.type)) return { ok: false, reason: `${uld.type} not allowed in ${positionId}` };
    if (pos.maxWeight < uld.weight) return { ok: false, reason: `${positionId} max ${pos.maxWeight.toLocaleString()} kg` };
    const occupant = assignment[positionId];
    if (occupant && occupant !== uldId) {
      // swap: occupant must fit where uld came from (or go to tray if uld came from tray)
      const from = Object.keys(assignment).find((k) => assignment[k] === uldId);
      if (from) {
        const fromPos = flight.positions.find((p) => p.id === from)!;
        const occ = flight.ulds.find((u) => u.id === occupant)!;
        if (locked[from]) return { ok: false, reason: `${from} is locked` };
        if (!fromPos.allowedTypes.includes(occ.type) || fromPos.maxWeight < occ.weight) return { ok: false, reason: `${occupant} cannot swap into ${from}` };
      }
    }
    return { ok: true };
  },

  place: (uldId, positionId) => {
    const check = get().canPlace(uldId, positionId);
    if (!check.ok) return check;
    set((s) => {
      const next = { ...s.assignment };
      const from = Object.keys(next).find((k) => next[k] === uldId) ?? null;
      const occupant = next[positionId];
      if (from) next[from] = occupant && occupant !== uldId ? occupant : null;
      next[positionId] = uldId;
      return { assignment: next, selectedUldId: null };
    });
    return { ok: true };
  },

  unassign: (positionId) => set((s) => s.locked[positionId] ? s : { assignment: { ...s.assignment, [positionId]: null }, selectedUldId: null }),
  toggleLock: (positionId) => set((s) => { if (!s.assignment[positionId]) return s; const locked = { ...s.locked }; if (locked[positionId]) delete locked[positionId]; else locked[positionId] = true; return { locked }; }),

  optimize: async () => {
    const { flight, assignment, locked } = get();
    set({ solving: true, selectedUldId: null });
    const lockedAssignment: Assignment = Object.fromEntries(Object.keys(locked).map((p) => [p, assignment[p]]));
    const result = await solve({ ulds: flight.ulds, positions: flight.positions, targetCg: flight.targetCg, cgTolerance: flight.cgTolerance, locked: lockedAssignment });
    if (result.status === "optimal" || result.status === "feasible") {
      const changed = flight.positions.map((p) => p.id).filter((id) => assignment[id] !== result.assignment[id]);
      set({ assignment: result.assignment, recentlyChanged: changed });
    }
    set({ solving: false, lastSolve: result });
    return result;
  },

  reset: () => set((s) => ({ assignment: emptyAssignment(s.flight), locked: {}, selectedUldId: null, lastSolve: null, recentlyChanged: [] })),
  clearRecent: () => set({ recentlyChanged: [] }),
}));

// selectors
export const selectUnassigned = (s: LoadState): Uld[] => { const used = new Set(Object.values(s.assignment).filter(Boolean)); return s.flight.ulds.filter((u) => !used.has(u.id)); };
export const selectPositionById = (id: string) => (s: LoadState): Position | undefined => s.flight.positions.find((p) => p.id === id);
```

Staggered reveal: `optimize` applies the whole assignment at once; the *tiles* animate their fill with a per-tile delay derived from their index in `recentlyChanged` (Task B4), so no timers live in the store.

### Task B2: Layout map + Fuselage

**Files:** Create `src/components/layout.ts`, `src/components/Fuselage.tsx`

- [ ] **Step 1: `layout.ts`** — pixel positions for the 34 tiles inside a 1440×240 canvas (nose left). Tile 64×56.

```ts
import type { Position } from "@/domain/types";
export const CANVAS = { width: 1440, height: 240 } as const;
export const TILE = { w: 64, h: 56 } as const;
const ROW_Y = { [-1]: 52, [0]: 92, [1]: 132 } as const; // top y for L / centre / R
const ARM_MIN = 7.7, ARM_MAX = 65.0, X_MIN = 70, X_MAX = CANVAS.width - 90;
export function tileXY(p: Position): { x: number; y: number } {
  const x = X_MIN + ((p.arm - ARM_MIN) / (ARM_MAX - ARM_MIN)) * (X_MAX - X_MIN - TILE.w);
  return { x: Math.round(x), y: ROW_Y[p.lateral] };
}
export const SECTIONS = [
  { id: "nose", label: "Nose" }, { id: "fwd", label: "Fwd" }, { id: "mid", label: "Mid" }, { id: "aft", label: "Aft" }, { id: "tail", label: "Tail" },
] as const;
```

Check visually that consecutive rows (arm step 3 m ≈ 66 px) do not overlap 64 px tiles; if they do, widen `CANVAS.width` to 1560.

- [ ] **Step 2: `Fuselage.tsx`** — an SVG `viewBox="0 0 1440 240"` drawing a top-down 747-style outline: rounded nose on the left (hump implied by a second inner line over x 40–300), straight body, tapered tail on the right, two faint wing stubs at x≈620–780 clipped to ±30 px outside the body so the aircraft reads as a plane without dominating. Stroke `var(--color-line-soft)` 1.5, fill `var(--color-fuselage)`. A dashed centreline. Positioned `absolute inset-0 pointer-events-none`.

### Task B3: AircraftView + SectionTabs

**Files:** Create `src/components/AircraftView.tsx`, `src/components/SectionTabs.tsx`

- [ ] **Step 1: `AircraftView`**

```tsx
export default function AircraftView() {
  const flight = useLoadStore((s) => s.flight);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: true });
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const update = () => setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    update(); el.addEventListener("scroll", update, { passive: true }); const ro = new ResizeObserver(update); ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, []);
  return (
    <div className="relative">
      <SectionTabs scrollRef={scrollRef} />
      <div ref={scrollRef} className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin]" style={{ scrollSnapType: "x proximity" }}>
        <div className="relative" style={{ width: CANVAS.width, height: CANVAS.height }}>
          <Fuselage />
          {flight.positions.map((p) => { const { x, y } = tileXY(p); return (
            <div key={p.id} data-section={p.section} data-position={p.id} className="absolute" style={{ left: x, top: y, scrollSnapAlign: "center" }}>
              <PositionTile position={p} />
            </div>); })}
        </div>
      </div>
      {edges.left && <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-bg to-transparent" />}
      {edges.right && <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg to-transparent" />}
    </div>
  );
}
```

(The edge fades are the only gradients allowed — they are scroll affordances, not decoration.)

- [ ] **Step 2: `SectionTabs`** — 5 buttons from `SECTIONS`. On click: `scrollRef.current?.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })`. Active tab: an `IntersectionObserver` with `root: scrollRef.current, threshold: 0.6` over all `[data-section]` nodes; the section with the most visible tiles is active. Style: `text-sm text-muted`, active `text-ink font-medium` with a 2px `bg-jade` underline; 44px tap height.

### Task B4: PositionTile

**Files:** Create `src/components/PositionTile.tsx`

- [ ] **Step 1: Write it.** Props `{ position }`. Reads from the store: `assignment[position.id]`, `locked[position.id]`, `selectedUldId`, `recentlyChanged`, actions `place`, `select`, `toggleLock`, `unassign`. `useDroppable({ id: position.id })`.

States and classes:
- empty: `bg-surface border border-line text-muted`
- filled: `bg-jade text-white border-jade`
- valid target while a ULD is selected/dragged (`canPlace(selected, id).ok`): add `ring-2 ring-jade ring-offset-1`
- invalid while selected: `opacity-40`
- `isOver` from dnd-kit: same as valid ring, or `ring-danger` if invalid
- locked: a `Lock` (lucide, 12px) icon top-right; `cursor-default`
- recently changed: `animate-[tileIn_400ms_ease-out_both]` with `animationDelay = index * 40ms` (index = position in `recentlyChanged`); define `@keyframes tileIn { from { transform: scale(.92); opacity: .4 } to { transform: none; opacity: 1 } }` in `index.css`. Call `clearRecent()` from a `useEffect` timeout of 1600 ms in `AircraftView`.

Content: top row `id` (`text-[11px] font-semibold tracking-wide`) + lock icon; when filled, `uld.id` (`text-xs font-medium truncate`) and `weight.toLocaleString() kg` (`text-[11px] tabular`); bottom: a 3px capacity bar `width = weight/maxWeight*100%` (`bg-white/60` on filled). Whole tile is a `<button>` (min 44px height already met by 56 px). Click behaviour: if a ULD is selected → `place(selected, id)`, toast on failure; else if filled → `select(uld)`; double-click (or the lock icon click, stopPropagation) toggles lock. Filled tiles are also `useDraggable({ id: `pos:${position.id}`, data: { uldId, from: position.id }, disabled: locked })`.

### Task B5: UldTray + UldChip

**Files:** Create `src/components/UldTray.tsx`, `src/components/UldChip.tsx`

- [ ] **Step 1: `UldChip`** — `useDraggable({ id: `uld:${uld.id}`, data: { uldId: uld.id, from: null } })`. A `<button>` `h-11 px-3 rounded-md border border-line bg-surface flex items-center gap-2`, selected: `border-jade ring-1 ring-jade`. Shows `uld.id` (`text-sm font-medium`), `type` as a `text-[10px] uppercase text-muted` pill, weight `tabular text-xs text-muted`. Click → `select(selected === id ? null : id)`.

- [ ] **Step 2: `UldTray`** — header row: "Unassigned" · count · total kg (`selectUnassigned`). Body: `flex gap-2 overflow-x-auto py-1` of chips; `useDroppable({ id: "tray" })` so dragging a tile here unassigns; when a placed ULD is selected show a "Unload to tray" button in the header. Empty state: "All ULDs loaded" in `text-muted`.

### Task B6: StatusBar + CgGauge

**Files:** Create `src/components/StatusBar.tsx`, `src/components/CgGauge.tsx`

- [ ] **Step 1: `CgGauge`** — props `{ value, target, tolerance, min, max }` where `min/max` = min/max arm of positions. A `relative h-8` track (`bg-line/40 rounded-full`), target band `absolute` from `(target-tolerance)` to `(target+tolerance)` mapped to % (`bg-jade-soft`), a tick at target, a needle `absolute w-0.5 h-full bg-ink` with `left: pct%` and `transition: left 600ms cubic-bezier(.2,.8,.2,1)`; needle colour `bg-amber` when `|value-target| > tolerance/2`, `bg-danger` when `> tolerance`. Below: `Nose` … `Tail` labels in `text-[10px] text-muted`. Show nothing (needle hidden) when total weight is 0.

- [ ] **Step 2: `StatusBar`** — sticky bottom (`sticky bottom-0 bg-surface border-t border-line`), grid: gauge (flex-1) · numbers · actions. Numbers: `CG 36.4 m` (`text-lg font-semibold tabular`), `target 36.0 ± 2.0`, `Score 92` as a pill (`bg-jade text-white` ≥ 80, `bg-amber` ≥ 50, `bg-danger` otherwise, `bg-line text-muted` when nothing loaded), `Loaded 61,400 kg · 12/34 positions`. Actions: `Reset` (ghost, `border border-line`) and `Optimize` (`bg-jade hover:bg-jade-deep text-white`, `Zap` icon, spinner + "Solving…" while `solving`, disabled when `solving` or no ULDs). After `optimize()` resolves: toast `Optimal · CG 36.02 m · 412 ms` or the result `message` on failure. Mobile (`<md`): two rows — gauge on top, numbers+actions below.

### Task B7: TopBar + HowItWorksDrawer + Toast

**Files:** Create `src/components/TopBar.tsx`, `src/components/HowItWorksDrawer.tsx`, `src/components/Toast.tsx`

- [ ] **Step 1: `Toast.tsx`** — `useToast` zustand store `{ toasts: {id, text, kind}[], push(text, kind?) }` auto-removing after 2500 ms; `<Toasts/>` renders bottom-centre (above StatusBar) `rounded-md bg-ink text-white text-sm px-3 py-2`; kind `error` uses `bg-danger`.

- [ ] **Step 2: `TopBar`** — left: `Plane` icon (lucide) + "Cargo Load Planner" (`font-semibold`) + `text-xs text-muted` "747-8F freighter · demo"; centre/right: `<select>` of flights showing `id — note`; `How it works` button (`BookOpen` icon, ghost). Below the title on `md+`: one line `text-xs text-muted`: "Alex Bao · Cathay Cargo Hackathon 2025 Finalist". No logo image anywhere.

- [ ] **Step 3: `HowItWorksDrawer`** — `open` state lives in `App`. Right-side panel `fixed inset-y-0 right-0 w-full max-w-md bg-surface border-l border-line` with backdrop, Esc closes, focus moves to the close button on open. Content (plain HTML, monospace for maths, no KaTeX):
  1. "What you are looking at" — 3 sentences (34 positions, ULDs with weight/type, goal = CG on target)
  2. "The model" — list variables and constraints exactly as spec §4.2 in monospace, e.g. `Σ_j x[i,j] = 1  for every ULD i`
  3. "Objective" — `minimise  |CG − target|  +  λ·|L−R moment| / W`
  4. "How it runs" — "GLPK 5 compiled to WebAssembly (glpk.js) solves the MILP in a Web Worker in your browser. Last solve: 1,156 binaries · 412 ms" (read `lastSolve.solveMs`; binaries = count of feasible pairs, compute from flight data with the same pruning rule: `maxWeight ≥ weight && allowedTypes includes type`)
  5. "What real load planning adds" — 5 bullets (CG envelope in %MAC, fuel shift, floor loads, multi-leg, DG segregation) and a link text "See docs/algorithm.md in the repo".

### Task B8: App shell + DnD wiring

**Files:** Modify `src/app/App.tsx`

- [ ] **Step 1: Write it**

```tsx
export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const place = useLoadStore((s) => s.place); const unassign = useLoadStore((s) => s.unassign); const select = useLoadStore((s) => s.select);
  const push = useToast((s) => s.push);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const onDragStart = (e: DragStartEvent) => select((e.active.data.current as { uldId: string }).uldId);
  const onDragEnd = (e: DragEndEvent) => {
    const data = e.active.data.current as { uldId: string; from: string | null };
    select(null);
    if (!e.over) return;
    if (e.over.id === "tray") { if (data.from) unassign(data.from); return; }
    const r = place(data.uldId, String(e.over.id));
    if (!r.ok) push(r.reason, "error");
  };
  useEffect(() => { const h = (ev: KeyboardEvent) => { if (ev.key === "Escape") { select(null); setDrawerOpen(false); } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [select]);
  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex min-h-full flex-col">
        <TopBar onHelp={() => setDrawerOpen(true)} />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 md:px-6">
          <AircraftView />
          <UldTray />
        </main>
        <StatusBar />
      </div>
      <HowItWorksDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Toasts />
    </DndContext>
  );
}
```

- [ ] **Step 2: Run** `npm run dev`, open http://localhost:5173, walk through: scroll aircraft (mouse wheel + trackpad + shift-wheel), tabs, drag chip→tile, tap chip→tile, tile→tile swap, tile→tray, lock, Optimize (with the stub solver it returns `feasible`), Reset, switch flight, drawer, Esc. Then at 375 px width (devtools). Fix anything broken. `npm run typecheck && npm run lint && npm run build` clean.

---

## Workstream C: Docs + zijun.cloud

### Task C1: `PROJECT.md`

Two parts, following `~/Desktop/insurance-demo/PROJECT.md` as the template (read it first):
- Part 1 (owner): what this is, disclosure decisions (no Cathay logo; CX flight numbers kept by owner decision; synthetic data; credit line), run (`npm i && npm run dev`), deploy (`vercel --prod`, subdomain `cargo-demo.zijun.cloud`, DNS CNAME at DNSPod), how to add a scenario (edit `src/data/flights.ts`).
- Part 2 (agent): rules (never add a logo; never claim data is real; solver public API is a contract; no raw hex in components; English only), file map from this plan, commands, verification checklist from spec §9.

### Task C2: `README.md`

Public readme, ≤ 60 lines: one-paragraph description, "Try it" link placeholder `https://cargo-demo.zijun.cloud`, features (scrollable fuselage, drag/tap, lock, MILP optimise in-browser), how it works (3 sentences + link to `docs/algorithm.md`), stack, run locally, attribution line, license MIT.

### Task C3: `docs/case-study.md`

EN then ZH. Sections: Context (Cathay Cargo Hackathon 2025, HKU IE team, 24 h final at Cathay City — reuse facts from the zijun.cloud content JSON, nothing new); Problem (CG and fuel burn, informal load planning); What we built in 24 h; What the rebuild changed (UI + solver, table); Results `[TO FILL]` for judging outcome specifics and team size; Lessons (from existing "What We Learned").

### Task C4: zijun.cloud content

**Files:** Modify `/Users/asuna/Desktop/zijun.cloud/.claude/worktrees/airline-app-optimization-1a0b61/content/projects/cathay-hackathon/en.json` and `zh.json`

- [ ] Add `"url": "https://cargo-demo.zijun.cloud", "urlLabel": "Open demo"` (`zh`: `"打开 Demo"`) inside `meta`.
- [ ] Rewrite the second "The Product" paragraph in both languages to: the backend is a MILP solved with GLPK; binary assignment variables; constraints = one position per ULD, one ULD per position, position weight limits, ULD-type compatibility; objective = minimise deviation of longitudinal CG from target plus a small lateral-imbalance penalty; the portfolio rebuild runs the solver as WebAssembly in the browser, no server. Keep the fuel/pain-point sentence.
- [ ] Add a short paragraph at the end of "The Product": "The interactive rebuild (2026) replaces the 34-card vertical list with a horizontally scrollable fuselage view, tap-to-place for mobile, and lockable positions for human-in-the-loop planning." (ZH equivalent.)
- [ ] Tags: `["Vibe Coding", "MILP", "GLPK", "Operations Research", "WebAssembly", "React", "AI"]` — drop "Python" and "Computer Vision" (not in the built product), keep ZH list aligned.
- [ ] Run `npm run build` in the zijun.cloud worktree to confirm JSON is valid and pages render.

---

## Integration (integrator, after A/B/C return)

- [ ] Review each workstream's diff against the spec; fix ownership violations.
- [ ] `npm run typecheck && npm run lint && npm run test && npm run build`
- [ ] Leak/brand grep: `grep -rniE "cathay cargo_logo|neochain|supabase" src docs README.md PROJECT.md dist` → no hits
- [ ] Browser pass (desktop + 375 px) with the real solver: all three flights optimise to `optimal`; console clean
- [ ] Commit per workstream: `feat(solver): …`, `feat(ui): …`, `docs: …`; zijun.cloud change committed in its worktree
- [ ] `gh repo create AlexBao1218/cargo-load-demo --private --source . --push`
