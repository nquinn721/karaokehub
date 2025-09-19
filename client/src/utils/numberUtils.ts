/**
 * Utility functions for handling number conversions from database fields
 * MySQL decimal fields can sometimes be returned as strings, so we need to ensure proper number conversion
 */

/**
 * Safely converts a value to a number, handling both numbers and string representations
 * @param value - The value to convert (can be number, string, or undefined)
 * @param defaultValue - Default value to return if conversion fails (default: 0)
 * @returns The converted number
 */
export function toNumber(value: any, defaultValue: number = 0): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  return defaultValue;
}

/**
 * Safely formats a price value to a currency string
 * @param value - The price value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted price string
 */
export function formatPrice(value: any, decimals: number = 2): string {
  return toNumber(value).toFixed(decimals);
}

/**
 * Safely formats a number for display with locale-appropriate thousands separators
 * @param value - The value to format
 * @returns Formatted number string
 */
export function formatNumber(value: any): string {
  return toNumber(value).toLocaleString();
}

/**
 * Safely checks if a value is greater than another, handling type conversion
 * @param value - The value to check
 * @param threshold - The threshold to compare against
 * @returns Boolean result of comparison
 */
export function isGreaterThan(value: any, threshold: number): boolean {
  return toNumber(value) > threshold;
}

/**
 * Safely performs arithmetic operations, handling type conversion
 * @param a - First operand
 * @param b - Second operand
 * @returns The sum as a number
 */
export function safeAdd(a: any, b: any): number {
  return toNumber(a) + toNumber(b);
}

/**
 * Safely performs subtraction, handling type conversion
 * @param a - First operand
 * @param b - Second operand
 * @returns The difference as a number
 */
export function safeSubtract(a: any, b: any): number {
  return toNumber(a) - toNumber(b);
}
