"use client";

interface ScoreGaugeProps {
  score: number;
  size?: number;
  variant?: "dark" | "light";
}

export function ScoreGauge({ score, size = 160, variant = "dark" }: ScoreGaugeProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  const trackColor = variant === "dark" ? "#2a2a2a" : "#e5e7eb";
  const textColor = variant === "dark" ? "text-white" : "text-gray-900";
  const subTextColor = variant === "dark" ? "text-[#666666]" : "text-gray-400";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-4xl font-bold ${textColor}`}>{score}</span>
        <span className={`text-xs ${subTextColor}`}>/ 100</span>
      </div>
    </div>
  );
}
