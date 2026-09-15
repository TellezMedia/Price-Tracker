// Attempts to pull a price out of a product page.
//
// Strategy, in order:
//   1. If the product has a manual CSS selector saved, use that.
//   2. Try common structured data (JSON-LD, meta tags) most
//      e-commerce sites include for SEO purposes. This is the most
//      reliable path when it's present.
//   3. Fall back to a generic HTMLRewriter scan for the first
//      element carrying a price-looking pattern.
//
// If none of these find a confident price, the caller marks the
// product "unreadable" instead of guessing.

const PRICE_PATTERN = /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;

export async function extractPrice(url, manualSelector) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    return { ok: false, reason: `HTTP ${response.status}` };
  }

  const html = await response.text();
  const imageUrl = extractImage(html);

  if (manualSelector) {
    const manual = await extractWithSelector(html, manualSelector);
    if (manual) return { ok: true, price: manual, method: "manual_selector", imageUrl };
  }

  const structured = extractFromStructuredData(html);
  if (structured) return { ok: true, price: structured, method: "structured_data", imageUrl };

  const generic = await extractGeneric(html);
  if (generic) return { ok: true, price: generic, method: "generic_scan", imageUrl };

  // Last resort: some sites (Ubiquiti's store included) render the
  // price as plain text without JSON-LD, price meta tags, or any
  // element whose class/id literally contains the word "price"
  // (common with CSS-module-style hashed class names). This just
  // grabs the first dollar amount anywhere in the page. It's the
  // least precise method, so it runs last, after every more
  // targeted approach has failed.
  const rawScan = extractFirstDollarAmount(html);
  if (rawScan) return { ok: true, price: rawScan, method: "raw_text_scan", imageUrl };

  return { ok: false, reason: "no_price_found", imageUrl };
}

function extractImage(html) {
  // og:image is the standard tag sites use for link previews
  // (social shares, text message previews), a reliable, widely
  // supported source for a product thumbnail.
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogMatch) return ogMatch[1];

  // Some sites order the attributes the other way (content before
  // property), so check that too.
  const ogMatchReversed = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatchReversed) return ogMatchReversed[1];

  const twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (twitterMatch) return twitterMatch[1];

  return null;
}

function extractFromStructuredData(html) {
  // Look for JSON-LD blocks with an "offers" -> "price" field, the
  // schema.org pattern most storefronts use.
  const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      const price = findPriceInObject(data);
      if (price) return price;
    } catch {
      // Malformed JSON-LD is common enough, just skip it.
      continue;
    }
  }

  // Fallback: og:price:amount or itemprop="price" meta tags.
  const metaMatch =
    html.match(/<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([\d.]+)["']/i) ||
    html.match(/<meta[^>]+itemprop=["']price["'][^>]+content=["']([\d.]+)["']/i);

  if (metaMatch) {
    const value = parseFloat(metaMatch[1]);
    if (!isNaN(value)) return value;
  }

  return null;
}

function findPriceInObject(obj) {
  if (!obj || typeof obj !== "object") return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findPriceInObject(item);
      if (found) return found;
    }
    return null;
  }

  if (obj.offers) {
    const offers = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
    if (offers && offers.price) {
      const value = parseFloat(offers.price);
      if (!isNaN(value)) return value;
    }
  }

  for (const key of Object.keys(obj)) {
    const found = findPriceInObject(obj[key]);
    if (found) return found;
  }

  return null;
}

async function extractWithSelector(html, selector) {
  let found = null;

  const rewriter = new HTMLRewriter().on(selector, {
    text(text) {
      if (found) return;
      const match = text.text.match(PRICE_PATTERN);
      if (match) found = parseFloat(match[1].replace(/,/g, ""));
    },
  });

  // HTMLRewriter needs a Response to transform.
  await rewriter.transform(new Response(html)).text();
  return found;
}

function extractFirstDollarAmount(html) {
  // Strip script and style blocks first, so we don't pick up a
  // dollar amount sitting inside embedded JSON or CSS.
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  const match = stripped.match(PRICE_PATTERN);
  if (!match) return null;

  const value = parseFloat(match[1].replace(/,/g, ""));
  return isNaN(value) ? null : value;
}

async function extractGeneric(html) {
  // Look for common price-carrying class/id names first, since a
  // blind text scan of the whole page tends to pick up unrelated
  // dollar amounts (shipping thresholds, "save $20", etc).
  const commonSelectors = [
    '[class*="price"]',
    '[id*="price"]',
    '[data-testid*="price"]',
    '[itemprop="price"]',
  ];

  for (const selector of commonSelectors) {
    const found = await extractWithSelector(html, selector);
    if (found) return found;
  }

  return null;
}
