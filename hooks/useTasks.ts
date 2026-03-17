import { useCallback, useEffect, useState } from "react";
import { REPEAT_TYPES } from "../constants/repeat";
import * as notifService from "../services/notificationService";
import type {
  DateStr,
  NewTaskData,
  Task,
  TasksByDate,
} from "../services/taskService";
import * as taskService from "../services/taskService";

interface UseTasksReturn {
  tasksByDate: TasksByDate;
  loading: boolean;
  error: string | null;
  addTask: (date: DateStr, data: NewTaskData) => Promise<void>;
  toggleTask: (date: DateStr, taskId: string) => Promise<void>;
  deleteTask: (date: DateStr, taskId: string) => Promise<void>;
  clearError: () => void;
}

export function useTasks(weekDates: string[]): UseTasksReturn {
  const [tasksByDate, setTasksByDate] = useState<TasksByDate>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (weekDates.length === 0) return;
    loadWeekTasks();
  }, [JSON.stringify(weekDates)]);

  async function loadWeekTasks(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const grouped = await taskService.getTasksForDates(weekDates);
      setTasksByDate(grouped);
    } catch (err) {
      console.error("Error cargando semana:", err);
      setError("No se pudieron cargar las tareas.");
    } finally {
      setLoading(false);
    }
  }

  const addTask = useCallback(
    async (date: DateStr, data: NewTaskData): Promise<void> => {
      const tempId = `temp_${Date.now()}`;
      const tempTask: Task = {
        id: tempId,
        text: data.text,
        day: date,
        done: false,
        time: data.time,
        remind_me: data.remind_me,
        repeat_type: data.repeat_type ?? REPEAT_TYPES.NONE,
        recurrence_parent_id: null,
        notification_id: null,
        created_at: new Date().toISOString(),
      };

      setTasksByDate((prev) => ({
        ...prev,
        [date]: [...(prev[date] ?? []), tempTask],
      }));

      try {
        const saved = await taskService.addTask(date, data);

        // Programar notificación si remind_me + time
        let notificationId: string | null = null;
        if (saved.remind_me && saved.time) {
          const granted = await notifService.requestPermissions();
          if (granted) {
            notificationId = await notifService.scheduleNotification(
              saved.text,
              saved.day,
              saved.time,
              saved.repeat_type,
            );
            if (notificationId) {
              await taskService.updateNotificationId(saved.id, notificationId);
            }
          }
        }

        setTasksByDate((prev) => ({
          ...prev,
          [date]: (prev[date] ?? []).map((t) =>
            t.id === tempId
              ? {
                  ...saved,
                  notification_id: notificationId ?? saved.notification_id,
                }
              : t,
          ),
        }));
      } catch (err) {
        console.error("Error guardando:", err);
        setTasksByDate((prev) => ({
          ...prev,
          [date]: (prev[date] ?? []).filter((t) => t.id !== tempId),
        }));
        setError("No se pudo guardar la tarea.");
      }
    },
    [],
  );

  const toggleTask = useCallback(
    async (date: DateStr, taskId: string): Promise<void> => {
      const prev = tasksByDate[date] ?? [];
      const task = prev.find((t) => t.id === taskId);
      if (!task) return;

      setTasksByDate((s) => ({
        ...s,
        [date]: s[date].map((t) =>
          t.id === taskId ? { ...t, done: !t.done } : t,
        ),
      }));

      try {
        await taskService.toggleTask(taskId, task.done);
      } catch (err) {
        console.error("Error toggling:", err);
        setTasksByDate((s) => ({ ...s, [date]: prev }));
        setError("No se pudo actualizar la tarea.");
      }
    },
    [tasksByDate],
  );

  const deleteTask = useCallback(
    async (date: DateStr, taskId: string): Promise<void> => {
      const prev = tasksByDate[date] ?? [];
      const task = prev.find((t) => t.id === taskId);

      setTasksByDate((s) => ({
        ...s,
        [date]: s[date].filter((t) => t.id !== taskId),
      }));

      try {
        const isMonthlyMaster =
          task?.repeat_type === REPEAT_TYPES.MONTHLY &&
          !task?.recurrence_parent_id;

        const isWeeklyMaster =
          task?.repeat_type === REPEAT_TYPES.WEEKLY &&
          !task?.recurrence_parent_id;

        const isDailyMaster =
          task?.repeat_type === REPEAT_TYPES.DAILY &&
          !task?.recurrence_parent_id;

        if (isMonthlyMaster || isWeeklyMaster || isDailyMaster) {
          const notificationIds =
            await taskService.getTaskFamilyNotificationIds(taskId);
          await Promise.all(
            notificationIds.map((notificationId) =>
              notifService.cancelNotification(notificationId),
            ),
          );
          await taskService.deleteTaskWithOccurrences(taskId);
        } else if (task?.recurrence_parent_id) {
          if (task.notification_id) {
            await notifService.cancelNotification(task.notification_id);
          }
          await taskService.deleteRecurringOccurrence(taskId);
        } else {
          // Cancelar notificación si existía
          if (task?.notification_id) {
            await notifService.cancelNotification(task.notification_id);
          }
          await taskService.deleteTask(taskId);
        }
      } catch (err) {
        console.error("Error borrando:", err);
        setTasksByDate((s) => ({ ...s, [date]: prev }));
        setError("No se pudo eliminar la tarea.");
      }
    },
    [tasksByDate],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    tasksByDate,
    loading,
    error,
    addTask,
    toggleTask,
    deleteTask,
    clearError,
  };
}
