// POST /api/auth/login - Login with email/password
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword, setSession, checkLoginRateLimit, recordLoginAttempt,
  logAudit, getClientIp, apiOk, apiError, sanitizeInput,
} from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = sanitizeInput(body.email || '').toLowerCase()
    const password = body.password || ''
    if (!email || !password) {
      return apiError('Emel dan kata laluan diperlukan', 422)
    }
    const ip = getClientIp(request)
    const rl = await checkLoginRateLimit(email, ip)
    if (!rl.allowed) {
      return apiError(`Akaun dikunci sementara. Cuba lagi selepas ${rl.lockoutUntil?.toLocaleTimeString('ms-MY')}`, 429, 'LOCKED')
    }
    const user = await db.user.findUnique({ where: { email }, include: { institution: true, program: true, student: { include: { supervisor: { include: { user: true } } } }, supervisor: true } })
    if (!user || !user.isActive) {
      await recordLoginAttempt(email, false, undefined, ip, 'USER_NOT_FOUND')
      return apiError('Emel atau kata laluan tidak sah', 401)
    }
    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      await recordLoginAttempt(email, false, user.id, ip, 'WRONG_PASSWORD')
      await logAudit({ userId: user.id, action: 'LOGIN_FAILED', entity: 'User', entityId: user.id, ipAddress: ip })
      return apiError('Emel atau kata laluan tidak sah', 401)
    }
    await setSession(user.id, user.role)
    await recordLoginAttempt(email, true, user.id, ip)
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    await logAudit({ userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, ipAddress: ip, userAgent: request.headers.get('user-agent') || undefined })
    const { passwordHash, ...safe } = user
    return apiOk(safe, 'Log masuk berjaya')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
