// PATCH /api/rubrics/[id] - JTM admin only. Toggle isActive / update criteria
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeObject,
} from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    if (!['JTM_ADMIN', 'DEVOPS'].includes(user.role)) {
      return apiForbidden('Hanya JTM admin boleh mengemas kini rubrik.')
    }
    const { id } = await ctx.params
    const ip = getClientIp(request)

    const rubric = await db.rubric.findUnique({ where: { id } })
    if (!rubric) return apiError('Rubrik tidak dijumpai', 404)

    const body = sanitizeObject(await request.json())
    const before = { name: rubric.name, isActive: rubric.isActive, criteria: rubric.criteria, totalWeight: rubric.totalWeight }

    const data: any = {}
    if (body.isActive !== undefined) data.isActive = !!body.isActive
    if (body.name) data.name = body.name
    if (body.totalWeight !== undefined) data.totalWeight = parseInt(body.totalWeight)
    if (Array.isArray(body.criteria)) {
      for (const c of body.criteria) {
        if (!c.key || !c.label || typeof c.maxScore !== 'number' || typeof c.weight !== 'number') {
          return apiError('Setiap kriteria mesti ada key, label, maxScore, weight', 422)
        }
      }
      data.criteria = JSON.stringify(body.criteria)
    }

    const updated = await db.rubric.update({ where: { id }, data })

    await logAudit({
      userId: user.id,
      action: 'UPDATE_RUBRIC',
      entity: 'Rubric',
      entityId: id,
      before,
      after: { name: updated.name, isActive: updated.isActive, totalWeight: updated.totalWeight },
      ipAddress: ip,
    })

    let result: any = { ...updated }
    try { result.criteria = updated.criteria ? JSON.parse(updated.criteria) : [] } catch { result.criteria = [] }
    return apiOk(result, 'Rubrik dikemas kini.')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
