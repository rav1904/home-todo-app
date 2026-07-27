export type LabelScope = "global" | "personal";

export type Label = {
  id: string;
  name: string;
  colour: string;
  sort_order: number;
  active: boolean;
  scope: LabelScope;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LabelFormValues = {
  name: string;
  colour: string;
};

export const LABEL_SELECT_FIELDS =
  "id, name, colour, sort_order, active, scope, created_by, created_at, updated_at";
