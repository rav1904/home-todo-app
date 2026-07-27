import { AdminSubnav } from "@/components/admin/admin-subnav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminSubnav />
      {children}
    </>
  );
}
