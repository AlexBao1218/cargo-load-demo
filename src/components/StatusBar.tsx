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

export default function StatusBar() {
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
    ? "bg-line text-muted"
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

  const btn =
    "flex h-11 min-w-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors duration-150 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade disabled:cursor-not-allowed disabled:opacity-50";

  const loadedText = `Loaded ${cg.totalWeight.toLocaleString()} kg · ${loadedCount}/${flight.positions.length} positions`;

  return (
    <footer className="sticky bottom-0 z-20 border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-2.5 md:flex-row md:items-center md:gap-6 md:px-6 md:py-3">
        <div className="min-w-0 md:w-80 md:shrink-0">
          <CgGauge
            value={cg.long}
            target={flight.targetCg}
            tolerance={flight.cgTolerance}
            min={min}
            max={max}
            empty={empty}
            caption={loadedText}
            captionClassName="md:hidden"
          />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-xs text-muted">CG</span>
            <span className="tabular text-lg font-semibold whitespace-nowrap">{empty ? "—" : `${cg.long.toFixed(1)} m`}</span>
            <span className="tabular hidden text-xs whitespace-nowrap text-muted sm:inline">
              target {flight.targetCg.toFixed(1)} ± {flight.cgTolerance.toFixed(1)}
            </span>
          </div>
          <span
            className={"tabular shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold " + scoreClass}
            aria-label={`Score ${score}`}
          >
            Score {empty ? "—" : score}
          </span>
          <span className="tabular hidden text-xs whitespace-nowrap text-muted md:inline">{loadedText}</span>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={solving}
              aria-label="Reset"
              className={btn + " border border-line bg-surface px-3 text-ink hover:border-line-soft md:px-4"}
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span className="hidden md:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={onOptimize}
              disabled={solving || flight.ulds.length === 0}
              className={btn + " bg-jade text-white hover:bg-jade-deep"}
            >
              {solving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Zap size={14} aria-hidden="true" />}
              {solving ? "Solving…" : "Optimize"}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
