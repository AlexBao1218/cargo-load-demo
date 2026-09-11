import type { Flight, Position, Uld, UldType } from "@/domain/types";

// Positions and ULD lists are the hackathon's synthetic scenario data, re-scaled to a
// plausible 747-8F station frame (metres from datum). They are not real airline data.

const ROWS = ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q"] as const;
type Row = (typeof ROWS)[number];

const SECTION_OF_ROW: Record<Row, Position["section"]> = {
  C: "fwd", D: "fwd", E: "fwd", F: "fwd", G: "fwd",
  H: "mid", I: "mid", J: "mid", K: "mid", L: "mid",
  M: "aft", N: "aft", O: "aft", P: "aft", Q: "aft",
};

// Row weight limits cycle every four rows in the source data.
const ROW_LIMITS: ReadonlyArray<readonly [number, number]> = [
  [4700, 4800],
  [4820, 4920],
  [4940, 5040],
  [5060, 5160],
];

const ALL: UldType[] = ["AKE", "AMA"];
const arm = (y: number) => Math.round((5 + y / 30) * 10) / 10;

export const POSITIONS: Position[] = [
  { id: "A1", arm: arm(80), lateral: 0, maxWeight: 4200, section: "nose", allowedTypes: ["AKE"] },
  { id: "A2", arm: arm(170), lateral: 0, maxWeight: 4200, section: "nose", allowedTypes: ["AKE"] },
  { id: "B1", arm: arm(260), lateral: 0, maxWeight: 4300, section: "nose", allowedTypes: ["AKE"] },
  ...ROWS.flatMap((row, i): Position[] => {
    const y = 390 + i * 90;
    const [maxL, maxR] = ROW_LIMITS[i % ROW_LIMITS.length];
    return [
      { id: `${row}L`, arm: arm(y), lateral: -1, maxWeight: maxL, section: SECTION_OF_ROW[row], allowedTypes: ALL },
      { id: `${row}R`, arm: arm(y), lateral: 1, maxWeight: maxR, section: SECTION_OF_ROW[row], allowedTypes: ALL },
    ];
  }),
  { id: "R1", arm: arm(1800), lateral: 0, maxWeight: 6000, section: "tail", allowedTypes: ALL },
];

const uld = (id: string, weight: number, type: UldType): Uld => ({ id, weight, type });

const CX2025_ULDS: Uld[] = [
  uld("ULD-A", 1700, "AKE"),
  uld("ULD-B", 1873, "AMA"),
  uld("ULD-C", 2046, "AKE"),
  uld("ULD-D", 2219, "AMA"),
  uld("ULD-E", 2392, "AKE"),
  uld("ULD-F", 2565, "AMA"),
  uld("ULD-G", 2738, "AKE"),
  uld("ULD-H", 2911, "AMA"),
  uld("ULD-I", 3084, "AKE"),
  uld("ULD-J", 3257, "AMA"),
  uld("ULD-K", 3430, "AKE"),
  uld("ULD-L", 3603, "AMA"),
  uld("ULD-M", 3776, "AKE"),
  uld("ULD-N", 3949, "AMA"),
  uld("ULD-O", 4122, "AKE"),
  uld("ULD-P", 4295, "AMA"),
  uld("ULD-Q", 4468, "AKE"),
  uld("ULD-R", 4641, "AMA"),
  uld("ULD-S", 4814, "AKE"),
  uld("ULD-T", 1787, "AMA"),
  uld("ULD-U", 1960, "AKE"),
  uld("ULD-V", 2133, "AMA"),
  uld("ULD-W", 2306, "AKE"),
  uld("ULD-X", 2479, "AMA"),
  uld("ULD-Y", 2652, "AKE"),
  uld("ULD-Z", 2825, "AMA"),
  uld("ULD-AA", 2998, "AKE"),
  uld("ULD-AB", 3171, "AMA"),
  uld("ULD-AC", 3344, "AKE"),
  uld("ULD-AD", 3517, "AMA"),
  uld("ULD-AE", 3690, "AKE"),
  uld("ULD-AF", 3863, "AMA"),
  uld("ULD-AG", 4036, "AKE"),
  uld("ULD-AH", 4209, "AMA"),
];

const CX1234_ULDS: Uld[] = [
  uld("ULD-A", 1820, "AKE"),
  uld("ULD-B", 1993, "AMA"),
  uld("ULD-C", 2166, "AKE"),
  uld("ULD-D", 2339, "AMA"),
  uld("ULD-E", 2512, "AKE"),
  uld("ULD-F", 2685, "AMA"),
  uld("ULD-G", 2858, "AKE"),
  uld("ULD-H", 3031, "AMA"),
  uld("ULD-I", 3204, "AKE"),
  uld("ULD-J", 3377, "AMA"),
  uld("ULD-K", 3550, "AKE"),
  uld("ULD-L", 3723, "AMA"),
  uld("ULD-M", 3896, "AKE"),
  uld("ULD-N", 4069, "AMA"),
  uld("ULD-O", 4242, "AKE"),
  uld("ULD-P", 4415, "AMA"),
  uld("ULD-Q", 4588, "AKE"),
  uld("ULD-R", 4761, "AMA"),
  uld("ULD-S", 1734, "AKE"),
  uld("ULD-T", 1907, "AMA"),
  uld("ULD-U", 2080, "AKE"),
  uld("ULD-V", 2253, "AMA"),
  uld("ULD-W", 2426, "AKE"),
  uld("ULD-X", 2599, "AMA"),
];

const CX5678_ULDS: Uld[] = [
  uld("ULD-A", 1940, "AKE"),
  uld("ULD-B", 2113, "AMA"),
  uld("ULD-C", 2286, "AKE"),
  uld("ULD-D", 2459, "AMA"),
  uld("ULD-E", 2632, "AKE"),
  uld("ULD-F", 2805, "AMA"),
  uld("ULD-G", 2978, "AKE"),
  uld("ULD-H", 3151, "AMA"),
  uld("ULD-I", 3324, "AKE"),
  uld("ULD-J", 3497, "AMA"),
  uld("ULD-K", 3670, "AKE"),
  uld("ULD-L", 3843, "AMA"),
  uld("ULD-M", 4016, "AKE"),
  uld("ULD-N", 4189, "AMA"),
  uld("ULD-O", 4362, "AKE"),
  uld("ULD-P", 4535, "AMA"),
];

export const FLIGHTS: Flight[] = [
  { id: "CX2025", aircraft: "747-8F", targetCg: 36.0, cgTolerance: 2.0, positions: POSITIONS, ulds: CX2025_ULDS, note: "Full load · 34 ULDs" },
  { id: "CX1234", aircraft: "747-8F", targetCg: 34.0, cgTolerance: 2.0, positions: POSITIONS, ulds: CX1234_ULDS, note: "Partial load · 24 ULDs" },
  { id: "CX5678", aircraft: "747-8F", targetCg: 38.0, cgTolerance: 2.0, positions: POSITIONS, ulds: CX5678_ULDS, note: "Light load · 16 ULDs" },
];
