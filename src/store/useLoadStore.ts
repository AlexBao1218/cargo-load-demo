import { create } from "zustand";
import type { Assignment, Flight, Position, Uld } from "@/domain/types";
import { FLIGHTS } from "@/data/flights";
import { solve, type SolveResult } from "@/solver";

export type PlaceCheck = { ok: true } | { ok: false; reason: string };

export interface LoadState {
  flight: Flight;
  assignment: Assignment;
  locked: Record<string, true>;
  selectedUldId: string | null;
  solving: boolean;
  lastSolve: SolveResult | null;
  recentlyChanged: string[];
  selectFlight: (id: string) => void;
  select: (uldId: string | null) => void;
  canPlace: (uldId: string, positionId: string) => PlaceCheck;
  /** Handles place from tray, move between tiles and swap. */
  place: (uldId: string, positionId: string) => PlaceCheck;
  unassign: (positionId: string) => void;
  toggleLock: (positionId: string) => void;
  optimize: () => Promise<SolveResult>;
  reset: () => void;
  clearRecent: () => void;
}

const emptyAssignment = (f: Flight): Assignment =>
  Object.fromEntries(f.positions.map((p) => [p.id, null]));

const positionOf = (assignment: Assignment, uldId: string): string | null =>
  Object.keys(assignment).find((k) => assignment[k] === uldId) ?? null;

export const useLoadStore = create<LoadState>((set, get) => ({
  flight: FLIGHTS[0],
  assignment: emptyAssignment(FLIGHTS[0]),
  locked: {},
  selectedUldId: null,
  solving: false,
  lastSolve: null,
  recentlyChanged: [],

  selectFlight: (id) => {
    const flight = FLIGHTS.find((f) => f.id === id) ?? FLIGHTS[0];
    set({
      flight,
      assignment: emptyAssignment(flight),
      locked: {},
      selectedUldId: null,
      lastSolve: null,
      recentlyChanged: [],
    });
  },

  select: (uldId) => set({ selectedUldId: uldId }),

  canPlace: (uldId, positionId) => {
    const { flight, assignment, locked } = get();
    const uld = flight.ulds.find((u) => u.id === uldId);
    const pos = flight.positions.find((p) => p.id === positionId);
    if (!uld || !pos) return { ok: false, reason: "Unknown ULD or position" };
    if (assignment[positionId] === uldId) return { ok: true };
    if (locked[positionId]) return { ok: false, reason: `${positionId} is locked` };
    if (!pos.allowedTypes.includes(uld.type)) {
      return { ok: false, reason: `${uld.type} not allowed in ${positionId}` };
    }
    if (pos.maxWeight < uld.weight) {
      return { ok: false, reason: `${positionId} max ${pos.maxWeight.toLocaleString()} kg` };
    }
    const occupant = assignment[positionId];
    if (occupant && occupant !== uldId) {
      // Swap: the occupant must fit where the ULD came from. If the ULD came from
      // the tray, the occupant is unloaded to the tray instead.
      const from = positionOf(assignment, uldId);
      if (from) {
        const fromPos = flight.positions.find((p) => p.id === from)!;
        const occ = flight.ulds.find((u) => u.id === occupant)!;
        if (locked[from]) return { ok: false, reason: `${from} is locked` };
        if (!fromPos.allowedTypes.includes(occ.type) || fromPos.maxWeight < occ.weight) {
          return { ok: false, reason: `${occupant} cannot swap into ${from}` };
        }
      }
    }
    return { ok: true };
  },

  place: (uldId, positionId) => {
    const check = get().canPlace(uldId, positionId);
    if (!check.ok) return check;
    set((s) => {
      const next = { ...s.assignment };
      const from = positionOf(next, uldId);
      const occupant = next[positionId];
      if (from) next[from] = occupant && occupant !== uldId ? occupant : null;
      next[positionId] = uldId;
      return { assignment: next, selectedUldId: null };
    });
    return { ok: true };
  },

  unassign: (positionId) =>
    set((s) =>
      s.locked[positionId]
        ? s
        : { assignment: { ...s.assignment, [positionId]: null }, selectedUldId: null },
    ),

  toggleLock: (positionId) =>
    set((s) => {
      if (!s.assignment[positionId]) return s;
      const locked = { ...s.locked };
      if (locked[positionId]) delete locked[positionId];
      else locked[positionId] = true;
      return { locked };
    }),

  optimize: async () => {
    const { flight, assignment, locked } = get();
    set({ solving: true, selectedUldId: null });
    const lockedAssignment: Assignment = Object.fromEntries(
      Object.keys(locked).map((p) => [p, assignment[p]]),
    );
    let result: SolveResult;
    try {
      result = await solve({
        ulds: flight.ulds,
        positions: flight.positions,
        targetCg: flight.targetCg,
        cgTolerance: flight.cgTolerance,
        locked: lockedAssignment,
      });
    } catch (err) {
      result = {
        status: "error",
        assignment,
        cg: { long: 0, lateralMoment: 0 },
        deviation: 0,
        score: 0,
        solveMs: 0,
        message: err instanceof Error ? err.message : "Solver failed",
      };
    }
    if (result.status === "optimal" || result.status === "feasible") {
      const changed = flight.positions
        .map((p) => p.id)
        .filter((id) => assignment[id] !== result.assignment[id]);
      set({ assignment: result.assignment, recentlyChanged: changed });
    }
    set({ solving: false, lastSolve: result });
    return result;
  },

  reset: () =>
    set((s) => ({
      assignment: emptyAssignment(s.flight),
      locked: {},
      selectedUldId: null,
      lastSolve: null,
      recentlyChanged: [],
    })),

  clearRecent: () => set({ recentlyChanged: [] }),
}));

// ---- selectors -------------------------------------------------------------

export const selectUnassigned = (s: LoadState): Uld[] => {
  const used = new Set(Object.values(s.assignment).filter(Boolean));
  return s.flight.ulds.filter((u) => !used.has(u.id));
};

export const selectPositionById =
  (id: string) =>
  (s: LoadState): Position | undefined =>
    s.flight.positions.find((p) => p.id === id);

export const selectUldById =
  (id: string | null) =>
  (s: LoadState): Uld | undefined =>
    id ? s.flight.ulds.find((u) => u.id === id) : undefined;

/** Position id the given ULD currently occupies, or null when it is in the tray. */
export const selectPositionOfUld =
  (uldId: string | null) =>
  (s: LoadState): string | null =>
    uldId ? positionOf(s.assignment, uldId) : null;
