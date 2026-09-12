import { Loader2, RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { computeCg, scoreFor } from "@/solver";
import { useLoadStore } from "@/store/useLoadStore";
import { useToast } from "@/store/useToast";
import CgGauge from "@/components/CgGauge";
import ScenarioSwitch from "@/components/ScenarioSwitch";

/** Height of the strip on desktop (px). Used by the ULD panel for its sticky offset. */
export const STRIP_H = 48;
/** Metres either side of the target shown on the gauge. */
const GAUGE_WINDOW = 8;

const label = "text-[11px] leading-none tracking-wide text-muted uppercase";

/**
 * Live centre-of-gravity strip, sticky under the header. One 48 px row on
 * desktop; on mobile: gauge + actions, the numbers, then the scenario switch
 * (the loaded count moves to the bottom ULD strip there).
 */
export default function CgStrip() {
  const flight = useLoadStore((s) => s.flight);
  const assignment = useLoadStore((s) => s.assignment);
  const solving = useLoadStore((s) => s.solving);
  const optimize = useLoadStore((s) => s.optimize);
  const reset = useLoadStore((s) => s.reset);
  const push = useToast((s) => s.push);

  const cg = useMemo(() => computeCg(assignment, flight.ulds, flight.positions), [assignment, flight]);
  const loadedCount = useMemo(() => Object.values(assignment).filter(Boolean).length, [assignment]);

  const empty = cg.totalWeight === 0;
  const complete = loadedCount === flight.ulds.length;
  const provisional = !empty && !complete;
  const deviation = Math.abs(cg.long - flight.targetCg);
  const score = empty ? 0 : scoreFor(deviation, flight.cgTolerance);
  const dot = empty || provisional ? "bg-line-soft" : score >= 80 ? "bg-jade" : score >= 50 ? "bg-amber" : "bg-danger";

  const onOptimize = async () => {
    const r = await optimize();
    if (r.status === "optimal" || r.status === "feasible") {
      push(`Optimised · CG ${r.cg.long.toFixed(1)} m · ${Math.round(r.solveMs).toLocaleString()} ms`);
    } else if (r.status === "infeasible") {
      push("No feasible load plan · try unlocking positions", "error");
    } else {
      push(r.message ? `Solver error · ${r.message}` : "Solver error", "error");
    }
  };

  const loadedShort = `${cg.totalWeight.toLocaleString()} kg · ${loadedCount}/${flight.ulds.length}`;

  const btn =
    "flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors duration-150 md:h-8 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section aria-label="Centre of gravity" className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 md:h-12 md:flex-nowrap md:px-6 md:py-0">
        <div className="min-w-0 flex-1 md:w-64 md:flex-none">
          <CgGauge
            value={cg.long}
            target={flight.targetCg}
            tolerance={flight.cgTolerance}
            window={GAUGE_WINDOW}
            empty={empty}
            provisional={provisional}
          />
        </div>

        <div className="flex items-center gap-2 md:order-3 md:ml-auto">
          <button
            type="button"
            onClick={reset}
            disabled={solving}
            aria-label="Reset"
            className={btn + " w-10 border border-line bg-surface px-0 text-ink hover:border-line-soft md:w-auto md:px-3"}
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span className="hidden md:inline">Reset</span>
          </button>
          <button
            type="button"
            onClick={onOptimize}
            disabled={solving || flight.ulds.length === 0}
            className={btn + " min-w-[96px] bg-jade text-white hover:bg-jade-deep"}
          >
            {solving && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
            {solving ? "Solving…" : "Optimize"}
          </button>
        </div>

        <div className="flex w-full min-w-0 items-baseline gap-x-4 md:order-2 md:w-auto md:flex-1 md:gap-x-5">
          <span className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className={label}>CG</span>
            <span className="tabular text-base font-semibold leading-none">{empty ? "—" : `${cg.long.toFixed(1)} m`}</span>
          </span>
          <span className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className={label}>Target</span>
            <span className="tabular text-xs leading-none">
              {flight.targetCg.toFixed(1)} ± {flight.cgTolerance.toFixed(1)} m
            </span>
          </span>
          <span className="flex items-baseline gap-1.5 whitespace-nowrap" aria-label={`Score ${empty ? "none" : score}${provisional ? ", provisional" : ""}`}>
            <span aria-hidden="true" className={"inline-block size-1.5 translate-y-px rounded-full " + dot} />
            <span className={label}>Score</span>
            <span className={"tabular text-xs font-semibold leading-none " + (provisional ? "text-muted" : "text-ink")}>
              {empty ? "—" : score}
            </span>
          </span>
          <span className="hidden items-baseline gap-1.5 whitespace-nowrap md:flex">
            <span className={label}>Loaded</span>
            <span className="tabular text-xs leading-none">{loadedShort}</span>
          </span>
        </div>

        <ScenarioSwitch className="w-full md:hidden" />
      </div>
    </section>
  );
}
