import { useDraggable } from "@dnd-kit/core";
import type { Uld } from "@/domain/types";
import { useLoadStore } from "@/store/useLoadStore";

export type ChipVariant = "row" | "compact";

interface BodyProps {
  uld: Uld;
  variant?: ChipVariant;
  selected?: boolean;
  ghost?: boolean;
}

const TypeNote = ({ type }: { type: string }) => <span className="text-[11px] text-muted">{type}</span>;

/**
 * Presentational chip body, shared by the panel entries and the drag overlay.
 * `row` is the full-width desktop list entry; `compact` is the mobile strip chip.
 */
export function ChipBody({ uld, variant = "row", selected = false, ghost = false }: BodyProps) {
  if (variant === "compact") {
    return (
      <span
        className={
          "flex h-10 items-center gap-2 rounded-md border px-2.5 " +
          (ghost ? "border-jade bg-surface" : selected ? "border-jade bg-jade-soft" : "border-line bg-surface")
        }
      >
        <span className="text-[13px] font-medium whitespace-nowrap text-ink">{uld.id}</span>
        <TypeNote type={uld.type} />
        <span className="tabular text-xs whitespace-nowrap text-muted">{uld.weight.toLocaleString()} kg</span>
      </span>
    );
  }
  return (
    <span
      className={
        "flex h-11 w-full items-center gap-2 px-3 " +
        (ghost
          ? "w-64 rounded-md border border-jade bg-surface"
          : selected
            ? "bg-jade-soft"
            : "bg-surface hover:bg-bg")
      }
    >
      <span className="text-[13px] font-medium whitespace-nowrap text-ink">{uld.id}</span>
      <TypeNote type={uld.type} />
      <span className="tabular ml-auto text-xs whitespace-nowrap text-muted">{uld.weight.toLocaleString()} kg</span>
    </span>
  );
}

interface Props {
  uld: Uld;
  variant?: ChipVariant;
}

export default function UldChip({ uld, variant = "row" }: Props) {
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
        "shrink-0 text-left transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-jade " +
        (variant === "row" ? "block w-full border-b border-line/70 last:border-b-0 " : "rounded-md ") +
        (isDragging ? "opacity-30" : "cursor-grab")
      }
      style={{ touchAction: "manipulation" }}
    >
      <ChipBody uld={uld} variant={variant} selected={selected} />
    </button>
  );
}
