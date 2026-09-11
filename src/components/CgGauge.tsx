interface Props {
  value: number;
  target: number;
  tolerance: number;
  min: number;
  max: number;
  /** Hide the needle (nothing loaded). */
  empty?: boolean;
  /** Optional short text shown between the Nose / Tail labels. */
  caption?: string;
  captionClassName?: string;
}

const NEEDLE_EASE = "left 600ms cubic-bezier(.2,.8,.2,1), background-color 150ms";

export default function CgGauge({ value, target, tolerance, min, max, empty = false, caption, captionClassName = "" }: Props) {
  const span = max - min || 1;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / span) * 100));
  const bandLeft = pct(target - tolerance);
  const bandRight = pct(target + tolerance);
  const deviation = Math.abs(value - target);
  const needleColour = deviation > tolerance ? "bg-danger" : deviation > tolerance / 2 ? "bg-amber" : "bg-ink";

  return (
    <div className="w-full">
      <div
        className="relative h-8 rounded-full bg-line/40"
        role="img"
        aria-label={
          empty
            ? "Centre of gravity gauge, nothing loaded"
            : `Centre of gravity ${value.toFixed(2)} m, target ${target.toFixed(1)} m, tolerance ${tolerance.toFixed(1)} m`
        }
      >
        <div
          className="absolute inset-y-0 bg-jade-soft"
          style={{ left: `${bandLeft}%`, width: `${bandRight - bandLeft}%` }}
        />
        <div className="absolute inset-y-1 w-px bg-jade" style={{ left: `${pct(target)}%` }} />
        <div
          className={"absolute inset-y-0 w-0.5 rounded-full " + needleColour}
          style={{
            left: `${pct(empty ? target : value)}%`,
            transform: "translateX(-50%)",
            transition: NEEDLE_EASE,
            opacity: empty ? 0 : 1,
          }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] tracking-wide text-muted uppercase">
        <span>Nose</span>
        {caption && <span className={"tabular normal-case tracking-normal " + captionClassName}>{caption}</span>}
        <span>Tail</span>
      </div>
    </div>
  );
}
