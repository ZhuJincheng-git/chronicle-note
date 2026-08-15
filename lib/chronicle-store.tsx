import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

import { defaultChronicleState, isEndAfterStart, isPastOrNow, sortEntries, zonedDateTimeToIso, type ChronicleEntry, type ChronicleState, type Locale, type ThemeMode, type TimeZonePreference } from "@/lib/chronicle";
import { setHapticsEnabled as configureHaptics } from "@/lib/haptics";

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

function isFiniteDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(new Date(value).getTime());
}

function normalizeEntries(value: unknown): ChronicleEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is ChronicleEntry => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as Partial<ChronicleEntry>;
    if (typeof candidate.id !== "string" || typeof candidate.text !== "string" || !isFiniteDate(candidate.startAt)) return false;
    if (candidate.endAt !== undefined && !isFiniteDate(candidate.endAt)) return false;
    return candidate.endAt === undefined || new Date(candidate.endAt).getTime() > new Date(candidate.startAt).getTime();
  }).map((entry) => ({
    id: entry.id,
    text: entry.text.trim(),
    startAt: entry.startAt,
    endAt: entry.endAt,
    createdAt: isFiniteDate(entry.createdAt) ? entry.createdAt : entry.startAt,
  }));
}

function normalizeState(value: Partial<ChronicleState>): ChronicleState {
  return {
    entries: sortEntries(normalizeEntries(value.entries)),
    locale: value.locale === "en" || value.locale === "ja" || value.locale === "ko" || value.locale === "es" || value.locale === "fr" || value.locale === "de" ? value.locale : "zh",
    theme: value.theme === "dark" ? "dark" : "light",
    timeZone: typeof value.timeZone === "string" && value.timeZone ? value.timeZone : "system",
    hapticsEnabled: value.hapticsEnabled !== false,
  };
}

export function ChronicleProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<ChronicleState>(defaultChronicleState);
  const [isReady, setIsReady] = useState(false);
  const stateRef = useRef(defaultChronicleState);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        try {
          const next = normalizeState(JSON.parse(stored) as Partial<ChronicleState>);
          stateRef.current = next;
          setState(next);
        } catch {
          stateRef.current = defaultChronicleState;
          setState(defaultChronicleState);
          return AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
        }
      })
      .catch(() => undefined)
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => {
    configureHaptics(state.hapticsEnabled);
  }, [state.hapticsEnabled]);

  const persist = useCallback(async (next: ChronicleState) => {
    stateRef.current = next;
    setState(next);
    writeQueueRef.current = writeQueueRef.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)))
      .catch(() => undefined);
    await writeQueueRef.current;
  }, []);

  const addEntry = useCallback(async (input: { text: string; date: string; startTime: string; endTime?: string }) => {
    const text = input.text.trim();
    const current = stateRef.current;
    const startAt = zonedDateTimeToIso(input.date, input.startTime, current.timeZone);
    const endAt = input.endTime ? zonedDateTimeToIso(input.date, input.endTime, current.timeZone) : undefined;
    if (!text) throw new Error("Entry text is required");
    if (!startAt || (input.endTime && !endAt) || !isPastOrNow(input.date, input.startTime, current.timeZone)) throw new Error("Invalid or future start time");
    if (input.endTime && (!isPastOrNow(input.date, input.endTime, current.timeZone) || !isEndAfterStart(input.date, input.startTime, input.endTime, current.timeZone))) throw new Error("Invalid or future end time");
    const entry: ChronicleEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      startAt,
      endAt: endAt ?? undefined,
      createdAt: new Date().toISOString(),
    };
    await persist({ ...current, entries: sortEntries([entry, ...current.entries]) });
  }, [persist]);

  const deleteEntry = useCallback(async (id: string) => {
    const current = stateRef.current;
    await persist({ ...current, entries: current.entries.filter((entry) => entry.id !== id) });
  }, [persist]);

  const clearEntries = useCallback(async () => {
    await persist({ ...stateRef.current, entries: [] });
  }, [persist]);

  const setLocale = useCallback(async (locale: Locale) => {
    await persist({ ...stateRef.current, locale });
  }, [persist]);

  const setTheme = useCallback(async (theme: ThemeMode) => {
    await persist({ ...stateRef.current, theme });
  }, [persist]);

  const setTimeZone = useCallback(async (timeZone: TimeZonePreference) => {
    await persist({ ...stateRef.current, timeZone });
  }, [persist]);

  const setHapticsEnabled = useCallback(async (hapticsEnabled: boolean) => {
    await persist({ ...stateRef.current, hapticsEnabled });
  }, [persist]);

  const value = useMemo(() => ({ ...state, isReady, addEntry, deleteEntry, clearEntries, setLocale, setTheme, setTimeZone, setHapticsEnabled }), [addEntry, clearEntries, deleteEntry, isReady, setHapticsEnabled, setLocale, setTheme, setTimeZone, state]);

  return <ChronicleContext.Provider value={value}>{children}</ChronicleContext.Provider>;
}

export function useChronicle(): ChronicleContextValue {
  const context = useContext(ChronicleContext);
  if (!context) throw new Error("useChronicle must be used within ChronicleProvider");
  return context;
}
