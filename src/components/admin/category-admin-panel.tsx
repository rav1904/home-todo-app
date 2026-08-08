"use client";

import {
  CategoryFormFields,
  createEmptyCategoryFormValues,
} from "@/components/admin/category-form-fields";
import { CategoryIcon } from "@/lib/categories/icons";
import {
  getNextSortOrder,
  moveSibling,
  reorderSiblings,
  sortCategories,
  toSortOrderUpdates,
  type CategorySortMode,
} from "@/lib/categories/sort";
import type { Category, CategoryFormValues } from "@/lib/categories/types";
import { validateCategoryFormValues } from "@/lib/categories/validation";
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

type CategoryAdminPanelProps = {
  categories: Category[];
};

function toFormValues(category: Category): CategoryFormValues {
  return {
    name: category.name,
    colour: category.colour,
    icon_name: category.icon_name,
    parent_id: category.parent_id,
  };
}

export function CategoryAdminPanel({ categories }: CategoryAdminPanelProps) {
  const router = useRouter();
  const [createValues, setCreateValues] = useState(createEmptyCategoryFormValues());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<CategoryFormValues | null>(null);
  const [sortMode, setSortMode] = useState<CategorySortMode>("az");
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mainCategories = useMemo(
    () =>
      sortCategories(
        categories.filter((category) => category.parent_id === null),
        sortMode,
      ),
    [categories, sortMode],
  );

  const subcategoriesByParent = useMemo(() => {
    const grouped: Record<string, Category[]> = {};

    for (const category of categories) {
      if (!category.parent_id) {
        continue;
      }

      if (!grouped[category.parent_id]) {
        grouped[category.parent_id] = [];
      }

      grouped[category.parent_id].push(category);
    }

    for (const parentId of Object.keys(grouped)) {
      grouped[parentId] = sortCategories(grouped[parentId], sortMode);
    }

    return grouped;
  }, [categories, sortMode]);

  const activeMainCategories = useMemo(
    () => mainCategories.filter((category) => category.active),
    [mainCategories],
  );

  async function persistSortOrders(
    updates: { id: string; sort_order: number }[],
  ) {
    const supabase = createClient();
    const timestamp = new Date().toISOString();

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("categories")
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

  async function applySiblingReorder(siblings: Category[]) {
    setLoading(true);
    setError(null);

    try {
      await persistSortOrders(toSortOrderUpdates(siblings));
      router.refresh();
    } catch (reorderError) {
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : "Could not update category order.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const validationError = validateCategoryFormValues(createValues);
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("categories").insert({
      name: createValues.name.trim(),
      colour: createValues.colour,
      icon_name: createValues.icon_name,
      sort_order: getNextSortOrder(categories, createValues.parent_id),
      parent_id: createValues.parent_id,
      active: true,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setCreateValues(createEmptyCategoryFormValues());
    setLoading(false);
    router.refresh();
  }

  function startEditing(category: Category) {
    setEditingId(category.id);
    setEditValues(toFormValues(category));
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

    const validationError = validateCategoryFormValues(editValues);
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    const originalCategory = categories.find(
      (category) => category.id === editingId,
    );

    if (!originalCategory) {
      setError("Could not find that category.");
      setLoading(false);
      return;
    }

    const nextParentId = editValues.parent_id;

    // Two-level tree only: a main category with children cannot become a subcategory.
    if (nextParentId !== null) {
      const hasChildCategories = categories.some(
        (category) => category.parent_id === editingId,
      );
      if (hasChildCategories) {
        setError(
          "This category has subcategories. Move or remove those first before nesting it under another category.",
        );
        setLoading(false);
        return;
      }

      const parentCategory = categories.find(
        (category) => category.id === nextParentId,
      );
      if (!parentCategory || parentCategory.parent_id !== null) {
        setError("Parent must be a top-level category.");
        setLoading(false);
        return;
      }

      if (nextParentId === editingId) {
        setError("A category cannot be its own parent.");
        setLoading(false);
        return;
      }
    }

    const parentChanged = originalCategory.parent_id !== nextParentId;
    const updatePayload: {
      name: string;
      colour: string;
      icon_name: string;
      parent_id: string | null;
      updated_at: string;
      sort_order?: number;
    } = {
      name: editValues.name.trim(),
      colour: editValues.colour,
      icon_name: editValues.icon_name,
      parent_id: nextParentId,
      updated_at: new Date().toISOString(),
    };

    // Place the category at the end of its new sibling group when parent changes.
    if (parentChanged) {
      updatePayload.sort_order = getNextSortOrder(categories, nextParentId);
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("categories")
      .update(updatePayload)
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

  async function setCategoryActive(category: Category, active: boolean) {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("categories")
      .update({
        active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", category.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    if (editingId === category.id) {
      cancelEditing();
    }

    setLoading(false);
    router.refresh();
  }

  async function handleMoveCategory(
    category: Category,
    siblings: Category[],
    direction: "up" | "down",
  ) {
    if (sortMode !== "custom") {
      return;
    }

    const reordered = moveSibling(siblings, category.id, direction);

    if (reordered === siblings) {
      return;
    }

    await applySiblingReorder(reordered);
  }

  async function handleDropCategory(
    targetCategory: Category,
    siblings: Category[],
  ) {
    if (sortMode !== "custom" || !draggedCategoryId) {
      return;
    }

    const reordered = reorderSiblings(
      siblings,
      draggedCategoryId,
      targetCategory.id,
    );

    setDraggedCategoryId(null);

    if (reordered === siblings) {
      return;
    }

    await applySiblingReorder(reordered);
  }

  function renderSortControls(siblings: Category[], category: Category) {
    if (sortMode !== "custom") {
      return null;
    }

    const index = siblings.findIndex((item) => item.id === category.id);

    return (
      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          draggable
          onDragStart={() => setDraggedCategoryId(category.id)}
          onDragEnd={() => setDraggedCategoryId(null)}
          aria-label={`Drag ${category.name}`}
          className={`cursor-grab ${adminIconButtonClassName} p-1.5 active:cursor-grabbing`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => handleMoveCategory(category, siblings, "up")}
          disabled={loading || index === 0}
          aria-label={`Move ${category.name} up`}
          className={`cursor-pointer ${adminIconButtonClassName} p-1`}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => handleMoveCategory(category, siblings, "down")}
          disabled={loading || index === siblings.length - 1}
          aria-label={`Move ${category.name} down`}
          className={`cursor-pointer ${adminIconButtonClassName} p-1`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    );
  }

  function renderCategoryRow(
    category: Category,
    siblings: Category[],
    isSubcategory = false,
  ) {
    const isEditing = editingId === category.id;

    if (isEditing && editValues) {
      return (
        <li
          key={category.id}
          className={adminEditCardClassName}
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Edit {isSubcategory ? "subcategory" : "category"}
            </h3>
            <CategoryFormFields
              idPrefix={`edit-${category.id}`}
              values={editValues}
              onChange={setEditValues}
              mainCategories={activeMainCategories.filter(
                (main) => main.id !== category.id,
              )}
              showParentSelect
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
        key={category.id}
        onDragOver={(event) => {
          if (sortMode === "custom") {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          void handleDropCategory(category, siblings);
        }}
        className={`${adminRowClassName} ${
          category.active ? "" : "opacity-70"
        } ${isSubcategory ? "ml-6" : ""} ${
          draggedCategoryId === category.id ? "opacity-60" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          {renderSortControls(siblings, category)}
          <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: category.colour }}
              >
                <CategoryIcon iconName={category.icon_name} className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-stone-900 dark:text-stone-100">{category.name}</p>
                {!category.active ? (
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Archived</p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => startEditing(category)}
                disabled={loading}
                className={adminSecondaryButtonClassName}
              >
                Edit
              </button>
              {category.active ? (
                <button
                  type="button"
                  onClick={() => setCategoryActive(category, false)}
                  disabled={loading}
                  className={adminSecondaryButtonClassName}
                >
                  Archive
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCategoryActive(category, true)}
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
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Create category</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Add a top-level category or subcategory. New categories are appended to
          the custom order automatically.
        </p>

        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <CategoryFormFields
            idPrefix="create"
            values={createValues}
            onChange={setCreateValues}
            mainCategories={activeMainCategories}
            showParentSelect
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
            {loading ? "Creating..." : "Create category"}
          </button>
        </form>
      </section>

      <section className={adminSectionClassName}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Categories</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Sort alphabetically or use custom order with drag and arrows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["az", "A-Z"],
                ["za", "Z-A"],
                ["custom", "Custom"],
              ] as const
            ).map(([mode, label]) => (
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
                {label}
              </button>
            ))}
          </div>
        </div>

        {categories.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">No categories yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {mainCategories.map((mainCategory) => {
              const subcategories = subcategoriesByParent[mainCategory.id] ?? [];

              return (
                <div key={mainCategory.id} className="space-y-2">
                  {renderCategoryRow(mainCategory, mainCategories)}
                  {subcategories.map((subcategory) =>
                    renderCategoryRow(subcategory, subcategories, true),
                  )}
                </div>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
