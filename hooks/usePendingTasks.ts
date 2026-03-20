import { useCallback, useState } from "react";
import { REPEAT_TYPES } from "../constants/repeat";
import * as notifService from "../services/notificationService";
import type { Task } from "../services/taskService";
import * as taskService from "../services/taskService";

interface UsePendingTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  clearError: () => void;
}

export function usePendingTasks(): UsePendingTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const pending = await taskService.getPendingParentTasks();
      setTasks(pending);
    } catch (err) {
      console.error("Error cargando pendientes:", err);
      setError("No se pudieron cargar las tareas pendientes.");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleTask = useCallback(
    async (taskId: string): Promise<void> => {
      const target = tasks.find((task) => task.id === taskId);
      if (!target) return;

      setTasks((prev) => prev.filter((task) => task.id !== taskId));

      try {
        await taskService.toggleTask(taskId, target.done);
      } catch (err) {
        console.error("Error toggle pendiente:", err);
        setTasks((prev) =>
          [target, ...prev].sort((a, b) => a.day.localeCompare(b.day)),
        );
        setError("No se pudo actualizar la tarea.");
      }
    },
    [tasks],
  );

  const deleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      const target = tasks.find((task) => task.id === taskId);
      if (!target) return;

      setTasks((prev) => prev.filter((task) => task.id !== taskId));

      try {
        const isRecurringMaster =
          (target.repeat_type === REPEAT_TYPES.MONTHLY ||
            target.repeat_type === REPEAT_TYPES.WEEKLY ||
            target.repeat_type === REPEAT_TYPES.DAILY) &&
          !target.recurrence_parent_id;

        if (isRecurringMaster) {
          const notificationIds =
            await taskService.getTaskFamilyNotificationIds(taskId);
          await Promise.all(
            notificationIds.map((notificationId) =>
              notifService.cancelNotification(notificationId),
            ),
          );
          await taskService.deleteTaskWithOccurrences(taskId);
          return;
        }

        if (target.notification_id) {
          await notifService.cancelNotification(target.notification_id);
        }
        await taskService.deleteTask(taskId);
      } catch (err) {
        console.error("Error borrando pendiente:", err);
        setTasks((prev) =>
          [target, ...prev].sort((a, b) => a.day.localeCompare(b.day)),
        );
        setError("No se pudo eliminar la tarea.");
      }
    },
    [tasks],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    tasks,
    loading,
    error,
    reload,
    toggleTask,
    deleteTask,
    clearError,
  };
}
