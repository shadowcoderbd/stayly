import { readFile } from "node:fs/promises";
import path from "node:path";
import { count, eq, inArray, sql } from "drizzle-orm";
import { quote } from "@/server/modules/booking/booking.pricing";
import { auth } from "@/server/lib/better-auth";
import { addDays, nightsBetween, today } from "@/server/lib/dates";
import { db, pool } from "@/server/db/client";
import { booking, destination, hotel, hotelImage, review, transaction, user } from "@/server/db/schema";
import { storage } from "@/server/lib/storage";

/**
 * Local demo data (spec §10). Idempotent: does nothing if hotels already exist.
 * Dates are relative to today so the data always looks current.
 */

// Run with `tsx --conditions=react-server` so the `server-only` guard resolves to a no-op.
const imagesDir = process.env.SEED_IMAGES_DIR ?? path.resolve(import.meta.dirname, "../seed/images");

// Deterministic PRNG so every fresh seed looks the same.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261116);
const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!;
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const ADMIN = { name: "Morgan Reyes", email: "admin@stayly.local", password: "admin12345" };
const AVERY = { name: "Avery Chen", email: "avery@stayly.local", password: "avery12345" };
const CUSTOMERS = [
  "Jonas Weber",
  "Priya Nair",
  "Lucía Ortega",
  "Sam Okafor",
  "Elena Rossi",
  "Tom Becker",
  "Mei Lin",
  "Diego Ramos",
  "Hana Sato",
  "Noah Williams",
].map((name) => ({
  name,
  email: `${name.split(" ")[0]!.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()}@stayly.local`,
  password: "password123",
}));

type SeedHotel = {
  slug: string;
  name: string;
  city: string;
  country: string;
  rate: number;
  rooms: number;
  rating: number;
  reviews: number;
  status: "published" | "hidden";
  description: string;
  amenities: string[];
  images: { file: string; alt: string }[];
};

