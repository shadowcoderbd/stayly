"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { formatMoney } from "@/lib/format";
import { useCancelBooking } from "../hooks/useCancelBooking";
import type { Booking } from "@/server/modules/booking/booking.types";

export function CancelBookingDialog({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);
  const { cancelBooking, isCancelling } = useCancelBooking();
  const isApproved = booking.status === "approved";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="md">
          {isApproved ? "Cancel booking" : "Cancel request"}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={isApproved ? `Cancel booking ${booking.ref}?` : `Cancel request ${booking.ref}?`}
        description={
          isApproved
            ? `Your stay at ${booking.hotel.name} will be cancelled and ${formatMoney(booking.totalCents)} refunded in full.`
            : `The hotel won't review this request. You haven't been charged.`
        }
      >
        <div className="flex flex-wrap justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline" size="md">
              Keep it
            </Button>
          </DialogClose>
          <Button
            variant="primary"
            size="md"
            isLoading={isCancelling}
            onClick={() => cancelBooking(booking.ref, { onSuccess: () => setOpen(false) })}
          >
            {isApproved ? "Cancel and refund" : "Cancel request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
