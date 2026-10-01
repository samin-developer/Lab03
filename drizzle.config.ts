// drizzle.config.ts
// Tells drizzle-kit where the schema is and where to write migrations.
// Migrations MUST live in netlify/database/migrations so Netlify applies them on deploy.
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "netlify/database/migrations",
});
