export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = ["https://traveonstudio.com", "https://www.traveonstudio.com"];
  if (origin && !allowedOrigins.includes(origin)) {
    return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  }
  const headers = { "Cache-Control": "no-store" };
  try {
    if (!env.DB || !env.TURNSTILE_SECRET_KEY || !env.RESEND_API_KEY || !env.NOTIFICATION_EMAIL) {
      return Response.json({ error: "Consultation form is not fully configured yet." }, { status: 503, headers });
    }
    const form = await request.formData();
    const get = (key) => String(form.get(key) || "").trim();
    if (get("website_url")) return Response.json({ ok: true }, { headers }); // honeypot
    const name = get("name");
    const business = get("business");
    const email = get("email");
    const phone = get("phone");
    const businessType = get("business_type");
    const website = get("website");
    const interest = get("interest");
    const summary = get("project_summary");
    const turnstileToken = get("cf-turnstile-response");
    if (!name || !business || !businessType || !interest || !summary || (!email && !phone)) {
      return Response.json({ error: "Complete the required fields and provide an email address or phone number." }, { status: 400, headers });
    }
    if (name.length > 120 || business.length > 160 || email.length > 254 || phone.length > 60 || businessType.length > 120 || website.length > 500 || interest.length > 120 || summary.length > 5000) {
      return Response.json({ error: "One or more fields exceed the allowed length." }, { status: 400, headers });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400, headers });
    }
    if (!turnstileToken) return Response.json({ error: "Please complete the security check and try again." }, { status: 400, headers });
    const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: turnstileToken, remoteip: request.headers.get("CF-Connecting-IP") || "" })
    });
    const verification = await verify.json();
    if (!verification.success || (verification.hostname && !allowedOrigins.some((o) => o.endsWith(verification.hostname)))) {
      return Response.json({ error: "Security verification failed. Refresh the page and try again." }, { status: 403, headers });
    }
    const result = await env.DB.prepare(
      "INSERT INTO consultation_requests (name, business_name, email, phone, business_type, website, interest, project_summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
    ).bind(name, business, email, phone, businessType, website, interest, summary).run();
    const requestId = result.meta?.last_row_id;
    const safe = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || "Traveon Studio <onboarding@resend.dev>",
        to: [env.NOTIFICATION_EMAIL],
        subject: "New Traveon Studio consultation request" + (requestId ? " #" + requestId : ""),
        html: "<h2>New consultation request</h2><p><b>Name:</b> " + safe(name) + "</p><p><b>Business:</b> " + safe(business) + "</p><p><b>Email:</b> " + safe(email || "Not provided") + "</p><p><b>Phone:</b> " + safe(phone || "Not provided") + "</p><p><b>Business type:</b> " + safe(businessType) + "</p><p><b>Website:</b> " + safe(website || "Not provided") + "</p><p><b>Interest:</b> " + safe(interest) + "</p><p><b>Project summary:</b><br>" + safe(summary).replace(/\n/g, "<br>") + "</p>"
      })
    });
    if (!emailResponse.ok) {
      await env.DB.prepare("UPDATE consultation_requests SET notification_status = 'failed' WHERE id = ?").bind(requestId).run();
      return Response.json({ ok: true, saved: true, notification: "failed" }, { headers });
    }
    await env.DB.prepare("UPDATE consultation_requests SET notification_status = 'sent' WHERE id = ?").bind(requestId).run();
    return Response.json({ ok: true, saved: true, notification: "sent" }, { headers });
  } catch (error) {
    return Response.json({ error: "We couldn't submit your request right now. Please try again or call 252-360-9630." }, { status: 500, headers });
  }
}

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
  }
  return onRequestPost(context);
}
