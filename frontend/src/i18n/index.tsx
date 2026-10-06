import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import enTranslations from "./locales/en.json";
import knTranslations from "./locales/kn.json";
import hiTranslations from "./locales/hi.json";
import { updateUserPreferences } from "@/services/userService";

export type Language = "en" | "kn" | "hi";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LANGUAGE_STORAGE_KEY = "namma_connect_language";

const translations: Record<Language, any> = {
  en: enTranslations,
  kn: knTranslations,
  hi: hiTranslations,
};

export function translateKey(
  lang: Language = "en",
  key: string,
  params?: Record<string, string | number>
): string {
  const keys = key.split(".");
  let val: any = translations[lang] || translations["en"];

  for (const k of keys) {
    if (val && typeof val === "object" && k in val) {
      val = val[k];
    } else {
      val = undefined;
      break;
    }
  }

  if (val === undefined) {
    let fallbackVal: any = translations["en"];
    for (const k of keys) {
      if (fallbackVal && typeof fallbackVal === "object" && k in fallbackVal) {
        fallbackVal = fallbackVal[k];
      } else {
        fallbackVal = key;
        break;
      }
    }
    val = fallbackVal;
  }

  if (typeof val !== "string") {
    return key;
  }

  if (params) {
    return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
      const doubleBraceRegex = new RegExp(`{{\\s*${paramKey}\\s*}}`, "g");
      const singleBraceRegex = new RegExp(`{\\s*${paramKey}\\s*}`, "g");
      return str
        .replace(doubleBraceRegex, String(paramVal))
        .replace(singleBraceRegex, String(paramVal));
    }, val);
  }

  return val;
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: async () => {},
  t: (key: string, params?: Record<string, string | number>) => translateKey("en", key, params),
});

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "kn" || stored === "hi" || stored === "en") {
      return stored as Language;
    }
  } catch {
    // Local storage access fallback
  }
  return "en";
}

export function I18nProvider({
  children,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(() => initialLanguage || getStoredLanguage());

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback(async (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch {
      // Storage fallback
    }

    // If authenticated, sync with backend
    const token = typeof window !== "undefined" ? localStorage.getItem("nc_access_token") : null;
    if (token) {
      try {
        await updateUserPreferences({ language: newLang });
      } catch {
        // Backend sync failure fallback
      }
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      return translateKey(language, key, params);
    },
    [language]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useTranslation = () => useContext(I18nContext);
export const useLanguage = () => useContext(I18nContext);
