/**
 * Get the display name for a user
 * Prioritizes username (custom pseudo) over name
 */
export function getDisplayName(user: { username?: string | null; name: string }): string {
  return user.username || user.name;
}

/**
 * Get the display name from user object (can have name or firstName)
 * Handles both full user objects and partial objects
 */
export function getUserDisplayName(user: {
  username?: string | null;
  name?: string;
  firstName?: string;
  email?: string;
}): string {
  return user.username || user.name || user.firstName || user.email?.split('@')[0] || 'Utilisateur';
}

/**
 * Get the avatar URL for a user
 * Returns the user's avatar or a default Gravatar-style avatar
 */
export function getAvatarUrl(user: { avatar?: string | null; email: string }): string {
  if (user.avatar) {
    return user.avatar;
  }

  // Generate a simple default avatar based on email hash
  // You could also use services like ui-avatars.com or Gravatar
  const hash = Math.abs(hashCode(user.email));
  const colors = [
    'EF4444', // red
    'F59E0B', // amber
    '10B981', // emerald
    '3B82F6', // blue
    '8B5CF6', // purple
    'EC4899', // pink
    '06B6D4', // cyan
  ];
  const color = colors[hash % colors.length];

  // Use ui-avatars.com for default avatars
  const initials = user.email.charAt(0).toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color}&color=fff&size=128&bold=true`;
}

/**
 * Simple hash function for strings
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}
