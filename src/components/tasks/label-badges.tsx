import type { Label } from "@/lib/labels/types";

type LabelBadgesProps = {
  labels: Label[];
  unavailableCount?: number;
  removable?: boolean;
  onRemove?: (labelId: string) => void;
};

function RemoveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function LabelBadges({
  labels,
  unavailableCount = 0,
  removable = false,
  onRemove,
}: LabelBadgesProps) {
  if (labels.length === 0 && unavailableCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((label) =>
        removable && onRemove ? (
          <button
            key={label.id}
            type="button"
            onClick={() => onRemove(label.id)}
            aria-label={`Remove ${label.name} label`}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full py-0.5 pl-2 pr-1.5 text-xs font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: label.colour }}
          >
            {label.name}
            <RemoveIcon />
          </button>
        ) : (
          <span
            key={label.id}
            className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: label.colour }}
          >
            {label.name}
          </span>
        ),
      )}
      {unavailableCount > 0 ? (
        <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
          {unavailableCount === 1
            ? "Label unavailable"
            : `${unavailableCount} labels unavailable`}
        </span>
      ) : null}
    </div>
  );
}
