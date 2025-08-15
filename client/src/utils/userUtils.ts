/**
 * Utility functions for user-related operations
 */

export interface UserDisplayNameOptions {
  name: string;
  stageName?: string;
}

/**
 * Gets the display name for a user based on stage name and full name logic
 *
 * Priority:
 * 1. Stage name (if provided)
 * 2. First name from full name (if full name has multiple words)
 * 3. Full name (if it's only one word)
 *
 * @param user - User object with name and optional stageName
 * @returns The display name to show
 */
export function getUserDisplayName(user: UserDisplayNameOptions): string {
  // If stage name is provided and not empty, use it
  if (user.stageName && user.stageName.trim()) {
    return user.stageName.trim();
  }

  // If no stage name, use first name logic
  const fullName = user.name.trim();
  const nameParts = fullName.split(/\s+/); // Split on any whitespace

  // If full name has multiple words, use the first word (first name)
  if (nameParts.length > 1) {
    return nameParts[0];
  }

  // If full name is only one word, use that word
  return fullName;
}

/**
 * Gets the real name to show in secondary text (when stage name is being used as primary)
 *
 * @param user - User object with name and optional stageName
 * @returns The real name if stage name is being used, otherwise null
 */
export function getUserSecondaryName(user: UserDisplayNameOptions): string | null {
  // Only show real name as secondary if we're displaying stage name as primary
  if (user.stageName && user.stageName.trim()) {
    return user.name.trim();
  }

  return null;
}
