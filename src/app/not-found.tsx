import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold text-muted">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="text-[15px] text-muted">It may have moved, or the hotel is no longer listed.</p>
      <Link href="/" className={buttonStyles()}>
        Browse hotels
      </Link>
    </main>
  );
}
