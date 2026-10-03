import { Link } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Compass } from "lucide-react";
import { usePageMeta } from "@/lib/seo";

/** Warm, on-brand 404 page. */
export function NotFound() {
  usePageMeta("Page not found");
  return (
    <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
      <div className="warm-glow pointer-events-none absolute inset-0 opacity-70" />
      <div className="grain pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-xl px-4 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-border bg-card text-ember shadow-xl">
            <Compass className="size-7" />
          </div>
          <p className="font-display mt-8 text-7xl font-semibold text-gradient-warm">
            404
          </p>
          <h1 className="font-display mt-3 text-2xl font-semibold text-foreground sm:text-3xl">
            This trail goes cold.
          </h1>
          <p className="mx-auto mt-4 max-w-md leading-relaxed text-muted-foreground">
            The page you're looking for doesn't exist or has moved on to new
            stories. Let's get you back to exploring.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_-16px_var(--ember)] transition-all hover:-translate-y-0.5 hover:brightness-110"
            >
              <ArrowLeft className="size-4" />
              Back home
            </Link>
            <Link
              to="/content"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-ember/50 hover:text-ember"
            >
              Browse content
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default NotFound;
