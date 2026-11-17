export function Logo({ size = 38 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-label="EASY SHOP"
      role="img"
    >
      <path d="M11 17h26l-2 25H13l-2-25Z" fill="url(#g)" />
      <path
        d="M17 18v-4a7 7 0 0 1 14 0v4"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M19 25h11M19 31h8M19 37h11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <defs>
        <linearGradient id="g" x1="10" y1="17" x2="39" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.72 0.13 195)" />
          <stop offset="1" stopColor="oklch(0.78 0.13 210)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
