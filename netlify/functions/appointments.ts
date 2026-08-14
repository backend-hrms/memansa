import { db } from "../../db/index.js";
import { appointmentRequests } from "../../db/schema.js";

const allowedTimes = new Set([
  "Morning (9 AM – 12 PM)",
  "Afternoon (12 PM – 4 PM)",
  "Evening (4 PM – 7 PM)",
]);

const limits = {
  fullName: 120,
  mobileNumber: 30,
  city: 120,
  healthConcern: 2000,
};

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

async function readSubmission(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json() as Promise<Record<string, unknown>>;
  }

  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
}

function errorResponse(request: Request, message: string) {
  if ((request.headers.get("accept") || "").includes("application/json")) {
    return Response.json({ error: message }, { status: 400 });
  }

  return new Response(message, { status: 400 });
}

export default async (request: Request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  try {
    const submission = await readSubmission(request);

    if (text(submission["bot-field"], 200)) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/thank-you.html" },
      });
    }

    const fullName = text(submission["full-name"], limits.fullName);
    const mobileNumber = text(submission["mobile-number"], limits.mobileNumber);
    const city = text(submission.city, limits.city);
    const healthConcern = text(submission["health-concern"], limits.healthConcern);
    const preferredDate = text(submission["preferred-date"], 10);
    const preferredTime = text(submission["preferred-time"], 40);
    const age = Number(submission.age);
    const privacyConsent = submission["privacy-consent"] === "on" || submission["privacy-consent"] === true;
    const today = new Date().toISOString().slice(0, 10);

    if (!fullName || !mobileNumber || !city || !healthConcern) {
      return errorResponse(request, "Please complete all required fields.");
    }

    if (!Number.isInteger(age) || age < 1 || age > 120) {
      return errorResponse(request, "Please enter a valid age.");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || preferredDate < today) {
      return errorResponse(request, "Please choose a valid future date.");
    }

    if (!allowedTimes.has(preferredTime)) {
      return errorResponse(request, "Please choose an available time.");
    }

    if (!privacyConsent) {
      return errorResponse(request, "Consent is required before submitting.");
    }

    await db.insert(appointmentRequests).values({
      fullName,
      mobileNumber,
      age,
      city,
      healthConcern,
      preferredDate,
      preferredTime,
      privacyConsent,
    });

    if ((request.headers.get("accept") || "").includes("application/json")) {
      return Response.json({ ok: true }, { status: 201 });
    }

    return new Response(null, {
      status: 303,
      headers: { Location: "/thank-you.html" },
    });
  } catch (error) {
    console.error("Unable to save appointment request", error);
    return new Response("Unable to save your request right now. Please try again or call the studio.", {
      status: 500,
    });
  }
};

export const config = {
  path: "/api/appointments",
};
