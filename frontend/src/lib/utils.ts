import { clsx, type ClassValue } from "clsx"; // 1. Import ClassValue
import { twMerge } from "tailwind-merge";

// 2. Add : ClassValue[] to the inputs parameter
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
