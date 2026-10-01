// lib/rides.js
// -----------------------------------------------------------------------------
// Database helpers shared by several functions.
// -----------------------------------------------------------------------------
import { eq } from "drizzle-orm";
import { db, users, rides } from "../db/index.ts";

// The columns we send to the browser for a ride, joined with the driver's
// public profile. Note: the driver's email and phone are deliberately NOT
// included, so they are never exposed publicly.
export const rideColumns = {
  id: rides.id,
  fromLocation: rides.fromLocation,
  toLocation: rides.toLocation,
  departureDate: rides.departureDate,
  departureTime: rides.departureTime,
  arrivalTime: rides.arrivalTime,
  price: rides.price,
  availableSeats: rides.availableSeats,
  totalSeats: rides.totalSeats,
  status: rides.status,
  driverId: users.id,
  driverName: users.name,
  driverRating: users.rating,
  driverTotalRides: users.totalRides,
};

// Start a "SELECT rides JOIN users" query. Callers add .where()/.orderBy().
export function selectRidesWithDriver() {
  return db.select(rideColumns).from(rides).innerJoin(users, eq(rides.driverId, users.id));
}

// Convert a database row into the JSON shape used by the frontend.
export function formatRide(row) {
  return {
    id: row.id,
    from_location: row.fromLocation,
    to_location: row.toLocation,
    departure_date: row.departureDate,
    departure_time: row.departureTime?.slice(0, 5), // "08:00:00" -> "08:00"
    arrival_time: row.arrivalTime ? row.arrivalTime.slice(0, 5) : null,
    price: row.price,
    available_seats: row.availableSeats,
    total_seats: row.totalSeats,
    status: row.status,
    driver: {
      id: row.driverId,
      name: row.driverName,
      rating: row.driverRating === null ? null : Number(row.driverRating),
      total_rides: row.driverTotalRides,
    },
  };
}

// Find a user by email, or create them if they don't exist yet.
// If the user already exists we keep their stored name/phone (so nobody can
// overwrite another person's profile just by typing their email).
// `tx` lets this run inside a transaction; it defaults to the normal client.
export async function findOrCreateUser({ name, email, phone }, tx = db) {
  const normalizedEmail = email.toLowerCase();

  const [existing] = await tx.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existing) return existing;

  // ON CONFLICT handles two people signing up with the same email at the same moment
  const [created] = await tx
    .insert(users)
    .values({ name, email: normalizedEmail, phone: phone || null })
    .onConflictDoNothing({ target: users.email })
    .returning();
  if (created) return created;

  const [again] = await tx.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  return again;
}

// Work out which user is making a request.
// The browser can send either:
//   - a user id (e.g. remembered from an earlier booking), and/or
//   - name + email (+ phone), in which case we find or create the user.
// If both are sent, they must belong to the same person.
// Returns { user } on success or { error, status } on failure.
export async function resolveUser({ id, name, email, phone }) {
  if (email) {
    const user = await findOrCreateUser({ name, email, phone });
    if (id && user.id !== id) {
      return { error: "The user id does not match this email address.", status: 403 };
    }
    return { user };
  }

  if (id) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) return { error: "User not found.", status: 404 };
    return { user };
  }

  return { error: "Please provide your name and email.", status: 400 };
}
