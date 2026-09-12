import { BookOpen } from "lucide-react";
import { FLIGHTS } from "@/data/flights";
import { useLoadStore } from "@/store/useLoadStore";

interface Props {
  onHelp: () => void;
}

/** "Full load · 34 ULDs" → ["Full load", "34 ULDs"]. Flight ids are never shown. */
const splitNote = (note: string | undefined, fallback: string): [string, string | null] => {
  if (!note) return [fallback, null];
  const [head, ...rest] = note.split(" · ");
  return [head, rest.length ? rest.join(" · ") : null];
};

export default function TopBar({ onHelp }: Props) {
  const flightId = useLoadStore((s) => s.flight.id);
  const selectFlight = useLoadStore((s) => s.selectFlight);

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 md:h-14 md:flex-nowrap md:px-6 md:py-0">
        <div className="flex min-w-0 items-baseline gap-x-2">
          <h1 className="text-[15px] font-semibold leading-tight whitespace-nowrap">Boeing 747-8F</h1>
          <span className="text-xs whitespace-nowrap text-muted">ULD load planner</span>
        </div>

        <button
          type="button"
          onClick={onHelp}
          className="ml-auto flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-[13px] text-ink transition-colors duration-150 hover:border-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade md:order-3 md:ml-0"
        >
          <BookOpen size={14} aria-hidden="true" />
          How it works
        </button>

        <div
          role="radiogroup"
          aria-label="Scenario"
          className="flex w-full items-center gap-0.5 rounded-md border border-line bg-bg p-0.5 md:order-2 md:ml-auto md:w-auto"
        >
          {FLIGHTS.map((f, i) => {
            const active = f.id === flightId;
            const [head, tail] = splitNote(f.note, `Scenario ${i + 1}`);
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectFlight(f.id)}
                className={
                  "flex h-8 flex-1 items-center justify-center gap-1 rounded-[5px] border px-2.5 text-[13px] whitespace-nowrap transition-colors duration-150 md:flex-none " +
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-jade " +
                  (active ? "border-line bg-surface font-medium text-ink" : "border-transparent text-muted hover:text-ink")
                }
              >
                <span>{head}</span>
                {tail && <span className="tabular hidden text-muted sm:inline">· {tail}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
