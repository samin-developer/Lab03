-- Seed data: the three sample rides that were previously hardcoded in index.html.
-- The drivers use demo @example.com email addresses.
-- Departure dates are set relative to the day this migration runs so the rides
-- show up as "upcoming" right after the first deploy.

INSERT INTO "users" ("name", "email", "phone", "rating", "total_rides") VALUES
  ('Ahmed Khan',  'ahmed.khan@example.com',  '+92 300 0000001', 4.9, 120),
  ('Sarah Ahmed', 'sarah.ahmed@example.com', '+92 300 0000002', 5.0, 87),
  ('Usman Malik', 'usman.malik@example.com', '+92 300 0000003', 4.8, 64)
ON CONFLICT ("email") DO NOTHING;
--> statement-breakpoint
INSERT INTO "rides"
  ("driver_id", "from_location", "to_location", "departure_date", "departure_time", "arrival_time", "price", "available_seats", "total_seats", "status")
VALUES
  ((SELECT "id" FROM "users" WHERE "email" = 'ahmed.khan@example.com'),  'Karachi',   'Hyderabad', CURRENT_DATE + 14, '08:00', '11:30', 1200, 3, 4, 'active'),
  ((SELECT "id" FROM "users" WHERE "email" = 'sarah.ahmed@example.com'), 'Lahore',    'Islamabad', CURRENT_DATE + 21, '09:00', '13:00', 1500, 2, 3, 'active'),
  ((SELECT "id" FROM "users" WHERE "email" = 'usman.malik@example.com'), 'Islamabad', 'Murree',    CURRENT_DATE + 30, '07:30', '10:00',  800, 4, 4, 'active');
