import { PageLoadingSkeleton } from "@/components/dashboard/page-loading-skeleton";

export default function TasksLoading() {
  return <PageLoadingSkeleton label="Loading tasks" rows={6} />;
}
