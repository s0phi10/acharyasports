import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * NepalFlag — SVG rendering of the national flag of Nepal
 * (the only non-rectangular national flag in the world).
 *
 * The design follows the official 2019 geometric construction spec:
 * double-pennant crimson with blue borders, white sun + crescent moon.
 *
 * @param className Tailwind sizing/positioning classes (the SVG scales to fill).
 * @param title Optional accessible title (defaults to "Flag of Nepal").
 */
export function NepalFlag({
  className,
  title = "Flag of Nepal",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 200"
      role="img"
      aria-label={title}
      className={cn("inline-block", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {/* Blue border (double-pennant outline) */}
      <path
        d="M8 8 L232 8 L132 96 L232 184 L8 184 L108 96 Z"
        fill="#003893"
        stroke="#003893"
        strokeWidth="2"
        strokeLinejoin="miter"
      />
      {/* Crimson field */}
      <path
        d="M20 20 L210 20 L110 96 L210 172 L20 172 L120 96 Z"
        fill="#DC143C"
        stroke="none"
      />
      {/* Upper pennant: white crescent moon */}
      <g transform="translate(110, 64)" fill="#FFFFFF">
        {/* crescent: a circle minus an offset circle (using even-odd) */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M -16 0 A 16 16 0 1 0 16 0 A 12 12 0 1 1 -4 0 A 8 8 0 1 0 8 0 Z"
        />
        {/* small radiating star hint above crescent */}
        <path d="M 0 -22 L 2 -16 L 8 -14 L 2 -12 L 0 -6 L -2 -12 L -8 -14 L -2 -16 Z" />
      </g>
      {/* Lower pennant: white 12-point sun */}
      <g transform="translate(110, 132)" fill="#FFFFFF">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x = Math.cos(angle) * 20;
          const y = Math.sin(angle) * 20;
          const x2 = Math.cos(angle + 0.13) * 10;
          const y2 = Math.sin(angle + 0.13) * 10;
          return (
            <polygon
              key={i}
              points={`0,0 ${x.toFixed(2)},${y.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`}
            />
          );
        })}
        <circle cx="0" cy="0" r="9" />
      </g>
    </svg>
  );
}
