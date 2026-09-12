import { CANVAS, FUSELAGE } from "@/components/layout";

/**
 * Top-down Boeing 747-8F silhouette, nose at the top, tail at the bottom.
 * Purely decorative — tiles are positioned by `layout.ts`, not by this drawing.
 *
 * Length is mapped to y 16…1338. The body width (x 90…390) is exaggerated
 * relative to true scale so three tile columns fit; wings and tailplanes are
 * drawn at a matching sweep and run well past the SVG viewport (overflow is
 * visible) so the scroll card, not the canvas, clips them (seat-map convention).
 */

const { width: W, height: H } = CANVAS;
const CX = FUSELAGE.centreX;
const LEFT = FUSELAGE.left;
const RIGHT = FUSELAGE.right;

const NOSE_Y = 16;
const TAIL_Y = 1338;

/** Mirror an x coordinate across the centreline. */
const m = (x: number) => 2 * CX - x;

// ---------------------------------------------------------------------------
// Hull. Right-hand side is authored; the left side is the mirror image.
// Nose: blunt ogival radome reaching full width ~15 % down the length.
// Tail: full width held to y 1150 (the last outer tile row ends at y 1189,
// x 376 — the cone must clear its corners), then a cone that closes over the
// final ~14 % into a rounded end.
// ---------------------------------------------------------------------------
const NOSE_FULL_Y = 208;
const TAPER_Y = 1150;
const CONE_END_Y = 1326;
const CONE_END_HALF = 34;

const hull = [
  `M ${CX} ${NOSE_Y}`,
  // right nose
  `C ${CX + 80} ${NOSE_Y} ${RIGHT} ${NOSE_Y + 90} ${RIGHT} ${NOSE_FULL_Y}`,
  // right side
  `L ${RIGHT} ${TAPER_Y}`,
  // right tail cone
  `C ${RIGHT} ${TAPER_Y + 90} ${RIGHT - 54} ${CONE_END_Y - 48} ${CX + CONE_END_HALF} ${CONE_END_Y}`,
  // rounded tail end
  `Q ${CX} ${TAIL_Y + 8} ${CX - CONE_END_HALF} ${CONE_END_Y}`,
  // left tail cone
  `C ${m(RIGHT - 54)} ${CONE_END_Y - 48} ${LEFT} ${TAPER_Y + 90} ${LEFT} ${TAPER_Y}`,
  // left side
  `L ${LEFT} ${NOSE_FULL_Y}`,
  // left nose
  `C ${LEFT} ${NOSE_Y + 90} ${CX - 80} ${NOSE_Y} ${CX} ${NOSE_Y}`,
  "Z",
].join(" ");

// ---------------------------------------------------------------------------
// Upper-deck hump: the 747-8's stretched upper deck runs from the cockpit to
// roughly a fifth of the length (ending just ahead of the first main-deck
// row), about half the body width. Drawn as a raised plate.
// ---------------------------------------------------------------------------
const HUMP_HALF = 74;
const HUMP_END_Y = 270;
const hump = [
  `M ${CX} ${NOSE_Y + 24}`,
  `C ${CX + 46} ${NOSE_Y + 24} ${CX + HUMP_HALF} ${NOSE_Y + 54} ${CX + HUMP_HALF} ${NOSE_Y + 96}`,
  `L ${CX + HUMP_HALF} ${HUMP_END_Y - 90}`,
  `C ${CX + HUMP_HALF} ${HUMP_END_Y - 34} ${CX + 48} ${HUMP_END_Y} ${CX} ${HUMP_END_Y}`,
  `C ${CX - 48} ${HUMP_END_Y} ${CX - HUMP_HALF} ${HUMP_END_Y - 34} ${CX - HUMP_HALF} ${HUMP_END_Y - 90}`,
  `L ${CX - HUMP_HALF} ${NOSE_Y + 96}`,
  `C ${CX - HUMP_HALF} ${NOSE_Y + 54} ${CX - 46} ${NOSE_Y + 24} ${CX} ${NOSE_Y + 24}`,
  "Z",
].join(" ");

// Cockpit glazing: a short arc across the front of the hump.
const cockpit = `M ${CX - 30} ${NOSE_Y + 46} Q ${CX} ${NOSE_Y + 34} ${CX + 30} ${NOSE_Y + 46}`;

// ---------------------------------------------------------------------------
// Wings. Root leading edge at ~36 % of length, trailing edge (with the
// inboard "Yehudi" extension) at ~55 %. Leading-edge sweep 37.5°.
// Drawn from the centreline (hidden under the hull) out past the card edge.
// ---------------------------------------------------------------------------
const WING_LE_Y = 487;
const WING_TE_Y = 739;
const LE_SLOPE = Math.tan((37.5 * Math.PI) / 180);
const TE_SLOPE = -0.14; // inboard trailing edge sweeps slightly forward
const WING_REACH = 380; // px outboard of the body side (clipped by the card)

