import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  CALENDAR_THEME_STORAGE_KEY,
  type CalendarThemeKey,
  isCalendarThemeKey,
} from "../constants/calendarTheme";

interface CalendarThemeStoreState {
  // para indicar la forma exacta del Store al hacer "create"
  themeKey: CalendarThemeKey;
  hasLoadedPreference: boolean;
  loadThemePreference: () => Promise<void>;
  persistThemeKey: (nextKey: CalendarThemeKey) => Promise<void>;
}

export const useCalendarThemeStore = create<CalendarThemeStoreState>(
  (set, get) => ({
    // se define el store con su estado y sus acciones
    themeKey: "white",
    hasLoadedPreference: false,

    loadThemePreference: async () => {
      if (get().hasLoadedPreference) return;

      try {
        const stored = await AsyncStorage.getItem(CALENDAR_THEME_STORAGE_KEY);
        if (!stored) return;

        if (isCalendarThemeKey(stored)) {
          set({ themeKey: stored });
          return;
        }

        if (stored === "violet") {
          set({ themeKey: "white" });
          await AsyncStorage.setItem(CALENDAR_THEME_STORAGE_KEY, "white");
        }
      } catch {
        // no-op
      } finally {
        set({ hasLoadedPreference: true });
      }
    },

    persistThemeKey: async (nextKey) => {
      set({ themeKey: nextKey });

      try {
        await AsyncStorage.setItem(CALENDAR_THEME_STORAGE_KEY, nextKey);
      } catch {
        // no-op
      }
    },
  }),
);
