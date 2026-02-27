import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  variant?: "default" | "light" | "dark";
}

const sizeConfig = {
  sm: { icon: 24, text: "text-lg", gap: "gap-2" },
  md: { icon: 28, text: "text-xl", gap: "gap-2" },
  lg: { icon: 36, text: "text-2xl", gap: "gap-2.5" },
  xl: { icon: 48, text: "text-3xl", gap: "gap-3" },
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

  const iconColor = variant === "light"
    ? "#ffffff"
    : variant === "dark"
      ? "#0a0a0a"
      : undefined;

  return (
    <div className={cn("flex items-center", config.gap, className)}>
      <svg
        width={config.icon}
        height={config.icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Minimal bar chart icon */}
        <rect
          x="4"
          y="18"
          width="6"
          height="10"
          rx="1.5"
          fill="#10b981"
        />
        <rect
          x="13"
          y="10"
          width="6"
          height="18"
          rx="1.5"
          fill="#10b981"
          opacity="0.7"
        />
        <rect
          x="22"
          y="4"
          width="6"
          height="24"
          rx="1.5"
          fill="#10b981"
          opacity="0.4"
        />
      </svg>

      {showText && (
        <span
          className={cn(
            "font-bold tracking-tight leading-none",
            config.text,
            textColor
          )}
          style={iconColor ? { color: iconColor } : undefined}
        >
          Waide
        </span>
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
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="4" y="18" width="6" height="10" rx="1.5" fill="#10b981" />
      <rect x="13" y="10" width="6" height="18" rx="1.5" fill="#10b981" opacity="0.7" />
      <rect x="22" y="4" width="6" height="24" rx="1.5" fill="#10b981" opacity="0.4" />
    </svg>
  );
}
