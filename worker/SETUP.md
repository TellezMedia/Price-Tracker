# Price Tracker Worker Setup

## 1. Install dependencies

    npm install

## 2. Log in to Cloudflare (if you haven't already for this machine)

    npx wrangler login

## 3. Create the KV namespace

    npx wrangler kv namespace create PRICE_TRACKER_KV

(Newer wrangler versions dropped the colon, it's `kv namespace
create`, not `kv:namespace create`. If that still errors, run
`npx wrangler kv namespace --help` to confirm the exact syntax for
your installed version.)

This prints an `id`. Copy it into `wrangler.toml` in place of
`REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

## 4. Set your API key

Pick any long random string, this is what the Electron widget will
send on every request so random people can't hit your worker.

    npx wrangler secret put API_KEY

Paste your chosen string when prompted. Keep a copy of it, you'll
need to put the same value into the widget's settings later.

## 5. Deploy

    npm run deploy

Wrangler prints your worker's URL, something like
`https://price-tracker-worker.<your-subdomain>.workers.dev`. That's
the base URL the Electron widget will talk to.

## 6. Test it

Replace `YOUR_KEY` and `YOUR_URL` below and run this from a terminal
that has curl (or use a tool like Postman/Insomnia):

    curl -X POST https://YOUR_WORKER_URL/products \
      -H "Authorization: Bearer YOUR_KEY" \
      -H "Content-Type: application/json" \
      -d '{"nickname":"Test Product","url":"https://store.ui.com/us/en/products/ucg-max-ns","targetPrice":180}'

If it worked, you'll get back a JSON product object with a
`currentPrice` filled in (assuming the price extractor could read
that page).

List everything you're tracking:

    curl https://YOUR_WORKER_URL/products \
      -H "Authorization: Bearer YOUR_KEY"

## 7. Cron schedule

The worker is set to run every 24 hours at 09:00 UTC (see
`[triggers]` in `wrangler.toml`). Change the cron string there and
redeploy if you want a different time.

Cron triggers only run once the worker is deployed, they don't fire
during `wrangler dev`. To test the check logic locally without
waiting a day, use the manual check endpoint:

    curl -X POST https://YOUR_WORKER_URL/products/PRODUCT_ID/check \
      -H "Authorization: Bearer YOUR_KEY"

## Notes on price extraction

The worker tries three approaches in order: a manual CSS selector
if you've set one on the product, structured page data (JSON-LD or
meta tags, which most storefronts include), and a generic scan for
price-looking elements. Sites that render prices entirely through
JavaScript after page load won't be readable with this approach,
those will come back as `unreadable: true` with a `lastError`
explaining why. You can set a `manualSelector` on the product to
help it find the right element, or we can add headless-browser
rendering later for specific sites that need it.
