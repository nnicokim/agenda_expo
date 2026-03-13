export const REPEAT_TYPES = {
  NONE: "none",
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
} as const;

export type RepeatType = (typeof REPEAT_TYPES)[keyof typeof REPEAT_TYPES];

export const REPEAT_OPTIONS: Array<{ value: RepeatType; label: string }> = [
  { value: REPEAT_TYPES.DAILY, label: "Todos los dias" },
  { value: REPEAT_TYPES.WEEKLY, label: "Semanalmente" },
  { value: REPEAT_TYPES.MONTHLY, label: "Mensualmente" },
];

export const REPEAT_LABELS: Record<RepeatType, string> = {
  [REPEAT_TYPES.NONE]: "Sin repeticion",
  [REPEAT_TYPES.DAILY]: "Todos los dias",
  [REPEAT_TYPES.WEEKLY]: "Semanalmente",
  [REPEAT_TYPES.MONTHLY]: "Mensualmente",
};

export function normalizeRepeatType(value: unknown): RepeatType {
  return value === REPEAT_TYPES.DAILY ||
    value === REPEAT_TYPES.WEEKLY ||
    value === REPEAT_TYPES.MONTHLY
    ? value
    : REPEAT_TYPES.NONE;
}
