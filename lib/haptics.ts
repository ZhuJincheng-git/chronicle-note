import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

let isHapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean) {
  isHapticsEnabled = enabled;
}

function canHaptic() {
  return isHapticsEnabled && Platform.OS !== "web";
}

export const haptic = {
  light: () => {
    if (canHaptic()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  medium: () => {
    if (canHaptic()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  success: () => {
    if (canHaptic())
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  selection: () => {
    if (canHaptic()) Haptics.selectionAsync();
  },
  warning: () => {
    if (canHaptic())
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};
