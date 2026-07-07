import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getDaysAgo(dateString: string | null): number | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const RANK_ORDER = ['White', 'Blue', 'Purple', 'Brown', 'Black', 'Coral', 'Red'];

const ALL_BELTS = ['White', 'Blue', 'Purple', 'Brown', 'Black', 'Coral', 'Red'];

export function getRankColor(rank?: string): string {
  switch (rank) {
    case 'White': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    case 'Blue': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    case 'Purple': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
    case 'Brown': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
    case 'Black': return 'bg-gray-800 text-white dark:bg-gray-900 dark:text-gray-100';
    case 'Coral': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
    case 'Red': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
}

export function getRankBorderColor(rank?: string): string {
  switch (rank) {
    case 'White': return 'border-gray-300';
    case 'Blue': return 'border-blue-500';
    case 'Purple': return 'border-purple-500';
    case 'Brown': return 'border-amber-700';
    case 'Black': return 'border-gray-900';
    case 'Coral': return 'border-orange-500';
    case 'Red': return 'border-red-600';
    default: return 'border-gray-300';
  }
}

export function formatRankDisplay(rank?: string, degree?: number): string {
  if (!rank) return 'Unknown';
  if (degree === undefined || degree === 0) return `${rank} Belt`;
  const suffix = degree === 1 ? '1st' : degree === 2 ? '2nd' : degree === 3 ? '3rd' : '4th';
  return `${rank} Belt ${suffix} Degree`;
}

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
