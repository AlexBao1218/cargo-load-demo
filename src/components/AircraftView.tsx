import { useEffect, useRef, useState } from "react";
import { useLoadStore } from "@/store/useLoadStore";
import { CANVAS, tileXY } from "@/components/layout";
import Fuselage from "@/components/Fuselage";
import PositionTile from "@/components/PositionTile";
import SectionTabs from "@/components/SectionTabs";

const RECENT_MS = 1600;

export default function AircraftView() {
  const flight = useLoadStore((s) => s.flight);
  const select = useLoadStore((s) => s.select);
  const selectedUldId = useLoadStore((s) => s.selectedUldId);
  const hasRecent = useLoadStore((s) => s.recentlyChanged.length > 0);
  const clearRecent = useLoadStore((s) => s.clearRecent);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: true });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () =>
      setEdges({
        left: el.scrollLeft > 4,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      });
    // Vertical wheel over the fuselage scrolls it horizontally; at either end the
    // event passes through so the page keeps scrolling normally.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const next = el.scrollLeft + e.deltaY;
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max)) return;
      e.preventDefault();
      el.scrollLeft = Math.max(0, Math.min(max, next));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      el.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!hasRecent) return;
    const t = window.setTimeout(clearRecent, RECENT_MS);
    return () => window.clearTimeout(t);
  }, [hasRecent, clearRecent]);

  return (
    <section aria-label="Aircraft positions" className="relative">
      <SectionTabs scrollRef={scrollRef} />
      <div className="relative">
        <div
          ref={scrollRef}
          className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin]"
          style={{ scrollSnapType: "x proximity" }}
        >
          <div
            className="relative"
            style={{ width: CANVAS.width, height: CANVAS.height }}
            onClick={(e) => {
              if (e.target === e.currentTarget && selectedUldId) select(null);
            }}
          >
            <Fuselage />
            {flight.positions.map((p) => {
              const { x, y } = tileXY(p);
              return (
                <div
                  key={p.id}
                  data-section={p.section}
                  data-position={p.id}
                  className="absolute"
                  style={{ left: x, top: y, scrollSnapAlign: "center" }}
                >
                  <PositionTile position={p} />
                </div>
              );
            })}
          </div>
        </div>
        {edges.left && (
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-bg to-transparent" />
        )}
        {edges.right && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-bg to-transparent" />
        )}
      </div>
    </section>
  );
}
