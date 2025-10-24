import React, { useEffect, useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../state/auth.jsx";
import AnimatedPage from "../components/AnimatedPage.jsx";
import BoschBackdrop from "../components/BoschBackdrop.jsx";
import Calculator from "../components/Calculator.jsx";
import { useTranslation } from "../hooks/useTranslation.jsx";

/* ---- Currencies with flags (unchanged list, styled render) ---- */
const CURRENCIES = [
  { code:"SAR", flag:"🇸🇦", name:"Saudi Riyal" },
  { code:"AED", flag:"🇦🇪", name:"UAE Dirham" },
  { code:"QAR", flag:"🇶🇦", name:"Qatari Riyal" },
  { code:"KWD", flag:"🇰🇼", name:"Kuwaiti Dinar" },
  { code:"BHD", flag:"🇧🇭", name:"Bahraini Dinar" },
  { code:"OMR", flag:"🇴🇲", name:"Omani Rial" },
  { code:"EGP", flag:"🇪🇬", name:"Egyptian Pound" },
  { code:"LYD", flag:"🇱🇾", name:"Libyan Dinar" },
  { code:"JOD", flag:"🇯🇴", name:"Jordanian Dinar" },
  { code:"MAD", flag:"🇲🇦", name:"Moroccan Dirham" },
  { code:"USD", flag:"🇺🇸", name:"US Dollar" },
  { code:"EUR", flag:"🇪🇺", name:"Euro" },
  { code:"GBP", flag:"🇬🇧", name:"British Pound" },
  { code:"CAD", flag:"🇨🇦", name:"Canadian Dollar" },
  { code:"AUD", flag:"🇦🇺", name:"Australian Dollar" },
  { code:"JPY", flag:"🇯🇵", name:"Japanese Yen" },
  { code:"PKR", flag:"🇵🇰", name:"Pakistani Rupee" },
  { code:"INR", flag:"🇮🇳", name:"Indian Rupee" },
  { code:"CNY", flag:"🇨🇳", name:"Chinese Yuan" },
  { code:"TRY", flag:"🇹🇷", name:"Turkish Lira" },
  { code:"ZAR", flag:"🇿🇦", name:"South African Rand" },
];

function CurrencySelect({ value, onChange }) {
  return (
    <select
      className="border rounded-lg px-2 py-1 text-sm bg-white/70 backdrop-blur hover:bg-white/90 transition"
      value={value}
      onChange={(e)=>onChange(e.target.value)}
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {CURRENCIES.map(opt => (
        <option key={opt.code} value={opt.code}>
          {opt.flag} {opt.code} — {opt.name}
        </option>
      ))}
    </select>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [lang, setLang] = useState(localStorage.getItem("lang") || "en");
  const [currency, setCurrency] = useState(localStorage.getItem("fx") || "USD");
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    localStorage.setItem("lang", lang);
    document.documentElement.dir = (lang === "ar" ? "rtl" : "ltr");
    window.dispatchEvent(new CustomEvent("lang-change", { detail: lang }));
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("fx", currency);
    window.dispatchEvent(new CustomEvent("fx-change", { detail: currency }));
  }, [currency]);

  return (
    <div className="min-h-screen relative">
      {/* animated star/gear backdrop */}
      <BoschBackdrop opacity={0.06} />

      {/* frosted, glowing header */}
      <header
        className="sticky top-0 z-20 border-b border-white/10 bg-white/60 backdrop-blur
                   shadow-[0_10px_30px_-12px_rgba(2,6,23,.35)]"
      >
        <div className="px-4 md:px-8 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-red-600 text-white grid place-items-center font-bold shadow-md">AB</div>

          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-bold">Al Buraq — Admin</h1>
            <p className="text-xs text-gray-500">Manage stock • Scan codes • Upload photos • Track sales</p>
          </div>

          {/* global controls */}
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <select
              className="border rounded-lg px-2 py-1 text-sm bg-white/70 backdrop-blur hover:bg-white/90 transition"
              value={lang}
              onChange={e=>setLang(e.target.value)}
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
            <span className="text-sm text-gray-600">{t('currency')}</span>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>

          {/* nav with “pill” links */}
          <nav className="hidden md:flex gap-1 text-sm items-center">
            <Link className="px-3 py-1.5 rounded-lg text-blue-700 hover:bg-blue-600/10 transition" to="/dashboard">{t('dashboard')}</Link>
            <Link className="px-3 py-1.5 rounded-lg text-blue-700 hover:bg-blue-600/10 transition" to="/products">{t('products')}</Link>
            <Link className="px-3 py-1.5 rounded-lg text-blue-700 hover:bg-blue-600/10 transition" to="/sales">{t('sales')}</Link>
            <Link className="px-3 py-1.5 rounded-lg text-blue-700 hover:bg-blue-600/10 transition" to="/stock">{t('stock')}</Link>
            {user?.role === "owner" && (
              <Link className="px-3 py-1.5 rounded-lg text-blue-700 hover:bg-blue-600/10 transition" to="/owner/admins">
                {t('admins')}
              </Link>
            )}
            <a className="px-3 py-1.5 rounded-lg text-blue-700 hover:bg-blue-600/10 transition" href="/">{t('public')}</a>
          </nav>

          {/* Calculator Button */}
          <button
            onClick={() => setShowCalculator(true)}
            className="ml-2 p-2 rounded-lg border bg-white/70 hover:bg-white/90 transition shadow-sm"
            title="Calculator"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>

          <div className="ml-2 hidden sm:block text-sm text-gray-700">
            {user?.username} ({user?.role})
          </div>

          <button
            className="ml-2 px-3 py-1.5 rounded-lg border bg-white/70 hover:bg-white/90 transition shadow-sm"
            onClick={logout}
          >
            {t('logout')}
          </button>
        </div>
      </header>

      <main className="px-4 md:px-8 py-4">
        {/* subtle entrance animation wrapper */}
        <AnimatedPage>
          <Outlet />
        </AnimatedPage>
      </main>

      {/* Calculator Modal */}
      <Calculator isOpen={showCalculator} onClose={() => setShowCalculator(false)} />
    </div>
  );
}
