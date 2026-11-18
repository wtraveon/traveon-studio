import { CATALOG, ensureOrdersTable, getAccessToken, json, paypalConfig, validOrigin } from "../../_lib/paypal.js";

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
  if (!validOrigin(request)) return json({ error: "Request origin not allowed." }, 403);
  if (!(request.headers.get("Content-Type") || "").toLowerCase().includes("application/json")) return json({ error: "Expected a JSON request." }, 415);
  try {
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 2000) return json({ error: "Request is too large." }, 413);
    const body = await request.json();
    const productId = typeof body.productId === "string" ? body.productId : "";
    const product = CATALOG[productId];
    if (!product) return json({ error: "Choose an available one-time purchase." }, 400);
    const config = paypalConfig(env);
    if (!config.clientId || !config.clientSecret) return json({ error: "PayPal checkout is not activated yet. The site owner must add the PayPal API credentials in Cloudflare Pages." }, 503);
    await ensureOrdersTable(env.DB);
    const token = await getAccessToken(env);
    const requestId = crypto.randomUUID();
    const response = await fetch(config.apiBase + "/v2/checkout/orders", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "PayPal-Request-Id": requestId
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: productId,
          custom_id: productId,
          description: product.description,
          amount: { currency_code: "USD", value: product.amount }
        }],
        payment_source: { paypal: { experience_context: { brand_name: "Traveon Studio", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING" } } }
      }),
      signal: AbortSignal.timeout(15000)
    });
    const order = await response.json().catch(() => ({}));
    if (!response.ok || !order.id) return json({ error: "PayPal could not create the order. Please try again later." }, 502);
    await env.DB.prepare("INSERT INTO paypal_orders (paypal_order_id, product_id, amount, currency, status) VALUES (?, ?, ?, 'USD', 'CREATED')").bind(order.id, productId, product.amount).run();
    return json({ id: order.id });
  } catch (error) {
    return json({ error: error.message || "Unable to start PayPal checkout." }, 503);
  }
}
