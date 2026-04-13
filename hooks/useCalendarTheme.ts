import { useEffect, useMemo } from "react";
import {
  type CalendarThemeKey,
  resolveCalendarPalette,
} from "../constants/calendarTheme";
import { useCalendarThemeStore } from "../stores/useCalendarThemeStore";
import { useColorScheme } from "./useColorScheme";

interface UseCalendarThemeReturn {
  themeKey: CalendarThemeKey;
  activePalette: ReturnType<typeof resolveCalendarPalette>;
  colorScheme: ReturnType<typeof useColorScheme>;
  persistThemeKey: (nextKey: CalendarThemeKey) => Promise<void>;
  reloadThemePreference: () => Promise<void>;
}

export function useCalendarTheme(): UseCalendarThemeReturn {
  const colorScheme = useColorScheme();
  const themeKey = useCalendarThemeStore((state) => state.themeKey);
  const hasLoadedPreference = useCalendarThemeStore(
    (state) => state.hasLoadedPreference,
  );
  const loadThemePreference = useCalendarThemeStore(
    (state) => state.loadThemePreference,
  );
  const persistThemeKey = useCalendarThemeStore(
    (state) => state.persistThemeKey,
  );

  useEffect(() => {
    if (hasLoadedPreference) return;
    void loadThemePreference();
  }, [hasLoadedPreference, loadThemePreference]);

  const activePalette = useMemo(
    () => resolveCalendarPalette(themeKey, colorScheme),
    [themeKey, colorScheme],
  );

  return {
    themeKey,
    activePalette,
    colorScheme,
    persistThemeKey,
    reloadThemePreference: loadThemePreference,
  };
}
