// server/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "./db.js";

export const authRouter = express.Router();

function getUserByUsername(username) {
  if (!username || typeof username !== "string") return null;
  return db.prepare(`
    SELECT u.*, r.name AS role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.username = ?
  `).get(username);
}

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "no token" });
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.user = data;
    next();
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
}

export function requireRole(roleName) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "no token" });
    if (req.user.role === "owner") return next();
    if (req.user.role !== roleName) return res.status(403).json({ error: "forbidden" });
    next();
  };
}

// POST /api/auth/login
authRouter.post("/login", (req,res)=>{
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }

  const u = getUserByUsername(username);
  if (!u) return res.status(401).json({ error: "Invalid credentials" });

  if (!bcrypt.compareSync(password, u.password_hash || "")) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  db.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?").run(u.id);
  db.prepare(`
    INSERT INTO login_history (user_id, ip, user_agent)
    VALUES (?, ?, ?)
  `).run(
    u.id,
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
    req.headers["user-agent"] || ""
  );

  const token = jwt.sign(
    { uid: u.id, username: u.username, role: u.role, is_owner: !!u.is_owner },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );

  res.json({ token, user: { id: u.id, username: u.username, role: u.role, is_owner: !!u.is_owner } });
});
