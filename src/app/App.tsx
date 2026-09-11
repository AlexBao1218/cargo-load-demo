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
import AircraftView from "@/components/AircraftView";
import HowItWorksDrawer from "@/components/HowItWorksDrawer";
import StatusBar from "@/components/StatusBar";
import Toasts from "@/components/Toast";
import TopBar, { CREDIT } from "@/components/TopBar";
import { ChipBody } from "@/components/UldChip";
import UldTray from "@/components/UldTray";
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
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-4 md:px-6">
          <AircraftView />
          <UldTray />
          <p className="mt-auto pt-2 text-xs text-muted md:hidden">{CREDIT}</p>
        </main>
        <StatusBar />
      </div>
      <DragOverlay dropAnimation={null}>
        {draggingUld ? (
          <div className="w-max cursor-grabbing">
            <ChipBody uld={draggingUld} ghost />
          </div>
        ) : null}
      </DragOverlay>
      <HowItWorksDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Toasts />
    </DndContext>
  );
}
