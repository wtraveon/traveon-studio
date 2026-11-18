const ALLOWED_ORIGINS = new Set(["https://traveonstudio.com", "https://www.traveonstudio.com"]);
export const CATALOG = Object.freeze({
  "website-deposit": { name: "Website package — 50% project deposit", amount: "300.00", description: "50% deposit for the $600 Traveon Studio website package. Remaining balance is due after final approval and before launch." },
  "business-workbook": { name: "Business & Productivity Workbook", amount: "200.00", description: "One-time purchase of the Traveon Studio Business & Productivity Workbook." }
});
export function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
export function validOrigin(request) {
  const origin = request.headers.get("Origin");
  return Boolean(origin && ALLOWED_ORIGINS.has(origin));
}
export function paypalConfig(env) {
  const mode = env.PAYPAL_ENV === "live" ? "live" : "sandbox";
  return {
    mode,
    apiBase: mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
    clientId: env.PAYPAL_CLIENT_ID,
    clientSecret: env.PAYPAL_CLIENT_SECRET
  };
}
export async function getAccessToken(env) {
  const config = paypalConfig(env);
  if (!config.clientId || !config.clientSecret) throw new Error("PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Cloudflare Pages environment variables.");
  const credentials = btoa(config.clientId + ":" + config.clientSecret);
  const response = await fetch(config.apiBase + "/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: "Basic " + credentials, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(12000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error("PayPal authentication failed. Check the configured API credentials and environment.");
  return data.access_token;
}
export async function ensureOrdersTable(db) {
  if (!db) throw new Error("The Cloudflare D1 database binding DB is unavailable.");
  await db.prepare("CREATE TABLE IF NOT EXISTS paypal_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, paypal_order_id TEXT NOT NULL UNIQUE, product_id TEXT NOT NULL, amount TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', status TEXT NOT NULL DEFAULT 'CREATED', capture_id TEXT, payer_id TEXT, payer_email TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), captured_at TEXT)").run();
}
