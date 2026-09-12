# Cargo Load Planner — Portfolio Demo Design

Date: 2026-09-11
Source: https://github.com/AlexBao1218/cxhack25 (Cathay Cargo Hackathon 2025 finalist entry)
Target: new clean-room repo `~/Desktop/cargo-load-demo` → Vercel → `cargo-demo.zijun.cloud`

## 1. Goal

Rebuild the hackathon ULD load-planning tool as an interactive portfolio demo that

- reads as a modern airline app (horizontally scrollable top-down aircraft, not a 34-card vertical list),
- runs fully in the browser (no Supabase, no API routes, GLPK wasm in a Web Worker),
- keeps and extends the MILP core so the "How it works" story is honest and verifiable,
- follows the `cloning-work-projects-for-portfolio` SOP (separate repo, no logo, private first).

Disclosure decisions (data is synthetic, no employer data involved):

- Remove the Cathay Cargo logo. Keep "Cathay Cargo Hackathon 2025 · Finalist" as text attribution.
- Keep flight numbers `CX2025 / CX1234 / CX5678` (owner decision, 2026-09-11).
- Credit line: "Alex Bao · Cathay Cargo Hackathon 2025 Finalist". No "Neochain" branding.
- Positions, arms, weights, ULD ids are the hackathon's synthetic values; they may be re-scaled to realistic 747-8F magnitudes but never claimed as real Cathay data.

## 2. Stack

- Vite 6 + React 19 + TypeScript (strict) + Tailwind CSS v4
- `glpk.js` 4.x (wasm) inside a Web Worker via `new Worker(new URL(..., import.meta.url), { type: "module" })`
- `@dnd-kit/core` for desktop drag; `zustand` for state
- `lucide-react` icons; font **IBM Plex Sans** (self-hosted woff2 via `@fontsource/ibm-plex-sans`) with system-ui fallback
- No router (single screen). No backend. Static build to `dist/`.
- Scripts: `dev`, `build`, `preview`, `typecheck` (`tsc --noEmit`), `lint`, `test` (vitest, solver only)

## 3. Domain model (`src/domain/types.ts`)

```ts
export type UldType = "AKE" | "AMA";

export interface Uld {
  id: string;          // "ULD-A"
  weight: number;      // kg
  type: UldType;
}

export type Section = "nose" | "fwd" | "mid" | "aft" | "tail";

export interface Position {
  id: string;          // "CL", "A1", "R1"
  arm: number;         // longitudinal station in metres from datum (replaces hackathon `y`)
  lateral: -1 | 0 | 1; // L / centreline / R (replaces hackathon `x` 25/50/75)
  maxWeight: number;   // kg
  section: Section;
  allowedTypes: UldType[]; // nose positions: ["AKE"]; others: ["AKE","AMA"]
}

export interface Flight {
  id: string;                 // "CX2025"
  aircraft: "747-8F";
  targetCg: number;           // metres, same frame as Position.arm
  cgTolerance: number;        // metres; score = 100 at 0 deviation, 0 at tolerance
  positions: Position[];
  ulds: Uld[];
  note?: string;              // one-line scenario description shown in the flight picker
}

export type Assignment = Record<string, string | null>; // positionId -> uldId | null
```

Position layout (34, from the hackathon, nose → tail):

- nose: `A1 A2 B1` (centreline, single column)
- main deck rows `C D E F G H I J K L M N O P Q`, each `xL` / `xR`
  - fwd: C–G, mid: H–L, aft: M–Q
- tail: `R1` (centreline)

Arms are derived from the hackathon `y` values (`y/10` metres, nose A1 ≈ 8 m … R1 ≈ 48 m) so
target CG values stay in the same frame as the original `target_cg_long`.

## 4. Solver (`src/solver/`)

Pure module, no React, unit-tested with vitest.

### 4.1 Interface

```ts
export interface SolveInput {
  ulds: Uld[];
  positions: Position[];
  targetCg: number;
  cgTolerance: number;
  locked: Assignment;             // positionId -> uldId the user pinned; solver must respect
  lateralWeight?: number;         // objective weight for |L−R moment|, default 0.05
}

export interface SolveResult {
  status: "optimal" | "feasible" | "infeasible" | "error";
  assignment: Assignment;         // full map for all positions
  cg: { long: number; lateralMoment: number };
  deviation: number;              // |cg.long − targetCg|
  score: number;                  // 0..100
  solveMs: number;
  message?: string;
}

export function buildModel(input: SolveInput): LP;             // glpk.js LP object, exported for tests
export function solve(input: SolveInput): Promise<SolveResult>; // main-thread wrapper around the worker
export function computeCg(assignment, ulds, positions): { long; lateralMoment; totalWeight };
```

