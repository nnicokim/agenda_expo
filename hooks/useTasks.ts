import { useCallback, useEffect, useState } from "react";
import { REPEAT_TYPES } from "../constants/repeat";
import * as notifService from "../services/notificationService";
import type {
    DateStr,
    NewTaskData,
    Task,
    TasksByDate,
    UpdateTaskData,
} from "../services/taskService";
import * as taskService from "../services/taskService";

interface UseTasksReturn {
  tasksByDate: TasksByDate;
  loading: boolean;
  error: string | null;
  addTask: (date: DateStr, data: NewTaskData) => Promise<void>;
  editTask: (
    date: DateStr,
    taskId: string,
    data: UpdateTaskData,
  ) => Promise<void>;
  toggleTask: (date: DateStr, taskId: string) => Promise<void>;
  toggleTaskPinned: (
    date: DateStr,
    taskId: string,
    shouldPin: boolean,
  ) => Promise<void>;
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
        is_pinned: false,
        pinned_at: null,
        time: data.time,
        remind_me: data.remind_me,
        repeat_type: data.repeat_type ?? REPEAT_TYPES.NONE,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        place_id: data.place_id,
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

  const editTask = useCallback(
    async (
      date: DateStr,
      taskId: string,
      data: UpdateTaskData,
    ): Promise<void> => {
      const prev = tasksByDate[date] ?? [];
      const task = prev.find((t) => t.id === taskId);
      if (!task) return;

      const optimistic: Task = {
        ...task,
        text: data.text,
        time: data.time,
        remind_me: data.remind_me,
        repeat_type: data.repeat_type,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        place_id: data.place_id,
      };

      setTasksByDate((s) => ({
        ...s,
        [date]: s[date].map((t) => (t.id === taskId ? optimistic : t)),
      }));

      try {
        const saved = await taskService.updateTask(taskId, data);
        let notificationId: string | null = saved.notification_id;

        const shouldHaveReminder = saved.remind_me && !!saved.time;
        if (!shouldHaveReminder) {
          if (task.notification_id) {
            await notifService.cancelNotification(task.notification_id);
          }
          notificationId = null;
          await taskService.updateNotificationId(saved.id, null);
        } else {
          const granted = await notifService.requestPermissions();
          if (granted && saved.time) {
            if (task.notification_id) {
              notificationId = await notifService.rescheduleNotification(
                task.notification_id,
                saved.text,
                saved.day,
                saved.time,
                saved.repeat_type,
              );
            } else {
              notificationId = await notifService.scheduleNotification(
                saved.text,
                saved.day,
                saved.time,
                saved.repeat_type,
              );
            }
            await taskService.updateNotificationId(saved.id, notificationId);
          }
        }

        setTasksByDate((s) => ({
          ...s,
          [date]: s[date].map((t) =>
            t.id === taskId ? { ...saved, notification_id: notificationId } : t,
          ),
        }));
      } catch (err) {
        console.error("Error editando:", err);
        setTasksByDate((s) => ({ ...s, [date]: prev }));
        setError("No se pudo editar la tarea.");
      }
    },
    [tasksByDate],
  );

  const toggleTaskPinned = useCallback(
    async (
      date: DateStr,
      taskId: string,
      shouldPin: boolean,
    ): Promise<void> => {
      const prev = tasksByDate[date] ?? [];
      const task = prev.find((t) => t.id === taskId);
      if (!task) return;

      const optimisticPinnedAt = shouldPin ? new Date().toISOString() : null;

      setTasksByDate((state) => ({
        ...state,
        [date]: state[date].map((t) =>
          t.id === taskId
            ? { ...t, is_pinned: shouldPin, pinned_at: optimisticPinnedAt }
            : t,
        ),
      }));

      try {
        const saved = await taskService.setTaskPinned(taskId, shouldPin);
        setTasksByDate((state) => ({
          ...state,
          [date]: state[date].map((t) => (t.id === taskId ? saved : t)),
        }));
      } catch (err) {
        console.error("Error anclando:", err);
        setTasksByDate((state) => ({ ...state, [date]: prev }));
        setError("No se pudo actualizar el anclado.");
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
    editTask,
    toggleTask,
    toggleTaskPinned,
    deleteTask,
    clearError,
  };
}
