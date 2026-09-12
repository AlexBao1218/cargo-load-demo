interface Props {
  value: number;
  target: number;
  tolerance: number;
  min: number;
  max: number;
  /** Hide the needle (nothing loaded). */
  empty?: boolean;
  /** Optional short text between the Nose / Tail labels. */
  caption?: string;
  captionClassName?: string;
}

const NEEDLE_EASE = "left 600ms cubic-bezier(.2,.8,.2,1), background-color 150ms";

/**
 * Horizontal nose→tail gauge: a thin track, the target band (±tolerance), a
 * hairline at the target, and a needle that eases into place.
 */
export default function CgGauge({ value, target, tolerance, min, max, empty = false, caption, captionClassName = "" }: Props) {
  const span = max - min || 1;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / span) * 100));
  const bandLeft = pct(target - tolerance);
  const bandRight = pct(target + tolerance);
  const deviation = Math.abs(value - target);
  const needleColour = deviation > tolerance ? "bg-danger" : deviation > tolerance / 2 ? "bg-amber" : "bg-jade-deep";

  return (
    <div
      className="w-full"
      role="img"
      aria-label={
        empty
          ? "Centre of gravity gauge, nothing loaded"
          : `Centre of gravity ${value.toFixed(2)} m, target ${target.toFixed(1)} m, tolerance ${tolerance.toFixed(1)} m`
      }
    >
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line/50" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-jade-soft"
          style={{ left: `${bandLeft}%`, width: `${bandRight - bandLeft}%` }}
        />
        <div className="absolute inset-y-0.5 w-px bg-jade" style={{ left: `${pct(target)}%` }} />
        <div
          className={"absolute inset-y-0 w-[3px] rounded-full " + needleColour}
          style={{
            left: `${pct(empty ? target : value)}%`,
            transform: "translateX(-50%)",
            transition: NEEDLE_EASE,
            opacity: empty ? 0 : 1,
          }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] leading-none tracking-wide text-muted uppercase">
        <span>Nose</span>
        {caption && <span className={"tabular normal-case tracking-normal " + captionClassName}>{caption}</span>}
        <span>Tail</span>
      </div>
    </div>
  );
}
