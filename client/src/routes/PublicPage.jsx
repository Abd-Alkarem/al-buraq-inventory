// client/src/routes/PublicPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { API } from "../state/auth.jsx";

/* ---------------- i18n ---------------- */
const DICT = {
  en: {
    title: "Al Buraq — Bosch Parts Inventory",
    search: "Search by SKU, name, brand, or country",
    brand: "Brand",
    country: "Country",
    price: "Price",
    products: "Products",
    currency: "Currency",
    publicView: "Public view",
    name: "Name",
    noProducts: "No products",
  },
  ar: {
    title: "البراق — مخزون قطع بوش",
    search: "ابحث برقم القطعة أو الاسم أو الماركة أو الدولة",
    brand: "الماركة",
    country: "الدولة",
    price: "السعر",
    products: "المنتجات",
    currency: "العملة",
    publicView: "عرض عام",
    name: "الاسم",
    noProducts: "لا توجد منتجات",
  }
};

/* ---------------- Currencies with flags ----------------
   You can add more codes here at any time; the rate fetcher
   already handles them on demand. */
const CURRENCIES = [
  // GCC & MENA
  { code:"SAR", flag:"🇸🇦", name:"Saudi Riyal" },
  { code:"AED", flag:"🇦🇪", name:"UAE Dirham" },
  { code:"QAR", flag:"🇶🇦", name:"Qatari Riyal" },
  { code:"KWD", flag:"🇰🇼", name:"Kuwaiti Dinar" },
  { code:"BHD", flag:"🇧🇭", name:"Bahraini Dinar" },
  { code:"OMR", flag:"🇴🇲", name:"Omani Rial" },
  { code:"EGP", flag:"🇪🇬", name:"Egyptian Pound" },
  { code:"LYD", flag:"🇱🇾", name:"Libyan Dinar" },
  { code:"JOD", flag:"🇯🇴", name:"Jordanian Dinar" },
  { code:"LBP", flag:"🇱🇧", name:"Lebanese Pound" },
  { code:"MAD", flag:"🇲🇦", name:"Moroccan Dirham" },
  { code:"DZD", flag:"🇩🇿", name:"Algerian Dinar" },
  { code:"TND", flag:"🇹🇳", name:"Tunisian Dinar" },

  // Major
  { code:"USD", flag:"🇺🇸", name:"US Dollar" },
  { code:"EUR", flag:"🇪🇺", name:"Euro" },
  { code:"GBP", flag:"🇬🇧", name:"British Pound" },
  { code:"CHF", flag:"🇨🇭", name:"Swiss Franc" },
  { code:"CAD", flag:"🇨🇦", name:"Canadian Dollar" },
  { code:"AUD", flag:"🇦🇺", name:"Australian Dollar" },
  { code:"NZD", flag:"🇳🇿", name:"New Zealand Dollar" },
  { code:"JPY", flag:"🇯🇵", name:"Japanese Yen" },
  { code:"CNY", flag:"🇨🇳", name:"Chinese Yuan" },
  { code:"INR", flag:"🇮🇳", name:"Indian Rupee" },
  { code:"PKR", flag:"🇵🇰", name:"Pakistani Rupee" },
  { code:"TRY", flag:"🇹🇷", name:"Turkish Lira" },
  { code:"RUB", flag:"🇷🇺", name:"Russian Ruble" },

  // EU neighbours
  { code:"SEK", flag:"🇸🇪", name:"Swedish Krona" },
  { code:"NOK", flag:"🇳🇴", name:"Norwegian Krone" },
  { code:"DKK", flag:"🇩🇰", name:"Danish Krone" },
  { code:"PLN", flag:"🇵🇱", name:"Polish Złoty" },
  { code:"CZK", flag:"🇨🇿", name:"Czech Koruna" },
  { code:"HUF", flag:"🇭🇺", name:"Hungarian Forint" },
  { code:"RON", flag:"🇷🇴", name:"Romanian Leu" },

  // Americas
  { code:"MXN", flag:"🇲🇽", name:"Mexican Peso" },
  { code:"BRL", flag:"🇧🇷", name:"Brazilian Real" },
  { code:"ARS", flag:"🇦🇷", name:"Argentine Peso" },
  { code:"CLP", flag:"🇨🇱", name:"Chilean Peso" },
  { code:"COP", flag:"🇨🇴", name:"Colombian Peso" },

  // Asia
  { code:"KRW", flag:"🇰🇷", name:"South Korean Won" },
  { code:"HKD", flag:"🇭🇰", name:"Hong Kong Dollar" },
  { code:"SGD", flag:"🇸🇬", name:"Singapore Dollar" },
  { code:"MYR", flag:"🇲🇾", name:"Malaysian Ringgit" },
  { code:"THB", flag:"🇹🇭", name:"Thai Baht" },
  { code:"IDR", flag:"🇮🇩", name:"Indonesian Rupiah" },
  { code:"PHP", flag:"🇵🇭", name:"Philippine Peso" },

  // Africa
  { code:"NGN", flag:"🇳🇬", name:"Nigerian Naira" },
  { code:"ZAR", flag:"🇿🇦", name:"South African Rand" },
];

/* Small, reusable currency select with flags */
function CurrencySelect({ value, onChange }) {
  return (
    <select
      className="border rounded-lg px-2 py-1 text-sm"
      value={value}
      onChange={(e)=>onChange(e.target.value)}
    >
      {CURRENCIES.map(opt => (
        <option key={opt.code} value={opt.code}>
          {opt.flag} {opt.code} — {opt.name}
        </option>
      ))}
    </select>
  );
}

