import type { GuestClaimNotice } from "./claimAfterLogin";

/**
 * Guest Editor V1 - G6.4: the message the visitor sees after coming back from auth.
 *
 * It is rendered by the post-login destination (a route this work already owned), not by
 * the shared Auth screen: the auth flow is not touched. Nothing is shown when there is
 * nothing to say, and success is never announced by a toast that a failed write could
 * also produce.
 */
export interface GuestClaimBannerProps {
  notice: GuestClaimNotice | null;
  /** Present only when the transfer succeeded and the visitor can open their card. */
  onOpen?: () => void;
}

export function GuestClaimBanner({ notice, onOpen }: GuestClaimBannerProps) {
  if (!notice) return null;
  const tone = notice.kind === "complete" ? "ok" : notice.kind === "conflict" ? "warn" : "error";
  return (
    <div
      role="status"
      data-testid="guest-claim-banner"
      data-kind={notice.kind}
      data-reason={notice.reason ?? ""}
      data-tone={tone}
      className={
        tone === "ok"
          ? "flex flex-wrap items-center gap-3 border-b border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] text-[#166534]"
          : tone === "warn"
            ? "flex flex-wrap items-center gap-3 border-b border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[13px] text-[#92400e]"
            : "flex flex-wrap items-center gap-3 border-b border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#991b1b]"
      }
    >
      <span>{notice.message}</span>
      {notice.mediaPendingLocal && notice.mediaPendingLocal.length > 0 && (
        <span data-testid="guest-claim-media-note" className="text-[12.5px] opacity-80">
          Fotos pendientes: {notice.mediaPendingLocal.join(", ")}
        </span>
      )}
      {onOpen && (
        <button
          type="button"
          data-testid="guest-claim-open"
          onClick={onOpen}
          className="ml-auto rounded-md border border-current px-3 py-1 text-[12.5px] font-medium"
        >
          Abrir mi tarjeta
        </button>
      )}
    </div>
  );
}
