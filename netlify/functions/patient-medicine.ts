import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentRequests, medicineRecords } from "../../db/schema.js";
import { hasValidSession } from "../lib/admin-auth.js";

const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);

export default async (request: Request) => {
  if (!hasValidSession(request)) return new Response(null, { status: 303, headers: { Location: "/admin" } });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const form = await request.formData();
  const appointmentId = Number(form.get("appointment-id"));
  const medicineName = String(form.get("medicine-name") || "").trim();
  const dosage = String(form.get("dosage") || "").trim();
  const frequency = String(form.get("frequency") || "").trim();
  const duration = String(form.get("duration") || "").trim();
  const instructions = String(form.get("instructions") || "").trim();
  if (!Number.isInteger(appointmentId) || appointmentId < 1 || !medicineName || medicineName.length > 200) return new Response("Invalid medicine details", { status: 400 });
  if ([dosage, frequency, duration].some((value) => value.length > 120) || instructions.length > 4000) return new Response("Medicine details are too long", { status: 400 });
  const [patient] = await db.select({ id: appointmentRequests.id }).from(appointmentRequests).where(eq(appointmentRequests.id, appointmentId)).limit(1);
  if (!patient) return new Response("Patient profile not found", { status: 404 });
  const attachment = form.get("attachment");
  let attachmentName = "", attachmentMime = "", attachmentData = "";
  if (attachment instanceof File && attachment.size > 0) {
    if (attachment.size > 2 * 1024 * 1024) return redirect(appointmentId, "file-too-large");
    if (!allowedTypes.has(attachment.type)) return redirect(appointmentId, "file-type");
    attachmentName = attachment.name.slice(0, 240);
    attachmentMime = attachment.type;
    attachmentData = Buffer.from(await attachment.arrayBuffer()).toString("base64");
  }
  await db.insert(medicineRecords).values({ appointmentId, medicineName, dosage, frequency, duration, instructions, attachmentName, attachmentMime, attachmentData });
  return redirect(appointmentId, "medicine-saved");
};

function redirect(id: number, notice: string) {
  return new Response(null, { status: 303, headers: { Location: `/admin/patient?id=${id}&notice=${notice}` } });
}

export const config = { path: "/admin/patient/medicine" };
