import type { Usage } from '../types/fleet'

export interface DateRange {
  start: string
  end: string
}

export interface UsageReportSummary {
  usageCount: number
  totalKilometers: number
  totalMinutes: number
  averageKilometers: number
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dateRangeForPreset(preset: string, now = new Date()): DateRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (preset === 'yesterday') {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const key = localDateKey(yesterday)
    return { start: key, end: key }
  }
  if (preset === 'previous-month') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return { start: localDateKey(first), end: localDateKey(last) }
  }
  if (preset === 'custom') {
    const key = localDateKey(today)
    return { start: key, end: key }
  }
  if (preset === 'this-month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start: localDateKey(first), end: localDateKey(today) }
  }
  const key = localDateKey(today)
  return { start: key, end: key }
}

export function getUsageStartDateKey(usage: Usage): string {
  return localDateKey(new Date(usage.startDateTime))
}

export function filterUsagesByDateRange(usages: Usage[], range: DateRange): Usage[] {
  return usages
    .filter((usage) => {
      const startDate = getUsageStartDateKey(usage)
      return startDate >= range.start && startDate <= range.end
    })
    .sort((first, second) => second.startDateTime.localeCompare(first.startDateTime))
}

export function getUsageDistance(usage: Usage): number {
  if (usage.endKm === null) return 0
  return Math.max(0, usage.endKm - usage.startKm)
}

export function getUsageDurationMinutes(usage: Usage, now = Date.now()): number {
  const endTime = usage.endDateTime === null ? now : Date.parse(usage.endDateTime)
  return Math.max(0, Math.floor((endTime - Date.parse(usage.startDateTime)) / 60_000))
}

export function getUsageReportSummary(usages: Usage[], now = Date.now()): UsageReportSummary {
  const totalKilometers = usages.reduce((total, usage) => total + getUsageDistance(usage), 0)
  const totalMinutes = usages.reduce((total, usage) => total + getUsageDurationMinutes(usage, now), 0)
  return {
    usageCount: usages.length,
    totalKilometers,
    totalMinutes,
    averageKilometers: usages.length === 0 ? 0 : totalKilometers / usages.length,
  }
}

export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.floor(totalMinutes))
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-')
  return `${day}/${month}/${year}`
}

export function formatTime(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}