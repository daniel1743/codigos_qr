/**
 * CRIPQER INTELLIGENT ANALYTICS V1.1 — Notification Center.
 *
 * Bell + unread counter + panel (drawer on mobile). Pure presentation:
 * candidates are produced by the notification engine, read/dismiss state is
 * owned by the dashboard shell.
 */

import { useEffect, useRef } from "react";
import type {
  NotificationItemV1,
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

export function NotificationCenter({
  items,
  open,
  onToggle,
  onRead,
  onDismiss,
  onMarkAllRead,
  onAction,
}: {
  items: NotificationItemV1[];
  open: boolean;
  onToggle: (open: boolean) => void;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onMarkAllRead: () => void;
  onAction?: (action: RecommendedActionV1) => void;
}) {
  const visible = items.filter((item) => !item.dismissed);
  const unread = visible.filter((item) => !item.read).length;
  const panel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onToggle(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onToggle]);

  return (
    <div className="cq-nc">
      <button
        type="button"
        className="cq-nc__bell"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        onClick={() => onToggle(!open)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <path
            d="M12 3a5 5 0 0 0-5 5v3.2c0 .6-.2 1.1-.6 1.6L5 14.6c-.5.7 0 1.7.9 1.7h12.2c.9 0 1.4-1 .9-1.7l-1.4-1.8a2.6 2.6 0 0 1-.6-1.6V8a5 5 0 0 0-5-5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {unread > 0 ? <span className="cq-nc__badge">{unread > 9 ? "9+" : unread}</span> : null}
      </button>

      {open ? (
        <>
          <div className="cq-nc__scrim" onClick={() => onToggle(false)} aria-hidden="true" />
          <div className="cq-nc__panel" role="dialog" aria-label="Notifications" ref={panel}>
            <header className="cq-nc__head">
              <strong>Notifications</strong>
              <div className="cq-nc__headActions">
                {unread > 0 ? (
                  <button type="button" className="cq-btn cq-btn--ghost" onClick={onMarkAllRead}>
                    Mark all read
                  </button>
                ) : null}
                <button
                  type="button"
                  className="cq-nc__close"
                  aria-label="Close notifications"
                  onClick={() => onToggle(false)}
                >
                  ×
                </button>
              </div>
            </header>

            <div className="cq-nc__list">
              {visible.length === 0 ? (
                <div className="cq-nc__empty">
                  <span aria-hidden="true">✅</span>
                  <strong>You&apos;re all caught up</strong>
                  <p>Cripqer will let you know when something important happens.</p>
                </div>
              ) : null}

              {visible.map((item) => (
                <article
                  key={item.id}
                  className="cq-nc__item"
                  data-kind={item.kind}
                  data-read={item.read ? "true" : "false"}
                  data-severity={item.severity}
                  onMouseEnter={() => (item.read ? undefined : onRead(item.id))}
                >
                  <span className="cq-nc__glyph" aria-hidden="true">
                    {KIND_GLYPH[item.kind]}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="cq-nc__itemHead">
                      <strong>{item.title}</strong>
                      <span className="cq-nc__time">{timeLabel(item.createdAt)}</span>
                    </div>
                    <p className="cq-nc__msg">{item.message}</p>
                    <div className="cq-nc__meta">
                      <span className="cq-badge" data-tone={item.severity}>
                        {item.severity}
                      </span>
                      {item.channel ? <span className="cq-badge">{item.channel}</span> : null}
                      {item.metric ? (
                        <span className="cq-nc__metric">
                          {item.metric.label}: {item.metric.value}
                        </span>
                      ) : null}
                    </div>
                    {item.action && item.action.type !== "none" ? (
                      <button
                        type="button"
                        className="cq-btn"
                        style={{ marginTop: 8 }}
                        onClick={() => {
                          onRead(item.id);
                          onAction?.(item.action as RecommendedActionV1);
                        }}
                      >
                        {item.action.label}
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="cq-nc__dismiss"
                    aria-label={`Dismiss ${item.title}`}
                    onClick={() => onDismiss(item.id)}
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
