import { useDroppable } from "@dnd-kit/core";
import type { MouseEvent } from "react";
import { ArrowDownToLine, Lock, LockOpen, X } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { selectPositionOfUld, selectUldById, selectUnassigned, useLoadStore } from "@/store/useLoadStore";
import { STRIP_H } from "@/components/CgStrip";
import UldChip from "@/components/UldChip";
import { useIsDesktop } from "@/components/useMediaQuery";

const SCROLLBAR =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line";

/** Sticky offset for the desktop panel: the CG strip plus the page gap. */
const STICKY_TOP = STRIP_H + 16;

const iconBtn =
  "flex shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink " +
  "transition-colors duration-150 hover:border-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade " +
  "disabled:cursor-not-allowed disabled:opacity-40";

/** Shown in place of the list once every ULD is on board. */
function LoadSummary() {
  const flight = useLoadStore((s) => s.flight);
  const assignment = useLoadStore((s) => s.assignment);
  const lockedCount = useLoadStore((s) => Object.keys(s.locked).length);
  const lastSolve = useLoadStore((s) => s.lastSolve);

  const rows = useMemo(() => {
    const weightOf = new Map(flight.ulds.map((u) => [u.id, u.weight]));
    let total = 0;
    let left = 0;
    let right = 0;
    for (const p of flight.positions) {
      const w = weightOf.get(assignment[p.id] ?? "") ?? 0;
      total += w;
      if (p.lateral < 0) left += w;
      if (p.lateral > 0) right += w;
    }
    const kg = (n: number) => `${n.toLocaleString()} kg`;
    return [
      ["ULDs", `${flight.ulds.length} · ${kg(total)}`],
      ["Left / right", `${kg(left)} / ${kg(right)}`],
      ["Locked", `${lockedCount}`],
      [
        "Last solve",
        lastSolve ? `${Math.round(lastSolve.solveMs).toLocaleString()} ms · ${lastSolve.status}` : "by hand",
      ],
    ] as const;
  }, [flight, assignment, lockedCount, lastSolve]);

  return (
    <dl className="px-3 py-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line/70 py-2 last:border-b-0">
          <dt className="text-[11px] leading-none tracking-wide text-muted uppercase">{k}</dt>
          <dd className="tabular text-xs leading-none">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Unassigned ULDs. Desktop: a sticky bordered card with a vertical list.
 * Mobile: a strip pinned to the bottom of the viewport with a horizontal chip
 * row. The whole panel is the "tray" drop target for unloading a tile.
 * The header doubles as the selection context (no extra row, no layout shift).
 */
export default function UldPanel() {
  const desktop = useIsDesktop();
  const unassigned = useLoadStore(useShallow(selectUnassigned));
  const selectedUldId = useLoadStore((s) => s.selectedUldId);
  const selectedUld = useLoadStore(selectUldById(selectedUldId));
  const selectedFrom = useLoadStore(selectPositionOfUld(selectedUldId));
  const locked = useLoadStore((s) => (selectedFrom ? Boolean(s.locked[selectedFrom]) : false));
  const unassign = useLoadStore((s) => s.unassign);
  const toggleLock = useLoadStore((s) => s.toggleLock);
  const select = useLoadStore((s) => s.select);
  const { setNodeRef, isOver, active } = useDroppable({ id: "tray" });

  const total = unassigned.reduce((sum, u) => sum + u.weight, 0);
  const flight = useLoadStore((s) => s.flight);
  const loadedCount = flight.ulds.length - unassigned.length;
  const loadedKg = flight.ulds.reduce((sum, u) => sum + u.weight, 0) - total;
  const draggingFromTile = Boolean(active && (active.data.current as { from?: string | null } | undefined)?.from);
  const dropLook = isOver && draggingFromTile ? "bg-jade-soft" : "";
  const dropRing = draggingFromTile ? " outline-2 -outline-offset-2 outline-dashed outline-jade" : "";

  const onBackgroundClick = (e: MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget && selectedFrom && !locked) unassign(selectedFrom);
  };

  const size = desktop ? " size-8" : " size-10";
  const actions = selectedUld ? (
    selectedFrom ? (
      <>
        <button
          type="button"
          onClick={() => toggleLock(selectedFrom)}
          aria-label={locked ? `Unlock ${selectedFrom}` : `Lock ${selectedFrom}`}
          title={locked ? "Unlock" : "Lock for the solver"}
          className={iconBtn + size}
        >
          {locked ? <LockOpen size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => unassign(selectedFrom)}
          aria-label={`Unload ${selectedUld.id}`}
          title="Unload"
          className={iconBtn + size}
        >
          <ArrowDownToLine size={14} aria-hidden="true" />
        </button>
      </>
    ) : (
      <button type="button" onClick={() => select(null)} aria-label="Cancel selection" title="Cancel" className={iconBtn + size}>
        <X size={14} aria-hidden="true" />
      </button>
    )
  ) : null;

  // Header context: the selection when there is one, else the tray totals.
  const context = selectedUld ? (
    <span className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap" aria-live="polite">
      <span className="text-[13px] font-semibold">{selectedUld.id}</span>
      <span className="truncate text-xs text-muted">
        {selectedFrom ? `in ${selectedFrom} · tap a position to move` : "tap a position to load"}
      </span>
    </span>
  ) : (
    <span className="flex items-baseline gap-2 whitespace-nowrap">
      <h2 className="text-[13px] font-semibold">Unassigned</h2>
      <span className="tabular text-xs text-muted">
        {unassigned.length} · {total.toLocaleString()} kg
      </span>
    </span>
  );

  if (!desktop) {
    return (
      <section
        ref={setNodeRef}
        aria-label="Unassigned ULDs"
        onClick={onBackgroundClick}
        className={"fixed inset-x-0 bottom-0 z-30 flex h-14 items-center gap-2 border-t border-line bg-surface pl-3 " + dropLook + dropRing}
      >
        <div className="flex shrink-0 flex-col gap-0.5 leading-none" aria-label={`Loaded ${loadedCount} of ${flight.ulds.length}, ${loadedKg.toLocaleString()} kg`}>
          <span className="tabular text-[13px] font-semibold">
            {loadedCount}/{flight.ulds.length}
          </span>
          <span className="tabular text-[10px] whitespace-nowrap text-muted">{loadedKg.toLocaleString()} kg</span>
        </div>
        {actions}
        <div
          onClick={onBackgroundClick}
          className="flex h-full flex-1 items-center gap-2 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {unassigned.length === 0 ? (
            <span className="text-[13px] text-muted">All ULDs loaded</span>
          ) : (
            unassigned.map((u) => <UldChip key={u.id} uld={u} variant="compact" />)
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={setNodeRef}
      aria-label="Unassigned ULDs"
      onClick={onBackgroundClick}
      className={
        "sticky flex h-[calc(100dvh-156px)] min-w-0 flex-col self-start overflow-hidden rounded-lg border border-line bg-surface transition-colors duration-150 " +
        dropLook +
        dropRing
      }
      style={{ top: STICKY_TOP }}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line pr-2 pl-3">
        {context}
        {actions && <span className="ml-auto flex items-center gap-1.5">{actions}</span>}
      </div>
      <div onClick={onBackgroundClick} className={"min-h-0 flex-1 overflow-y-auto " + SCROLLBAR} style={{ scrollbarGutter: "stable" }}>
        {unassigned.length === 0 ? <LoadSummary /> : unassigned.map((u) => <UldChip key={u.id} uld={u} variant="row" />)}
      </div>
    </section>
  );
}
