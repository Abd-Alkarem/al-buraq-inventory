// server/fx.js
import express from "express";
import dotenv from "dotenv";
dotenv.config();

export const fxRouter = express.Router();

// In-memory cache (we use USD as the canonical base)
let FX = {
  base: "USD",
  rates: { USD: 1, SAR: 3.75 }, // SAR fallback stays so KSA display is never blank
  updated_at: null,
};

function normalizeRates(providerName, base, payload) {
  // All providers produce object of {currency: rate} where rate is TARGET per USD.
  // Some providers return different field names: we normalize here.
  switch (providerName) {
    case "exchangerate.host":
    case "open.er-api.com":
      // payload.rates is already the map
      return {
        base: (payload.base || base || "USD").toUpperCase(),
        rates: payload.rates || {},
      };
    case "frankfurter.app":
      // frankfurter: { base: "USD", rates: {EUR: 0.93, ...} }
      return {
        base: (payload.base || base || "USD").toUpperCase(),
        rates: payload.rates || {},
      };
    default:
      return { base: "USD", rates: {} };
  }
}

async function tryFetch(url, providerName) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = await res.json();
  if (!data) throw new Error(`Empty JSON for ${url}`);
  return normalizeRates(providerName, "USD", data);
}

async function fetchRates(base = "USD") {
  const key = process.env.FX_API_KEY ? String(process.env.FX_API_KEY).trim() : "";
  const B = encodeURIComponent(base || "USD");

  // Try several providers/URL variants in order
  const candidates = [
    // exchangerate.host (with api_key)
    {
      url: key ? `https://api.exchangerate.host/latest?base=${B}&api_key=${encodeURIComponent(key)}` : null,
      name: "exchangerate.host",
    },
    // exchangerate.host (with access_key)
    {
      url: key ? `https://api.exchangerate.host/latest?base=${B}&access_key=${encodeURIComponent(key)}` : null,
      name: "exchangerate.host",
    },
    // exchangerate.host (free — no key)
    {
      url: `https://api.exchangerate.host/latest?base=${B}`,
      name: "exchangerate.host",
    },
    // open.er-api.com (free, no key)
    {
      url: `https://open.er-api.com/v6/latest/${B}`,
      name: "open.er-api.com",
    },
    // frankfurter.app (free, no key)
    {
      url: `https://api.frankfurter.app/latest?from=${B}`,
      name: "frankfurter.app",
    },
  ].filter(c => !!c.url);

  let lastErr;
  for (const c of candidates) {
    try {
      const { base: gotBase, rates } = await tryFetch(c.url, c.name);
      if (!rates || typeof rates !== "object" || !Object.keys(rates).length) {
        lastErr = new Error(`No rates in response from ${c.url}`);
        continue;
      }
      // Make sure SAR is present (common local need)
      if (rates.SAR == null) rates.SAR = 3.75;

      FX = {
        base: (gotBase || base || "USD").toUpperCase(),
        rates,
        updated_at: new Date().toISOString(),
      };
      console.log(`✅ FX updated via ${c.name} @ ${FX.updated_at}`);
      return FX;
    } catch (e) {
      lastErr = e;
      console.error(`⚠️  FX provider failed: ${c.url}`);
      console.error("    ", e?.message || e);
      // try next provider
    }
  }

  throw lastErr || new Error("All FX providers failed");
}

/* ---------------------- Routes ---------------------- */

// GET /api/fx/latest?base=USD
fxRouter.get("/latest", async (req, res) => {
  try {
    const base = String(req.query.base || FX.base || "USD").toUpperCase();
    const stale =
      !FX.updated_at ||
      Date.now() - Date.parse(FX.updated_at) > 30 * 60 * 1000 || // 30 min
      FX.base !== base;

    if (stale) await fetchRates(base);
    res.json(FX);
  } catch (e) {
    console.error("❌ FX latest error:", e?.message || e);
    // return cache if we have any
    if (FX.updated_at) return res.json(FX);
    res.status(500).json({ error: "FX update failed" });
  }
});

// POST /api/fx/refresh?base=USD
fxRouter.post("/refresh", async (req, res) => {
  try {
    const base = String(req.query.base || FX.base || "USD").toUpperCase();
    await fetchRates(base);
    res.json(FX);
  } catch (e) {
    console.error("❌ FX refresh error:", e?.message || e);
    res.status(500).json({ error: "FX refresh failed" });
  }
});

// Optional: quick cache status
fxRouter.get("/status", (_req, res) => {
  res.json({
    cached: !!FX.updated_at,
    base: FX.base,
    updated_at: FX.updated_at,
    sample: Object.fromEntries(Object.entries(FX.rates).slice(0, 8)),
  });
});
