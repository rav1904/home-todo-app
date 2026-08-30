"use client";

import {
  LabelFormFields,
  createEmptyLabelFormValues,
} from "@/components/admin/label-form-fields";
import { LoadingButton } from "@/components/ui/loading-button";
import { getNextLabelSortOrder, sortLabels } from "@/lib/labels/sort";
import type { Label, LabelFormValues } from "@/lib/labels/types";
import { validateLabelFormValues } from "@/lib/labels/validation";
import { createClient } from "@/lib/supabase/client";
import {
  adminCancelButtonClassName,
  adminEditCardClassName,
  adminErrorBannerClassName,
  adminRowClassName,
  adminSecondaryButtonClassName,
  adminSectionClassName,
} from "@/lib/ui/field-classes";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type PersonalLabelSettingsProps = {
  labels: Label[];
  userId: string;
};

function toFormValues(label: Label): LabelFormValues {
  return {
    name: label.name,
    colour: label.colour,
  };
}

export function PersonalLabelSettings({
  labels,
  userId,
}: PersonalLabelSettingsProps) {
  const router = useRouter();
  const [createValues, setCreateValues] = useState(createEmptyLabelFormValues());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<LabelFormValues | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedLabels = useMemo(() => sortLabels(labels, "custom"), [labels]);
  const activeLabels = useMemo(
    () => sortedLabels.filter((label) => label.active),
    [sortedLabels],
  );
  const archivedLabels = useMemo(
    () => sortedLabels.filter((label) => !label.active),
    [sortedLabels],
  );

  function cancelCreate() {
    setShowCreateForm(false);
    setCreateValues(createEmptyLabelFormValues());
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditValues(null);
    setError(null);
  }

  function startEditing(label: Label) {
    setShowCreateForm(false);
    setCreateValues(createEmptyLabelFormValues());
    setEditingId(label.id);
    setEditValues(toFormValues(label));
    setError(null);
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
      scope: "personal",
      created_by: userId,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    cancelCreate();
    setLoading(false);
    router.refresh();
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
      .eq("id", editingId)
      .eq("scope", "personal")
      .eq("created_by", userId);

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
      .eq("id", label.id)
      .eq("scope", "personal")
      .eq("created_by", userId);

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

  function renderLabelRow(label: Label) {
    const isEditing = editingId === label.id;

    if (isEditing && editValues) {
      return (
        <li key={label.id} className={adminEditCardClassName}>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Edit personal label
            </h3>
            <LabelFormFields
              idPrefix={`settings-edit-${label.id}`}
              values={editValues}
              onChange={setEditValues}
            />
            <div className="flex flex-wrap gap-2">
              <LoadingButton
                type="submit"
                loading={loading}
                idleLabel="Save changes"
                loadingLabel="Saving…"
                minLabelWidthClassName="min-w-[7.5rem]"
                className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              />
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
        className={`${adminRowClassName} ${label.active ? "" : "opacity-70"}`}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: label.colour }}
            >
              {label.name}
            </span>
            {!label.active ? (
              <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                Archived — hidden from task label pickers
              </p>
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
      </li>
    );
  }

  return (
    <section className={adminSectionClassName}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Personal labels
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Labels only you can see and use. Archive to hide them from task
            pickers without deleting them.
          </p>
        </div>
        {!showCreateForm ? (
          <button
            type="button"
            onClick={() => {
              cancelEditing();
              setShowCreateForm(true);
              setError(null);
            }}
            className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            New personal label
          </button>
        ) : null}
      </div>

      {error ? <p className={`mt-4 ${adminErrorBannerClassName}`}>{error}</p> : null}

      {showCreateForm ? (
        <form
          onSubmit={handleCreate}
          className={`mt-4 ${adminEditCardClassName}`}
        >
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            New personal label
          </h3>
          <div className="mt-4">
            <LabelFormFields
              idPrefix="settings-create"
              values={createValues}
              onChange={setCreateValues}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <LoadingButton
              type="submit"
              loading={loading}
              idleLabel="Create label"
              loadingLabel="Creating…"
              minLabelWidthClassName="min-w-[7.5rem]"
              className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="button"
              onClick={cancelCreate}
              disabled={loading}
              className={adminCancelButtonClassName}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {activeLabels.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Active
          </h3>
          <ul className="space-y-3">{activeLabels.map(renderLabelRow)}</ul>
        </div>
      ) : archivedLabels.length === 0 ? (
        <p className="mt-6 text-sm text-stone-500 dark:text-stone-400">
          No personal labels yet. Create one to use on your tasks.
        </p>
      ) : null}

      {archivedLabels.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Archived
          </h3>
          <ul className="space-y-3">{archivedLabels.map(renderLabelRow)}</ul>
        </div>
      ) : null}
    </section>
  );
}
