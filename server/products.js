// server/products.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "./db.js";
import { requireAuth } from "./auth.js";

export const productsRouter = express.Router();

/* ---------- uploads dir ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = Date.now() + "-" + (file.originalname || "image").replace(/[^\w.\-]+/g, "_");
    cb(null, safe);
  }
});
const upload = multer({ storage });

/* ---------- helpers ---------- */
function centsFromDisplay(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}
function assertSkuNumeric(sku) {
  return /^\d+$/.test(String(sku || ""));
}
function nilIfBlank(v) {
  return (v === undefined || v === null || v === "") ? null : v;
}
function intOrNull(v) {
  return (v === undefined || v === null || v === "") ? null : Number(v);
}
function rowToDto(p) {
  const images = db.prepare(`SELECT url FROM product_images WHERE product_id=? ORDER BY id DESC`).all(p.id).map(x => x.url);
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    country: p.country,
    brand: p.brand,
    price_cents: Number(p.price_cents || 0),
    cost_cents: Number(p.cost_cents || 0),
    on_hand: Number(p.on_hand || 0),
    sold: Number(p.sold || 0),
    updated_at: p.updated_at,
    images
  };
}

/* ---------- audit table for non-stock edits ---------- */
db.prepare(`
  CREATE TABLE IF NOT EXISTS product_edits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER,
    changes TEXT NOT NULL,                 -- JSON: { field: { from, to }, ... }
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

/* ---------- PUBLIC list (no auth) ---------- */
productsRouter.get("/public/products", (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const brand = String(req.query.brand || "").trim().toLowerCase();
    const country = String(req.query.country || "").trim().toLowerCase();
    const rows = db.prepare(`SELECT * FROM products ORDER BY updated_at DESC`).all();
    const filtered = rows
      .filter(p => {
        const okQ = !q || [p.sku, p.name, p.brand, p.country].some(v => (v || "").toLowerCase().includes(q));
        const okB = !brand || (p.brand || "").toLowerCase().includes(brand);
        const okC = !country || (p.country || "").toLowerCase().includes(country);
        return okQ && okB && okC;
      })
      .map(rowToDto);
    res.json(filtered);
  } catch (e) {
    console.error("public list failed:", e);
    res.status(500).json({ error: "public list failed" });
  }
});

/* ---------- AUTH required below ---------- */
productsRouter.use(requireAuth);

/* LIST (admin) */
productsRouter.get("/", (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const brand = String(req.query.brand || "").trim().toLowerCase();
    const country = String(req.query.country || "").trim().toLowerCase();
    const rows = db.prepare(`SELECT * FROM products ORDER BY updated_at DESC`).all();
    const filtered = rows
      .filter(p => {
        const okQ = !q || [p.sku, p.name, p.brand, p.country].some(v => (v || "").toLowerCase().includes(q));
        const okB = !brand || (p.brand || "").toLowerCase().includes(brand);
        const okC = !country || (p.country || "").toLowerCase().includes(country);
        return okQ && okB && okC;
      })
      .map(rowToDto);
    res.json(filtered);
  } catch (e) {
    console.error("admin list failed:", e);
    res.status(500).json({ error: "list failed" });
  }
});

/* GET one */
productsRouter.get("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = db.prepare(`SELECT * FROM products WHERE id=?`).get(id);
    if (!p) return res.status(404).json({ error: "not found" });
    res.json(rowToDto(p));
  } catch (e) {
    console.error("get product failed:", e);
    res.status(500).json({ error: "get failed" });
  }
});

/* CREATE */
productsRouter.post("/", (req, res) => {
  try {
    const { sku, name, description = "", country = "", brand = "", price, price_cents, cost, cost_cents, on_hand = 0, sold = 0 } = req.body || {};
    if (!assertSkuNumeric(sku)) return res.status(400).json({ error: "SKU must be numbers only" });
    if (!name) return res.status(400).json({ error: "name required" });

    const pCents = price_cents !== undefined ? Number(price_cents) : centsFromDisplay(price);
    const cCents = cost_cents !== undefined ? Number(cost_cents) : centsFromDisplay(cost);

    const info = db.prepare(`
      INSERT INTO products (sku,name,description,country,brand,price_cents,cost_cents,on_hand,sold,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(sku, name, description, country, brand, pCents | 0, cCents | 0, on_hand | 0, sold | 0, req.user.uid);

    const p = db.prepare(`SELECT * FROM products WHERE id=?`).get(info.lastInsertRowid);
    res.json(rowToDto(p));
  } catch (e) {
    console.error("create failed:", e);
    if (String(e.message || "").includes("UNIQUE")) return res.status(400).json({ error: "SKU already exists" });
    res.status(500).json({ error: "insert failed" });
  }
});

