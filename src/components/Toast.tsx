import { useToast } from "@/store/useToast";

/** Rendered inside the aircraft card's relative wrapper, above the bottom fade. */
export default function Toasts() {
  const toasts = useToast((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={
            "tabular max-w-full truncate rounded-md px-3 py-1.5 text-[13px] text-white " +
            (t.kind === "error" ? "bg-danger" : "bg-ink")
          }
          style={{ animation: "tileIn 200ms ease-out both" }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
