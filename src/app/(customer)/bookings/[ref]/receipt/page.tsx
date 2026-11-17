import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/Page";
import { hasReceipt, Receipt } from "@/features/bookings";
import { bookingRefSchema } from "@/server/modules/booking/booking.schema";
import * as bookingService from "@/server/modules/booking/booking.service";
import { requireCustomer } from "@/server/lib/auth";

export async function generateMetadata({ params }: PageProps<"/bookings/[ref]/receipt">): Promise<Metadata> {
  return { title: `Receipt ${(await params).ref}` };
}

/** Read-only: rendered from the service, printable (spec F-07). */
export default async function ReceiptPage({ params }: PageProps<"/bookings/[ref]/receipt">) {
  const { ref } = await params;
  const actor = await requireCustomer(`/bookings/${ref}/receipt`);
  if (!bookingRefSchema.safeParse(ref).success) notFound();

  const booking = await bookingService.findMine(actor, ref);
  if (!booking || !hasReceipt(booking)) notFound();

  return (
    <PageContainer size="md" className="max-w-[760px]">
      <Receipt booking={booking} />
    </PageContainer>
  );
}
