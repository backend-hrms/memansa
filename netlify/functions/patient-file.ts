import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { medicineRecords } from "../../db/schema.js";
import { hasValidSession } from "../lib/admin-auth.js";

export default async (request: Request) => {
  if (!hasValidSession(request)) return new Response(null, { status: 303, headers: { Location: "/admin" } });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return new Response("Invalid attachment", { status: 400 });
  const [record] = await db.select().from(medicineRecords).where(eq(medicineRecords.id, id)).limit(1);
  if (!record?.attachmentData) return new Response("Attachment not found", { status: 404 });
  const safeName = record.attachmentName.replace(/[\r\n"\\/]/g, "_") || "attachment";
  return new Response(Buffer.from(record.attachmentData, "base64"), { headers: { "Content-Type": record.attachmentMime || "application/octet-stream", "Content-Disposition": `inline; filename="${safeName}"`, "Cache-Control": "private, no-store" } });
};

export const config = { path: "/admin/patient/file" };
