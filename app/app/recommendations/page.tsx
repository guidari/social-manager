import { Target } from "lucide-react";
import { EmptyState, PageContainer } from "@/components/ui";

export default function RecommendationsPage() {
  return (
    <PageContainer>
      <EmptyState
        icon={<Target className="h-6 w-6" />}
        title="No recommendations yet"
        description="Publish a few posts and we'll start surfacing your best times to post."
      />
    </PageContainer>
  );
}
