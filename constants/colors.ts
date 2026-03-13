// ============================================================
//  En TypeScript podemos tipar el objeto con "as const" para que
//  el compilador sepa los valores exactos (no solo "string").
//  Esto permite autocompletado al escribir COLORS.
// ============================================================

export const COLORS = {
  bg: "#0F0F1A",
  card: "#1A1A2E",
  accent: "#7C5CBF",
  accentSoft: "#A77DFF",
  done: "#3D9970",
  text: "#F0EBF8",
  textMuted: "#8A82A0",
  border: "#2A2A40",
  danger: "#E05C5C",
} as const;
