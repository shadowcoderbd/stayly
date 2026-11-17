import { cn } from "@/lib/utils";

export function EmptyState({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[14px] border border-dashed border-line-strong bg-surface p-12 text-center text-[15px] text-muted", className)}>
      {children}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex justify-center p-10">
      <span aria-hidden className="size-6 animate-spin rounded-full border-2 border-line-strong border-r-transparent" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
