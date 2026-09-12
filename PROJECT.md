# Cargo Load Planner Demo — 项目手册

两部分。第一部分给 Alex 看，讲这个东西在哪、怎么跑、怎么上线、怎么放进个人网站。
第二部分给 AI 看，讲规则、架构和不能碰的东西。改代码前两部分都读。

---

## Part 1 · 给 Alex

### 这是什么

Cathay Cargo Hackathon 2025 决赛作品（ULD 配载优化工具）的公开作品集重制版。原版是 24 小时内 vibe coding 出来的 web 应用，MILP 在服务端配合托管数据库跑；这一版是干净的新仓库，纯前端 SPA，没有后端，GLPK 编译成 WebAssembly 在浏览器的 Web Worker 里求解。UI 从 34 张卡片的竖排列表改成横向滚动的机身俯视图，支持拖拽、点选放置、锁定仓位。

数据是黑客松的合成数据，不是雇主数据，所以没有脱敏问题；但仍然按 `cloning-work-projects-for-portfolio` 的 SOP 走：独立仓库、无 logo、先 private。

### 披露决定（2026-09-11 定稿）

| 项目 | 决定 |
|---|---|
| 国泰货运 logo | **删除**。只保留文字署名 |
| 署名 | "Alex Bao · Cathay Cargo Hackathon 2025 Finalist" |
| 航班号 `CX2025 / CX1234 / CX5678` | **保留**（Alex 拍板）。它们是黑客松场景的编号，不对应真实航班 |
| 仓位、力臂、重量、ULD 编号 | 黑客松合成值，按 747-8F 量级重新缩放；任何地方都不能写成"国泰真实数据" |
| 原仓库里的创业公司品牌名 | 新仓库和所有文档里一律不出现，leak scan 会查 |

### 在哪

| 位置 | 地址 |
|---|---|
| 本地 | `~/Desktop/cargo-load-demo` |
| GitHub | https://github.com/AlexBao1218/cargo-load-demo（先 **private**，确认没问题后再改 public） |
| 线上 | 计划 `https://cargo-demo.zijun.cloud`，见下面"部署" |
| 原始黑客松仓库 | https://github.com/AlexBao1218/cxhack25（只读参考，不要整体复制文件） |

### 本地预览

```bash
cd ~/Desktop/cargo-load-demo && npm i && npm run dev
```

打开 http://localhost:5173。单页应用，没有路由。顶部选航班（三个场景），拖 ULD 到仓位，或者先点 ULD 再点仓位；点仓位上的 pin 锁定；底部 Optimize 让求解器排剩下的；右上 "How it works" 看模型。

生产构建检查：

```bash
cd ~/Desktop/cargo-load-demo && npm run typecheck && npm run lint && npm run test && npm run build
```

### 部署到 Vercel

```bash
cd ~/Desktop/cargo-load-demo && vercel login
```

```bash
cd ~/Desktop/cargo-load-demo && vercel --prod
```

第一次会问项目名，用 `cargo-load-demo`。Vercel 自动识别 Vite，输出 `dist/`。单页无路由，不需要 SPA 重写。

部署完成后在 Vercel 项目的 Domains 里加 `cargo-demo.zijun.cloud`，然后到 DNSPod（腾讯云）给 `zijun.cloud` 加一条 CNAME：`cargo-demo` → `cname.vercel-dns.com`。

### 放进 zijun.cloud

zijun.cloud 的项目页由 JSON 驱动，不用写 TSX。已经做的：

- `content/projects/cathay-hackathon/en.json` 和 `zh.json`：`meta.url` 指向 `https://cargo-demo.zijun.cloud`，`urlLabel` 是 "Open demo" / "打开 Demo"；"The Product" 第二段改成了真实的模型描述；末尾加了一段说明 2026 重制；标签加了 GLPK / WebAssembly / React。
- 站点代码没改。

还没做的：`content/projects/_index/en.json` / `zh.json` 里的卡片标签（目前是 `["AI", "MILP", "Operations Research", "Vibe Coding"]`），想同步的话手动加。

### 加一个场景

只改 `src/data/flights.ts`：

