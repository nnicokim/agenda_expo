import { create } from "zustand";
import { REPEAT_TYPES } from "../constants/repeat";
import * as notifService from "../services/notificationService";
import * as taskService from "../services/taskService";
import type {
  DateStr,
  NewTaskData,
  Task,
  TasksByDate,
  UpdateTaskData,
} from "../services/taskService";

interface TasksStoreState {
  tasksByDate: TasksByDate;
  pendingTasks: Task[];
  markedTaskDates: string[];
  weekLoading: boolean;
  pendingLoading: boolean;
  markedDatesLoading: boolean;
  weekError: string | null;
  pendingError: string | null;
  loadWeekTasks: (dates: DateStr[]) => Promise<void>;
  loadPendingTasks: () => Promise<void>;
  loadMarkedTaskDates: () => Promise<void>;
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
  togglePendingTask: (taskId: string) => Promise<void>;
  deletePendingTask: (taskId: string) => Promise<void>;
  clearWeekError: () => void;
  clearPendingError: () => void;
}

const EMPTY_TASKS: Task[] = [];

function sortPendingTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const byDay = a.day.localeCompare(b.day);
    if (byDay !== 0) return byDay;
    return a.created_at.localeCompare(b.created_at);
  });
}

function isPendingParentTask(task: Task): boolean {
  return !task.done && !task.recurrence_parent_id;
}

function syncPendingTask(tasks: Task[], task: Task): Task[] {
  const withoutCurrent = tasks.filter((current) => current.id !== task.id);
  if (!isPendingParentTask(task)) {
    return withoutCurrent;
  }
  return sortPendingTasks([...withoutCurrent, task]);
}

function removePendingTask(tasks: Task[], taskId: string): Task[] {
  return tasks.filter((task) => task.id !== taskId);
}

function replaceTask(
  tasks: Task[] | undefined,
  taskId: string,
  nextTask: Task,
): Task[] {
  return (tasks ?? []).map((task) => (task.id === taskId ? nextTask : task));
}

function removeTask(
  tasks: Task[] | undefined,
  taskId: string,
): Task[] {
  return (tasks ?? []).filter((task) => task.id !== taskId);
}

function addMarkedDate(markedTaskDates: string[], date: string): string[] {
  if (markedTaskDates.includes(date)) return markedTaskDates;
  return [...markedTaskDates, date].sort();
}

function maybeRemoveMarkedDate(
  markedTaskDates: string[],
  date: string,
  remainingTasks: Task[],
): string[] {
  if (remainingTasks.length > 0) return markedTaskDates;
  return markedTaskDates.filter((currentDate) => currentDate !== date);
}

export const selectTasksForDate =
  (date: string) =>
  (state: TasksStoreState): Task[] =>
    state.tasksByDate[date] ?? EMPTY_TASKS;

export const selectTasksByDates =
  (dates: string[]) =>
  (state: TasksStoreState): TasksByDate =>
    Object.fromEntries(
      dates.map((date) => [date, state.tasksByDate[date] ?? EMPTY_TASKS]),
    );

