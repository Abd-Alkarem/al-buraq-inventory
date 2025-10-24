import { useState, useEffect } from "react";
import { translations } from "../translations/translations.js";

export function useTranslation() {
  const [lang, setLang] = useState(localStorage.getItem("lang") || "en");

  useEffect(() => {
    // Listen for language changes from AppLayout
    const handleLangChange = (e) => {
      setLang(e.detail);
    };
    window.addEventListener("lang-change", handleLangChange);

    return () => window.removeEventListener("lang-change", handleLangChange);
  }, []);

  const t = (key) => {
    return translations[lang]?.[key] || translations.en[key] || key;
  };

  return { t, lang };
}
