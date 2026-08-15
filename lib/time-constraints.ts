export const CLOCK_HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
export const CLOCK_MINUTES = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);

export function splitClockTime(value: string): {
  hour: number;
  minute: number;
} {
  const [hour, minute] = value.split(":").map(Number);
  return { hour, minute };
}

export function clockTimeToMinutes(value: string): number {
  const { hour, minute } = splitClockTime(value);
  return hour * 60 + minute;
}

export function previousClockMinute(value: string): string {
  const minutes = clockTimeToMinutes(value);
  if (minutes <= 0) return "00:00";
  const previous = minutes - 1;
  return `${String(Math.floor(previous / 60)).padStart(2, "0")}:${String(previous % 60).padStart(2, "0")}`;
}

export interface TimeCandidateOptions {
  date: string;
  today: string;
  nowTime: string;
  minimumTime?: string;
  maximumTime?: string;
  maximumTimeInclusive?: boolean;
}

export function buildAllowedTimes({
  date,
  today,
  nowTime,
  minimumTime,
  maximumTime,
  maximumTimeInclusive = false,
}: TimeCandidateOptions): string[] {
  if (date > today) return [];

  const nowMinutes = clockTimeToMinutes(nowTime);
  const hasCurrentDayCap = date === today;
  const requestedMaximum = maximumTime
    ? clockTimeToMinutes(maximumTime)
    : undefined;
  const useCurrentDayCap =
    hasCurrentDayCap &&
    (requestedMaximum === undefined || nowMinutes < requestedMaximum);
  const effectiveMaximum = useCurrentDayCap ? nowMinutes : requestedMaximum;
  const effectiveMaximumInclusive = useCurrentDayCap
    ? true
    : maximumTimeInclusive;
  const minimum = minimumTime ? clockTimeToMinutes(minimumTime) : undefined;

  return CLOCK_HOURS.flatMap((hour) =>
    CLOCK_MINUTES.map((minute) => `${hour}:${minute}`),
  ).filter((candidate) => {
    const candidateMinutes = clockTimeToMinutes(candidate);
    if (minimum !== undefined && candidateMinutes <= minimum) return false;
    if (effectiveMaximum === undefined) return true;
    return effectiveMaximumInclusive
      ? candidateMinutes <= effectiveMaximum
      : candidateMinutes < effectiveMaximum;
  });
}

export function hoursFromAllowedTimes(allowedTimes: string[]): string[] {
  return CLOCK_HOURS.filter((hour) =>
    allowedTimes.some((candidate) => candidate.startsWith(`${hour}:`)),
  );
}

export function minutesForHour(hour: number, allowedTimes: string[]): string[] {
  const prefix = `${String(hour).padStart(2, "0")}:`;
  return allowedTimes
    .filter((candidate) => candidate.startsWith(prefix))
    .map((candidate) => candidate.slice(3));
}

export function clampClockTimeToAllowed(
  value: string,
  allowedTimes: string[],
): string | null {
  if (allowedTimes.length === 0) return null;
  if (allowedTimes.includes(value)) return value;
  const hourPrefix = `${value.slice(0, 2)}:`;
  return (
    allowedTimes
      .filter((candidate) => candidate.startsWith(hourPrefix))
      .at(-1) ??
    allowedTimes.at(-1) ??
    null
  );
}
