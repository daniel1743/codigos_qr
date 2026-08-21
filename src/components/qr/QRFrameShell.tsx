import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface QRFrameShellProps {
  frameStyle?: string | null;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}

// Modified by Codex — QR-STUDIO-11C
export function normalizeQRFrameStyle(frameStyle?: string | null) {
  if (frameStyle === "tag") return "badge";
  if (
    frameStyle === "stamp" ||
    frameStyle === "badge" ||
    frameStyle === "phone" ||
    frameStyle === "bottle"
  ) {
    return frameStyle;
  }
  return "plain";
}

// Modified by Codex — QR-STUDIO-11C
export function QRFrameShell({
  frameStyle,
  children,
  className,
  innerClassName,
}: QRFrameShellProps) {
  const style = normalizeQRFrameStyle(frameStyle);
  const base =
    "relative grid aspect-square place-items-center overflow-visible transition-all duration-200";
  const inner =
    "relative z-10 grid aspect-square w-[78%] place-items-center overflow-hidden rounded-xl bg-white p-[3%]";

  if (style === "stamp") {
    return (
      <div
        className={cn(
          base,
          "rounded-full bg-white p-[8%] shadow-lg ring-2 ring-slate-950/10",
          className,
        )}
      >
        <div className="absolute inset-[5%] rounded-full border-2 border-dashed border-slate-900/70" />
        <div className="absolute inset-[10%] rounded-full border border-slate-900/15" />
        <div className={cn(inner, "w-[72%] rounded-2xl", innerClassName)}>{children}</div>
      </div>
    );
  }

  if (style === "badge") {
    return (
      <div
        className={cn(base, "bg-white p-[9%] shadow-lg ring-1 ring-slate-950/10", className)}
        style={{ clipPath: "polygon(0 0, 84% 0, 100% 50%, 84% 100%, 0 100%)" }}
      >
        <div className="absolute right-[11%] top-1/2 h-[8%] w-[8%] -translate-y-1/2 rounded-full bg-slate-200 ring-2 ring-white" />
        <div className={cn(inner, "w-[70%]", innerClassName)}>{children}</div>
      </div>
    );
  }

  if (style === "phone") {
    return (
      <div className={cn(base, "rounded-[14%] bg-slate-950 p-[9%] shadow-xl", className)}>
        <div className="absolute left-1/2 top-[5%] h-[2.5%] w-[24%] -translate-x-1/2 rounded-full bg-white/25" />
        <div className={cn(inner, "w-[72%] rounded-[8%]", innerClassName)}>{children}</div>
      </div>
    );
  }

  if (style === "bottle") {
    return (
      <div className={cn(base, "p-[8%]", className)}>
        <div className="absolute left-1/2 top-[1%] h-[18%] w-[34%] -translate-x-1/2 rounded-t-[40%] bg-emerald-700 shadow-md" />
        <div className="absolute inset-x-[9%] bottom-[4%] top-[14%] rounded-b-[18%] rounded-t-[38%] bg-gradient-to-b from-emerald-400 to-emerald-800 shadow-xl" />
        <div className={cn(inner, "w-[66%] rounded-[10%] shadow-sm", innerClassName)}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(base, "rounded-2xl border bg-white p-[6%] shadow-sm", className)}>
      <div
        className={cn(
          "relative z-10 grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-white",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
