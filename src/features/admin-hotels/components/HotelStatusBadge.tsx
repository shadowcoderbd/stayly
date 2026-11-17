import { Badge } from "@/components/ui/Badge";
import type { HotelStatus } from "@/server/modules/hotel/hotel.types";

export function HotelStatusBadge({ status }: { status: HotelStatus }) {
  return status === "published" ? <Badge tone="green">Published</Badge> : <Badge tone="grey">Hidden</Badge>;
}
