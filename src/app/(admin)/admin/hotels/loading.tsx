import { PageContainer } from "@/components/layout/Page";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PageContainer aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-80" />
      </div>
      <div className="flex flex-wrap gap-6">
        <Skeleton className="h-96 flex-[999_1_560px] rounded-xl" />
        <Skeleton className="h-96 flex-[1_1_360px] rounded-xl" />
      </div>
    </PageContainer>
  );
}
