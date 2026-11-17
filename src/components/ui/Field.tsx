import { cn } from "@/lib/utils";

export const fieldStyles =
  "w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-faint aria-invalid:border-red-fg disabled:opacity-60";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldStyles, "h-10", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(fieldStyles, "h-10 cursor-pointer", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldStyles, "min-h-22 resize-y py-2.5", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-[13px] font-medium", className)} {...props} />;
}

/** Label + control + error/hint, wired for screen readers. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  labelClassName,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: string;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} className={labelClassName}>
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-[13px] text-red-fg">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Props that connect a control to its Field error. */
export const invalidProps = (id: string, error?: string) =>
  error ? ({ "aria-invalid": true, "aria-describedby": `${id}-error` } as const) : {};
