import { useState, useEffect } from "react";

export function useCurrency() {
  const [currency, setCurrency] = useState(localStorage.getItem("fx") || "USD");
  const [rates, setRates] = useState({ USD: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for currency changes from AppLayout
    const handleCurrencyChange = (e) => {
      setCurrency(e.detail);
    };
    window.addEventListener("fx-change", handleCurrencyChange);

    // Load exchange rates
    loadRates();

    return () => window.removeEventListener("fx-change", handleCurrencyChange);
  }, []);

  const loadRates = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:8000"}/api/fx/latest`);
      const data = await response.json();
      setRates(data.rates || { USD: 1 });
    } catch (e) {
      console.error("Failed to load exchange rates:", e);
      setRates({ USD: 1, SAR: 3.75 }); // Fallback
    } finally {
      setLoading(false);
    }
  };

  const convert = (amountUSD) => {
    if (!amountUSD || isNaN(amountUSD)) return 0;
    const rate = rates[currency] || 1;
    return amountUSD * rate;
  };

  const format = (amountUSD, showCurrency = true) => {
    const converted = convert(amountUSD);
    const formatted = converted.toFixed(2);
    return showCurrency ? `${formatted} ${currency}` : formatted;
  };

  const formatWithSymbol = (amountUSD) => {
    const symbols = {
      USD: "$", SAR: "﷼", AED: "د.إ", QAR: "﷼", KWD: "د.ك",
      BHD: "د.ب", OMR: "﷼", EGP: "£", LYD: "ل.د", JOD: "د.ا",
      MAD: "د.م.", EUR: "€", GBP: "£", CAD: "C$", AUD: "A$", JPY: "¥",
      PKR: "₨", INR: "₹", CNY: "¥", TRY: "₺", ZAR: "R"
    };
    const symbol = symbols[currency] || currency;
    const converted = convert(amountUSD);
    return `${symbol}${converted.toFixed(2)}`;
  };

  return {
    currency,
    rates,
    loading,
    convert,
    format,
    formatWithSymbol
  };
}
