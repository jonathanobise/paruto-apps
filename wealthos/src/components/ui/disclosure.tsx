"use client";
import { useState, type ReactNode } from "react";

/** <details> whose initial state comes from the server but is then controlled by the user (survives re-renders). */
export function Disclosure({ defaultOpen, summary, children, className }: { defaultOpen: boolean; summary: ReactNode; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className={`group ${className ?? ""}`}>
      {summary}
      {children}
    </details>
  );
}
