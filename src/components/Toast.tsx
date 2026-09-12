import { useToast } from "@/store/useToast";

export default function Toasts() {
  const toasts = useToast((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-[72px] z-40 flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={
            "tabular max-w-full truncate rounded-md px-3 py-2 text-[13px] text-white " +
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
