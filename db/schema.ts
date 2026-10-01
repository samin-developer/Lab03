// db/schema.ts
// -----------------------------------------------------------------------------
// The RideMate database structure (Netlify Database = managed Postgres).
//
// Relationships:
//   users 1 ──< rides      (one user can offer many rides; a ride has one driver)
//   rides 1 ──< bookings   (one ride can have many bookings)
//   users 1 ──< bookings   (one passenger can have many bookings)
//
// Whenever you change this file, create a migration with:
//   npx drizzle-kit generate --name <what_changed>
// Netlify applies the migrations automatically when you deploy.
// -----------------------------------------------------------------------------
import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  date,
  time,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// USERS: both drivers and passengers live in this table.
export const users = pgTable("users", {
  id: serial().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(), // email is how we recognise a returning user
  phone: text(),
  rating: numeric({ precision: 2, scale: 1 }), // e.g. 4.9 (empty for brand-new users)
  totalRides: integer("total_rides").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// RIDES: a trip offered by a driver.
export const rides = pgTable(
  "rides",
  {
    id: serial().primaryKey(),
    driverId: integer("driver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fromLocation: text("from_location").notNull(),
    toLocation: text("to_location").notNull(),
    departureDate: date("departure_date", { mode: "string" }).notNull(), // "YYYY-MM-DD"
    departureTime: time("departure_time").notNull(), // "HH:MM:SS"
    arrivalTime: time("arrival_time"), // optional estimated arrival
    price: integer().notNull(), // price per seat in Rupees
    availableSeats: integer("available_seats").notNull(),
    totalSeats: integer("total_seats").notNull(),
    status: text().notNull().default("active"), // active | full | cancelled | completed
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("rides_search_idx").on(t.departureDate, t.fromLocation, t.toLocation),
    index("rides_driver_idx").on(t.driverId),
    // Safety nets inside the database itself
    check("rides_price_positive", sql`${t.price} > 0`),
    check("rides_seats_valid", sql`${t.availableSeats} >= 0 AND ${t.availableSeats} <= ${t.totalSeats}`),
  ]
);

// BOOKINGS: a passenger reserving seats on a ride.
export const bookings = pgTable(
  "bookings",
  {
    id: serial().primaryKey(),
    rideId: integer("ride_id")
      .notNull()
      .references(() => rides.id, { onDelete: "cascade" }),
    passengerId: integer("passenger_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seats: integer().notNull(),
    totalPrice: integer("total_price").notNull(), // calculated on the server, never trusted from the browser
    status: text().notNull().default("confirmed"), // confirmed | cancelled
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("bookings_ride_idx").on(t.rideId),
    index("bookings_passenger_idx").on(t.passengerId),
    check("bookings_seats_positive", sql`${t.seats} > 0`),
  ]
);
