CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY,
	"ride_id" integer NOT NULL,
	"passenger_id" integer NOT NULL,
	"seats" integer NOT NULL,
	"total_price" integer NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_seats_positive" CHECK ("seats" > 0)
);
--> statement-breakpoint
CREATE TABLE "rides" (
	"id" serial PRIMARY KEY,
	"driver_id" integer NOT NULL,
	"from_location" text NOT NULL,
	"to_location" text NOT NULL,
	"departure_date" date NOT NULL,
	"departure_time" time NOT NULL,
	"arrival_time" time,
	"price" integer NOT NULL,
	"available_seats" integer NOT NULL,
	"total_seats" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rides_price_positive" CHECK ("price" > 0),
	CONSTRAINT "rides_seats_valid" CHECK ("available_seats" >= 0 AND "available_seats" <= "total_seats")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"phone" text,
	"rating" numeric(2,1),
	"total_rides" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "bookings_ride_idx" ON "bookings" ("ride_id");--> statement-breakpoint
CREATE INDEX "bookings_passenger_idx" ON "bookings" ("passenger_id");--> statement-breakpoint
CREATE INDEX "rides_search_idx" ON "rides" ("departure_date","from_location","to_location");--> statement-breakpoint
CREATE INDEX "rides_driver_idx" ON "rides" ("driver_id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_passenger_id_users_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_driver_id_users_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE;