import { isValidCategoryColour } from "@/lib/categories/colours";
import { isValidCategoryIconName } from "@/lib/categories/icons";
import type { CategoryFormValues } from "@/lib/categories/types";

export function validateCategoryFormValues(values: CategoryFormValues) {
  const trimmedName = values.name.trim();

  if (!trimmedName) {
    return "Name is required.";
  }

  if (!isValidCategoryIconName(values.icon_name)) {
    return "Choose an icon from the allowed list.";
  }

  if (!isValidCategoryColour(values.colour)) {
    return "Choose a preset colour or enter a valid hex value.";
  }

  return null;
}
