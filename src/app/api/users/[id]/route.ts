// PATCH /api/users/[id] - Update profile / deactivate (role-based)
// Self can update own profile (name, phone, avatarUrl); admin can update role, isActive, institutionId
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeObject, sanitizeInput,
} from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

const VALID_ROLES = ['STUDENT', 'SUPERVISOR', 'PANEL', 'INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS']

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    const { id } = await ctx.params
    const ip = getClientIp(request)

    const target = await db.user.findUnique({ where: { id }, include: { institution: true } })
    if (!target) return apiError('Pengguna tidak dijumpai', 404)

    const body = sanitizeObject(await request.json())
    const isAdmin = ['INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS'].includes(user.role)
    const isSelf = user.id === id

    if (!isSelf && !isAdmin) return apiForbidden('Anda hanya boleh mengemas kini profil sendiri.')

    // Institution admin can only manage users in own institution
    if (user.role === 'INSTITUTION_ADMIN' && !isSelf && target.institutionId !== user.institutionId) {
      return apiForbidden()
    }

    const before = {
      fullName: target.fullName, phone: target.phone, avatarUrl: target.avatarUrl,
      role: target.role, isActive: target.isActive, institutionId: target.institutionId,
    }
    const data: any = {}

    if (isSelf && !isAdmin) {
      // Self: limited fields
      if (body.fullName) data.fullName = body.fullName
      if (body.phone !== undefined) data.phone = body.phone
      if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl
    } else {
      // Admin: can update broader set
      if (body.fullName) data.fullName = body.fullName
      if (body.phone !== undefined) data.phone = body.phone
      if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl
      if (body.role) {
        if (!VALID_ROLES.includes(body.role)) return apiError('role tidak sah', 422)
        // Institution admin cannot escalate to JTM_ADMIN / DEVOPS
        if (user.role === 'INSTITUTION_ADMIN' && (body.role === 'JTM_ADMIN' || body.role === 'DEVOPS')) {
          return apiForbidden('Admin institusi tidak boleh menetapkan peranan JTM/DEVOPS.')
        }
        data.role = body.role
      }
      if (body.isActive !== undefined) data.isActive = !!body.isActive
      if (body.institutionId !== undefined) {
        if (user.role === 'INSTITUTION_ADMIN' && body.institutionId !== user.institutionId) {
          return apiForbidden('Anda tidak boleh memindahkan pengguna ke institusi lain.')
        }
        data.institutionId = body.institutionId
      }
      if (body.programId !== undefined) data.programId = body.programId
      if (body.session !== undefined) data.session = body.session
    }

    if (Object.keys(data).length === 0) {
      return apiError('Tiada medan untuk dikemas kini', 422)
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, email: true, fullName: true, role: true, phone: true, avatarUrl: true, institutionId: true, programId: true, session: true, isActive: true },
    })

    await logAudit({
      userId: user.id,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: id,
      before,
      after: data,
      ipAddress: ip,
    })

    return apiOk(updated, 'Pengguna dikemas kini.')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
