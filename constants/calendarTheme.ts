export const CALENDAR_THEME_STORAGE_KEY = "calendar_color_theme";

export type CalendarThemeKey =
  | "white"
  | "black"
  | "dark-blue"
  | "light-red"
  | "light-orange"
  | "light-green"
  | "device";

export type CalendarPalette = {
  screenBg: string;
  cardBg: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentSoft: string;
  daySelectedText: string;
  done: string;
  danger: string;
};

export const PALETTES: Record<
  Exclude<CalendarThemeKey, "device">,
  CalendarPalette
> = {
  white: {
    screenBg: "#FFFFFF",
    cardBg: "#FFFFFF",
    text: "#1F2937",
    textMuted: "#374151",
    border: "#D1D5DB",
    accent: "#4B5563",
    accentSoft: "#6B7280",
    daySelectedText: "#FFFFFF",
    done: "#2E8B57",
    danger: "#B23A3A",
  },
  black: {
    screenBg: "#0B0B0B",
    cardBg: "#0B0B0B",
    text: "#F8FAFC",
    textMuted: "#CBD5E1",
    border: "#1F2937",
    accent: "#90A1B9",
    accentSoft: "#E5E7EB",
    daySelectedText: "#0B0B0B",
    done: "#3D9970",
    danger: "#F87171",
  },
  "dark-blue": {
    screenBg: "#0D1B2A",
    cardBg: "#0D1B2A",
    text: "#F8FAFC",
    textMuted: "#D1E3F5",
    border: "#1F4060",
    accent: "#60A5FA",
    accentSoft: "#93C5FD",
    daySelectedText: "#0D1B2A",
    done: "#3D9970",
    danger: "#F87171",
  },
  "light-red": {
    screenBg: "#F6B6C1",
    cardBg: "#F6B6C1",
    text: "#FFFFFF",
    textMuted: "#FFEFF3",
    border: "#E68EA0",
    accent: "#C85570",
    accentSoft: "#DD738D",
    daySelectedText: "#FFFFFF",
    done: "#2F855A",
    danger: "#8B1E3F",
  },
  "light-orange": {
    screenBg: "#FFD6A5",
    cardBg: "#FFD6A5",
    text: "#7A3E00",
    textMuted: "#9A5A1E",
    border: "#F2B880",
    accent: "#D97706",
    accentSoft: "#EA9A3B",
    daySelectedText: "#FFFFFF",
    done: "#2F855A",
    danger: "#B23A3A",
  },
  "light-green": {
    screenBg: "#8ED6A5",
    cardBg: "#8ED6A5",
    text: "#FFFFFF",
    textMuted: "#F5FFF7",
    border: "#70C58E",
    accent: "#2F855A",
    accentSoft: "#38A169",
    daySelectedText: "#FFFFFF",
    done: "#22543D",
    danger: "#8B1E3F",
  },
};

export const CIRCLE_OPTIONS: Array<Exclude<CalendarThemeKey, "device">> = [
  "white",
  "black",
  "dark-blue",
  "light-red",
  "light-orange",
  "light-green",
];

export function isCalendarThemeKey(value: string): value is CalendarThemeKey {
  return (
    value === "white" ||
    value === "black" ||
    value === "dark-blue" ||
    value === "light-red" ||
    value === "light-orange" ||
    value === "light-green" ||
    value === "device"
  );
}

export function resolveCalendarPalette(
  themeKey: CalendarThemeKey,
  colorScheme?: "light" | "dark" | null,
): CalendarPalette {
  if (themeKey === "device") {
    return colorScheme === "dark" ? PALETTES.black : PALETTES.white;
  }

  return PALETTES[themeKey];
}
