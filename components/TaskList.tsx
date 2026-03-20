import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { CalendarPalette } from "../constants/calendarTheme";
import type { Task } from "../services/taskService";
import TaskRow from "./TaskRow";

interface TaskListProps {
  tasks: Task[];
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onPressTask: (task: Task) => void;
  themeColors: CalendarPalette;
}

export default function TaskList({
  tasks,
  onToggle,
  onDelete,
  onPressTask,
  themeColors,
}: TaskListProps) {
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  if (tasks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🌿</Text>
        <Text style={styles.emptyText}>Día libre</Text>
        <Text style={styles.emptySubtext}>No hay tareas hasta el momento</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TaskRow
          task={item}
          onToggle={onToggle}
          onDelete={onDelete}
          onPressTask={onPressTask}
          themeColors={themeColors}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

function createStyles(colors: CalendarPalette) {
  return StyleSheet.create({
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      flexGrow: 1,
    },
    separator: { height: 8 },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 60,
    },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 20, fontWeight: "700", color: colors.text },
    emptySubtext: { marginTop: 6, fontSize: 14, color: colors.textMuted },
  });
}
