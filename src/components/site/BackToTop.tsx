import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Appears after scrolling down; smooth-scrolls back to the top. */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 640);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll back to top"
      className={
        "fixed right-5 bottom-5 z-40 flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition-all duration-400 hover:border-ember/50 hover:text-ember " +
        (visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0")
      }
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
