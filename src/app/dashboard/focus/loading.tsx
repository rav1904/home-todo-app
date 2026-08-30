import { PageLoadingSkeleton } from "@/components/dashboard/page-loading-skeleton";

export default function FocusLoading() {
  return <PageLoadingSkeleton label="Loading focus" rows={5} />;
}
