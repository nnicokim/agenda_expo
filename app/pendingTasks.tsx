import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TaskRow from "../components/TaskRow";
import type { CalendarPalette } from "../constants/calendarTheme";
import { useCalendarTheme } from "../hooks/useCalendarTheme";
import { usePendingTasks } from "../hooks/usePendingTasks";
import type { Task } from "../services/taskService";
import { getMonthLabel } from "../utils/dateUtils";

type MonthSection = {
  monthKey: string;
  monthLabel: string;
  tasks: Task[];
};

function groupTasksByMonth(tasks: Task[]): MonthSection[] {
  const map = new Map<string, Task[]>();

  for (const task of tasks) {
    const monthKey = task.day.slice(0, 7);
    const current = map.get(monthKey) ?? [];
    current.push(task);
    map.set(monthKey, current);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, monthTasks]) => ({
      monthKey,
      monthLabel: getMonthLabel(`${monthKey}-01`),
      tasks: monthTasks.sort((a, b) => {
        const byDay = a.day.localeCompare(b.day);
        if (byDay !== 0) return byDay;
        return a.created_at.localeCompare(b.created_at);
      }),
    }));
}

export default function PendingTasksScreen() {
  const { activePalette } = useCalendarTheme();
  const styles = useMemo(() => createStyles(activePalette), [activePalette]);
  const { tasks, loading, error, reload, toggleTask, deleteTask, clearError } =
    usePendingTasks();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  useFocusEffect(
    useCallback(() => {
      if (error) {
        Alert.alert("Error", error, [{ text: "OK", onPress: clearError }]);
      }
    }, [error, clearError]),
  );

  const sections = useMemo(() => groupTasksByMonth(tasks), [tasks]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator size="large" color={activePalette.accent} />
        <Text style={styles.loadingText}>Cargando pendientes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Text style={styles.backText}>← Calendario</Text>
        </Pressable>

        <View style={styles.headerInfo}>
          <Text style={styles.monthLabel}>Tareas pendientes</Text>
          <Text style={styles.pendingLabel}>
            {tasks.length === 0
              ? "No hay tareas"
              : `${tasks.length} pendiente${tasks.length > 1 ? "s" : ""}`}
          </Text>
        </View>
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>Sin pendientes</Text>
          <Text style={styles.emptySubtext}>No hay tareas por completar</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((section) => (
            <View key={section.monthKey} style={styles.monthSection}>
              <Text style={styles.monthTitle}>{section.monthLabel}</Text>

              {section.tasks.map((task, index) => (
                <View
                  key={task.id}
                  style={index > 0 ? styles.taskGap : undefined}
                >
                  <TaskRow
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    themeColors={activePalette}
                    showRepeatInfo
                  />
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: CalendarPalette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.screenBg,
    },
    centered: {
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    },
    loadingText: {
      color: colors.textMuted,
      fontSize: 15,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.screenBg,
    },
    backBtn: {
      alignSelf: "flex-start",
    },
    backText: {
      color: colors.accentSoft,
      fontSize: 15,
      fontWeight: "600",
    },
    headerInfo: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    monthLabel: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
    },
    pendingLabel: {
      fontSize: 14,
      color: colors.textMuted,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 16,
      gap: 14,
    },
    monthSection: {
      gap: 8,
    },
    monthTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
    },
    taskGap: {
      marginTop: 8,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 60,
    },
    emptyIcon: {
      fontSize: 46,
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    emptySubtext: {
      marginTop: 6,
      fontSize: 14,
      color: colors.textMuted,
    },
  });
}
