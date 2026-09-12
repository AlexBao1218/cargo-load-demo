import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Lock, LockOpen } from "lucide-react";
import { useCallback } from "react";
import type { Position } from "@/domain/types";
import { useLoadStore } from "@/store/useLoadStore";
import { useToast } from "@/store/useToast";
import { TILE } from "@/components/layout";

interface Props {
  position: Position;
}

export interface TileDragData {
  uldId: string;
  from: string | null;
}

const STAGGER_MS = 40;

export default function PositionTile({ position }: Props) {
  const id = position.id;
  const uldId = useLoadStore((s) => s.assignment[id]);
  const uld = useLoadStore((s) => (uldId ? s.flight.ulds.find((u) => u.id === uldId) : undefined));
  const locked = useLoadStore((s) => Boolean(s.locked[id]));
  const selectedUldId = useLoadStore((s) => s.selectedUldId);
  const changedIndex = useLoadStore((s) => s.recentlyChanged.indexOf(id));
  const canPlace = useLoadStore((s) => s.canPlace);
  const place = useLoadStore((s) => s.place);
  const select = useLoadStore((s) => s.select);
  const toggleLock = useLoadStore((s) => s.toggleLock);
  const push = useToast((s) => s.push);

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });
  const dragData: TileDragData = { uldId: uldId ?? "", from: id };
  const {
    setNodeRef: setDragRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({ id: `pos:${id}`, data: dragData, disabled: !uldId || locked });

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      setDropRef(node);
      setDragRef(node);
    },
    [setDropRef, setDragRef],
  );

  const filled = Boolean(uldId && uld);
  const isSelectedHere = filled && selectedUldId === uldId;
  const check = selectedUldId && !isSelectedHere ? canPlace(selectedUldId, id) : null;
  const validTarget = check?.ok === true;
  const invalidTarget = check?.ok === false;
  const recentlyChanged = changedIndex >= 0;

  const onClick = () => {
    if (selectedUldId) {
      if (isSelectedHere) {
        select(null);
        return;
      }
      const r = place(selectedUldId, id);
      if (!r.ok) push(r.reason, "error");
      return;
    }
    if (uldId) select(uldId);
  };

  const onDoubleClick = () => {
    if (uldId) toggleLock(id);
  };

  const ratio = uld ? Math.min(1, uld.weight / position.maxWeight) : 0;

  const base =
    "relative flex h-full w-full flex-col rounded-md border px-1.5 pt-1 pb-1 text-left transition-colors duration-150 select-none " +
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-jade";
  const look = filled
    ? locked
      ? "border-jade-deep bg-jade-deep text-white"
      : "border-jade bg-jade text-white"
    : "border-line bg-surface text-muted";
  let ring = "";
  if (isOver) ring = check?.ok === false ? " ring-2 ring-danger ring-offset-1" : " ring-2 ring-jade ring-offset-1";
  else if (validTarget) ring = " ring-2 ring-jade ring-offset-1";
  else if (isSelectedHere) ring = " ring-2 ring-ink ring-offset-1";
  const dim = invalidTarget && !isOver ? " opacity-35" : "";
  const dragging = isDragging ? " opacity-30" : "";
  const cursor = locked ? " cursor-default" : filled ? " cursor-grab" : selectedUldId ? " cursor-pointer" : "";

  const label = filled
    ? `${id}: ${uld!.id}, ${uld!.weight.toLocaleString()} kg${locked ? ", locked" : ""}`
    : `${id}: empty, max ${position.maxWeight.toLocaleString()} kg`;

  return (
    <div className="group relative" style={{ width: TILE.w, height: TILE.h }}>
      <button
        ref={setRef}
        type="button"
        aria-label={label}
        {...attributes}
        {...listeners}
        aria-pressed={isSelectedHere || undefined}
        title={filled ? (locked ? "Double-click to unlock" : "Double-click to lock for the solver") : undefined}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className={base + " " + look + ring + dim + dragging + cursor}
        style={{
          touchAction: "manipulation",
          ...(recentlyChanged
            ? { animation: "tileIn 400ms ease-out both, settle 600ms ease-out both", animationDelay: `${changedIndex * STAGGER_MS}ms` }
            : {}),
        }}
      >
        <div className="flex items-center justify-between leading-none">
          <span className={"text-[11px] font-semibold " + (filled ? "text-white" : "text-muted")}>{id}</span>
          {!filled && position.allowedTypes.length === 1 && (
            <span className="text-[10px] text-muted">{position.allowedTypes[0]} only</span>
          )}
          {filled &&
            (locked ? (
              <Lock size={10} strokeWidth={2.5} className="text-white/80" aria-hidden="true" />
            ) : (
              <LockOpen
                size={10}
                strokeWidth={2.5}
                className="text-white/60 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                aria-hidden="true"
              />
            ))}
        </div>
        {filled ? (
          <>
            <div className="mt-0.5 flex flex-1 items-baseline justify-between gap-1 leading-none">
              <span className="truncate text-xs font-medium">{uld!.id}</span>
              <span className="tabular shrink-0 text-[11px] text-white/85">{uld!.weight.toLocaleString()}</span>
            </div>
            <div className="mt-auto h-[3px] w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white/80 transition-[width] duration-150" style={{ width: `${ratio * 100}%` }} />
            </div>
          </>
        ) : (
          <div className="tabular mt-0.5 flex-1 text-[11px] leading-none whitespace-nowrap text-muted">
            {position.maxWeight.toLocaleString()} kg
          </div>
        )}
      </button>
    </div>
  );
}
