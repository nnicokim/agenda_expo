import { useEffect, useMemo } from "react";
import type {
  DateStr,
  NewTaskData,
  TasksByDate,
  UpdateTaskData,
} from "../services/taskService";
import { selectTasksByDates, useTasksStore } from "../stores/useTasksStore";
import { useShallow } from "zustand/react/shallow";

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
  const weekDatesKey = JSON.stringify(weekDates);
  const stableWeekDates = useMemo<DateStr[]>(
    () => JSON.parse(weekDatesKey) as DateStr[],
    [weekDatesKey],
  );
  const tasksByDate = useTasksStore(
    useShallow(selectTasksByDates(stableWeekDates)),
  );
  const loading = useTasksStore((state) => state.weekLoading);
  const error = useTasksStore((state) => state.weekError);
  const loadWeekTasks = useTasksStore((state) => state.loadWeekTasks);
  const addTask = useTasksStore((state) => state.addTask);
  const editTask = useTasksStore((state) => state.editTask);
  const toggleTask = useTasksStore((state) => state.toggleTask);
  const toggleTaskPinned = useTasksStore((state) => state.toggleTaskPinned);
  const deleteTask = useTasksStore((state) => state.deleteTask);
  const clearError = useTasksStore((state) => state.clearWeekError);

  useEffect(() => {
    if (stableWeekDates.length === 0) return;
    void loadWeekTasks(stableWeekDates);
  }, [loadWeekTasks, stableWeekDates]);

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
