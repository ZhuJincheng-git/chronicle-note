import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { defaultChronicleState, sortEntries, zonedDateTimeToIso, type ChronicleEntry, type ChronicleState, type Locale, type ThemeMode, type TimeZonePreference } from "@/lib/chronicle";

const STORAGE_KEY = "chronicle-state-v1";

interface ChronicleContextValue extends ChronicleState {
  isReady: boolean;
  addEntry: (input: { text: string; date: string; startTime: string; endTime?: string }) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  clearEntries: () => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setTimeZone: (timeZone: TimeZonePreference) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
}

const ChronicleContext = createContext<ChronicleContextValue | null>(null);

function normalizeState(value: Partial<ChronicleState>): ChronicleState {
  return {
    entries: Array.isArray(value.entries) ? sortEntries(value.entries) : [],
    locale: value.locale === "en" || value.locale === "ja" || value.locale === "ko" || value.locale === "es" || value.locale === "fr" || value.locale === "de" ? value.locale : "zh",
    theme: value.theme === "dark" ? "dark" : "light",
    timeZone: typeof value.timeZone === "string" && value.timeZone ? value.timeZone : "system",
    hapticsEnabled: value.hapticsEnabled !== false,
  };
}

export function ChronicleProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<ChronicleState>(defaultChronicleState);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setState(normalizeState(JSON.parse(stored)));
      })
      .catch(() => undefined)
      .finally(() => setIsReady(true));
  }, []);

  const persist = useCallback(async (next: ChronicleState) => {
    setState(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addEntry = useCallback(async (input: { text: string; date: string; startTime: string; endTime?: string }) => {
    const startAt = zonedDateTimeToIso(input.date, input.startTime, state.timeZone);
    const endAt = input.endTime ? zonedDateTimeToIso(input.date, input.endTime, state.timeZone) : undefined;
    if (!startAt || (input.endTime && !endAt)) throw new Error("Invalid zoned date and time");
    const entry: ChronicleEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: input.text.trim(),
      startAt,
      endAt: endAt ?? undefined,
      createdAt: new Date().toISOString(),
    };
    const next = { ...state, entries: sortEntries([entry, ...state.entries]) };
    await persist(next);
  }, [persist, state]);

  const deleteEntry = useCallback(async (id: string) => {
    await persist({ ...state, entries: state.entries.filter((entry) => entry.id !== id) });
  }, [persist, state]);

  const clearEntries = useCallback(async () => {
    await persist({ ...state, entries: [] });
  }, [persist, state]);

  const setLocale = useCallback(async (locale: Locale) => {
    await persist({ ...state, locale });
  }, [persist, state]);

  const setTheme = useCallback(async (theme: ThemeMode) => {
    await persist({ ...state, theme });
  }, [persist, state]);

  const setTimeZone = useCallback(async (timeZone: TimeZonePreference) => {
    await persist({ ...state, timeZone });
  }, [persist, state]);

  const setHapticsEnabled = useCallback(async (hapticsEnabled: boolean) => {
    await persist({ ...state, hapticsEnabled });
  }, [persist, state]);

  const value = useMemo(() => ({ ...state, isReady, addEntry, deleteEntry, clearEntries, setLocale, setTheme, setTimeZone, setHapticsEnabled }), [addEntry, clearEntries, deleteEntry, isReady, setHapticsEnabled, setLocale, setTheme, setTimeZone, state]);

  return <ChronicleContext.Provider value={value}>{children}</ChronicleContext.Provider>;
}

export function useChronicle(): ChronicleContextValue {
  const context = useContext(ChronicleContext);
  if (!context) throw new Error("useChronicle must be used within ChronicleProvider");
  return context;
}
