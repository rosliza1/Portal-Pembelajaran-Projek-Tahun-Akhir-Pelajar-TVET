// GET /api/users?role=X&institutionId=X - List users (RBAC)
// POST /api/users - Admin creates user (FR-03 bulk import support)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeObject, sanitizeInput, hashPassword,
} from '@/lib/auth'

const VALID_ROLES = ['STUDENT', 'SUPERVISOR', 'PANEL', 'INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS']
const DEFAULT_PASSWORD = 'Portal@2026'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const institutionId = searchParams.get('institutionId')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  const where: any = {}
  // RBAC: JTM admin sees all; institution admin sees own institution; others see self only
  if (user.role === 'JTM_ADMIN' || user.role === 'DEVOPS') {
    if (institutionId) where.institutionId = institutionId
  } else if (user.role === 'INSTITUTION_ADMIN') {
    where.institutionId = user.institutionId
  } else {
    where.id = user.id
  }
  if (role) where.role = role

  const users = await db.user.findMany({
    where,
    select: {
      id: true, email: true, fullName: true, role: true, phone: true, avatarUrl: true,
      institutionId: true, programId: true, session: true, isActive: true, mfaEnabled: true,
      lastLoginAt: true, createdAt: true,
      institution: { select: { id: true, name: true, code: true } },
      program: { select: { id: true, name: true, code: true, field: true } },
      student: { select: { id: true, registrationNo: true, cohort: true, supervisorId: true } },
      supervisor: { select: { id: true, staffNo: true, expertiseField: true, maxStudents: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return apiOk(users)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    if (!['INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS'].includes(user.role)) {
      return apiForbidden('Hanya admin boleh mencipta pengguna.')
    }
    const ip = getClientIp(request)

    const raw = await request.json()
    // FR-03 bulk import support: accept single or array under `users`
    const userList: any[] = Array.isArray(raw) ? raw : Array.isArray(raw.users) ? raw.users : [raw]
    if (userList.length === 0) return apiError('Tiada data pengguna', 422)

    const passwordHash = await hashPassword(DEFAULT_PASSWORD)
    const created: any[] = []
    const errors: any[] = []

    for (let i = 0; i < userList.length; i++) {
      try {
        const u = sanitizeObject(userList[i])
        const email = u.email?.toLowerCase().trim()
        const fullName = u.fullName?.trim()
        const role = u.role || 'STUDENT'

        if (!email || !fullName) {
          errors.push({ index: i, error: 'email dan fullName diperlukan' })
          continue
        }
        if (!VALID_ROLES.includes(role)) {
          errors.push({ index: i, error: 'role tidak sah' })
          continue
        }

        // Institution admin can only create users in own institution (and limited roles)
        let institutionId = u.institutionId || user.institutionId
        if (user.role === 'INSTITUTION_ADMIN') {
          institutionId = user.institutionId
          if (role === 'JTM_ADMIN' || role === 'DEVOPS') {
            errors.push({ index: i, error: 'Admin institusi tidak boleh mencipta JTM/DEVOPS' })
            continue
          }
        }

        // Email unique check
        const existing = await db.user.findUnique({ where: { email } })
        if (existing) {
          errors.push({ index: i, email, error: 'Emel sudah wujud' })
          continue
        }

        const newUser = await db.user.create({
          data: {
            email,
            passwordHash,
            fullName,
            role,
            phone: u.phone || null,
            avatarUrl: u.avatarUrl || null,
            institutionId,
            programId: u.programId || null,
            session: u.session || null,
            isActive: u.isActive !== false,
          },
        })

        // Create Student/Supervisor records if applicable
        if (role === 'STUDENT') {
          await db.student.create({
            data: {
              userId: newUser.id,
              registrationNo: u.registrationNo || `STD-${newUser.id.slice(-8).toUpperCase()}`,
              cohort: u.cohort || null,
              supervisorId: u.supervisorId || null,
            },
          })
        } else if (role === 'SUPERVISOR') {
          await db.supervisor.create({
            data: {
              userId: newUser.id,
              staffNo: u.staffNo || `SUP-${newUser.id.slice(-8).toUpperCase()}`,
              expertiseField: u.expertiseField || null,
              maxStudents: u.maxStudents || 15,
              institutionId,
            },
          })
        }

        created.push({ id: newUser.id, email, fullName, role })
      } catch (e: any) {
        errors.push({ index: i, error: e.message })
      }
    }

    await logAudit({
      userId: user.id,
      action: 'CREATE_USER',
      entity: 'User',
      after: { count: created.length, emails: created.map((c) => c.email) },
      ipAddress: ip,
    })

    return apiOk({ created, errors, defaultPassword: created.length > 0 ? DEFAULT_PASSWORD : undefined }, `${created.length} pengguna dicipta.`)
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
