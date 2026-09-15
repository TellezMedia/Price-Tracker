const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),

  getProducts: () => ipcRenderer.invoke("get-products"),
  addProduct: (data) => ipcRenderer.invoke("add-product", data),
  updateProduct: (id, data) => ipcRenderer.invoke("update-product", id, data),
  deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),
  checkProduct: (id) => ipcRenderer.invoke("check-product", id),

  openExternal: (url) => ipcRenderer.invoke("open-external", url),

  onProductsUpdated: (callback) => {
    ipcRenderer.on("products-updated", (event, products) => callback(products));
  },
});
