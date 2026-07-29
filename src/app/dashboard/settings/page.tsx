import { DashboardHeader } from "@/components/dashboard/header";
import { PersonalLabelSettings } from "@/components/settings/personal-label-settings";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LABEL_SELECT_FIELDS, type Label } from "@/lib/labels/types";
import { createClient } from "@/lib/supabase/server";
import { adminPageErrorClassName, cardClassName } from "@/lib/ui/field-classes";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: labels, error } = await supabase
    .from("labels")
    .select(LABEL_SELECT_FIELDS)
    .eq("scope", "personal")
    .eq("created_by", user.id)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <>
      <DashboardHeader
        title="Settings"
        description="Appearance and personal labels for your account"
        email={user.email}
      />
      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <section className={`${cardClassName} p-6`}>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Appearance
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Choose System, Light, or Dark. This preference is saved in your
              browser.
            </p>
            <div className="mt-4 max-w-xs">
              <ThemeToggle />
            </div>
          </section>

          {error ? (
            <div className={adminPageErrorClassName}>
              Could not load personal labels: {error.message}
            </div>
          ) : (
            <PersonalLabelSettings
              labels={(labels ?? []) as Label[]}
              userId={user.id}
            />
          )}
        </div>
      </div>
    </>
  );
}
