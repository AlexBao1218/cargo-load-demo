import { useDroppable } from "@dnd-kit/core";
import type { MouseEvent } from "react";
import { ArrowDownToLine, Lock, LockOpen, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { selectPositionOfUld, selectUldById, selectUnassigned, useLoadStore } from "@/store/useLoadStore";
import { STRIP_H } from "@/components/CgStrip";
import UldChip from "@/components/UldChip";
import { useIsDesktop } from "@/components/useMediaQuery";

const SCROLLBAR =
  "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line-soft [&::-webkit-scrollbar-thumb]:border-2 " +
  "[&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-surface";

/** Sticky offset for the desktop panel: the CG strip plus the page gap. */
const STICKY_TOP = STRIP_H + 16;

const actionBtnBase =
  "flex items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-[13px] text-ink " +
  "transition-colors duration-150 hover:border-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade " +
  "disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Unassigned ULDs. Desktop: a sticky bordered card with a vertical list.
 * Mobile: a strip pinned to the bottom of the viewport with a horizontal chip
 * row. The whole panel is the "tray" drop target for unloading a tile.
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
  const draggingFromTile = Boolean(active && (active.data.current as { from?: string | null } | undefined)?.from);
  const dropLook = isOver && draggingFromTile ? "bg-jade-soft" : "";
  const dropRing = draggingFromTile ? " outline-2 -outline-offset-2 outline-dashed outline-jade" : "";

  const hint = selectedUld
    ? selectedFrom
      ? `${selectedUld.id} in ${selectedFrom} · tap a highlighted position to move it`
      : `${selectedUld.id} · tap a highlighted position to load it`
    : null;

  const onBackgroundClick = (e: MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget && selectedFrom && !locked) unassign(selectedFrom);
  };

  const actionBtn = actionBtnBase + (desktop ? " h-8" : " h-10");

  const placedActions = selectedUld && selectedFrom && (
    <>
      <button type="button" onClick={() => toggleLock(selectedFrom)} className={actionBtn}>
        {locked ? <LockOpen size={13} aria-hidden="true" /> : <Lock size={13} aria-hidden="true" />}
        {locked ? "Unlock" : "Lock"}
      </button>
      <button type="button" disabled={locked} onClick={() => unassign(selectedFrom)} className={actionBtn}>
        <ArrowDownToLine size={13} aria-hidden="true" />
        Unload
      </button>
    </>
  );

  const cancelAction = selectedUld && !selectedFrom && (
    <button
      type="button"
      onClick={() => select(null)}
      aria-label="Cancel selection"
      className={actionBtn + (desktop ? " w-8" : " w-10") + " px-0"}
    >
      <X size={14} aria-hidden="true" />
    </button>
  );

  if (!desktop) {
    return (
      <section
        ref={setNodeRef}
        aria-label="Unassigned ULDs"
        onClick={onBackgroundClick}
        className={"fixed inset-x-0 bottom-0 z-30 flex h-14 items-center gap-2 border-t border-line bg-surface pl-3 " + dropLook + dropRing}
      >
        <div className="flex shrink-0 flex-col leading-none">
          <span className="tabular text-base font-semibold">{unassigned.length}</span>
          <span className="text-[10px] tracking-wide text-muted uppercase">left</span>
        </div>
        {placedActions}
        {cancelAction}
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
      className={"sticky flex h-[calc(100dvh-172px)] min-w-0 flex-col self-start overflow-hidden rounded-lg border border-line bg-surface transition-colors duration-150 " + dropLook + dropRing}
      style={{ top: STICKY_TOP }}
    >
      <div className="flex h-10 items-center gap-2 border-b border-line px-3">
        <h2 className="text-[13px] font-semibold">Unassigned</h2>
        <span className="tabular text-xs whitespace-nowrap text-muted">
          {unassigned.length} · {total.toLocaleString()} kg
        </span>
        {cancelAction && <span className="ml-auto flex items-center">{cancelAction}</span>}
      </div>
      {hint && (
        <div className="flex items-center gap-2 border-b border-line bg-bg py-1.5 pr-2 pl-3" aria-live="polite">
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-muted">{hint}</p>
          {placedActions && <span className="flex shrink-0 items-center gap-1.5">{placedActions}</span>}
        </div>
      )}
      <div
        onClick={onBackgroundClick}
        className={"min-h-0 flex-1 overflow-y-auto " + SCROLLBAR}
        style={{ scrollbarGutter: "stable" }}
      >
        {unassigned.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-muted">All ULDs loaded</p>
        ) : (
          unassigned.map((u) => <UldChip key={u.id} uld={u} variant="row" />)
        )}
      </div>
    </section>
  );
}
