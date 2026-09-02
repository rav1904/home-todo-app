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
  { label: "Coral", value: "#c94c3d" },
  { label: "Lime", value: "#65a30d" },
  { label: "Cyan", value: "#0e7490" },
  { label: "Pink", value: "#db2777" },
  { label: "Plum", value: "#9d174d" },
  { label: "Blue", value: "#2563eb" },
  { label: "Green", value: "#16a34a" },
  { label: "Gold", value: "#ca8a04" },
  { label: "Red", value: "#dc2626" },
  { label: "Zinc", value: "#52525b" },
] as const;

export const DEFAULT_CATEGORY_COLOUR = CATEGORY_COLOUR_PRESETS[0].value;

const HEX_COLOUR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isValidCategoryColour(colour: string) {
  if (CATEGORY_COLOUR_PRESETS.some((preset) => preset.value === colour)) {
    return true;
  }

  return HEX_COLOUR_PATTERN.test(colour);
}
