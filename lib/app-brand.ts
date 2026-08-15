export function systemAppName(localeOverride?: string): string {
  try {
    const locale = (
      localeOverride ?? Intl.DateTimeFormat().resolvedOptions().locale
    ).toLowerCase();
    return locale.startsWith("zh") ? "刻录" : "Chronicle";
  } catch {
    return "Chronicle";
  }
}
