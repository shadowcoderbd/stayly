import { PageContainer } from "@/components/layout/Page";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PageContainer size="md" className="max-w-[760px]" aria-busy>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 rounded-xl" />
    </PageContainer>
  );
}
