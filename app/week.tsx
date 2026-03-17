import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AddTaskForm from "../components/AddTaskForm";
import DaySelector from "../components/DaySelector";
import TaskList from "../components/TaskList";
import { COLORS } from "../constants/colors";
import { useTasks } from "../hooks/useTasks";
import type { NewTaskData, Task } from "../services/taskService";
import { getMonthLabel, getWeekDates, todayISO } from "../utils/dateUtils";

export default function WeekScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const initialDate = date ?? todayISO();

  const weekDates = getWeekDates(initialDate); // lo que recibe el hook

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

  // Handlers: inyectan la fecha seleccionada
  const handleAdd = async (data: NewTaskData) => {
    if (editingTask) {
      await editTask(selectedDate, editingTask.id, data);
      setEditingTask(null);
      return;
    }
    await addTask(selectedDate, data);
  };
  const handleToggle = (taskId: string) => toggleTask(selectedDate, taskId);
  const handleDelete = (taskId: string) => deleteTask(selectedDate, taskId);
  const handlePressTask = (task: Task) => setEditingTask(task);

  useEffect(() => {
    setEditingTask(null);
  }, [selectedDate]);

  const todayTasks = tasksByDate[selectedDate] ?? [];
  const pending = todayTasks.filter((t) => !t.done).length;
  const total = todayTasks.length;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Cargando semana...</Text>
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
      />

      <TaskList
        tasks={todayTasks}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onPressTask={handlePressTask}
      />

      <AddTaskForm
        onSubmit={handleAdd}
        editingTask={editingTask}
        onCancelEdit={() => setEditingTask(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 6,
  },
  backBtn: {
    alignSelf: "flex-start",
  },
  backText: {
    color: COLORS.accentSoft,
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
    color: COLORS.text,
  },
  pendingLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
