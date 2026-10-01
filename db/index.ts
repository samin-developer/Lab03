// db/index.ts
// Creates the Drizzle database client.
// The Netlify Database connection is configured automatically by Netlify
// (no connection string or password ever needs to be written in the code).
import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema.js";

export const db = drizzle({ schema });
export * from "./schema.js";
