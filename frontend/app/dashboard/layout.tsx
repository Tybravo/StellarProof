import DashboardSidebar from "@/components/layout/DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0">
        <main className="p-4 pt-16 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
