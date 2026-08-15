import { describe, expect, it } from "vitest";

import { buildExport, formatDay, isEndAfterStart, isValidTime, sortEntries, t, zonedDateTimeToIso, type ChronicleEntry } from "../lib/chronicle";
import { buildActivitySummary } from "../lib/activity-stats";

const older: ChronicleEntry = {
  id: "older",
  text: "Read a chapter",
  startAt: "2026-08-15T08:30:00.000Z",
  createdAt: "2026-08-15T08:30:00.000Z",
};

const newer: ChronicleEntry = {
  id: "newer",
  text: "Reviewed project notes",
  startAt: "2026-08-15T14:20:00.000Z",
  endAt: "2026-08-15T15:00:00.000Z",
  createdAt: "2026-08-15T14:20:00.000Z",
};

describe("chronicle data utilities", () => {
  it("accepts valid 24-hour times only", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("9:30")).toBe(false);
    expect(isValidTime("24:00")).toBe(false);
  });

  it("orders the newest timeline item first", () => {
    expect(sortEntries([older, newer]).map((entry) => entry.id)).toEqual(["newer", "older"]);
  });

  it("exports entries in timeline order with ranged time labels", () => {
    const exported = buildExport([older, newer], "en");
    expect(exported).toContain("Chronicle timeline");
    expect(exported).toContain("Reviewed project notes");
    expect(exported).toContain("Read a chapter");
    expect(exported.indexOf("Reviewed project notes")).toBeLessThan(exported.indexOf("Read a chapter"));
  });

  it("converts a date and clock time in the chosen time zone to a stable instant", () => {
    expect(zonedDateTimeToIso("2026-08-15", "20:00", "Asia/Shanghai")).toBe("2026-08-15T12:00:00.000Z");
  });

  it("requires a ranged entry to end after it starts", () => {
    expect(isEndAfterStart("2026-08-15", "08:00", "09:00", "UTC")).toBe(true);
    expect(isEndAfterStart("2026-08-15", "09:00", "08:00", "UTC")).toBe(false);
  });

  it("provides translated interface copy for the expanded language set", () => {
    expect(t("ko", "settings")).toBe("설정");
    expect(t("es", "today")).toBe("Hoy");
    expect(t("fr", "done")).toBe("Terminé");
    expect(t("de", "timeZone")).toBe("Zeitzone");
  });

  it("formats non-today dates in Chinese without device locale data", () => {
    expect(formatDay("2026-08-13T12:00:00.000Z", "zh", "Asia/Shanghai")).toBe("8月13日 周四");
  });

  it("includes the year for Chinese timeline groups outside the current year", () => {
    expect(formatDay("2010-08-15T12:00:00.000Z", "zh", "Asia/Shanghai")).toBe("2010年8月15日 周日");
  });

  it("aggregates entries into daily activity cells and a current streak", () => {
    const summary = buildActivitySummary([older, newer], "UTC", "2026-08-15");
    expect(summary.totalEntries).toBe(2);
    expect(summary.activeDays).toBe(1);
    expect(summary.currentStreak).toBe(1);
    expect(summary.weeks).toHaveLength(12);
  });
});
