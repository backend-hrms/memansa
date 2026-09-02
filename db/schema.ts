import { boolean, date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const appointmentRequests = pgTable("appointment_requests", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  age: integer("age").notNull(),
  city: text("city").notNull(),
  healthConcern: text("health_concern").notNull(),
  preferredDate: date("preferred_date").notNull(),
  preferredTime: text("preferred_time").notNull(),
  privacyConsent: boolean("privacy_consent").notNull(),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const medicineRecords = pgTable("medicine_records", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull(),
  medicineName: text("medicine_name").notNull(),
  dosage: text("dosage").notNull().default(""),
  frequency: text("frequency").notNull().default(""),
  duration: text("duration").notNull().default(""),
  instructions: text("instructions").notNull().default(""),
  attachmentName: text("attachment_name").notNull().default(""),
  attachmentMime: text("attachment_mime").notNull().default(""),
  attachmentData: text("attachment_data").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