export default function PublicPage() {
  const [lang, setLang]   = useState(localStorage.getItem("lang") || "en");
  const [currency, setCurrency] = useState(localStorage.getItem("fx") || "USD");
  const t = DICT[lang];

  const [q,setQ] = useState("");
  const [brand,setBrand] = useState("");
  const [country,setCountry] = useState("");
  const [rows,setRows] = useState([]);

  // USD-based multipliers: amount(USD) * rates[target] -> amount(target)
  const [rates,setRates] = useState({ USD:1, SAR:3.75 });
  const [fxUpdated, setFxUpdated] = useState("");

  // Persist + set direction
  useEffect(() => {
    localStorage.setItem("lang", lang);
    document.documentElement.dir = (lang === "ar" ? "rtl" : "ltr");
  }, [lang]);
  useEffect(() => { localStorage.setItem("fx", currency); }, [currency]);

  // Load products whenever filters change
  useEffect(()=>{ API.listPublic(q,{brand,country}).then(setRows); }, [q,brand,country]);

  // First try server proxy, then public fallback
  useEffect(() => {
    (async () => {
      try {
        const fx = await API.fxLatest(); // { base, rates, updated_at }
        if (fx?.rates) {
          setRates(prev => ({ ...prev, ...fx.rates, SAR: fx.rates.SAR ?? prev.SAR ?? 3.75 }));
          setFxUpdated(fx.updated_at || "");
          return;
        }
      } catch {}
      try {
        const r = await fetch("https://api.exchangerate.host/latest?base=USD");
        const j = await r.json();
        if (j?.rates) {
          setRates(prev => ({ ...prev, ...j.rates, SAR: j.rates.SAR ?? prev.SAR ?? 3.75 }));
          setFxUpdated(new Date().toISOString());
        }
      } catch {}
    })();
  }, []);

  // If user picks a currency we don’t have yet, fetch that one on-demand
  useEffect(() => {
    (async () => {
      if (!currency || rates[currency]) return;
      try {
        const url = `https://api.exchangerate.host/latest?base=USD&symbols=${encodeURIComponent(currency)},USD,SAR`;
        const r = await fetch(url);
        const j = await r.json();
        if (j?.rates) {
          setRates(prev => ({ ...prev, ...j.rates, SAR: j.rates.SAR ?? prev.SAR ?? 3.75 }));
          if (!fxUpdated) setFxUpdated(new Date().toISOString());
        }
      } catch {}
    })();
  }, [currency, rates, fxUpdated]);

  const locale = useMemo(() => (lang === "ar" ? "ar-SA" : "en-US"), [lang]);

  const fx = (cents) => {
    const usd = Number(cents || 0) / 100;
    const rate = Number(rates[currency] || 1);
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(usd * rate);
  };

  const dir = lang==="ar" ? "rtl" : "ltr";
  const align = lang==="ar" ? "text-right" : "text-left";

  return (
    <div dir={dir} className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b px-4 md:px-8 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-red-600 text-white grid place-items-center font-bold">AB</div>
        <div className="flex-1">
          <h1 className="text-lg md:text-xl font-bold">{t.title}</h1>
          <p className="text-xs text-gray-500">{t.publicView}</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="border rounded-lg px-2 py-1 text-sm" value={lang} onChange={e=>setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
          <div className="text-sm">{t.currency}</div>
          <CurrencySelect value={currency} onChange={setCurrency} />
          <a className="text-blue-600 text-sm ml-2" href="/login">Admin</a>
        </div>
      </header>

      <main className="px-4 md:px-8 py-4">
        <div className="bg-white rounded-2xl shadow p-4 mb-3 grid gap-2 md:grid-cols-4">
          <input
            className="border rounded-xl p-2.5 md:col-span-2"
            placeholder={t.search}
            value={q}
            onChange={e=>setQ(e.target.value)}
          />
          <input className="border rounded-xl p-2.5" placeholder={t.brand} value={brand} onChange={e=>setBrand(e.target.value)} />
          <input className="border rounded-xl p-2.5" placeholder={t.country} value={country} onChange={e=>setCountry(e.target.value)} />
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className={`text-gray-600 ${align}`}>
                <th className="p-3">Image</th>
                <th className="p-3">SKU</th>
                <th className="p-3">{t.name}</th>
                <th className="p-3">{t.brand}</th>
                <th className="p-3">{t.country}</th>
                <th className="p-3">{t.price} ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    {r.images?.[0]
                      ? <img className="h-10 w-10 object-cover rounded-lg" src={`${API.base}${r.images[0]}`} alt="" />
                      : <div className="h-10 w-10 rounded-lg bg-gray-100" />}
                  </td>
                  <td className="p-3 font-mono">{r.sku}</td>
                  <td className="p-3">{r.name}</td>
                  <td className="p-3">{r.brand || "—"}</td>
                  <td className="p-3">{r.country || "—"}</td>
                  <td className="p-3">{fx(r.price_cents)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-400">{t.noProducts}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {fxUpdated && (
          <div className="text-xs text-gray-400 mt-2">
            FX updated: {new Date(fxUpdated).toLocaleString()}
          </div>
        )}
      </main>
    </div>
  );
}
