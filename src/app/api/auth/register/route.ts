// POST /api/auth/register - Student self-registration (FR-01, FR-04)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword, validatePassword, setSession, logAudit, getClientIp,
  apiOk, apiError, sanitizeInput,
} from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = sanitizeInput(body.email || '').toLowerCase()
    const fullName = sanitizeInput(body.fullName || '')
    const password = body.password || ''
    const phone = sanitizeInput(body.phone || '')
    const institutionId = body.institutionId || null
    const programId = body.programId || null
    const session = sanitizeInput(body.session || '2025/2026')

    if (!email || !fullName || !password) {
      return apiError('Emel, nama penuh dan kata laluan diperlukan', 422)
    }
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return apiError('Format emel tidak sah', 422)
    // Password policy (PRD §13)
    const pw = validatePassword(password)
    if (!pw.valid) return apiError(`Kata laluan tidak memenuhi polisi: ${pw.errors.join(', ')}`, 422)
    // Duplicate email
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return apiError('Emel telah didaftarkan', 409)
    // Create user (default role: STUDENT)
    const user = await db.user.create({
      data: { email, fullName, passwordHash: await hashPassword(password), role: 'STUDENT', phone, institutionId, programId, session, isActive: true },
      include: { institution: true, program: true },
    })
    // Create student record
    const regNo = `DKM${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`
    await db.student.create({ data: { userId: user.id, registrationNo: regNo, cohort: session } })
    await setSession(user.id, user.role)
    await logAudit({ userId: user.id, action: 'REGISTER', entity: 'User', entityId: user.id, ipAddress: getClientIp(request) })
    const { passwordHash, ...safe } = user
    return apiOk(safe, 'Pendaftaran berjaya. Selamat datang ke Portal FYP TVET!')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
