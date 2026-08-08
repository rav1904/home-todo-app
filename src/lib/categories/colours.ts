export const CATEGORY_COLOUR_PRESETS = [
  { label: "Emerald", value: "#059669" },
  { label: "Teal", value: "#0d9488" },
  { label: "Sky", value: "#0284c7" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Rose", value: "#e11d48" },
  { label: "Orange", value: "#ea580c" },
  { label: "Amber", value: "#d97706" },
  { label: "Stone", value: "#57534e" },
  { label: "Slate", value: "#475569" },
  { label: "Soft Blue", value: "#3b82c4" },
  { label: "Cornflower", value: "#60a5fa" },
  { label: "Cyan", value: "#0891b2" },
  { label: "Mint", value: "#10b981" },
  { label: "Lime", value: "#65a30d" },
  { label: "Coral", value: "#f43f5e" },
  { label: "Magenta", value: "#db2777" },
  { label: "Lavender", value: "#8b5cf6" },
  { label: "Sand", value: "#a8a29e" },
  { label: "Charcoal", value: "#334155" },
] as const;

export const DEFAULT_CATEGORY_COLOUR =
  CATEGORY_COLOUR_PRESETS.find((preset) => preset.label === "Soft Blue")
    ?.value ?? CATEGORY_COLOUR_PRESETS[0].value;

const HEX_COLOUR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isValidCategoryColour(colour: string) {
  if (CATEGORY_COLOUR_PRESETS.some((preset) => preset.value === colour)) {
    return true;
  }

  return HEX_COLOUR_PATTERN.test(colour);
}
