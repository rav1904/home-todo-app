import { SignOutButton } from "@/components/dashboard/sign-out-button";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  email?: string | null;
};

export function DashboardHeader({
  title,
  description,
  email,
}: DashboardHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-stone-200 bg-white px-8 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-stone-500">{description}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        {email ? (
          <span className="hidden rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600 sm:inline">
            {email}
          </span>
        ) : null}
        <SignOutButton />
      </div>
    </header>
  );
}
