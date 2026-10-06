import type { ReactNode } from "react";

export type CqPageHeaderVisual = "default" | "magic";

/**
 * F6 — Consolidated authenticated page header.
 *
 * Verbatim hierarchy approved in F4 (`QrStudioHeader`) and mirrored in F3:
 * oversized Magic title (`26px → 36px`, `tracking-[-0.035em]`) + muted
 * description + subtle context + action row. `pill` accepts any status node so
 * surfaces can pass their own real state without this component knowing the data.
 */
export function CqPageHeader({
  title,
  description,
  pill,
  context,
  actions,
  visual = "default",
}: {
  title: string;
  description: string;
  pill?: ReactNode | undefined;
  context?: ReactNode | undefined;
  actions?: ReactNode | undefined;
  visual?: CqPageHeaderVisual | undefined;
}) {
  return (
    <header className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1
          className={
            visual === "magic"
              ? "text-[30px] font-bold leading-none tracking-[-0.035em] text-cq-ink sm:text-[40px]"
              : "text-[26px] font-bold leading-none tracking-[-0.035em] text-cq-ink sm:text-[36px]"
          }
        >
          {title}
        </h1>
        {pill}
      </div>
      <p
        className={
          visual === "magic"
            ? "mt-3 max-w-2xl text-[14.5px] leading-relaxed text-cq-muted"
            : "mt-3 max-w-2xl text-[14px] leading-relaxed text-cq-muted"
        }
      >
        {description}
      </p>
      {context ? (
        <div
          className={
            visual === "magic"
              ? "mt-4 text-[13.5px] leading-relaxed text-cq-subtle"
              : "mt-3 text-[13px] leading-relaxed text-cq-subtle"
          }
        >
          {context}
        </div>
      ) : null}
      {actions ? (
        <div className={visual === "magic" ? "mt-6 flex flex-wrap gap-2" : "mt-4 flex flex-wrap gap-2"}>
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export default CqPageHeader;
