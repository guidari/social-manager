import { Settings } from "lucide-react";
import { EmptyState, PageContainer } from "@/components/ui";

export default function SettingsPage() {
  return (
    <PageContainer>
      <EmptyState
        icon={<Settings className="h-6 w-6" />}
        title="Settings"
        description="Workspace, team, and notification settings will live here."
      />
    </PageContainer>
  );
}
