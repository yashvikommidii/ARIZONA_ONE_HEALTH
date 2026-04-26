"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Lang, t } from "@/i18n/translations";

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  tx: (typeof t)[Lang];
};

const LangContext = createContext<LangContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "es") {
      setLang(saved);
    }
  }, []);

  const updateLang = (value: Lang) => {
    setLang(value);
    localStorage.setItem("lang", value);
  };

  return (
    <LangContext.Provider value={{ lang, setLang: updateLang, tx: t[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return ctx;
}
