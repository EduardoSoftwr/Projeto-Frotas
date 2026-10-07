export const storageKeys = {
  legacyFleetSnapshot: 'frota-fleet-data-v1',
} as const

type Validator<T> = (value: unknown) => value is T

export function readStoredValue<T>(key: string, isValid: Validator<T>, fallback: T): T {
  try {
    const rawValue = window.localStorage.getItem(key)
    if (rawValue === null) return fallback

    const parsed: unknown = JSON.parse(rawValue)
    if (isValid(parsed)) return parsed

    window.localStorage.removeItem(key)
    return fallback
  } catch {
    return fallback
  }
}

export function writeStoredValue<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage indisponivel nao deve interromper o uso em memoria.
  }
}

export function removeStoredValue(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Storage indisponivel nao deve interromper o logout ou o reset.
  }
}
