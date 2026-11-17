"use client";

import { Dialog as RadixDialog } from "radix-ui";
import { cn } from "@/lib/utils";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export function DialogContent({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in" />
      <RadixDialog.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-[14px] bg-surface p-6 shadow-2xl",
          className,
        )}
      >
        <div className="flex flex-col gap-1.5">
          <RadixDialog.Title className="text-lg font-semibold tracking-tight">{title}</RadixDialog.Title>
          {description ? (
            <RadixDialog.Description className="text-sm leading-relaxed text-muted">{description}</RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          )}
        </div>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
