// netlify/functions/get-ride.js
// GET /api/get-ride?id=RIDE_ID
// Returns the details of one ride (including full or past rides).
import { eq } from "drizzle-orm";
import { rides } from "../../db/index.ts";
import { selectRidesWithDriver, formatRide } from "../../lib/rides.js";
import { json, error, checkMethod, toPositiveInt } from "../../lib/http.js";

export default async (req) => {
  const stop = checkMethod(req, "GET");
  if (stop) return stop;

  const id = toPositiveInt(new URL(req.url).searchParams.get("id"));
  if (!id) return error("A valid ride id is required, e.g. /api/get-ride?id=1", 400);

  try {
    const [row] = await selectRidesWithDriver().where(eq(rides.id, id)).limit(1);
    if (!row) return error("Ride not found.", 404);

    return json({ ride: formatRide(row) });
  } catch (err) {
    console.error("get-ride failed:", err);
    return error("Could not load this ride. Please try again later.", 500);
  }
};

export const config = { path: "/api/get-ride" };
