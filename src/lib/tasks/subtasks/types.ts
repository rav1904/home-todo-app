export type TaskSubtask = {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
};

export const TASK_SUBTASK_SELECT_FIELDS =
  "id, task_id, title, completed, sort_order";
