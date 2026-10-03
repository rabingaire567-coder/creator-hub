import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useReducedMotion } from "framer-motion";

function animateValue(
  el: HTMLElement,
  target: number,
  decimals: number,
  durationMs: number,
) {
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = target * eased;
    el.textContent = current.toFixed(decimals);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Subtle animated counter for the statistics strip. Placeholder values like
 * "XX" are rendered as-is (no invented numbers), and animation is skipped for
 * reduced-motion users.
 */
export function StatCounter({
  value,
  suffix,
}: {
  value: string;
  suffix?: string;
}) {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.4 });
  const numRef = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  const numeric = value.replace(/,/g, "");
  const parsed = /^-?\d+(\.\d+)?$/.test(numeric) ? Number(numeric) : NaN;
  const decimals = numeric.includes(".") ? numeric.split(".")[1].length : 0;

  useEffect(() => {
    if (!inView || started || reduced || Number.isNaN(parsed)) return;
    setStarted(true);
    if (numRef.current) {
      numRef.current.textContent = "0";
      animateValue(numRef.current, parsed, decimals, 1300);
    }
  }, [inView, started, reduced, parsed, decimals]);

  return (
    <span ref={ref} className="tabular-nums">
      <span ref={numRef}>{Number.isNaN(parsed) ? value : value}</span>
      {suffix && <span className="text-ember">{suffix}</span>}
    </span>
  );
}
