import { useEffect, useState, type RefObject } from "react";
import type { Section } from "@/domain/types";
import { SECTIONS } from "@/components/layout";

interface Props {
  scrollRef: RefObject<HTMLDivElement | null>;
}

const SETTLE_MS = 700;

/** Top of `node` in the scroll container's content coordinates (scale-safe). */
const offsetIn = (el: HTMLElement, node: HTMLElement) =>
  node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;

/**
 * Five section tabs. Clicking scrolls the aircraft card vertically so the
 * section's first position sits in the middle of the card; the active tab
 * otherwise follows the section under the card's centre line (clamped to
 * Nose / Tail at either end of the scroll range).
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
      const atStart = el.scrollTop <= 4;
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
      if (atStart) return setActive(SECTIONS[0].id);
      if (atEnd) return setActive(SECTIONS[SECTIONS.length - 1].id);
      const centre = el.scrollTop + el.clientHeight / 2;
      let best: { id: Section; d: number } | null = null;
      for (const n of nodes) {
        const y = offsetIn(el, n) + n.getBoundingClientRect().height / 2;
        const d = Math.abs(y - centre);
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
    const nodes = Array.from(el.querySelectorAll<HTMLElement>(`[data-section="${id}"]`));
    if (!nodes.length) return;
    el.dispatchEvent(new CustomEvent("sectiontab", { detail: { id } }));
    // Centre the section's span (first to last tile) inside the card.
    const first = offsetIn(el, nodes[0]);
    const last = nodes[nodes.length - 1];
    const end = offsetIn(el, last) + last.getBoundingClientRect().height;
    const mid = (first + end) / 2;
    const top = id === "nose" ? 0 : id === "tail" ? el.scrollHeight : mid - el.clientHeight / 2;
    el.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };

  return (
    <div role="tablist" aria-label="Aircraft sections" className="flex min-w-0 items-center gap-0.5">
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
              "relative flex h-10 items-center px-2 text-[13px] transition-colors duration-150 sm:px-2.5 " +
              "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-jade " +
              (isActive ? "font-medium text-ink" : "text-muted hover:text-ink")
            }
          >
            {s.label}
            <span
              aria-hidden="true"
              className={"absolute inset-x-1.5 -bottom-px h-0.5 rounded-full " + (isActive ? "bg-jade" : "bg-transparent")}
            />
          </button>
        );
      })}
    </div>
  );
}
