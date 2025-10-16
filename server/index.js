// server/index.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

import "./db.js";                // ensure DB/tables/seed
import { authRouter } from "./auth.js";
import { productsRouter } from "./products.js";
import { adminRouter } from "./owner_admin.js";
import { fxRouter } from "./fx.js";   // live currency rates

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ------------ CORS: allow explicit list + any local dev origins ------------ */
const ORIGINS = (process.env.CORS_ORIGIN ||
  "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// allow localhost / 127.0.0.1 / 0.0.0.0 / any LAN IPv4 with any port
const allowAllLocal = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|(\d{1,3}\.){3}\d{1,3})(:\d+)?$/.test(origin || "");

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                 // curl/Postman/no origin
    if (ORIGINS.includes(origin) || allowAllLocal(origin)) {
      return cb(null, true);
    }
    cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.options("*", cors());

/* ------------ Static: /uploads (for images) ------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ------------ Health ------------ */
app.get("/", (_req, res) => res.json({ ok: true, service: "al-buraq-api" }));

/* ------------ Routers ------------ */
app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);   // admin + public endpoints live here
app.use("/api/owner", adminRouter);         // owner-only tools
app.use("/api/fx", fxRouter);               // live currency rates

/* ------------ Start ------------ */
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`API http://localhost:${PORT}`));
