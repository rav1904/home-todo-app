export type CategoryScope = "global" | "personal";

export type Category = {
  id: string;
  parent_id: string | null;
  name: string;
  colour: string;
  icon_name: string;
  sort_order: number;
  active: boolean;
  scope: CategoryScope;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CategoryFormValues = {
  name: string;
  colour: string;
  icon_name: string;
  parent_id: string | null;
};
