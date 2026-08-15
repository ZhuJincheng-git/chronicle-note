import {
  dateKey,
  sortEntries,
  type ChronicleEntry,
  type TimeZonePreference,
} from "./chronicle";

export interface TimelineSection {
  key: string;
  iso: string;
  data: ChronicleEntry[];
}

export function buildTimelineSections(
  entries: ChronicleEntry[],
  timeZone: TimeZonePreference,
): TimelineSection[] {
  const grouped = new Map<string, TimelineSection>();
  for (const entry of entries) {
    const key = dateKey(entry.startAt, timeZone);
    const section = grouped.get(key) ?? { key, iso: entry.startAt, data: [] };
    section.data.push(entry);
    grouped.set(key, section);
  }
  return [...grouped.values()]
    .map((section) => ({ ...section, data: sortEntries(section.data) }))
    .sort((first, second) => second.key.localeCompare(first.key));
}
