import { resolve } from "node:path";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentRequests, medicineRecords } from "../../db/schema.js";
import { hasValidSession } from "../lib/admin-auth.js";
import { createPatientReportPdf } from "../lib/patient-report-pdf.js";

export default async(request:Request)=>{
  if(!hasValidSession(request))return new Response(null,{status:303,headers:{Location:"/admin"}});
  const id=Number(new URL(request.url).searchParams.get("id"));
  if(!Number.isInteger(id)||id<1)return new Response("Invalid patient profile",{status:400});
  const [patient]=await db.select().from(appointmentRequests).where(eq(appointmentRequests.id,id)).limit(1);
  if(!patient)return new Response("Patient profile not found",{status:404});
  const medicines=await db.select().from(medicineRecords).where(eq(medicineRecords.appointmentId,id)).orderBy(asc(medicineRecords.createdAt));
  const pdf=await createPatientReportPdf(patient,medicines,resolve("assets/memansa-logo.jpeg"));
  const filename=`${patient.fullName.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"patient"}-medicine-report.pdf`;
  return new Response(pdf,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${filename}"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
};
export const config={path:"/admin/patient/report"};
