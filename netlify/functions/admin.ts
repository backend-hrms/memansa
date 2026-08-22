import { desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentRequests } from "../../db/schema.js";
import { clearSessionCookie, createSessionCookie, hasValidSession, validCredentials } from "../lib/admin-auth.js";

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] || character);
}

function statusOptions(current: string) {
  return ["pending", "contacted", "confirmed", "completed", "cancelled"]
    .map((status) => `<option value="${status}"${status === current ? " selected" : ""}>${status[0].toUpperCase()}${status.slice(1)}</option>`)
    .join("");
}

export default async (request: Request) => {
  const url = new URL(request.url);
  if (request.method === "POST") {
    const form = await request.formData();
    if (url.searchParams.get("logout") === "1") {
      return new Response(null, { status: 303, headers: { Location: "/admin", "Set-Cookie": clearSessionCookie() } });
    }
    if (validCredentials(String(form.get("username") || ""), String(form.get("password") || ""))) {
      return new Response(null, { status: 303, headers: { Location: "/admin", "Set-Cookie": createSessionCookie() } });
    }
    return loginPage("Incorrect username or password.");
  }
  if (!hasValidSession(request)) return loginPage();

  const appointments = await db.select().from(appointmentRequests)
    .orderBy(desc(appointmentRequests.id)).limit(250);
  const notice = url.searchParams.get("notice");
  const noticeHtml = notice === "confirmation-sent"
    ? '<p class="notice success">Appointment confirmed and WhatsApp notification sent.</p>'
    : notice === "confirmation-failed"
      ? '<p class="notice error">Status saved, but WhatsApp could not be delivered. The patient may need to join the Twilio Sandbox.</p>'
      : notice === "status-saved"
        ? '<p class="notice success">Appointment status saved.</p>'
        : "";

  const cards = appointments.map((item) => `
    <article class="card">
      <div class="card-head"><div><h2>${escapeHtml(item.fullName)}</h2><p>${escapeHtml(item.age)} years · ${escapeHtml(item.city)}</p></div><span>${escapeHtml(item.status)}</span></div>
      <div class="details"><div><small>Contact</small><a href="tel:${escapeHtml(item.mobileNumber)}">${escapeHtml(item.mobileNumber)}</a></div><div><small>Preferred date</small><strong>${escapeHtml(item.preferredDate)}</strong></div><div><small>Preferred time</small><strong>${escapeHtml(item.preferredTime)}</strong></div></div>
      <div class="concern"><small>Health concern</small><p>${escapeHtml(item.healthConcern)}</p></div>
      <form method="POST" action="/admin/status"><input type="hidden" name="appointment-id" value="${item.id}"><label>Update appointment status<select name="status">${statusOptions(item.status)}</select></label><button type="submit">Save status</button></form>
    </article>`).join("");

  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Memansa Admin</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f4f1ea;color:#173b36;font:15px/1.5 Arial,sans-serif}.wrap{max-width:1180px;margin:auto;padding:36px 24px 70px}header{display:flex;justify-content:space-between;align-items:end;gap:20px;border-bottom:1px solid #cad5cc;padding-bottom:25px;margin-bottom:30px}.eyebrow,small,label{font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#78877f}.eyebrow{color:#b8624d}h1{font:600 clamp(34px,5vw,52px) Georgia,serif;margin:8px 0}h2{margin:0;font:600 23px Georgia,serif}a{color:#173b36}.home,button{border:0;border-radius:6px;background:#173b36;color:white;padding:12px 18px;text-decoration:none;font-weight:700}.notice{padding:13px 16px;border-radius:8px;font-weight:700}.notice.success{background:#e8f4e9;color:#245c35}.notice.error{background:#fff0ec;color:#a24432}.summary,.card{background:white;border:1px solid #d8dfd7;border-radius:13px;box-shadow:0 3px 10px #173b360d}.summary{padding:20px;margin-bottom:24px}.summary strong{display:block;font-size:38px}.grid{display:grid;gap:18px}.card{padding:22px}.card-head{display:flex;justify-content:space-between;gap:20px}.card-head p{margin:5px 0;color:#66766e}.card-head span{height:max-content;background:#edf4ec;border-radius:20px;padding:6px 12px;font-size:11px;font-weight:700;text-transform:uppercase}.details{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;border-top:1px solid #edf0ec;margin-top:18px;padding-top:18px}.details small,.details strong,.details a{display:block}.details a,.details strong{margin-top:5px;font-weight:700}.concern{background:#f7f4ee;border-radius:8px;padding:15px;margin-top:18px}.concern p{margin:5px 0 0}form{display:flex;align-items:end;gap:12px;border-top:1px solid #edf0ec;margin-top:18px;padding-top:18px}form label{flex:1}select{display:block;width:100%;margin-top:7px;padding:11px;border:1px solid #b8c6bd;border-radius:7px;background:white;color:#173b36;font-weight:700;text-transform:none}button{background:#ce7e66;cursor:pointer}@media(max-width:700px){header{align-items:start;flex-direction:column}.details{grid-template-columns:1fr}form{align-items:stretch;flex-direction:column}button{width:100%}}
  </style></head><body><main class="wrap"><header><div><p class="eyebrow">Memansa Therapy Studio</p><h1>Appointment dashboard</h1></div><div style="display:flex;gap:10px"><a class="home" href="/">View website</a><form method="POST" action="/admin?logout=1" style="border:0;margin:0;padding:0;display:block"><button type="submit" style="background:#173b36">Sign out</button></form></div></header>${noticeHtml}<section class="summary"><small>Total appointment requests</small><strong>${appointments.length}</strong></section><div class="grid">${cards || "<p>No appointment requests yet.</p>"}</div></main></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
};

function loginPage(error = "") {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Memansa Admin Login</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f1ea;color:#173b36;font:15px Arial,sans-serif}.login{width:min(420px,calc(100% - 32px));background:white;border:1px solid #d8dfd7;border-radius:16px;padding:34px;box-shadow:0 16px 45px #173b3615}.eyebrow{font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#b8624d}h1{font:600 38px/1.1 Georgia,serif;margin:12px 0 9px}p{color:#66766e;line-height:1.55}label{display:block;margin-top:18px;font-size:12px;font-weight:700;color:#496159}input{display:block;width:100%;margin-top:7px;padding:13px;border:1px solid #b8c6bd;border-radius:7px;font:15px Arial}.show{display:flex;align-items:center;gap:8px;margin-top:10px;font-weight:500;text-transform:none}.show input{width:auto;margin:0}button{width:100%;margin-top:22px;border:0;border-radius:7px;background:#ce7e66;color:white;padding:14px;font-weight:700;cursor:pointer}.error{background:#fff0ec;color:#a24432;padding:10px;border-radius:6px;font-size:13px}a{display:block;text-align:center;margin-top:18px;color:#173b36;font-weight:700}</style></head><body><main class="login"><div class="eyebrow">Memansa Therapy Studio</div><h1>Admin login</h1><p>Sign in to manage appointment requests. Username is not case-sensitive.</p>${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}<form method="POST" action="/admin"><label>Username<input name="username" autocomplete="username" autocapitalize="none" required></label><label>Password<input id="admin-password" name="password" type="password" autocomplete="current-password" required></label><label class="show"><input type="checkbox" onclick="document.getElementById('admin-password').type=this.checked?'text':'password'"> Show password</label><button type="submit">Sign in</button></form><a href="/">Back to website</a></main></body></html>`, { status: error ? 401 : 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export const config = { path: "/admin" };
