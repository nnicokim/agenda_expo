import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AddTaskForm from "../components/AddTaskForm";
import DaySelector from "../components/DaySelector";
import TaskList from "../components/TaskList";
import type { CalendarPalette } from "../constants/calendarTheme";
import { useCalendarTheme } from "../hooks/useCalendarTheme";
import { useTasks } from "../hooks/useTasks";
import type { NewTaskData, Task } from "../services/taskService";
import { getMonthLabel, getWeekDates, todayISO } from "../utils/dateUtils";

export default function WeekScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const initialDate = date ?? todayISO();
  const { activePalette, reloadThemePreference } = useCalendarTheme();
  const styles = useMemo(() => createStyles(activePalette), [activePalette]);

  const weekDates = getWeekDates(initialDate); // lo que recibe el hook

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);

  // el objeto que retorna el hook useTasks, entre {}
  const {
    tasksByDate,
    loading,
    error,
    addTask,
    editTask,
    toggleTask,
    deleteTask,
    clearError,
  } = useTasks(weekDates);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [{ text: "OK", onPress: clearError }]);
    }
  }, [error]);

  useFocusEffect(
    useCallback(() => {
      void reloadThemePreference();
    }, [reloadThemePreference]),
  );

  // Handlers: inyectan la fecha seleccionada
  const handleAdd = async (data: NewTaskData) => {
    if (editingTask) {
      await editTask(selectedDate, editingTask.id, data);
      setEditingTask(null);
      setShowAddTaskForm(false);
      return;
    }
    await addTask(selectedDate, data);
    setShowAddTaskForm(false);
  };
  const handleToggle = (taskId: string) => toggleTask(selectedDate, taskId);
  const handleDelete = (taskId: string) => deleteTask(selectedDate, taskId);
  const handlePressTask = (task: Task) => {
    setEditingTask(task);
    setShowAddTaskForm(true);
  };

  useEffect(() => {
    setEditingTask(null);
    setShowAddTaskForm(false);
  }, [selectedDate]);

  const todayTasks = tasksByDate[selectedDate] ?? [];
  const pending = todayTasks.filter((t) => !t.done).length;
  const total = todayTasks.length;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator size="large" color={activePalette.accent} />
        <Text style={styles.loadingText}>Cargando semana...</Text>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
            <Text style={styles.monthLabel}>{getMonthLabel(selectedDate)}</Text>
            <Text style={styles.pendingLabel}>
              {total === 0
                ? "No hay tareas"
                : pending === 0
                  ? "Todo listo ✓"
                  : `${pending} pendiente${pending > 1 ? "s" : ""}`}
            </Text>
          </View>
        </View>

        <DaySelector
          weekDates={weekDates}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          tasksByDate={tasksByDate}
          themeColors={activePalette}
        />

        {!showAddTaskForm && (
          <View style={styles.addToggleRow}>
            <Pressable
              style={({ pressed }) => [
                styles.addToggleButton,
                pressed && styles.addToggleButtonPressed,
              ]}
              onPress={() => setShowAddTaskForm(true)}
            >
              <Text style={styles.addToggleButtonText}>+</Text>
            </Pressable>
          </View>
        )}

        <TaskList
          tasks={todayTasks}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onPressTask={handlePressTask}
          themeColors={activePalette}
          showRepeatInfo
        />

        {showAddTaskForm && (
          <AddTaskForm
            onSubmit={handleAdd}
            editingTask={editingTask}
            themeColors={activePalette}
            onCancelEdit={() => {
              setEditingTask(null);
              setShowAddTaskForm(false);
            }}
          />
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
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
    addToggleRow: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 4,
      alignItems: "flex-end",
    },
    addToggleButton: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    addToggleButtonPressed: {
      backgroundColor: colors.accentSoft,
      transform: [{ scale: 0.96 }],
    },
    addToggleButtonText: {
      color: "#FFF",
      fontSize: 28,
      lineHeight: 30,
      fontWeight: "300",
    },
  });
}
