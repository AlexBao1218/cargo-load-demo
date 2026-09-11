export type UldType = "AKE" | "AMA";

export interface Uld {
  id: string; // "ULD-A"
  weight: number; // kg
  type: UldType;
}

export type Section = "nose" | "fwd" | "mid" | "aft" | "tail";

export interface Position {
  id: string; // "CL", "A1", "R1"
  arm: number; // longitudinal station, metres from datum
  lateral: -1 | 0 | 1; // L / centreline / R
  maxWeight: number; // kg
  section: Section;
  allowedTypes: UldType[];
}

export interface Flight {
  id: string; // "CX2025"
  aircraft: "747-8F";
  targetCg: number; // metres, same frame as Position.arm
  cgTolerance: number; // metres; score = 100 at 0 deviation, 0 at tolerance
  positions: Position[];
  ulds: Uld[];
  note?: string; // one-line scenario description shown in the flight picker
}

/** positionId -> uldId | null */
export type Assignment = Record<string, string | null>;
