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
] as const;

export const DEFAULT_CATEGORY_COLOUR = CATEGORY_COLOUR_PRESETS[0].value;

const HEX_COLOUR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isValidCategoryColour(colour: string) {
  if (CATEGORY_COLOUR_PRESETS.some((preset) => preset.value === colour)) {
    return true;
  }

  return HEX_COLOUR_PATTERN.test(colour);
}
