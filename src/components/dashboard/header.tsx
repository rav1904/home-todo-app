import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { ThemeMenu } from "@/components/theme/theme-menu";

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
    <header className="flex items-start justify-between gap-4 border-b border-stone-200 bg-white px-8 py-6 dark:border-stone-800 dark:bg-stone-900">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {description}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {email ? (
          <span className="mr-1 hidden rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600 sm:inline dark:bg-stone-800 dark:text-stone-300">
            {email}
          </span>
        ) : null}
        <ThemeMenu />
        <SignOutButton />
      </div>
    </header>
  );
}
