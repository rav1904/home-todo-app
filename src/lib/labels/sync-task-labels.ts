import type { SupabaseClient } from "@supabase/supabase-js";

export async function syncTaskLabels(
  supabase: SupabaseClient,
  taskId: string,
  labelIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("task_labels")
    .delete()
    .eq("task_id", taskId);

  if (deleteError) {
    return deleteError;
  }

  if (labelIds.length === 0) {
    return null;
  }

  const { error: insertError } = await supabase.from("task_labels").insert(
    labelIds.map((labelId) => ({
      task_id: taskId,
      label_id: labelId,
    })),
  );

  return insertError;
}
