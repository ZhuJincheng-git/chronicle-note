import {
  isEndAfterStart,
  isPastOrNow,
  zonedDateTimeToIso,
  type TimeZonePreference,
} from "./chronicle";

export type EntryValidationIssue =
  | "missingText"
  | "invalidTime"
  | "futureTime"
  | "invalidRange";

export interface EntryDraft {
  text: string;
  date: string;
  startTime: string;
  endTime?: string;
}

export function validateEntryDraft(
  draft: EntryDraft,
  timeZone: TimeZonePreference,
): EntryValidationIssue | null {
  if (!draft.text.trim()) return "missingText";
  const startAt = zonedDateTimeToIso(draft.date, draft.startTime, timeZone);
  const endAt = draft.endTime
    ? zonedDateTimeToIso(draft.date, draft.endTime, timeZone)
    : undefined;
  if (!startAt || (draft.endTime && !endAt)) return "invalidTime";
  if (
    !isPastOrNow(draft.date, draft.startTime, timeZone) ||
    (draft.endTime && !isPastOrNow(draft.date, draft.endTime, timeZone))
  )
    return "futureTime";
  if (
    draft.endTime &&
    !isEndAfterStart(draft.date, draft.startTime, draft.endTime, timeZone)
  )
    return "invalidRange";
  return null;
}
