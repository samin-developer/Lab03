// netlify/functions/get-rides.js
// GET /api/get-rides
// Returns upcoming rides that still have free seats (used for "Popular Rides").
// Optional query parameter: ?limit=12 (1-50, default 12)
import { and, asc, eq, gt, gte, or } from "drizzle-orm";
import { rides } from "../../db/index.ts";
import { selectRidesWithDriver, formatRide } from "../../lib/rides.js";
import { json, error, checkMethod, toPositiveInt, todayLocal, nowTimeLocal } from "../../lib/http.js";

export default async (req) => {
  const stop = checkMethod(req, "GET");
  if (stop) return stop;

  try {
    const url = new URL(req.url);
    const limit = Math.min(toPositiveInt(url.searchParams.get("limit")) ?? 12, 50);
    const today = todayLocal();

    const rows = await selectRidesWithDriver()
      .where(
        and(
          eq(rides.status, "active"),
          gt(rides.availableSeats, 0),
          // later than today, OR today but the departure time hasn't passed yet
          or(
            gt(rides.departureDate, today),
            and(eq(rides.departureDate, today), gte(rides.departureTime, nowTimeLocal()))
          )
        )
      )
      .orderBy(asc(rides.departureDate), asc(rides.departureTime))
      .limit(limit);

    return json({ rides: rows.map(formatRide) });
  } catch (err) {
    console.error("get-rides failed:", err);
    return error("Could not load rides. Please try again later.", 500);
  }
};

// Modern Netlify Functions format: the function decides its own URL.
export const config = { path: "/api/get-rides" };
