import { extractPrice } from "./priceExtractor.js";
import {
  listProducts,
  getProduct,
  saveProduct,
  deleteProduct,
  appendPricePoint,
  markUnreadable,
  mergeProductUpdates,
} from "./store.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (!isAuthorized(request, env)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean); // e.g. ["products", "abc123"]

    try {
      if (parts[0] === "products" && parts.length === 1) {
        if (request.method === "GET") return await handleListProducts(env);
        if (request.method === "POST") return await handleAddProduct(request, env);
      }

      if (parts[0] === "products" && parts.length === 2) {
        const id = parts[1];
        if (request.method === "GET") return await handleGetProduct(env, id);
        if (request.method === "PATCH") return await handlePatchProduct(request, env, id);
        if (request.method === "DELETE") return await handleDeleteProduct(env, id);
      }

      if (parts[0] === "products" && parts.length === 3 && parts[2] === "check") {
        if (request.method === "POST") return await handleCheckNow(env, parts[1]);
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      return json({ error: "Internal error", detail: String(err) }, 500);
    }
  },

  // Cloudflare calls this automatically on the cron schedule set in
  // wrangler.toml. It walks every tracked product and refreshes its
  // price, same logic as the manual "check now" endpoint.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkAllProducts(env));
  },
};

function isAuthorized(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token && token === env.API_KEY;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function handleListProducts(env) {
  const products = await listProducts(env.PRICE_TRACKER_KV);
  return json({ products });
}

async function handleGetProduct(env, id) {
  const product = await getProduct(env.PRICE_TRACKER_KV, id);
  if (!product) return json({ error: "Not found" }, 404);
  return json({ product });
}

async function handleAddProduct(request, env) {
  const body = await request.json();

  if (!body.url) return json({ error: "url is required" }, 400);

  const product = {
    id: crypto.randomUUID(),
    nickname: body.nickname || body.url,
    url: body.url,
    searchQuery: body.searchQuery || body.nickname || "",
    targetPrice: body.targetPrice ?? null,
    notifyOnDrop: body.notifyOnDrop ?? true,
    manualSelector: body.manualSelector || null,
    currentPrice: null,
    lowestPrice: null,
    imageUrl: null,
    priceHistory: [],
    unreadable: false,
    lastError: null,
    lastCheckedAt: null,
    createdAt: new Date().toISOString(),
    hitTarget: false,
  };

  await saveProduct(env.PRICE_TRACKER_KV, product);

  // Do an immediate check so the widget has a real price right
  // away instead of waiting up to 24 hours for the first data point.
  await checkOneProduct(env, product);

  const saved = await getProduct(env.PRICE_TRACKER_KV, product.id);
  return json({ product: saved }, 201);
}

async function handleDeleteProduct(env, id) {
  await deleteProduct(env.PRICE_TRACKER_KV, id);
  return json({ deleted: true });
}

async function handlePatchProduct(request, env, id) {
  const product = await getProduct(env.PRICE_TRACKER_KV, id);
  if (!product) return json({ error: "Not found" }, 404);

  const updates = await request.json();
  mergeProductUpdates(product, updates);

  // If the target price just changed, re-evaluate hitTarget against
  // the last known price rather than waiting for the next check.
  if (updates.targetPrice !== undefined && product.currentPrice != null) {
    product.hitTarget = product.currentPrice <= product.targetPrice;
  }

  await saveProduct(env.PRICE_TRACKER_KV, product);
  return json({ product });
}

async function handleCheckNow(env, id) {
  const product = await getProduct(env.PRICE_TRACKER_KV, id);
  if (!product) return json({ error: "Not found" }, 404);

  await checkOneProduct(env, product);
  const updated = await getProduct(env.PRICE_TRACKER_KV, id);
  return json({ product: updated });
}

async function checkAllProducts(env) {
  const products = await listProducts(env.PRICE_TRACKER_KV);
  // Sequential on purpose, to avoid hammering multiple retailer
  // sites at once from the same worker invocation.
  for (const product of products) {
    await checkOneProduct(env, product);
  }
}

async function checkOneProduct(env, product) {
  const result = await extractPrice(product.url, product.manualSelector);

  if (result.ok) {
    appendPricePoint(product, result.price, result.imageUrl);
    product.hitTarget =
      product.targetPrice != null && result.price <= product.targetPrice;
  } else {
    markUnreadable(product, result.reason, result.imageUrl);
  }

  await saveProduct(env.PRICE_TRACKER_KV, product);
}
