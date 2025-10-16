// server/db.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// If you want a custom location, set DB_FILE in .env; otherwise use server/al_buraq.db
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "al_buraq.db");

// Ensure the directory for the DB exists (fixes “directory does not exist”)
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---------- schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  full_name TEXT,
  is_owner INTEGER DEFAULT 0,
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  country TEXT,
  brand TEXT,
  price_cents INTEGER DEFAULT 0,
  cost_cents  INTEGER DEFAULT 0,
  on_hand INTEGER DEFAULT 0,
  sold INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  created_by INTEGER
);

/* IMPORTANT:
   The previous AFTER UPDATE trigger updated the same row again,
   which causes recursive updates in SQLite. We manage updated_at
   in the app code instead, so DO NOT create that trigger. */

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  uploaded_by INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER,
  change INTEGER NOT NULL,
  reason TEXT,         -- "sale","purchase","adjust"
  reference TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS login_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  ip TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  note_date TEXT NOT NULL,   -- YYYY-MM-DD
  body TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// ---------- seed ----------
const haveRoles = db.prepare("SELECT COUNT(*) AS c FROM roles").get().c;
if (!haveRoles) {
  db.prepare("INSERT INTO roles(name) VALUES (?),(?)").run("owner", "admin");
}

const haveOwner = db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_owner=1").get().c;
if (!haveOwner) {
  const ownerRole = db.prepare("SELECT id FROM roles WHERE name='owner'").get().id;
  const adminRole = db.prepare("SELECT id FROM roles WHERE name='admin'").get().id;

  const ownerHash = bcrypt.hashSync("owner123", 10);
  const adminHash = bcrypt.hashSync("demo", 10);

  db.prepare(`
    INSERT INTO users (username,password_hash,role_id,full_name,is_owner)
    VALUES (?,?,?,?,1)
  `).run("owner", ownerHash, ownerRole, "Store Owner");

  db.prepare(`
    INSERT INTO users (username,password_hash,role_id,full_name,is_owner)
    VALUES (?,?,?,?,0)
  `).run("admin", adminHash, adminRole, "Admin");

  console.log("Seeded owner → username: owner / password: owner123");
  console.log("Seeded admin  → username: admin / password: demo");
}

export default db;
