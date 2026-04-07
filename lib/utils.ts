import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const sanitizeProductImagePath = (path: string) => {
  if (!path) return "/placeholder.svg";
  
  let newPath = path.trim().replace(/\\/g, '/');
  
  // Basic cleanup: remove extra slashes
  newPath = newPath.replace(/\/+/g, '/');
  
  // Standardize naming and category mismatches (resilience layer)
  if (newPath.includes('/wafers-chips/')) {
    newPath = newPath.replace('/wafers-chips/', '/wafers/');
    
    // Surgical replacement: replace the WHOLE segment 'parle-wafer/XXX.webp'
    // This resolves the duplication of 'parle-wafer' in the path
    if (newPath.includes('cream-n-onion.webp')) {
      newPath = newPath.replace('parle-wafer/cream-n-onion.webp', 'Parle-Wafer/parle-wafer/Parle_wafers_Cream.webp');
    } else if (newPath.includes('tangy-tomato.webp')) {
      newPath = newPath.replace('parle-wafer/tangy-tomato.webp', 'Parle-Wafer/parle-wafer/Parle_wafers_Tangy.webp');
    } else if (newPath.includes('classic.webp')) {
      newPath = newPath.replace('parle-wafer/classic.webp', 'Parle-Wafer/parle-wafer/Parle_wafers_Classic.webp');
    } else if (newPath.includes('piri-piri.webp')) {
      newPath = newPath.replace('parle-wafer/piri-piri.webp', 'Parle-Wafer/parle-wafer/Parle_wafers_Piri_Piri_FOP.webp');
    } else {
      // Fallback: just fix the category and try to reach the folder
      newPath = newPath.replace('parle-wafer/', 'Parle-Wafer/parle-wafer/');
    }
  }

  // Final leading slash check
  return newPath.startsWith('/') ? newPath : `/${newPath}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
