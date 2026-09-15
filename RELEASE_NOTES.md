# Price Tracker Worker - Release Notes

## v0.1.0 (Beta)

Initial build of the Cloudflare Worker backend.

Added
- REST API: add product, list products, get single product, delete
  product, manual "check now" trigger
- Cron trigger, runs every 24 hours, checks every tracked product's
  price
- Price extraction with three fallback strategies: manual CSS
  selector, structured page data (JSON-LD/meta tags), generic
  price-pattern scan
- KV-backed storage for products and price history (last 180 data
  points per product, roughly six months of daily checks)
- Bearer token auth so the API isn't open to the public
- Target price tracking, product record includes a `hitTarget` flag
  the widget can watch for notifications

Not yet built
- Electron widget (next phase)
- Headless-browser rendering fallback for JS-heavy sites
- "Search other retailers" link generation

## v0.1.1 (Beta)

Fixed
- SETUP.md updated: newer wrangler versions use `wrangler kv
  namespace create`, not `wrangler kv:namespace create`. Your
  installed version dropped the colon syntax.

## v0.1.2 (Beta)

Fixed
- Added a fourth price extraction fallback: a raw text scan for the
  first dollar amount on the page. This catches sites like
  Ubiquiti's store, which render prices as plain text with no
  JSON-LD, no price meta tags, and no element whose class or id
  literally contains the word "price" (their classes use hashed
  CSS-module names instead). This is the least precise method, so
  it only runs after manual selector, structured data, and the
  targeted generic scan have all failed.

Known limitation
- The raw text scan grabs the first dollar amount anywhere on the
  page, so on a page with unrelated dollar figures appearing before
  the actual price (a banner promo, a "save $20" callout, etc), it
  could grab the wrong number. If you see a `currentPrice` that
  looks wrong on a specific product, set a `manualSelector` on that
  product, that takes priority over every fallback.

## v0.1.3 (Beta)

Added
- PATCH /products/:id endpoint, lets you update a product's
  nickname, target price, manual selector, notify toggle, or search
  query after it's already been added, needed for the widget's Edit
  Product feature
- Updating targetPrice via PATCH immediately re-checks hitTarget
  against the last known price, rather than waiting for the next
  scheduled check
