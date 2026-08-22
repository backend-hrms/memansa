type AppointmentConfirmation = {
  fullName: string;
  mobileNumber: string;
  preferredDate: string;
  preferredTime: string;
};

function whatsappNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `whatsapp:+91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `whatsapp:+${digits}`;
  throw new Error("Patient mobile number is not valid for WhatsApp.");
}

export async function sendWhatsAppConfirmation(appointment: AppointmentConfirmation) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const keySid = process.env.TWILIO_API_KEY_SID;
  const keySecret = process.env.TWILIO_API_KEY_SECRET;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!accountSid || !keySid || !keySecret || !from) throw new Error("Twilio is not configured.");

  const form = new URLSearchParams({
    To: whatsappNumber(appointment.mobileNumber),
    From: from,
    ContentSid: "HXb5b62575e6e4ff6129ad7c8efe1f983e",
    ContentVariables: JSON.stringify({
      1: appointment.preferredDate,
      2: appointment.preferredTime,
    }),
  });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${keySid}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    },
  );
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(detail.message || `Twilio returned ${response.status}.`);
  }
}
