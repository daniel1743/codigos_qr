/**
 * F2 — Home / Command Center presentational pill.
 *
 * Maps a REAL publication state to the Magic visual treatment. No mock state:
 * callers pass the real `published` flag from the profile/page row.
 */
export function StatusPill({
  published,
  activeLabel = "Publicada",
  inactiveLabel = "Borrador",
}: {
  published: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${
        published
          ? "bg-emerald-50 text-emerald-700"
          : "bg-cq-canvas text-cq-muted ring-1 ring-cq-line"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${published ? "bg-emerald-500" : "bg-cq-subtle"}`}
        aria-hidden="true"
      />
      {published ? activeLabel : inactiveLabel}
    </span>
  );
}

export default StatusPill;
