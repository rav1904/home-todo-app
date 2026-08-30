import { PageLoadingSkeleton } from "@/components/dashboard/page-loading-skeleton";

export default function DashboardLoading() {
  return <PageLoadingSkeleton label="Loading overview" rows={4} />;
}
