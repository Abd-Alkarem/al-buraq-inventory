import React, { useEffect, useState } from "react";
import { useAuth, API } from "../state/auth.jsx";
import { useCurrency } from "../hooks/useCurrency.jsx";
import { useTranslation } from "../hooks/useTranslation.jsx";

export default function Dashboard() {
  const { token } = useAuth();
  const { formatWithSymbol } = useCurrency();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const now = new Date();
  const [period, setPeriod] = useState("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.getDate());

  useEffect(() => {
    setLoading(true);
    const params = { period };
    if (period === "year") params.year = year;
    if (period === "month") {
      params.year = year;
      params.month = month;
    }
    if (period === "day") {
      params.year = year;
      params.month = month;
      params.day = day;
    }
    
    API.getDashboardAnalytics(token, params)
      .then(setData)
      .catch(err => console.error("Analytics error:", err))
      .finally(() => setLoading(false));
  }, [token, period, year, month, day]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-400">{t('loading')}...</div>
      </div>
    );
  }

  const { summary, salesTrend, topProducts, movementsByReason } = data;
  const formatCurrency = (cents) => formatWithSymbol(cents / 100);

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="rounded-2xl border border-white/10 bg-white/70 backdrop-blur shadow-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-gray-700">{t('period')}:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition hover:border-indigo-400 focus:border-indigo-500 focus:outline-none"
          >
            <option value="day">{t('day')}</option>
            <option value="month">{t('month')}</option>
            <option value="year">{t('year')}</option>
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition hover:border-indigo-400 focus:border-indigo-500 focus:outline-none"
          >
            {[2025, 2024, 2023, 2022, 2021].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {(period === "month" || period === "day") && (
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition hover:border-indigo-400 focus:border-indigo-500 focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          )}

          {period === "day" && (
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition hover:border-indigo-400 focus:border-indigo-500 focus:outline-none"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('totalRevenue')}
          value={formatCurrency(summary.revenue)}
          icon="💰"
          gradient="from-emerald-500 to-teal-500"
        />
        <StatCard
          title={t('totalProfit')}
          value={formatCurrency(summary.profit)}
          icon="📈"
          gradient="from-violet-500 to-purple-500"
          subtitle={`${summary.profitMargin}% margin`}
        />
        <StatCard
          title={t('unitsSold')}
          value={summary.unitsSold}
          icon="🛒"
          gradient="from-blue-500 to-indigo-500"
        />
        <StatCard
          title={t('totalStock')}
          value={summary.totalStock}
          icon="📦"
          gradient="from-orange-500 to-pink-500"
          subtitle={`${summary.lowStockCount} low stock`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="rounded-2xl border border-white/10 bg-white/80 backdrop-blur shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('salesTrend')}</h3>
          {salesTrend.length > 0 ? (
            <div className="space-y-2">
              {salesTrend.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24">{item.date}</span>
                  <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-lg transition-all"
                      style={{
                        width: `${Math.min(100, (item.units / Math.max(...salesTrend.map(t => t.units))) * 100)}%`
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-12 text-right">{item.units}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">No sales data</div>
          )}
        </div>

        {/* Stock Overview */}
        <div className="rounded-2xl border border-white/10 bg-white/80 backdrop-blur shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('stockOverview')}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50">
              <div>
                <div className="text-sm text-gray-600">Total Products</div>
                <div className="text-2xl font-bold text-indigo-600">{summary.totalProducts}</div>
              </div>
              <div className="text-4xl">📊</div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50">
              <div>
                <div className="text-sm text-gray-600">In Stock</div>
                <div className="text-2xl font-bold text-emerald-600">{summary.totalStock}</div>
              </div>
              <div className="text-4xl">✅</div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-orange-50 to-red-50">
              <div>
                <div className="text-sm text-gray-600">Low Stock Alert</div>
                <div className="text-2xl font-bold text-orange-600">{summary.lowStockCount}</div>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="rounded-2xl border border-white/10 bg-white/80 backdrop-blur shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('topSellingProducts')}</h3>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((product, idx) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-white to-indigo-50 border border-indigo-100"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.sku} • {product.brand || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-indigo-600">{product.units_sold} units</div>
                    <div className="text-xs text-gray-500">{formatCurrency(product.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">No sales data</div>
          )}
        </div>

        {/* Movements by Reason */}
        <div className="rounded-2xl border border-white/10 bg-white/80 backdrop-blur shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Stock Movements</h3>
          {movementsByReason.length > 0 ? (
            <div className="space-y-3">
              {movementsByReason.map((movement, idx) => {
                const colors = {
                  sale: { bg: 'from-emerald-500 to-teal-500', icon: '🛒' },
                  purchase: { bg: 'from-blue-500 to-indigo-500', icon: '📦' },
                  adjust: { bg: 'from-orange-500 to-pink-500', icon: '⚙️' }
                };
                const color = colors[movement.reason] || { bg: 'from-gray-500 to-gray-600', icon: '📋' };
                
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color.bg} flex items-center justify-center text-2xl shadow-lg`}>
                      {color.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 capitalize">{movement.reason}</div>
                      <div className="text-sm text-gray-500">{movement.count} transactions</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-800">{movement.total_units}</div>
                      <div className="text-xs text-gray-500">units</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">No movements</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, gradient, subtitle }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/80 backdrop-blur shadow-lg p-6 group hover:shadow-xl transition-all">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2">
          <div className="text-sm font-medium text-gray-600">{title}</div>
          <div className="text-2xl">{icon}</div>
        </div>
        <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
        {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
    </div>
  );
}
