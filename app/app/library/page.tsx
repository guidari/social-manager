import { Library } from "lucide-react";
import { EmptyState, PageContainer } from "@/components/ui";

export default function LibraryPage() {
  return (
    <PageContainer>
      <EmptyState
        icon={<Library className="h-6 w-6" />}
        title="Upload your first video"
        description="Your media library will keep every asset you upload in one place."
      />
    </PageContainer>
  );
}
