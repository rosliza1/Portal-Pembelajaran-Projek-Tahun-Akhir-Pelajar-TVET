// GET /api/audit-logs?action=X&entity=X&userId=X&limit=X - List audit logs (admin only)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, apiOk, apiError, apiUnauthorized, apiForbidden } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()

  // Only JTM_ADMIN, INSTITUTION_ADMIN (own institution users), DEVOPS allowed
  if (!['JTM_ADMIN', 'INSTITUTION_ADMIN', 'DEVOPS'].includes(user.role)) {
    return apiForbidden('Akses audit log terhad kepada admin.')
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const entity = searchParams.get('entity')
  const userId = searchParams.get('userId')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
  const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
  const skip = (page - 1) * limit

  const where: any = {}
  if (action) where.action = action
  if (entity) where.entity = entity
  if (userId) where.userId = userId

  // Institution admin: filter to users in their institution
  if (user.role === 'INSTITUTION_ADMIN') {
    const instUsers = await db.user.findMany({
      where: { institutionId: user.institutionId },
      select: { id: true },
    })
    const ids = instUsers.map((u) => u.id)
    if (userId && !ids.includes(userId)) return apiForbidden('Audit log di luar institusi anda.')
    where.userId = { in: userId ? [userId] : ids }
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
    db.auditLog.count({ where }),
  ])

  // Parse before/after JSON
  const result = logs.map((l) => {
    let before: any = null, after: any = null
    try { before = l.before ? JSON.parse(l.before) : null } catch { before = null }
    try { after = l.after ? JSON.parse(l.after) : null } catch { after = null }
    return { ...l, before, after }
  })

  return apiOk({ data: result, total, page, limit, totalPages: Math.ceil(total / limit) })
}
