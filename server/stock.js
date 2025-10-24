// server/stock.js
import express from "express";
import db from "./db.js";
import { requireAuth } from "./auth.js";

export const stockRouter = express.Router();

// All routes require auth
stockRouter.use(requireAuth);

/* GET all products with stock levels */
stockRouter.get("/", (req, res) => {
  try {
    const products = db.prepare(`
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM stock_refills WHERE product_id = p.id) as refill_count
      FROM products p
      ORDER BY p.on_hand ASC, p.name ASC
    `).all();
    
    res.json(products.map(p => ({
      ...p,
      price: p.price_cents / 100,
      cost: p.cost_cents / 100,
      refill_count: p.refill_count || 0
    })));
  } catch (e) {
    console.error("list stock failed:", e);
    res.status(500).json({ error: "list stock failed" });
  }
});

/* GET refill history for a specific product */
stockRouter.get("/refills/:productId", (req, res) => {
  try {
    const productId = Number(req.params.productId);
    
    const refills = db.prepare(`
      SELECT 
        r.*,
        u.username,
        u.full_name,
        p.name as product_name,
        p.sku
      FROM stock_refills r
      LEFT JOIN users u ON u.id = r.created_by
      LEFT JOIN products p ON p.id = r.product_id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `).all(productId);
    
    res.json(refills);
  } catch (e) {
    console.error("get refills failed:", e);
    res.status(500).json({ error: "get refills failed" });
  }
});

/* CREATE stock refill */
stockRouter.post("/refills", (req, res) => {
  try {
    const { product_id, quantity, notes } = req.body;
    
    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: "product_id and positive quantity are required" });
    }
    
    // Get product details
    const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(product_id);
    if (!product) return res.status(404).json({ error: "product not found" });
    
    // Create refill and update stock in transaction
    const tx = db.transaction(() => {
      // Insert refill record
      const info = db.prepare(`
        INSERT INTO stock_refills (product_id, quantity, notes, created_by)
        VALUES (?, ?, ?, ?)
      `).run(product_id, quantity, notes || null, req.user.uid);
      
      // Update product stock
      db.prepare(`
        UPDATE products 
        SET on_hand = on_hand + ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(quantity, product_id);
      
      // Record stock movement
      db.prepare(`
        INSERT INTO stock_movements (product_id, user_id, change, reason, reference)
        VALUES (?, ?, ?, 'purchase', ?)
      `).run(product_id, req.user.uid, quantity, `Refill #${info.lastInsertRowid}`);
      
      return info.lastInsertRowid;
    });
    
    const refillId = tx();
    
    // Return the created refill with product details
    const refill = db.prepare(`
      SELECT 
        r.*,
        u.username,
        u.full_name,
        p.name as product_name,
        p.sku,
        p.on_hand as current_stock
      FROM stock_refills r
      LEFT JOIN users u ON u.id = r.created_by
      LEFT JOIN products p ON p.id = r.product_id
      WHERE r.id = ?
    `).get(refillId);
    
    res.json(refill);
  } catch (e) {
    console.error("create refill failed:", e);
    res.status(500).json({ error: "create refill failed" });
  }
});

/* GET stock statistics */
stockRouter.get("/stats", (req, res) => {
  try {
    const products = db.prepare(`SELECT * FROM products`).all();
    
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (p.on_hand || 0), 0);
    const lowStock = products.filter(p => (p.on_hand || 0) < 10).length;
    const outOfStock = products.filter(p => (p.on_hand || 0) === 0).length;
    
    const totalValue = products.reduce((sum, p) => {
      return sum + ((p.on_hand || 0) * (p.cost_cents || 0));
    }, 0);
    
    const recentRefills = db.prepare(`
      SELECT 
        r.*,
        u.username,
        p.name as product_name,
        p.sku
      FROM stock_refills r
      LEFT JOIN users u ON u.id = r.created_by
      LEFT JOIN products p ON p.id = r.product_id
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all();
    
    res.json({
      totalProducts,
      totalStock,
      lowStock,
      outOfStock,
      totalValue,
      recentRefills
    });
  } catch (e) {
    console.error("get stats failed:", e);
    res.status(500).json({ error: "get stats failed" });
  }
});
