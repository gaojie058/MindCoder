import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(fun: T, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null
  return function(this: ThisParameterType<T>, ...args: Parameters<T>): void {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      fun.apply(this, args);
      timer = null
    }, delay);
  };
}