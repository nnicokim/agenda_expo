import { useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import type { CalendarPalette } from "../constants/calendarTheme";
import { REPEAT_TYPES } from "../constants/repeat";
import type { Task } from "../services/taskService";
import { formatTime } from "../utils/dateUtils";

interface TaskRowProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onPressTask?: (task: Task) => void;
  themeColors: CalendarPalette;
  showRepeatInfo?: boolean;
}

function getRepeatInfo(task: Task): string | null {
  if (task.repeat_type === REPEAT_TYPES.DAILY) {
    return "Se repite: diariamente";
  }
  if (task.repeat_type === REPEAT_TYPES.WEEKLY) {
    return "Se repite: semanalmente";
  }
  if (task.repeat_type === REPEAT_TYPES.MONTHLY) {
    return "Se repite: mensualmente";
  }
  return null;
}

export default function TaskRow({
  task,
  onToggle,
  onDelete,
  onPressTask,
  themeColors,
  showRepeatInfo = false,
}: TaskRowProps) {
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
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

  const repeatInfo = showRepeatInfo ? getRepeatInfo(task) : null;

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

      <Pressable
        style={styles.taskContent}
        onPress={() => onPressTask?.(task)}
        disabled={!onPressTask}
      >
        <Text
          style={[styles.taskText, task.done && styles.taskTextDone]}
          numberOfLines={2}
        >
          {task.text}
        </Text>

        {repeatInfo && <Text style={styles.repeatInfo}>{repeatInfo}</Text>}

        {task.time && (
          <View style={styles.metaRow}>
            <Text style={styles.timeLabel}>{formatTime(task.time)}</Text>
            {task.remind_me && <Text style={styles.bellIcon}>🔔</Text>}
          </View>
        )}

        {task.address && (
          <Text style={styles.addressLabel} numberOfLines={1}>
            📍 {task.address}
          </Text>
        )}
      </Pressable>

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

function createStyles(colors: CalendarPalette) {
  return StyleSheet.create({
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxDone: {
      backgroundColor: colors.done,
      borderColor: colors.done,
    },
    checkmark: {
      color: "#FFF",
      fontSize: 13,
      fontWeight: "800",
    },
    taskText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      fontWeight: "500",
    },
    taskTextDone: {
      textDecorationLine: "line-through",
      color: colors.textMuted,
    },
    taskContent: {
      flex: 1,
      gap: 3,
    },
    repeatInfo: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: "600",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    timeLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: "500",
    },
    bellIcon: {
      fontSize: 10,
    },
    addressLabel: {
      fontSize: 11,
      color: colors.textMuted,
    },
    deleteBtn: { marginLeft: 8, padding: 4 },
    deleteBtnText: { fontSize: 14, color: colors.textMuted },
  });
}
