import { describe, expect, it } from "vitest";

import {
  formatBytes,
  formatClock,
  formatDateTime,
  formatMetric,
  formatMs,
  formatRatio,
} from "./format";

describe("formatBytes", () => {
  it("uses binary units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(1024)).toBe("1.0 KiB");
    expect(formatBytes(2_457_600)).toBe("2.3 MiB");
  });

  it("shows a dash for missing values", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(undefined)).toBe("—");
  });
});

describe("time formatting", () => {
  it("formats UTC timestamps with a suffix", () => {
    expect(formatDateTime("2026-10-08T10:20:48.000Z", "utc")).toBe("2026-10-08 10:20:48 UTC");
  });

  it("returns a dash for invalid input", () => {
    expect(formatDateTime("not a date", "utc")).toBe("—");
  });

  it("formats media clock", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(118_000)).toBe("01:58");
    expect(formatClock(3_725_000)).toBe("1:02:05");
  });
});

describe("metric formatting", () => {
  it("formats by unit", () => {
    expect(formatMetric(0.9, "ratio")).toBe("90.0%");
    expect(formatMetric(41.7, "ms")).toBe("41.7 ms");
    expect(formatMetric(3, "count")).toBe("3");
    expect(formatMetric(null, "ms")).toBe("—");
    expect(formatMs(1500)).toBe("1.50 s");
    expect(formatRatio(null)).toBe("—");
  });
});
