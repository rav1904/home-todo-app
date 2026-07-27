import { isValidCategoryColour } from "@/lib/categories/colours";
import type { LabelFormValues } from "@/lib/labels/types";

export function validateLabelFormValues(values: LabelFormValues) {
  const trimmedName = values.name.trim();

  if (!trimmedName) {
    return "Name is required.";
  }

  if (!isValidCategoryColour(values.colour)) {
    return "Choose a preset colour or enter a valid hex value.";
  }

  return null;
}
