import { useDraggable } from "@dnd-kit/core";
import type { Uld } from "@/domain/types";
import { useLoadStore } from "@/store/useLoadStore";

interface Props {
  uld: Uld;
}

/** Presentational chip body, shared by the tray chip and the drag overlay. */
export function ChipBody({ uld, selected = false, ghost = false }: { uld: Uld; selected?: boolean; ghost?: boolean }) {
  return (
    <span
      className={
        "flex h-11 items-center gap-2 rounded-md border px-3 " +
        (ghost
          ? "border-jade bg-surface text-ink"
          : selected
            ? "border-jade bg-surface text-ink ring-1 ring-jade"
            : "border-line bg-surface text-ink")
      }
    >
      <span className="text-sm font-medium whitespace-nowrap">{uld.id}</span>
      <span className="rounded-sm border border-line px-1 py-px text-[10px] leading-none tracking-wide text-muted uppercase">
        {uld.type}
      </span>
      <span className="tabular text-xs whitespace-nowrap text-muted">{uld.weight.toLocaleString()} kg</span>
    </span>
  );
}

export default function UldChip({ uld }: Props) {
  const selected = useLoadStore((s) => s.selectedUldId === uld.id);
  const select = useLoadStore((s) => s.select);
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `uld:${uld.id}`,
    data: { uldId: uld.id, from: null },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      aria-pressed={selected}
      aria-label={`${uld.id}, ${uld.type}, ${uld.weight.toLocaleString()} kg${selected ? ", selected" : ""}`}
      onClick={() => select(selected ? null : uld.id)}
      className={
        "shrink-0 rounded-md text-left transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade " +
        (isDragging ? "opacity-30" : "cursor-grab")
      }
      style={{ touchAction: "manipulation" }}
    >
      <ChipBody uld={uld} selected={selected} />
    </button>
  );
}