function wingPath(sign: 1 | -1): string {
  const rootX = sign === 1 ? RIGHT : LEFT;
  const tipX = rootX + sign * WING_REACH;
  const leTip = WING_LE_Y + WING_REACH * LE_SLOPE;
  const teTip = WING_TE_Y + WING_REACH * TE_SLOPE;
  return [
    `M ${CX} ${WING_LE_Y - 30}`,
    `L ${rootX} ${WING_LE_Y}`,
    `L ${tipX} ${leTip}`,
    `L ${tipX} ${teTip}`,
    `L ${rootX} ${WING_TE_Y}`,
    `L ${CX} ${WING_TE_Y + 30}`,
    "Z",
  ].join(" ");
}

/** Engine nacelles hang ahead of the leading edge; the aft part tucks under the wing. */
const NACELLE = { w: 24, h: 54, ahead: 38 } as const;
/** ≈ 40 % and 70 % of the visible semi-span, px outboard of the body side. */
const NACELLE_OFFSETS = [140, 260] as const;

function nacelles(sign: 1 | -1): { x: number; y: number }[] {
  const rootX = sign === 1 ? RIGHT : LEFT;
  return NACELLE_OFFSETS.map((d) => {
    const cx = rootX + sign * d;
    const le = WING_LE_Y + d * LE_SLOPE;
    return { x: cx - NACELLE.w / 2, y: le - NACELLE.ahead };
  });
}

// ---------------------------------------------------------------------------
// Horizontal stabilisers: leading edge swept ~37°, trailing edge ~25°, rooted
// in the tail cone. The polygon is capped at the canvas bottom so nothing
// extends the scroll height.
// ---------------------------------------------------------------------------
const STAB_LE_Y = 1092; // at the centreline (hidden)
const STAB_TE_Y = 1284;
const STAB_LE_SLOPE = 0.74;
const STAB_TE_SLOPE = 0.46;
const STAB_REACH = 380; // px outboard of the body side
const STAB_CAP_Y = H - 2;

function stabPath(sign: 1 | -1): string {
  const span = RIGHT - CX + STAB_REACH;
  const tipX = CX + sign * span;
  const leTipY = STAB_LE_Y + span * STAB_LE_SLOPE;
  const teTipY = STAB_TE_Y + span * STAB_TE_SLOPE;
  // Where each edge would cross the cap line.
  const leCapX = CX + sign * ((STAB_CAP_Y - STAB_LE_Y) / STAB_LE_SLOPE);
  const teCapX = CX + sign * ((STAB_CAP_Y - STAB_TE_Y) / STAB_TE_SLOPE);
  return [
    `M ${CX} ${STAB_LE_Y}`,
    leTipY > STAB_CAP_Y ? `L ${leCapX} ${STAB_CAP_Y} L ${tipX} ${STAB_CAP_Y}` : `L ${tipX} ${leTipY}`,
    teTipY > STAB_CAP_Y ? `L ${teCapX} ${STAB_CAP_Y}` : `L ${tipX} ${teTipY}`,
    `L ${CX} ${STAB_TE_Y}`,
    "Z",
  ].join(" ");
}

// Vertical fin seen from above: a slender spine over the last ~12 % of the
// length, its trailing edge overhanging the tail cone.
const FIN_TOP_Y = 1178;
const FIN_END_Y = 1352;
const fin = [
  `M ${CX} ${FIN_TOP_Y}`,
  `L ${CX + 3} ${CONE_END_Y}`,
  `L ${CX + 1.5} ${FIN_END_Y}`,
  `L ${CX - 1.5} ${FIN_END_Y}`,
  `L ${CX - 3} ${CONE_END_Y}`,
  "Z",
].join(" ");

export default function Fuselage() {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      overflow="visible"
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      {/* Wings, nacelles and tailplanes: behind the hull, clipped by the card */}
      <g fill="var(--color-wing)" stroke="var(--color-line-soft)" strokeWidth={1} strokeLinejoin="round">
        {([1, -1] as const).map((sign) => (
          <g key={sign}>
            {nacelles(sign).map((n) => (
              <rect
                key={n.x}
                x={n.x}
                y={n.y}
                width={NACELLE.w}
                height={NACELLE.h}
                rx={NACELLE.w / 2}
              />
            ))}
            <path d={wingPath(sign)} />
            <path d={stabPath(sign)} />
          </g>
        ))}
      </g>

      {/* Hull */}
      <path
        d={hull}
        fill="var(--color-fuselage)"
        stroke="var(--color-line-strong)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Vertical fin: a thin spine at the tail */}
      <path d={fin} fill="var(--color-line-strong)" opacity={0.8} />

      {/* Upper-deck hump (raised plate) and cockpit glazing */}
      <path d={hump} fill="var(--color-fuselage-hump)" stroke="var(--color-line-strong)" strokeWidth={1} />
      <path d={cockpit} fill="none" stroke="var(--color-line-strong)" strokeWidth={1} strokeLinecap="round" />

      {/* Centreline */}
      <line
        x1={CX}
        y1={NOSE_Y + 26}
        x2={CX}
        y2={FIN_TOP_Y - 8}
        stroke="var(--color-line)"
        strokeWidth={1}
        strokeDasharray="4 6"
      />

      {/* Side labels */}
      <g fontSize={11} fontWeight={500} fill="var(--color-muted)" opacity={0.8} textAnchor="middle">
        <text x={LEFT + 34} y={172}>
          L
        </text>
        <text x={RIGHT - 34} y={172}>
          R
        </text>
      </g>
    </svg>
  );
}
