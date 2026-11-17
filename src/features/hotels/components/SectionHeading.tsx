export function SectionHeading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
