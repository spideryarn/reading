import { formatDistanceToNow, format } from 'date-fns';

/**
 * Date formatting utilities for consistent user-facing date display across the application.
 * 
 * Provides human-readable relative dates with unambiguous absolute dates in tooltips.
 * 
 * @see docs/reference/DATE_FORMATTING_POLICY.md for formatting guidelines
 */

export interface DateDisplayProps {
  /** Human-readable relative date (e.g., "2 days ago", "yesterday") */
  relative: string;
  /** Unambiguous absolute date for tooltips (e.g., "2025-Jun-28 14:30") */
  absolute: string;
  /** ISO date string for accessibility and screen readers */
  iso: string;
}

/**
 * Format a date for user display with relative time and absolute tooltip.
 * 
 * @param date - Date to format (Date object, ISO string, or timestamp)
 * @returns Object with relative display text and absolute tooltip text
 * 
 * @example
 * ```tsx
 * const { relative, absolute, iso } = formatUserDate(document.created_at);
 * 
 * return (
 *   <time dateTime={iso} title={absolute}>
 *     {relative}
 *   </time>
 * );
 * ```
 */
export function formatUserDate(date: Date | string | number): DateDisplayProps {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date provided: ${date}`);
  }
  
  return {
    relative: formatDistanceToNow(dateObj, { addSuffix: true }),
    absolute: format(dateObj, 'yyyy-MMM-dd HH:mm'),
    iso: dateObj.toISOString()
  };
}

/**
 * React component props for displaying a formatted date.
 * Use this with a <time> element for semantic HTML.
 */
export interface FormattedDateProps {
  date: Date | string | number;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Format a date for display in profile or settings contexts where
 * full dates are more appropriate than relative dates.
 * 
 * @param date - Date to format
 * @returns Object with full date display and tooltip
 * 
 * @example
 * ```tsx
 * const { display, absolute, iso } = formatProfileDate(user.created_at);
 * 
 * return (
 *   <time dateTime={iso} title={absolute}>
 *     {display}
 *   </time>
 * );
 * ```
 */
export function formatProfileDate(date: Date | string | number): DateDisplayProps {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date provided: ${date}`);
  }
  
  return {
    relative: format(dateObj, 'yyyy-MMM-dd'), // More formal for profiles
    absolute: format(dateObj, 'yyyy-MMM-dd HH:mm'),
    iso: dateObj.toISOString()
  };
}

/**
 * Format a date for document metadata display with both relative and absolute context.
 * Used in metadata panels where both perspectives are valuable.
 * 
 * @param date - Date to format
 * @returns Object with relative time, full date, and ISO string
 */
export function formatMetadataDate(date: Date | string | number): DateDisplayProps & {
  /** Full readable date for secondary display */
  fullDate: string;
} {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date provided: ${date}`);
  }
  
  return {
    relative: formatDistanceToNow(dateObj, { addSuffix: true }),
    absolute: format(dateObj, 'yyyy-MMM-dd HH:mm'),
    iso: dateObj.toISOString(),
    fullDate: format(dateObj, 'dd MMM yyyy')
  };
}