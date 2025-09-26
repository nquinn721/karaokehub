/**
 * Date and time utilities for consistent day handling across the app
 */

export type DayOfWeek =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

/**
 * Get the current day as a DayOfWeek string
 * This ensures consistent day naming across the entire app
 */
export function getCurrentDay(): DayOfWeek {
  const today = new Date();
  const daysOfWeek: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return daysOfWeek[today.getDay()];
}

/**
 * Get all days of the week in order
 */
export function getAllDays(): DayOfWeek[] {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
}

/**
 * Format a day string for display (capitalize first letter)
 */
export function formatDayForDisplay(day: DayOfWeek): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/**
 * Check if a given day string is today
 */
export function isToday(day: DayOfWeek): boolean {
  return day === getCurrentDay();
}

/**
 * Format distance consistently across the app
 * @param distanceInMeters Distance value in meters
 */
export function formatDistance(distanceInMeters: number): string {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)}m`;
  } else if (distanceInMeters < 1609.34) {
    return `${(distanceInMeters / 1000).toFixed(2)}km`;
  } else {
    // For distances over 1 mile, show in miles
    return `${(distanceInMeters / 1609.34).toFixed(2)} miles`;
  }
}

/**
 * Convert miles to meters
 */
export function milesToMeters(miles: number): number {
  return miles * 1609.34;
}

/**
 * Convert meters to miles
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}
