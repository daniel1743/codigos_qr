import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_POWER_EDITOR_LOCALE,
  POWER_EDITOR_LOCALE_STORAGE_KEY,
  isPowerEditorLocale,
  powerEditorMessages,
  type PowerEditorLocale,
  type PowerEditorMessages,
} from "./messages";

interface PowerEditorLocaleContextValue {
  locale: PowerEditorLocale;
  messages: PowerEditorMessages;
  setLocale: (locale: PowerEditorLocale) => void;
}

const PowerEditorLocaleContext = createContext<PowerEditorLocaleContextValue | null>(null);

function readStoredLocale(): PowerEditorLocale {
  if (typeof window === "undefined") return DEFAULT_POWER_EDITOR_LOCALE;
  const stored = window.localStorage.getItem(POWER_EDITOR_LOCALE_STORAGE_KEY);
  return isPowerEditorLocale(stored) ? stored : DEFAULT_POWER_EDITOR_LOCALE;
}

export function PowerEditorLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<PowerEditorLocale>(() => readStoredLocale());

  const setLocale = (nextLocale: PowerEditorLocale) => {
    setLocaleState(nextLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(POWER_EDITOR_LOCALE_STORAGE_KEY, nextLocale);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(POWER_EDITOR_LOCALE_STORAGE_KEY, locale);
    }
  }, [locale]);

  const value = useMemo<PowerEditorLocaleContextValue>(
    () => ({ locale, messages: powerEditorMessages[locale], setLocale }),
    [locale],
  );

  return (
    <PowerEditorLocaleContext.Provider value={value}>
      {children}
    </PowerEditorLocaleContext.Provider>
  );
}

export function usePowerEditorLocale(): PowerEditorLocaleContextValue {
  const context = useContext(PowerEditorLocaleContext);
  if (!context) {
    return {
      locale: DEFAULT_POWER_EDITOR_LOCALE,
      messages: powerEditorMessages[DEFAULT_POWER_EDITOR_LOCALE],
      setLocale: () => undefined,
    };
  }
  return context;
}
