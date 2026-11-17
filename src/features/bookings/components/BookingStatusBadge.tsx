import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { BookingStatus } from "@/server/modules/booking/booking.types";

const STATUS: Record<BookingStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending review", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
  cancelled: { label: "Cancelled", tone: "grey" },
};

export function BookingStatusBadge({ status, short = false }: { status: BookingStatus; short?: boolean }) {
  const { label, tone } = STATUS[status];
  return <Badge tone={tone}>{short && status === "pending" ? "Pending" : label}</Badge>;
}
