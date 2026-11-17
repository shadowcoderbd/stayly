import { useQuery } from "@tanstack/react-query";
import { hotelQueries } from "../queries";

/** Rooms left for a stay. Only runs once both dates form a valid range. */
export function useAvailability(hotelId: string, checkIn: string, checkOut: string) {
  const isValidRange = !!checkIn && !!checkOut && checkOut > checkIn;
  const { data, isFetching, isError } = useQuery({
    ...hotelQueries.availability(hotelId, checkIn, checkOut),
    enabled: isValidRange,
  });
  return {
    availability: isValidRange ? data : undefined,
    isChecking: isValidRange && isFetching,
    isError: isValidRange && isError,
  };
}
