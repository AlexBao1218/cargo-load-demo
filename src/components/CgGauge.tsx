interface Props {
  value: number;
  target: number;
  tolerance: number;
  /** Half-width of the visible window around the target, in metres. */
  window: number;
  /** Hide the needle (nothing loaded). */
  empty?: boolean;
  /** Not every ULD is on board yet: needle stays neutral. */
  provisional?: boolean;
}

const NEEDLE_EASE = "left 600ms cubic-bezier(.2,.8,.2,1), background-color 150ms";
/** Keep the needle inside the track's rounded caps. */
const EDGE = 1.5;

/**
 * Horizontal CG gauge over a ±`window` m span around the target: a track, the
 * ±tolerance band, a hairline at the target and a needle that eases into
 * place. Band-edge values are labelled under the track; when the CG is outside
 * the window a caret at that edge shows the actual value.
 */
export default function CgGauge({ value, target, tolerance, window, empty = false, provisional = false }: Props) {
  const min = target - window;
  const max = target + window;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const clamp = (p: number) => Math.max(EDGE, Math.min(100 - EDGE, p));
  const bandLeft = pct(target - tolerance);
  const bandRight = pct(target + tolerance);
  const deviation = Math.abs(value - target);
  const needleColour = provisional
    ? "bg-ink/70"
    : deviation > tolerance
      ? "bg-danger"
      : deviation > tolerance / 2
        ? "bg-amber"
        : "bg-jade-deep";
  const below = !empty && value < min;
  const above = !empty && value > max;

  return (
    <div
      className="w-full"
      role="img"
      aria-label={
        empty
          ? "Centre of gravity gauge, nothing loaded"
          : `Centre of gravity ${value.toFixed(1)} m, target ${target.toFixed(1)} m, tolerance ${tolerance.toFixed(1)} m`
      }
    >
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-line/50" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 bg-jade/20"
          style={{ left: `${bandLeft}%`, width: `${bandRight - bandLeft}%` }}
        />
        <div className="absolute inset-y-0.5 w-px bg-jade" style={{ left: `${pct(target)}%` }} />
        <div
          className={"absolute inset-y-0 w-[3px] rounded-full " + needleColour}
          style={{
            left: `${clamp(pct(empty ? target : value))}%`,
            transform: "translateX(-50%)",
            transition: NEEDLE_EASE,
            opacity: empty ? 0 : 1,
          }}
        />
      </div>
      <div className="tabular relative h-3 text-[10px] leading-3 text-muted">
        <span className="absolute -translate-x-1/2" style={{ left: `${bandLeft}%` }}>
          {(target - tolerance).toFixed(1)}
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: `${bandRight}%` }}>
          {(target + tolerance).toFixed(1)}
        </span>
        {below && <span className="absolute left-0 whitespace-nowrap text-danger">◂ {value.toFixed(1)} m</span>}
        {above && <span className="absolute right-0 whitespace-nowrap text-danger">{value.toFixed(1)} m ▸</span>}
      </div>
    </div>
  );
}
