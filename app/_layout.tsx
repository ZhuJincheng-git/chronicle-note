import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ChronicleProvider, useChronicle } from "@/lib/chronicle-store";

export default function RootLayout() {
  return (
    <ChronicleProvider>
      <ChronicleNavigator />
    </ChronicleProvider>
  );
}

function ChronicleNavigator() {
  const { theme } = useChronicle();

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
