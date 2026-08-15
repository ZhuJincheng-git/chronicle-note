import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { buildExport, type ChronicleEntry, type Locale } from "@/lib/chronicle";

export async function exportChronicle(entries: ChronicleEntry[], locale: Locale, shareTitle: string): Promise<boolean> {
  const content = buildExport(entries, locale);

  if (Platform.OS === "web") {
    if (typeof document === "undefined") return false;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chronicle-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable || !FileSystem.cacheDirectory) return false;

  const fileUri = `${FileSystem.cacheDirectory}chronicle-${new Date().toISOString().slice(0, 10)}.txt`;
  await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(fileUri, {
    dialogTitle: shareTitle,
    mimeType: "text/plain",
    UTI: "public.plain-text",
  });
  return true;
}
