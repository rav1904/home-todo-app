"use client";

import { LabelBadges } from "@/components/tasks/label-badges";
import { CATEGORY_COLOUR_PRESETS } from "@/lib/categories/colours";
import {
  findPersonalLabelByName,
  groupLabelsForPicker,
} from "@/lib/labels/display";
import { getNextLabelSortOrder } from "@/lib/labels/sort";
import type { Label } from "@/lib/labels/types";
import { validateLabelFormValues } from "@/lib/labels/validation";
import { createClient } from "@/lib/supabase/client";
import { fieldClassName } from "@/lib/ui/field-classes";
import { useMemo, useState } from "react";

type LabelSelectProps = {
  id: string;
  labels: Label[];
  value: string[];
  onChange: (labelIds: string[]) => void;
  onLabelCreated?: (label: Label) => void;
};

function toggleLabelId(selectedIds: string[], labelId: string) {
  if (selectedIds.includes(labelId)) {
    return selectedIds.filter((id) => id !== labelId);
  }

  return [...selectedIds, labelId];
}

export function LabelSelect({
  id,
  labels,
  value,
  onChange,
  onLabelCreated,
}: LabelSelectProps) {
  const [localLabels, setLocalLabels] = useState<Label[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColour, setNewColour] = useState<string>(
    CATEGORY_COLOUR_PRESETS[4].value,
  );
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function cancelCreatePersonalLabel() {
    setShowCreateForm(false);
    setNewName("");
    setNewColour(CATEGORY_COLOUR_PRESETS[4].value);
    setCreateError(null);
  }

  const availableLabels = useMemo(() => {
    const merged = new Map<string, Label>();

    for (const label of [...labels, ...localLabels]) {
      merged.set(label.id, label);
    }

    return [...merged.values()];
  }, [labels, localLabels]);

  const { global, personal } = useMemo(
    () => groupLabelsForPicker(availableLabels),
    [availableLabels],
  );

  const selectedLabels = useMemo(
    () =>
      value
        .map((labelId) => availableLabels.find((label) => label.id === labelId))
        .filter((label): label is Label => label !== undefined),
    [availableLabels, value],
  );

  async function handleCreatePersonalLabel() {
    setCreating(true);
    setCreateError(null);

    const validationError = validateLabelFormValues({
      name: newName,
      colour: newColour,
    });

    if (validationError) {
      setCreateError(validationError);
      setCreating(false);
      return;
    }

    const existing = findPersonalLabelByName(personal, newName);

    if (existing) {
      if (!value.includes(existing.id)) {
        onChange([...value, existing.id]);
      }

      setNewName("");
      setShowCreateForm(false);
      setCreating(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCreateError("You must be signed in to create a label.");
      setCreating(false);
      return;
    }

    const { data: createdLabel, error: insertError } = await supabase
      .from("labels")
      .insert({
        name: newName.trim(),
        colour: newColour,
        sort_order: getNextLabelSortOrder(personal),
        active: true,
        scope: "personal",
        created_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .select(
        "id, name, colour, sort_order, active, scope, created_by, created_at, updated_at",
      )
      .single();

    if (insertError || !createdLabel) {
      setCreateError(insertError?.message ?? "Could not create label.");
      setCreating(false);
      return;
    }

    const label = createdLabel as Label;
    setLocalLabels((current) => [...current, label]);
    onLabelCreated?.(label);
    onChange([...value, label.id]);
    setNewName("");
    setShowCreateForm(false);
    setCreating(false);
  }

  function removeLabel(labelId: string) {
    onChange(value.filter((id) => id !== labelId));
  }

  function renderLabelChip(label: Label) {
    const isSelected = value.includes(label.id);

    return (
      <button
        key={label.id}
        type="button"
        aria-pressed={isSelected}
        aria-label={
          isSelected
            ? `Remove ${label.name} from this task`
            : `Add ${label.name} to this task`
        }
        onClick={() => onChange(toggleLabelId(value, label.id))}
        className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition ${
          isSelected
            ? "text-white ring-2 ring-stone-900 ring-offset-1"
            : "text-white opacity-80 hover:opacity-100"
        }`}
        style={{ backgroundColor: label.colour }}
      >
        {label.name}
      </button>
    );
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
          Labels{" "}
          <span className="font-normal text-stone-400 dark:text-stone-500">
            (optional)
          </span>
        </p>
        {!showCreateForm ? (
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(true);
              setCreateError(null);
            }}
            className="cursor-pointer text-sm font-medium text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            + New personal label
          </button>
        ) : null}
      </div>

      {selectedLabels.length > 0 ? (
        <div className="mb-3 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Selected for this task
            </p>
            <button
              type="button"
              onClick={() => onChange([])}
              className="cursor-pointer text-xs font-medium text-stone-600 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
            >
              Clear all
            </button>
          </div>
          <LabelBadges
            labels={selectedLabels}
            removable
            onRemove={removeLabel}
          />
        </div>
      ) : null}

      {global.length > 0 ? (
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Shared labels
          </p>
          <p className="mb-2 text-xs text-stone-500 dark:text-stone-400">
            Click to add or remove from this task.
          </p>
          <div className="flex flex-wrap gap-1.5">{global.map(renderLabelChip)}</div>
        </div>
      ) : null}

      {personal.length > 0 ? (
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
            My labels
          </p>
          <p className="mb-2 text-xs text-stone-500 dark:text-stone-400">
            Click to add or remove from this task.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {personal.map(renderLabelChip)}
          </div>
        </div>
      ) : null}

      {global.length === 0 && personal.length === 0 ? (
        <p className="mb-3 text-sm text-stone-500 dark:text-stone-400">
          No labels yet. Create a personal label or ask an admin to add shared
          labels.
        </p>
      ) : null}

      {showCreateForm ? (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50">
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
            New personal label
          </p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Only you can see and use personal labels.
          </p>

          <div className="mt-3 space-y-3">
            <div>
              <label
                htmlFor={`${id}-new-label-name`}
                className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
              >
                Name
              </label>
              <input
                id={`${id}-new-label-name`}
                type="text"
                required
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCreatePersonalLabel();
                  }
                }}
                className={fieldClassName}
                placeholder="e.g. Quick win"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">
                Colour
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLOUR_PRESETS.map((preset) => {
                  const isSelected = newColour === preset.value;

                  return (
                    <button
                      key={preset.value}
                      type="button"
                      aria-label={`Select ${preset.label} colour`}
                      aria-pressed={isSelected}
                      onClick={() => setNewColour(preset.value)}
                      className={`h-8 w-8 rounded-full border-2 transition ${
                        isSelected
                          ? "border-stone-900 dark:border-stone-100"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: preset.value }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {createError ? (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {createError}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={creating}
              onClick={cancelCreatePersonalLabel}
              className="cursor-pointer rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleCreatePersonalLabel()}
              className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create and select"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