1. 写一个 `CXxxxx_ULDS: Uld[]` 数组，用 `uld(id, weight, type)`，type 只能是 `"AKE"` 或 `"AMA"`。
2. 在 `FLIGHTS` 里加一条 `{ id, aircraft: "747-8F", targetCg, cgTolerance: 2.0, positions: POSITIONS, ulds, note }`。`note` 只描述数据本身（"Full load · 34 ULDs"），不要编航线、日期。
3. ULD 数 ≤ 34，每个 ULD 至少有一个仓位放得下（`maxWeight ≥ weight` 且类型允许；机头 A1/A2/B1 只收 AKE），否则求解器直接报 infeasible。
4. 跑 `npm run test`，`solver.test.ts` 会把 `FLIGHTS` 里每个航班都求解一遍，要求 `optimal` 且 < 2 s。

### 还没做的事

- Vercel 部署和子域名
- README 截图
- `docs/case-study.md` 里的 `[TO FILL]`（队伍人数、评审结果细节）
- GitHub 仓库切 public
- zijun.cloud 项目列表卡片的标签同步（可选）

---

## Part 2 · For AI agents

Read this before touching any file. The rules below were set by the owner on 2026-09-11.

### Purpose

Public portfolio rebuild of a hackathon ULD load-planning tool. The goal is to show an airline-grade interaction and an honest, verifiable optimisation core. It is a demo of a method, not a weight-and-balance product.

### Hard rules

1. **No logo, ever.** No Cathay Cargo mark, no airline livery, no image assets that imply an airline brand. Attribution is the text line `Alex Bao · Cathay Cargo Hackathon 2025 Finalist`, nothing more.
2. **Never claim the data is real.** Positions, arms, weight limits, ULD ids and weights are synthetic hackathon values re-scaled to 747-8F magnitudes. Any copy that reads as "real Cathay data", "actual 747-8F station data" or "production load sheet" is wrong. The flight numbers `CX2025 / CX1234 / CX5678` are kept by owner decision; do not add more real-looking flight numbers, routes, dates or tail numbers.
3. **No venture branding.** The original hackathon repo carried the team's startup name; it must not appear in this repo, its docs, commit messages or `dist/`. It is the middle term of the leak-scan pattern below (written with a bracketed letter so the scan does not match this file).
4. **The solver public API is a contract.** `src/solver/index.ts` exports `SolveInput`, `SolveResult`, `SolveStatus`, `CgSummary`, `solve()`, `computeCg()`, `scoreFor()`. UI code imports only from `@/solver`. Change the shapes only with a matching update to every caller and to `docs/algorithm.md`.
5. **No raw hex in components.** Colours come from the `@theme` tokens in `src/index.css` (`bg`, `surface`, `ink`, `muted`, `line`, `jade`, `amber`, `danger` …). No shadows, no gradients except the two scroll-edge fades in `AircraftView`, no hover scaling.
6. **English only.** The demo has no locale toggle. Chinese lives in `docs/case-study.md` and on zijun.cloud.
7. **Browser-only.** No backend, no API routes, no database, no analytics. The solver runs in the browser (GLPK via glpk.js wasm in a Web Worker). Do not reintroduce a hosted database or any server dependency.
8. **Do not copy files wholesale from the original hackathon repo.** It is a read-only reference for the data and the original formulation.

### Architecture

Vite + React 19 + TypeScript (strict) + Tailwind CSS v4 + zustand + @dnd-kit/core + glpk.js 5 (GLPK compiled to WebAssembly). Static SPA, single screen, no router, no backend.

```
index.html                     title, viewport, description meta; favicon in public/
src/
  main.tsx                     mounts <App/>
  index.css                    @import tailwindcss + @theme colour/font tokens + IBM Plex Sans
  domain/types.ts              Uld, Position, Flight, Assignment  (frozen — spec §3)
  data/flights.ts              POSITIONS (34) + three scenarios CX2025 / CX1234 / CX5678
  solver/
    index.ts                   public API (contract): solve(), computeCg(), scoreFor(), types
    engine.ts                  lazy singleton `await GLPK()`
    model.ts                   buildModel(input, glpk) -> { lp, varMap }   (pure)
    parse.ts                   parseResult(result, varMap, input) -> SolveResult
    cg.ts                      computeCg / scoreFor (kept out of index.ts to avoid a cycle)
    solver.test.ts             vitest, node build of glpk.js
  store/useLoadStore.ts        zustand: flight, assignment, locked, selection, optimize(), reset()
  app/App.tsx                  layout shell + DndContext wiring + Esc handling
  components/
    TopBar.tsx                 title, flight <select>, "How it works" button, credit line
    SectionTabs.tsx            Nose · Fwd · Mid · Aft · Tail, scrollIntoView + IntersectionObserver
    AircraftView.tsx           horizontal scroll container, edge fades, tile grid over Fuselage
    Fuselage.tsx               SVG top-down 747-style outline (decorative, pointer-events none)
    layout.ts                  position -> {x,y} pixel map, CANVAS / TILE / SECTIONS constants
    PositionTile.tsx           droppable + draggable tile; empty / filled / valid / invalid / locked
    UldTray.tsx, UldChip.tsx   unassigned ULDs, draggable chips, tap-to-select
    StatusBar.tsx, CgGauge.tsx sticky bottom bar: CG gauge, numbers, score, Reset, Optimize
    HowItWorksDrawer.tsx       slide-over with the model in monospace + solve stats
    Toast.tsx                  tiny toast store + view
docs/
  algorithm.md                 original vs. new model, literature, honest limits
  case-study.md                EN + ZH case study with [TO FILL] markers
  superpowers/                 design spec + implementation plan (history)
PROJECT.md, README.md
```

