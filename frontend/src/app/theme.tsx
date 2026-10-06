import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { updateUserPreferences } from "@/services/userService";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => Promise<void>;
}

const THEME_STORAGE_KEY = "namma_connect_theme";

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: async () => {},
});

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored && ["light", "dark", "system"].includes(stored)) {
      return stored;
    }
  } catch {
    // Local storage access fallback
  }
  return "system";
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(() => initialTheme || getStoredTheme());
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => getSystemTheme());

  // Listen for system OS color scheme changes
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    try {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        setSystemTheme(e.matches ? "dark" : "light");
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener("change", handleChange);
        } else if (mediaQuery.removeListener) {
          mediaQuery.removeListener(handleChange);
        }
      };
    } catch {
      // Safe fallback
    }
  }, []);

  const resolvedTheme: "light" | "dark" = theme === "system" ? systemTheme : theme;

  // Apply theme to document root element
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
    root.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore storage errors
    }

    // If authenticated, sync with backend
    const token = localStorage.getItem("nc_access_token");
    if (token) {
      try {
        await updateUserPreferences({ theme_preference: newTheme });
      } catch {
        // Safe backend sync failure fallback
      }
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
