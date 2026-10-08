"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ initialTheme }: { initialTheme: "dark" | "light" }) {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    const syncTheme = () => setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
    window.addEventListener("agencia3d-theme-change", syncTheme);
    return () => window.removeEventListener("agencia3d-theme-change", syncTheme);
  }, []);

  function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains("light") ? "light" : "dark";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.classList.toggle("light", nextTheme === "light");
    document.cookie = `agencia3d-theme=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setTheme(nextTheme);
    window.dispatchEvent(new Event("agencia3d-theme-change"));
  }

  const Icon = theme === "dark" ? Sun : Moon;
  const label = theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro";

  return <Button variant="ghost" size="icon" className="theme-toggle" onClick={toggleTheme} aria-label={label} title={label}>
    <Icon aria-hidden="true" />
    <span className="sr-only">{label}</span>
  </Button>;
}
