import { PageLoadingSkeleton } from "@/components/dashboard/page-loading-skeleton";

export default function CalendarLoading() {
  return <PageLoadingSkeleton label="Loading calendar" rows={8} />;
}
