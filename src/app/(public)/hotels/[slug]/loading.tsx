import { PageContainer } from "@/components/layout/Page";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PageContainer className="gap-7" aria-busy>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-56" />
      </div>
      <Skeleton className="h-64 rounded-[14px] md:h-95" />
      <div className="flex flex-wrap gap-10">
        <div className="flex flex-[999_1_520px] flex-col gap-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-80 flex-[1_1_340px] rounded-xl" />
      </div>
    </PageContainer>
  );
}
