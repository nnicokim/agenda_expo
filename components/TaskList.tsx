import { useRef } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS } from "../constants/colors";
import type { Task } from "../services/taskService";
import { formatTime } from "../utils/dateUtils";

interface TaskListProps {
  tasks: Task[];
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

interface TaskItemProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleToggle = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    onToggle(task.id);
  };

  return (
    <Animated.View
      style={[styles.taskRow, { transform: [{ scale: scaleAnim }] }]}
    >
      <Pressable
        style={[styles.checkbox, task.done && styles.checkboxDone]}
        onPress={handleToggle}
        hitSlop={8}
      >
        {task.done && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>

      <View style={styles.taskContent}>
        <Text
          style={[styles.taskText, task.done && styles.taskTextDone]}
          numberOfLines={2}
        >
          {task.text}
        </Text>
        {task.time && (
          <View style={styles.metaRow}>
            <Text style={styles.timeLabel}>{formatTime(task.time)}</Text>
            {task.remind_me && <Text style={styles.bellIcon}>🔔</Text>}
          </View>
        )}
      </View>

      <Pressable
        style={styles.deleteBtn}
        onPress={() => onDelete(task.id)}
        hitSlop={8}
      >
        <Text style={styles.deleteBtnText}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function TaskList({ tasks, onToggle, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🌿</Text>
        <Text style={styles.emptyText}>Día libre</Text>
        <Text style={styles.emptySubtext}>Agregá una tarea abajo</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TaskItem task={item} onToggle={onToggle} onDelete={onDelete} />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    flexGrow: 1,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: COLORS.done,
    borderColor: COLORS.done,
  },
  checkmark: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
  },
  taskText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "500",
  },
  taskTextDone: {
    textDecorationLine: "line-through",
    color: COLORS.textMuted,
  },
  taskContent: {
    flex: 1,
    gap: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  bellIcon: {
    fontSize: 10,
  },
  deleteBtn: { marginLeft: 8, padding: 4 },
  deleteBtnText: { fontSize: 14, color: COLORS.textMuted },
  separator: { height: 8 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  emptySubtext: { marginTop: 6, fontSize: 14, color: COLORS.textMuted },
});