export const useTasksStore = create<TasksStoreState>((set, get) => ({
  tasksByDate: {},
  pendingTasks: [],
  markedTaskDates: [],
  weekLoading: true,
  pendingLoading: true,
  markedDatesLoading: true,
  weekError: null,
  pendingError: null,

  loadWeekTasks: async (dates) => {
    if (dates.length === 0) return;

    try {
      set({ weekLoading: true, weekError: null });
      const grouped = await taskService.getTasksForDates(dates);

      set((state) => ({
        tasksByDate: {
          ...state.tasksByDate,
          ...grouped,
        },
        weekLoading: false,
      }));
    } catch (error) {
      console.error("Error cargando semana:", error);
      set({
        weekLoading: false,
        weekError: "No se pudieron cargar las tareas.",
      });
    }
  },

  loadPendingTasks: async () => {
    try {
      set({ pendingLoading: true, pendingError: null });
      const pendingTasks = await taskService.getPendingParentTasks();
      set({ pendingTasks, pendingLoading: false });
    } catch (error) {
      console.error("Error cargando pendientes:", error);
      set({
        pendingLoading: false,
        pendingError: "No se pudieron cargar las tareas pendientes.",
      });
    }
  },

  loadMarkedTaskDates: async () => {
    const hasMarks = get().markedTaskDates.length > 0;

    try {
      if (!hasMarks) {
        set({ markedDatesLoading: true });
      }

      const markedTaskDates = await taskService.getTaskDates();
      set({ markedTaskDates, markedDatesLoading: false });
    } catch (error) {
      console.error("Error cargando marcadores:", error);
      set({ markedDatesLoading: false });
    }
  },

  addTask: async (date, data) => {
    const tempId = `temp_${Date.now()}`;
    const tempTask: Task = {
      id: tempId,
      text: data.text,
      day: date,
      done: false,
      is_pinned: false,
      pinned_at: null,
      deleted_at: null,
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

    set((state) => ({
      tasksByDate: {
        ...state.tasksByDate,
        [date]: [...(state.tasksByDate[date] ?? []), tempTask],
      },
      pendingTasks: syncPendingTask(state.pendingTasks, tempTask),
      markedTaskDates: addMarkedDate(state.markedTaskDates, date),
      weekError: null,
    }));

    try {
      const saved = await taskService.addTask(date, data);

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

      const savedTask: Task = {
        ...saved,
        notification_id: notificationId ?? saved.notification_id,
      };

      set((state) => ({
        tasksByDate: {
          ...state.tasksByDate,
          [date]: replaceTask(state.tasksByDate[date], tempId, savedTask),
        },
        pendingTasks: syncPendingTask(state.pendingTasks, savedTask),
      }));
    } catch (error) {
      console.error("Error guardando:", error);
      set((state) => {
        const nextTasks = removeTask(state.tasksByDate[date], tempId);
        return {
          tasksByDate: {
            ...state.tasksByDate,
            [date]: nextTasks,
          },
          pendingTasks: removePendingTask(state.pendingTasks, tempId),
          markedTaskDates: maybeRemoveMarkedDate(
            state.markedTaskDates,
            date,
            nextTasks,
          ),
          weekError: "No se pudo guardar la tarea.",
        };
      });
    }
  },

  toggleTask: async (date, taskId) => {
    const currentTasks = get().tasksByDate[date] ?? [];
    const task = currentTasks.find((current) => current.id === taskId);
    if (!task) return;

    const optimisticTask: Task = {
      ...task,
      done: !task.done,
    };

    set((state) => ({
      tasksByDate: {
        ...state.tasksByDate,
        [date]: replaceTask(state.tasksByDate[date], taskId, optimisticTask),
      },
      pendingTasks: syncPendingTask(state.pendingTasks, optimisticTask),
      weekError: null,
    }));

    try {
      const saved = await taskService.toggleTask(taskId, task.done);
      set((state) => ({
        tasksByDate: {
          ...state.tasksByDate,
          [date]: replaceTask(state.tasksByDate[date], taskId, saved),
        },
        pendingTasks: syncPendingTask(state.pendingTasks, saved),
      }));
    } catch (error) {
      console.error("Error toggling:", error);
      set((state) => ({
        tasksByDate: {
          ...state.tasksByDate,
          [date]: currentTasks,
        },
        pendingTasks: syncPendingTask(state.pendingTasks, task),
        weekError: "No se pudo actualizar la tarea.",
      }));
    }
  },

  editTask: async (date, taskId, data) => {
    const currentTasks = get().tasksByDate[date] ?? [];
    const task = currentTasks.find((current) => current.id === taskId);
    if (!task) return;

    const optimisticTask: Task = {
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

    set((state) => ({
      tasksByDate: {
        ...state.tasksByDate,
        [date]: replaceTask(state.tasksByDate[date], taskId, optimisticTask),
      },
      pendingTasks: syncPendingTask(state.pendingTasks, optimisticTask),
      weekError: null,
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

      const savedTask: Task = {
        ...saved,
        notification_id: notificationId,
      };

      set((state) => ({
        tasksByDate: {
          ...state.tasksByDate,
          [date]: replaceTask(state.tasksByDate[date], taskId, savedTask),
        },
        pendingTasks: syncPendingTask(state.pendingTasks, savedTask),
      }));
    } catch (error) {
      console.error("Error editando:", error);
      set((state) => ({
        tasksByDate: {
          ...state.tasksByDate,
          [date]: currentTasks,
        },
        pendingTasks: syncPendingTask(state.pendingTasks, task),
        weekError: "No se pudo editar la tarea.",
      }));
    }
  },

  toggleTaskPinned: async (date, taskId, shouldPin) => {
    const currentTasks = get().tasksByDate[date] ?? [];
    const task = currentTasks.find((current) => current.id === taskId);
    if (!task) return;

    const optimisticTask: Task = {
      ...task,
      is_pinned: shouldPin,
      pinned_at: shouldPin ? new Date().toISOString() : null,
    };

    set((state) => ({
      tasksByDate: {
        ...state.tasksByDate,
        [date]: replaceTask(state.tasksByDate[date], taskId, optimisticTask),
      },
      pendingTasks: syncPendingTask(state.pendingTasks, optimisticTask),
      weekError: null,
    }));

    try {
      const saved = await taskService.setTaskPinned(taskId, shouldPin);
      set((state) => ({
        tasksByDate: {
          ...state.tasksByDate,
          [date]: replaceTask(state.tasksByDate[date], taskId, saved),
        },
        pendingTasks: syncPendingTask(state.pendingTasks, saved),
      }));
    } catch (error) {
      console.error("Error anclando:", error);
      set((state) => ({
        tasksByDate: {
          ...state.tasksByDate,
          [date]: currentTasks,
        },
        pendingTasks: syncPendingTask(state.pendingTasks, task),
        weekError: "No se pudo actualizar el anclado.",
      }));
    }
  },

  deleteTask: async (date, taskId) => {
    const currentTasks = get().tasksByDate[date] ?? [];
    const task = currentTasks.find((current) => current.id === taskId);
    if (!task) return;

    const nextTasks = removeTask(currentTasks, taskId);

    set((state) => ({
      tasksByDate: {
        ...state.tasksByDate,
        [date]: nextTasks,
      },
      pendingTasks: removePendingTask(state.pendingTasks, taskId),
      markedTaskDates: maybeRemoveMarkedDate(
        state.markedTaskDates,
        date,
        nextTasks,
      ),
      weekError: null,
    }));

    try {
      const isRecurringMaster =
        (task.repeat_type === REPEAT_TYPES.MONTHLY ||
          task.repeat_type === REPEAT_TYPES.WEEKLY ||
          task.repeat_type === REPEAT_TYPES.DAILY) &&
        !task.recurrence_parent_id;

      if (isRecurringMaster) {
        const notificationIds =
          await taskService.getTaskFamilyNotificationIds(taskId);
        await Promise.all(
          notificationIds.map((notificationId) =>
            notifService.cancelNotification(notificationId),
          ),
        );
        await taskService.deleteTaskWithOccurrences(taskId);
      } else if (task.recurrence_parent_id) {
        if (task.notification_id) {
          await notifService.cancelNotification(task.notification_id);
        }
        await taskService.deleteRecurringOccurrence(taskId);
      } else {
        if (task.notification_id) {
          await notifService.cancelNotification(task.notification_id);
        }
        await taskService.deleteTask(taskId);
      }

      void get().loadMarkedTaskDates();
    } catch (error) {
      console.error("Error borrando:", error);
      set((state) => ({
        tasksByDate: {
          ...state.tasksByDate,
          [date]: currentTasks,
        },
        pendingTasks: syncPendingTask(state.pendingTasks, task),
        markedTaskDates: addMarkedDate(state.markedTaskDates, date),
        weekError: "No se pudo eliminar la tarea.",
      }));
    }
  },

  togglePendingTask: async (taskId) => {
    const target = get().pendingTasks.find((task) => task.id === taskId);
    if (!target) return;

    const currentDayTasks = get().tasksByDate[target.day] ?? [];
    const optimisticTask: Task = {
      ...target,
      done: true,
    };

    set((state) => ({
      pendingTasks: removePendingTask(state.pendingTasks, taskId),
      tasksByDate: state.tasksByDate[target.day]
        ? {
            ...state.tasksByDate,
            [target.day]: replaceTask(
              state.tasksByDate[target.day],
              taskId,
              optimisticTask,
            ),
          }
        : state.tasksByDate,
      pendingError: null,
    }));

    try {
      const saved = await taskService.toggleTask(taskId, target.done);
      set((state) => ({
        tasksByDate: state.tasksByDate[target.day]
          ? {
              ...state.tasksByDate,
              [target.day]: replaceTask(
                state.tasksByDate[target.day],
                taskId,
                saved,
              ),
            }
          : state.tasksByDate,
      }));
    } catch (error) {
      console.error("Error toggle pendiente:", error);
      set((state) => ({
        pendingTasks: sortPendingTasks([...state.pendingTasks, target]),
        tasksByDate: state.tasksByDate[target.day]
          ? {
              ...state.tasksByDate,
              [target.day]: currentDayTasks,
            }
          : state.tasksByDate,
        pendingError: "No se pudo actualizar la tarea.",
      }));
    }
  },

  deletePendingTask: async (taskId) => {
    const target = get().pendingTasks.find((task) => task.id === taskId);
    if (!target) return;

    const currentDayTasks = get().tasksByDate[target.day] ?? [];
    const nextDayTasks = removeTask(currentDayTasks, taskId);

    set((state) => ({
      pendingTasks: removePendingTask(state.pendingTasks, taskId),
      tasksByDate: state.tasksByDate[target.day]
        ? {
            ...state.tasksByDate,
            [target.day]: nextDayTasks,
          }
        : state.tasksByDate,
      markedTaskDates: state.tasksByDate[target.day]
        ? maybeRemoveMarkedDate(state.markedTaskDates, target.day, nextDayTasks)
        : state.markedTaskDates,
      pendingError: null,
    }));

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
      } else {
        if (target.notification_id) {
          await notifService.cancelNotification(target.notification_id);
        }
        await taskService.deleteTask(taskId);
      }

      void get().loadMarkedTaskDates();
    } catch (error) {
      console.error("Error borrando pendiente:", error);
      set((state) => ({
        pendingTasks: sortPendingTasks([...state.pendingTasks, target]),
        tasksByDate: state.tasksByDate[target.day]
          ? {
              ...state.tasksByDate,
              [target.day]: currentDayTasks,
            }
          : state.tasksByDate,
        markedTaskDates: addMarkedDate(state.markedTaskDates, target.day),
        pendingError: "No se pudo eliminar la tarea.",
      }));
    }
  },

  clearWeekError: () => {
    set({ weekError: null });
  },

  clearPendingError: () => {
    set({ pendingError: null });
  },
}));
