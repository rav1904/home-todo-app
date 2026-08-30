import { PageLoadingSkeleton } from "@/components/dashboard/page-loading-skeleton";

export default function AdminLoading() {
  return <PageLoadingSkeleton label="Loading admin" rows={4} />;
}
