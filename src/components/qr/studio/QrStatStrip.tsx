import type { ReactNode } from "react";

/**
 * F4 — Real-state strip (Magic "Estado / Aperturas" treatment).
 *
 * Every item must be fed with a real value by the caller. Items the product
 * cannot measure yet simply are not rendered by the caller (no placeholders).
 */
export function QrStatStrip({
  items,
  className,
}: {
  items: Array<{ label: string; value: ReactNode; hint?: string }>;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Estado del QR"
      className={
        className ??
        "grid w-full grid-cols-2 gap-y-4 rounded-cq-lg bg-cq-blue-50 px-1 py-4 sm:grid-cols-3 sm:rounded-cq-xl sm:px-2"
      }
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`min-w-0 px-3 sm:px-4 ${index > 0 ? "border-l border-cq-blue-100" : ""}`}
        >
          <p className="text-[12.5px] font-medium text-cq-muted">{item.label}</p>
          <div className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.03em] text-cq-ink tabular-nums">
            {item.value}
          </div>
          {item.hint ? <p className="mt-1 text-[11.5px] text-cq-subtle">{item.hint}</p> : null}
        </div>
      ))}
    </section>
  );
}

export default QrStatStrip;
