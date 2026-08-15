import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
  formatTime,
  type ChronicleEntry,
  type Locale,
  type TimeZonePreference,
} from "@/lib/chronicle";

export interface ChroniclePalette {
  background: string;
  surface: string;
  elevated: string;
  text: string;
  muted: string;
  line: string;
  inverse: string;
}

interface TimelineEntryRowProps {
  entry: ChronicleEntry;
  locale: Locale;
  timeZone: TimeZonePreference;
  colors: ChroniclePalette;
  isDark: boolean;
  deleteLabel: string;
  onDelete: (entry: ChronicleEntry) => void;
}

export const TimelineEntryRow = memo(function TimelineEntryRow({
  entry,
  locale,
  timeZone,
  colors,
  isDark,
  deleteLabel,
  onDelete,
}: TimelineEntryRowProps) {
  const time = entry.endAt
    ? `${formatTime(entry.startAt, locale, timeZone)}–${formatTime(entry.endAt, locale, timeZone)}`
    : formatTime(entry.startAt, locale, timeZone);

  return (
    <View style={styles.row}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.74}
        style={[styles.time, { color: colors.muted }]}
      >
        {time}
      </Text>
      <View style={[styles.dot, { backgroundColor: colors.text }]} />
      <Animated.View
        entering={Platform.OS === "web" ? undefined : FadeInDown.duration(220)}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? colors.line : "transparent",
          },
        ]}
      >
        <Text style={[styles.text, { color: colors.text }]}>{entry.text}</Text>
        <Pressable
          accessibilityLabel={deleteLabel}
          onPress={() => onDelete(entry)}
          hitSlop={12}
          style={({ pressed }) => [
            styles.moreButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons name="more-horiz" size={22} color={colors.muted} />
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 78, flexDirection: "row", alignItems: "flex-start" },
  time: {
    width: 94,
    paddingTop: 17,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 20,
    marginHorizontal: 10,
  },
  card: {
    flex: 1,
    minHeight: 62,
    borderRadius: 18,
    paddingVertical: 15,
    paddingLeft: 16,
    paddingRight: 42,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: 16, lineHeight: 22, fontWeight: "500" },
  moreButton: {
    position: "absolute",
    right: 9,
    top: 10,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
});
