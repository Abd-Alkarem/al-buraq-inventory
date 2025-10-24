// server/sales.js
import express from "express";
import db from "./db.js";
import { requireAuth } from "./auth.js";
import ExcelJS from "exceljs";

export const salesRouter = express.Router();

// All routes require auth
salesRouter.use(requireAuth);

/* LIST all sales */
salesRouter.get("/", (req, res) => {
  try {
    const sales = db.prepare(`
      SELECT 
        s.*,
        p.sku,
        p.name as product_name,
        p.brand,
        u.username as created_by_username
      FROM sales s
      JOIN products p ON p.id = s.product_id
      LEFT JOIN users u ON u.id = s.created_by
      ORDER BY s.created_at DESC
    `).all();
    
    res.json(sales.map(s => ({
      ...s,
      unit_price: s.unit_price_cents / 100,
      total: s.total_cents / 100
    })));
  } catch (e) {
    console.error("list sales failed:", e);
    res.status(500).json({ error: "list sales failed" });
  }
});

/* GET one sale */
salesRouter.get("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const sale = db.prepare(`
      SELECT 
        s.*,
        p.sku,
        p.name as product_name,
        p.brand,
        p.country,
        u.username as created_by_username
      FROM sales s
      JOIN products p ON p.id = s.product_id
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.id = ?
    `).get(id);
    
    if (!sale) return res.status(404).json({ error: "sale not found" });
    
    res.json({
      ...sale,
      unit_price: sale.unit_price_cents / 100,
      total: sale.total_cents / 100
    });
  } catch (e) {
    console.error("get sale failed:", e);
    res.status(500).json({ error: "get sale failed" });
  }
});

/* CREATE new sale */
salesRouter.post("/", (req, res) => {
  try {
    const { product_id, quantity, buyer_name, buyer_phone, buyer_email, buyer_address } = req.body;
    
    if (!product_id || !quantity || !buyer_name) {
      return res.status(400).json({ error: "product_id, quantity, and buyer_name are required" });
    }
    
    // Get product details
    const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(product_id);
    if (!product) return res.status(404).json({ error: "product not found" });
    
    // Check stock availability
    if (product.on_hand < quantity) {
      return res.status(400).json({ error: `Insufficient stock. Available: ${product.on_hand}` });
    }
    
    const unit_price_cents = product.price_cents;
    const total_cents = unit_price_cents * quantity;
    
    // Create sale and update stock in transaction
    const tx = db.transaction(() => {
      // Insert sale
      const info = db.prepare(`
        INSERT INTO sales (
          product_id, quantity, unit_price_cents, total_cents,
          buyer_name, buyer_phone, buyer_email, buyer_address, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        product_id, quantity, unit_price_cents, total_cents,
        buyer_name, buyer_phone || null, buyer_email || null, buyer_address || null,
        req.user.uid
      );
      
      // Update product stock
      db.prepare(`
        UPDATE products 
        SET on_hand = on_hand - ?, sold = sold + ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(quantity, quantity, product_id);
      
      // Record stock movement
      db.prepare(`
        INSERT INTO stock_movements (product_id, user_id, change, reason, reference)
        VALUES (?, ?, ?, 'sale', ?)
      `).run(product_id, req.user.uid, -quantity, `Sale #${info.lastInsertRowid}`);
      
      return info.lastInsertRowid;
    });
    
    const saleId = tx();
    
    // Return the created sale
    const sale = db.prepare(`
      SELECT 
        s.*,
        p.sku,
        p.name as product_name,
        p.brand
      FROM sales s
      JOIN products p ON p.id = s.product_id
      WHERE s.id = ?
    `).get(saleId);
    
    res.json({
      ...sale,
      unit_price: sale.unit_price_cents / 100,
      total: sale.total_cents / 100
    });
  } catch (e) {
    console.error("create sale failed:", e);
    res.status(500).json({ error: "create sale failed" });
  }
});

/* DELETE sale (and restore stock) */
salesRouter.delete("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const sale = db.prepare(`SELECT * FROM sales WHERE id = ?`).get(id);
    
    if (!sale) return res.status(404).json({ error: "sale not found" });
    
    // Delete sale and restore stock in transaction
    const tx = db.transaction(() => {
      // Restore stock
      db.prepare(`
        UPDATE products 
        SET on_hand = on_hand + ?, sold = sold - ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(sale.quantity, sale.quantity, sale.product_id);
      
      // Record stock movement
      db.prepare(`
        INSERT INTO stock_movements (product_id, user_id, change, reason, reference)
        VALUES (?, ?, ?, 'adjust', ?)
      `).run(sale.product_id, req.user.uid, sale.quantity, `Sale #${id} deleted`);
      
      // Delete sale
      db.prepare(`DELETE FROM sales WHERE id = ?`).run(id);
    });
    
    tx();
    
    res.json({ success: true, message: "Sale deleted and stock restored" });
  } catch (e) {
    console.error("delete sale failed:", e);
    res.status(500).json({ error: "delete sale failed" });
  }
});

