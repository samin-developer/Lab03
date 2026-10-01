// netlify/functions/join-ride.js
// POST /api/join-ride
// Body (JSON):
// {
//   "ride_id": 1,
//   "seats": 1,
//   "passenger_id": 5,                       // optional if name + email are sent
//   "name": "Ayesha", "email": "ayesha@example.com", "phone": "+92 ..."   // optional if passenger_id is sent
// }
// What happens:
//   1. checks the ride exists, hasn't left yet and has enough seats
//   2. creates a booking (price is taken from the DATABASE, never from the browser)
//   3. decreases the ride's available seats
// Steps 2 and 3 run in one database transaction, so they either both happen or neither does.
import { and, eq, gte, sql } from "drizzle-orm";
import { db, rides, bookings } from "../../db/index.ts";
import { resolveUser } from "../../lib/rides.js";
import {
  json,
  error,
  checkMethod,
  readJson,
  cleanText,
  toPositiveInt,
  isValidEmail,
  isValidPhone,
  todayLocal,
  nowTimeLocal,
} from "../../lib/http.js";

const MAX_SEATS_PER_BOOKING = 10;

export default async (req) => {
  const stop = checkMethod(req, "POST");
  if (stop) return stop;

  const body = await readJson(req);
  if (!body) return error("Request body must be valid JSON.", 400);

  // ---- validate input ----
  const rideId = toPositiveInt(body.ride_id);
  const seats = body.seats == null ? 1 : toPositiveInt(body.seats);
  const passengerId = body.passenger_id == null || body.passenger_id === "" ? null : toPositiveInt(body.passenger_id);
  const name = cleanText(body.name, 80);
  const email = cleanText(body.email, 120).toLowerCase();
  const phone = cleanText(body.phone, 20);

  if (!rideId) return error("A valid ride_id is required.", 400);
  if (!seats || seats > MAX_SEATS_PER_BOOKING) return error(`Seats must be between 1 and ${MAX_SEATS_PER_BOOKING}.`, 400);
  if (body.passenger_id != null && body.passenger_id !== "" && !passengerId) return error("passenger_id must be a positive number.", 400);
  if (email || !passengerId) {
    if (!name) return error("Please enter your name.", 400);
    if (!isValidEmail(email)) return error("Please enter a valid email address.", 400);
  }
  if (!isValidPhone(phone)) return error("Phone number looks invalid.", 400);

  try {
    // ---- load the ride ----
    const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
    if (!ride) return error("Ride not found.", 404);

    const today = todayLocal();
    const departed =
      ride.departureDate < today || (ride.departureDate === today && ride.departureTime.slice(0, 5) < nowTimeLocal());
    if (departed) return error("This ride has already departed.", 409);
    if (ride.status !== "active" && ride.status !== "full") return error(`This ride is ${ride.status}.`, 409);
    if (ride.availableSeats <= 0) return error("Sorry, this ride is full.", 409);
    if (ride.availableSeats < seats) {
      return error(`Only ${ride.availableSeats} seat(s) left on this ride.`, 409);
    }

    // ---- who is booking? ----
    const result = await resolveUser({ id: passengerId, name, email, phone });
    if (result.error) return error(result.error, result.status);
    const passenger = result.user;

    if (passenger.id === ride.driverId) return error("You can't join your own ride.", 400);

    // ---- book it (all-or-nothing) ----
    const booking = await db.transaction(async (tx) => {
      // Only decrease seats if there are STILL enough left. This protects against
      // two people grabbing the last seat at exactly the same time.
      const [updated] = await tx
        .update(rides)
        .set({
          availableSeats: sql`${rides.availableSeats} - ${seats}`,
          status: sql`CASE WHEN ${rides.availableSeats} - ${seats} = 0 THEN 'full' ELSE ${rides.status} END`,
        })
        .where(and(eq(rides.id, rideId), eq(rides.status, "active"), gte(rides.availableSeats, seats)))
        .returning({ availableSeats: rides.availableSeats, price: rides.price });

      if (!updated) return null; // someone else took the seats first

      const [created] = await tx
        .insert(bookings)
        .values({
          rideId,
          passengerId: passenger.id,
          seats,
          totalPrice: updated.price * seats, // calculated from the database price
          status: "confirmed",
        })
        .returning();

      return { ...created, availableSeatsLeft: updated.availableSeats };
    });

    if (!booking) return error("Sorry, there are not enough seats left on this ride.", 409);

    return json(
      {
        message: "You're booked! 🎉",
        booking: {
          id: booking.id,
          ride_id: booking.rideId,
          passenger_id: booking.passengerId,
          seats: booking.seats,
          total_price: booking.totalPrice,
          status: booking.status,
          created_at: booking.createdAt,
        },
        available_seats: booking.availableSeatsLeft,
        passenger: { id: passenger.id, name: passenger.name },
      },
      201
    );
  } catch (err) {
    console.error("join-ride failed:", err);
    return error("Could not join this ride. Please try again later.", 500);
  }
};

export const config = { path: "/api/join-ride" };
