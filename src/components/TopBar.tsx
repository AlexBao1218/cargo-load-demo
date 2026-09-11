import { BookOpen, Plane } from "lucide-react";
import { FLIGHTS } from "@/data/flights";
import { useLoadStore } from "@/store/useLoadStore";

interface Props {
  onHelp: () => void;
}

export const CREDIT = "Alex Bao · Cathay Cargo Hackathon 2025 Finalist";

export default function TopBar({ onHelp }: Props) {
  const flightId = useLoadStore((s) => s.flight.id);
  const selectFlight = useLoadStore((s) => s.selectFlight);

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Plane size={18} className="shrink-0 text-jade" aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h1 className="text-base font-semibold leading-tight">Cargo Load Planner</h1>
              <span className="text-xs text-muted">747-8F freighter · demo</span>
            </div>
            <p className="hidden text-xs text-muted md:block">{CREDIT}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="sr-only">Flight</span>
            <select
              value={flightId}
              onChange={(e) => selectFlight(e.target.value)}
              className="h-11 max-w-[60vw] rounded-md border border-line bg-surface px-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade md:max-w-none"
            >
              {FLIGHTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.id}
                  {f.note ? ` — ${f.note}` : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onHelp}
            className="flex h-11 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm text-ink transition-colors duration-150 hover:border-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade"
          >
            <BookOpen size={16} aria-hidden="true" />
            <span className="hidden sm:inline">How it works</span>
            <span className="sm:hidden">How</span>
          </button>
        </div>
      </div>
    </header>
  );
}
