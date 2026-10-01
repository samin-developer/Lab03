// lib/http.js
// -----------------------------------------------------------------------------
// Small helpers shared by every Netlify Function:
//   - JSON responses with the right HTTP status code
//   - optional CORS headers
//   - input validation helpers
// This file is NOT a function itself (it lives outside netlify/functions),
// it is simply imported by the functions.
// -----------------------------------------------------------------------------

// CORS: the website and the API are served from the same Netlify domain, so the
// browser does not need CORS. If you ever call the API from another website, set
// the ALLOWED_ORIGIN environment variable (e.g. https://my-other-site.com).
function corsHeaders() {
  const origin = process.env.ALLOWED_ORIGIN;
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// Send a JSON response, e.g. json({ rides }, 200)
export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...corsHeaders() },
  });
}

// Send an error in a consistent shape: { error: "message" }
export function error(message, status = 400) {
  return json({ error: message }, status);
}

// Answer the browser's CORS "preflight" request and reject wrong HTTP methods.
// Returns a Response if the request should stop here, otherwise null.
export function checkMethod(req, allowed) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== allowed) {
    return error(`Method not allowed. Use ${allowed}.`, 405);
  }
  return null;
}

// Read the JSON body safely (returns null if the body is not valid JSON).
export async function readJson(req) {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

// ----------------------------- validation ----------------------------------

// Turn a value into a positive whole number, or null if it isn't one.
export function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Trim a text value and limit its length. Returns "" for missing values.
export function cleanText(value, maxLength = 100) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Phone is optional, but if given it should only contain digits, spaces, +, - and ().
export function isValidPhone(phone) {
  return phone === "" || /^[+\d][\d\s\-()]{6,19}$/.test(phone);
}

// "YYYY-MM-DD" that is a real calendar date
export function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

// "HH:MM" or "HH:MM:SS" (24-hour clock)
export function isValidTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
}

// RideMate operates in Pakistan, so "today" is calculated in Pakistan time,
// not in the server's time zone (Netlify servers run on UTC).
const TIME_ZONE = "Asia/Karachi";

export function todayLocal() {
  // en-CA formats dates as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

export function nowTimeLocal() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}
