import { useDroppable } from "@dnd-kit/core";
import { ArrowDownToLine, Lock, LockOpen } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { selectPositionOfUld, selectUldById, selectUnassigned, useLoadStore } from "@/store/useLoadStore";
import UldChip from "@/components/UldChip";

export default function UldTray() {
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

  const hint = selectedUld
    ? selectedFrom
      ? `${selectedUld.id} selected in ${selectedFrom} — tap a highlighted position to move it`
      : `${selectedUld.id} selected — tap a highlighted position to load it`
    : null;

  return (
    <section aria-label="ULD tray" className="flex flex-col gap-2">
      <div className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold">Unassigned</h2>
        <span className="tabular text-sm text-muted">
          {unassigned.length} ULD{unassigned.length === 1 ? "" : "s"} · {total.toLocaleString()} kg
        </span>
        {hint && (
          <span className="text-xs text-muted" aria-live="polite">
            {hint}
          </span>
        )}
        {selectedUld && selectedFrom && (
          <span className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleLock(selectedFrom)}
              className="flex h-11 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-sm text-ink transition-colors duration-150 hover:border-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade"
            >
              {locked ? <LockOpen size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
              {locked ? "Unlock" : "Lock"}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => unassign(selectedFrom)}
              className="flex h-11 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-sm text-ink transition-colors duration-150 hover:border-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowDownToLine size={14} aria-hidden="true" />
              Unload to tray
            </button>
          </span>
        )}
        {selectedUld && !selectedFrom && (
          <button
            type="button"
            onClick={() => select(null)}
            className="ml-auto flex h-11 items-center rounded-md px-3 text-sm text-muted transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade"
          >
            Cancel
          </button>
        )}
      </div>
      <div
        ref={setNodeRef}
        onClick={(e) => {
          if (e.target === e.currentTarget && selectedFrom && !locked) unassign(selectedFrom);
        }}
        className={
          "flex min-h-14 items-center gap-2 overflow-x-auto rounded-md border px-2 py-1 transition-colors duration-150 [scrollbar-width:thin] " +
          (isOver && draggingFromTile
            ? "border-jade bg-jade-soft"
            : draggingFromTile
              ? "border-dashed border-jade"
              : "border-transparent")
        }
      >
        {unassigned.length === 0 ? (
          <span className="px-1 text-sm text-muted">All ULDs loaded</span>
        ) : (
          unassigned.map((u) => <UldChip key={u.id} uld={u} />)
        )}
      </div>
    </section>
  );
}
