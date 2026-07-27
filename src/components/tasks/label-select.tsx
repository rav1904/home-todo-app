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
import { useMemo, useState } from "react";

const fieldClassName =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20";

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

  async function handleCreatePersonalLabel(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
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
        <p className="text-sm font-medium text-stone-700">
          Labels{" "}
          <span className="font-normal text-stone-400">(optional)</span>
        </p>
        <button
          type="button"
          onClick={() => {
            setShowCreateForm((current) => !current);
            setCreateError(null);
          }}
          className="cursor-pointer text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
        >
          {showCreateForm ? "Cancel new label" : "+ New personal label"}
        </button>
      </div>

      {selectedLabels.length > 0 ? (
        <div className="mb-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Selected for this task
            </p>
            <button
              type="button"
              onClick={() => onChange([])}
              className="cursor-pointer text-xs font-medium text-stone-600 transition hover:text-stone-900"
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
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
            Shared labels
          </p>
          <p className="mb-2 text-xs text-stone-500">
            Click to add or remove from this task.
          </p>
          <div className="flex flex-wrap gap-1.5">{global.map(renderLabelChip)}</div>
        </div>
      ) : null}

      {personal.length > 0 ? (
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
            My labels
          </p>
          <p className="mb-2 text-xs text-stone-500">
            Click to add or remove from this task.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {personal.map(renderLabelChip)}
          </div>
        </div>
      ) : null}

      {global.length === 0 && personal.length === 0 ? (
        <p className="mb-3 text-sm text-stone-500">
          No labels yet. Create a personal label or ask an admin to add shared
          labels.
        </p>
      ) : null}

      {showCreateForm ? (
        <form
          onSubmit={handleCreatePersonalLabel}
          className="rounded-xl border border-stone-200 bg-stone-50 p-4"
        >
          <p className="text-sm font-medium text-stone-900">
            New personal label
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Only you can see and use personal labels.
          </p>

          <div className="mt-3 space-y-3">
            <div>
              <label
                htmlFor={`${id}-new-label-name`}
                className="mb-1.5 block text-sm font-medium text-stone-700"
              >
                Name
              </label>
              <input
                id={`${id}-new-label-name`}
                type="text"
                required
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                className={fieldClassName}
                placeholder="e.g. Quick win"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-stone-700">Colour</p>
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
                        isSelected ? "border-stone-900" : "border-transparent"
                      }`}
                      style={{ backgroundColor: preset.value }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {createError ? (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {createError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={creating}
            className="mt-3 cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create and select"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
