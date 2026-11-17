import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hotelInputSchema } from "@/server/modules/hotel/hotel.schema";
import * as hotelAdminService from "@/server/modules/hotel/hotel-admin.service";
import { pool } from "@/server/db/client";
import { addDays, createHotel, createUser, expectStatus, insertBooking, resetDb, today } from "../helpers";

beforeEach(resetDb);
afterAll(() => pool.end());

const input = (overrides: Record<string, unknown> = {}) =>
  hotelInputSchema.parse({ name: "Harbor House", city: "Porto", country: "Portugal", rooms: 4, nightlyRateCents: 15_000, ...overrides });

describe("admin hotels (F-10 / F-11)", () => {
  it("creates hidden hotels with unique slugs and de-duplicated amenities", async () => {
    const admin = await createUser("admin");
    const a = await hotelAdminService.create(admin, input({ amenities: ["Wi-Fi", "wi-fi ", "Pool"] }));
    const b = await hotelAdminService.create(admin, input());
    expect(a).toMatchObject({ slug: "harbor-house", status: "hidden", amenities: ["Wi-Fi", "Pool"] });
    expect(b.slug).toBe("harbor-house-2");
  });

  it("can't publish without a photo", async () => {
    const admin = await createUser("admin");
    await expectStatus(hotelAdminService.create(admin, input({ status: "published" })), 409);
    const h = await hotelAdminService.create(admin, input());
    await expectStatus(hotelAdminService.update(admin, h.id, { status: "published" }), 409);
  });

  it("can't lower rooms below booked nights", async () => {
    const admin = await createUser("admin");
    const guest = await createUser();
    const h = await createHotel({ rooms: 3 });
    const d = addDays(today(), 5);
    for (let i = 0; i < 2; i++) await insertBooking({ userId: guest.id, hotelId: h.id, checkIn: d, status: "approved" });
    await expectStatus(hotelAdminService.update(admin, h.id, { rooms: 1 }), 409);
    expect((await hotelAdminService.update(admin, h.id, { rooms: 2 })).rooms).toBe(2);
  });

  it("keeps the last photo of a published hotel", async () => {
    const admin = await createUser("admin");
    const h = await createHotel();
    const [img] = (await hotelAdminService.get(h.id)).images;
    await expectStatus(hotelAdminService.removeImage(admin, h.id, img!.id), 409);
  });
});
