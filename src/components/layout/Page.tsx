import { cn } from "@/lib/utils";

export function PageContainer({ className, size = "lg", ...props }: React.ComponentProps<"main"> & { size?: "md" | "lg" }) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10",
        size === "md" ? "max-w-[1000px]" : "max-w-[1200px]",
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[30px] leading-tight font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-[15px] text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print mt-auto border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-3 px-4 py-6 text-[13px] text-muted sm:px-6">
        <span>© {new Date().getFullYear()} Stayly</span>
        <span>Demo photos from Unsplash</span>
      </div>
    </footer>
  );
}
