export type DevAccessMethod = 'github' | 'qr'
export type DevAccessActor = 'owner' | 'owner-mobile' | 'automation-bot'

export interface DevAccessSession {
  readonly sessionToken: string
  readonly method: DevAccessMethod
  readonly actor: DevAccessActor
  readonly canManageChecklist: boolean
  readonly canDeleteRecords: boolean
  readonly deleteUnlockedUntil?: string
  readonly issuedAt: string
  readonly expiresAt: string
}

const STORAGE_KEY = 'engine-dev-access-session-v1'

function resolveApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
}

function isExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) <= Date.now()
}

function parseSession(raw: string | null): DevAccessSession | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as DevAccessSession
    if (!parsed.sessionToken || !parsed.method || !parsed.actor || !parsed.expiresAt) {
      return null
    }

    if (isExpired(parsed.expiresAt)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function readDevAccessSession(): DevAccessSession | null {
  const parsed = parseSession(localStorage.getItem(STORAGE_KEY))
  if (!parsed) {
    clearDevAccessSession()
  }

  return parsed
}

export function saveDevAccessSession(session: DevAccessSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearDevAccessSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export async function validateDevAccessSession(session: DevAccessSession): Promise<boolean> {
  if (isExpired(session.expiresAt)) {
    return false
  }

  const endpoint = `${resolveApiBaseUrl()}/dev-access/session/validate?token=${encodeURIComponent(session.sessionToken)}`

  try {
    const response = await fetch(endpoint)
    return response.ok
  } catch {
    return false
  }
}
