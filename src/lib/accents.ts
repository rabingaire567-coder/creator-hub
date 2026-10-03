import { useEffect } from "react";
import { useTheme } from "next-themes";

interface AccentSource {
  accent1?: string;
  accent2?: string;
  accent3?: string;
  accent4?: string;
  accent5?: string;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Applies the admin-configurable warm accent colours to the document root so
 * the whole product (public site + dashboard) restyles instantly. Invalid or
 * missing values keep the current theme colours.
 */
export function useAccentColors(settings: AccentSource | undefined) {
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    const map: Array<[keyof AccentSource, string]> = [
      ["accent1", "--ember"],
      ["accent2", "--gold"],
      ["accent3", "--clay"],
      ["accent4", "--sage"],
      ["accent5", "--dusk"],
    ];
    for (const [key, cssVar] of map) {
      const value = settings[key];
      if (typeof value === "string" && HEX.test(value)) {
        root.style.setProperty(cssVar, value);
      }
    }
    return () => {
      for (const [, cssVar] of map) root.style.removeProperty(cssVar);
    };
  }, [settings]);
}

/**
 * Applies the admin-configured default theme — but only while the visitor
 * hasn't picked one themselves (next-themes persists that choice), so the
 * site-wide setting never stomps a personal preference.
 */
export function useSettingsTheme(theme: string | undefined) {
  const { setTheme } = useTheme();
  useEffect(() => {
    if (theme !== "dark" && theme !== "light" && theme !== "system") return;
    try {
      if (window.localStorage.getItem("theme")) return;
    } catch {
      // storage unavailable — applying the default is fine
    }
    setTheme(theme);
  }, [theme, setTheme]);
}
