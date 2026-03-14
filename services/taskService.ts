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
  recurrence_parent_id: string | null;
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
  await ensureMonthlyOccurrencesForDates(dates);
  await ensureWeeklyOccurrencesForDates(dates);
  // await ensureDailyOccurrencesForDates(dates);

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
  await ensureMonthlyOccurrencesForCalendarRange();
  await ensureWeeklyOccurrencesForCalendarRange();
  // await ensureDailyOccurrencesForCalendarRange();

  const { data, error } = await supabase.from(TABLE).select("day");

  if (error) throw error;

  return [...new Set((data ?? []).map((t) => t.day as DateStr))];
}

// chequea que existan las tareas repetidas
async function ensureMonthlyOccurrencesForCalendarRange(): Promise<void> {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  end.setMonth(end.getMonth() + 22);

  const dates: DateStr[] = [];
  const cursor = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    12,
    0,
    0,
    0,
  );
  const last = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
    12,
    0,
    0,
    0,
  );

  while (cursor <= last) {
    dates.push(toISODateLocal(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  await ensureMonthlyOccurrencesForDates(dates);
}

// TODO: ver si puedo hacer esta funcion generica para los 3 tipos de repeat
async function ensureWeeklyOccurrencesForCalendarRange(): Promise<void> {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  end.setMonth(end.getMonth() + 22);

  const dates: DateStr[] = [];
  const cursor = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    12,
    0,
    0,
    0,
  );
  const last = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
    12,
    0,
    0,
    0,
  );

  while (cursor <= last) {
    dates.push(toISODateLocal(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  await ensureWeeklyOccurrencesForDates(dates);
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
      recurrence_parent_id: null,
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

export async function deleteTaskWithOccurrences(taskId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .or(`id.eq.${taskId},recurrence_parent_id.eq.${taskId}`);

  if (error) throw error;
}

export async function getTaskFamilyNotificationIds(
  taskId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("notification_id")
    .or(`id.eq.${taskId},recurrence_parent_id.eq.${taskId}`);

  if (error) throw error;

  return (data ?? [])
    .map((item) => item.notification_id as string | null)
    .filter((id): id is string => Boolean(id));
}

async function ensureMonthlyOccurrencesForDates(
  dates: DateStr[],
): Promise<void> {
  const uniqueDates = [...new Set(dates)].sort();
  if (uniqueDates.length === 0) return;

  const maxDate = uniqueDates[uniqueDates.length - 1];

  const { data: mastersRaw, error: mastersError } = await supabase
    .from(TABLE)
    .select("*")
    .eq("repeat_type", REPEAT_TYPES.MONTHLY)
    .is("recurrence_parent_id", null)
    .lte("day", maxDate);

  if (mastersError) {
    if (`${mastersError.message}`.includes("recurrence_parent_id")) {
      return;
    }
    throw mastersError;
  }

  const masters = (mastersRaw ?? []).map(normalizeTask);
  if (masters.length === 0) return;

  const masterIds = masters.map((task) => task.id);
  const { data: existingRaw, error: existingError } = await supabase
    .from(TABLE)
    .select("day, recurrence_parent_id")
    .in("day", uniqueDates)
    .in("recurrence_parent_id", masterIds);

  if (existingError) throw existingError;

  const existingKeys = new Set(
    (existingRaw ?? []).map(
      (row) => `${String(row.recurrence_parent_id)}::${String(row.day)}`,
    ),
  );

  const rowsToInsert: Array<Record<string, unknown>> = [];

  for (const master of masters) {
    for (const targetDay of uniqueDates) {
      if (!isMonthlyOccurrenceDay(master.day, targetDay)) continue;

      const key = `${master.id}::${targetDay}`;
      if (existingKeys.has(key)) continue;

      rowsToInsert.push({
        text: master.text,
        day: targetDay,
        done: false,
        time: master.time,
        remind_me: master.remind_me,
        repeat_type: REPEAT_TYPES.MONTHLY,
        recurrence_parent_id: master.id,
        notification_id: null,
      });
    }
  }

  if (rowsToInsert.length === 0) return;

  const { error: insertError } = await supabase
    .from(TABLE)
    .insert(rowsToInsert);
  if (insertError) throw insertError;
}

function isMonthlyOccurrenceDay(baseDay: DateStr, targetDay: DateStr): boolean {
  if (targetDay <= baseDay) return false;

  const baseDate = new Date(`${baseDay}T12:00:00`);
  const targetDate = new Date(`${targetDay}T12:00:00`);

  if (Number.isNaN(baseDate.getTime()) || Number.isNaN(targetDate.getTime())) {
    return false;
  }

  const monthsDiff =
    (targetDate.getFullYear() - baseDate.getFullYear()) * 12 +
    (targetDate.getMonth() - baseDate.getMonth());

  return monthsDiff > 0 && baseDate.getDate() === targetDate.getDate();
}

async function ensureWeeklyOccurrencesForDates(
  dates: DateStr[],
): Promise<void> {
  const uniqueDates = [...new Set(dates)].sort();
  if (uniqueDates.length === 0) return;

  const maxDate = uniqueDates[uniqueDates.length - 1];

  const { data: mastersRaw, error: mastersError } = await supabase
    .from(TABLE)
    .select("*")
    .eq("repeat_type", REPEAT_TYPES.WEEKLY)
    .is("recurrence_parent_id", null)
    .lte("day", maxDate);

  if (mastersError) {
    if (`${mastersError.message}`.includes("recurrence_parent_id")) {
      return;
    }
    throw mastersError;
  }

  const masters = (mastersRaw ?? []).map(normalizeTask);
  if (masters.length === 0) return;

  const masterIds = masters.map((task) => task.id);
  const { data: existingRaw, error: existingError } = await supabase
    .from(TABLE)
    .select("day, recurrence_parent_id")
    .in("day", uniqueDates)
    .in("recurrence_parent_id", masterIds);

  if (existingError) throw existingError;

  const existingKeys = new Set(
    (existingRaw ?? []).map(
      (row) => `${String(row.recurrence_parent_id)}::${String(row.day)}`,
    ),
  );

  const rowsToInsert: Array<Record<string, unknown>> = [];

  for (const master of masters) {
    for (const targetDay of uniqueDates) {
      if (!isWeeklyOccurrenceDay(master.day, targetDay)) continue;

      const key = `${master.id}::${targetDay}`;
      if (existingKeys.has(key)) continue;

      rowsToInsert.push({
        text: master.text,
        day: targetDay,
        done: false,
        time: master.time,
        remind_me: master.remind_me,
        repeat_type: REPEAT_TYPES.WEEKLY,
        recurrence_parent_id: master.id,
        notification_id: null,
      });
    }
  }

  if (rowsToInsert.length === 0) return;

  const { error: insertError } = await supabase
    .from(TABLE)
    .insert(rowsToInsert);
  if (insertError) throw insertError;
}

function isWeeklyOccurrenceDay(baseDay: DateStr, targetDay: DateStr): boolean {
  if (targetDay <= baseDay) return false;

  const baseDate = new Date(`${baseDay}T12:00:00`);
  const targetDate = new Date(`${targetDay}T12:00:00`);

  if (Number.isNaN(baseDate.getTime()) || Number.isNaN(targetDate.getTime())) {
    return false;
  }

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const diffInDays = Math.floor(
    (targetDate.getTime() - baseDate.getTime()) / MS_PER_DAY,
  );

  return diffInDays > 0 && diffInDays % 7 === 0;
}

function toISODateLocal(date: Date): DateStr {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeTask(task: any): Task {
  return {
    ...(task as Task),
    remind_me: Boolean(task?.remind_me),
    repeat_type: normalizeRepeatType(task?.repeat_type),
    recurrence_parent_id: task?.recurrence_parent_id ?? null,
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

