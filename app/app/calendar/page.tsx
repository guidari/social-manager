import { Calendar } from "lucide-react";
import { EmptyState, PageContainer } from "@/components/ui";

export default function CalendarPage() {
  return (
    <PageContainer>
      <EmptyState
        icon={<Calendar className="h-6 w-6" />}
        title="No scheduled posts yet"
        description="Posts you schedule will show up here on the calendar."
      />
    </PageContainer>
  );
}
