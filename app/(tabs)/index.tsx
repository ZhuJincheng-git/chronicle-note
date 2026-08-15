import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useMemo, useRef, useState } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import {
  currentDateInTimeZone,
  currentTimeInTimeZone,
  dateKey,
  formatDay,
  formatTime,
  getSystemTimeZone,
  isEndAfterStart,
  isPastOrNow,
  t,
  type ChronicleEntry,
  type Locale,
  type TimeZonePreference,
} from "@/lib/chronicle";
import { useChronicle } from "@/lib/chronicle-store";
import { exportChronicle } from "@/lib/export-chronicle";
import { haptic } from "@/lib/haptics";
import { buildActivitySummary } from "@/lib/activity-stats";
import { systemAppName } from "../../lib/app-brand";

type TimelineSection = { data: ChronicleEntry[]; iso: string; key: string };
type DeleteTarget = ChronicleEntry | "all" | null;

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
function previousMinute(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const total = hours * 60 + minutes;
  if (total === 0) return time;
  const next = total - 1;
  return `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
}
const LANGUAGE_OPTIONS: Record<Locale, string> = { zh: "简体中文", en: "English", ja: "日本語", ko: "한국어", es: "Español", fr: "Français", de: "Deutsch" };
const TIME_ZONES = [
  "UTC", "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow", "Africa/Cairo", "Africa/Johannesburg", "Asia/Dubai", "Asia/Kolkata", "Asia/Bangkok", "Asia/Shanghai", "Asia/Hong_Kong", "Asia/Singapore", "Asia/Taipei", "Asia/Tokyo", "Asia/Seoul", "Australia/Perth", "Australia/Sydney", "Pacific/Auckland",
];

function themeFor(isDark: boolean) {
  return isDark
    ? { background: "#000000", surface: "#1C1C1E", elevated: "#2C2C2E", text: "#F5F5F7", muted: "#98989F", line: "#38383A", inverse: "#FFFFFF" }
    : { background: "#FFFFFF", surface: "#F2F2F7", elevated: "#FFFFFF", text: "#111111", muted: "#6E6E73", line: "#E5E5EA", inverse: "#111111" };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function splitDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function splitTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return { hour, minute };
}

export default function HomeScreen() {
  const { entries, locale, theme, timeZone, hapticsEnabled, isReady, addEntry, deleteEntry, clearEntries, setLocale, setTheme, setTimeZone, setHapticsEnabled } = useChronicle();
  const insets = useSafeAreaInsets();
  const [editorOpen, setEditorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [exportFormatOpen, setExportFormatOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [timeZoneOpen, setTimeZoneOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<"start" | "end" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [entryText, setEntryText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState(currentDateInTimeZone(timeZone));
  const [startTime, setStartTime] = useState(currentTimeInTimeZone(timeZone));
  const [endTime, setEndTime] = useState(currentTimeInTimeZone(timeZone));
  const [isRange, setIsRange] = useState(false);

  const isDark = theme === "dark";
  const colors = themeFor(isDark);
  const copy = (key: Parameters<typeof t>[1]) => t(locale, key);

  const sections = useMemo<TimelineSection[]>(() => {
    const grouped = new Map<string, TimelineSection>();
    entries.forEach((entry) => {
      const key = dateKey(entry.startAt, timeZone);
      const section = grouped.get(key) ?? { key, iso: entry.startAt, data: [] };
      section.data.push(entry);
      grouped.set(key, section);
    });
    return [...grouped.values()];
  }, [entries, timeZone]);
  const activitySummary = useMemo(() => buildActivitySummary(entries, timeZone), [entries, timeZone]);

  const openEditor = () => {
    const nowDate = currentDateInTimeZone(timeZone);
    const nowTime = currentTimeInTimeZone(timeZone);
    setEntryText("");
    setFormError(null);
    setEntryDate(nowDate);
    setStartTime(nowTime);
    setEndTime(nowTime);
    setIsRange(false);
    haptic.light();
    setEditorOpen(true);
  };

  const saveEntry = async () => {
    if (!entryText.trim()) {
      setFormError(copy("missingText"));
      haptic.warning();
      return;
    }
    if (!isPastOrNow(entryDate, startTime, timeZone) || (isRange && !isPastOrNow(entryDate, endTime, timeZone))) {
      setFormError(copy("futureTime"));
      haptic.warning();
      return;
    }
    if (isRange && !isEndAfterStart(entryDate, startTime, endTime, timeZone)) {
      setFormError(copy("invalidRange"));
      haptic.warning();
      return;
    }
    await addEntry({ text: entryText, date: entryDate, startTime, endTime: isRange ? endTime : undefined });
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

  const handleExport = async (format: "text" | "json") => {
    try {
      const shared = await exportChronicle(entries, locale, timeZone, copy("shareTitle"), format);
      if (!shared) Alert.alert(copy("exportUnavailable"));
      else haptic.success();
    } catch {
      Alert.alert(copy("exportUnavailable"));
    }
  };

  const renderEntry = ({ item: entry }: ListRenderItemInfo<ChronicleEntry>) => {
    const time = entry.endAt ? `${formatTime(entry.startAt, locale, timeZone)}–${formatTime(entry.endAt, locale, timeZone)}` : formatTime(entry.startAt, locale, timeZone);
    return (
      <View style={styles.timelineRow}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.74} style={[styles.timeText, { width: 94, color: colors.muted }]}>{time}</Text>
        <View style={[styles.dot, { backgroundColor: colors.text }]} />
        <Animated.View entering={Platform.OS === "web" ? undefined : FadeInDown.duration(220)} style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: isDark ? colors.line : "transparent" }]}>
          <Text style={[styles.entryText, { color: colors.text }]}>{entry.text}</Text>
          <Pressable accessibilityLabel={copy("delete")} onPress={() => { haptic.light(); setDeleteTarget(entry); }} hitSlop={12} style={({ pressed }) => [styles.moreButton, pressed && styles.pressedIcon]}>
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
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName={isDark ? "bg-black" : "bg-white"} className="flex-1">
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.wordmark, { color: colors.text }]}>{systemAppName()}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{copy("today")} · {entries.length} {copy("entries")}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable accessibilityLabel="Statistics" onPress={() => { haptic.light(); setStatsOpen(true); }} hitSlop={12} style={({ pressed }) => [styles.settingsButton, { backgroundColor: colors.surface }, pressed && styles.pressedIcon]}><MaterialIcons name="bar-chart" size={20} color={colors.text} /></Pressable>
            <Pressable accessibilityLabel={copy("settings")} onPress={() => { haptic.light(); setSettingsOpen(true); }} hitSlop={12} style={({ pressed }) => [styles.settingsButton, { backgroundColor: colors.surface }, pressed && styles.pressedIcon]}><MaterialIcons name="settings" size={20} color={colors.text} /></Pressable>
          </View>
        </View>

        <SectionList
          sections={sections}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={[sections.length ? styles.listContent : styles.emptyListContent, { paddingBottom: Math.max(insets.bottom + 108, 128) }]}
          ListHeaderComponent={<Text style={[styles.timelineTitle, { color: colors.text }]}>{copy("timeline")}</Text>}
          renderSectionHeader={({ section }) => <View style={{ marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, backgroundColor: colors.background }}><View style={[styles.dayHeader, { marginTop: 0, marginBottom: 0 }]}><Text style={[styles.dayText, { color: colors.text }]}>{formatDay(section.iso, locale, timeZone)}</Text><View style={[styles.dayLine, { backgroundColor: colors.line }]} /></View></View>}
          stickySectionHeadersEnabled
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}><MaterialIcons name="schedule" size={34} color={colors.text} /></View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{copy("emptyTitle")}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>{copy("emptySubtitle")}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />

        <Pressable onPress={openEditor} style={({ pressed }) => [styles.recordButton, { backgroundColor: colors.inverse, bottom: 16, zIndex: 100, elevation: 100 }, pressed && styles.pressedMain]}>
          <MaterialIcons name="add" size={22} color={colors.background} />
          <Text style={[styles.recordButtonText, { color: colors.background }]}>{copy("add")}</Text>
        </Pressable>
      </View>

      <EditorSheet visible={editorOpen} colors={colors} locale={locale} date={entryDate} text={entryText} errorMessage={formError} startTime={startTime} endTime={endTime} isRange={isRange} onTextChange={(value) => { setEntryText(value); if (formError) setFormError(null); }} onRangeChange={(next) => { if (next && startTime >= endTime) setStartTime(previousMinute(endTime)); setIsRange(next); }} onDatePress={() => { setEditorOpen(false); setDatePickerOpen(true); }} onStartPress={() => { setEditorOpen(false); setTimePickerTarget("start"); }} onEndPress={() => { setEditorOpen(false); setTimePickerTarget("end"); }} onClose={() => setEditorOpen(false)} onSave={saveEntry} />
      <StatsSheet visible={statsOpen} colors={colors} locale={locale} summary={activitySummary} onClose={() => setStatsOpen(false)} />
      <DatePickerSheet visible={datePickerOpen} value={entryDate} locale={locale} timeZone={timeZone} colors={colors} onClose={() => { setDatePickerOpen(false); setEditorOpen(true); }} onConfirm={(value) => { setEntryDate(value); setDatePickerOpen(false); setEditorOpen(true); }} />
      <TimePickerSheet visible={Boolean(timePickerTarget)} value={timePickerTarget === "end" ? endTime : startTime} date={entryDate} locale={locale} timeZone={timeZone} colors={colors} minimumTime={timePickerTarget === "end" && isRange ? startTime : undefined} maximumTime={timePickerTarget === "start" && isRange ? endTime : undefined} onClose={() => { setTimePickerTarget(null); setEditorOpen(true); }} onConfirm={(value) => { if (timePickerTarget === "end") setEndTime(value); else setStartTime(value); setTimePickerTarget(null); setEditorOpen(true); }} />
      <SettingsSheet visible={settingsOpen} colors={colors} locale={locale} isDark={isDark} hapticsEnabled={hapticsEnabled} entriesCount={entries.length} timeZone={timeZone} onClose={() => setSettingsOpen(false)} onThemeChange={(next) => { haptic.medium(); setTheme(next ? "dark" : "light"); }} onHapticsChange={(next) => { if (next) haptic.medium(); setHapticsEnabled(next); }} onLocaleChange={() => { setSettingsOpen(false); setLanguageOpen(true); }} onTimeZonePress={() => { setSettingsOpen(false); setTimeZoneOpen(true); }} onExport={() => { setSettingsOpen(false); setExportFormatOpen(true); }} onClear={() => { setSettingsOpen(false); setDeleteTarget("all"); }} />
      <ExportFormatSheet visible={exportFormatOpen} colors={colors} locale={locale} onClose={() => { setExportFormatOpen(false); setSettingsOpen(true); }} onSelect={(format) => { setExportFormatOpen(false); handleExport(format); }} />
      <LanguageSheet visible={languageOpen} colors={colors} locale={locale} onClose={() => { setLanguageOpen(false); setSettingsOpen(true); }} onSelect={(value) => { haptic.medium(); setLocale(value); setLanguageOpen(false); setSettingsOpen(true); }} />
      <TimeZoneSheet visible={timeZoneOpen} colors={colors} locale={locale} selected={timeZone} onClose={() => { setTimeZoneOpen(false); setSettingsOpen(true); }} onSelect={(value) => { haptic.medium(); setTimeZone(value); setTimeZoneOpen(false); setSettingsOpen(true); }} />
      <ConfirmSheet visible={Boolean(deleteTarget)} colors={colors} locale={locale} isAll={deleteTarget === "all"} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </ScreenContainer>
  );
}

function EditorSheet({ visible, colors, locale, date, text, errorMessage, startTime, endTime, isRange, onTextChange, onRangeChange, onDatePress, onStartPress, onEndPress, onClose, onSave }: {
  visible: boolean; colors: ReturnType<typeof themeFor>; locale: Locale; date: string; text: string; errorMessage: string | null; startTime: string; endTime: string; isRange: boolean;
  onTextChange: (value: string) => void; onRangeChange: (value: boolean) => void; onDatePress: () => void; onStartPress: () => void; onEndPress: () => void; onClose: () => void; onSave: () => void;
}) {
  const copy = (key: Parameters<typeof t>[1]) => t(locale, key);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.background, maxHeight: "94%" }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
          <View style={[styles.handle, { backgroundColor: colors.line }]} />
          <View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text }]}>{copy("newRecord")}</Text><Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface }, pressed && styles.pressedIcon]}><MaterialIcons name="close" size={19} color={colors.text} /></Pressable></View>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>{copy("activity")}</Text>
          <TextInput value={text} onChangeText={onTextChange} placeholder={copy("activityPlaceholder")} placeholderTextColor={colors.muted} multiline maxLength={300} style={[styles.activityInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.line }]} />
          {errorMessage ? <View style={[{ minHeight: 40, marginTop: -7, marginBottom: 14, paddingHorizontal: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 7 }, { backgroundColor: colors.surface, borderColor: "#FF453A" }]}><MaterialIcons name="error-outline" size={17} color="#FF453A" /><Text style={{ flex: 1, color: "#FF453A", fontSize: 13, fontWeight: "600" }}>{errorMessage}</Text></View> : null}
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>{copy("date")}</Text>
          <Pressable onPress={() => { haptic.light(); onDatePress(); }} style={({ pressed }) => [styles.selectorButton, { backgroundColor: colors.surface, borderColor: colors.line }, pressed && styles.pressedIcon]}>
            <View style={styles.selectorLeading}><MaterialIcons name="calendar-today" size={18} color={colors.text} /><Text style={[styles.selectorValue, { color: colors.text }]}>{date}</Text></View>
            <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>{copy("time")}</Text>
          <View style={[styles.segment, { backgroundColor: colors.surface }]}>
            <Pressable onPress={() => { haptic.light(); onRangeChange(false); }} style={[styles.segmentItem, !isRange && { backgroundColor: colors.elevated }]}><Text style={[styles.segmentText, { color: !isRange ? colors.text : colors.muted }]}>{copy("point")}</Text></Pressable>
            <Pressable onPress={() => { haptic.light(); onRangeChange(true); }} style={[styles.segmentItem, isRange && { backgroundColor: colors.elevated }]}><Text style={[styles.segmentText, { color: isRange ? colors.text : colors.muted }]}>{copy("range")}</Text></Pressable>
          </View>
          <View style={styles.timeFields}>
            <TimeTrigger label={isRange ? copy("startTime") : copy("time")} value={startTime} colors={colors} onPress={onStartPress} />
            {isRange ? <TimeTrigger label={copy("endTime")} value={endTime} colors={colors} onPress={onEndPress} /> : null}
          </View>
          <Pressable onPress={onSave} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.inverse }, pressed && styles.pressedMain]}><Text style={[styles.saveText, { color: colors.background }]}>{copy("save")}</Text></Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TimeTrigger({ label, value, colors, onPress }: { label: string; value: string; colors: ReturnType<typeof themeFor>; onPress: () => void }) {
  return <View style={styles.timeField}><Text style={[styles.timeFieldLabel, { color: colors.muted }]}>{label}</Text><Pressable onPress={() => { haptic.light(); onPress(); }} style={({ pressed }) => [styles.timePickerTrigger, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.line }, pressed && styles.pressedIcon]}><Text style={[styles.timePickerValue, { color: colors.text }]}>{value}</Text><MaterialIcons name="expand-more" size={18} color={colors.muted} /></Pressable></View>;
}

function DatePickerSheet({ visible, value, locale, timeZone, colors, onClose, onConfirm }: { visible: boolean; value: string; locale: Locale; timeZone: TimeZonePreference; colors: ReturnType<typeof themeFor>; onClose: () => void; onConfirm: (value: string) => void }) {
  const copy = (key: Parameters<typeof t>[1]) => t(locale, key);
  const now = splitDate(currentDateInTimeZone(timeZone));
  const initial = splitDate(value);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const yearRef = useRef(initial.year);
  const monthRef = useRef(initial.month);
  const dayRef = useRef(initial.day);
  useEffect(() => { if (visible) { const parts = splitDate(value); yearRef.current = parts.year; monthRef.current = parts.month; dayRef.current = parts.day; setYear(parts.year); setMonth(parts.month); setDay(parts.day); } }, [value, visible]);
  const years = useMemo(() => Array.from({ length: Math.max(1, now.year - 2010 + 1) }, (_, index) => now.year - index), [now.year]);
  const months = useMemo(() => Array.from({ length: year === now.year ? now.month : 12 }, (_, index) => index + 1), [now.month, now.year, year]);
  const days = useMemo(() => Array.from({ length: year === now.year && month === now.month ? now.day : daysInMonth(year, month) }, (_, index) => index + 1), [month, now.day, now.month, now.year, year]);
  const confirm = () => {
    const finalMonth = Math.min(monthRef.current, yearRef.current === now.year ? now.month : 12);
    const finalDay = Math.min(dayRef.current, daysInMonth(yearRef.current, finalMonth), yearRef.current === now.year && finalMonth === now.month ? now.day : 31);
    onConfirm(`${yearRef.current}-${String(finalMonth).padStart(2, "0")}-${String(finalDay).padStart(2, "0")}`);
  };
  return <PickerSheet visible={visible} colors={colors} title={copy("chooseDate")} done={copy("done")} onClose={onClose} onConfirm={confirm}><WheelColumn values={years.map(String)} selected={String(year)} onSelect={(next) => { const nextYear = Number(next); yearRef.current = nextYear; const nextMonth = Math.min(monthRef.current, nextYear === now.year ? now.month : 12); monthRef.current = nextMonth; setYear(nextYear); setMonth(nextMonth); }} colors={colors} /><WheelColumn values={months.map((item) => String(item).padStart(2, "0"))} selected={String(month).padStart(2, "0")} onSelect={(next) => { monthRef.current = Number(next); setMonth(Number(next)); }} colors={colors} /><WheelColumn values={days.map((item) => String(item).padStart(2, "0"))} selected={String(Math.min(day, days.length)).padStart(2, "0")} onSelect={(next) => { dayRef.current = Number(next); setDay(Number(next)); }} colors={colors} /></PickerSheet>;
}

function TimePickerSheet({ visible, value, date, locale, timeZone, colors, minimumTime, maximumTime, onClose, onConfirm }: { visible: boolean; value: string; date: string; locale: Locale; timeZone: TimeZonePreference; colors: ReturnType<typeof themeFor>; minimumTime?: string; maximumTime?: string; onClose: () => void; onConfirm: (value: string) => void }) {
  const copy = (key: Parameters<typeof t>[1]) => t(locale, key);
  const initial = splitTime(value);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const hourRef = useRef(initial.hour);
  const minuteRef = useRef(initial.minute);
  useEffect(() => { if (visible) { const parts = splitTime(value); hourRef.current = parts.hour; minuteRef.current = parts.minute; setHour(parts.hour); setMinute(parts.minute); } }, [value, visible]);
  const isAllowed = (candidateHour: string, candidateMinute: string) => {
    const candidate = `${candidateHour}:${candidateMinute}`;
    return isPastOrNow(date, candidate, timeZone) && (!minimumTime || candidate > minimumTime) && (!maximumTime || candidate < maximumTime);
  };
  const hours = HOURS.filter((candidateHour) => MINUTES.some((candidateMinute) => isAllowed(candidateHour, candidateMinute)));
  const allowedHours = hours.length ? hours : HOURS;
  const minutes = MINUTES.filter((candidateMinute) => isAllowed(String(hour).padStart(2, "0"), candidateMinute));
  const allowedMinutes = minutes.length ? minutes : MINUTES;
  const confirm = () => { const finalValue = `${String(hourRef.current).padStart(2, "0")}:${String(minuteRef.current).padStart(2, "0")}`; if (isPastOrNow(date, finalValue, timeZone)) onConfirm(finalValue); };
  return <PickerSheet visible={visible} colors={colors} title={copy("selectTime")} done={copy("done")} onClose={onClose} onConfirm={confirm}><WheelColumn values={allowedHours} selected={String(hour).padStart(2, "0")} onSelect={(next) => { const nextHour = Number(next); hourRef.current = nextHour; setHour(nextHour); const firstMinute = MINUTES.find((candidate) => isAllowed(next, candidate)); if (firstMinute && !isAllowed(next, String(minuteRef.current).padStart(2, "0"))) { minuteRef.current = Number(firstMinute); setMinute(Number(firstMinute)); } }} colors={colors} /><Text style={[styles.wheelDivider, { color: colors.muted }]}>:</Text><WheelColumn values={allowedMinutes} selected={String(minute).padStart(2, "0")} onSelect={(next) => { minuteRef.current = Number(next); setMinute(Number(next)); }} colors={colors} /></PickerSheet>;
}

function PickerSheet({ visible, colors, title, done, onClose, onConfirm, children }: { visible: boolean; colors: ReturnType<typeof themeFor>; title: string; done: string; onClose: () => void; onConfirm: () => void; children: React.ReactNode }) {
  const itemHeight = 46;
  const panelHeight = 248;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={onClose} /><View style={[styles.pickerSheet, { backgroundColor: colors.background }]}><View style={[styles.handle, { backgroundColor: colors.line }]} /><View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text><Pressable onPress={onConfirm} hitSlop={12}><Text style={[styles.doneText, { color: colors.text }]}>{done}</Text></Pressable></View><View style={[styles.wheelPanel, { height: panelHeight, backgroundColor: colors.surface, borderColor: colors.line }]}><View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", zIndex: 2 }}>{children}</View><View pointerEvents="none" style={{ position: "absolute", zIndex: 1, left: 10, right: 10, top: (panelHeight - itemHeight) / 2, height: itemHeight, borderRadius: 16, backgroundColor: colors.elevated, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line }} /></View></View></View></Modal>;
}

function WheelColumn({ values, selected, onSelect, colors }: { values: string[]; selected: string; onSelect: (value: string) => void; colors: ReturnType<typeof themeFor> }) {
  const itemHeight = 46;
  const viewportHeight = 248;
  const valuesKey = values.join("|");
  const scrollRef = useRef<ScrollView>(null);
  const [centerValue, setCenterValue] = useState(selected);
  const lastOffsetRef = useRef(0);
  const hasMomentumRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollToSelection = (animated = false) => {
    const index = Math.max(0, values.indexOf(selected));
    scrollRef.current?.scrollTo({ y: index * itemHeight, animated });
  };
  const valueAtOffset = (offsetY: number) => {
    const index = Math.max(0, Math.min(values.length - 1, Math.round(offsetY / itemHeight)));
    return values[index];
  };
  const updateCenterValue = (offsetY: number) => {
    lastOffsetRef.current = offsetY;
    const next = valueAtOffset(offsetY);
    if (next) setCenterValue(next);
  };
  const commitOffset = (offsetY: number) => {
    const next = valueAtOffset(offsetY);
    if (!next) return;
    const index = values.indexOf(next);
    scrollRef.current?.scrollTo({ y: index * itemHeight, animated: true });
    setCenterValue(next);
    if (next !== selected) {
      haptic.selection();
      onSelect(next);
    }
  };

  useEffect(() => {
    setCenterValue(selected);
    const index = Math.max(0, valuesKey.split("|").indexOf(selected));
    const timer = setTimeout(() => scrollRef.current?.scrollTo({ y: index * itemHeight, animated: false }), 40);
    return () => {
      clearTimeout(timer);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, [selected, valuesKey]);

  const scheduleSettling = () => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      if (!hasMomentumRef.current) commitOffset(lastOffsetRef.current);
    }, 90);
  };

  return <View style={{ width: 92, height: viewportHeight, overflow: "hidden", zIndex: 2 }}><ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} nestedScrollEnabled snapToInterval={itemHeight} decelerationRate="normal" scrollEventThrottle={16} onLayout={() => scrollToSelection(false)} onScrollBeginDrag={() => { if (settleTimerRef.current) clearTimeout(settleTimerRef.current); }} onMomentumScrollBegin={() => { hasMomentumRef.current = true; if (settleTimerRef.current) clearTimeout(settleTimerRef.current); }} onScroll={(event) => updateCenterValue(event.nativeEvent.contentOffset.y)} onScrollEndDrag={scheduleSettling} onMomentumScrollEnd={(event) => { hasMomentumRef.current = false; commitOffset(event.nativeEvent.contentOffset.y); }} contentContainerStyle={{ paddingVertical: (viewportHeight - itemHeight) / 2 }}>{values.map((value) => { const isSelected = value === centerValue; return <View key={value} style={{ height: itemHeight, alignItems: "center", justifyContent: "center" }}><Text style={[styles.wheelValue, { color: isSelected ? colors.text : colors.muted, fontSize: isSelected ? 30 : 21, fontWeight: isSelected ? "800" : "500", opacity: isSelected ? 1 : 0.56 }]}>{value}</Text></View>; })}</ScrollView></View>;
}

function SettingsSheet({ visible, colors, locale, isDark, hapticsEnabled, entriesCount, timeZone, onClose, onThemeChange, onHapticsChange, onLocaleChange, onTimeZonePress, onExport, onClear }: {
  visible: boolean; colors: ReturnType<typeof themeFor>; locale: Locale; isDark: boolean; hapticsEnabled: boolean; entriesCount: number; timeZone: TimeZonePreference; onClose: () => void; onThemeChange: (value: boolean) => void; onHapticsChange: (value: boolean) => void; onLocaleChange: (value: Locale) => void; onTimeZonePress: () => void; onExport: () => void; onClear: () => void;
}) {
  const copy = (key: Parameters<typeof t>[1]) => t(locale, key);
  const languages: { key: Locale; label: string }[] = [{ key: locale, label: LANGUAGE_OPTIONS[locale] }];
  const zoneLabel = timeZone === "system" ? `${copy("systemTimeZone")} · ${getSystemTimeZone()}` : timeZone;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={onClose} /><ScrollView style={[styles.settingsSheet, { backgroundColor: colors.background }]} contentContainerStyle={styles.settingsSheetContent} showsVerticalScrollIndicator={false}><View style={[styles.handle, { backgroundColor: colors.line }]} /><View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text }]}>{copy("settings")}</Text><Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface }, pressed && styles.pressedIcon]}><MaterialIcons name="close" size={19} color={colors.text} /></Pressable></View><Text style={[styles.sectionLabel, { color: colors.muted }]}>{copy("appearance")}</Text><View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: isDark ? colors.line : "transparent" }]}><View style={[styles.settingRow, { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth }]}><View style={styles.settingLeading}><MaterialIcons name={isDark ? "dark-mode" : "light-mode"} size={20} color={colors.text} /><Text style={[styles.settingText, { color: colors.text }]}>{copy("darkMode")}</Text></View><Switch value={isDark} onValueChange={onThemeChange} trackColor={{ false: "#D1D1D6", true: "#6E6E73" }} thumbColor="#FFFFFF" /></View><View style={styles.settingRow}><View style={styles.settingLeading}><MaterialIcons name="vibration" size={20} color={colors.text} /><Text style={[styles.settingText, { color: colors.text }]}>{copy("haptics")}</Text></View><Switch value={hapticsEnabled} onValueChange={onHapticsChange} trackColor={{ false: "#D1D1D6", true: "#6E6E73" }} thumbColor="#FFFFFF" /></View></View><Text style={[styles.sectionLabel, { color: colors.muted }]}>{copy("language")}</Text><View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: isDark ? colors.line : "transparent" }]}>{languages.map((language, index) => <Pressable key={language.key} onPress={() => onLocaleChange(language.key)} style={({ pressed }) => [styles.settingsRowTouch, index < languages.length - 1 && { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth }, pressed && { opacity: 0.6 }]}><View style={styles.settingsRowContent}><Text style={[styles.settingText, { color: colors.text }]}>{language.label}</Text>{locale === language.key ? <MaterialIcons name="check" size={20} color={colors.text} /> : null}</View></Pressable>)}</View><Text style={[styles.sectionLabel, { color: colors.muted }]}>{copy("timeZone")}</Text><View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: isDark ? colors.line : "transparent" }]}><Pressable onPress={onTimeZonePress} style={({ pressed }) => [styles.settingsRowTouch, pressed && { opacity: 0.6 }]}><View style={styles.settingsRowContent}><View style={styles.settingLeading}><MaterialIcons name="public" size={20} color={colors.text} /><View style={styles.timeZoneTextWrap}><Text style={[styles.settingText, { color: colors.text }]}>{copy("timeZone")}</Text><Text numberOfLines={1} style={[styles.timeZoneValue, { color: colors.muted }]}>{zoneLabel}</Text></View></View><MaterialIcons name="chevron-right" size={20} color={colors.muted} /></View></Pressable></View><Text style={[styles.sectionLabel, { color: colors.muted }]}>{copy("data")}</Text><View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: isDark ? colors.line : "transparent" }]}><Pressable onPress={onExport} style={({ pressed }) => [styles.settingsRowTouch, { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth }, pressed && { opacity: 0.6 }]}><View style={styles.settingsRowContent}><View style={styles.settingLeading}><MaterialIcons name="ios-share" size={20} color={colors.text} /><Text style={[styles.settingText, { color: colors.text }]}>{copy("export")}</Text></View><MaterialIcons name="chevron-right" size={20} color={colors.muted} /></View></Pressable><Pressable onPress={onClear} disabled={entriesCount === 0} style={({ pressed }) => [styles.settingsRowTouch, entriesCount === 0 && { opacity: 0.35 }, pressed && { opacity: 0.6 }]}><View style={styles.settingsRowContent}><View style={styles.settingLeading}><MaterialIcons name="delete-outline" size={20} color={entriesCount ? "#FF453A" : colors.muted} /><Text style={[styles.settingText, { color: entriesCount ? "#FF453A" : colors.muted }]}>{copy("deleteAll")}</Text></View><Text style={[styles.entryCount, { color: colors.muted }]}>{entriesCount}</Text></View></Pressable></View><Text style={[styles.privacy, { color: colors.muted }]}>{copy("privacy")}</Text><Text style={[styles.timeZoneHint, { color: colors.muted }]}>{copy("timeZoneHint")}</Text></ScrollView></View></Modal>;
}

function TimeZoneSheet({ visible, colors, locale, selected, onClose, onSelect }: { visible: boolean; colors: ReturnType<typeof themeFor>; locale: Locale; selected: TimeZonePreference; onClose: () => void; onSelect: (value: TimeZonePreference) => void }) {
  const copy = (key: Parameters<typeof t>[1]) => t(locale, key);
  const [query, setQuery] = useState("");
  useEffect(() => { if (visible) setQuery(""); }, [visible]);
  const zones = useMemo(() => Array.from(new Set(TIME_ZONES)).filter((zone) => zone.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const renderZone = ({ item }: ListRenderItemInfo<string>) => <Pressable onPress={() => onSelect(item)} style={({ pressed }) => [styles.timeZoneRow, { borderBottomColor: colors.line }, pressed && { opacity: 0.6 }]}><Text style={[styles.timeZoneRowText, { color: colors.text }]}>{item}</Text>{selected === item ? <MaterialIcons name="check" size={20} color={colors.text} /> : null}</Pressable>;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={onClose} /><View style={[styles.timeZoneSheet, { backgroundColor: colors.background }]}><View style={[styles.handle, { backgroundColor: colors.line }]} /><View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text }]}>{copy("timeZone")}</Text><Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface }, pressed && styles.pressedIcon]}><MaterialIcons name="close" size={19} color={colors.text} /></Pressable></View><TextInput value={query} onChangeText={setQuery} placeholder={copy("timeZone")} placeholderTextColor={colors.muted} autoCapitalize="none" style={[styles.timeZoneSearch, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.line }]} /><Pressable onPress={() => onSelect("system")} style={({ pressed }) => [styles.systemZoneRow, { backgroundColor: colors.surface, borderColor: colors.line }, pressed && { opacity: 0.6 }]}><View><Text style={[styles.settingText, { color: colors.text }]}>{copy("systemTimeZone")}</Text><Text style={[styles.timeZoneValue, { color: colors.muted }]}>{getSystemTimeZone()}</Text></View>{selected === "system" ? <MaterialIcons name="check" size={20} color={colors.text} /> : null}</Pressable><FlatList data={zones} keyExtractor={(item) => item} renderItem={renderZone} style={[styles.timeZoneList, { borderColor: colors.line }]} showsVerticalScrollIndicator={false} /></View></View></Modal>;
}

function LanguageSheet({ visible, colors, locale, onClose, onSelect }: { visible: boolean; colors: ReturnType<typeof themeFor>; locale: Locale; onClose: () => void; onSelect: (value: Locale) => void }) {
  const copy = (key: Parameters<typeof t>[1]) => t(locale, key);
  const languages = Object.keys(LANGUAGE_OPTIONS) as Locale[];
  const renderLanguage = ({ item, index }: ListRenderItemInfo<Locale>) => <Pressable onPress={() => onSelect(item)} style={({ pressed }) => [styles.timeZoneRow, { borderBottomColor: colors.line, borderBottomWidth: index < languages.length - 1 ? StyleSheet.hairlineWidth : 0 }, pressed && { opacity: 0.6 }]}><Text style={[styles.timeZoneRowText, { color: colors.text }]}>{LANGUAGE_OPTIONS[item]}</Text>{item === locale ? <MaterialIcons name="check" size={20} color={colors.text} /> : null}</Pressable>;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={onClose} /><View style={[styles.timeZoneSheet, { backgroundColor: colors.background, height: 420 }]}><View style={[styles.handle, { backgroundColor: colors.line }]} /><View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text }]}>{copy("language")}</Text><Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface }, pressed && styles.pressedIcon]}><MaterialIcons name="close" size={19} color={colors.text} /></Pressable></View><FlatList data={languages} keyExtractor={(item) => item} renderItem={renderLanguage} style={[styles.timeZoneList, { borderColor: colors.line }]} showsVerticalScrollIndicator={false} /></View></View></Modal>;
}

function ConfirmSheet({ visible, colors, locale, isAll, onClose, onConfirm }: { visible: boolean; colors: ReturnType<typeof themeFor>; locale: Locale; isAll: boolean; onClose: () => void; onConfirm: () => void }) {
  const copy = (key: Parameters<typeof t>[1]) => t(locale, key);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.confirmRoot}><Pressable style={styles.confirmBackdrop} onPress={onClose} /><View style={[styles.confirmCard, { backgroundColor: colors.elevated }]}><View style={[styles.warningIcon, { backgroundColor: colors.surface }]}><MaterialIcons name="delete-outline" size={26} color="#FF453A" /></View><Text style={[styles.confirmTitle, { color: colors.text }]}>{isAll ? copy("confirmClear") : copy("confirmDelete")}</Text><Text style={[styles.confirmHint, { color: colors.muted }]}>{isAll ? copy("clearHint") : copy("deleteOneHint")}</Text><View style={styles.confirmButtons}><Pressable onPress={onClose} style={({ pressed }) => [styles.cancelButton, { backgroundColor: colors.surface }, pressed && styles.pressedMain]}><Text style={[styles.cancelText, { color: colors.text }]}>{copy("cancel")}</Text></Pressable><Pressable onPress={onConfirm} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressedMain]}><Text style={styles.deleteText}>{copy("delete")}</Text></Pressable></View></View></View></Modal>;
}

function ExportFormatSheet({ visible, colors, locale, onClose, onSelect }: { visible: boolean; colors: ReturnType<typeof themeFor>; locale: Locale; onClose: () => void; onSelect: (format: "text" | "json") => void }) {
  const copy = (key: Parameters<typeof t>[1]) => t(locale, key);
  const option = (format: "text" | "json", icon: "description" | "data-object", label: string, detail: string) => <Pressable onPress={() => { haptic.medium(); onSelect(format); }} style={({ pressed }) => [{ minHeight: 72, paddingHorizontal: 14, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: StyleSheet.hairlineWidth }, pressed && styles.pressedMain]}><View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" }}><MaterialIcons name={icon} size={20} color={colors.text} /></View><View style={{ flex: 1 }}><Text style={[styles.settingText, { color: colors.text }]}>{label}</Text><Text style={[styles.timeZoneValue, { color: colors.muted }]}>{detail}</Text></View><MaterialIcons name="chevron-right" size={20} color={colors.muted} /></Pressable>;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={onClose} /><View style={[styles.pickerSheet, { backgroundColor: colors.background }]}><View style={[styles.handle, { backgroundColor: colors.line }]} /><View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text }]}>{copy("export")}</Text><Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface }, pressed && styles.pressedIcon]}><MaterialIcons name="close" size={19} color={colors.text} /></Pressable></View><View style={{ gap: 10 }}>{option("text", "description", "TXT", ".txt")}{option("json", "data-object", "JSON", ".json")}</View></View></View></Modal>;
}

function StatsSheet({ visible, colors, locale, summary, onClose }: { visible: boolean; colors: ReturnType<typeof themeFor>; locale: Locale; summary: ReturnType<typeof buildActivitySummary>; onClose: () => void }) {
  const labels: Record<Locale, { title: string; total: string; active: string; streak: string; activity: string }> = {
    zh: { title: "统计", total: "总记录", active: "活跃天数", streak: "当前连续", activity: "过去 12 周" },
    en: { title: "Statistics", total: "Entries", active: "Active days", streak: "Current streak", activity: "Last 12 weeks" },
    ja: { title: "統計", total: "記録数", active: "活動日数", streak: "連続記録", activity: "過去 12 週間" },
    ko: { title: "통계", total: "기록", active: "활동 일수", streak: "연속 기록", activity: "지난 12주" },
    es: { title: "Estadísticas", total: "Registros", active: "Días activos", streak: "Racha actual", activity: "Últimas 12 semanas" },
    fr: { title: "Statistiques", total: "Entrées", active: "Jours actifs", streak: "Série actuelle", activity: "12 dernières semaines" },
    de: { title: "Statistik", total: "Einträge", active: "Aktive Tage", streak: "Aktuelle Serie", activity: "Letzte 12 Wochen" },
  };
  const copy = labels[locale];
  const levelColor = (level: number) => level === 0 ? colors.surface : ["#B9E7C8", "#75C98A", "#2F9E55", "#167B3B"][level - 1];
  const metric = (value: number, label: string) => <View style={{ flex: 1, borderRadius: 16, backgroundColor: colors.surface, paddingVertical: 14, paddingHorizontal: 12 }}><Text style={{ color: colors.text, fontSize: 24, lineHeight: 29, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{value}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{label}</Text></View>;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={onClose} /><View style={[styles.sheet, { backgroundColor: colors.background }]}><View style={[styles.handle, { backgroundColor: colors.line }]} /><View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text }]}>{copy.title}</Text><Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface }, pressed && styles.pressedIcon]}><MaterialIcons name="close" size={19} color={colors.text} /></Pressable></View><View style={{ flexDirection: "row", gap: 8, marginBottom: 23 }}>{metric(summary.totalEntries, copy.total)}{metric(summary.activeDays, copy.active)}{metric(summary.currentStreak, copy.streak)}</View><Text style={[styles.fieldLabel, { color: colors.muted }]}>{copy.activity}</Text><View style={{ borderRadius: 18, backgroundColor: colors.surface, padding: 14 }}><View style={{ flexDirection: "row", gap: 4, justifyContent: "space-between" }}>{summary.weeks.map((week, weekIndex) => <View key={weekIndex} style={{ gap: 4 }}>{week.map((cell) => <View key={cell.date} style={{ width: 15, height: 15, borderRadius: 4, backgroundColor: levelColor(cell.level) }} />)}</View>)}</View></View></View></View></Modal>;
}

const styles: Record<string, any> = StyleSheet.create({
  screen: { flex: 1, position: "relative", paddingHorizontal: 20 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 14, paddingBottom: 18 }, wordmark: { fontSize: 34, lineHeight: 39, fontWeight: "800", letterSpacing: -1.15 }, subtitle: { marginTop: 3, fontSize: 14, fontWeight: "500" }, settingsButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 }, list: { flex: 1 }, listContent: { paddingBottom: 128 }, emptyListContent: { flexGrow: 1, paddingBottom: 128 }, timelineTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.35, marginTop: 7, marginBottom: 14 }, dayHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, marginBottom: 10 }, dayText: { fontSize: 13, fontWeight: "700" }, dayLine: { height: StyleSheet.hairlineWidth, flex: 1 }, timelineRow: { minHeight: 78, flexDirection: "row", alignItems: "flex-start" }, timeText: { width: 53, paddingTop: 17, fontSize: 12, fontVariant: ["tabular-nums"], fontWeight: "600" }, dot: { width: 8, height: 8, borderRadius: 4, marginTop: 20, marginHorizontal: 10 }, entryCard: { flex: 1, minHeight: 62, borderRadius: 18, paddingVertical: 15, paddingLeft: 16, paddingRight: 42, marginBottom: 12, borderWidth: StyleSheet.hairlineWidth }, entryText: { fontSize: 16, lineHeight: 22, fontWeight: "500" }, moreButton: { position: "absolute", right: 9, top: 10, width: 30, height: 30, alignItems: "center", justifyContent: "center" }, emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 }, emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 18 }, emptyTitle: { fontSize: 19, fontWeight: "700", letterSpacing: -0.25 }, emptySubtitle: { marginTop: 7, fontSize: 15, textAlign: "center" }, recordButton: { position: "absolute", right: 20, height: 54, borderRadius: 27, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 7, zIndex: 20, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 }, recordButtonText: { fontSize: 16, fontWeight: "700" }, pressedMain: { transform: [{ scale: 0.97 }], opacity: 0.92 }, pressedIcon: { opacity: 0.6 }, modalRoot: { flex: 1, justifyContent: "flex-end" }, backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.34)" }, sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10 }, pickerSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10 }, settingsSheet: { maxHeight: "88%", borderTopLeftRadius: 28, borderTopRightRadius: 28 }, settingsSheetContent: { paddingHorizontal: 20, paddingBottom: 34, paddingTop: 10 }, timeZoneSheet: { height: "80%", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 22, paddingTop: 10 }, handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 15 }, sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 19 }, sheetTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.45 }, closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }, doneText: { fontSize: 16, fontWeight: "700" }, fieldLabel: { marginBottom: 8, fontSize: 13, fontWeight: "700" }, activityInput: { minHeight: 88, maxHeight: 120, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, lineHeight: 22, textAlignVertical: "top", borderWidth: StyleSheet.hairlineWidth, marginBottom: 17 }, selectorButton: { height: 48, paddingHorizontal: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 17 }, selectorLeading: { flexDirection: "row", alignItems: "center", gap: 10 }, selectorValue: { fontSize: 16, fontWeight: "600", fontVariant: ["tabular-nums"] }, segment: { height: 38, flexDirection: "row", borderRadius: 10, padding: 3, marginBottom: 16 }, segmentItem: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 8 }, segmentText: { fontSize: 13, fontWeight: "700" }, timeFields: { flexDirection: "row", gap: 12, marginBottom: 22 }, timeField: { flex: 1 }, timeFieldLabel: { fontSize: 12, fontWeight: "700", marginBottom: 7 }, timePickerTrigger: { borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, height: 46, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, timePickerValue: { fontSize: 16, fontWeight: "600", fontVariant: ["tabular-nums"] }, saveButton: { height: 53, borderRadius: 17, alignItems: "center", justifyContent: "center" }, saveText: { fontSize: 16, fontWeight: "800" }, wheelPanel: { height: 236, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8 }, wheelColumn: { width: 90, maxHeight: 214 }, wheelColumnContent: { paddingVertical: 70 }, wheelOption: { height: 42, marginHorizontal: 8, borderRadius: 11, alignItems: "center", justifyContent: "center" }, wheelValue: { fontSize: 20, fontWeight: "600", fontVariant: ["tabular-nums"] }, wheelDivider: { fontSize: 24, fontWeight: "700", marginHorizontal: -3 }, sectionLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.75, marginTop: 2, marginBottom: 8 }, settingsGroup: { borderRadius: 16, overflow: "hidden", marginBottom: 21, borderWidth: StyleSheet.hairlineWidth }, settingRow: { minHeight: 53, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, settingLeading: { flexDirection: "row", alignItems: "center", gap: 11, flexShrink: 1 }, settingText: { fontSize: 16, fontWeight: "500" }, settingsRowTouch: { width: "100%" }, settingsRowContent: { minHeight: 52, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, timeZoneTextWrap: { flex: 1 }, timeZoneValue: { marginTop: 2, fontSize: 12, lineHeight: 16 }, entryCount: { fontSize: 15, fontWeight: "600", fontVariant: ["tabular-nums"] }, privacy: { textAlign: "center", fontSize: 13, lineHeight: 18, paddingHorizontal: 22 }, timeZoneHint: { textAlign: "center", fontSize: 12, lineHeight: 17, marginTop: 4, paddingHorizontal: 22 }, timeZoneSearch: { height: 46, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 13, fontSize: 16, marginBottom: 12 }, systemZoneRow: { minHeight: 60, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }, timeZoneList: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth }, timeZoneRow: { minHeight: 48, paddingHorizontal: 5, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, timeZoneRowText: { fontSize: 15, fontWeight: "500" }, confirmRoot: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }, confirmBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" }, confirmCard: { width: "100%", maxWidth: 360, borderRadius: 24, padding: 22, alignItems: "center" }, warningIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 15 }, confirmTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.35, textAlign: "center" }, confirmHint: { marginTop: 8, fontSize: 14, lineHeight: 20, textAlign: "center" }, confirmButtons: { flexDirection: "row", gap: 10, width: "100%", marginTop: 22 }, cancelButton: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" }, cancelText: { fontSize: 15, fontWeight: "700" }, deleteButton: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FF453A" }, deleteText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
