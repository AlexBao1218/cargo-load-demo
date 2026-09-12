import { Loader2, RotateCcw, Zap } from "lucide-react";
import { useMemo } from "react";
import { computeCg, scoreFor } from "@/solver";
import { useLoadStore } from "@/store/useLoadStore";
import { useToast } from "@/store/useToast";
import CgGauge from "@/components/CgGauge";

const STATUS_LABEL: Record<string, string> = {
  optimal: "Optimal",
  feasible: "Feasible",
  infeasible: "Infeasible",
  error: "Error",
};

/** Height of the strip on desktop (px). Used by the ULD panel for its sticky offset. */
export const STRIP_H = 56;

/**
 * Live centre-of-gravity strip. Sticky under the header; one row on desktop,
 * two rows on mobile (gauge + actions, then the numbers).
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
  const { min, max } = useMemo(() => {
    const arms = flight.positions.map((p) => p.arm);
    return { min: Math.min(...arms), max: Math.max(...arms) };
  }, [flight]);

  const empty = cg.totalWeight === 0;
  const deviation = Math.abs(cg.long - flight.targetCg);
  const score = empty ? 0 : scoreFor(deviation, flight.cgTolerance);
  const scoreClass = empty
    ? "bg-line/60 text-muted"
    : score >= 80
      ? "bg-jade text-white"
      : score >= 50
        ? "bg-amber text-white"
        : "bg-danger text-white";

  const onOptimize = async () => {
    const r = await optimize();
    const label = STATUS_LABEL[r.status] ?? r.status;
    if (r.status === "optimal" || r.status === "feasible") {
      push(`${label} · CG ${r.cg.long.toFixed(2)} m · ${Math.round(r.solveMs).toLocaleString()} ms`);
    } else {
      push(r.message ? `${label} · ${r.message}` : label, "error");
    }
  };

  const loadedShort = `${cg.totalWeight.toLocaleString()} kg · ${loadedCount}/${flight.ulds.length}`;
  const loadedText = `Loaded ${loadedShort}`;

  const btn =
    "flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] md:h-9 font-medium transition-colors duration-150 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section
      aria-label="Centre of gravity"
      className="sticky top-0 z-30 border-b border-line bg-surface"
      style={{ minHeight: STRIP_H }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 md:h-14 md:flex-nowrap md:px-6 md:py-0">
        <div className="min-w-0 flex-1 md:w-64 md:flex-none">
          <CgGauge
            value={cg.long}
            target={flight.targetCg}
            tolerance={flight.cgTolerance}
            min={min}
            max={max}
            empty={empty}
            caption={loadedShort}
            captionClassName="md:hidden"
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
            className={btn + " min-w-[104px] bg-jade text-white hover:bg-jade-deep"}
          >
            {solving ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Zap size={13} aria-hidden="true" />}
            {solving ? "Solving…" : "Optimize"}
          </button>
        </div>

        <div className="flex w-full min-w-0 items-center gap-x-3 md:order-2 md:w-auto md:flex-1 md:gap-x-4">
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-[11px] tracking-wide text-muted uppercase">CG</span>
            <span className="tabular text-base font-semibold leading-none">{empty ? "—" : `${cg.long.toFixed(1)} m`}</span>
          </div>
          <span className="tabular text-xs whitespace-nowrap text-muted">
            target {flight.targetCg.toFixed(1)} ± {flight.cgTolerance.toFixed(1)}
          </span>
          <span
            className={"tabular shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 " + scoreClass}
            aria-label={`Score ${empty ? "none" : score}`}
          >
            {empty ? "Score —" : `Score ${score}`}
          </span>
          <span className="tabular hidden truncate text-xs text-muted md:inline">{loadedText}</span>
        </div>
      </div>
    </section>
  );
}
