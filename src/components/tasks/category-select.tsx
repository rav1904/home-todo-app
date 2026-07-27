import { CategoryIcon } from "@/lib/categories/icons";
import type { Category } from "@/lib/categories/types";
import { buildCategoryTree } from "@/lib/categories/tree";

type CategorySelectProps = {
  id: string;
  label?: string;
  value: string | null;
  onChange: (categoryId: string | null) => void;
  categories: Category[];
  optional?: boolean;
  className?: string;
};

export function CategorySelect({
  id,
  label = "Category",
  value,
  onChange,
  categories,
  optional = true,
  className,
}: CategorySelectProps) {
  const { mains, subsByParent } = buildCategoryTree(categories);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-stone-700">
        {label}{" "}
        {optional ? (
          <span className="font-normal text-stone-400">(optional)</span>
        ) : null}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value ? event.target.value : null)
        }
        className={
          className ??
          "w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
        }
      >
        <option value="">None</option>
        {mains.map((main) => {
          const subcategories = subsByParent[main.id] ?? [];

          if (subcategories.length === 0) {
            return (
              <option key={main.id} value={main.id}>
                {main.name}
              </option>
            );
          }

          return (
            <optgroup key={main.id} label={main.name}>
              <option value={main.id}>{main.name}</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </div>
  );
}

type CategoryBadgeProps = {
  category: {
    label: string;
    colour: string;
    icon_name: string;
  } | null;
  unavailable?: boolean;
};

export function CategoryBadge({ category, unavailable = false }: CategoryBadgeProps) {
  if (unavailable) {
    return (
      <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-500">
        Category unavailable
      </span>
    );
  }

  if (!category) {
    return null;
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
      style={{ backgroundColor: category.colour }}
    >
      <CategoryIcon iconName={category.icon_name} className="h-3.5 w-3.5" />
      {category.label}
    </span>
  );
}
