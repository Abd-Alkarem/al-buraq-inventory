// server/owner_admin.js
import express from "express";
import bcrypt from "bcryptjs";
import db from "./db.js";
import { requireAuth, requireRole } from "./auth.js";

export const adminRouter = express.Router();

/* ---------- Ensure tables exist (idempotent) ---------- */
db.prepare(`
  CREATE TABLE IF NOT EXISTS admin_permissions (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    can_edit_products INTEGER DEFAULT 1,
    can_adjust_stock INTEGER DEFAULT 1,
    can_upload_images INTEGER DEFAULT 1,
    can_view_audit INTEGER DEFAULT 1
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    ip TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS store_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`).run();

/* ---------- Settings helpers ---------- */
function getSetting(key, defaultVal = null) {
  const row = db.prepare("SELECT value FROM store_settings WHERE key=?").get(key);
  return row ? row.value : defaultVal;
}
function setSetting(key, value) {
  db.prepare(`
    INSERT INTO store_settings(key, value) VALUES(?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(key, value);
}

/* ---------- Owner-only access ---------- */
adminRouter.use(requireAuth, requireRole("owner"));

/* ---------- USERS + PERMISSIONS ---------- */
adminRouter.get("/users", (_req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.is_owner, r.name as role,
           ap.can_edit_products, ap.can_adjust_stock, ap.can_upload_images, ap.can_view_audit
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN admin_permissions ap ON ap.user_id = u.id
    ORDER BY u.is_owner DESC, u.username ASC
  `).all();
  res.json(users);
});

adminRouter.post("/users", (req, res) => {
  const { username, password, role = "admin", full_name = "" } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "username & password required" });
  const roleRow = db.prepare("SELECT id FROM roles WHERE name=?").get(role);
  if (!roleRow) return res.status(400).json({ error: "invalid role" });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare("INSERT INTO users (username,password_hash,role_id,full_name,is_owner) VALUES (?,?,?,?,0)")
      .run(username, hash, roleRow.id, full_name);
    db.prepare("INSERT INTO admin_permissions (user_id) VALUES (?)").run(info.lastInsertRowid);
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    if (String(e.message || "").includes("UNIQUE")) {
      return res.status(400).json({ error: "username already exists" });
    }
    res.status(500).json({ error: "create failed" });
  }
});

adminRouter.put("/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const target = db.prepare("SELECT * FROM users WHERE id=?").get(id);
  if (!target) return res.status(404).json({ error: "not found" });
  if (target.is_owner) return res.status(400).json({ error: "cannot modify owner record" });

  const { full_name, role, password, perms } = req.body || {};
  if (role) {
    const roleRow = db.prepare("SELECT id FROM roles WHERE name=?").get(role);
    if (!roleRow) return res.status(400).json({ error: "invalid role" });
    db.prepare("UPDATE users SET role_id=? WHERE id=?").run(roleRow.id, id);
  }
  if (typeof full_name === "string") db.prepare("UPDATE users SET full_name=? WHERE id=?").run(full_name, id);
  if (typeof password === "string" && password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(hash, id);
  }
  if (perms && typeof perms === "object") {
    const def = db.prepare("SELECT * FROM admin_permissions WHERE user_id=?").get(id);
    if (!def) db.prepare("INSERT INTO admin_permissions (user_id) VALUES (?)").run(id);
    db.prepare(`
      UPDATE admin_permissions
      SET can_edit_products=COALESCE(?,can_edit_products),
          can_adjust_stock=COALESCE(?,can_adjust_stock),
          can_upload_images=COALESCE(?,can_upload_images),
          can_view_audit=COALESCE(?,can_view_audit)
      WHERE user_id=?
    `).run(perms.can_edit_products, perms.can_adjust_stock, perms.can_upload_images, perms.can_view_audit, id);
  }
  res.json({ ok: true });
});

