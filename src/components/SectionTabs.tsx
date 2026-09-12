import { useEffect, useState, type RefObject } from "react";
import type { Section } from "@/domain/types";
import { SECTIONS } from "@/components/layout";

interface Props {
  scrollRef: RefObject<HTMLDivElement | null>;
}

/** Top of `node` in the scroll container's content coordinates (scale-safe). */
const offsetIn = (el: HTMLElement, node: HTMLElement) =>
  node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;

/**
 * Five section tabs. Clicking scrolls the aircraft card vertically so the
 * section is centred in the card; the active tab otherwise follows the section
 * with the most visible tile area (Nose while at the very top).
 */
export default function SectionTabs({ scrollRef }: Props) {
  const [active, setActive] = useState<Section>("nose");

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // After a tab click the clicked tab stays active until the user scrolls
    // by hand, so a "Tail" click is not immediately relabelled "Aft" by area.
    let pinned = false;

    const update = () => {
      if (el.scrollTop <= 4) {
        pinned = false;
        return setActive(SECTIONS[0].id);
      }
      if (pinned) return;
      const nodes = Array.from(el.querySelectorAll<HTMLElement>("[data-section]"));
      if (!nodes.length) return;
      // The section with the most tile area inside the card wins.
      const viewTop = el.scrollTop;
      const viewBottom = viewTop + el.clientHeight;
      const area = new Map<Section, number>();
      for (const n of nodes) {
        const top = offsetIn(el, n);
        const bottom = top + n.getBoundingClientRect().height;
        const visible = Math.max(0, Math.min(bottom, viewBottom) - Math.max(top, viewTop));
        if (visible <= 0) continue;
        const id = n.dataset.section as Section;
        area.set(id, (area.get(id) ?? 0) + visible);
      }
      let best: { id: Section; a: number } | null = null;
      for (const [id, a] of area) if (!best || a > best.a) best = { id, a };
      if (best) setActive(best.id);
    };

    const onTabScroll = (e: Event) => {
      const detail = (e as CustomEvent<{ id: Section }>).detail;
      pinned = true;
      setActive(detail.id);
    };
    const unpin = () => {
      pinned = false;
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    el.addEventListener("sectiontab", onTabScroll);
    el.addEventListener("wheel", unpin, { passive: true });
    el.addEventListener("touchstart", unpin, { passive: true });
    el.addEventListener("pointerdown", unpin, { passive: true });
    el.addEventListener("keydown", unpin);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      el.removeEventListener("sectiontab", onTabScroll);
      el.removeEventListener("wheel", unpin);
      el.removeEventListener("touchstart", unpin);
      el.removeEventListener("pointerdown", unpin);
      el.removeEventListener("keydown", unpin);
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
              "relative flex h-10 items-center px-2 text-[13px] sm:px-2.5 " +
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
