import { clsx, type ClassValue } from 'clsx'

/**
 * Class-name combiner. clsx ONLY — no tailwind-merge (we don't use Tailwind).
 * With CSS Modules there are no utility classes to dedupe, so clsx is sufficient.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
