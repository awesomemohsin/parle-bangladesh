import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const sanitizeProductImagePath = (path: string) => {
  if (!path) return "/placeholder.svg";
  
  let newPath = path.trim().replace(/\\/g, '/');
  
  // Basic cleanup: remove extra slashes
  newPath = newPath.replace(/\/+/g, '/');

  return newPath.startsWith('/') ? newPath : `/${newPath}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
