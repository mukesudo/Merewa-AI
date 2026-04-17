"use client";

import { useEffect, useState } from "react";
import useStore from "../../store/useStore";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount and handle hydration
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("merewa-theme") as "light" | "dark" | "system" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, [setTheme]);

  // Apply theme to document and persist
  useEffect(() => {
    if (!mounted) return;
    const applyTheme = (resolvedTheme: "light" | "dark") => {
      document.documentElement.setAttribute("data-theme", resolvedTheme);
      // Update meta theme-color for mobile browsers
      const themeColor = resolvedTheme === "dark" ? "#0F0D15" : "#fcfbf7";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
    };

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme(mediaQuery.matches ? "dark" : "light");
      
      handleChange(); // Initial application
      mediaQuery.addEventListener("change", handleChange);
      
      localStorage.setItem("merewa-theme", "system");
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      applyTheme(theme);
      localStorage.setItem("merewa-theme", theme);
    }
  }, [theme]);

  return <>{children}</>;
}
