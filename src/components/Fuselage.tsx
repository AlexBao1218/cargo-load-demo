import { CANVAS, FUSELAGE } from "@/components/layout";

/**
 * Top-down Boeing 747-8F silhouette, nose at the top, tail at the bottom.
 * Purely decorative — tiles are positioned by `layout.ts`, not by this drawing.
 *
 * Length is mapped to y 40…1370. The body width (x 90…390) is exaggerated
 * relative to true scale so three tile columns fit; wings and tailplanes are
 * drawn at a matching sweep and run past the canvas edge, where the scroll
 * card clips them (seat-map convention).
 */

const { width: W, height: H } = CANVAS;
const CX = FUSELAGE.centreX;
const LEFT = FUSELAGE.left;
const RIGHT = FUSELAGE.right;

const NOSE_Y = 40;
const TAIL_Y = 1370;

/** Mirror an x coordinate across the centreline. */
const m = (x: number) => 2 * CX - x;

// ---------------------------------------------------------------------------
// Hull. Right-hand side is authored; the left side is the mirror image.
// Nose: blunt ogival radome reaching full width ~15 % down the length.
// Tail: full width held to ~83 % (the last tile row sits at y 1140–1192),
// then a cone that closes over the final ~16 % into a rounded end.
// ---------------------------------------------------------------------------
const NOSE_FULL_Y = 240;
const TAPER_Y = 1150;
const CONE_END_Y = 1358;
const CONE_END_HALF = 34;

const hull = [
  `M ${CX} ${NOSE_Y}`,
  // right nose
  `C ${CX + 80} ${NOSE_Y} ${RIGHT} ${NOSE_Y + 90} ${RIGHT} ${NOSE_FULL_Y}`,
  // right side
  `L ${RIGHT} ${TAPER_Y}`,
  // right tail cone
  `C ${RIGHT} ${TAPER_Y + 90} ${RIGHT - 66} ${CONE_END_Y - 54} ${CX + CONE_END_HALF} ${CONE_END_Y}`,
  // rounded tail end
  `Q ${CX} ${TAIL_Y + 8} ${CX - CONE_END_HALF} ${CONE_END_Y}`,
  // left tail cone
  `C ${m(RIGHT - 66)} ${CONE_END_Y - 54} ${LEFT} ${TAPER_Y + 90} ${LEFT} ${TAPER_Y}`,
  // left side
  `L ${LEFT} ${NOSE_FULL_Y}`,
  // left nose
  `C ${LEFT} ${NOSE_Y + 90} ${CX - 80} ${NOSE_Y} ${CX} ${NOSE_Y}`,
  "Z",
].join(" ");

// ---------------------------------------------------------------------------
// Upper-deck hump: the 747-8's stretched upper deck runs from the cockpit to
// roughly a fifth of the length (ending just ahead of the first main-deck
// row), about half the body width.
// ---------------------------------------------------------------------------
const HUMP_HALF = 74;
const HUMP_END_Y = 302;
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
// Drawn from the centreline (hidden under the hull) out past the canvas edge.
// ---------------------------------------------------------------------------
const WING_LE_Y = 519;
const WING_TE_Y = 771;
const LE_SLOPE = Math.tan((37.5 * Math.PI) / 180);
const TE_SLOPE = -0.14; // inboard trailing edge sweeps slightly forward
const WING_REACH = 260; // px outboard of the body side (clipped at the canvas)

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
const NACELLE_OFFSETS = [28, 70] as const; // px outboard of the body side

function nacelles(sign: 1 | -1): { x: number; y: number }[] {
  const rootX = sign === 1 ? RIGHT : LEFT;
  return NACELLE_OFFSETS.map((d) => {
    const cx = rootX + sign * d;
    const le = WING_LE_Y + d * LE_SLOPE;
    return { x: cx - NACELLE.w / 2, y: le - NACELLE.ahead };
  });
}

// ---------------------------------------------------------------------------
// Horizontal stabilisers: swept ~37°, rooted in the tail cone.
// ---------------------------------------------------------------------------
const STAB_LE_Y = 1124; // at the centreline (hidden)
const STAB_TE_Y = 1316;
const STAB_LE_SLOPE = 0.74;
const STAB_TE_SLOPE = 0.16;
const STAB_REACH = 300;

function stabPath(sign: 1 | -1): string {
  const tipX = CX + sign * STAB_REACH;
  return [
    `M ${CX} ${STAB_LE_Y}`,
    `L ${tipX} ${STAB_LE_Y + STAB_REACH * STAB_LE_SLOPE}`,
    `L ${tipX} ${STAB_TE_Y + STAB_REACH * STAB_TE_SLOPE}`,
    `L ${CX} ${STAB_TE_Y}`,
    "Z",
  ].join(" ");
}

// Vertical fin seen from above: a slender spine over the last ~12 % of the
// length, its trailing edge overhanging the tail cone.
const FIN_TOP_Y = 1210;
const FIN_END_Y = 1384;
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
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
      {/* Wings, nacelles and tailplanes: faint, behind the hull */}
      <g
        opacity={0.7}
        fill="var(--color-fuselage)"
        stroke="var(--color-line-soft)"
        strokeWidth={1}
        strokeLinejoin="round"
      >
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
        stroke="var(--color-line-soft)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Vertical fin: a thin spine at the tail */}
      <path d={fin} fill="var(--color-line-soft)" opacity={0.8} />

      {/* Upper-deck hump and cockpit glazing */}
      <g fill="none" stroke="var(--color-line-soft)" strokeWidth={1} strokeLinecap="round" opacity={0.8}>
        <path d={hump} />
        <path d={cockpit} />
      </g>

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
      <g fontSize={11} fontWeight={500} fill="var(--color-muted)" opacity={0.55} textAnchor="middle">
        <text x={LEFT + 34} y={204}>
          L
        </text>
        <text x={RIGHT - 34} y={204}>
          R
        </text>
      </g>
    </svg>
  );
}
