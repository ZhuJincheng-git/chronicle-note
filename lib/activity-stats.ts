import { currentDateInTimeZone, dateKey, type ChronicleEntry, type TimeZonePreference } from "./chronicle";

export interface ActivityCell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ActivitySummary {
  totalEntries: number;
  activeDays: number;
  currentStreak: number;
  weeks: ActivityCell[][];
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function buildActivitySummary(entries: ChronicleEntry[], timeZone: TimeZonePreference, today = currentDateInTimeZone(timeZone)): ActivitySummary {
  const counts = entries.reduce<Record<string, number>>((result, entry) => {
    const key = dateKey(entry.startAt, timeZone);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
  const activeDays = Object.keys(counts).length;
  let currentStreak = 0;
  let cursor = today;
  while (counts[cursor]) {
    currentStreak += 1;
    cursor = shiftDate(cursor, -1);
  }

  const cells = Array.from({ length: 84 }, (_, index) => {
    const date = shiftDate(today, index - 83);
    const count = counts[date] ?? 0;
    const level: ActivityCell["level"] = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
    return { date, count, level };
  });
  const weeks = Array.from({ length: 12 }, (_, index) => cells.slice(index * 7, index * 7 + 7));

  return { totalEntries: entries.length, activeDays, currentStreak, weeks };
}
