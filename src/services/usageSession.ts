const usageSessionKey = 'carro_gc_usage_session'

export interface UsageSession {
  vehicleId: string
  usageId: string
  sessionToken: string
}

export function readUsageSession(): UsageSession | null {
  try {
    const raw = window.localStorage.getItem(usageSessionKey)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const session = value as Record<string, unknown>
    if (typeof session.vehicleId !== 'string' || typeof session.usageId !== 'string' || typeof session.sessionToken !== 'string') return null
    return { vehicleId: session.vehicleId, usageId: session.usageId, sessionToken: session.sessionToken }
  } catch {
    return null
  }
}

export function writeUsageSession(session: UsageSession): boolean {
  try {
    window.localStorage.setItem(usageSessionKey, JSON.stringify(session))
    return true
  } catch {
    return false
  }
}

export function clearUsageSession() {
  try {
    window.localStorage.removeItem(usageSessionKey)
  } catch {
    // Storage indisponível não deve impedir que a API finalize a utilização.
  }
}
