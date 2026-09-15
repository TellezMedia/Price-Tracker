// Thin wrapper around KV so the rest of the code isn't littered
// with JSON.stringify/parse and key-naming details.
//
// Key layout:
//   product:<id>        -> full product record (JSON)
//   product-index        -> array of all product ids (JSON)

const INDEX_KEY = "product-index";
const MAX_HISTORY_POINTS = 180; // ~6 months of daily checks

export async function listProducts(kv) {
  const ids = await getIndex(kv);
  const products = await Promise.all(ids.map((id) => getProduct(kv, id)));
  return products.filter(Boolean);
}

export async function getProduct(kv, id) {
  const raw = await kv.get(`product:${id}`);
  return raw ? JSON.parse(raw) : null;
}

export async function saveProduct(kv, product) {
  await kv.put(`product:${product.id}`, JSON.stringify(product));
  await addToIndex(kv, product.id);
  return product;
}

export function mergeProductUpdates(product, updates) {
  const allowedFields = ["nickname", "targetPrice", "manualSelector", "notifyOnDrop", "searchQuery"];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) product[field] = updates[field];
  }
  return product;
}

export async function deleteProduct(kv, id) {
  await kv.delete(`product:${id}`);
  await removeFromIndex(kv, id);
}

export function appendPricePoint(product, price, imageUrl) {
  const point = { price, checkedAt: new Date().toISOString() };
  product.priceHistory = [...(product.priceHistory || []), point].slice(-MAX_HISTORY_POINTS);
  product.currentPrice = price;
  product.lowestPrice =
    product.lowestPrice === undefined || product.lowestPrice === null
      ? price
      : Math.min(product.lowestPrice, price);
  product.lastCheckedAt = point.checkedAt;
  product.unreadable = false;
  if (imageUrl) product.imageUrl = imageUrl;
  return product;
}

export function markUnreadable(product, reason, imageUrl) {
  product.unreadable = true;
  product.lastError = reason;
  product.lastCheckedAt = new Date().toISOString();
  if (imageUrl) product.imageUrl = imageUrl;
  return product;
}

async function getIndex(kv) {
  const raw = await kv.get(INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function addToIndex(kv, id) {
  const ids = await getIndex(kv);
  if (!ids.includes(id)) {
    ids.push(id);
    await kv.put(INDEX_KEY, JSON.stringify(ids));
  }
}

async function removeFromIndex(kv, id) {
  const ids = await getIndex(kv);
  const filtered = ids.filter((existing) => existing !== id);
  await kv.put(INDEX_KEY, JSON.stringify(filtered));
}
