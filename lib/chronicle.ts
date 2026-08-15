export type Locale = "zh" | "en" | "ja";
export type ThemeMode = "light" | "dark";

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
}

export const defaultChronicleState: ChronicleState = {
  entries: [],
  locale: "zh",
  theme: "light",
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
    missingText: "先写下正在做的事。",
    exportTitle: "刻录时间线",
    exportUnavailable: "当前设备无法打开分享面板。",
    shareTitle: "导出刻录时间线",
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
    missingText: "Write what you are doing first.",
    exportTitle: "Chronicle timeline",
    exportUnavailable: "Sharing is not available on this device.",
    shareTitle: "Export Chronicle timeline",
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
    missingText: "まず、していることを書いてください。",
    exportTitle: "刻録タイムライン",
    exportUnavailable: "この端末では共有を開けません。",
    shareTitle: "刻録タイムラインを書き出す",
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

export function atToday(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(translations[locale].dateFormat, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function dateKey(iso: string): string {
  const date = new Date(iso);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export function formatDay(iso: string, locale: Locale): string {
  const day = new Date(iso);
  const now = new Date();
  const isToday = dateKey(iso) === dateKey(now.toISOString());
  if (isToday) return t(locale, "today");

  return new Intl.DateTimeFormat(translations[locale].dateFormat, {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(day);
}

export function formatDateForExport(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(translations[locale].dateFormat, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(iso));
}

export function sortEntries(entries: ChronicleEntry[]): ChronicleEntry[] {
  return [...entries].sort((first, second) => new Date(second.startAt).getTime() - new Date(first.startAt).getTime());
}

export function buildExport(entries: ChronicleEntry[], locale: Locale): string {
  const ordered = sortEntries(entries);
  const groups = ordered.reduce<Record<string, ChronicleEntry[]>>((result, entry) => {
    const key = dateKey(entry.startAt);
    result[key] = result[key] ?? [];
    result[key].push(entry);
    return result;
  }, {});

  const lines = [t(locale, "exportTitle"), ""];
  Object.values(groups).forEach((group) => {
    lines.push(formatDateForExport(group[0].startAt, locale));
    group.forEach((entry) => {
      const time = entry.endAt
        ? `${formatTime(entry.startAt, locale)}–${formatTime(entry.endAt, locale)}`
        : formatTime(entry.startAt, locale);
      lines.push(`${time}  ${entry.text}`);
    });
    lines.push("");
  });
  return lines.join("\n").trimEnd() + "\n";
}
