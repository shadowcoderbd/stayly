// Client-safe public API of the admin-hotels feature.
export { AdminHotels } from "./components/AdminHotels";
export { adminHotelKeys, adminHotelQueries } from "./queries";
export { loadAdminHotelParams, toAdminHotelsQuery, isHotelId } from "./search-params";
export type { AdminHotelPage, AdminHotelRow, AdminHotelsQuery } from "@/server/modules/hotel/hotel.types";
