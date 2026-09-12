import { FLIGHTS } from "@/data/flights";
import { useLoadStore } from "@/store/useLoadStore";

/** "Full load · 34 ULDs" → "Full load". Flight ids are never shown; the count lives in the CG strip. */
const shortNote = (note: string | undefined, fallback: string) => (note ? note.split(" · ")[0] : fallback);

interface Props {
  className?: string;
}

/** Three equal segments, one per scenario. */
export default function ScenarioSwitch({ className = "" }: Props) {
  const flightId = useLoadStore((s) => s.flight.id);
  const selectFlight = useLoadStore((s) => s.selectFlight);

  return (
    <div
      role="radiogroup"
      aria-label="Scenario"
      className={"grid grid-cols-3 gap-0.5 rounded-md border border-line bg-bg p-0.5 " + className}
    >
      {FLIGHTS.map((f, i) => {
        const active = f.id === flightId;
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => selectFlight(f.id)}
            className={
              "flex h-8 items-center justify-center rounded-[5px] border px-2 text-[13px] whitespace-nowrap " +
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-jade " +
              (active ? "border-line bg-surface font-medium text-ink" : "border-transparent text-muted hover:text-ink")
            }
          >
            {shortNote(f.note, `Scenario ${i + 1}`)}
          </button>
        );
      })}
    </div>
  );
}
