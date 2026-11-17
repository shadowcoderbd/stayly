export function StarIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5 7.5-.7z" />
    </svg>
  );
}

export function Rating({ value, className }: { value: number | null; className?: string }) {
  if (value === null) return <span className="text-sm text-muted">New</span>;
  return (
    <span className={className ?? "inline-flex items-center gap-1 text-sm font-semibold"}>
      <StarIcon />
      <span>
        <span className="sr-only">Rated </span>
        {value.toFixed(1)}
      </span>
    </span>
  );
}
