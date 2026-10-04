import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "padellic-theme",
  ...props
}: ThemeProviderProps) {
  // FIX: Safely check for 'window' to prevent 500 crashes during SSR
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

useEffect(() => {
    const root = window.document.documentElement;
    
    // 1. Remove both classes to start clean every time it runs
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      const applySystemTheme = (e: MediaQueryList | MediaQueryListEvent) => {
        root.classList.remove("light", "dark");
        if (e.matches) {
          root.classList.add("dark");
        } else {
          root.classList.add("light");
        }
      };

      // Apply immediately
      applySystemTheme(mediaQuery);

      // Listen for system changes (e.g., user changes OS theme while app is open)
      mediaQuery.addEventListener("change", applySystemTheme);
      return () => mediaQuery.removeEventListener("change", applySystemTheme);
    }

    // 2. If it's not system, explicitly add "light" or "dark" based on the state
    root.classList.add(theme);

    return undefined;
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, theme);
      }
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
