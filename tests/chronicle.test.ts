import { describe, expect, it } from "vitest";

import {
  buildExport,
  formatDay,
  isEndAfterStart,
  isPastOrNow,
  isValidTime,
  sortEntries,
  t,
  zonedDateTimeToIso,
  type ChronicleEntry,
} from "../lib/chronicle";
import { buildActivitySummary } from "../lib/activity-stats";
import { systemAppName } from "../lib/app-brand";
import {
  buildAllowedTimes,
  clampClockTimeToAllowed,
  hoursFromAllowedTimes,
  minutesForHour,
  previousClockMinute,
} from "../lib/time-constraints";
import { validateEntryDraft } from "../lib/entry-validation";
import { buildTimelineSections } from "../lib/timeline";

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
    expect(sortEntries([older, newer]).map((entry) => entry.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("builds deterministically ordered date sections with descending entries", () => {
    const sections = buildTimelineSections(
      [
        older,
        { ...newer, id: "previous-day", startAt: "2026-08-14T22:00:00.000Z" },
        newer,
      ],
      "UTC",
    );
    expect(sections.map((section) => section.key)).toEqual([
      "2026-08-15",
      "2026-08-14",
    ]);
    expect(sections[0].data.map((entry) => entry.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("exports entries in timeline order with ranged time labels", () => {
    const exported = buildExport([older, newer], "en");
    expect(exported).toContain("Chronicle timeline");
    expect(exported).toContain("Reviewed project notes");
    expect(exported).toContain("Read a chapter");
    expect(exported.indexOf("Reviewed project notes")).toBeLessThan(
      exported.indexOf("Read a chapter"),
    );
  });

  it("converts a date and clock time in the chosen time zone to a stable instant", () => {
    expect(zonedDateTimeToIso("2026-08-15", "20:00", "Asia/Shanghai")).toBe(
      "2026-08-15T12:00:00.000Z",
    );
  });

  it("requires a ranged entry to end after it starts", () => {
    expect(isEndAfterStart("2026-08-15", "08:00", "09:00", "UTC")).toBe(true);
    expect(isEndAfterStart("2026-08-15", "09:00", "08:00", "UTC")).toBe(false);
  });

  it("rejects nonexistent local times during a DST spring-forward gap", () => {
    expect(
      zonedDateTimeToIso("2026-03-08", "02:30", "America/New_York"),
    ).toBeNull();
  });

  it("rejects future records in the selected time zone", () => {
    expect(isPastOrNow("2099-01-01", "00:00", "UTC")).toBe(false);
  });

  it("builds picker candidates with an inclusive current-minute ceiling", () => {
    const allowed = buildAllowedTimes({
      date: "2026-08-15",
      today: "2026-08-15",
      nowTime: "01:25",
    });
    expect(allowed.at(-1)).toBe("01:25");
    expect(allowed).not.toContain("01:26");
  });

  it("uses the earlier of a range maximum and the current-minute ceiling", () => {
    const allowed = buildAllowedTimes({
      date: "2026-08-15",
      today: "2026-08-15",
      nowTime: "01:25",
      minimumTime: "01:10",
      maximumTime: "01:20",
    });
    expect(allowed.at(-1)).toBe("01:19");
    expect(allowed).not.toContain("01:20");
    expect(allowed).not.toContain("01:25");
  });

  it("requires an end time strictly after start while allowing the current minute as the ceiling", () => {
    const allowed = buildAllowedTimes({
      date: "2026-08-15",
      today: "2026-08-15",
      nowTime: "01:25",
      minimumTime: "01:24",
    });
    expect(allowed).toEqual(["01:25"]);
    expect(allowed).not.toContain("01:24");
    expect(allowed).not.toContain("01:26");
  });

  it("returns no range end candidates when the start is already at the current minute", () => {
    expect(
      buildAllowedTimes({
        date: "2026-08-15",
        today: "2026-08-15",
        nowTime: "01:25",
        minimumTime: "01:25",
      }),
    ).toEqual([]);
  });

  it("clamps invalid wheel values without crossing the allowed hour boundary", () => {
    const allowed = ["01:20", "01:21", "02:00"];
    expect(clampClockTimeToAllowed("01:47", allowed)).toBe("01:21");
    expect(hoursFromAllowedTimes(allowed)).toEqual(["01", "02"]);
    expect(minutesForHour(1, allowed)).toEqual(["20", "21"]);
    expect(previousClockMinute("01:00")).toBe("00:59");
  });

  it("uses one validation contract for empty, future, and invalid range drafts", () => {
    expect(
      validateEntryDraft(
        { text: " ", date: "2026-08-15", startTime: "01:00" },
        "UTC",
      ),
    ).toBe("missingText");
    expect(
      validateEntryDraft(
        { text: "Future", date: "2099-01-01", startTime: "01:00" },
        "UTC",
      ),
    ).toBe("futureTime");
    expect(
      validateEntryDraft(
        {
          text: "Range",
          date: "2026-08-15",
          startTime: "10:00",
          endTime: "09:00",
        },
        "UTC",
      ),
    ).toBe("invalidRange");
    expect(
      validateEntryDraft(
        {
          text: "Valid",
          date: "2026-08-15",
          startTime: "09:00",
          endTime: "10:00",
        },
        "UTC",
      ),
    ).toBeNull();
  });

  it("provides translated interface copy for the expanded language set", () => {
    expect(t("ko", "settings")).toBe("설정");
    expect(t("es", "today")).toBe("Hoy");
    expect(t("fr", "done")).toBe("Terminé");
    expect(t("de", "timeZone")).toBe("Zeitzone");
  });

  it("formats non-today dates in Chinese without device locale data", () => {
    expect(formatDay("2026-08-13T12:00:00.000Z", "zh", "Asia/Shanghai")).toBe(
      "8月13日 周四",
    );
  });

  it("includes the year for Chinese timeline groups outside the current year", () => {
    expect(formatDay("2010-08-15T12:00:00.000Z", "zh", "Asia/Shanghai")).toBe(
      "2010年8月15日 周日",
    );
  });

  it("aggregates entries into daily activity cells and a current streak", () => {
    const summary = buildActivitySummary([older, newer], "UTC", "2026-08-15");
    expect(summary.totalEntries).toBe(2);
    expect(summary.activeDays).toBe(1);
    expect(summary.currentStreak).toBe(1);
    expect(summary.weeks).toHaveLength(12);
    expect(summary.weeks.flat()).toHaveLength(84);
    expect(summary.weeks.flat().at(-1)?.date).toBe("2026-08-15");
  });

  it("uses a Chinese name only for Chinese system locales", () => {
    expect(systemAppName("zh-CN")).toBe("刻录");
    expect(systemAppName("en-US")).toBe("Chronicle");
    expect(systemAppName("ja-JP")).toBe("Chronicle");
  });
});
