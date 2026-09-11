import { CANVAS } from "@/components/layout";

/**
 * Top-down 747-style outline drawn behind the position tiles. Purely decorative;
 * the tiles are positioned by `layout.ts`, not by this drawing.
 */
export default function Fuselage() {
  const { width: W, height: H } = CANVAS;
  const top = 34;
  const bottom = H - 34;
  const cy = H / 2;
  const noseTipX = 16;
  const bodyStartX = 170;
  const bodyEndX = W - 330;
  const tailTipX = W - 14;

  // Outer hull: rounded nose, straight body, tapered tail.
  const hull = [
    `M ${bodyStartX} ${top}`,
    `L ${bodyEndX} ${top}`,
    `C ${bodyEndX + 140} ${top} ${tailTipX - 120} ${cy - 26} ${tailTipX} ${cy - 12}`,
    `L ${tailTipX} ${cy + 12}`,
    `C ${tailTipX - 120} ${cy + 26} ${bodyEndX + 140} ${bottom} ${bodyEndX} ${bottom}`,
    `L ${bodyStartX} ${bottom}`,
    `C ${bodyStartX - 110} ${bottom} ${noseTipX + 20} ${cy + 46} ${noseTipX} ${cy}`,
    `C ${noseTipX + 20} ${cy - 46} ${bodyStartX - 110} ${top} ${bodyStartX} ${top}`,
    "Z",
  ].join(" ");

  // Upper-deck hump implied by an inner line over the nose section.
  const hump = `M 70 ${top + 30} C 130 ${top + 10} 250 ${top + 6} 380 ${top + 16}`;

  // Swept wing roots, clipped so they only peek outside the hull.
  const reach = 30;
  const wingRoot0 = 640;
  const wingRoot1 = 1000;
  const wingUpper = `M ${wingRoot0} ${top} L ${wingRoot0 + 90} ${top - reach} L ${wingRoot1 + 30} ${top - reach} L ${wingRoot1} ${top} Z`;
  const wingLower = `M ${wingRoot0} ${bottom} L ${wingRoot0 + 90} ${bottom + reach} L ${wingRoot1 + 30} ${bottom + reach} L ${wingRoot1} ${bottom} Z`;

  // Horizontal stabiliser roots near the tail.
  const stab0 = W - 210;
  const stab1 = W - 100;
  const stabUpper = `M ${stab0} ${top + 34} L ${stab0 + 40} ${top + 6} L ${stab1 + 30} ${top + 6} L ${stab1} ${top + 44} Z`;
  const stabLower = `M ${stab0} ${bottom - 34} L ${stab0 + 40} ${bottom - 6} L ${stab1 + 30} ${bottom - 6} L ${stab1} ${bottom - 44} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      <g stroke="var(--color-line-soft)" strokeWidth={1.5} fill="var(--color-fuselage)" strokeLinejoin="round">
        <path d={wingUpper} />
        <path d={wingLower} />
        <path d={stabUpper} />
        <path d={stabLower} />
        <path d={hull} />
      </g>
      <path d={hump} stroke="var(--color-line-soft)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <line
        x1={noseTipX + 40}
        y1={cy}
        x2={tailTipX - 40}
        y2={cy}
        stroke="var(--color-line)"
        strokeWidth={1}
        strokeDasharray="6 8"
      />
      <g fontSize={10} fill="var(--color-muted)" fontFamily="inherit" letterSpacing={1}>
        <text x={bodyStartX - 80} y={H - 8}>
          NOSE
        </text>
        <text x={tailTipX - 60} y={H - 8} textAnchor="end">
          TAIL
        </text>
        <text x={bodyStartX + 66} y={top + 14}>
          L
        </text>
        <text x={bodyStartX + 66} y={bottom - 6}>
          R
        </text>
      </g>
    </svg>
  );
}
