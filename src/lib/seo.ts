import { useEffect } from "react";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Per-page document title + description + Open Graph tags.
 * Keeps the site shareable with correct metadata on every route.
 */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    const full = title ? `${title} — Rabin Gaire` : "Rabin Gaire";
    document.title = full;
    setMeta("property", "og:title", full);
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
    }
  }, [title, description]);
}
