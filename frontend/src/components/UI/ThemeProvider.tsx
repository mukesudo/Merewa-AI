"use client";

import { useEffect, useState } from "react";
import useStore from "../../store/useStore";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const storageKey = "merewa-theme";
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount and handle hydration
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem(storageKey) as "light" | "dark" | "system" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, [setTheme, storageKey]);

  // Apply theme to document and persist
  useEffect(() => {
    if (!mounted) return;
    const applyTheme = (resolvedTheme: "light" | "dark") => {
      document.documentElement.setAttribute("data-theme", resolvedTheme);
      document.documentElement.style.colorScheme = resolvedTheme;
      const themeColor = resolvedTheme === "dark" ? "#08110d" : "#f4f2ec";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
    };

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme(mediaQuery.matches ? "dark" : "light");
      
      handleChange(); // Initial application
      mediaQuery.addEventListener("change", handleChange);
      
      localStorage.setItem(storageKey, "system");
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      applyTheme(theme);
      localStorage.setItem(storageKey, theme);
    }
  }, [mounted, storageKey, theme]);

  return <>{children}</>;
}
