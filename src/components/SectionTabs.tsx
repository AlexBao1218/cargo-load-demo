import { useEffect, useState, type RefObject } from "react";
import type { Section } from "@/domain/types";
import { SECTIONS, TILE } from "@/components/layout";

interface Props {
  scrollRef: RefObject<HTMLDivElement | null>;
}

const SETTLE_MS = 700;

/**
 * Five section buttons. Clicking scrolls the fuselage so the section's first
 * position sits in the middle of the viewport; the active tab otherwise follows
 * the section under the viewport centre (clamped to Nose / Tail at the edges).
 */
export default function SectionTabs({ scrollRef }: Props) {
  const [active, setActive] = useState<Section>("nose");

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let suppressUntil = 0;

    const update = () => {
      if (performance.now() < suppressUntil) return;
      const nodes = Array.from(el.querySelectorAll<HTMLElement>("[data-section]"));
      if (!nodes.length) return;
      const atStart = el.scrollLeft <= 4;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atStart) return setActive(SECTIONS[0].id);
      if (atEnd) return setActive(SECTIONS[SECTIONS.length - 1].id);
      const centre = el.scrollLeft + el.clientWidth / 2;
      let best: { id: Section; d: number } | null = null;
      for (const n of nodes) {
        const x = n.offsetLeft + TILE.w / 2;
        const d = Math.abs(x - centre);
        if (!best || d < best.d) best = { id: n.dataset.section as Section, d };
      }
      if (best) setActive(best.id);
    };

    const onTabScroll = (e: Event) => {
      const detail = (e as CustomEvent<{ id: Section }>).detail;
      suppressUntil = performance.now() + SETTLE_MS;
      setActive(detail.id);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    el.addEventListener("sectiontab", onTabScroll);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      el.removeEventListener("sectiontab", onTabScroll);
      ro.disconnect();
    };
  }, [scrollRef]);

  const go = (id: Section) => {
    const el = scrollRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(`[data-section="${id}"]`);
    if (!target) return;
    el.dispatchEvent(new CustomEvent("sectiontab", { detail: { id } }));
    const left = target.offsetLeft + TILE.w / 2 - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  };

  return (
    <div role="tablist" aria-label="Aircraft sections" className="flex gap-1 border-b border-line">
      {SECTIONS.map((s) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => go(s.id)}
            className={
              "relative flex h-11 min-w-11 items-center px-3 text-sm transition-colors duration-150 " +
              "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-jade " +
              (isActive ? "font-medium text-ink" : "text-muted hover:text-ink")
            }
          >
            {s.label}
            <span
              aria-hidden="true"
              className={"absolute inset-x-2 -bottom-px h-0.5 rounded-full " + (isActive ? "bg-jade" : "bg-transparent")}
            />
          </button>
        );
      })}
    </div>
  );
}
