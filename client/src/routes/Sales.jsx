import React, { useEffect, useState } from "react";
import { useAuth, API } from "../state/auth.jsx";
import { useCurrency } from "../hooks/useCurrency.jsx";
import { useTranslation } from "../hooks/useTranslation.jsx";

export default function Sales() {
  const { token } = useAuth();
  const { formatWithSymbol } = useCurrency();
  const { t } = useTranslation();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 1,
    buyer_name: "",
    buyer_phone: "",
    buyer_email: "",
    buyer_address: ""
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    loadSales();
    loadProducts();
  }, [token]);

  const loadSales = async () => {
    try {
      const data = await API.listSales(token);
      setSales(data);
    } catch (e) {
      console.error("Failed to load sales:", e);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await API.listProducts(token);
      setProducts(data);
    } catch (e) {
      console.error("Failed to load products:", e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setLoading(true);

    try {
      await API.createSale(token, {
        ...formData,
        product_id: Number(formData.product_id),
        quantity: Number(formData.quantity)
      });
      
      // Reset form
      setFormData({
        product_id: "",
        quantity: 1,
        buyer_name: "",
        buyer_phone: "",
        buyer_email: "",
        buyer_address: ""
      });
      setShowForm(false);
      loadSales();
    } catch (e) {
      setFormError(e.message || "Failed to create sale");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sale) => {
    if (!window.confirm(`Delete sale #${sale.id} for ${sale.product_name}?\n\nThis will restore ${sale.quantity} units to stock.`)) {
      return;
    }
    
    setDeleting(sale.id);
    try {
      await API.deleteSale(token, sale.id);
      loadSales();
    } catch (e) {
      alert("Failed to delete sale: " + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleExport = async (saleId) => {
    try {
      const response = await fetch(`${API.base}/api/sales/${saleId}/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${saleId}-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert('Failed to export receipt: ' + e.message);
    }
  };

  const selectedProduct = products.find(p => p.id === Number(formData.product_id));
  const formatCurrency = (cents) => formatWithSymbol(cents / 100);

  // Filter sales based on search query
  const filteredSales = sales.filter(sale => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sale.id.toString().includes(query) ||
      sale.product_name.toLowerCase().includes(query) ||
      sale.sku.toLowerCase().includes(query) ||
      sale.buyer_name.toLowerCase().includes(query) ||
      (sale.buyer_phone && sale.buyer_phone.toLowerCase().includes(query)) ||
      (sale.buyer_email && sale.buyer_email.toLowerCase().includes(query)) ||
      (sale.brand && sale.brand.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-white/70 backdrop-blur shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{t('salesTitle')}</h2>
            <p className="text-sm text-gray-600">{t('salesSubtitle')}</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="relative overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white
                       bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500
                       shadow-lg hover:shadow-xl active:translate-y-[1px] transition-all"
          >
            {showForm ? t('cancel') : t('newSale')}
          </button>
        </div>
      </div>

      {/* Sale Form */}
      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-white/80 backdrop-blur shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('newSale')}</h3>
          
          {formError && (
            <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product Selection */}
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
                      {p.sku} - {p.name} (Stock: {p.on_hand})
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
                  max={selectedProduct?.on_hand || 999}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition hover:border-indigo-400 focus:border-indigo-500 focus:outline-none"
                />
                {selectedProduct && (
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {selectedProduct.on_hand} | Price: {formatCurrency(selectedProduct.price_cents)} each
                  </p>
                )}
              </div>
            </div>

            {/* Sale Summary */}
            {selectedProduct && formData.quantity > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 p-4 border border-indigo-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {formatCurrency(selectedProduct.price_cents * formData.quantity)}
                  </span>
                </div>
              </div>
            )}

            {/* Buyer Details */}
            <div className="border-t pt-4">
              <h4 className="text-md font-semibold text-gray-700 mb-3">Buyer Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buyer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.buyer_name}
                    onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition hover:border-indigo-400 focus:border-indigo-500 focus:outline-none"
                    placeholder="Enter buyer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.buyer_phone}
                    onChange={(e) => setFormData({ ...formData, buyer_phone: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition hover:border-indigo-400 focus:border-indigo-500 focus:outline-none"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.buyer_email}
                    onChange={(e) => setFormData({ ...formData, buyer_email: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition hover:border-indigo-400 focus:border-indigo-500 focus:outline-none"
                    placeholder="buyer@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.buyer_address}
                    onChange={(e) => setFormData({ ...formData, buyer_address: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition hover:border-indigo-400 focus:border-indigo-500 focus:outline-none"
                    placeholder="123 Main St, City, Country"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Creating Sale..." : "Create Sale"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sales List */}
      <div className="rounded-2xl border border-white/10 bg-white/80 backdrop-blur shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-800">{t('salesHistory')}</h3>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchSales')}
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm transition hover:border-indigo-400 focus:border-indigo-500 focus:outline-none"
                />
                <svg 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {searchQuery && (
            <p className="text-xs text-gray-500 mt-2">
              Found {filteredSales.length} of {sales.length} sales
            </p>
          )}
        </div>

        {sales.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No sales recorded yet. Create your first sale above!
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No sales found matching "{searchQuery}"
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr className="text-left text-gray-600">
                  <th className="p-3">Sale #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Buyer</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="border-t hover:bg-indigo-50/60 transition-colors">
                    <td className="p-3 font-mono text-indigo-600">#{sale.id}</td>
                    <td className="p-3 text-xs text-gray-500">
                      {new Date(sale.created_at).toLocaleDateString()}<br />
                      {new Date(sale.created_at).toLocaleTimeString()}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-gray-800">{sale.product_name}</div>
                      <div className="text-xs text-gray-500">{sale.sku} • {sale.brand || 'N/A'}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-gray-800">{sale.buyer_name}</div>
                      {sale.buyer_phone && <div className="text-xs text-gray-500">{sale.buyer_phone}</div>}
                    </td>
                    <td className="p-3 text-right font-medium">{sale.quantity}</td>
                    <td className="p-3 text-right">{formatWithSymbol(sale.unit_price)}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">{formatWithSymbol(sale.total)}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExport(sale.id)}
                          className="inline-block rounded-lg border border-indigo-300 px-3 py-1.5 text-sm text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                        >
                          📥 Export
                        </button>
                        <button
                          onClick={() => handleDelete(sale)}
                          disabled={deleting === sale.id}
                          className="inline-block rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:border-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {deleting === sale.id ? "..." : "🗑️"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
