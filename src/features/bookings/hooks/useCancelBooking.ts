import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { bookingApi } from "../api/booking.api";
import { bookingKeys } from "../queries";

export function useCancelBooking() {
  const queryClient = useQueryClient();

  const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
    mutationFn: bookingApi.cancel,
    onSuccess: (res) => {
      toast.success(res.message);
      // Refreshes the cards and the tab counts without a full reload (spec F-06).
      return queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });

  return { cancelBooking, isCancelling };
}