const HOTELS: SeedHotel[] = [
  {
    slug: "alpine-lodge",
    name: "Alpine Lodge",
    city: "Zermatt",
    country: "Switzerland",
    rate: 265,
    rooms: 22,
    rating: 4.9,
    reviews: 842,
    status: "published",
    description:
      "A timber chalet at the foot of the slopes with Matterhorn views from most rooms. Ski storage, a wood-fired sauna and a fondue room on the lower floor.",
    amenities: ["Free Wi-Fi", "Breakfast included", "Sauna", "Ski storage", "Fireplace lounge", "Airport shuttle"],
    images: [
      { file: "alpine-lodge.jpg", alt: "Alpine Lodge chalet exterior" },
      { file: "city-zermatt.jpg", alt: "Zermatt village and mountains" },
    ],
  },
  {
    slug: "coral-bay-resort",
    name: "Coral Bay Resort",
    city: "Bali",
    country: "Indonesia",
    rate: 174,
    rooms: 40,
    rating: 4.8,
    reviews: 2310,
    status: "published",
    description:
      "Villas set among rice terraces outside Ubud, each with a shaded terrace. An infinity pool overlooks the valley and the spa runs daily yoga sessions.",
    amenities: ["Free Wi-Fi", "Infinity pool", "Spa", "Yoga classes", "Breakfast included", "Airport shuttle"],
    images: [{ file: "coral-bay-resort.jpg", alt: "Coral Bay Resort pool among palms" }],
  },
  {
    slug: "the-meridian",
    name: "The Meridian",
    city: "Tokyo",
    country: "Japan",
    rate: 210,
    rooms: 64,
    rating: 4.8,
    reviews: 1906,
    status: "published",
    description:
      "A quiet tower hotel two minutes from Shinjuku station. Rooms on the upper floors look out over the city, and the lobby bar serves late-night ramen.",
    amenities: ["Free Wi-Fi", "Fitness center", "Air conditioning", "24-hour front desk", "Laundry service", "City views"],
    images: [
      { file: "the-meridian.jpg", alt: "The Meridian room with city view" },
      { file: "city-tokyo.jpg", alt: "Tokyo street at night" },
    ],
  },
  {
    slug: "harbor-house",
    name: "Harbor House",
    city: "Lisbon",
    country: "Portugal",
    rate: 142,
    rooms: 48,
    rating: 4.7,
    reviews: 1284,
    status: "published",
    description:
      "A converted harbor warehouse in Alfama, five minutes from the tram line. Rooms face the river or the old town, with a rooftop bar and a quiet reading room on the ground floor.",
    amenities: ["Free Wi-Fi", "Breakfast included", "Rooftop bar", "Air conditioning", "Airport shuttle", "Pets welcome"],
    images: [
      { file: "harbor-house.jpg", alt: "Harbor House pool and facade" },
      { file: "harbor-house-room.jpg", alt: "Double room" },
      { file: "harbor-house-rooftop.jpg", alt: "Rooftop terrace view" },
      { file: "city-lisbon.jpg", alt: "Lisbon rooftops" },
    ],
  },
  {
    slug: "azure-villas",
    name: "Azure Villas",
    city: "Phuket",
    country: "Thailand",
    rate: 156,
    rooms: 26,
    rating: 4.7,
    reviews: 967,
    status: "published",
    description:
      "Private pool villas on the hillside above Kata beach. A shuttle runs to the sand every half hour and the restaurant serves Thai and seafood dishes.",
    amenities: ["Free Wi-Fi", "Private pool", "Beach shuttle", "Air conditioning", "Restaurant", "Spa"],
    images: [{ file: "azure-villas.jpg", alt: "Azure Villas pool at dusk" }],
  },
  {
    slug: "thames-house",
    name: "Thames House",
    city: "London",
    country: "United Kingdom",
    rate: 230,
    rooms: 52,
    rating: 4.6,
    reviews: 1512,
    status: "published",
    description:
      "A Georgian townhouse hotel on the South Bank, a short walk from the river. Afternoon tea is served in the library and the rooms keep their original sash windows.",
    amenities: ["Free Wi-Fi", "Afternoon tea", "Library lounge", "Fitness center", "24-hour front desk", "Room service"],
    images: [
      { file: "thames-house.jpg", alt: "Thames House lobby" },
      { file: "city-london.jpg", alt: "London skyline over the Thames" },
    ],
  },
  {
    slug: "northern-light",
    name: "Northern Light",
    city: "Reykjavik",
    country: "Iceland",
    rate: 188,
    rooms: 30,
    rating: 4.6,
    reviews: 533,
    status: "published",
    description:
      "A minimalist hotel near the old harbor with a geothermal hot tub on the roof. The front desk books aurora tours and will wake you when the lights appear.",
    amenities: ["Free Wi-Fi", "Rooftop hot tub", "Breakfast included", "Aurora wake-up calls", "Tour desk", "Bike rental"],
    images: [
      { file: "northern-light.jpg", alt: "Northern Light hotel under the aurora" },
      { file: "city-reykjavik.jpg", alt: "Reykjavik harbor" },
    ],
  },
  {
    slug: "casa-verde",
    name: "Casa Verde",
    city: "Mexico City",
    country: "Mexico",
    rate: 118,
    rooms: 35,
    rating: 4.5,
    reviews: 718,
    status: "published",
    description:
      "A restored 1920s house in Roma Norte with a plant-filled courtyard. Rooms open onto the gallery, and there is a mezcal bar off the garden.",
    amenities: ["Free Wi-Fi", "Courtyard garden", "Bar", "Breakfast included", "Bike rental", "Pets welcome"],
    images: [{ file: "casa-verde.jpg", alt: "Casa Verde courtyard" }],
  },
  {
    slug: "seaside-inn",
    name: "Seaside Inn",
    city: "Cape Town",
    country: "South Africa",
    rate: 96,
    rooms: 18,
    rating: 4.4,
    reviews: 402,
    status: "hidden",
    description:
      "A small guesthouse on the Sea Point promenade with ocean-facing rooms. Breakfast is served on the deck, and the cable car is a short drive away.",
    amenities: ["Free Wi-Fi", "Ocean views", "Breakfast included", "Free parking", "Garden deck"],
    images: [
      { file: "seaside-inn.jpg", alt: "Seaside Inn on the coast" },
      { file: "city-cape-town.jpg", alt: "Cape Town and Table Mountain" },
    ],
  },
];

const DESTINATIONS: Record<string, string> = {
  Lisbon: "city-lisbon.jpg",
  Tokyo: "city-tokyo.jpg",
  London: "city-london.jpg",
  "Cape Town": "city-cape-town.jpg",
  Reykjavik: "city-reykjavik.jpg",
  Zermatt: "city-zermatt.jpg",
};

async function upload(file: string, folder: string) {
  return storage.putImage(await readFile(path.join(imagesDir, file)), folder);
}

async function ensureUser(u: { name: string; email: string; password: string }) {
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, u.email)).limit(1);
  if (existing) return existing.id;
  const res = await auth.api.signUpEmail({ body: u });
  return res.user.id;
}

const at = (day: string, hour = 10) => new Date(`${day}T${String(hour).padStart(2, "0")}:00:00Z`);

