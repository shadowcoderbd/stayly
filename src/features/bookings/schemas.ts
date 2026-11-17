import { z } from "zod";
import { rejectionReasonSchema } from "@/lib/domain/booking";

// Client-side form schemas. The API's request schemas live in @/server/modules/booking/booking.schema.

export const rejectBookingSchema = z.object({ reason: rejectionReasonSchema });
