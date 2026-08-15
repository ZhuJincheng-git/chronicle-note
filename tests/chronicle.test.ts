import { describe, expect, it } from "vitest";

import { buildExport, isValidTime, sortEntries, type ChronicleEntry } from "../lib/chronicle";

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
});
