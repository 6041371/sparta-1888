"use client";

import type { ReactNode } from "react";

export function Button({
  children,
  onClick,
  type = "button",
  kind = "primary",
  disabled,
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  kind?: "primary" | "ghost" | "dark" | "paper" | "warn";
  disabled?: boolean;
  full?: boolean;
}) {
  return (
    <button type={type} className={`btn ${kind}${full ? " full" : ""}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  textarea,
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  textarea?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {textarea ? (
        <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

export function Banner({ children, tone = "warn" }: { children: ReactNode; tone?: "warn" | "danger" | "ok" | "paper" }) {
  return <div className={`banner ${tone === "warn" ? "" : tone}`.trim()}>{children}</div>;
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={title}>
      <div className="paper modal stack">
        <h2 className="display">{title}</h2>
        {children}
        <Button kind="dark" onClick={onClose}>
          Sluiten
        </Button>
      </div>
    </div>
  );
}

export function Loading({ label = "Laden…" }: { label?: string }) {
  return (
    <div className="center">
      <div className="spin" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