Positions: nose `A1 A2 B1` (centreline, AKE only), main deck rows `C`–`Q` each `xL` / `xR` (fwd C–G, mid H–L, aft M–Q), tail `R1` (centreline). 34 total. Arm = metres from datum; lateral ∈ {−1, 0, 1}.

### The model (what the UI's "How it works" must stay in sync with)

Binary `x[i,j]` = ULD `i` in position `j`, created only when `maxWeight[j] ≥ weight[i]` and the ULD type is allowed (capacity and type compatibility by pruning). Each ULD exactly one position; each position at most one ULD; user-locked pairs fixed at 1. `W·g = Σ w_i a_j x[i,j]` defines the CG; `d ≥ |g − target|` and `e ≥ |m|` are linearised with two inequalities each, where `m = Σ w_i l_j x[i,j]` is the lateral moment. Objective `min d + λ·e/W`, λ = 0.05 (`lateralWeight`). Score `= round(100 · max(0, 1 − d / cgTolerance))`. ULDs > positions or a ULD that fits nowhere returns `infeasible` before GLPK is called. Full derivation and references in `docs/algorithm.md`.

### Commands

```bash
npm run dev        # http://localhost:5173
npm run typecheck  # tsc -b --noEmit, must be clean
npm run lint       # oxlint, 0 errors
npm run test       # vitest (solver only; glpk.js node build)
npm run build      # tsc -b && vite build → dist/
npm run preview    # serve dist/
```

Brand / leak scan (must print nothing; a plain text mention of the hackathon name is allowed):

```bash
grep -rniE "cathay cargo[_]logo|neo[c]hain|supa[b]ase" src docs README.md PROJECT.md dist
```

### Conventions

- Tokens only: `bg-jade`, `text-muted`, `border-line` etc. from `src/index.css`. Numbers use the `.tabular` class.
- Tiles 64×56, min tap target 44 px; chips and tiles are `<button>`s (Enter/Space = tap, Esc cancels).
- Motion budget: needle `600ms cubic-bezier(.2,.8,.2,1)`, tile fill `150ms`, optimise stagger 40 ms per tile. Nothing else animates.
- Copy is short and operational ("Loaded 61,400 kg · 12/34 positions"). No marketing language.
- Scenario `note` strings describe the synthetic data only ("Partial load · 24 ULDs"). Never invent routes, dates or customers.

### Verification before claiming done

1. `npm run typecheck && npm run lint && npm run test && npm run build` all clean.
2. Brand scan above prints nothing.
3. Browser pass at 1280 px and 375 px: load, scroll the aircraft, drag chip → tile, tap-to-place, tile → tile swap, tile → tray, lock, Optimize, switch flight, Reset, open and Esc the drawer. Fresh-load console clean.
4. All three flights optimise to `status: "optimal"` in under 2 s (the vitest suite asserts this too).

### Where the history lives

- `docs/superpowers/specs/2026-09-11-cargo-load-demo-design.md` — the design spec (disclosure decisions in §1, model in §4.2).
- `docs/superpowers/plans/2026-09-11-cargo-load-demo.md` — implementation plan and workstream ownership.
- `docs/algorithm.md` — original hackathon formulation vs. this one, literature, limits.
- `docs/case-study.md` — narrative for the portfolio, EN then ZH.
- Git log — one commit per workstream and per disclosure decision.
