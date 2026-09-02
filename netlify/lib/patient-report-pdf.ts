import PDFDocument from "pdfkit";

type PatientReport = { id:number; fullName:string; mobileNumber:string; age:number; city:string; healthConcern:string; preferredDate:string; preferredTime:string; status:string };
type MedicineReport = { medicineName:string; dosage:string; frequency:string; duration:string; instructions:string; createdAt:unknown };
const blue="#315f8f", ink="#173b36", muted="#66766e", pale="#f3f6f8";
const value=(input:unknown)=>String(input??"").trim()||"Not provided";
function displayDate(input:unknown){const date=new Date(String(input));return Number.isNaN(date.getTime())?value(input):date.toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"});}

export async function createPatientReportPdf(patient:PatientReport,medicines:MedicineReport[],logoPath?:string){
  const doc=new PDFDocument({size:"A4",margin:48,bufferPages:true,info:{Title:`${patient.fullName} - Patient & Medicine Report`,Author:"Memansa Therapy Studio"}});
  const chunks:Buffer[]=[]; doc.on("data",chunk=>chunks.push(Buffer.from(chunk)));
  const completed=new Promise<Buffer>((resolve,reject)=>{doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject);});
  if(logoPath){try{doc.image(logoPath,48,38,{fit:[64,64],align:"center",valign:"center"});}catch{/* Report remains usable without the logo. */}}
  doc.fillColor(blue).font("Helvetica-Bold").fontSize(19).text("MEMANSA THERAPY STUDIO",124,45);
  doc.fillColor(muted).font("Helvetica").fontSize(9).text("Natural health and wellbeing support",124,70).text("Contact: +91 84240 20272",124,84);
  doc.moveTo(48,114).lineTo(547,114).lineWidth(1.5).strokeColor(blue).stroke(); doc.y=134;
  doc.fillColor(ink).font("Helvetica-Bold").fontSize(21).text("Patient & Medicine Report");
  doc.fillColor(muted).font("Helvetica").fontSize(9).text(`Report generated: ${displayDate(new Date())}  |  Patient reference: ${patient.id}`);
  doc.moveDown(1.4).fillColor(blue).font("Helvetica-Bold").fontSize(12).text("PATIENT DETAILS").moveDown(.5);
  const fields=[["Patient name",value(patient.fullName)],["Age",`${patient.age} years`],["Mobile number",value(patient.mobileNumber)],["City",value(patient.city)],["Preferred date",value(patient.preferredDate)],["Preferred time",value(patient.preferredTime)],["Appointment status",value(patient.status)]];
  for(let index=0;index<fields.length;index+=2){const y=doc.y;for(let column=0;column<2;column++){const field=fields[index+column];if(!field)continue;const x=48+column*255;doc.fillColor(muted).font("Helvetica-Bold").fontSize(8).text(field[0].toUpperCase(),x,y,{width:235});doc.fillColor(ink).font("Helvetica").fontSize(10.5).text(field[1],x,y+13,{width:235});}doc.y=y+38;}
  doc.moveDown(.3).fillColor(muted).font("Helvetica-Bold").fontSize(8).text("HEALTH CONCERN / COURSE ENQUIRY").moveDown(.35);
  const concernY=doc.y, concernHeight=doc.heightOfString(value(patient.healthConcern),{width:467})+18;
  doc.roundedRect(48,concernY,499,concernHeight,5).fill(pale);doc.fillColor(ink).font("Helvetica").fontSize(10).text(value(patient.healthConcern),64,concernY+9,{width:467});doc.y=concernY+concernHeight+24;
  doc.fillColor(blue).font("Helvetica-Bold").fontSize(12).text("MEDICINE HISTORY").moveDown(.7);
  if(!medicines.length)doc.fillColor(muted).font("Helvetica-Oblique").fontSize(10).text("No medicine details have been recorded.");
  else medicines.forEach((medicine,index)=>{const instructions=value(medicine.instructions);const cardHeight=91+(instructions==="Not provided"?0:Math.min(42,doc.heightOfString(instructions,{width:455})));if(doc.y+cardHeight>760)doc.addPage();const y=doc.y;doc.roundedRect(48,y,499,cardHeight,6).lineWidth(.7).strokeColor("#cbd8df").stroke();doc.fillColor(blue).font("Helvetica-Bold").fontSize(8).text(`MEDICINE ${index+1}`,62,y+12);doc.fillColor(ink).font("Helvetica-Bold").fontSize(13).text(value(medicine.medicineName),62,y+26,{width:320});doc.fillColor(muted).font("Helvetica").fontSize(8).text(displayDate(medicine.createdAt),390,y+15,{width:141,align:"right"});const detailY=y+50;[["Dosage",medicine.dosage],["Frequency",medicine.frequency],["Duration",medicine.duration]].forEach(([label,item],column)=>{const x=62+column*155;doc.fillColor(muted).font("Helvetica-Bold").fontSize(7).text(label.toUpperCase(),x,detailY,{width:140});doc.fillColor(ink).font("Helvetica").fontSize(9.5).text(value(item),x,detailY+11,{width:140});});if(instructions!=="Not provided"){doc.fillColor(muted).font("Helvetica-Bold").fontSize(7).text("INSTRUCTIONS / NOTES",62,y+78);doc.fillColor(ink).font("Helvetica").fontSize(9).text(instructions,62,y+89,{width:455,height:cardHeight-94,ellipsis:true});}doc.y=y+cardHeight+12;});
  if(doc.y>705)doc.addPage();doc.moveDown(1.2).fillColor(muted).font("Helvetica").fontSize(8.5).text("Important: This report reproduces information recorded by Memansa Therapy Studio. It is not a medical prescription and does not replace advice from a qualified medical practitioner.");
  const range=doc.bufferedPageRange();for(let page=range.start;page<range.start+range.count;page++){doc.switchToPage(page);doc.moveTo(48,775).lineTo(547,775).lineWidth(.5).strokeColor("#d5dfe4").stroke();doc.fillColor(muted).font("Helvetica").fontSize(8).text("Memansa Therapy Studio - Confidential patient report",48,782,{width:390,lineBreak:false});doc.text(`Page ${page+1} of ${range.count}`,447,782,{width:100,align:"right",lineBreak:false});}
  doc.end();return completed;
}
