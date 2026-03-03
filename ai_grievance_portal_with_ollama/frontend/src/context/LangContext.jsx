import React, { createContext, useContext, useState, useCallback } from "react";

export const LangContext = createContext(null);

export function LangProvider({ children, initialLang = "en", translations = {} }) {
  const [lang, setLang] = useState(initialLang);

  // default translations fallback
  const defaultTranslations = {
    en: {
      title: "Karnataka Grievance Portal",
      welcome: "Welcome",
      logout: "Logout",
      openDashboard: "Open Dashboard",
      yourTickets: "Your Tickets",
    },
  };

  const allTranslations = Object.assign({}, defaultTranslations, translations);

  const t = useCallback(
    (key, fallback) => {
      if (!key) return "";
      const bundle = allTranslations[lang] || {};
      return bundle[key] || fallback || key;
    },
    [lang, allTranslations]
  );

  const handleLangChange = (e) => {
    const val = e?.target?.value || e;
    setLang(val);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t, handleLangChange }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => {
  const ctx = useContext(LangContext);
  // safe fallback
  if (!ctx) {
    return {
      lang: "en",
      setLang: () => {},
      t: (k, f) => (f || k),
      handleLangChange: () => {},
    };
  }
  return ctx;
};
