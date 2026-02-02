import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  variant?: "default" | "light" | "dark";
}

const sizeConfig = {
  sm: { icon: 28, text: "text-lg", gap: "gap-2" },
  md: { icon: 36, text: "text-xl", gap: "gap-2.5" },
  lg: { icon: 48, text: "text-2xl", gap: "gap-3" },
  xl: { icon: 64, text: "text-3xl", gap: "gap-4" },
};

export function Logo({
  className,
  size = "md",
  showText = true,
  variant = "default",
}: LogoProps) {
  const config = sizeConfig[size];
  
  const textColor = variant === "light" 
    ? "text-white" 
    : variant === "dark" 
      ? "text-slate-900" 
      : "text-slate-900 dark:text-white";

  return (
    <div className={cn("flex items-center", config.gap, className)}>
      {/* Tuxedo W Logo - Collar & Bow Tie forming W */}
      <svg
        width={config.icon}
        height={config.icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Background circle */}
        <circle 
          cx="32" 
          cy="32" 
          r="30" 
          className={cn(
            variant === "light" ? "fill-white/10" : "fill-slate-900 dark:fill-slate-800"
          )}
        />
        
        {/* Left collar - forms left part of W */}
        <path
          d="M16 18 L24 50 L32 32"
          className={cn(
            variant === "light" ? "stroke-white" : "stroke-white dark:stroke-slate-100"
          )}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Right collar - forms right part of W */}
        <path
          d="M48 18 L40 50 L32 32"
          className={cn(
            variant === "light" ? "stroke-white" : "stroke-white dark:stroke-slate-100"
          )}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Bow tie center - gold accent */}
        <g className="fill-amber-500">
          {/* Left bow */}
          <path d="M24 24 L32 28 L32 20 Z" />
          {/* Right bow */}
          <path d="M40 24 L32 28 L32 20 Z" />
          {/* Center knot */}
          <circle cx="32" cy="24" r="3" />
        </g>
        
        {/* Subtle collar detail lines */}
        <path
          d="M20 22 L26 48"
          className="stroke-amber-500/30"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M44 22 L38 48"
          className="stroke-amber-500/30"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>

      {/* Brand Name */}
      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              "font-bold tracking-tight leading-none",
              config.text,
              textColor
            )}
          >
            Waide
          </span>
          {size !== "sm" && (
            <span
              className={cn(
                "text-xs tracking-wider uppercase",
                variant === "light"
                  ? "text-white/60"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              AI Hospitality Aide
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Icon-only version for compact spaces
export function LogoIcon({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="32" cy="32" r="30" className="fill-slate-900 dark:fill-slate-800" />
      <path
        d="M16 18 L24 50 L32 32"
        className="stroke-white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M48 18 L40 50 L32 32"
        className="stroke-white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <g className="fill-amber-500">
        <path d="M24 24 L32 28 L32 20 Z" />
        <path d="M40 24 L32 28 L32 20 Z" />
        <circle cx="32" cy="24" r="3" />
      </g>
    </svg>
  );
}
