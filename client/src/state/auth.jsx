// client/src/state/auth.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

export const API = {
  base: import.meta.env.VITE_API_BASE || "http://localhost:4000",

  async _json(r) {
    const text = await r.text();
    if (!r.ok) throw new Error(text || r.statusText);
    try { return JSON.parse(text || "null"); } catch { throw new Error(text); }
  },

  async login(username, password) {
    const r = await fetch(`${this.base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ username, password })
    });
    return this._json(r);
  },

  async listPublic(q="", filters={}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.country) params.set("country", filters.country);
    const r = await fetch(`${this.base}/api/products/public/products?${params.toString()}`);
    return this._json(r);
  },

  async listProducts(token, q="", filters={}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.country) params.set("country", filters.country);
    const r = await fetch(`${this.base}/api/products?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return this._json(r);
  },

  async getProduct(token, id) {
    const r = await fetch(`${this.base}/api/products/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return this._json(r);
  },

  async createProduct(token, p) {
    const r = await fetch(`${this.base}/api/products`, {
      method: "POST",
      headers: { "Content-Type":"application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(p)
    });
    return this._json(r);
  },

  async updateProduct(token, id, p) {
    const r = await fetch(`${this.base}/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type":"application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(p)
    });
    return this._json(r);
  },

  async deleteProduct(token, id) {
    const r = await fetch(`${this.base}/api/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    return this._json(r);
  },

  async getDashboardAnalytics(token, params = {}) {
    const query = new URLSearchParams(params).toString();
    const r = await fetch(`${this.base}/api/products/analytics/dashboard?${query}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return this._json(r);
  },

  /* -------- Sales endpoints -------- */
  async listSales(token) {
    const r = await fetch(`${this.base}/api/sales`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return this._json(r);
  },

  async getSale(token, id) {
    const r = await fetch(`${this.base}/api/sales/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return this._json(r);
  },

  async createSale(token, saleData) {
    const r = await fetch(`${this.base}/api/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(saleData)
    });
    return this._json(r);
  },

  async deleteSale(token, id) {
    const r = await fetch(`${this.base}/api/sales/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    return this._json(r);
  },

  getExportReceiptUrl(token, id) {
    return `${this.base}/api/sales/${id}/export?token=${encodeURIComponent(token)}`;
  },

  /* -------- Stock endpoints -------- */
  async listStock(token) {
    const r = await fetch(`${this.base}/api/stock`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return this._json(r);
  },

  async getStockStats(token) {
    const r = await fetch(`${this.base}/api/stock/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return this._json(r);
  },

  async getProductRefills(token, productId) {
    const r = await fetch(`${this.base}/api/stock/refills/${productId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return this._json(r);
  },

  async createRefill(token, refillData) {
    const r = await fetch(`${this.base}/api/stock/refills`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(refillData)
    });
    return this._json(r);
  },

  async changeStock(token, id, delta, reason="adjust") {
    const r = await fetch(`${this.base}/api/products/${id}/stock`, {
      method: "POST",
      headers: { "Content-Type":"application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ change: delta, reason })
    });
    return this._json(r);
  },

  async movements(token, id) {
    const r = await fetch(`${this.base}/api/products/${id}/movements`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const j = await this._json(r);
    return j?.events || j; // supports unified history ({events}) or legacy array
  },

  async uploadImage(token, id, file) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${this.base}/api/products/${id}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    return this._json(r);
  },

  /* -------- Owner endpoints -------- */
  async ownerListUsers(token) {
    const r = await fetch(`${this.base}/api/owner/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return this._json(r);
  },

  async ownerCreateUser(token, body) {
    const r = await fetch(`${this.base}/api/owner/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return this._json(r);
  },

  async ownerDeleteUser(token, id) {
    const r = await fetch(`${this.base}/api/owner/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return this._json(r);
  },

  async ownerLogins(token) {
    const r = await fetch(`${this.base}/api/owner/logins`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return this._json(r);
  },

  async ownerUserChanges(token, userId) {
    const r = await fetch(`${this.base}/api/owner/users/${userId}/changes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return this._json(r);
  },

  /* -------- Optional notes (no-op if server doesn’t implement) -------- */
  async listNotes(token, productId) {
    const r = await fetch(`${this.base}/api/owner/products/${productId}/notes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return this._json(r);
  },
  async addNote(token, productId, note) {
    const r = await fetch(`${this.base}/api/owner/products/${productId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(note),
    });
    return this._json(r);
  },

  /* -------- Live FX (via server proxy) -------- */
  // Ask the server for latest rates; you can pass a base like "USD", "EUR", etc.
  async fxLatest(base = "USD") {
    const r = await fetch(`${this.base}/api/fx/latest?base=${encodeURIComponent(base)}`);
    return this._json(r); // -> { base, rates, updated_at }
  },

  // Optional: force-refresh rates from the server (e.g., from an Admin button)
  async fxRefresh(base = "USD") {
    const r = await fetch(`${this.base}/api/fx/refresh?base=${encodeURIComponent(base)}`, { method: "POST" });
    return this._json(r);
  },
};

/* ---- Auth provider ---- */
const Ctx = createContext(null);
export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });

  function saveAuth(t, u) {
    setToken(t); setUser(u);
    if (t) localStorage.setItem("token", t); else localStorage.removeItem("token");
    if (u) localStorage.setItem("user", JSON.stringify(u)); else localStorage.removeItem("user");
  }

  async function login(username, password) {
    const { token: t, user: u } = await API.login(username, password);
    saveAuth(t, u);
    return u;
  }
  function logout() { saveAuth("", null); }

  return <Ctx.Provider value={{ token, user, login, logout }}>{children}</Ctx.Provider>;
}
export function useAuth() { return useContext(Ctx); }
