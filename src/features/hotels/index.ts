// Client-safe public API of the hotels feature.
export { HeroSearch } from "./components/HeroSearch";
export { TrendingDestinations } from "./components/TrendingDestinations";
export { TopRated } from "./components/TopRated";
export { TrendingThisWeek } from "./components/TrendingThisWeek";
export { AllHotels } from "./components/AllHotels";
export { HotelHeader, HotelGallery, HotelAbout } from "./components/HotelOverview";
export { HotelImage } from "./components/HotelImage";
export { useAvailability } from "./hooks/useAvailability";
export { hotelKeys, hotelQueries } from "./queries";
export { loadHotelListParams, toHotelQuery, dateQuery, stayError, MAX_NIGHTS } from "./search-params";
export type {
  Availability,
  Destination,
  HotelCard,
  HotelDetail,
  HotelImage as HotelImageData,
  HotelPage,
  HotelQuery,
  HotelStatus,
  Location,
} from "@/server/modules/hotel/hotel.types";
