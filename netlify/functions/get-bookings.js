// netlify/functions/get-bookings.js
// GET /api/get-bookings?user_id=USER_ID
// Returns all bookings made by one passenger, newest first, with ride details.
import { desc, eq } from "drizzle-orm";
import { db, users, rides, bookings } from "../../db/index.ts";
import { json, error, checkMethod, toPositiveInt } from "../../lib/http.js";

export default async (req) => {
  const stop = checkMethod(req, "GET");
  if (stop) return stop;

  const userId = toPositiveInt(new URL(req.url).searchParams.get("user_id"));
  if (!userId) return error("A valid user_id is required, e.g. /api/get-bookings?user_id=1", 400);

  try {
    const rows = await db
      .select({
        id: bookings.id,
        seats: bookings.seats,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        createdAt: bookings.createdAt,
        rideId: rides.id,
        fromLocation: rides.fromLocation,
        toLocation: rides.toLocation,
        departureDate: rides.departureDate,
        departureTime: rides.departureTime,
        price: rides.price,
        driverName: users.name,
      })
      .from(bookings)
      .innerJoin(rides, eq(bookings.rideId, rides.id))
      .innerJoin(users, eq(rides.driverId, users.id)) // the DRIVER of each ride
      .where(eq(bookings.passengerId, userId))
      .orderBy(desc(bookings.createdAt));

    const result = rows.map((r) => ({
      id: r.id,
      seats: r.seats,
      total_price: r.totalPrice,
      status: r.status,
      created_at: r.createdAt,
      ride: {
        id: r.rideId,
        from_location: r.fromLocation,
        to_location: r.toLocation,
        departure_date: r.departureDate,
        departure_time: r.departureTime.slice(0, 5),
        price: r.price,
        driver_name: r.driverName,
      },
    }));

    return json({ bookings: result });
  } catch (err) {
    console.error("get-bookings failed:", err);
    return error("Could not load bookings. Please try again later.", 500);
  }
};

export const config = { path: "/api/get-bookings" };
