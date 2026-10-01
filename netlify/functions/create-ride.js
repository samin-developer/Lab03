// netlify/functions/create-ride.js
// POST /api/create-ride
// Body (JSON):
// {
//   "driver_name": "Ali Raza",          // required unless driver_id is given
//   "email": "ali@example.com",         // required unless driver_id is given
//   "phone": "+92 300 1234567",         // optional
//   "driver_id": 4,                     // optional (an existing user)
//   "from_location": "Karachi",
//   "to_location": "Hyderabad",
//   "departure_date": "2026-10-20",
//   "departure_time": "08:00",
//   "arrival_time": "11:30",            // optional
//   "price": 1200,
//   "available_seats": 3,
//   "total_seats": 4
// }
// If no user exists with that email, a new user is created automatically.
import { db, rides } from "../../db/index.ts";
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
  isValidDate,
  isValidTime,
  todayLocal,
  nowTimeLocal,
} from "../../lib/http.js";

const MAX_PRICE = 100000; // Rs. per seat
const MAX_SEATS = 10;

// Check every field. Returns { errors: [...] } or { data: {...} }.
function validate(body) {
  const errors = [];

  const driverId = body.driver_id == null || body.driver_id === "" ? null : toPositiveInt(body.driver_id);
  const name = cleanText(body.driver_name, 80);
  const email = cleanText(body.email, 120).toLowerCase();
  const phone = cleanText(body.phone, 20);
  const from = cleanText(body.from_location, 60);
  const to = cleanText(body.to_location, 60);
  const date = typeof body.departure_date === "string" ? body.departure_date.trim() : "";
  const time = typeof body.departure_time === "string" ? body.departure_time.trim() : "";
  const arrival = typeof body.arrival_time === "string" ? body.arrival_time.trim() : "";
  const price = Number(body.price);
  const availableSeats = Number(body.available_seats);
  const totalSeats = Number(body.total_seats);

  if (body.driver_id != null && body.driver_id !== "" && !driverId) errors.push("driver_id must be a positive number.");
  if (!driverId || email || name) {
    // driver details are needed unless only an existing driver_id was sent
    if (!name) errors.push("Driver name is required.");
    if (!isValidEmail(email)) errors.push("Please enter a valid email address.");
  }
  if (!isValidPhone(phone)) errors.push("Phone number looks invalid.");

  if (!from) errors.push("From cannot be empty.");
  if (!to) errors.push("To cannot be empty.");
  if (from && to && from.toLowerCase() === to.toLowerCase()) errors.push("From and To must be different places.");

  if (!isValidDate(date)) {
    errors.push("A valid departure date is required.");
  } else if (date < todayLocal()) {
    errors.push("Departure date cannot be in the past.");
  }

  if (!isValidTime(time)) {
    errors.push("Departure time is required.");
  } else if (date === todayLocal() && time.slice(0, 5) < nowTimeLocal()) {
    errors.push("Departure time has already passed today.");
  }
  if (arrival && !isValidTime(arrival)) errors.push("Arrival time is invalid.");

  if (!Number.isInteger(price) || price <= 0) errors.push("Price must be a positive whole number.");
  else if (price > MAX_PRICE) errors.push(`Price cannot be more than Rs. ${MAX_PRICE.toLocaleString()}.`);

  if (!Number.isInteger(totalSeats) || totalSeats <= 0) errors.push("Total seats must be at least 1.");
  else if (totalSeats > MAX_SEATS) errors.push(`Total seats cannot be more than ${MAX_SEATS}.`);

  if (!Number.isInteger(availableSeats) || availableSeats <= 0) errors.push("Available seats must be greater than 0.");
  else if (Number.isInteger(totalSeats) && availableSeats > totalSeats) errors.push("Available seats cannot exceed total seats.");

  if (errors.length) return { errors };

  return {
    data: { driverId, name, email, phone, from, to, date, time, arrival: arrival || null, price, availableSeats, totalSeats },
  };
}

export default async (req) => {
  const stop = checkMethod(req, "POST");
  if (stop) return stop;

  const body = await readJson(req);
  if (!body) return error("Request body must be valid JSON.", 400);

  const { errors, data } = validate(body);
  if (errors) return json({ error: errors[0], errors }, 400);

  try {
    // 1. find the driver (or create them if this email is new)
    const result = await resolveUser({ id: data.driverId, name: data.name, email: data.email, phone: data.phone });
    if (result.error) return error(result.error, result.status);
    const driver = result.user;

    // 2. save the ride
    const [ride] = await db
      .insert(rides)
      .values({
        driverId: driver.id,
        fromLocation: data.from,
        toLocation: data.to,
        departureDate: data.date,
        departureTime: data.time,
        arrivalTime: data.arrival,
        price: data.price,
        availableSeats: data.availableSeats,
        totalSeats: data.totalSeats,
        status: "active",
      })
      .returning();

    // 201 = "Created"
    return json({ message: "Ride created successfully!", ride, driver: { id: driver.id, name: driver.name } }, 201);
  } catch (err) {
    console.error("create-ride failed:", err);
    return error("Could not create the ride. Please try again later.", 500);
  }
};

export const config = { path: "/api/create-ride" };
