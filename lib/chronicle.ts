export type Locale = "zh" | "en" | "ja";
export type ThemeMode = "light" | "dark";
export type TimeZonePreference = "system" | string;

export interface ChronicleEntry {
  id: string;
  text: string;
  startAt: string;
  endAt?: string;
  createdAt: string;
}

export interface ChronicleState {
  entries: ChronicleEntry[];
  locale: Locale;
  theme: ThemeMode;
  timeZone: TimeZonePreference;
}

export const defaultChronicleState: ChronicleState = {
  entries: [],
  locale: "zh",
  theme: "light",
  timeZone: "system",
};

export const translations = {
  zh: {
    appName: "刻录",
    today: "今天",
    timeline: "时间线",
    entries: "条记录",
    emptyTitle: "今天还没有记录",
    emptySubtitle: "下一件做的事，值得被写下。",
    add: "记录",
    newRecord: "新建记录",
    activity: "此刻在做什么？",
    activityPlaceholder: "例如：整理项目笔记",
    date: "日期",
    chooseDate: "选择日期",
    selectTime: "选择时间",
    done: "完成",
    time: "时间",
    point: "时间点",
    range: "时间段",
    startTime: "开始时间",
    endTime: "结束时间",
    save: "保存记录",
    cancel: "取消",
    settings: "设置",
    appearance: "显示",
    darkMode: "黑色主题",
    language: "语言",
    export: "导出全部",
    deleteAll: "删除全部",
    privacy: "所有记录仅保存在此设备上。",
    confirmDelete: "删除记录？",
    confirmClear: "删除全部记录？",
    deleteOneHint: "这条记录将无法恢复。",
    clearHint: "将永久删除所有记录，且无法恢复。",
    delete: "删除",
    invalidTime: "请输入 24 小时制时间，例如 09:30。",
    futureTime: "只能记录当前时刻或更早的时间。",
    invalidRange: "结束时间需要晚于开始时间。",
    missingText: "先写下正在做的事。",
    exportTitle: "刻录时间线",
    exportUnavailable: "当前设备无法打开分享面板。",
    shareTitle: "导出刻录时间线",
    timeZone: "时区",
    systemTimeZone: "跟随系统",
    timeZoneHint: "记录与时间线将按此时区显示。",
    data: "数据",
    dateFormat: "zh-CN",
  },
  en: {
    appName: "Chronicle",
    today: "Today",
    timeline: "Timeline",
    entries: "entries",
    emptyTitle: "Nothing recorded today",
    emptySubtitle: "The next moment is worth keeping.",
    add: "Record",
    newRecord: "New entry",
    activity: "What are you doing?",
    activityPlaceholder: "For example, organized project notes",
    date: "Date",
    chooseDate: "Choose date",
    selectTime: "Select time",
    done: "Done",
    time: "Time",
    point: "Point",
    range: "Range",
    startTime: "Start time",
    endTime: "End time",
    save: "Save entry",
    cancel: "Cancel",
    settings: "Settings",
    appearance: "Appearance",
    darkMode: "Dark theme",
    language: "Language",
    export: "Export all",
    deleteAll: "Delete all",
    privacy: "Every record stays on this device.",
    confirmDelete: "Delete this entry?",
    confirmClear: "Delete all entries?",
    deleteOneHint: "This entry cannot be restored.",
    clearHint: "Every record will be permanently removed.",
    delete: "Delete",
    invalidTime: "Use 24-hour time, for example 09:30.",
    futureTime: "Only current or past time can be recorded.",
    invalidRange: "The end time must be after the start time.",
    missingText: "Write what you are doing first.",
    exportTitle: "Chronicle timeline",
    exportUnavailable: "Sharing is not available on this device.",
    shareTitle: "Export Chronicle timeline",
    timeZone: "Time zone",
    systemTimeZone: "Use system time zone",
    timeZoneHint: "Entries and timeline use this time zone.",
    data: "DATA",
    dateFormat: "en-US",
  },
  ja: {
    appName: "刻録",
    today: "今日",
    timeline: "タイムライン",
    entries: "件の記録",
    emptyTitle: "今日はまだ記録がありません",
    emptySubtitle: "次のひとときを残しましょう。",
    add: "記録する",
    newRecord: "新しい記録",
    activity: "今、何をしていますか？",
    activityPlaceholder: "例：プロジェクトのメモを整理",
    date: "日付",
    chooseDate: "日付を選択",
    selectTime: "時刻を選択",
    done: "完了",
    time: "時刻",
    point: "時点",
    range: "時間帯",
    startTime: "開始時刻",
    endTime: "終了時刻",
    save: "保存する",
    cancel: "キャンセル",
    settings: "設定",
    appearance: "表示",
    darkMode: "ダークテーマ",
    language: "言語",
    export: "すべて書き出す",
    deleteAll: "すべて削除",
    privacy: "すべての記録はこの端末だけに保存されます。",
    confirmDelete: "この記録を削除しますか？",
    confirmClear: "すべての記録を削除しますか？",
    deleteOneHint: "この記録は復元できません。",
    clearHint: "すべての記録が完全に削除され、復元できません。",
    delete: "削除",
    invalidTime: "24時間表記で入力してください。例：09:30",
    futureTime: "現在時刻より後の記録は作成できません。",
    invalidRange: "終了時刻は開始時刻より後にしてください。",
    missingText: "まず、していることを書いてください。",
    exportTitle: "刻録タイムライン",
    exportUnavailable: "この端末では共有を開けません。",
    shareTitle: "刻録タイムラインを書き出す",
    timeZone: "タイムゾーン",
    systemTimeZone: "端末の時刻に合わせる",
    timeZoneHint: "記録とタイムラインはこのタイムゾーンで表示されます。",
    data: "データ",
    dateFormat: "ja-JP",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["zh"];

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale][key];
}

