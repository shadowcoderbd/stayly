import { apiHandler } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import * as hotelService from "@/server/modules/hotel/hotel.service";

export const GET = apiHandler("public", async () => ok(await hotelService.destinations()));
