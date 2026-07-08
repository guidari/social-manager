import { BarChart3 } from "lucide-react";
import { EmptyState, PageContainer } from "@/components/ui";

export default function AnalyticsPage() {
  return (
    <PageContainer>
      <EmptyState
        icon={<BarChart3 className="h-6 w-6" />}
        title="No analytics yet"
        description="Publish content to start receiving analytics."
      />
    </PageContainer>
  );
}
