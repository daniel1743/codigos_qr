/**
 * CRIPQER INTELLIGENT ANALYTICS V1 — chart primitives.
 * Dependency-free SVG/CSS. React 18/19 only.
 */

import { Fragment, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { HourCellV1, RankedItemV1, SeriesPointV1 } from "../analytics.types";

export function Card({
  title,
  hint,
  actions,
  className,
  children,
}: {
  title?: string;
  hint?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`cq-card ${className ?? ""}`}>
      {(title || actions) && (
        <header className="cq-card__head">
          <div>
            {title ? <h3 className="cq-card__title">{title}</h3> : null}
            {hint ? <div className="cq-card__hint">{hint}</div> : null}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Delta({ value, suffix }: { value: number | null; suffix?: string }) {
  if (value === null) {
    return (
      <span className="cq-delta" data-tone="flat">
        New
      </span>
    );
  }
  const rounded = Math.round(value);
  const tone = rounded > 1 ? "up" : rounded < -1 ? "down" : "flat";
  const arrow = tone === "up" ? "▲" : tone === "down" ? "▼" : "→";
  return (
    <span className="cq-delta" data-tone={tone}>
      {arrow} {rounded > 0 ? "+" : ""}
      {rounded}%{suffix ? ` ${suffix}` : ""}
    </span>
  );
}

function path(points: SeriesPointV1[], width: number, height: number, max: number, close: boolean) {
  if (points.length === 0) return "";
  const stepX = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((point, i) => {
    const x = i * stepX;
    const y = height - (max > 0 ? (point.value / max) * (height - 6) : 0) - 3;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M${coords.join(" L")}`;
  return close ? `${line} L${width},${height} L0,${height} Z` : line;
}

export function AreaChart({
  series,
  compare,
  height = 180,
  label = "Trend",
  compareLabel = "Previous period",
}: {
  series: SeriesPointV1[];
  compare?: SeriesPointV1[];
  height?: number;
  label?: string;
  compareLabel?: string;
}) {
  const width = 600;
  const all = [...series, ...(compare ?? [])];
  const max = Math.max(...all.map((point) => point.value), 1);
  const ticks = series.filter((_, i) => i % Math.ceil(series.length / 5 || 1) === 0);
  const [active, setActive] = useState<number | null>(null);
  const box = useRef<HTMLDivElement | null>(null);

  let peakIndex = 0;
  series.forEach((point, i) => {
    if (point.value > (series[peakIndex]?.value ?? 0)) peakIndex = i;
  });
  const peak = series[peakIndex];

  const pointAt = (index: number) => {
    const stepX = series.length > 1 ? width / (series.length - 1) : width;
    const value = series[index]?.value ?? 0;
    return {
      x: index * stepX,
      y: height - (max > 0 ? (value / max) * (height - 6) : 0) - 3,
    };
  };

  const track = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = box.current;
    if (!node || series.length === 0) return;
    const rect = node.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    setActive(Math.round(ratio * (series.length - 1)));
  };

  const activePoint = active !== null ? series[active] : null;
  const activeCompare = active !== null ? compare?.[active] : null;
  const activeCoords = active !== null ? pointAt(active) : null;

  return (
    <div>
      <div
        className="cq-chart__box"
        ref={box}
        onPointerMove={track}
        onPointerDown={track}
        onPointerLeave={() => setActive(null)}
      >
        <svg
          className="cq-chart"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${label}: ${series.map((p) => `${p.label} ${p.value}`).join(", ")}`}
        >
          <defs>
            <linearGradient id="cqArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--cq-accent)" stopOpacity="0.38" />
              <stop offset="100%" stopColor="var(--cq-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              x2={width}
              y1={height * ratio}
              y2={height * ratio}
              stroke="var(--cq-border)"
              strokeWidth="1"
            />
          ))}
          {compare && compare.length > 0 ? (
            <path
              d={path(compare, width, height, max, false)}
              fill="none"
              stroke="var(--cq-muted)"
              strokeWidth="1.5"
              strokeDasharray="5 5"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <path d={path(series, width, height, max, true)} fill="url(#cqArea)" />
          <path
            d={path(series, width, height, max, false)}
            fill="none"
            stroke="var(--cq-accent)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {peak && peak.value > 0 ? (
            <circle
              cx={pointAt(peakIndex).x}
              cy={pointAt(peakIndex).y}
              r="4"
              fill="var(--cq-record)"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {activeCoords ? (
            <>
              <line
                x1={activeCoords.x}
                x2={activeCoords.x}
                y1="0"
                y2={height}
                stroke="var(--cq-accent)"
                strokeWidth="1"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={activeCoords.x} cy={activeCoords.y} r="4.5" fill="var(--cq-accent)" />
            </>
          ) : null}
        </svg>
        {activePoint ? (
          <div
            className="cq-tooltip"
            style={{
              left: `${(active! / Math.max(series.length - 1, 1)) * 100}%`,
            }}
            role="status"
          >
            <strong>{activePoint.label}</strong>
            <span>
              {label}: {activePoint.value}
            </span>
            {activeCompare ? (
              <span className="cq-tooltip__muted">
                {compareLabel}: {activeCompare.value}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="cq-legend" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick.key}>{tick.label}</span>
        ))}
      </div>
    </div>
  );
}

/** Compact vertical bars used for realtime pulses. */
export function PulseBars({ series, tone = "accent" }: { series: SeriesPointV1[]; tone?: string }) {
  const max = Math.max(...series.map((point) => point.value), 1);
  return (
    <div className="cq-pulsebars" role="img" aria-label={`Recent activity: ${series.map((p) => p.value).join(", ")}`}>
      {series.map((point) => (
        <span
          key={point.key}
          className="cq-pulsebars__bar"
          data-tone={tone}
          style={{ height: `${Math.max((point.value / max) * 100, 6)}%` }}
          title={`${point.label} — ${point.value}`}
        />
      ))}
    </div>
  );
}

/** Circular progress used by Smart Goals. */
export function ProgressRing({
  value,
  tone = "accent",
  size = 64,
  caption,
}: {
  value: number;
  tone?: string;
  size?: number;
  caption?: string;
}) {
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.min(Math.max(value, 0), 1) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={caption ?? "Progress"}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--cq-border)" strokeWidth="6" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`var(--cq-${tone})`}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="53%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size / 4.2}
        fontWeight="700"
        fill="var(--cq-text)"
      >
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

export function Sparkline({
  series,
  tone = "accent",
  height = 34,
}: {
  series: SeriesPointV1[];
  tone?: string;
  height?: number;
}) {
  const width = 120;
  const max = Math.max(...series.map((point) => point.value), 1);
  if (series.length === 0) return null;
  return (
    <svg
      className="cq-spark"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ height }}
    >
      <path d={path(series, width, height, max, true)} fill={`var(--cq-${tone}-soft)`} />
      <path
        d={path(series, width, height, max, false)}
        fill="none"
        stroke={`var(--cq-${tone})`}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function BarList({
  items,
  emptyLabel = "Nothing to show yet",
  formatValue,
}: {
  items: RankedItemV1[];
  emptyLabel?: string;
  formatValue?: (item: RankedItemV1) => string;
}) {
  if (items.length === 0) return <p className="cq-empty">{emptyLabel}</p>;
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="cq-bars">
      {items.map((item) => (
        <div className="cq-bar" key={item.id} title={`${item.label}: ${item.value}`}>
          <span className="cq-bar__label" title={item.label}>
            {item.label}
          </span>
          <span className="cq-bar__value">{formatValue ? formatValue(item) : item.value}</span>
          <span className="cq-bar__track">
            <span className="cq-bar__fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Heatmap({ cells }: { cells: HourCellV1[] }) {
  const max = Math.max(...cells.map((cell) => cell.value), 1);
  return (
    <div>
      <div className="cq-heatmap" role="img" aria-label="Activity by weekday and hour">
        {WEEKDAYS.map((day, weekday) => (
          <Fragment key={day}>
            <span className="cq-heatmap__label">
              {day}
            </span>
            {Array.from({ length: 24 }, (_, hour) => {
              const cell = cells.find((entry) => entry.weekday === weekday && entry.hour === hour);
              const value = cell?.value ?? 0;
              return (
                <span
                  key={`${day}-${hour}`}
                  className="cq-heatmap__cell"
                  style={{ opacity: value === 0 ? 0.08 : 0.2 + (value / max) * 0.8 }}
                  title={`${day} ${String(hour).padStart(2, "0")}:00 — ${value}`}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="cq-heatmap__axis" aria-hidden="true">
        <span />
        {Array.from({ length: 24 }, (_, hour) => (
          <span key={hour} style={{ textAlign: "center" }}>
            {hour % 6 === 0 ? hour : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Donut({ items }: { items: RankedItemV1[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <p className="cq-empty">No data yet</p>;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const palette = ["var(--cq-accent)", "var(--cq-positive)", "var(--cq-record)", "var(--cq-warning)"];

  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Distribution">
        {items.slice(0, 4).map((item, i) => {
          const fraction = item.value / total;
          const dash = fraction * circumference;
          const element = (
            <circle
              key={item.id}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={palette[i % palette.length]}
              strokeWidth="16"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += dash;
          return element;
        })}
      </svg>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, minWidth: 140 }}>
        {items.slice(0, 4).map((item, i) => (
          <li key={item.id} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span>
              <span className="cq-legend__dot" style={{ background: palette[i % palette.length] }} />
              {item.label}
            </span>
            <strong>{Math.round((item.value / total) * 100)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