/* EXPORT sale receipt as Excel */
salesRouter.get("/:id/export", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const sale = db.prepare(`
      SELECT 
        s.*,
        p.sku,
        p.name as product_name,
        p.brand,
        p.country,
        p.description,
        u.username as created_by_username,
        u.full_name as created_by_fullname
      FROM sales s
      JOIN products p ON p.id = s.product_id
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.id = ?
    `).get(id);
    
    if (!sale) return res.status(404).json({ error: "sale not found" });
    
    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Receipt');
    
    // Set column widths
    worksheet.columns = [
      { width: 20 },
      { width: 40 }
    ];
    
    // Header styling
    const headerStyle = {
      font: { bold: true, size: 16, color: { argb: 'FF4F46E5' } },
      alignment: { vertical: 'middle', horizontal: 'left' }
    };
    
    const labelStyle = {
      font: { bold: true, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
    };
    
    // Title
    worksheet.mergeCells('A1:B1');
    worksheet.getCell('A1').value = 'SALES RECEIPT';
    worksheet.getCell('A1').style = headerStyle;
    worksheet.getRow(1).height = 30;
    
    // Sale Info
    worksheet.addRow([]);
    worksheet.addRow(['Receipt #:', `#${sale.id}`]);
    worksheet.addRow(['Date:', new Date(sale.created_at).toLocaleString()]);
    worksheet.addRow(['Sold By:', sale.created_by_fullname || sale.created_by_username || 'N/A']);
    
    // Product Details
    worksheet.addRow([]);
    const productHeaderRow = worksheet.addRow(['PRODUCT DETAILS', '']);
    productHeaderRow.getCell(1).style = labelStyle;
    productHeaderRow.getCell(2).style = labelStyle;
    
    worksheet.addRow(['SKU:', sale.sku]);
    worksheet.addRow(['Product Name:', sale.product_name]);
    worksheet.addRow(['Brand:', sale.brand || 'N/A']);
    worksheet.addRow(['Country:', sale.country || 'N/A']);
    if (sale.description) {
      worksheet.addRow(['Description:', sale.description]);
    }
    
    // Sale Details
    worksheet.addRow([]);
    const saleHeaderRow = worksheet.addRow(['SALE DETAILS', '']);
    saleHeaderRow.getCell(1).style = labelStyle;
    saleHeaderRow.getCell(2).style = labelStyle;
    
    worksheet.addRow(['Quantity:', sale.quantity]);
    worksheet.addRow(['Unit Price:', `$${(sale.unit_price_cents / 100).toFixed(2)}`]);
    
    const totalRow = worksheet.addRow(['TOTAL:', `$${(sale.total_cents / 100).toFixed(2)}`]);
    totalRow.font = { bold: true, size: 14 };
    totalRow.getCell(2).font = { bold: true, size: 14, color: { argb: 'FF059669' } };
    
    // Buyer Details
    worksheet.addRow([]);
    const buyerHeaderRow = worksheet.addRow(['BUYER DETAILS', '']);
    buyerHeaderRow.getCell(1).style = labelStyle;
    buyerHeaderRow.getCell(2).style = labelStyle;
    
    worksheet.addRow(['Name:', sale.buyer_name]);
    if (sale.buyer_phone) worksheet.addRow(['Phone:', sale.buyer_phone]);
    if (sale.buyer_email) worksheet.addRow(['Email:', sale.buyer_email]);
    if (sale.buyer_address) worksheet.addRow(['Address:', sale.buyer_address]);
    
    // Footer
    worksheet.addRow([]);
    worksheet.addRow([]);
    const footerRow = worksheet.addRow(['Thank you for your business!', '']);
    worksheet.mergeCells(footerRow.number, 1, footerRow.number, 2);
    footerRow.getCell(1).alignment = { horizontal: 'center' };
    footerRow.getCell(1).font = { italic: true, color: { argb: 'FF6B7280' } };
    
    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=receipt-${id}-${Date.now()}.xlsx`
    );
    
    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("export receipt failed:", e);
    res.status(500).json({ error: "export receipt failed" });
  }
});
