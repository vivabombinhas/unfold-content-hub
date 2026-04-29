import { useEffect, useRef } from "react";

/**
 * Adds `is-visible` class to elements with `.reveal` or `.gold-rule-animated`
 * once they enter the viewport. Triggers smooth editorial entrance.
 *
 * Pass a dependency (e.g. a query result) to re-observe when content arrives
 * after the initial render.
 */
export const useReveal = (dep?: unknown) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const els = document.querySelectorAll<HTMLElement>(".reveal, .gold-rule-animated");
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            observerRef.current?.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    els.forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
};