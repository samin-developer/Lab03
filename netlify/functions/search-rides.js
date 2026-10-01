// netlify/functions/search-rides.js
// GET /api/search-rides?from=Karachi&to=Hyderabad&date=2026-10-15
// All three parameters are optional, but at least one must be given.
// "from"/"to" match partially and ignore upper/lower case ("kar" finds "Karachi").
import { and, asc, eq, gt, gte, ilike, or } from "drizzle-orm";
import { rides } from "../../db/index.ts";
import { selectRidesWithDriver, formatRide } from "../../lib/rides.js";
import { json, error, checkMethod, cleanText, isValidDate, todayLocal, nowTimeLocal } from "../../lib/http.js";

// Escape the special LIKE characters % and _ so user input is matched literally.
const likePattern = (text) => `%${text.replace(/[\\%_]/g, (c) => "\\" + c)}%`;

export default async (req) => {
  const stop = checkMethod(req, "GET");
  if (stop) return stop;

  const params = new URL(req.url).searchParams;
  const from = cleanText(params.get("from") ?? "", 60);
  const to = cleanText(params.get("to") ?? "", 60);
  const date = (params.get("date") ?? "").trim();

  // ---- validate input ----
  if (!from && !to && !date) {
    return error("Please enter at least a From, To or Date to search.", 400);
  }
  if (date && !isValidDate(date)) {
    return error("Date must be in the format YYYY-MM-DD.", 400);
  }

  try {
    const today = todayLocal();
    const conditions = [
      eq(rides.status, "active"),
      gt(rides.availableSeats, 0),
      // never show rides that already left
      or(
        gt(rides.departureDate, today),
        and(eq(rides.departureDate, today), gte(rides.departureTime, nowTimeLocal()))
      ),
    ];
    if (from) conditions.push(ilike(rides.fromLocation, likePattern(from)));
    if (to) conditions.push(ilike(rides.toLocation, likePattern(to)));
    if (date) conditions.push(eq(rides.departureDate, date));

    const rows = await selectRidesWithDriver()
      .where(and(...conditions))
      .orderBy(asc(rides.departureDate), asc(rides.departureTime))
      .limit(50);

    return json({ rides: rows.map(formatRide), query: { from, to, date } });
  } catch (err) {
    console.error("search-rides failed:", err);
    return error("Search failed. Please try again later.", 500);
  }
};

export const config = { path: "/api/search-rides" };