export function isValidTime(value: string): boolean {
  const match = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(value.trim());
  return Boolean(match);
}

export function getSystemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function resolveTimeZone(preference: TimeZonePreference): string {
  return preference === "system" ? getSystemTimeZone() : preference;
}

export function getZonedParts(iso: string | Date, timeZone: TimeZonePreference): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: resolveTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute") };
}

export function currentDateInTimeZone(timeZone: TimeZonePreference): string {
  const parts = getZonedParts(new Date(), timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function currentTimeInTimeZone(timeZone: TimeZonePreference): string {
  const parts = getZonedParts(new Date(), timeZone);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function timeZoneOffsetMs(timestamp: number, timeZone: TimeZonePreference): number {
  const parts = getZonedParts(new Date(timestamp), timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return asUtc - timestamp;
}

export function zonedDateTimeToIso(date: string, time: string, timeZone: TimeZonePreference): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidTime(time)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcCandidate = Date.UTC(year, month - 1, day, hour, minute);
  const firstPass = utcCandidate - timeZoneOffsetMs(utcCandidate, timeZone);
  const instant = utcCandidate - timeZoneOffsetMs(firstPass, timeZone);
  const localized = getZonedParts(new Date(instant), timeZone);
  if (localized.year !== year || localized.month !== month || localized.day !== day || localized.hour !== hour || localized.minute !== minute) return null;
  return new Date(instant).toISOString();
}

export function isPastOrNow(date: string, time: string, timeZone: TimeZonePreference): boolean {
  const iso = zonedDateTimeToIso(date, time, timeZone);
  return Boolean(iso && new Date(iso).getTime() <= Date.now());
}

export function isEndAfterStart(date: string, startTime: string, endTime: string, timeZone: TimeZonePreference): boolean {
  const start = zonedDateTimeToIso(date, startTime, timeZone);
  const end = zonedDateTimeToIso(date, endTime, timeZone);
  return Boolean(start && end && new Date(end).getTime() > new Date(start).getTime());
}

export function formatTime(iso: string, locale: Locale, timeZone: TimeZonePreference = "system"): string {
  return new Intl.DateTimeFormat(translations[locale].dateFormat, {
    timeZone: resolveTimeZone(timeZone),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function dateKey(iso: string, timeZone: TimeZonePreference = "system"): string {
  const parts = getZonedParts(iso, timeZone);
  return [parts.year, String(parts.month).padStart(2, "0"), String(parts.day).padStart(2, "0")].join("-");
}

export function formatDay(iso: string, locale: Locale, timeZone: TimeZonePreference = "system"): string {
  const day = new Date(iso);
  const isToday = dateKey(iso, timeZone) === currentDateInTimeZone(timeZone);
  if (isToday) return t(locale, "today");

  return new Intl.DateTimeFormat(translations[locale].dateFormat, {
    timeZone: resolveTimeZone(timeZone),
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(day);
}

export function formatDateForExport(iso: string, locale: Locale, timeZone: TimeZonePreference = "system"): string {
  return new Intl.DateTimeFormat(translations[locale].dateFormat, {
    timeZone: resolveTimeZone(timeZone),
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(iso));
}

export function sortEntries(entries: ChronicleEntry[]): ChronicleEntry[] {
  return [...entries].sort((first, second) => new Date(second.startAt).getTime() - new Date(first.startAt).getTime());
}

export function buildExport(entries: ChronicleEntry[], locale: Locale, timeZone: TimeZonePreference = "system"): string {
  const ordered = sortEntries(entries);
  const groups = ordered.reduce<Record<string, ChronicleEntry[]>>((result, entry) => {
    const key = dateKey(entry.startAt, timeZone);
    result[key] = result[key] ?? [];
    result[key].push(entry);
    return result;
  }, {});

  const lines = [t(locale, "exportTitle"), ""];
  Object.values(groups).forEach((group) => {
    lines.push(formatDateForExport(group[0].startAt, locale, timeZone));
    group.forEach((entry) => {
      const time = entry.endAt
        ? `${formatTime(entry.startAt, locale, timeZone)}–${formatTime(entry.endAt, locale, timeZone)}`
        : formatTime(entry.startAt, locale, timeZone);
      lines.push(`${time}  ${entry.text}`);
    });
    lines.push("");
  });
  return lines.join("\n").trimEnd() + "\n";
}
