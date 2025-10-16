import React, { useEffect, useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../state/auth.jsx";
import AnimatedPage from "../components/AnimatedPage.jsx";
import BoschBackdrop from "../components/BoschBackdrop.jsx";

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
    <select className="border rounded-lg px-2 py-1 text-sm" value={value} onChange={(e)=>onChange(e.target.value)}>
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
  const [lang, setLang] = useState(localStorage.getItem("lang") || "en");
  const [currency, setCurrency] = useState(localStorage.getItem("fx") || "USD");

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
      <BoschBackdrop opacity={0.06} />
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b px-4 md:px-8 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-red-600 text-white grid place-items-center font-bold">AB</div>
        <div className="flex-1">
          <h1 className="text-lg md:text-xl font-bold">Al Buraq — Admin</h1>
          <p className="text-xs text-gray-500">Manage stock • Scan codes • Upload photos • Track sales</p>
        </div>

        <div className="flex items-center gap-2 mr-2">
          <select className="border rounded-lg px-2 py-1 text-sm" value={lang} onChange={e=>setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
          <span className="text-sm text-gray-600">Currency</span>
          <CurrencySelect value={currency} onChange={setCurrency} />
        </div>

        <nav className="flex gap-3 text-sm items-center">
          <Link className="text-blue-600" to="/dashboard">Dashboard</Link>
          <Link className="text-blue-600" to="/products">Products</Link>
          <Link className="text-blue-600 flex items-center gap-1" to="/scan" title="Open scanner">
            <span>Scan</span>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M3 7V5a2 2 0 0 1 2-2h2v2H5v2H3m16 0V5h-2V3h2a2 2 0 0 1 2 2v2h-2M3 19v-2h2v2h2v2H5a2 2 0 0 1-2-2m16 0h-2v2h2a2 2 0 0 0 2-2v-2h-2"/>
            </svg>
          </Link>
          {user?.role === "owner" && <Link className="text-blue-600" to="/owner/admins">Admins</Link>}
          <a className="text-blue-600" href="/">Public</a>
        </nav>

        <div className="text-sm text-gray-700 ml-2">{user?.username} ({user?.role})</div>
        <button className="ml-2 px-3 py-1.5 rounded-lg border" onClick={logout}>Log out</button>
      </header>

      <main className="px-4 md:px-8 py-4">
        <AnimatedPage>
          <Outlet />
        </AnimatedPage>
      </main>
    </div>
  );
}
