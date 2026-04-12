import type { Task } from "../services/taskService";
import { useTasksStore } from "../stores/useTasksStore";

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
  const tasks = useTasksStore((state) => state.pendingTasks);
  const loading = useTasksStore((state) => state.pendingLoading);
  const error = useTasksStore((state) => state.pendingError);
  const reload = useTasksStore((state) => state.loadPendingTasks);
  const toggleTask = useTasksStore((state) => state.togglePendingTask);
  const deleteTask = useTasksStore((state) => state.deletePendingTask);
  const clearError = useTasksStore((state) => state.clearPendingError);

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
