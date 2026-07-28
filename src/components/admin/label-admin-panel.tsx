"use client";

import {
  LabelFormFields,
  createEmptyLabelFormValues,
} from "@/components/admin/label-form-fields";
import {
  getNextLabelSortOrder,
  moveLabel,
  reorderLabels,
  sortLabels,
  toLabelSortOrderUpdates,
  type LabelSortMode,
} from "@/lib/labels/sort";
import type { Label, LabelFormValues } from "@/lib/labels/types";
import { validateLabelFormValues } from "@/lib/labels/validation";
import { createClient } from "@/lib/supabase/client";
import {
  adminCancelButtonClassName,
  adminEditCardClassName,
  adminErrorBannerClassName,
  adminIconButtonClassName,
  adminRowClassName,
  adminSecondaryButtonClassName,
  adminSectionClassName,
} from "@/lib/ui/field-classes";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type LabelAdminPanelProps = {
  labels: Label[];
};

function toFormValues(label: Label): LabelFormValues {
  return {
    name: label.name,
    colour: label.colour,
  };
}

export function LabelAdminPanel({ labels }: LabelAdminPanelProps) {
  const router = useRouter();
  const [createValues, setCreateValues] = useState(createEmptyLabelFormValues());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<LabelFormValues | null>(null);
  const [sortMode, setSortMode] = useState<LabelSortMode>("custom");
  const [draggedLabelId, setDraggedLabelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedLabels = useMemo(
    () => sortLabels(labels, sortMode),
    [labels, sortMode],
  );

  async function persistSortOrders(
    updates: { id: string; sort_order: number }[],
  ) {
    const supabase = createClient();
    const timestamp = new Date().toISOString();

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("labels")
        .update({
          sort_order: update.sort_order,
          updated_at: timestamp,
        })
        .eq("id", update.id);

      if (updateError) {
        throw updateError;
      }
    }
  }

  async function applyReorder(reordered: Label[]) {
    setLoading(true);
    setError(null);

    try {
      await persistSortOrders(toLabelSortOrderUpdates(reordered));
      router.refresh();
    } catch (reorderError) {
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : "Could not update label order.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const validationError = validateLabelFormValues(createValues);
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("labels").insert({
      name: createValues.name.trim(),
      colour: createValues.colour,
      sort_order: getNextLabelSortOrder(labels),
      active: true,
      scope: "global",
      created_by: null,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setCreateValues(createEmptyLabelFormValues());
    setLoading(false);
    router.refresh();
  }

  function startEditing(label: Label) {
    setEditingId(label.id);
    setEditValues(toFormValues(label));
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditValues(null);
    setError(null);
  }

  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId || !editValues) {
      return;
    }

    setLoading(true);
    setError(null);

    const validationError = validateLabelFormValues(editValues);
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("labels")
      .update({
        name: editValues.name.trim(),
        colour: editValues.colour,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    cancelEditing();
    setLoading(false);
    router.refresh();
  }

  async function setLabelActive(label: Label, active: boolean) {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("labels")
      .update({
        active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", label.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    if (editingId === label.id) {
      cancelEditing();
    }

    setLoading(false);
    router.refresh();
  }

  async function handleMoveLabel(label: Label, direction: "up" | "down") {
    if (sortMode !== "custom") {
      return;
    }

    const reordered = moveLabel(sortedLabels, label.id, direction);

    if (reordered === sortedLabels) {
      return;
    }

    await applyReorder(reordered);
  }

  async function handleDropLabel(targetLabel: Label) {
    if (sortMode !== "custom" || !draggedLabelId) {
      return;
    }

    const reordered = reorderLabels(
      sortedLabels,
      draggedLabelId,
      targetLabel.id,
    );

    setDraggedLabelId(null);

    if (reordered === sortedLabels) {
      return;
    }

    await applyReorder(reordered);
  }

  function renderSortControls(label: Label) {
    if (sortMode !== "custom") {
      return null;
    }

    const index = sortedLabels.findIndex((item) => item.id === label.id);

    return (
      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          draggable
          onDragStart={() => setDraggedLabelId(label.id)}
          onDragEnd={() => setDraggedLabelId(null)}
          aria-label={`Drag ${label.name}`}
          className={`cursor-grab ${adminIconButtonClassName} p-1.5 active:cursor-grabbing`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => handleMoveLabel(label, "up")}
          disabled={loading || index === 0}
          aria-label={`Move ${label.name} up`}
          className={`cursor-pointer ${adminIconButtonClassName} p-1`}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => handleMoveLabel(label, "down")}
          disabled={loading || index === sortedLabels.length - 1}
          aria-label={`Move ${label.name} down`}
          className={`cursor-pointer ${adminIconButtonClassName} p-1`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    );
  }

  function renderLabelRow(label: Label) {
    const isEditing = editingId === label.id;

    if (isEditing && editValues) {
      return (
        <li
          key={label.id}
          className={adminEditCardClassName}
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Edit label</h3>
            <LabelFormFields
              idPrefix={`edit-${label.id}`}
              values={editValues}
              onChange={setEditValues}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={loading}
                className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={loading}
                className={adminCancelButtonClassName}
              >
                Cancel
              </button>
            </div>
          </form>
        </li>
      );
    }

    return (
      <li
        key={label.id}
        onDragOver={(event) => {
          if (sortMode === "custom") {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          void handleDropLabel(label);
        }}
        className={`${adminRowClassName} ${
          label.active ? "" : "opacity-70"
        } ${draggedLabelId === label.id ? "opacity-60" : ""}`}
      >
        <div className="flex items-start gap-3">
          {renderSortControls(label)}
          <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
            <div className="min-w-0">
              <span
                className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: label.colour }}
              >
                {label.name}
              </span>
              {!label.active ? (
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">Archived</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => startEditing(label)}
                disabled={loading}
                className={adminSecondaryButtonClassName}
              >
                Edit
              </button>
              {label.active ? (
                <button
                  type="button"
                  onClick={() => setLabelActive(label, false)}
                  disabled={loading}
                  className={adminSecondaryButtonClassName}
                >
                  Archive
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setLabelActive(label, true)}
                  disabled={loading}
                  className={adminSecondaryButtonClassName}
                >
                  Reactivate
                </button>
              )}
            </div>
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-8">
      <section className={adminSectionClassName}>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Create global label</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Add a shared marker such as Urgent, Waiting, or Follow Up. Global
          labels are visible to all users. New labels are appended to the custom
          order automatically.
        </p>

        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <LabelFormFields
            idPrefix="create"
            values={createValues}
            onChange={setCreateValues}
          />

          {error ? (
            <p className={adminErrorBannerClassName}>
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create label"}
          </button>
        </form>
      </section>

      <section className={adminSectionClassName}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Global labels</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Manage shared labels for all users. Personal labels are created
              from the task form and are not shown here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["custom", "Custom"],
                ["az", "A-Z"],
                ["za", "Z-A"],
              ] as const
            ).map(([mode, labelText]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSortMode(mode)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  sortMode === mode
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                }`}
              >
                {labelText}
              </button>
            ))}
          </div>
        </div>

        {labels.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">No labels yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sortedLabels.map((label) => renderLabelRow(label))}
          </ul>
        )}
      </section>
    </div>
  );
}
