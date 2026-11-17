import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hotelKeys } from "@/features/hotels";
import { toast } from "@/lib/toast";
import { bookingApi } from "../api/booking.api";
import { bookingKeys } from "../queries";

export function useCreateBooking() {
  const queryClient = useQueryClient();

  const { mutate: createBooking, isPending: isCreating } = useMutation({
    mutationFn: bookingApi.create,
    onSuccess: (res) => {
      toast.success(res.message);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
        queryClient.invalidateQueries({ queryKey: hotelKeys.all }),
      ]);
    },
    // Errors (409 fully booked, overlap, limits) are toasted globally.
  });

  return { createBooking, isCreating };
}
