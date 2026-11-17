"use client";

import { DropdownMenu as Radix } from "radix-ui";
import { cn } from "@/lib/utils";

export const DropdownMenu = Radix.Root;
export const DropdownMenuTrigger = Radix.Trigger;

export function DropdownMenuContent({ className, ...props }: React.ComponentProps<typeof Radix.Content>) {
  return (
    <Radix.Portal>
      <Radix.Content
        align="end"
        sideOffset={8}
        className={cn("z-50 min-w-48 rounded-xl border border-line bg-surface p-1 shadow-lg", className)}
        {...props}
      />
    </Radix.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof Radix.Item>) {
  return (
    <Radix.Item
      className={cn(
        "flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm outline-none select-none data-[highlighted]:bg-hover",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof Radix.Label>) {
  return <Radix.Label className={cn("px-3 py-2 text-[13px] text-muted", className)} {...props} />;
}

export const DropdownMenuSeparator = () => <Radix.Separator className="my-1 h-px bg-line" />;
