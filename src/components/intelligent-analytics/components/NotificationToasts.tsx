/**
 * CRIPQER INTELLIGENT ANALYTICS V1.1 — premium in-app toast surface.
 * Renders candidates the notification engine already approved.
 */

import { useEffect, useState } from "react";
import type {
  NotificationCandidateV1,
  NotificationKind,
  RecommendedActionV1,
} from "../analytics.types";

const KIND_GLYPH: Record<NotificationKind, string> = {
  positive: "📈",
  opportunity: "💡",
  warning: "⚠️",
  record: "🏆",
  goal: "🎯",
  live: "🔥",
};

function timeLabel(iso: string): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  return new Date(time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function NotificationToasts({
  candidates,
  onAction,
  onDismiss,
  autoDismissMs = 9000,
  max = 2,
}: {
  candidates: NotificationCandidateV1[];
  onAction?: (action: RecommendedActionV1) => void;
  onDismiss?: (id: string) => void;
  autoDismissMs?: number;
  max?: number;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    if (candidates.length === 0) return;
    const timer = window.setTimeout(() => {
      setDismissed((prev) => [...prev, ...candidates.map((candidate) => candidate.id)]);
    }, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [candidates, autoDismissMs]);

  const visible = candidates.filter((candidate) => !dismissed.includes(candidate.id)).slice(0, max);
  if (visible.length === 0) return null;

  const close = (id: string) => {
    setDismissed((prev) => [...prev, id]);
    onDismiss?.(id);
  };

  return (
    <div className="cq-toasts" role="status" aria-live="polite">
      {visible.map((candidate) => (
        <div className="cq-toast" data-kind={candidate.kind} key={candidate.id}>
          <span className="cq-toast__glyph" aria-hidden="true">
            {KIND_GLYPH[candidate.kind]}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cq-toast__head">
              <p className="cq-toast__title">{candidate.title}</p>
              <span className="cq-toast__time">{timeLabel(candidate.createdAt)}</span>
            </div>
            <p className="cq-toast__msg">{candidate.message}</p>
            {candidate.metric ? (
              <span className="cq-toast__metric">
                {candidate.metric.label}: <strong>{candidate.metric.value}</strong>
              </span>
            ) : null}
            {candidate.action && candidate.action.type !== "none" ? (
              <button
                type="button"
                className="cq-btn cq-btn--primary"
                style={{ marginTop: 10 }}
                onClick={() => onAction?.(candidate.action as RecommendedActionV1)}
              >
                {candidate.action.label}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className="cq-toast__close"
            aria-label="Dismiss notification"
            onClick={() => close(candidate.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