/* ---------- DELETE USER (detach FKs first) ---------- */
adminRouter.delete("/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const me = req.user?.uid;
  const target = db.prepare("SELECT * FROM users WHERE id=?").get(id);
  if (!target) return res.status(404).json({ error: "not found" });
  if (target.is_owner) return res.status(400).json({ error: "cannot delete owner" });
  if (target.id === me) return res.status(400).json({ error: "cannot delete yourself" });

  try {
    const tx = db.transaction(() => {
      // Detach dependent rows so FK constraints don't block deletion
      db.prepare("UPDATE login_history   SET user_id=NULL WHERE user_id=?").run(id);
      db.prepare("UPDATE stock_movements SET user_id=NULL WHERE user_id=?").run(id);
      db.prepare("UPDATE product_images  SET uploaded_by=NULL WHERE uploaded_by=?").run(id);
      // Finally delete the user
      db.prepare("DELETE FROM users WHERE id=?").run(id);
    });
    tx();
    res.json({ ok: true });
  } catch (e) {
    console.error("delete user failed:", e);
    res.status(500).json({ error: "delete failed" });
  }
});

/* ---------- LOGIN HISTORY ---------- */
adminRouter.get("/logins", (_req, res) => {
  const rows = db.prepare(`
    SELECT lh.id, lh.user_id, u.username, u.full_name, lh.ip, lh.user_agent, lh.created_at
    FROM login_history lh
    LEFT JOIN users u ON u.id = lh.user_id
    ORDER BY lh.id DESC
    LIMIT 1000
  `).all();
  res.json(rows);
});

adminRouter.get("/logins/:userId", (req, res) => {
  const uid = Number(req.params.userId);
  const rows = db.prepare(`
    SELECT lh.id, lh.user_id, u.username, u.full_name, lh.ip, lh.user_agent, lh.created_at
    FROM login_history lh
    LEFT JOIN users u ON u.id = lh.user_id
    WHERE lh.user_id=?
    ORDER BY lh.id DESC
    LIMIT 1000
  `).all(uid);
  res.json(rows);
});

/* ---------- Activity: stock movements by user ---------- */
adminRouter.get("/users/:id/changes", (req, res) => {
  const id = Number(req.params.id);
  const user = db.prepare(`SELECT id, username FROM users WHERE id=?`).get(id);
  if (!user) return res.status(404).json({ error: "not found" });

  const rows = db.prepare(`
    SELECT
      m.id, m.product_id, p.sku, p.name AS product_name,
      m.change, m.reason, m.created_at
    FROM stock_movements m
    LEFT JOIN products p ON p.id = m.product_id
    WHERE m.user_id=?
    ORDER BY m.id DESC
    LIMIT 500
  `).all(id);

  res.json({ user, rows });
});

/* ---------- STORE SETTINGS ---------- */
adminRouter.get("/settings", (_req, res) => {
  const pinHash = getSetting("store_pin_hash", "");
  const defaultCurrency = getSetting("default_currency", "USD");
  const fxFallbackSAR = getSetting("fx_fallback_SAR", "3.75");
  res.json({
    default_currency: defaultCurrency,
    store_pin_present: !!pinHash,
    fx_fallback_SAR: Number(fxFallbackSAR) || 3.75
  });
});

adminRouter.put("/settings", (req, res) => {
  const { store_pin, clear_pin, default_currency, fx_fallback_SAR } = req.body || {};

  if (clear_pin) {
    setSetting("store_pin_hash", "");
  } else if (typeof store_pin === "string" && store_pin) {
    const hash = bcrypt.hashSync(store_pin, 10);
    setSetting("store_pin_hash", hash);
  }

  if (typeof default_currency === "string" && default_currency) {
    setSetting("default_currency", default_currency.toUpperCase());
  }

  if (fx_fallback_SAR !== undefined) {
    const n = Number(fx_fallback_SAR);
    if (isFinite(n) && n > 0) setSetting("fx_fallback_SAR", String(n));
  }

  const pinHash = getSetting("store_pin_hash", "");
  res.json({
    ok: true,
    default_currency: getSetting("default_currency", "USD"),
    store_pin_present: !!pinHash,
    fx_fallback_SAR: Number(getSetting("fx_fallback_SAR", "3.75")) || 3.75
  });
});

export default adminRouter;
