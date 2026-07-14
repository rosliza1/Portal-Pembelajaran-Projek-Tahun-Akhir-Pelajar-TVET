// Authentication & security library
// Implements: session management (httpOnly cookie), password validation, rate limiting, audit logging
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import crypto from 'crypto'

const SESSION_COOKIE = 'jtm_fyp_session'
const SESSION_MAX_AGE = 60 * 60 * 8 // 8 hours (in seconds)
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

// Password policy per PRD §13: minimum 8 chars, uppercase/lowercase/numbers
export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (password.length < PASSWORD_POLICY.minLength) errors.push(`Minimum ${PASSWORD_POLICY.minLength} aksara`)
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) errors.push('Memerlukan huruf besar')
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) errors.push('Memerlukan huruf kecil')
  if (PASSWORD_POLICY.requireNumber && !/[0-9]/.test(password)) errors.push('Memerlukan nombor')
  return { valid: errors.length === 0, errors }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Simple session token (signed payload) - not as robust as JWT but stateless & secure enough for demo
function createSessionToken(userId: string, role: string): string {
  const payload = {
    userId,
    role,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
    nonce: crypto.randomBytes(8).toString('hex'),
  }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const secret = process.env.SESSION_SECRET || 'jtm-fyp-tvet-2026-secret-key'
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifySessionToken(token: string): { userId: string; role: string; exp: number } | null {
  try {
    const [data, sig] = token.split('.')
    if (!data || !sig) return null
    const secret = process.env.SESSION_SECRET || 'jtm-fyp-tvet-2026-secret-key'
    const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url')
    if (sig !== expectedSig) return null
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString())
    if (Date.now() > payload.exp) return null
    return { userId: payload.userId, role: payload.role, exp: payload.exp }
  } catch {
    return null
  }
}

export async function setSession(userId: string, role: string) {
  const token = createSessionToken(userId, role)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<{ userId: string; role: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

// Get the full user from session (with role check helper)
export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null
  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: {
      institution: true,
      program: true,
      student: { include: { supervisor: { include: { user: true } } } },
      supervisor: true,
    },
  })
  if (!user || !user.isActive) return null
  return user
}

export type SafeUser = Omit<Awaited<ReturnType<typeof getCurrentUser>>, 'passwordHash'> & { passwordHash?: never }

export function toSafeUser(user: any) {
  if (!user) return null
  const { passwordHash, ...safe } = user
  return safe
}

// ============ RATE LIMITING (login attempts) ============
export async function checkLoginRateLimit(email: string, ipAddress?: string): Promise<{ allowed: boolean; remaining: number; lockoutUntil?: Date }> {
  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000)
  const recentAttempts = await db.loginAttempt.findMany({
    where: {
      email,
      success: false,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (recentAttempts.length >= MAX_LOGIN_ATTEMPTS) {
    const lastAttempt = recentAttempts[0]
    const lockoutUntil = new Date(lastAttempt.createdAt.getTime() + LOCKOUT_MINUTES * 60 * 1000)
    if (lockoutUntil > new Date()) {
      return { allowed: false, remaining: 0, lockoutUntil }
    }
  }
  return { allowed: true, remaining: Math.max(0, MAX_LOGIN_ATTEMPTS - recentAttempts.length) }
}

export async function recordLoginAttempt(email: string, success: boolean, userId?: string, ipAddress?: string, reason?: string) {
  await db.loginAttempt.create({ data: { email, success, userId, ipAddress, reason } })
}

// ============ AUDIT LOG ============
export async function logAudit(opts: {
  userId?: string
  action: string
  entity: string
  entityId?: string
  before?: any
  after?: any
  ipAddress?: string
  userAgent?: string
}) {
  await db.auditLog.create({
    data: {
      userId: opts.userId,
      action: opts.action,
      entity: opts.entity,
      entityId: opts.entityId,
      before: opts.before ? JSON.stringify(opts.before) : null,
      after: opts.after ? JSON.stringify(opts.after) : null,
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    },
  })
}

// ============ INPUT SANITIZATION (XSS prevention) ============
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') result[k] = sanitizeInput(v)
    else if (Array.isArray(v)) result[k] = v.map((x) => (typeof x === 'string' ? sanitizeInput(x) : x))
    else if (v && typeof v === 'object' && !(v instanceof Date)) result[k] = sanitizeObject(v)
    else result[k] = v
  }
  return result
}

// ============ ROLE-BASED ACCESS CONTROL ============
export const ROLES = {
  STUDENT: 'STUDENT',
  SUPERVISOR: 'SUPERVISOR',
  PANEL: 'PANEL',
  INSTITUTION_ADMIN: 'INSTITUTION_ADMIN',
  JTM_ADMIN: 'JTM_ADMIN',
  DEVOPS: 'DEVOPS',
} as const

export type Role = keyof typeof ROLES

// Role hierarchy: higher can do everything lower can
const ROLE_LEVEL: Record<string, number> = {
  STUDENT: 1,
  SUPERVISOR: 2,
  PANEL: 2,
  INSTITUTION_ADMIN: 3,
  JTM_ADMIN: 4,
  DEVOPS: 5,
}

export function hasRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole)
}

export function requireRole(userRole: string, ...allowedRoles: string[]) {
  if (!allowedRoles.includes(userRole)) {
    throw new Error('Akses dinafikkan: peranan tidak dibenarkan')
  }
}

// Get client IP from request headers (best-effort)
export function getClientIp(request: Request): string | undefined {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || undefined
}

// Unified API response helpers
export function apiOk(data: any, message?: string) {
  return Response.json({ success: true, data, message }, { status: 200 })
}

export function apiError(message: string, status = 400, code?: string) {
  return Response.json({ success: false, error: message, code }, { status })
}

export function apiUnauthorized(message = 'Tidak dibenarkan. Sila log masuk.') {
  return Response.json({ success: false, error: message, code: 'UNAUTHORIZED' }, { status: 401 })
}

export function apiForbidden(message = 'Akses dinafikkan untuk peranan anda.') {
  return Response.json({ success: false, error: message, code: 'FORBIDDEN' }, { status: 403 })
}
