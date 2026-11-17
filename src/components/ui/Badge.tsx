import { cn } from "@/lib/utils";

export type BadgeTone = "amber" | "green" | "red" | "grey" | "orange" | "dark";

const tones: Record<BadgeTone, string> = {
  amber: "bg-amber-bg text-amber-fg",
  green: "bg-green-bg text-green-fg",
  red: "bg-red-bg text-red-fg",
  grey: "bg-grey-bg text-grey-fg",
  orange: "bg-orange-bg text-orange-fg",
  dark: "bg-primary text-white",
};

export function Badge({ tone = "grey", className, ...props }: React.ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap", tones[tone], className)}
      {...props}
    />
  );
}
