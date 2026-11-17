export const formatTZS = (n: number) =>
  `TZS ${new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(n)))}`;
