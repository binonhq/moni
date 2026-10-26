import { cn } from "@/lib/utils";
export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("brand", className)}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path
            d="M7 24V13a4 4 0 0 1 8 0v8-8a4 4 0 0 1 8 0v11"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <circle cx="25" cy="7" r="2.3" fill="currentColor" />
        </svg>
      </span>
      {!compact && (
        <span>
          moni<span className="brand-period">.</span>
        </span>
      )}
    </span>
  );
}
