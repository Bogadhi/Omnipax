/**
 * Shared INR currency formatter.
 * Use this everywhere a monetary value is displayed to the user.
 *
 * Example:
 *   formatINR(529.99)  →  "₹529.99"
 *   formatINR(1000)    →  "₹1,000.00"
 */
export function formatINR(amount: number | undefined | null): string {
  const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
