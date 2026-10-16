export type SymbolName = "shield" | "ball" | "whistle" | "flag" | "boot" | "castle";

export function GameSymbol({ name }: { name: SymbolName }) {
  if (name === "shield") {
    return (
      <svg viewBox="0 0 80 90" aria-label="Sparta-schild">
        <path d="M40 4 72 16v28c0 22-14 36-32 42C22 80 8 66 8 44V16L40 4z" fill="#8D1D2C" />
        <path d="M40 16 64 24v20c0 16-10 26-24 30C26 70 16 60 16 44V24L40 16z" fill="#F4EFE6" />
        <text x="40" y="52" textAnchor="middle" fontSize="16" fontFamily="Arial Narrow, sans-serif" fontWeight="700" fill="#8D1D2C">
          S
        </text>
      </svg>
    );
  }
  if (name === "ball") {
    return (
      <svg viewBox="0 0 80 80" aria-label="Voetbal">
        <circle cx="40" cy="40" r="30" fill="#F4EFE6" />
        <path d="M40 18 52 28 48 44H32L28 28z" fill="#202124" />
        <path d="M22 34 28 28 32 44 24 52zM58 34 52 28 48 44 56 52zM32 44h16l-4 16H36z" fill="none" stroke="#202124" strokeWidth="2" />
      </svg>
    );
  }
  if (name === "whistle") {
    return (
      <svg viewBox="0 0 80 80" aria-label="Fluit">
        <rect x="10" y="34" width="36" height="16" rx="8" fill="#F4EFE6" />
        <circle cx="52" cy="42" r="14" fill="#F4EFE6" />
        <circle cx="52" cy="42" r="5" fill="#202124" />
        <rect x="18" y="28" width="8" height="10" fill="#C4A574" />
      </svg>
    );
  }
  if (name === "flag") {
    return (
      <svg viewBox="0 0 80 80" aria-label="Vlag">
        <rect x="18" y="10" width="4" height="60" fill="#F4EFE6" />
        <path d="M22 14h36l-8 12 8 12H22z" fill="#8D1D2C" />
      </svg>
    );
  }
  if (name === "castle") {
    return (
      <svg viewBox="0 0 80 80" aria-label="Kasteel">
        <path d="M14 34h10V22h8v12h16V22h8v12h10v32H14z" fill="#8D1D2C" />
        <rect x="34" y="46" width="12" height="20" fill="#F4EFE6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 80" aria-label="Schoen">
      <path d="M14 46c8-2 16-14 22-14 8 0 10 8 18 8 8 0 14 4 14 10v6H14z" fill="#F4EFE6" />
      <path d="M18 40c6 0 8 8 8 8" stroke="#202124" strokeWidth="3" fill="none" />
    </svg>
  );
}
