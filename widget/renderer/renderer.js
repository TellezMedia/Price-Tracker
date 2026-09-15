let products = [];
let selectedProductId = null;
let chartInstance = null;
let editingProductId = null; // null means the "Add Product" modal is in add mode

const el = (id) => document.getElementById(id);

async function init() {
  const settings = await window.api.getSettings();
  applyTheme(settings.theme || "light");

  if (!settings.workerUrl || !settings.apiKey) {
    openSettingsModal(settings);
  } else {
    await refreshProducts();
  }

  window.api.onProductsUpdated((updated) => {
    products = updated;
    renderProductList();
    if (selectedProductId) renderDetailPanel(selectedProductId);
  });
}

// --- Theme ---

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
}

el("theme-toggle").addEventListener("click", async () => {
  const isDark = document.body.classList.toggle("dark");
  await window.api.saveSettings({ theme: isDark ? "dark" : "light" });
});

// --- Settings modal ---

function openSettingsModal(settings) {
  el("settings-worker-url").value = settings.workerUrl || "";
  el("settings-api-key").value = settings.apiKey || "";
  el("settings-modal-overlay").classList.add("visible");
}

el("settings-button").addEventListener("click", async () => {
  const settings = await window.api.getSettings();
  openSettingsModal(settings);
});

el("settings-cancel").addEventListener("click", () => {
  el("settings-modal-overlay").classList.remove("visible");
});

el("settings-save").addEventListener("click", async () => {
  const workerUrl = el("settings-worker-url").value.trim();
  const apiKey = el("settings-api-key").value.trim();

  if (!workerUrl || !apiKey) {
    alert("Both Worker URL and API Key are required.");
    return;
  }

  await window.api.saveSettings({ workerUrl, apiKey });
  el("settings-modal-overlay").classList.remove("visible");
  await refreshProducts();
});

// --- Product list ---

async function refreshProducts() {
  try {
    products = await window.api.getProducts();
    renderProductList();
  } catch (err) {
    el("product-list").innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
  }
}

function renderProductList() {
  const list = el("product-list");

  if (products.length === 0) {
    list.innerHTML = '<p class="empty-state" id="empty-state">No products tracked yet. Add one to get started.</p>';
    return;
  }

  list.innerHTML = "";

  for (const product of products) {
    const row = document.createElement("div");
    row.className = "product-row" + (product.id === selectedProductId ? " selected" : "");
    row.addEventListener("click", () => selectProduct(product.id));

    const delta = priceDelta(product);

    row.innerHTML = `
      <div class="product-row-top">
        <div class="product-row-identity">
          ${product.imageUrl ? `<img class="product-thumb" src="${escapeAttr(product.imageUrl)}" alt="" />` : '<div class="product-thumb product-thumb-placeholder"></div>'}
          <span class="product-row-name">${escapeHtml(product.nickname)}</span>
        </div>
        <span class="product-row-price">${formatPrice(product.currentPrice)}</span>
      </div>
      <div class="product-row-meta">
        ${delta ? `<span class="price-delta ${delta.direction}">${delta.text}</span>` : "No history yet"}
      </div>
      ${product.unreadable ? '<span class="unreadable-badge">Price unreadable</span>' : ""}
    `;

    list.appendChild(row);
  }
}

function priceDelta(product) {
  const history = product.priceHistory || [];
  if (history.length < 2) return null;

  const previous = history[history.length - 2].price;
  const current = product.currentPrice;
  const diff = current - previous;

  if (diff === 0) return null;

  const direction = diff < 0 ? "positive" : "negative"; // price drop is "positive" news
  const arrow = diff < 0 ? "\u25BC" : "\u25B2";
  return {
    direction,
    text: `${arrow} $${Math.abs(diff).toFixed(2)} since last check`,
  };
}

// --- Detail panel ---

function selectProduct(id) {
  selectedProductId = id;
  renderProductList();
  renderDetailPanel(id);
}

