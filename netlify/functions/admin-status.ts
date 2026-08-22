import { scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentRequests } from "../../db/schema.js";

function authorized(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    const [salt, expectedHex] = (process.env.ADMIN_PASSWORD_HASH || "").split(":");
    if (decoded.slice(0, separator) !== process.env.ADMIN_USERNAME || !salt || !expectedHex) return false;
    const actual = scryptSync(decoded.slice(separator + 1), salt, 32);
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}

const allowedStatuses = new Set(["pending", "contacted", "confirmed", "completed", "cancelled"]);

export default async (request: Request) => {
  if (!authorized(request)) return new Response("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Memansa Admin"' } });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const form = await request.formData();
  const id = Number(form.get("appointment-id"));
  const status = String(form.get("status") || "").toLowerCase();
  if (!Number.isInteger(id) || id < 1 || !allowedStatuses.has(status)) return new Response("Invalid status", { status: 400 });
  await db.update(appointmentRequests).set({ status }).where(eq(appointmentRequests.id, id));
  return new Response(null, { status: 303, headers: { Location: "/admin" } });
};

export const config = { path: "/admin/status" };
