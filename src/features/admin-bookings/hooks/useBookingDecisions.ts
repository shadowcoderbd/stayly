import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AdminBookingPage, BookingCounts } from "@/features/bookings";
import { financeKeys } from "@/features/finance";
import { hotelKeys } from "@/features/hotels";
import { toast } from "@/lib/toast";
import { adminBookingApi } from "../api/admin-booking.api";
import { adminBookingKeys } from "../queries";

/** Approve/reject change the queue, the tab counts, finance and availability (spec F-12 AC). */
function useInvalidateDecisions() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminBookingKeys.all }),
      queryClient.invalidateQueries({ queryKey: financeKeys.all }),
      queryClient.invalidateQueries({ queryKey: hotelKeys.all }),
    ]);
}

/** Optimistic: the row flips to Approved at once; a 409 rolls it back and the error is toasted globally. */
export function useApproveBooking() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateDecisions();

  const { mutate: approveBooking, isPending: isApproving, variables: approvingId } = useMutation({
    mutationFn: adminBookingApi.approve,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: adminBookingKeys.all });
      const lists = queryClient.getQueriesData<AdminBookingPage>({ queryKey: adminBookingKeys.lists() });
      const counts = queryClient.getQueryData<BookingCounts>(adminBookingKeys.counts());

      queryClient.setQueriesData<AdminBookingPage>({ queryKey: adminBookingKeys.lists() }, (page) =>
        page && {
          ...page,
          items: page.items.map((b) =>
            b.id === id ? { ...b, status: "approved" as const, roomsLeft: null, decidedAt: new Date().toISOString() } : b,
          ),
        },
      );
      if (counts) queryClient.setQueryData(adminBookingKeys.counts(), { ...counts, pending: counts.pending - 1, approved: counts.approved + 1 });
      return { lists, counts };
    },
    onError: (_error, _id, context) => {
      context?.lists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      if (context?.counts) queryClient.setQueryData(adminBookingKeys.counts(), context.counts);
    },
    onSuccess: (res) => toast.success(res.message),
    onSettled: invalidate,
  });

  return { approveBooking, isApproving, approvingId };
}

export function useRejectBooking() {
  const invalidate = useInvalidateDecisions();
  const { mutate: rejectBooking, isPending: isRejecting } = useMutation({
    mutationFn: adminBookingApi.reject,
    onSuccess: (res) => {
      toast.success(res.message);
      return invalidate();
    },
  });
  return { rejectBooking, isRejecting };
}
