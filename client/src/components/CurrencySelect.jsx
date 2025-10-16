// client/src/components/CurrencySelect.jsx
import React from "react";

/** Big, practical list of ISO currency codes + a representative flag emoji.
 *  (Not every currency has a single country; these are conventional pairings.)
 */
export const CURRENCIES = [
  { code: "USD", flag: "🇺🇸" }, // US Dollar
  { code: "EUR", flag: "🇪🇺" }, // Euro Area
  { code: "GBP", flag: "🇬🇧" },
  { code: "SAR", flag: "🇸🇦" },
  { code: "AED", flag: "🇦🇪" },
  { code: "QAR", flag: "🇶🇦" },
  { code: "KWD", flag: "🇰🇼" },
  { code: "BHD", flag: "🇧🇭" },
  { code: "OMR", flag: "🇴🇲" },
  { code: "JOD", flag: "🇯🇴" },
  { code: "EGP", flag: "🇪🇬" },
  { code: "TRY", flag: "🇹🇷" },
  { code: "INR", flag: "🇮🇳" },
  { code: "PKR", flag: "🇵🇰" },
  { code: "LKR", flag: "🇱🇰" },
  { code: "BDT", flag: "🇧🇩" },
  { code: "CNY", flag: "🇨🇳" },
  { code: "HKD", flag: "🇭🇰" },
  { code: "JPY", flag: "🇯🇵" },
  { code: "KRW", flag: "🇰🇷" },
  { code: "SGD", flag: "🇸🇬" },
  { code: "MYR", flag: "🇲🇾" },
  { code: "IDR", flag: "🇮🇩" },
  { code: "THB", flag: "🇹🇭" },
  { code: "VND", flag: "🇻🇳" },
  { code: "AUD", flag: "🇦🇺" },
  { code: "NZD", flag: "🇳🇿" },
  { code: "CAD", flag: "🇨🇦" },
  { code: "CHF", flag: "🇨🇭" },
  { code: "SEK", flag: "🇸🇪" },
  { code: "NOK", flag: "🇳🇴" },
  { code: "DKK", flag: "🇩🇰" },
  { code: "PLN", flag: "🇵🇱" },
  { code: "CZK", flag: "🇨🇿" },
  { code: "HUF", flag: "🇭🇺" },
  { code: "RON", flag: "🇷🇴" },
  { code: "ZAR", flag: "🇿🇦" },
  { code: "NGN", flag: "🇳🇬" },
  { code: "BRL", flag: "🇧🇷" },
  { code: "MXN", flag: "🇲🇽" },
  { code: "ARS", flag: "🇦🇷" },
  { code: "CLP", flag: "🇨🇱" },
  { code: "COP", flag: "🇨🇴" },
  { code: "PEN", flag: "🇵🇪" },
  { code: "ILS", flag: "🇮🇱" },
  { code: "MAD", flag: "🇲🇦" },
  { code: "TND", flag: "🇹🇳" },
  { code: "RUB", flag: "🇷🇺" },
  { code: "UAH", flag: "🇺🇦" },
];

export default function CurrencySelect({ value, onChange, className }) {
  return (
    <select
      className={className || "border rounded-lg px-2 py-1 text-sm"}
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        // Persist + broadcast to other components/tabs
        localStorage.setItem("fx", val);
        window.dispatchEvent(new CustomEvent("fx-change", { detail: val }));
        onChange?.(val);
      }}
    >
      {CURRENCIES.map(({ code, flag }) => (
        <option key={code} value={code}>
          {flag} {code}
        </option>
      ))}
    </select>
  );
}
