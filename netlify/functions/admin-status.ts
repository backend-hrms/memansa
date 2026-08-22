import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentRequests } from "../../db/schema.js";
import { hasValidSession } from "../lib/admin-auth.js";

const allowedStatuses = new Set(["pending", "contacted", "confirmed", "completed", "cancelled"]);

export default async (request: Request) => {
  if (!hasValidSession(request)) return new Response(null, { status: 303, headers: { Location: "/admin" } });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const form = await request.formData();
  const id = Number(form.get("appointment-id"));
  const status = String(form.get("status") || "").toLowerCase();
  if (!Number.isInteger(id) || id < 1 || !allowedStatuses.has(status)) return new Response("Invalid status", { status: 400 });
  await db.update(appointmentRequests).set({ status }).where(eq(appointmentRequests.id, id));
  return new Response(null, { status: 303, headers: { Location: "/admin" } });
};

export const config = { path: "/admin/status" };
