import { ensureOrdersTable, getAccessToken, json, paypalConfig, validOrigin } from "../../_lib/paypal.js";

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
  if (!validOrigin(request)) return json({ error: "Request origin not allowed." }, 403);
  if (!(request.headers.get("Content-Type") || "").toLowerCase().includes("application/json")) return json({ error: "Expected a JSON request." }, 415);
  try {
    const body = await request.json();
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    if (!/^[A-Z0-9-]{8,64}$/i.test(orderId)) return json({ error: "Invalid PayPal order ID." }, 400);
    await ensureOrdersTable(env.DB);
    const saved = await env.DB.prepare("SELECT paypal_order_id, product_id, amount, currency, status, capture_id FROM paypal_orders WHERE paypal_order_id = ?").bind(orderId).first();
    if (!saved) return json({ error: "This order was not created by Traveon Studio." }, 404);
    if (saved.status === "COMPLETED") return json({ ok: true, status: "COMPLETED", captureId: saved.capture_id, alreadyCaptured: true });
    const config = paypalConfig(env);
    const token = await getAccessToken(env);
    const response = await fetch(config.apiBase + "/v2/checkout/orders/" + encodeURIComponent(orderId) + "/capture", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(15000)
    });
    const order = await response.json().catch(() => ({}));
    if (!response.ok || order.status !== "COMPLETED") return json({ error: "PayPal has not completed this payment. Please check your PayPal account or try again." }, 402);
    const unit = order.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    const capturedAmount = capture?.amount?.value;
    const capturedCurrency = capture?.amount?.currency_code;
    if (unit?.custom_id !== saved.product_id || capturedCurrency !== saved.currency || capturedAmount !== saved.amount || capture?.status !== "COMPLETED") {
      return json({ error: "The captured payment did not match the original Traveon Studio order. Contact support before retrying." }, 409);
    }
    await env.DB.prepare("UPDATE paypal_orders SET status = 'COMPLETED', capture_id = ?, payer_id = ?, payer_email = ?, captured_at = datetime('now') WHERE paypal_order_id = ? AND status = 'CREATED'").bind(capture.id || null, order.payer?.payer_id || null, order.payer?.email_address || null, orderId).run();
    return json({ ok: true, status: "COMPLETED", captureId: capture.id || null });
  } catch (error) {
    return json({ error: error.message || "Unable to verify the PayPal payment." }, 503);
  }
}
