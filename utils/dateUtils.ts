export const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ── getWeekDates ──────────────────────────────────────────
//  Dado cualquier día de la semana, retorna los 7 días de esa
//  semana comenzando desde el lunes.
//
//  Ejemplo: getWeekDates("2024-03-13") (miércoles)
//  → ["2024-03-11","2024-03-12","2024-03-13","2024-03-14",
//     "2024-03-15","2024-03-16","2024-03-17"]
// ──────────────────────────────────────────────────────────
export function getWeekDates(dateStr: string): string[] {
  const date = new Date(`${dateStr}T12:00:00`);

  const jsDay = date.getDay();
  const daysFromMonday = jsDay === 0 ? 6 : jsDay - 1;

  const monday = new Date(date);
  monday.setDate(date.getDate() - daysFromMonday);

  // Generamos los 7 días a partir del lunes
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toISODate(d);
  });
}

// ── toISODate ─────────────────────────────────────────────
//  Convierte un objeto Date a string "YYYY-MM-DD" en hora local
//  (Date.toISOString() usa UTC, lo que puede dar el día anterior)
// ──────────────────────────────────────────────────────────
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0"); // getMonth es 0-indexed
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── todayISO ──────────────────────────────────────────────
//  Retorna la fecha de hoy como "YYYY-MM-DD" en hora local
// ──────────────────────────────────────────────────────────
export function todayISO(): string {
  return toISODate(new Date());
}

// ── getDayLabel ───────────────────────────────────────────
//  "2024-03-11" → "Lun"
// ──────────────────────────────────────────────────────────
export function getDayLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  const jsDay = date.getDay();
  // Convertimos de JS (0=Dom) a nuestro índice (0=Lun)
  const idx = jsDay === 0 ? 6 : jsDay - 1;
  return DAY_LABELS[idx];
}

// ── getDayNumber ──────────────────────────────────────────
//  "2024-03-11" → 11
// ──────────────────────────────────────────────────────────
export function getDayNumber(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00`).getDate();
}

// ── getMonthLabel ─────────────────────────────────────────
//  "2024-03-11" → "Marzo 2024"
// ──────────────────────────────────────────────────────────
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
export function getMonthLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// ── formatTime ────────────────────────────────────────────
//  "14:30" → "2:30 PM" · "09:00" → "9:00 AM"
// ──────────────────────────────────────────────────────────
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}
