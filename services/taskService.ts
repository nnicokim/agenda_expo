import { supabase } from "../lib/supabase";

export type DateStr = string;

export interface Task {
  id: string;
  text: string;
  done: boolean;
  day: DateStr;
  time: string | null;
  remind_me: boolean;
  notification_id: string | null;
  created_at: string;
}

export interface NewTaskData {
  text: string;
  time: string | null;
  remind_me: boolean;
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
      acc[task.day].push(task as Task);
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
    })
    .select()
    .single();

  if (error) throw error;
  return saved as Task;
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
  return data as Task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", taskId);

  if (error) throw error;
}
