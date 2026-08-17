/** User-facing category labels (never expose internal migration wording). */
export function formatCategoryNameForDisplay(name: string): string {
  return name.replace(/\s*\(legacy\)\s*$/i, "").trim() || name;
}

export const NULL_CATEGORY_DISPLAY = {
  id: null as string | null,
  name: "Personal",
  colour: "#57534e",
  icon_name: "Home",
  label: "Personal",
};
