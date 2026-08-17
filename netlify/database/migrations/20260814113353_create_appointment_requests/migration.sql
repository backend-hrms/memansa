CREATE TABLE "appointment_requests" (
	"id" serial PRIMARY KEY,
	"full_name" text NOT NULL,
	"mobile_number" text NOT NULL,
	"age" integer NOT NULL,
	"city" text NOT NULL,
	"health_concern" text NOT NULL,
	"preferred_date" date NOT NULL,
	"preferred_time" text NOT NULL,
	"privacy_consent" boolean NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
