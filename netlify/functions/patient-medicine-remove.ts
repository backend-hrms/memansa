import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { medicineRecords } from "../../db/schema.js";
import { hasValidSession } from "../lib/admin-auth.js";

export default async (request: Request) => {
  if (!hasValidSession(request)) return new Response(null, { status: 303, headers: { Location: "/admin" } });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  const form = await request.formData();
  const recordId = Number(form.get("record-id"));
  const appointmentId = Number(form.get("appointment-id"));
  if (!Number.isInteger(recordId) || recordId < 1 || !Number.isInteger(appointmentId) || appointmentId < 1) {
    return new Response("Invalid medicine record", { status: 400 });
  }
  await db.delete(medicineRecords).where(and(eq(medicineRecords.id, recordId), eq(medicineRecords.appointmentId, appointmentId)));
  return new Response(null, { status: 303, headers: { Location: `/admin/patient?id=${appointmentId}&notice=medicine-removed` } });
};

export const config = { path: "/admin/patient/medicine/remove" };