Worker: `src/solver/solver.worker.ts` receives `SolveInput`, runs GLPK, posts `SolveResult`.
`solve()` owns a singleton worker and resolves per request id. Timeout 10 s → `status: "error"`.

### 4.2 MILP formulation

Sets: ULDs $i \in U$, positions $j \in P$.
Parameters: $w_i$ weight, $a_j$ arm, $l_j \in \{-1,0,1\}$ lateral, $c_j$ max weight, $t$ target CG, $W=\sum_i w_i$.

Variables:
- $x_{ij} \in \{0,1\}$ — ULD $i$ placed in position $j$ (only created when $c_j \ge w_i$ and type allowed; otherwise variable omitted = pruned)
- $g \in \mathbb{R}$ — longitudinal CG
- $d \ge 0$ — longitudinal deviation
- $m \in \mathbb{R}$, $e \ge 0$ — lateral moment and its absolute value

Constraints:
1. $\sum_j x_{ij} = 1 \quad \forall i$ (every ULD loaded)
2. $\sum_i x_{ij} \le 1 \quad \forall j$ (one ULD per position)
3. $W \cdot g = \sum_{i,j} w_i a_j x_{ij}$ (CG definition, linear because $W$ is constant)
4. $g - d \le t$, $-g - d \le -t$ (linearised $d \ge |g - t|$)
5. $m = \sum_{i,j} w_i l_j x_{ij}$, $m - e \le 0$, $-m - e \le 0$
6. $x_{ij} = 1$ for every locked pair (fixed bounds)
7. Capacity: enforced by pruning (no variable for infeasible pairs); documented as equivalent to $w_i x_{ij} \le c_j$

Objective: $\min\; d + \lambda \cdot e / W_{\text{scale}}$ with $\lambda$ = `lateralWeight`, $W_{\text{scale}} = W$ so both terms are in metres.

Score: $100 \cdot \max(0, 1 - d / \text{cgTolerance})$, rounded.

If ULD count > position count or locked pairs are inconsistent → `infeasible` before calling GLPK.

### 4.3 Tests (vitest)

- 2 ULDs / 2 positions: optimum is the assignment closer to target
- capacity pruning: heavy ULD never lands on a light position
- locked position respected
- lateral term picks the balanced solution among CG-equal alternatives
- infeasible when ULDs > positions
- full CX2025 scenario solves under 2 s in node

## 5. UI

Single screen, `src/app/App.tsx`. Layout (desktop ≥ 1024px):

```
┌ TopBar ────────────────────────────────────────────────────┐
│ Cargo Load Planner   [CX2025 ▾] 747-8F         [How it works]│
├ SectionTabs ───────────────────────────────────────────────┤
│ Nose · Fwd · Mid · Aft · Tail                                │
├ AircraftView (horizontal scroll, snap) ────────────────────┤
│  ╭──────────────────────────────────────────╮                │
│ ╱ A1 A2 B1 │ CL DL EL FL GL │ … │ QL │ R1 ╲                 │
│ ╲          │ CR DR ER FR GR │ … │ QR │    ╱                  │
│  ╰──────────────────────────────────────────╯                │
├ UldTray ───────────────────────────────────────────────────┤
│ Unassigned 12 · 41,200 kg   [ULD-A 1,700 AKE] [ULD-B …] →   │
├ StatusBar (sticky bottom) ─────────────────────────────────┤
│ CG ◄───●──┼───►  24.1 m  target 22.0   Score 58   [Reset] [Optimize]│
└─────────────────────────────────────────────────────────────┘
```

Mobile (< 768px): same vertical order; TopBar collapses flight picker into a select; StatusBar
becomes a two-row bottom sheet; AircraftView height fixed ~220px and scrolls with touch.

### 5.1 Components (`src/components/`)