/* UPDATE (records edit audit if anything changed) */
productsRouter.put("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = db.prepare(`SELECT * FROM products WHERE id=?`).get(id);
    if (!current) return res.status(404).json({ error: "not found" });

    const body = req.body || {};
    if (body.sku !== undefined && !assertSkuNumeric(body.sku)) {
      return res.status(400).json({ error: "SKU must be numbers only" });
    }

    const newPrice = body.price_cents !== undefined
      ? Number(body.price_cents)
      : (body.price !== undefined ? centsFromDisplay(body.price) : current.price_cents);

    const newCost = body.cost_cents !== undefined
      ? Number(body.cost_cents)
      : (body.cost !== undefined ? centsFromDisplay(body.cost) : current.cost_cents);

    // compute next values (for diff + update)
    const next = {
      sku:        body.sku        ?? current.sku,
      name:       body.name       ?? current.name,
      description:body.description?? current.description,
      country:    body.country    ?? current.country,
      brand:      body.brand      ?? current.brand,
      price_cents: Number(newPrice) | 0,
      cost_cents:  Number(newCost)  | 0,
      on_hand:    body.on_hand    ?? current.on_hand,
      sold:       body.sold       ?? current.sold
    };

    // diff for audit
    const diff = {};
    for (const k of Object.keys(next)) {
      if (String(next[k]) !== String(current[k])) {
        diff[k] = { from: current[k], to: next[k] };
      }
    }

    // apply update (COALESCE to allow nil-if-blank on string fields)
    db.prepare(`
      UPDATE products SET
        sku=COALESCE(?,sku),
        name=COALESCE(?,name),
        description=COALESCE(?,description),
        country=COALESCE(?,country),
        brand=COALESCE(?,brand),
        price_cents=?,
        cost_cents=?,
        on_hand=COALESCE(?,on_hand),
        sold=COALESCE(?,sold),
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      nilIfBlank(body.sku),
      nilIfBlank(body.name),
      nilIfBlank(body.description),
      nilIfBlank(body.country),
      nilIfBlank(body.brand),
      next.price_cents,
      next.cost_cents,
      intOrNull(body.on_hand),
      intOrNull(body.sold),
      id
    );

    // write audit row if anything changed
    if (Object.keys(diff).length) {
      db.prepare(`
        INSERT INTO product_edits (product_id, user_id, changes)
        VALUES (?,?,?)
      `).run(id, req.user?.uid || null, JSON.stringify(diff));
    }

    const p = db.prepare(`SELECT * FROM products WHERE id=?`).get(id);
    res.json(rowToDto(p));
  } catch (e) {
    console.error("update failed:", e);
    if (String(e.message || "").includes("UNIQUE")) {
      return res.status(400).json({ error: "SKU already exists" });
    }
    res.status(500).json({ error: "update failed" });
  }
});

/* CHANGE STOCK (records movement) */
productsRouter.post("/:id/stock", (req, res) => {
  try {
    const id = Number(req.params.id);
    const { change = 0, reason = "adjust" } = req.body || {};
    if (!Number.isInteger(change) || change === 0) return res.status(400).json({ error: "invalid change" });
    const p = db.prepare(`SELECT * FROM products WHERE id=?`).get(id);
    if (!p) return res.status(404).json({ error: "not found" });

    // guard: cannot sell below zero
    if (reason === "sale" && p.on_hand + change < 0) {
      return res.status(400).json({ error: "cannot sell below 0 stock" });
    }

    const newOnHand = Math.max(0, p.on_hand + change);
    const addSold = (reason === "sale" && change < 0) ? Math.abs(change) : 0;
    const newSold = p.sold + addSold;

    const tx = db.transaction(() => {
      db.prepare(`UPDATE products SET on_hand=?, sold=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .run(newOnHand, newSold, id);
      db.prepare(`
        INSERT INTO stock_movements (product_id,user_id,change,reason)
        VALUES (?,?,?,?)
      `).run(id, req.user.uid, change, reason);
    });
    tx();

    const updated = db.prepare(`SELECT * FROM products WHERE id=?`).get(id);
    res.json(rowToDto(updated));
  } catch (e) {
    console.error("stock change failed:", e);
    res.status(500).json({ error: "stock change failed" });
  }
});

/* MOVEMENTS + EDITS (unified history) */
productsRouter.get("/:id/movements", (req, res) => {
  try {
    const id = Number(req.params.id);

    const stock = db.prepare(`
      SELECT m.id, 'stock' AS type, m.product_id, m.change, m.reason, m.reference,
             m.created_at, u.username
      FROM stock_movements m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.product_id=?
    `).all(id);

    const edits = db.prepare(`
      SELECT e.id, 'edit' AS type, e.product_id, e.changes, e.created_at, u.username
      FROM product_edits e
      LEFT JOIN users u ON u.id = e.user_id
      WHERE e.product_id=?
    `).all(id).map(r => ({ ...r, changes: JSON.parse(r.changes || "{}") }));

    const events = [...stock, ...edits].sort(
      (a,b) => new Date(b.created_at) - new Date(a.created_at)
    );

    res.json({ events });
  } catch (e) {
    console.error("movements failed:", e);
    res.status(500).json({ error: "movements failed" });
  }
});

/* IMAGE upload */
productsRouter.post("/:id/images", upload.single("file"), (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!req.file) return res.status(400).json({ error: "no file" });
    const rel = "/uploads/" + path.basename(req.file.path);
    db.prepare(`INSERT INTO product_images (product_id,url,uploaded_by) VALUES (?,?,?)`)
      .run(id, rel, req.user.uid);
    res.json({ url: rel });
  } catch (e) {
    console.error("upload failed:", e);
    res.status(500).json({ error: "upload failed" });
  }
});
