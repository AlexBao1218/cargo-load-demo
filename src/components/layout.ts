import type { Position, Section } from "@/domain/types";

/** Pixel canvas for the top-down fuselage; nose on the left, tail on the right. */
export const CANVAS = { width: 1600, height: 240 } as const;
export const TILE = { w: 64, h: 56 } as const;

/** Top y of a tile for lateral L (-1) / centreline (0) / R (+1). */
const ROW_Y: Record<-1 | 0 | 1, number> = { [-1]: 52, [0]: 92, [1]: 132 };

const ARM_MIN = 7.7;
const ARM_MAX = 65.0;
const X_MIN = 70;
const X_MAX = CANVAS.width - 90;

/** Map an arm (metres) to the x pixel of a tile's left edge. */
export function armToX(arm: number): number {
  return Math.round(X_MIN + ((arm - ARM_MIN) / (ARM_MAX - ARM_MIN)) * (X_MAX - X_MIN - TILE.w));
}

export function tileXY(p: Position): { x: number; y: number } {
  return { x: armToX(p.arm), y: ROW_Y[p.lateral] };
}

export const SECTIONS: ReadonlyArray<{ id: Section; label: string }> = [
  { id: "nose", label: "Nose" },
  { id: "fwd", label: "Fwd" },
  { id: "mid", label: "Mid" },
  { id: "aft", label: "Aft" },
  { id: "tail", label: "Tail" },
];
