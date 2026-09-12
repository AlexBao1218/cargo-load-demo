import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLoadStore } from "@/store/useLoadStore";
import { CANVAS, FUSELAGE, tileXY } from "@/components/layout";
import Fuselage from "@/components/Fuselage";
import PositionTile from "@/components/PositionTile";
import SectionTabs from "@/components/SectionTabs";

const RECENT_MS = 1600;

/**
 * The fuselage (300 px) plus a small margin must always fit; the wings may be
 * clipped by the card on narrow screens. Below this width the canvas is scaled.
 */
const FIT_WIDTH = FUSELAGE.right - FUSELAGE.left + 24;

const SCROLLBAR =
  "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line-soft [&::-webkit-scrollbar-thumb]:border-2 " +
  "[&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-surface";

/**
 * Bordered card holding the vertical, nose-at-top aircraft. The body is a
 * fixed-height scroll container so the scroll boundary is obvious; section tabs
 * live in the card header and scroll the body.
 *
 * Heights: the body fills the viewport below header + CG strip (desktop) or
 * above the bottom ULD strip (mobile) so the page itself never needs to scroll
 * at common sizes. `UldPanel` mirrors the desktop height.
 */
export default function AircraftCard() {
  const flight = useLoadStore((s) => s.flight);
  const select = useLoadStore((s) => s.select);
  const selectedUldId = useLoadStore((s) => s.selectedUldId);
  const hasRecent = useLoadStore((s) => s.recentlyChanged.length > 0);
  const clearRecent = useLoadStore((s) => s.clearRecent);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: true });
  const [scrolled, setScrolled] = useState(false);
  const [scale, setScale] = useState(1);
  const [prevFlightId, setPrevFlightId] = useState(flight.id);

  // Scenario changed: the hint comes back (state adjusted during render, no extra effect).
  if (prevFlightId !== flight.id) {
    setPrevFlightId(flight.id);
    setScrolled(false);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setEdges({
        top: el.scrollTop > 4,
        bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 4,
      });
      if (el.scrollTop > 24) setScrolled(true);
      setScale(Math.min(1, el.clientWidth / FIT_WIDTH));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!hasRecent) return;
    const t = window.setTimeout(clearRecent, RECENT_MS);
    return () => window.clearTimeout(t);
  }, [hasRecent, clearRecent]);

  // Back to the nose whenever the scenario changes.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [flight.id]);

  return (
    <section aria-label="Aircraft positions" className="flex min-w-0 flex-col rounded-lg border border-line bg-surface">
      <div className="flex h-10 items-center justify-between gap-2 border-b border-line pr-3 pl-1">
        <SectionTabs scrollRef={scrollRef} />
        <span
          aria-hidden="true"
          className={
            "flex shrink-0 items-center gap-1 text-[11px] whitespace-nowrap text-muted transition-opacity duration-300 " +
            (scrolled ? "opacity-0" : "opacity-100")
          }
        >
          Scroll for tail
          <ArrowDown size={12} style={{ animation: "nudgeDown 1.8s ease-in-out infinite" }} />
        </span>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className={"h-[max(46vh,calc(100dvh-300px))] overflow-x-hidden overflow-y-auto overscroll-y-contain md:h-[calc(100dvh-214px)] " + SCROLLBAR}
          style={{ scrollSnapType: "y proximity", scrollbarGutter: "stable" }}
        >
          <div
            className="flex justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget && selectedUldId) select(null);
            }}
          >
            <div className="shrink-0" style={{ width: CANVAS.width * scale, height: CANVAS.height * scale }}>
              <div
                className="relative"
                style={{
                  width: CANVAS.width,
                  height: CANVAS.height,
                  transform: scale < 1 ? `scale(${scale})` : undefined,
                  transformOrigin: "top left",
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget && selectedUldId) select(null);
                }}
              >
                <Fuselage />
                {/* Snap anchors so the nose (scrollTop 0) and the tail are always resting points. */}
                <div aria-hidden="true" className="absolute top-0 left-0 h-px w-px" style={{ scrollSnapAlign: "start" }} />
                <div aria-hidden="true" className="absolute bottom-0 left-0 h-px w-px" style={{ scrollSnapAlign: "end" }} />
                {flight.positions.map((p, i) => {
                  const { x, y } = tileXY(p);
                  const sectionStart = i > 0 && flight.positions[i - 1].section !== p.section;
                  return (
                    <div
                      key={p.id}
                      data-section={p.section}
                      data-position={p.id}
                      className="absolute"
                      style={{
                        left: x,
                        top: y,
                        ...(sectionStart ? { scrollSnapAlign: "start", scrollMarginTop: 16 } : {}),
                      }}
                    >
                      <PositionTile position={p} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div
          aria-hidden="true"
          className={
            "pointer-events-none absolute top-0 right-2 left-0 h-8 bg-linear-to-b from-surface to-transparent transition-opacity duration-200 " +
            (edges.top ? "opacity-100" : "opacity-0")
          }
        />
        <div
          aria-hidden="true"
          className={
            "pointer-events-none absolute right-2 bottom-0 left-0 h-10 rounded-bl-lg bg-linear-to-t from-surface to-transparent transition-opacity duration-200 " +
            (edges.bottom ? "opacity-100" : "opacity-0")
          }
        />
      </div>
    </section>
  );
}
