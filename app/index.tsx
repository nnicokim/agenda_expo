import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { CalendarList } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { useMarkedDates } from "../hooks/useMarkedDates";
import { todayISO } from "../utils/dateUtils";

const TODAY = todayISO();

export default function CalendarScreen() {
  const { markedDates, loading, reload } = useMarkedDates();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, []),
  );

  const enrichedMarks = {
    ...markedDates,
    [TODAY]: {
      ...(markedDates[TODAY] ?? {}),
      selected: true,
      selectedColor: COLORS.accent + "55",
      dots: markedDates[TODAY]?.dots ?? [],
    },
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>📅 Mi Agenda</Text>
        <Text style={styles.subtitle}>Tocá un día para ver la semana</Text>
      </View>

      {loading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={COLORS.accent} />
        </View>
      )}

      <CalendarList
        pastScrollRange={24}
        futureScrollRange={24}
        onDayPress={(day) => {
          router.push({
            pathname: "/week" as any,
            params: { date: day.dateString },
          });
        }}
        markedDates={enrichedMarks}
        markingType="multi-dot"
        showScrollIndicator={false}
        calendarStyle={styles.calendar}
        theme={{
          backgroundColor: COLORS.bg,
          calendarBackground: COLORS.bg,
          textSectionTitleColor: COLORS.textMuted,
          selectedDayBackgroundColor: COLORS.accent,
          selectedDayTextColor: "#FFF",
          todayTextColor: COLORS.accentSoft,
          dayTextColor: COLORS.text,
          textDisabledColor: COLORS.border,
          dotColor: COLORS.accent,
          monthTextColor: COLORS.text,
          textMonthFontWeight: "700",
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
          arrowColor: COLORS.accent,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  loadingBar: {
    alignItems: "center",
    paddingBottom: 8,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 4,
  },
});
