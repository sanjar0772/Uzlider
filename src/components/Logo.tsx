"use client";

/**
 * Uzlider brand logo.
 *
 * A clean, geometric mark — a forward-leaning chevron built from a road/
 * container silhouette — that reads as motion and logistics rather than a
 * cartoon truck. Renders crisp at any size and adapts to light/dark.
 */

export function LogoMark({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Uzlider"
    >
      <defs>
        <linearGradient id="uz-logo-g" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#598cff" />
          <stop offset="0.55" stopColor="#2547e0" />
          <stop offset="1" stopColor="#1e37b5" />
        </linearGradient>
      </defs>
      {/* Rounded square plate */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#uz-logo-g)" />
      {/* Speed / road chevrons pointing forward */}
      <path
        d="M13 30.5 L21.5 16 h6.2 L19.2 30.5 Z"
        fill="#ffffff"
        fillOpacity="0.95"
      />
      <path
        d="M22.5 30.5 L31 16 h6.2 L28.7 30.5 Z"
        fill="#ffffff"
        fillOpacity="0.6"
      />
      {/* Baseline road */}
      <rect x="12" y="34" width="24" height="3.2" rx="1.6" fill="#ffffff" fillOpacity="0.9" />
    </svg>
  );
}

export default function Logo({
  size = 36,
  showText = true,
  subtitle = "TMS",
  className = "",
}: {
  size?: number;
  showText?: boolean;
  subtitle?: string | null;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="shrink-0 drop-shadow-sm" />
      {showText && (
        <div className="leading-none">
          <div className="text-[1.15em] font-extrabold tracking-tight text-slate-900 dark:text-white">
            Uzlider
          </div>
          {subtitle && (
            <div className="mt-0.5 text-[0.62em] font-semibold uppercase tracking-[0.22em] text-brand-500 dark:text-brand-400">
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
