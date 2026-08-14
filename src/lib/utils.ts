/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add any other utility functions here

export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (num === null || num === undefined || isNaN(num as number)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  // Tratar strings no formato "YYYY-MM-DD" como data local (sem deslocamento UTC).
  // O JavaScript interpreta new Date("2025-05-14") como UTC, o que no Brasil (UTC-3)
  // vira 13/05/2025 21:00. Anexamos 'T12:00:00' para forçar interpretação local.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value
  const date = new Date(normalized)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('pt-BR')
}
