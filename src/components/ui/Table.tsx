import { cn } from "@/lib/utils";

/** Card-wrapped table that scrolls horizontally inside its card at narrow widths (spec §8). */
export function TableCard({ className, children, title }: { className?: string; children: React.ReactNode; title?: string }) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-xl border border-line bg-surface", className)}>
      {title && <h2 className="px-5 pt-5 pb-2 text-base font-semibold">{title}</h2>}
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return <table className={cn("w-full border-collapse", className)} {...props} />;
}

export function Th({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn("border-b border-line px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted", className)}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("border-b border-line-soft px-4 py-3.5 text-sm whitespace-nowrap", className)} {...props} />;
}

export function Tr({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("[&:last-child>td]:border-b-0", className)} {...props} />;
}