async function main() {
  const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(hotel);
  if (n > 0) {
    console.log("Seed skipped: hotels already exist.");
    return;
  }

  console.log("Seeding users…");
  const adminId = await ensureUser(ADMIN);
  await db.update(user).set({ role: "admin" }).where(eq(user.id, adminId));
  const averyId = await ensureUser(AVERY);
  const customerIds: Record<string, string> = { [AVERY.name]: averyId };
  for (const c of CUSTOMERS) customerIds[c.name] = await ensureUser(c);
  await db.update(user).set({ emailVerified: true }).where(inArray(user.id, Object.values(customerIds).concat(adminId)));

  console.log("Seeding hotels and photos…");
  const hotelIds: Record<string, { id: string; rate: number; rooms: number; city: string }> = {};
  for (const h of HOTELS) {
    const [row] = await db
      .insert(hotel)
      .values({
        slug: h.slug,
        name: h.name,
        city: h.city,
        country: h.country,
        description: h.description,
        amenities: h.amenities,
        rooms: h.rooms,
        nightlyRateCents: h.rate * 100,
        status: h.status,
        ratingAvg: h.rating,
        reviewCount: h.reviews,
      })
      .returning({ id: hotel.id });
    hotelIds[h.name] = { id: row!.id, rate: h.rate * 100, rooms: h.rooms, city: h.city };
    for (const [position, img] of h.images.entries()) {
      await db.insert(hotelImage).values({ hotelId: row!.id, path: await upload(img.file, `hotels/${row!.id}`), alt: img.alt, position });
    }
  }
  for (const [city, file] of Object.entries(DESTINATIONS)) {
    await db.insert(destination).values({ city, imagePath: await upload(file, "destinations") });
  }

  console.log("Seeding reviews…");
  const reviewers = Object.values(customerIds);
  for (const h of HOTELS) {
    // Exactly reproduces the design's average: a mix of 5★ and 4★ reviews.
    const fives = Math.round((h.rating - 4) * h.reviews);
    const rows = Array.from({ length: h.reviews }, (_, i) => ({
      hotelId: hotelIds[h.name]!.id,
      userId: reviewers[i % reviewers.length]!,
      rating: i < fives ? 5 : 4,
      createdAt: at(addDays(today(), -between(1, 700))),
    }));
    for (let i = 0; i < rows.length; i += 1000) await db.insert(review).values(rows.slice(i, i + 1000));
  }

  console.log("Seeding bookings and transactions…");
  const t = today();
  type Plan = {
    guest: string;
    hotel: string;
    createdDaysAgo: number;
    checkIn: string;
    nights: number;
    guests: number;
    status: "pending" | "approved" | "rejected" | "cancelled";
    reason?: string;
    refunded?: boolean;
  };
  const plans: Plan[] = [];

  // Random history across the last ~6 months, weighted toward recent weeks so "trending" has signal.
  const weights = ["Harbor House", "Harbor House", "Northern Light", "Northern Light", "Alpine Lodge", "The Meridian", "Azure Villas", "Casa Verde", "Thames House", "Coral Bay Resort", "Seaside Inn"];
  const guests = CUSTOMERS.map((c) => c.name);
  // Recent demand per hotel: [requests 31–60 days ago, requests in the last 30 days, of which in the last 7].
  // Gives "Trending destinations" (30-day growth) and "Trending this week" real signal.
  const recent: [string, number, number, number][] = [
    ["Northern Light", 5, 8, 4],
    ["Alpine Lodge", 4, 6, 2],
    ["Harbor House", 6, 9, 5],
    ["The Meridian", 4, 5, 2],
    ["Thames House", 5, 6, 2],
    ["Casa Verde", 3, 4, 3],
    ["Azure Villas", 3, 3, 1],
  ];
  for (const [hotelName, prev, cur, week] of recent) {
    const ages = [
      ...Array.from({ length: prev }, () => between(31, 60)),
      ...Array.from({ length: cur - week }, () => between(8, 30)),
      ...Array.from({ length: week }, () => between(1, 7)),
    ];
    for (const createdDaysAgo of ages) {
      const checkIn = addDays(t, -createdDaysAgo + between(10, 60));
      const past = checkIn < t;
      const roll = rand();
      const status: Plan["status"] = roll < 0.8 || past ? "approved" : "rejected";
      plans.push({
        guest: pick(guests),
        hotel: hotelName,
        createdDaysAgo,
        checkIn,
        nights: between(2, 5),
        guests: between(1, 3),
        status,
        ...(status === "rejected" ? { reason: "No availability for those dates." } : {}),
      });
    }
  }

  for (let i = 0; i < 40; i++) {
    const createdDaysAgo = between(61, 175);
    const lead = between(4, 45);
    const checkIn = addDays(t, -createdDaysAgo + lead);
    const nights = between(2, 6);
    const past = checkIn < t;
    const roll = rand();
    const status: Plan["status"] = past
      ? roll < 0.85 ? "approved" : "rejected"
      : roll < 0.75 ? "approved" : roll < 0.9 ? "rejected" : "cancelled";
    plans.push({
      guest: pick(guests),
      hotel: pick(weights),
      createdDaysAgo,
      checkIn,
      nights,
      guests: between(1, 3),
      status,
      ...(status === "rejected" ? { reason: pick(["No availability for those dates.", "The hotel is closed for renovation on those dates.", "Group bookings need to be arranged with the hotel directly."]) } : {}),
      ...(status === "cancelled" ? { refunded: true } : {}),
    });
  }

  // Two refunds that already happened in the past (cancelled after approval).
  for (const [guest, h] of [["Elena Rossi", "Harbor House"], ["Hana Sato", "Seaside Inn"]] as const) {
    const createdDaysAgo = between(20, 60);
    plans.push({ guest, hotel: h, createdDaysAgo, checkIn: addDays(t, between(20, 50)), nights: 2, guests: 2, status: "cancelled", refunded: true });
  }

  // The bookings shown in the design (My bookings + admin queue).
  plans.push(
    { guest: "Avery Chen", hotel: "The Meridian", createdDaysAgo: 290, checkIn: addDays(t, -258), nights: 5, guests: 1, status: "approved" },
    { guest: "Avery Chen", hotel: "Alpine Lodge", createdDaysAgo: 12, checkIn: addDays(t, 65), nights: 4, guests: 2, status: "approved" },
    { guest: "Avery Chen", hotel: "Seaside Inn", createdDaysAgo: 4, checkIn: addDays(t, 82), nights: 3, guests: 2, status: "rejected", reason: "No availability for those dates." },
    { guest: "Lucía Ortega", hotel: "Casa Verde", createdDaysAgo: 3, checkIn: addDays(t, 34), nights: 3, guests: 2, status: "pending" },
    { guest: "Priya Nair", hotel: "The Meridian", createdDaysAgo: 2, checkIn: addDays(t, 15), nights: 3, guests: 1, status: "pending" },
    { guest: "Jonas Weber", hotel: "Alpine Lodge", createdDaysAgo: 1, checkIn: addDays(t, 48), nights: 5, guests: 2, status: "pending" },
    { guest: "Avery Chen", hotel: "Harbor House", createdDaysAgo: 1, checkIn: addDays(t, 26), nights: 3, guests: 2, status: "pending" },
  );

  // Refs are issued in request order, like the real sequence would.
  plans.sort((a, b) => b.createdDaysAgo - a.createdDaysAgo);
  let refNo = 2041 - plans.length + 1;

  for (const p of plans) {
    const h = hotelIds[p.hotel]!;
    const checkOut = addDays(p.checkIn, p.nights);
    const createdAt = at(addDays(t, -p.createdDaysAgo), between(7, 21));
    // Never let a decision or refund land in the future.
    const latest = Date.now() - 3_600_000;
    const decidedAt = new Date(Math.min(createdAt.getTime() + between(2, 30) * 3_600_000, latest));
    const cancelledAt = new Date(Math.min(decidedAt.getTime() + 2 * 86_400_000, latest));
    const price = quote(h.rate, nightsBetween(p.checkIn, checkOut));
    const decided = p.status !== "pending" && !(p.status === "cancelled" && !p.refunded);
    const [b] = await db
      .insert(booking)
      .values({
        ref: `HB-${refNo++}`,
        userId: customerIds[p.guest]!,
        hotelId: h.id,
        checkIn: p.checkIn,
        checkOut,
        guests: p.guests,
        ...price,
        status: p.status,
        rejectionReason: p.reason ?? null,
        decidedBy: decided ? adminId : null,
        decidedAt: decided ? decidedAt : null,
        cancelledAt: p.status === "cancelled" ? cancelledAt : null,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: booking.id });

    if (p.status === "approved" || (p.status === "cancelled" && p.refunded)) {
      await db.insert(transaction).values({ bookingId: b!.id, type: "payment", amountCents: price.totalCents, createdAt: decidedAt });
    }
    if (p.status === "cancelled" && p.refunded) {
      await db.insert(transaction).values({
        bookingId: b!.id,
        type: "refund",
        amountCents: price.totalCents,
        createdAt: cancelledAt,
      });
    }
  }
  // setval(n) makes the next nextval() return n + 1.
  await db.execute(sql`select setval('booking_ref_seq', ${refNo - 1})`);

  console.log(`Seed complete: ${HOTELS.length} hotels, ${plans.length} bookings.`);
  console.log(`  Admin:    ${ADMIN.email} / ${ADMIN.password}`);
  console.log(`  Customer: ${AVERY.email} / ${AVERY.password}`);
}

await main();
await pool.end();
