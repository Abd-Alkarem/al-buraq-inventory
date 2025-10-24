import React, { useEffect, useState } from "react";
import { useAuth, API } from "../state/auth.jsx";
import { useTranslation } from "../hooks/useTranslation.jsx";

export default function Stock() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [showRefillForm, setShowRefillForm] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [refillHistory, setRefillHistory] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Refill form state
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 1,
    notes: ""
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    loadStock();
    loadStats();
  }, [token]);

  const loadStock = async () => {
    try {
      const data = await API.listStock(token);
      setProducts(data);
    } catch (e) {
      console.error("Failed to load stock:", e);
    }
  };

  const loadStats = async () => {
    try {
      const data = await API.getStockStats(token);
      setStats(data);
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  };

  const loadRefillHistory = async (productId) => {
    if (refillHistory[productId]) return; // Already loaded
    
    try {
      const data = await API.getProductRefills(token, productId);
      setRefillHistory(prev => ({ ...prev, [productId]: data }));
    } catch (e) {
      console.error("Failed to load refill history:", e);
    }
  };

  const toggleExpand = (productId) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
    } else {
      setExpandedProduct(productId);
      loadRefillHistory(productId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setLoading(true);

    try {
      await API.createRefill(token, {
        product_id: Number(formData.product_id),
        quantity: Number(formData.quantity),
        notes: formData.notes
      });
      
      // Reset form
      setFormData({
        product_id: "",
        quantity: 1,
        notes: ""
      });
      setShowRefillForm(false);
      loadStock();
      loadStats();
      
      // Reload refill history if expanded
      if (expandedProduct === Number(formData.product_id)) {
        setRefillHistory(prev => {
          const updated = { ...prev };
          delete updated[formData.product_id];
          return updated;
        });
        loadRefillHistory(Number(formData.product_id));
      }
    } catch (e) {
      setFormError(e.message || "Failed to create refill");
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (onHand) => {
    if (onHand === 0) return { label: "Out of Stock", color: "text-red-600 bg-red-50" };
    if (onHand < 10) return { label: "Low Stock", color: "text-orange-600 bg-orange-50" };
    return { label: "In Stock", color: "text-green-600 bg-green-50" };
  };

  const selectedProduct = products.find(p => p.id === Number(formData.product_id));

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="rounded-2xl border border-white/10 bg-white/70 backdrop-blur shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{t('stockTitle')}</h2>
            <p className="text-sm text-gray-600">{t('stockSubtitle')}</p>
          </div>
          <button
            onClick={() => setShowRefillForm(!showRefillForm)}
            className="relative overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white
                       bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500
                       shadow-lg hover:shadow-xl active:translate-y-[1px] transition-all"
          >
            {showRefillForm ? t('cancel') : t('addRefill')}
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 p-4 border border-indigo-100">
              <div className="text-sm text-gray-600">Total Products</div>
              <div className="text-2xl font-bold text-indigo-600">{stats.totalProducts}</div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 border border-emerald-100">
              <div className="text-sm text-gray-600">Total Stock</div>
              <div className="text-2xl font-bold text-emerald-600">{stats.totalStock}</div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 p-4 border border-orange-100">
              <div className="text-sm text-gray-600">Low Stock</div>
              <div className="text-2xl font-bold text-orange-600">{stats.lowStock}</div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-red-50 to-pink-50 p-4 border border-red-100">
              <div className="text-sm text-gray-600">Out of Stock</div>
              <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
            </div>
          </div>
        )}
      </div>

      {/* Refill Form */}
      {showRefillForm && (
        <div className="rounded-2xl border border-white/10 bg-white/80 backdrop-blur shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('addRefill')}</h3>
          
          {formError && (
            <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition hover:border-indigo-400 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select a product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} (Current: {p.on_hand})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition hover:border-indigo-400 focus:border-indigo-500 focus:outline-none"
                />
                {selectedProduct && (
                  <p className="text-xs text-gray-500 mt-1">
                    Current stock: {selectedProduct.on_hand} → New stock: {selectedProduct.on_hand + Number(formData.quantity)}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition hover:border-indigo-400 focus:border-indigo-500 focus:outline-none"
                placeholder="Add any notes about this refill..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Adding Refill..." : "Add Refill"}
              </button>
              <button
                type="button"
                onClick={() => setShowRefillForm(false)}
                className="rounded-xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stock List */}
      <div className="rounded-2xl border border-white/10 bg-white/80 backdrop-blur shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{t('stockTitle')}</h3>
        </div>

        {products.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No products found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr className="text-left text-gray-600">
                  <th className="p-3 w-10"></th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Brand</th>
                  <th className="p-3 text-right">On Hand</th>
                  <th className="p-3 text-right">Sold</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Refills</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const status = getStockStatus(product.on_hand);
                  const isExpanded = expandedProduct === product.id;
                  const history = refillHistory[product.id] || [];
                  
                  return (
                    <React.Fragment key={product.id}>
                      <tr className="border-t hover:bg-indigo-50/60 transition-colors">
                        <td className="p-3">
                          <button
                            onClick={() => toggleExpand(product.id)}
                            className="text-gray-500 hover:text-indigo-600 transition-colors"
                          >
                            <svg 
                              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                        <td className="p-3 font-mono text-gray-600">{product.sku}</td>
                        <td className="p-3">
                          <div className="font-medium text-gray-800">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">{product.description}</div>
                          )}
                        </td>
                        <td className="p-3 text-gray-600">{product.brand || "—"}</td>
                        <td className="p-3 text-right font-bold text-lg">{product.on_hand}</td>
                        <td className="p-3 text-right text-gray-600">{product.sold}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-medium">
                            {product.refill_count}
                          </span>
                        </td>
                      </tr>
                      
                      {/* Expandable Refill History */}
                      {isExpanded && (
                        <tr className="bg-gray-50/50">
                          <td colSpan="8" className="p-0">
                            <div className="p-4 border-t border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Refill History</h4>
                              {history.length === 0 ? (
                                <div className="text-sm text-gray-400 py-2">No refills recorded yet</div>
                              ) : (
                                <div className="space-y-2">
                                  {history.map(refill => (
                                    <div 
                                      key={refill.id}
                                      className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-emerald-600">+{refill.quantity} units</span>
                                          <span className="text-xs text-gray-500">
                                            by {refill.full_name || refill.username || 'Unknown'}
                                          </span>
                                        </div>
                                        {refill.notes && (
                                          <div className="text-xs text-gray-600 mt-1">{refill.notes}</div>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {new Date(refill.created_at).toLocaleString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
