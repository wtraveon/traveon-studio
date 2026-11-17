import assert from "node:assert/strict";

const base = process.env.SITE_BASE_URL || "https://traveonstudio.com";
const timeoutMs = 15000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(new URL(path, base), {
      ...options,
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "TraveonStudio-ProductionSmoke/1.0", ...(options.headers || {}) }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getText(path) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path} returned HTTP ${response.status}`);
  return { response, text: await response.text() };
}

const requiredPaths = [
  "/", "/services/", "/work/", "/pricing/", "/about/", "/contact/",
  "/resources/", "/resources/workbook/", "/privacy/", "/404.html"
];
const pageRecords = [];
for (const path of requiredPaths) {
  const { response, text } = await getText(path);
  assert.match(response.headers.get("content-type") || "", /text\/html/i, `${path} must be HTML`);
  assert.match(text, /<title>[^<]+<\/title>/i, `${path} must include a title`);
  assert.match(text, /<meta[^>]+name=["']description["'][^>]+content=["'][^"']+["']/i,
    `${path} must include a meta description`);
  if (path !== "/404.html") {
    const match = text.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
      || text.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
    assert.ok(match, `${path} must declare a canonical URL`);
    assert.equal(new URL(match[1], base).href, new URL(path, base).href,
      `${path} canonical URL must match its page URL`);
  }
  pageRecords.push({ path, text, response });
}
const homepage = pageRecords[0];
assert.match(homepage.text, /Traveon Studio/i, "Homepage should identify the studio");
assert.match(homepage.text, /Pazzion Stylez/i, "Homepage should show the featured client project");
assert.match(homepage.text, /252-360-9630/, "Homepage should display a business contact path");

for (const { path, text } of pageRecords.filter(p => p.path !== "/404.html")) {
  assert.match(text, /<h1\b/i, `${path} must include a primary heading`);
  assert.match(text, /Skip to content/i, `${path} should expose a skip link`);
}

const contact = pageRecords.find(p => p.path === "/contact/").text;
const key = contact.match(/class=["']cf-turnstile["'][^>]*data-sitekey=["']([^"']+)["']/i)?.[1];
if (!key || /REPLACE_WITH|placeholder/i.test(key)) {
  console.warn("CONFIGURATION WARNING: contact page still needs the real Cloudflare Turnstile public site key.");
} else {
  console.log("Public Turnstile site key is present on the contact page.");
}

const { response: robotsResponse, text: robots } = await getText("/robots.txt");
assert.match(robots, /Sitemap:\s*https:\/\/traveonstudio\.com\/sitemap\.xml/i,
  "robots.txt must reference the canonical sitemap");
const { text: sitemap } = await getText("/sitemap.xml");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, value]) => value.trim());
assert.ok(urls.includes("https://traveonstudio.com/"), "Sitemap must include homepage");
assert.equal(urls.length, new Set(urls).size, "Sitemap URLs must be unique");
assert.ok(urls.every(url => url.startsWith("https://traveonstudio.com/")),
  "Sitemap URLs must use canonical HTTPS host");
const descriptions = new Map();
for (const url of urls) {
  const parsed = new URL(url);
  const { response, text } = await getText(parsed.pathname);
  const descriptionTag = text.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  assert.ok(descriptionTag, `${parsed.pathname} needs a meta description`);
  const normalized = descriptionTag[1].trim().replace(/\s+/g, " ").toLowerCase();
  assert.ok(!descriptions.has(normalized), `${parsed.pathname} duplicates description on ${descriptions.get(normalized)}`);
  descriptions.set(normalized, parsed.pathname);
  assert.match(response.headers.get("content-type") || "", /text\/html/i);
}
const security = homepage.response.headers;
for (const [header, value] of [
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "DENY"],
  ["referrer-policy", "strict-origin-when-cross-origin"]
]) {
  assert.equal(security.get(header), value, `Homepage should send ${header}: ${value}`);
}
assert.match(security.get("strict-transport-security") || "", /max-age=31536000/i,
  "Homepage should set one-year HSTS");

const { response: configResponse, text: configText } = await getText("/api/consultation");
assert.notEqual(configResponse.status, 200, "GET /api/consultation should not accept a submission");
assert.ok([404, 405].includes(configResponse.status),
  `GET /api/consultation should be unavailable or method-restricted (got ${configResponse.status})`);
console.log(`Production smoke checks passed for ${requiredPaths.length} public pages, ${urls.length} sitemap URLs, security headers, and consultation endpoint method handling.`);
console.log("MANUAL VERIFICATION REQUIRED: submit an approved consultation test and confirm D1 persistence plus notification email receipt.");
