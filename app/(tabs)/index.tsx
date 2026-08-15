import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { dateKey, formatDay, formatTime, isValidTime, t, type ChronicleEntry, type Locale } from "@/lib/chronicle";
import { useChronicle } from "@/lib/chronicle-store";
import { exportChronicle } from "@/lib/export-chronicle";
import { haptic } from "@/lib/haptics";

type TimelineItem = { type: "day"; key: string; iso: string } | { type: "entry"; key: string; entry: ChronicleEntry };
type DeleteTarget = ChronicleEntry | "all" | null;

function currentTime(): string {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function themeFor(isDark: boolean) {
  return isDark
    ? { background: "#000000", surface: "#1C1C1E", elevated: "#2C2C2E", text: "#F5F5F7", muted: "#98989F", line: "#38383A", inverse: "#FFFFFF" }
    : { background: "#FFFFFF", surface: "#F2F2F7", elevated: "#FFFFFF", text: "#111111", muted: "#6E6E73", line: "#E5E5EA", inverse: "#111111" };
}

export default function HomeScreen() {
  const { entries, locale, theme, isReady, addEntry, deleteEntry, clearEntries, setLocale, setTheme } = useChronicle();
  const [editorOpen, setEditorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [entryText, setEntryText] = useState("");
  const [startTime, setStartTime] = useState(currentTime());
  const [endTime, setEndTime] = useState(currentTime());
  const [isRange, setIsRange] = useState(false);

  const isDark = theme === "dark";
  const colors = themeFor(isDark);
  const copy = (key: Parameters<typeof t>[1]) => t(locale, key);

  const items = useMemo<TimelineItem[]>(() => {
    const result: TimelineItem[] = [];
    let activeDate = "";
    entries.forEach((entry) => {
      const key = dateKey(entry.startAt);
      if (key !== activeDate) {
        result.push({ type: "day", key: `day-${key}`, iso: entry.startAt });
        activeDate = key;
      }
      result.push({ type: "entry", key: entry.id, entry });
    });
    return result;
  }, [entries]);

  const openEditor = () => {
    setEntryText("");
    setStartTime(currentTime());
    setEndTime(currentTime());
    setIsRange(false);
    haptic.light();
    setEditorOpen(true);
  };

  const saveEntry = async () => {
    if (!entryText.trim()) {
      Alert.alert(copy("missingText"));
      return;
    }
    if (!isValidTime(startTime) || (isRange && !isValidTime(endTime))) {
      Alert.alert(copy("invalidTime"));
      return;
    }
    await addEntry({ text: entryText, startTime, endTime: isRange ? endTime : undefined });
    haptic.success();
    setEditorOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget === "all") await clearEntries();
    else await deleteEntry(deleteTarget.id);
    haptic.warning();
    setDeleteTarget(null);
  };

  const handleExport = async () => {
    try {
      const shared = await exportChronicle(entries, locale, copy("shareTitle"));
      if (!shared) Alert.alert(copy("exportUnavailable"));
      else haptic.success();
    } catch {
      Alert.alert(copy("exportUnavailable"));
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<TimelineItem>) => {
    if (item.type === "day") {
      return (
        <View style={styles.dayHeader}>
          <Text style={[styles.dayText, { color: colors.text }]}>{formatDay(item.iso, locale)}</Text>
          <View style={[styles.dayLine, { backgroundColor: colors.line }]} />
        </View>
      );
    }

    const { entry } = item;
    const time = entry.endAt ? `${formatTime(entry.startAt, locale)}–${formatTime(entry.endAt, locale)}` : formatTime(entry.startAt, locale);
    return (
      <View style={styles.timelineRow}>
        <Text style={[styles.timeText, { color: colors.muted }]}>{time}</Text>
        <View style={[styles.dot, { backgroundColor: colors.text }]} />
        <Animated.View entering={FadeInDown.duration(220)} style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: isDark ? colors.line : "transparent" }]}>
          <Text style={[styles.entryText, { color: colors.text }]}>{entry.text}</Text>
          <Pressable
            accessibilityLabel={copy("delete")}
            onPress={() => { haptic.light(); setDeleteTarget(entry); }}
            hitSlop={12}
            style={({ pressed }) => [styles.moreButton, pressed && styles.pressedIcon]}
          >
            <MaterialIcons name="more-horiz" size={22} color={colors.muted} />
          </Pressable>
        </Animated.View>
      </View>
    );
  };

  if (!isReady) {
    return (
      <ScreenContainer containerClassName={isDark ? "bg-black" : "bg-white"} className="items-center justify-center">
        <ActivityIndicator color={colors.text} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName={isDark ? "bg-black" : "bg-white"} className="flex-1">
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.wordmark, { color: colors.text }]}>{copy("appName")}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{copy("today")} · {entries.length} {copy("entries")}</Text>
          </View>
          <Pressable
            accessibilityLabel={copy("settings")}
            onPress={() => { haptic.light(); setSettingsOpen(true); }}
            hitSlop={12}
            style={({ pressed }) => [styles.settingsButton, { backgroundColor: colors.surface }, pressed && styles.pressedIcon]}
          >
            <MaterialIcons name="settings" size={20} color={colors.text} />
          </Pressable>
        </View>

        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          style={styles.list}
          contentContainerStyle={items.length ? styles.listContent : styles.emptyListContent}
          ListHeaderComponent={<Text style={[styles.timelineTitle, { color: colors.text }]}>{copy("timeline")}</Text>}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
                <MaterialIcons name="schedule" size={34} color={colors.text} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{copy("emptyTitle")}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>{copy("emptySubtitle")}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />

        <Pressable onPress={openEditor} style={({ pressed }) => [styles.recordButton, { backgroundColor: colors.inverse }, pressed && styles.pressedMain]}>
          <MaterialIcons name="add" size={22} color={colors.background} />
          <Text style={[styles.recordButtonText, { color: colors.background }]}>{copy("add")}</Text>
        </Pressable>
      </View>

      <EditorSheet
        visible={editorOpen}
        colors={colors}
        locale={locale}
        text={entryText}
        startTime={startTime}
        endTime={endTime}
        isRange={isRange}
        onTextChange={setEntryText}
        onStartChange={setStartTime}
        onEndChange={setEndTime}
        onRangeChange={setIsRange}
        onClose={() => setEditorOpen(false)}
        onSave={saveEntry}
      />

      <SettingsSheet
        visible={settingsOpen}
        colors={colors}
        locale={locale}
        isDark={isDark}
        entriesCount={entries.length}
        onClose={() => setSettingsOpen(false)}
        onThemeChange={(next) => { haptic.medium(); setTheme(next ? "dark" : "light"); }}
        onLocaleChange={(next) => { haptic.medium(); setLocale(next); }}
        onExport={handleExport}
        onClear={() => { setSettingsOpen(false); setDeleteTarget("all"); }}
      />

      <ConfirmSheet
        visible={Boolean(deleteTarget)}
        colors={colors}
        locale={locale}
        isAll={deleteTarget === "all"}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </ScreenContainer>
  );
}

