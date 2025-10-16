// client/src/state/app.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API } from "./auth.jsx";

// minimal i18n dictionaries
const D = {
  en: {
    publicView: "Public view",
    searchPlaceholder: "Search by SKU, name, brand, or country",
    brand: "Brand",
    country: "Country",
    price: "Price",
    admins: "Admins",
    loginHistory: "Login history (latest)",
    when: "When",
    user: "User",
    ip: "IP",
    agent: "Agent",
    actions: "Actions",
    changes: "Changes",
    delete: "Delete",
    owner: "Owner",
    role: "Role",
  },
  ar: {
    publicView: "عرض عام",
    searchPlaceholder: "ابحث برقم الصنف أو الاسم أو الماركة أو الدولة",
    brand: "العلامة",
    country: "الدولة",
    price: "السعر",
    admins: "المديرون",
    loginHistory: "سجل الدخول (الأحدث)",
    when: "الوقت",
    user: "المستخدم",
    ip: "الآي بي",
    agent: "الوكيل",
    actions: "إجراءات",
    changes: "التغييرات",
    delete: "حذف",
    owner: "المالك",
    role: "الدور",
  },
};

const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const browserTZ = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const [lang, setLang] = useState(localStorage.getItem("lang") || "en");
  const [currency, setCurrency] = useState(localStorage.getItem("currency") || "USD");
  const [tz, setTz] = useState(localStorage.getItem("tz") || browserTZ);
  const [fx, setFx] = useState({ base: "USD", rates: { USD: 1 }, updated_at: null });

  // persist selections
  useEffect(() => { localStorage.setItem("lang", lang); }, [lang]);
  useEffect(() => { localStorage.setItem("currency", currency); }, [currency]);
  useEffect(() => { localStorage.setItem("tz", tz); }, [tz]);

  // RTL toggle
  useEffect(() => {
    document.documentElement.dir = (lang === "ar" ? "rtl" : "ltr");
  }, [lang]);

  // load FX rates & refresh periodically
  async function loadFx() {
    try {
      const data = await API.fxLatest(); // base USD by default
      setFx(data);
    } catch (_) {}
  }
  useEffect(() => { loadFx(); }, []);
  useEffect(() => {
    const id = setInterval(loadFx, 6 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  function t(key) {
    return (D[lang] && D[lang][key]) || (D.en[key] || key);
  }

  // cents in USD -> formatted in selected currency
  function formatCents(cents) {
    const n = (Number(cents || 0) / 100) || 0;
    const rate = fx.rates?.[currency] || 1;
    const v = n * rate; // base USD
    return new Intl.NumberFormat(lang === "ar" ? "ar" : undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(v);
  }

  const value = { lang, setLang, currency, setCurrency, tz, setTz, t, formatCents, fxUpdatedAt: fx.updated_at };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  return useContext(AppCtx);
}
