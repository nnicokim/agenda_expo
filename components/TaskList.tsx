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
  onTogglePinned?: (taskId: string, shouldPin: boolean) => void;
  themeColors: CalendarPalette;
  showRepeatInfo?: boolean;
}

function compareTasks(a: Task, b: Task): number {
  if (a.is_pinned !== b.is_pinned) {
    return a.is_pinned ? -1 : 1;
  }

  if (a.is_pinned && b.is_pinned) {
    const leftPinnedAt = a.pinned_at ?? "";
    const rightPinnedAt = b.pinned_at ?? "";
    const byPinnedOrder = leftPinnedAt.localeCompare(rightPinnedAt);
    if (byPinnedOrder !== 0) return byPinnedOrder;
  }

  return a.created_at.localeCompare(b.created_at);
}

export default function TaskList({
  tasks,
  onToggle,
  onDelete,
  onPressTask,
  onTogglePinned,
  themeColors,
  showRepeatInfo = false,
}: TaskListProps) {
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const sortedTasks = useMemo(() => [...tasks].sort(compareTasks), [tasks]);

  if (sortedTasks.length === 0) {
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
      data={sortedTasks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TaskRow
          task={item}
          onToggle={onToggle}
          onDelete={onDelete}
          onPressTask={onPressTask}
          onTogglePinned={onTogglePinned}
          themeColors={themeColors}
          showRepeatInfo={showRepeatInfo}
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
