import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import {
  buildExport,
  type ChronicleEntry,
  type Locale,
  type TimeZonePreference,
} from "@/lib/chronicle";

export type ExportFormat = "text" | "json";

export async function exportChronicle(
  entries: ChronicleEntry[],
  locale: Locale,
  timeZone: TimeZonePreference,
  shareTitle: string,
  format: ExportFormat = "text",
): Promise<boolean> {
  const content =
    format === "json"
      ? JSON.stringify(
          {
            version: 1,
            exportedAt: new Date().toISOString(),
            timeZone,
            entries,
          },
          null,
          2,
        )
      : buildExport(entries, locale, timeZone);
  const extension = format === "json" ? "json" : "txt";
  const mimeType = format === "json" ? "application/json" : "text/plain";

  if (Platform.OS === "web") {
    if (typeof document === "undefined") return false;
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chronicle-${new Date().toISOString().slice(0, 10)}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable || !FileSystem.cacheDirectory) return false;

  const fileUri = `${FileSystem.cacheDirectory}chronicle-${new Date().toISOString().slice(0, 10)}.${extension}`;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(fileUri, {
    dialogTitle: shareTitle,
    mimeType,
    UTI: format === "json" ? "public.json" : "public.plain-text",
  });
  return true;
}
