# Cargo Load Planner

An interactive ULD load-planning demo for a 747-8F freighter. Drag containers onto a top-down view of the aircraft, watch the centre of gravity move, lock the positions you want to keep, and let a mixed-integer programme place the rest — solved by GLPK compiled to WebAssembly, entirely in your browser. Rebuilt from a Cathay Cargo Hackathon 2025 finalist entry.

**Try it:** https://cargo-demo.zijun.cloud

![Cargo Load Planner — desktop view after Optimize](docs/screenshots/desktop.png)

## Features

- **Scrollable fuselage** — 34 positions (nose, main deck rows C–Q left/right, tail) on a horizontally scrolling aircraft with section tabs
- **Drag or tap** — drag-and-drop on desktop, tap-to-place on mobile; invalid positions (over capacity, wrong ULD type) are flagged before you drop
- **Lock positions** — pin a ULD where it is; the optimiser treats it as fixed (human-in-the-loop)
- **Optimize in-browser** — a MILP with binary assignment variables, position weight limits and ULD-type compatibility, minimising CG deviation plus a lateral-balance penalty
- **Live CG gauge and score** — target band, tolerance, 0–100 score, solve time
- **Three scenarios** — CX2025 full load (34 ULDs), CX1234 partial (24), CX5678 light (16); synthetic data

## How it works

Every ULD–position pair that fits becomes a binary variable; each ULD must land in exactly one position and each position holds at most one ULD. The longitudinal CG is a linear function of those variables, so minimising its distance from the target (plus a small penalty on left–right moment) is a mixed-integer linear programme. GLPK, compiled to WebAssembly via glpk.js, solves it in a Web Worker in well under half a second for the full 34-ULD case (≈ 1,100 binaries, 40–360 ms measured). Full formulation, original hackathon model and literature comparison: [`docs/algorithm.md`](docs/algorithm.md).

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · zustand · @dnd-kit/core · glpk.js (GLPK 5 → wasm) · vitest. Static SPA, no backend.

## Run locally

```bash
npm i
npm run dev        # http://localhost:5173
npm run test       # solver tests
npm run build      # dist/
```

## Attribution

Alex Bao · Cathay Cargo Hackathon 2025 Finalist. Positions, weights and ULD ids are synthetic hackathon values re-scaled to freighter magnitudes; they are not real airline data. Case study: [`docs/case-study.md`](docs/case-study.md).

## License

MIT
