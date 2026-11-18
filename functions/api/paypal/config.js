import { json, paypalConfig } from "../../_lib/paypal.js";

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET", "Cache-Control": "no-store" } });
  const settings = paypalConfig(env);
  if (!settings.clientId || !settings.clientSecret) return json({ enabled: false, message: "PayPal checkout is not configured yet." }, 503);
  return json({ enabled: true, clientId: settings.clientId, mode: settings.mode, currency: "USD" });
}