| Component | Responsibility |
|---|---|
| `TopBar` | title, flight picker (select of `flights[]`), "How it works" button |
| `SectionTabs` | 5 buttons; clicking scrolls AircraftView to the section's first position (`scrollIntoView({inline:"center"})`); active tab follows scroll via IntersectionObserver |
| `AircraftView` | scroll container (`overflow-x:auto`, `scroll-snap-type:x proximity`), SVG fuselage outline behind an absolutely-positioned grid of `PositionTile`s; fade masks on both edges while scrollable |
| `PositionTile` | 64×56 tile: id, assigned ULD id + weight, capacity bar; states: empty / filled / drop-target / invalid (over capacity or wrong type) / highlighted (just optimised) / locked (pin icon). `useDroppable` |
| `UldTray` | horizontally scrolling chips of unassigned ULDs; each `UldChip` is `useDraggable` and clickable for tap-to-place |
| `StatusBar` | `CgGauge` (horizontal scale with target band; needle animated with CSS transition), total weight / capacity, `ScoreBadge`, Reset, Optimize (spinner while solving) |
| `HowItWorksDrawer` | slide-over panel: plain-language explanation + the formulation from §4.2 rendered as styled text (no KaTeX dependency) + "solved by GLPK compiled to WebAssembly, in your browser" + solve time of the last run |
| `Toast` | tiny in-house toast (no react-hot-toast); messages for invalid drops, optimise result |

### 5.2 Interaction

- **Drag** (dnd-kit): ULD chip → tile. Drop on filled tile swaps if capacity/type allow, else toast.
  Tile → tile drag moves/swaps. Tile → tray unassigns.
- **Tap-to-place**: tap a chip → it becomes `selected`, valid tiles get an outline, invalid tiles dim; tap a tile to place; tap elsewhere / Esc to cancel. Tap a filled tile → its ULD becomes selected (moving it); tap the tray area to unassign.
- **Lock**: long-press or click the pin icon on a filled tile toggles `locked`. Locked tiles are frozen for the solver and cannot be dragged.
- **Optimize**: sends current state to solver; on result, applies assignment with 40 ms stagger per tile (max ~1.4 s), highlights changed tiles for 1.2 s, animates the CG needle. On `infeasible`/`error` show toast with `message`.
- **Reset**: clears all assignments and locks for the current flight.
- **Flight switch**: replaces positions/ulds/target, clears assignments.
- **Keyboard**: chips and tiles are buttons; Enter/Space = tap; Esc cancels selection.

### 5.3 State (`src/store/useLoadStore.ts`, zustand)

```ts
{
  flightId, flight,               // current
  assignment: Assignment,
  locked: Set<string>,            // positionIds
  selectedUldId: string | null,
  solving: boolean,
  lastSolve: SolveResult | null,
  recentlyChanged: string[],      // positionIds to highlight
  actions: selectFlight, place(uldId, positionId), unassign(positionId),
           swap(a, b), toggleLock(positionId), select(uldId|null),
           optimize(), reset()
}
```
Derived (selectors): `unassignedUlds`, `cg` via `computeCg`, `score`, `totalWeight`, `canPlace(uldId, positionId): { ok, reason }`.

### 5.4 Visual spec

- Background `#f5f6f7`; surfaces white; text `#1c1f23`, muted `#5b6470`
- Accent (assigned tiles, primary button) jade `#0f6f6a`, hover `#0c5a56`
- Warn amber `#b7791f`, danger `#b42318`; target band `#0f6f6a` @ 12% alpha
- Fuselage outline: 1.5px `#c9ced6`, fill `#fbfbfc`
- Tiles: 1px border `#d8dde4`, radius 6px; filled tile = jade bg, white text; no shadows
- Font IBM Plex Sans 400/500/600; numbers `tabular-nums`
- Motion: needle `transition: left 600ms cubic-bezier(.2,.8,.2,1)`; tile fill `150ms`; optimise stagger only. No hover scaling, no gradients.

## 6. Data (`src/data/flights.ts`)

Three scenarios ported from the hackathon JSON (`cx2025`, `cx1234`, `cx5678`): same 34 positions,
ULD lists as in the source (34 / 34 / 34 — verify each; if a scenario ships fewer ULDs keep it as
a "light load" case). `targetCg` per flight from the source's `target_cg_long` if present, else 22.0.
`cgTolerance` = 1.5 m. Each flight gets a `note` such as "Full load, balanced target" — descriptive
of the synthetic data only, no invented routes or dates.

## 7. Docs

- `PROJECT.md` — Part 1 owner (what it is, `npm run dev`, deploy steps, how to add a scenario),
  Part 2 agent (rules: no logo, no real data, solver interface is the contract; file map; commands; verification list)
