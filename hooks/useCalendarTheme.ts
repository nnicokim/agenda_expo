import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    CALENDAR_THEME_STORAGE_KEY,
    type CalendarThemeKey,
    isCalendarThemeKey,
    resolveCalendarPalette,
} from "../constants/calendarTheme";
import { useColorScheme } from "./use-color-scheme";

interface UseCalendarThemeReturn {
  themeKey: CalendarThemeKey;
  activePalette: ReturnType<typeof resolveCalendarPalette>;
  colorScheme: ReturnType<typeof useColorScheme>;
  persistThemeKey: (nextKey: CalendarThemeKey) => Promise<void>;
  reloadThemePreference: () => Promise<void>;
}

export function useCalendarTheme(): UseCalendarThemeReturn {
  const colorScheme = useColorScheme();
  const [themeKey, setThemeKey] = useState<CalendarThemeKey>("white");

  const loadThemePreference = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(CALENDAR_THEME_STORAGE_KEY);
      if (!stored) return;

      if (isCalendarThemeKey(stored)) {
        setThemeKey(stored);
        return;
      }

      if (stored === "violet") {
        setThemeKey("white");
        await AsyncStorage.setItem(CALENDAR_THEME_STORAGE_KEY, "white");
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    void loadThemePreference();
  }, [loadThemePreference]);

  const activePalette = useMemo(
    () => resolveCalendarPalette(themeKey, colorScheme),
    [themeKey, colorScheme],
  );

  const persistThemeKey = useCallback(async (nextKey: CalendarThemeKey) => {
    setThemeKey(nextKey);
    try {
      await AsyncStorage.setItem(CALENDAR_THEME_STORAGE_KEY, nextKey);
    } catch {
      // no-op
    }
  }, []);

  return {
    themeKey,
    activePalette,
    colorScheme,
    persistThemeKey,
    reloadThemePreference: loadThemePreference,
  };
}