function EditorSheet({ visible, colors, locale, text, startTime, endTime, isRange, onTextChange, onStartChange, onEndChange, onRangeChange, onClose, onSave }: {
  visible: boolean; colors: ReturnType<typeof themeFor>; locale: Locale; text: string; startTime: string; endTime: string; isRange: boolean;
  onTextChange: (value: string) => void; onStartChange: (value: string) => void; onEndChange: (value: string) => void; onRangeChange: (value: boolean) => void; onClose: () => void; onSave: () => void;
}) {
  const copy = (key: Parameters<typeof t>[1]) => t(locale, key);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.handle, { backgroundColor: colors.line }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{copy("newRecord")}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface }, pressed && styles.pressedIcon]}>
              <MaterialIcons name="close" size={19} color={colors.text} />
            </Pressable>
          </View>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>{copy("activity")}</Text>
          <TextInput
            value={text}
            onChangeText={onTextChange}
            placeholder={copy("activityPlaceholder")}
            placeholderTextColor={colors.muted}
            multiline
            autoFocus
            maxLength={300}
            style={[styles.activityInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.line }]}
          />
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>{copy("time")}</Text>
          <View style={[styles.segment, { backgroundColor: colors.surface }]}>
            <Pressable onPress={() => { haptic.light(); onRangeChange(false); }} style={[styles.segmentItem, !isRange && { backgroundColor: colors.elevated, shadowColor: colors.text }]}> 
              <Text style={[styles.segmentText, { color: !isRange ? colors.text : colors.muted }]}>{copy("point")}</Text>
            </Pressable>
            <Pressable onPress={() => { haptic.light(); onRangeChange(true); }} style={[styles.segmentItem, isRange && { backgroundColor: colors.elevated, shadowColor: colors.text }]}> 
              <Text style={[styles.segmentText, { color: isRange ? colors.text : colors.muted }]}>{copy("range")}</Text>
            </Pressable>
          </View>
          <View style={styles.timeFields}>
            <TimeField label={isRange ? copy("startTime") : copy("time")} value={startTime} colors={colors} onChange={onStartChange} />
            {isRange ? <TimeField label={copy("endTime")} value={endTime} colors={colors} onChange={onEndChange} /> : null}
          </View>
          <Pressable onPress={onSave} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.inverse }, pressed && styles.pressedMain]}>
            <Text style={[styles.saveText, { color: colors.background }]}>{copy("save")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TimeField({ label, value, colors, onChange }: { label: string; value: string; colors: ReturnType<typeof themeFor>; onChange: (value: string) => void }) {
  return (
    <View style={styles.timeField}>
      <Text style={[styles.timeFieldLabel, { color: colors.muted }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType="numbers-and-punctuation" maxLength={5} selectTextOnFocus style={[styles.timeInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.line }]} />
    </View>
  );
}

function SettingsSheet({ visible, colors, locale, isDark, entriesCount, onClose, onThemeChange, onLocaleChange, onExport, onClear }: {
  visible: boolean; colors: ReturnType<typeof themeFor>; locale: Locale; isDark: boolean; entriesCount: number; onClose: () => void; onThemeChange: (value: boolean) => void; onLocaleChange: (value: Locale) => void; onExport: () => void; onClear: () => void;
}) {
  const copy = (key: Parameters<typeof t>[1]) => t(locale, key);
  const languages: { key: Locale; label: string }[] = [{ key: "zh", label: "简体中文" }, { key: "en", label: "English" }, { key: "ja", label: "日本語" }];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalRoot} onPress={onClose}>
        <Pressable style={[styles.settingsSheet, { backgroundColor: colors.background }]} onPress={() => undefined}>
          <View style={[styles.handle, { backgroundColor: colors.line }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{copy("settings")}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface }, pressed && styles.pressedIcon]}>
              <MaterialIcons name="close" size={19} color={colors.text} />
            </Pressable>
          </View>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>{copy("appearance")}</Text>
          <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: isDark ? colors.line : "transparent" }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeading}><MaterialIcons name={isDark ? "dark-mode" : "light-mode"} size={20} color={colors.text} /><Text style={[styles.settingText, { color: colors.text }]}>{copy("darkMode")}</Text></View>
              <Switch value={isDark} onValueChange={onThemeChange} trackColor={{ false: "#D1D1D6", true: "#6E6E73" }} thumbColor={isDark ? "#FFFFFF" : "#FFFFFF"} />
            </View>
          </View>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>{copy("language")}</Text>
          <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: isDark ? colors.line : "transparent" }]}>
            {languages.map((language, index) => (
              <Pressable key={language.key} onPress={() => onLocaleChange(language.key)} style={({ pressed }) => [styles.languageRow, index < languages.length - 1 && { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth }, pressed && { opacity: 0.6 }]}>
                <Text style={[styles.settingText, { color: colors.text }]}>{language.label}</Text>
                {locale === language.key ? <MaterialIcons name="check" size={20} color={colors.text} /> : null}
              </Pressable>
            ))}
          </View>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>DATA</Text>
          <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: isDark ? colors.line : "transparent" }]}>
            <Pressable onPress={onExport} style={({ pressed }) => [styles.languageRow, { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth }, pressed && { opacity: 0.6 }]}>
              <View style={styles.settingLeading}><MaterialIcons name="ios-share" size={20} color={colors.text} /><Text style={[styles.settingText, { color: colors.text }]}>{copy("export")}</Text></View>
              <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
            </Pressable>
            <Pressable onPress={onClear} disabled={entriesCount === 0} style={({ pressed }) => [styles.languageRow, entriesCount === 0 && { opacity: 0.35 }, pressed && { opacity: 0.6 }]}>
              <View style={styles.settingLeading}><MaterialIcons name="delete-outline" size={20} color={entriesCount ? "#FF453A" : colors.muted} /><Text style={[styles.settingText, { color: entriesCount ? "#FF453A" : colors.muted }]}>{copy("deleteAll")}</Text></View>
              <Text style={[styles.entryCount, { color: colors.muted }]}>{entriesCount}</Text>
            </Pressable>
          </View>
          <Text style={[styles.privacy, { color: colors.muted }]}>{copy("privacy")}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ConfirmSheet({ visible, colors, locale, isAll, onClose, onConfirm }: { visible: boolean; colors: ReturnType<typeof themeFor>; locale: Locale; isAll: boolean; onClose: () => void; onConfirm: () => void }) {
  const copy = (key: Parameters<typeof t>[1]) => t(locale, key);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.confirmRoot}>
        <Pressable style={styles.confirmBackdrop} onPress={onClose} />
        <View style={[styles.confirmCard, { backgroundColor: colors.elevated }]}>
          <View style={[styles.warningIcon, { backgroundColor: colors.surface }]}><MaterialIcons name="delete-outline" size={26} color="#FF453A" /></View>
          <Text style={[styles.confirmTitle, { color: colors.text }]}>{isAll ? copy("confirmClear") : copy("confirmDelete")}</Text>
          <Text style={[styles.confirmHint, { color: colors.muted }]}>{isAll ? copy("clearHint") : copy("deleteOneHint")}</Text>
          <View style={styles.confirmButtons}>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelButton, { backgroundColor: colors.surface }, pressed && styles.pressedMain]}><Text style={[styles.cancelText, { color: colors.text }]}>{copy("cancel")}</Text></Pressable>
            <Pressable onPress={onConfirm} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressedMain]}><Text style={styles.deleteText}>{copy("delete")}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles: Record<string, any> = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 14, paddingBottom: 18 },
  wordmark: { fontSize: 34, lineHeight: 39, fontWeight: "800", letterSpacing: -1.15 },
  subtitle: { marginTop: 3, fontSize: 14, fontWeight: "500" },
  settingsButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  list: { flex: 1 },
  listContent: { paddingBottom: 112 },
  emptyListContent: { flexGrow: 1, paddingBottom: 112 },
  timelineTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.35, marginTop: 7, marginBottom: 14 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, marginBottom: 10 },
  dayText: { fontSize: 13, fontWeight: "700" },
  dayLine: { height: StyleSheet.hairlineWidth, flex: 1 },
  timelineRow: { minHeight: 78, flexDirection: "row", alignItems: "flex-start" },
  timeText: { width: 53, paddingTop: 17, fontSize: 12, fontVariant: ["tabular-nums"], fontWeight: "600" },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 20, marginHorizontal: 10 },
  entryCard: { flex: 1, minHeight: 62, borderRadius: 18, paddingVertical: 15, paddingLeft: 16, paddingRight: 42, marginBottom: 12, borderWidth: StyleSheet.hairlineWidth },
  entryText: { fontSize: 16, lineHeight: 22, fontWeight: "500" },
  moreButton: { position: "absolute", right: 9, top: 10, width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyTitle: { fontSize: 19, fontWeight: "700", letterSpacing: -0.25 },
  emptySubtitle: { marginTop: 7, fontSize: 15, textAlign: "center" },
  recordButton: { position: "absolute", right: 20, bottom: 24, height: 54, borderRadius: 27, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 7, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  recordButtonText: { fontSize: 16, fontWeight: "700" },
  pressedMain: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  pressedIcon: { opacity: 0.6 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.34)" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10 },
  settingsSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 34, paddingTop: 10 },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 15 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 21 },
  sheetTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.45 },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  fieldLabel: { marginBottom: 8, fontSize: 13, fontWeight: "700" },
  activityInput: { minHeight: 100, maxHeight: 150, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, lineHeight: 22, textAlignVertical: "top", borderWidth: StyleSheet.hairlineWidth, marginBottom: 20 },
  segment: { height: 38, flexDirection: "row", borderRadius: 10, padding: 3, marginBottom: 16 },
  segmentItem: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  segmentText: { fontSize: 13, fontWeight: "700" },
  timeFields: { flexDirection: "row", gap: 12, marginBottom: 24 },
  timeField: { flex: 1 },
  timeFieldLabel: { fontSize: 12, fontWeight: "700", marginBottom: 7 },
  timeInput: { borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, height: 46, paddingHorizontal: 13, fontSize: 16, fontWeight: "600", fontVariant: ["tabular-nums"] },
  saveButton: { height: 53, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  saveText: { fontSize: 16, fontWeight: "800" },
  sectionLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.75, marginTop: 2, marginBottom: 8 },
  settingsGroup: { borderRadius: 16, overflow: "hidden", marginBottom: 21, borderWidth: StyleSheet.hairlineWidth },
  settingRow: { minHeight: 53, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingLeading: { flexDirection: "row", alignItems: "center", gap: 11 },
  settingText: { fontSize: 16, fontWeight: "500" },
  languageRow: { minHeight: 51, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  entryCount: { fontSize: 15, fontWeight: "600", fontVariant: ["tabular-nums"] },
  privacy: { textAlign: "center", fontSize: 13, lineHeight: 18, paddingHorizontal: 22 },
  confirmRoot: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  confirmBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  confirmCard: { width: "100%", maxWidth: 360, borderRadius: 24, padding: 22, alignItems: "center" },
  warningIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 15 },
  confirmTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.35, textAlign: "center" },
  confirmHint: { marginTop: 8, fontSize: 14, lineHeight: 20, textAlign: "center" },
  confirmButtons: { flexDirection: "row", gap: 10, width: "100%", marginTop: 22 },
  cancelButton: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 15, fontWeight: "700" },
  deleteButton: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FF453A" },
  deleteText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
