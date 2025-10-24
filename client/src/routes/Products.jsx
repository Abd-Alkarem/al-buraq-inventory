import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, API } from "../state/auth.jsx";
import { useCurrency } from "../hooks/useCurrency.jsx";
import { useTranslation } from "../hooks/useTranslation.jsx";

export default function Products() {
  const { token } = useAuth();
  const { formatWithSymbol } = useCurrency();
  const { t } = useTranslation();
  const [q,setQ] = useState("");
  const [brand,setBrand] = useState("");
  const [country,setCountry] = useState("");
  const [rows,setRows] = useState([]);
  const [deleting,setDeleting] = useState(null);

  useEffect(()=>{
    API.listProducts(token, q, { brand, country }).then(setRows);
  }, [token,q,brand,country]);

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete product "${product.name}" (SKU: ${product.sku})?\n\nThis will permanently remove the product and all its history.`)) {
      return;
    }
    setDeleting(product.id);
    try {
      await API.deleteProduct(token, product.id);
      setRows(rows.filter(r => r.id !== product.id));
    } catch (e) {
      alert("Failed to delete product: " + e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      {/* Search / actions panel (frosted card look) */}
      <div
        className="rounded-2xl border border-white/10 bg-white/70 backdrop-blur
                   shadow-[0_12px_40px_-16px_rgba(2,6,23,.35)] p-4 mb-4"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex-1 grid gap-2 md:grid-cols-3">
            <input
              className="border rounded-xl p-2.5 bg-white/80 hover:bg-white transition"
              placeholder={t('searchProducts')}
              value={q}
              onChange={e=>setQ(e.target.value)}
            />
            <input
              className="border rounded-xl p-2.5 bg-white/80 hover:bg-white transition"
              placeholder={t('brand')}
              value={brand}
              onChange={e=>setBrand(e.target.value)}
            />
            <input
              className="border rounded-xl p-2.5 bg-white/80 hover:bg-white transition"
              placeholder={t('country')}
              value={country}
              onChange={e=>setCountry(e.target.value)}
            />
          </div>

          <Link
            to="/products/new"
            className="ml-auto relative overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white
                       bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500
                       shadow-[0_12px_40px_-12px_rgba(99,102,241,.55)]
                       hover:shadow-[0_18px_50px_-12px_rgba(168,85,247,.6)]
                       active:translate-y-[1px] transition-all"
          >
            <span className="relative z-10">{t('newProduct')}</span>
            <span className="pointer-events-none absolute inset-0 opacity-30 blur-2xl bg-white"></span>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/80 backdrop-blur shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50/80">
            <tr className="text-left text-gray-600">
              <th className="p-3">Image</th>
              <th className="p-3">{t('sku')}</th>
              <th className="p-3">{t('name')}</th>
              <th className="p-3">{t('brand')}</th>
              <th className="p-3">{t('country')}</th>
              <th className="p-3 text-right">{t('onHand')}</th>
              <th className="p-3 text-right">{t('sold')}</th>
              <th className="p-3">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr
                key={r.id}
                className="border-t hover:bg-indigo-50/60 transition-colors"
              >
                <td className="p-3">
                  {r.images?.[0]
                    ? <img className="h-10 w-10 object-cover rounded-lg shadow-sm" src={`${API.base}${r.images[0]}`} alt="" />
                    : <div className="h-10 w-10 rounded-lg bg-gray-100" />}
                </td>
                <td className="p-3 font-mono">{r.sku}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.brand || "—"}</td>
                <td className="p-3">{r.country || "—"}</td>
                <td className="p-3 text-right">{r.on_hand}</td>
                <td className="p-3 text-right">{r.sold}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <Link
                      className="inline-block rounded-lg border px-3 py-1.5 text-sm
                                 hover:border-indigo-400 hover:text-indigo-600
                                 transition-colors"
                      to={`/products/${r.id}`}
                    >
                      {t('edit')}
                    </Link>
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={deleting === r.id}
                      className="inline-block rounded-lg border border-red-300 px-3 py-1.5 text-sm
                                 text-red-600 hover:border-red-500 hover:bg-red-50
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 transition-colors"
                    >
                      {deleting === r.id ? t('deleting') : t('delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="p-6 text-center text-gray-400" colSpan={8}>
                  {t('noProducts')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
