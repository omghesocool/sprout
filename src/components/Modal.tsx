"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Minimal accessible dialog: Escape closes, focus moves in, clicking the scrim closes. */
export function Modal({
  label,
  onClose,
  variant = "sheet",
  children,
}: {
  label: string;
  onClose: () => void;
  variant?: "sheet" | "dialog";
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div className={`scrim ${variant === "dialog" ? "centered" : ""}`} onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={variant === "dialog" ? "dialog" : "sheet"}
        onClick={(e) => e.stopPropagation()}
        style={{ outline: "none" }}
      >
        {children}
      </div>
    </div>
  );
}
