import {
    type RepeatType,
    normalizeRepeatType,
    REPEAT_TYPES,
} from "../constants/repeat";
import { supabase } from "../lib/supabase";

export type DateStr = string;

export interface Task {
  id: string;
  text: string;
  done: boolean;
  day: DateStr;
  time: string | null;
  remind_me: boolean;
  repeat_type: RepeatType;
  notification_id: string | null;
  created_at: string;
}

export interface NewTaskData {
  text: string;
  time: string | null;
  remind_me: boolean;
  repeat_type: RepeatType;
}

export type TasksByDate = Record<DateStr, Task[]>;

const TABLE = "tasks";

export async function getTasksForDates(dates: DateStr[]): Promise<TasksByDate> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .in("day", dates)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const grouped: TasksByDate = Object.fromEntries(dates.map((d) => [d, []]));

  return (data ?? []).reduce((acc, task) => {
    if (acc[task.day] !== undefined) {
      acc[task.day].push(normalizeTask(task));
    }
    return acc;
  }, grouped);
}

//  Retorna el array de fechas únicas que tienen al menos una tarea.
//  Lo usa el calendario para mostrar los puntitos de marcación.
//  Solo trae la columna "day" (más liviano que traer todo).
export async function getTaskDates(): Promise<DateStr[]> {
  const { data, error } = await supabase.from(TABLE).select("day");

  if (error) throw error;

  return [...new Set((data ?? []).map((t) => t.day as DateStr))];
}

export async function addTask(date: DateStr, data: NewTaskData): Promise<Task> {
  const { data: saved, error } = await supabase
    .from(TABLE)
    .insert({
      text: data.text,
      day: date,
      done: false,
      time: data.time,
      remind_me: data.remind_me,
      repeat_type: data.repeat_type,
    })
    .select()
    .single();

  if (error) throw error;
  return normalizeTask(saved);
}

export async function updateNotificationId(
  taskId: string,
  notificationId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ notification_id: notificationId })
    .eq("id", taskId);

  if (error) throw error;
}

export async function toggleTask(
  taskId: string,
  currentDone: boolean,
): Promise<Task> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ done: !currentDone })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;
  return normalizeTask(data);
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", taskId);

  if (error) throw error;
}

function normalizeTask(task: any): Task {
  return {
    ...(task as Task),
    remind_me: Boolean(task?.remind_me),
    repeat_type: normalizeRepeatType(task?.repeat_type),
    time: task?.time ?? null,
    notification_id: task?.notification_id ?? null,
    created_at: task?.created_at ?? new Date().toISOString(),
    done: Boolean(task?.done),
    day: String(task?.day ?? ""),
    text: String(task?.text ?? ""),
    id: String(task?.id ?? ""),
  };
}

export { REPEAT_TYPES };
export type { RepeatType };

