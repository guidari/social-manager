import { AtSign } from "lucide-react";
import { EmptyState, PageContainer } from "@/components/ui";

export default function AccountsPage() {
  return (
    <PageContainer>
      <EmptyState
        icon={<AtSign className="h-6 w-6" />}
        title="Connect your first account"
        description="Link a YouTube or TikTok account to start publishing from PostPilot."
      />
    </PageContainer>
  );
}
