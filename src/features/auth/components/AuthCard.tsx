export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="flex w-full grow items-start justify-center px-4 py-12 sm:py-20">
      <div className="flex w-full max-w-[400px] flex-col gap-6 rounded-[14px] border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-[15px] text-muted">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
