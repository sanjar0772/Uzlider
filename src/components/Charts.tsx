"use client";

import { money } from "@/lib/format";

export function BarChart({
  data,
  height = 160,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * (height - 28), 2);
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-[36px] rounded-t-md bg-brand-500 transition-all hover:bg-brand-600"
                style={{ height: h }}
                title={money(d.value)}
              />
            </div>
            <span className="text-[10px] font-medium text-slate-400">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const DONUT_COLORS: Record<string, string> = {
  NEW: "#94a3b8",
  ASSIGNED: "#3b66f5",
  IN_TRANSIT: "#f59e0b",
  DELIVERED: "#10b981",
  CANCELLED: "#ef4444",
};

export function DonutChart({
  data,
  labelFor,
}: {
  data: { key: string; value: number }[];
  labelFor: (k: string) => string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width="150" height="150" viewBox="0 0 150 150" className="shrink-0">
        <g transform="rotate(-90 75 75)">
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * circ;
            const seg = (
              <circle
                key={i}
                cx="75"
                cy="75"
                r={radius}
                fill="none"
                stroke={DONUT_COLORS[d.key] ?? "#94a3b8"}
                strokeWidth="18"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return seg;
          })}
        </g>
        <text
          x="75"
          y="70"
          textAnchor="middle"
          className="fill-slate-900 dark:fill-white"
          fontSize="26"
          fontWeight="700"
        >
          {total}
        </text>
        <text
          x="75"
          y="90"
          textAnchor="middle"
          className="fill-slate-400"
          fontSize="11"
        >
          loads
        </text>
      </svg>
      <div className="space-y-1.5">
        {data.map((d) => (
          <div key={d.key} className="flex items-center gap-2 text-sm">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ background: DONUT_COLORS[d.key] ?? "#94a3b8" }}
            />
            <span className="text-slate-600 dark:text-slate-300">
              {labelFor(d.key)}
            </span>
            <span className="ml-auto font-semibold text-slate-900 dark:text-white">
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
