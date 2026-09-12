import { X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useLoadStore } from "@/store/useLoadStore";

/** The credit appears here and nowhere else in the UI. */
const CREDIT = "Alex Bao · Cathay Cargo Hackathon 2025 Finalist";

interface Props {
  open: boolean;
  onClose: () => void;
}

const Formula = ({ children }: { children: string }) => (
  <pre className="overflow-x-auto rounded-md border border-line bg-bg px-3 py-2 font-mono text-[12.5px] leading-relaxed whitespace-pre text-ink">
    {children}
  </pre>
);

export default function HowItWorksDrawer({ open, onClose }: Props) {
  const flight = useLoadStore((s) => s.flight);
  const lastSolve = useLoadStore((s) => s.lastSolve);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const binaries = useMemo(
    () =>
      flight.ulds.reduce(
        (n, u) => n + flight.positions.filter((p) => p.maxWeight >= u.weight && p.allowedTypes.includes(u.type)).length,
        0,
      ),
    [flight],
  );

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="hiw-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-surface"
        style={{ animation: "drawerIn 220ms cubic-bezier(.2,.8,.2,1) both" }}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id="hiw-title" className="text-base font-semibold">
            How it works
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-jade"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-ink">
          <section className="space-y-2">
            <h3 className="font-semibold">What you are looking at</h3>
            <p>
              A top-down view of a 747-8F main deck with {flight.positions.length} ULD positions, nose at the top. Each
              position has a maximum weight and a set of allowed container types. The Unassigned panel holds the ULDs
              booked on the flight, each with a weight and a type.
            </p>
            <p>
              The goal is to load every ULD so the aircraft&apos;s longitudinal centre of gravity lands on the target
              station ({flight.targetCg.toFixed(1)} m), keeping left and right sides balanced. Drag or tap to load by
              hand, lock what you want frozen, then let the solver fill the rest.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">The model</h3>
            <p className="text-muted">A mixed-integer linear program over ULDs i and positions j.</p>
            <Formula>{`x[i,j] ∈ {0,1}   ULD i sits in position j
g ∈ ℝ            longitudinal CG
d ≥ 0            |g − target|
m ∈ ℝ, e ≥ 0     lateral moment and |m|`}</Formula>
            <Formula>{`Σ_j x[i,j] = 1            for every ULD i
Σ_i x[i,j] ≤ 1            for every position j
W·g = Σ_ij w_i·a_j·x[i,j]  CG definition
g − d ≤ t,  −g − d ≤ −t   d ≥ |g − t|
m = Σ_ij w_i·l_j·x[i,j]   l_j ∈ {−1, 0, +1}
m − e ≤ 0,  −m − e ≤ 0    e ≥ |m|
x[i,j] = 1                for every locked pair`}</Formula>
            <p className="text-muted">
              Capacity and type limits are enforced by pruning: a variable x[i,j] only exists when position j can take
              ULD i, which is equivalent to w_i·x[i,j] ≤ c_j.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Objective</h3>
            <Formula>{`minimise  |CG − target|  +  λ·|L−R moment| / W`}</Formula>
            <p className="text-muted">
              λ = 0.05 by default, so lateral balance is a tie-breaker rather than a competing goal. Score = 100 ·
              max(0, 1 − |CG − target| / tolerance).
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">How it runs</h3>
            <p>
              GLPK 5 compiled to WebAssembly (glpk.js) solves the MILP in a Web Worker in your browser. Nothing leaves
              the page.
            </p>
            <p className="tabular text-muted">
              {lastSolve
                ? `Last solve: ${binaries.toLocaleString()} binaries · ${Math.round(lastSolve.solveMs).toLocaleString()} ms · ${lastSolve.status}`
                : `Model size (${flight.note ?? "this scenario"}): ${binaries.toLocaleString()} binaries · press Optimize to run`}
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">What real load planning adds</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>CG envelope expressed in %MAC, checked at zero-fuel, take-off and landing weights</li>
              <li>Fuel burn and fuel shift moving the CG in flight</li>
              <li>Floor, running and cumulative load limits per bay</li>
              <li>Multi-leg planning with transit ULDs staying on board</li>
              <li>Dangerous-goods segregation and ULD contour compatibility</li>
            </ul>
            <p className="text-muted">See docs/algorithm.md in the repo for the full comparison.</p>
          </section>
        </div>
        <footer className="border-t border-line px-5 py-3 text-xs text-muted">{CREDIT}</footer>
      </aside>
    </div>
  );
}
