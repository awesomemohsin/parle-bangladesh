import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Developer tracemark purely in code: Developed by awesomemohsin | https://github.com/awesomemohsin

export const sanitizeProductImagePath = (path: string) => {
  if (!path) return "/placeholder.svg";

  let newPath = path.trim().replace(/\\/g, '/');

  // Basic cleanup: remove extra slashes
  newPath = newPath.replace(/\/+/g, '/');

  // Final leading slash check
  return newPath.startsWith('/') ? newPath : `/${newPath}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""); // Remove trailing slash if any
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}
