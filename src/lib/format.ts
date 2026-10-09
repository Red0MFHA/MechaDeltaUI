import { formatDistanceStrict } from "date-fns";

export type TimezonePolicy = "local" | "utc";

const UNITS = ["B", "KiB", "MiB", "GiB", "TiB"];

export function formatBytes(bytes: number | null | undefined, digits = 1): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const sign = bytes < 0 ? "-" : "";
  let value = Math.abs(bytes);
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const fixed = unit === 0 ? value.toFixed(0) : value.toFixed(digits);
  return `${sign}${fixed} ${UNITS[unit]}`;
}

export function formatExactBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "—";
  return `${bytes.toLocaleString("en-US")} bytes`;
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "—";
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parts(iso: string, tz: TimezonePolicy) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (tz === "utc") {
    return {
      y: d.getUTCFullYear(),
      mo: d.getUTCMonth() + 1,
      da: d.getUTCDate(),
      h: d.getUTCHours(),
      mi: d.getUTCMinutes(),
      s: d.getUTCSeconds(),
    };
  }
  return {
    y: d.getFullYear(),
    mo: d.getMonth() + 1,
    da: d.getDate(),
    h: d.getHours(),
    mi: d.getMinutes(),
    s: d.getSeconds(),
  };
}

export function formatDateTime(
  iso: string | null | undefined,
  tz: TimezonePolicy = "local",
): string {
  if (!iso) return "—";
  const p = parts(iso, tz);
  if (!p) return "—";
  const suffix = tz === "utc" ? " UTC" : "";
  return `${p.y}-${pad(p.mo)}-${pad(p.da)} ${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}${suffix}`;
}

export function formatTime(iso: string | null | undefined, tz: TimezonePolicy = "local"): string {
  if (!iso) return "—";
  const p = parts(iso, tz);
  if (!p) return "—";
  const suffix = tz === "utc" ? " UTC" : "";
  return `${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}${suffix}`;
}

export function formatAge(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatDistanceStrict(d, now)} ago`;
}

export function formatRatio(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatMetric(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined) return "—";
  switch (unit) {
    case "bytes":
      return formatBytes(value);
    case "ms":
      return formatMs(value);
    case "ratio":
      return formatRatio(value);
    case "count":
      return value.toLocaleString("en-US");
    default:
      return `${value.toLocaleString("en-US")} ${unit}`;
  }
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(3);
}
