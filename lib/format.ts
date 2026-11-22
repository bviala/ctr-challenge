import { format } from "date-fns";

/**
 * Human-readable date/time, e.g. "Sat, Nov 22, 2026 at 9:00 AM".
 */
export function formatDateTime(value: string | Date) {
  return format(new Date(value), "EEE, MMM d, yyyy 'at' h:mm a");
}

/**
 * Human-readable date only, e.g. "Sat, Nov 22, 2026".
 */
export function formatDate(value: string | Date) {
  return format(new Date(value), "EEE, MMM d, yyyy");
}
