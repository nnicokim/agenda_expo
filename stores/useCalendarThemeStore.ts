import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  CALENDAR_THEME_STORAGE_KEY,
  type CalendarThemeKey,
  isCalendarThemeKey,
} from "../constants/calendarTheme";

interface CalendarThemeStoreState {
  themeKey: CalendarThemeKey;
  loadThemePreference: () => Promise<void>;
  persistThemeKey: (nextKey: CalendarThemeKey) => Promise<void>;
}

export const useCalendarThemeStore = create<CalendarThemeStoreState>(
  (set) => ({
    themeKey: "white",

    loadThemePreference: async () => {
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