function renderDetailPanel(id) {
  const product = products.find((p) => p.id === id);
  const panel = el("detail-panel");

  if (!product) {
    panel.innerHTML = '<p class="empty-state">Select a product to see its price history.</p>';
    return;
  }

  const lowest = product.lowestPrice != null ? formatPrice(product.lowestPrice) : "\u2014";
  const target = product.targetPrice != null ? formatPrice(product.targetPrice) : "Not set";

  panel.innerHTML = `
    <div class="detail-header">
      <div class="detail-header-identity">
        ${product.imageUrl ? `<img class="detail-thumb" src="${escapeAttr(product.imageUrl)}" alt="" />` : ""}
        <div>
          <h2 class="detail-title">${escapeHtml(product.nickname)}</h2>
          <span class="search-retailers-link" id="search-retailers">Search other retailers &#8250;</span>
        </div>
      </div>
      <div class="detail-actions">
        <button class="secondary-button" id="edit-product">Edit</button>
        <button class="secondary-button" id="check-now">Check Now</button>
        <button class="secondary-button" id="delete-product">Delete</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Current Price</div>
        <div class="stat-value">${formatPrice(product.currentPrice)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Lowest Seen</div>
        <div class="stat-value">${lowest}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Target Price</div>
        <div class="stat-value">${target}</div>
      </div>
    </div>

    <div class="chart-container">
      <canvas id="price-chart"></canvas>
    </div>
  `;

  renderChart(product);

  el("search-retailers").addEventListener("click", () => {
    const query = encodeURIComponent(product.searchQuery || product.nickname);
    window.api.openExternal(`https://www.google.com/search?tbm=shop&q=${query}`);
  });

  el("edit-product").addEventListener("click", () => openProductModal(product));
  el("check-now").addEventListener("click", async () => {
    await window.api.checkProduct(product.id);
    await refreshProducts();
    renderDetailPanel(product.id);
  });
  el("delete-product").addEventListener("click", async () => {
    if (!confirm(`Stop tracking "${product.nickname}"?`)) return;
    await window.api.deleteProduct(product.id);
    selectedProductId = null;
    await refreshProducts();
    el("detail-panel").innerHTML = '<p class="empty-state">Select a product to see its price history.</p>';
  });
}

function renderChart(product) {
  const ctx = el("price-chart").getContext("2d");
  const history = product.priceHistory || [];

  const labels = history.map((point) => new Date(point.checkedAt).toLocaleDateString());
  const values = history.map((point) => point.price);

  if (chartInstance) chartInstance.destroy();

  const accentColor = document.body.classList.contains("dark") ? "#3fc7b8" : "#0f7a72";

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Price",
          data: values,
          borderColor: accentColor,
          backgroundColor: accentColor + "22",
          fill: true,
          tension: 0.25,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: (value) => `$${value}` } },
      },
    },
  });
}

// --- Add / Edit product modal ---

el("add-product-button").addEventListener("click", () => openProductModal(null));

function openProductModal(product) {
  editingProductId = product ? product.id : null;
  el("product-modal-title").textContent = product ? "Edit Product" : "Add Product";
  el("product-url").value = product ? product.url : "";
  el("product-url").disabled = !!product; // URL isn't editable after creation, only new fields are
  el("product-nickname").value = product ? product.nickname : "";
  el("product-target").value = product && product.targetPrice != null ? product.targetPrice : "";
  el("product-notify").checked = product ? product.notifyOnDrop : true;
  el("product-selector").value = product && product.manualSelector ? product.manualSelector : "";
  el("product-modal-overlay").classList.add("visible");
}

el("product-cancel").addEventListener("click", () => {
  el("product-modal-overlay").classList.remove("visible");
});

el("product-save").addEventListener("click", async () => {
  const nickname = el("product-nickname").value.trim();
  const targetPriceRaw = el("product-target").value.trim();
  const notifyOnDrop = el("product-notify").checked;
  const manualSelector = el("product-selector").value.trim() || null;

  const data = {
    nickname: nickname || undefined,
    targetPrice: targetPriceRaw ? parseFloat(targetPriceRaw) : null,
    notifyOnDrop,
    manualSelector,
  };

  try {
    if (editingProductId) {
      await window.api.updateProduct(editingProductId, data);
    } else {
      const url = el("product-url").value.trim();
      if (!url) {
        alert("A product URL is required.");
        return;
      }
      data.url = url;
      data.searchQuery = nickname || url;
      await window.api.addProduct(data);
    }

    el("product-modal-overlay").classList.remove("visible");
    await refreshProducts();
    if (editingProductId) renderDetailPanel(editingProductId);
  } catch (err) {
    alert(`Couldn't save product: ${err.message}`);
  }
});

// --- Helpers ---

function formatPrice(value) {
  return value == null ? "\u2014" : `$${Number(value).toFixed(2)}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}

init();
