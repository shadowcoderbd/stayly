"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Field, invalidProps, Textarea } from "@/components/ui/Field";
import { rejectBookingSchema, type AdminBooking, type RejectBookingInput } from "@/features/bookings";
import { useRejectBooking } from "../hooks/useBookingDecisions";

export function RejectDialog({ booking, disabled }: { booking: AdminBooking; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const { rejectBooking, isRejecting } = useRejectBooking();
  const form = useForm<RejectBookingInput>({ resolver: zodResolver(rejectBookingSchema), defaultValues: { reason: "" } });
  const error = form.formState.errors.reason?.message;
  const length = useWatch({ control: form.control, name: "reason" }).length;

  const onSubmit = form.handleSubmit(({ reason }) =>
    rejectBooking(
      { id: booking.id, reason },
      {
        onSuccess: () => {
          setOpen(false);
          form.reset();
        },
      },
    ),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="danger" size="sm" disabled={disabled} aria-label={`Reject ${booking.ref}`}>
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent
        title={`Reject ${booking.ref}?`}
        description={`${booking.guest.name} will see this reason on their booking for ${booking.hotel.name}.`}
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field label="Reason" htmlFor="reject-reason" error={error} hint={`${length}/300`}>
            <Textarea
              id="reject-reason"
              maxLength={300}
              placeholder="e.g. We're fully booked that week."
              autoFocus
              {...form.register("reason")}
              {...invalidProps("reject-reason", error)}
            />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="md">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="md" isLoading={isRejecting}>
              Reject request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
