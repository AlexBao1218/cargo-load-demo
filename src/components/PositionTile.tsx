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
    "relative flex h-full w-full flex-col rounded-md border text-left transition-colors duration-150 " +
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-jade select-none";
  const look = filled
    ? "border-jade bg-jade text-white"
    : "border-line bg-surface text-muted";
  let ring = "";
  if (isOver) ring = check?.ok === false ? " ring-2 ring-danger ring-offset-1" : " ring-2 ring-jade ring-offset-1";
  else if (validTarget) ring = " ring-2 ring-jade ring-offset-1";
  else if (isSelectedHere) ring = " ring-2 ring-jade-deep ring-offset-1";
  else if (recentlyChanged) ring = " ring-2 ring-jade ring-offset-1";
  const dim = invalidTarget && !isOver ? " opacity-40" : "";
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
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className={base + " " + look + ring + dim + dragging + cursor + " px-1.5 pt-1 pb-1.5"}
        style={{
          touchAction: "manipulation",
          ...(recentlyChanged
            ? { animation: "tileIn 400ms ease-out both", animationDelay: `${changedIndex * STAGGER_MS}ms` }
            : {}),
        }}
      >
        <div className="flex items-center justify-between leading-none">
          <span className="text-[11px] font-semibold tracking-wide">{id}</span>
          {locked && <Lock size={12} strokeWidth={2.25} aria-hidden="true" />}
        </div>
        {filled ? (
          <div className="mt-0.5 flex-1 leading-tight">
            <div className="truncate text-xs font-medium">{uld!.id}</div>
            <div className="tabular text-[11px] opacity-90">{uld!.weight.toLocaleString()} kg</div>
          </div>
        ) : (
          <div className="mt-0.5 flex-1 leading-tight">
            <div className="tabular text-[10px] opacity-80">max {position.maxWeight.toLocaleString()}</div>
            <div className="text-[10px] opacity-70">{position.allowedTypes.join("/")}</div>
          </div>
        )}
        <div className={"h-[3px] w-full overflow-hidden rounded-full " + (filled ? "bg-white/25" : "bg-line/60")}>
          <div
            className={"h-full rounded-full transition-[width] duration-150 " + (filled ? "bg-white/70" : "bg-transparent")}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </button>
      {filled && (
        <button
          type="button"
          aria-label={locked ? `Unlock ${id}` : `Lock ${id}`}
          aria-pressed={locked}
          title={locked ? "Unlock position" : "Lock position (freeze for the solver)"}
          onClick={(e) => {
            e.stopPropagation();
            toggleLock(id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className={
            "absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-150 " +
            "focus-visible:outline-2 focus-visible:outline-jade " +
            (locked
              ? "border-ink bg-ink text-white"
              : "border-line bg-surface text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-ink [@media(hover:none)]:opacity-100")
          }
          style={{ touchAction: "manipulation" }}
        >
          {locked ? <Lock size={12} strokeWidth={2.25} aria-hidden="true" /> : <LockOpen size={12} strokeWidth={2} aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}
