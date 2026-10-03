import { Outlet } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { BackToTop } from "@/components/site/BackToTop";
import { useSearch } from "@/components/SearchProvider";
import { useAccentColors, useSettingsTheme } from "@/lib/accents";

/**
 * Public site shell: sticky navbar, routed content, footer, back-to-top and
 * admin-configurable accent colours.
 */
export function SiteLayout() {
  const settings = useQuery(api.site.getSiteSettings);
  const { openSearch } = useSearch();
  useAccentColors(settings);
  useSettingsTheme(settings?.theme);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-ember px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
      >
        Skip to content
      </a>
      <Navbar onSearch={openSearch} />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
