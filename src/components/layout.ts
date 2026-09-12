import type { Position, Section } from "@/domain/types";

/**
 * Pixel canvas for the top-down fuselage. VERTICAL: nose at the top, tail at
 * the bottom, like an airline seat map. The fuselage body occupies
 * x ∈ [FUSELAGE.left, FUSELAGE.right]; wing roots and tailplanes may extend
 * to the canvas edges and are clipped by the scroll card.
 */
export const CANVAS = { width: 480, height: 1400 } as const;
export const FUSELAGE = { left: 90, right: 390, centreX: 240 } as const;
export const TILE = { w: 96, h: 52 } as const;

/** Left x of a tile for lateral L (-1) / centreline (0) / R (+1). */
const COL_X: Record<-1 | 0 | 1, number> = { [-1]: 104, [0]: 192, [1]: 280 };

const ARM_MIN = 7.7;
const ARM_MAX = 65.0;
const Y_MIN = 110;
const Y_MAX = 1290;

/** Map an arm (metres, nose→tail) to the y pixel of a tile's top edge. */
export function armToY(arm: number): number {
  return Math.round(Y_MIN + ((arm - ARM_MIN) / (ARM_MAX - ARM_MIN)) * (Y_MAX - Y_MIN - TILE.h));
}

export function tileXY(p: Position): { x: number; y: number } {
  return { x: COL_X[p.lateral], y: armToY(p.arm) };
}

export const SECTIONS: ReadonlyArray<{ id: Section; label: string }> = [
  { id: "nose", label: "Nose" },
  { id: "fwd", label: "Fwd" },
  { id: "mid", label: "Mid" },
  { id: "aft", label: "Aft" },
  { id: "tail", label: "Tail" },
];
