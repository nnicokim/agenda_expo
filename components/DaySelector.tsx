import { useMemo } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import type { CalendarPalette } from "../constants/calendarTheme";
import type { TasksByDate } from "../services/taskService";
import { getDayLabel, getDayNumber } from "../utils/dateUtils";

interface DaySelectorProps {
  weekDates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  tasksByDate: TasksByDate;
  themeColors: CalendarPalette;
}

export default function DaySelector({
  weekDates,
  selectedDate,
  onSelectDate,
  tasksByDate,
  themeColors,
}: DaySelectorProps) {
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
    >
      {weekDates.map((date) => {
        const isActive = date === selectedDate;
        const tasks = tasksByDate[date] ?? [];
        const hasTasks = tasks.length > 0;
        const allDone = hasTasks && tasks.every((t) => t.done);

        return (
          <TouchableOpacity
            key={date}
            style={[styles.dayBtn, isActive && styles.dayBtnActive]}
            onPress={() => onSelectDate(date)}
            activeOpacity={0.75}
          >
            <Text style={[styles.dayLabel, isActive && styles.dayLabelActive]}>
              {getDayLabel(date)}
            </Text>

            <Text style={[styles.dayNum, isActive && styles.dayNumActive]}>
              {getDayNumber(date)}
            </Text>

            {hasTasks && (
              <View
                style={[
                  styles.dot,
                  allDone ? styles.dotDone : styles.dotPending,
                ]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function createStyles(colors: CalendarPalette) {
  return StyleSheet.create({
    scrollView: {
      maxHeight: 95,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      gap: 8,
    },
    dayBtn: {
      width: 56,
      height: 70,
      paddingVertical: 6,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 1,
    },
    dayBtnActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    dayLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textMuted,
      textTransform: "uppercase",
    },
    dayLabelActive: { color: "rgba(255,255,255,0.8)" },
    dayNum: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    dayNumActive: { color: "#FFF" },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      marginTop: 1,
    },
    dotPending: { backgroundColor: colors.accentSoft },
    dotDone: { backgroundColor: colors.done },
  });
}
