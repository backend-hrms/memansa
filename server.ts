import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import { renderPgClient } from "./db/index.js";
import admin from "./netlify/functions/admin.js";
import adminStatus from "./netlify/functions/admin-status.js";
import patient from "./netlify/functions/patient.js";
import patientMedicine from "./netlify/functions/patient-medicine.js";
import patientFile from "./netlify/functions/patient-file.js";
import appointments from "./netlify/functions/appointments.js";

const root = resolve(".");
const port = Number(process.env.PORT || 10000);
const types: Record<string, string> = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml",
};

async function ensureDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!renderPgClient) throw new Error("Render PostgreSQL client is unavailable.");
  const client = renderPgClient;
  await client.connect();
  const setup = async () => {
    await client.query(`CREATE TABLE IF NOT EXISTS appointment_requests (
    id serial PRIMARY KEY, full_name text NOT NULL, mobile_number text NOT NULL,
    age integer NOT NULL, city text NOT NULL, health_concern text NOT NULL,
    preferred_date date NOT NULL, preferred_time text NOT NULL,
    privacy_consent boolean NOT NULL, status text DEFAULT 'pending' NOT NULL,
    admin_note text DEFAULT '' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
  )`);
    await client.query("ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS admin_note text DEFAULT '' NOT NULL");
    await client.query(`CREATE TABLE IF NOT EXISTS medicine_records (
      id serial PRIMARY KEY, appointment_id integer NOT NULL REFERENCES appointment_requests(id) ON DELETE CASCADE,
      medicine_name text NOT NULL, dosage text DEFAULT '' NOT NULL, frequency text DEFAULT '' NOT NULL,
      duration text DEFAULT '' NOT NULL, instructions text DEFAULT '' NOT NULL,
      attachment_name text DEFAULT '' NOT NULL, attachment_mime text DEFAULT '' NOT NULL,
      attachment_data text DEFAULT '' NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL
    )`);
    await client.query("CREATE INDEX IF NOT EXISTS medicine_records_appointment_id_idx ON medicine_records (appointment_id)");
  };
  for (let attempt = 1; ; attempt += 1) {
    try { await setup(); break; }
    catch (error) {
      if (attempt === 6) throw error;
      console.warn(`Database not ready (attempt ${attempt}/6); retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
}

async function webRequest(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks);
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((entry) => headers.append(key, entry));
    else if (value) headers.set(key, value);
  }
  return new Request(`https://${request.headers.host || "localhost"}${request.url || "/"}`, {
    method: request.method, headers, body: body.length ? body : undefined,
  });
}

async function sendWebResponse(response: Response, outgoing: ServerResponse) {
  outgoing.statusCode = response.status;
  response.headers.forEach((value, key) => outgoing.setHeader(key, value));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}

async function serveStatic(pathname: string, outgoing: ServerResponse) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = resolve(root, `.${decodeURIComponent(requested)}`);
  if (!file.startsWith(`${root}${sep}`)) return false;
  try {
    if (!(await stat(file)).isFile()) return false;
    outgoing.statusCode = 200;
    outgoing.setHeader("Content-Type", types[extname(file).toLowerCase()] || "application/octet-stream");
    createReadStream(file).pipe(outgoing);
    return true;
  } catch { return false; }
}

await ensureDatabase();
createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url || "/", "http://localhost").pathname;
    if (pathname === "/health") return void sendWebResponse(Response.json({ ok: true }), response);
    if (pathname === "/admin") return void sendWebResponse(await admin(await webRequest(request)), response);
    if (pathname === "/admin/status") return void sendWebResponse(await adminStatus(await webRequest(request)), response);
    if (pathname === "/admin/patient") return void sendWebResponse(await patient(await webRequest(request)), response);
    if (pathname === "/admin/patient/medicine") return void sendWebResponse(await patientMedicine(await webRequest(request)), response);
    if (pathname === "/admin/patient/file") return void sendWebResponse(await patientFile(await webRequest(request)), response);
    if (pathname === "/api/appointments") return void sendWebResponse(await appointments(await webRequest(request)), response);
    if (await serveStatic(pathname, response)) return;
    response.statusCode = 404; response.end("Not found");
  } catch (error) {
    console.error(error); response.statusCode = 500; response.end("Internal server error");
  }
}).listen(port, "0.0.0.0", () => console.log(`Memansa listening on port ${port}`));
