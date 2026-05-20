/**
 * Centralized time formatting utilities
 * Replaces duplicated functions across Dashboard, Focus, and other pages
 */

/**
 * Formats seconds to HH:MM:SS format
 * @param seconds - Total seconds to format
 * @returns Formatted string in HH:MM:SS format
 */
export function formatSecondsToHMS(seconds: number): string {
  const totalSeconds = Math.round(Math.max(0, seconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formats minutes to HH:MM:SS format
 * @param minutes - Total minutes to format
 * @returns Formatted string in HH:MM:SS format
 */
export function formatMinutesToHMS(minutes: number): string {
  return formatSecondsToHMS(Math.round(minutes * 60));
}

/**
 * Formats hours to HH:MM:SS format
 * @param hours - Total hours to format
 * @returns Formatted string in HH:MM:SS format
 */
export function formatHoursToHMS(hours: number): string {
  return formatSecondsToHMS(Math.round(hours * 3600));
}

/**
 * Formats seconds to MM:SS format (for shorter displays)
 * @param seconds - Total seconds to format
 * @returns Formatted string in MM:SS format
 */
export function formatSecondsToMS(seconds: number): string {
  const totalSeconds = Math.round(Math.max(0, seconds));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats a duration in minutes to a human-readable string
 * @param minutes - Total minutes
 * @returns Human-readable string like "2h 30min" or "45min"
 */
export function formatDurationHuman(minutes: number): string {
  const totalMinutes = Math.round(Math.max(0, minutes));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
