import { SquarePlus } from "lucide-react";
import { EmptyState, PageContainer } from "@/components/ui";

export default function CreatePostPage() {
  return (
    <PageContainer>
      <EmptyState
        icon={<SquarePlus className="h-6 w-6" />}
        title="Create your first post"
        description="Draft content and schedule it to YouTube and TikTok."
      />
    </PageContainer>
  );
}
