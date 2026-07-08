import { LayoutDashboard } from "lucide-react";
import { EmptyState, PageContainer } from "@/components/ui";

export default function DashboardPage() {
  return (
    <PageContainer>
      <EmptyState
        icon={<LayoutDashboard className="h-6 w-6" />}
        title="Welcome to PostPilot"
        description="Your dashboard will surface upcoming posts, performance, and recommendations once you start publishing."
      />
    </PageContainer>
  );
}
