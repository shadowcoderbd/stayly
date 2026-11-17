import { initials } from "@/lib/utils";

export function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-line text-xs font-semibold text-ink"
    >
      {initials(name)}
    </span>
  );
}