- `docs/algorithm.md` — research deliverable: original hackathon model, new model (§4.2), literature
  comparison (Mongeau & Bès 2003; Limbourg, Schyns & Laporte 2012; Vancroonenburg et al. 2014;
  Brandt & Nickel 2019 survey), what real W&B systems add that this demo omits (multi-leg, floor
  loading limits, CG envelope vs fuel burn, ULD contours, lateral/vertical CG), honest limits
- `docs/case-study.md` — EN + ZH, `[TO FILL]` for hackathon metrics (team size, judging result details)
- `README.md` — short public-facing readme with a screenshot placeholder

## 8. zijun.cloud integration

In the zijun.cloud repo (worktree `airline-app-optimization-1a0b61`):

- `content/projects/cathay-hackathon/en.json` & `zh.json`: add `meta.url = "https://cargo-demo.zijun.cloud"`,
  `meta.urlLabel = "Open demo"` / `"打开 Demo"`; rewrite "The Product" paragraph 2 to match the real
  model (GLPK MILP, constraints list); add tags `GLPK`, `WebAssembly`, `React`
- No code changes to the site.

## 9. Verification (before claiming done)

- `npm run typecheck && npm run lint && npm run test && npm run build`
- grep `-i "cathay cargo_logo\|neochain\|supabase"` over `src docs dist` → no hits (text mention of the hackathon name is allowed)
- Browser pass at 1280px and 375px: load, scroll aircraft, drag, tap-to-place, lock, optimise, switch flight, reset, open drawer; console clean
- Solver: all three flights optimise to `status: "optimal"` in < 2 s

## 10. Out of scope

Multi-leg planning, lower deck, fuel/ZFW envelope, real 747-8F station data, persistence, i18n
toggle inside the demo (English only), auth, analytics.

## 11. Work split (parallel agents after plan approval)

- **A · Solver + research**: §3 types, §4 solver + worker + tests, `docs/algorithm.md`
- **B · UI**: scaffold, §5 components, store, data, wired to a stub solver that returns a greedy
  assignment until A lands (same `SolveResult` shape)
- **C · Docs + site**: `PROJECT.md`, `docs/case-study.md`, `README.md`, zijun.cloud content JSON
- Integrator: swap stub for real solver, verification §9, private GitHub push

---

## Addendum 2026-09-12 — UI v2 (owner feedback on v1)

Owner review of v1: the horizontal fuselage "did not work", the aircraft drawing was wrong and
ugly, the scroll region felt like an unexplained cut-off, the page was not compact, the header was
confusing, and the CX numbers / finalist credit do not belong in the UI. Changes:

1. **Vertical aircraft, nose at the top** — like an airline seat map. `src/components/layout.ts`
   is the frozen contract: canvas 480×1400, fuselage x 90–390, tiles 96×52 in three columns
   (L 104, centre 192, R 280), `armToY` maps arms to y.
2. **Explicit scroll card** — the aircraft lives inside a bordered card of fixed height
   (`max-h` ≈ 72vh desktop, ≈ 46vh mobile) with a visible scrollbar, top/bottom fade masks, and a
   "Scroll ↓ Tail" caption; the nose is visible on load. Section tabs sit in the card header
   and scroll vertically.
3. **Three-zone layout** — top: CG strip (gauge, CG value, target, score, loaded weight,
   Reset, Optimize) sticky under the header; below: left = aircraft card, right = ULD panel
   (vertical list, sticky, own scroll). Mobile: CG strip → aircraft card → ULD list as a
   horizontal chip row pinned to the bottom. No bottom status bar.
4. **Accurate 747-8F silhouette** — real proportions from a top view (long upper-deck hump,
   swept wings at ~37°, four engine nacelles, swept tailplanes, fin as a thin centre line);
   wings and tailplanes drawn faint and clipped by the card so the fuselage reads as the focus.
5. **Header** — title "Boeing 747-8F" + subtitle "ULD load planner"; scenario switch is a
   segmented control "Full load · 34", "Partial · 24", "Light · 16" (no CX numbers anywhere in
   the UI); "How it works" button. The credit line moves to the drawer footer only.
6. **Compact** — 8-px rhythm, tile text 11–12 px, no empty regions; everything above the fold at
   1280×800 except the lower part of the aircraft (which scrolls inside its card).

Flight ids in `src/data/flights.ts` stay as is (they are internal keys); the UI shows `note`.
