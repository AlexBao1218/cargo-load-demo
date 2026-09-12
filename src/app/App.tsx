import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useEffect, useState } from "react";
import AircraftCard from "@/components/AircraftCard";
import CgStrip from "@/components/CgStrip";
import HowItWorksDrawer from "@/components/HowItWorksDrawer";
import TopBar from "@/components/TopBar";
import { ChipBody } from "@/components/UldChip";
import UldPanel from "@/components/UldPanel";
import { useIsDesktop } from "@/components/useMediaQuery";
import { selectUldById, useLoadStore } from "@/store/useLoadStore";
import { useToast } from "@/store/useToast";

interface DragData {
  uldId: string;
  from: string | null;
}

/** Prefer the droppable under the pointer; fall back to rectangle overlap. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

export default function App() {
  const desktop = useIsDesktop();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingUld = useLoadStore(selectUldById(draggingId));
  const place = useLoadStore((s) => s.place);
  const unassign = useLoadStore((s) => s.unassign);
  const select = useLoadStore((s) => s.select);
  const push = useToast((s) => s.push);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as DragData;
    setDraggingId(data.uldId);
    select(data.uldId);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const data = e.active.data.current as DragData;
    setDraggingId(null);
    select(null);
    if (!e.over) return;
    if (e.over.id === "tray") {
      if (data.from) unassign(data.from);
      return;
    }
    const r = place(data.uldId, String(e.over.id));
    if (!r.ok) push(r.reason, "error");
  };

  const onDragCancel = () => {
    setDraggingId(null);
    select(null);
  };

  useEffect(() => {
    const h = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        select(null);
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [select]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="flex min-h-full flex-col">
        <TopBar onHelp={() => setDrawerOpen(true)} />
        <CgStrip />
        <main className="mx-auto w-full max-w-5xl flex-1 px-3 pt-3 pb-[72px] md:px-6 md:pt-4 md:pb-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
            <AircraftCard />
            <UldPanel />
          </div>
        </main>
      </div>
      <DragOverlay dropAnimation={null}>
        {draggingUld ? (
          <div className="w-max cursor-grabbing">
            <ChipBody uld={draggingUld} variant={desktop ? "row" : "compact"} ghost />
          </div>
        ) : null}
      </DragOverlay>
      <HowItWorksDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </DndContext>
  );
}
