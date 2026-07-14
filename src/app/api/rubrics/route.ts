// GET /api/rubrics?evalType=X&field=X - List rubrics (authenticated)
// POST /api/rubrics - JTM admin only (FR-20)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeObject, sanitizeInput,
} from '@/lib/auth'

const VALID_EVAL_TYPES = ['supervisor_progress', 'panel_viva', 'final_report']
const VALID_FIELDS = ['Elektrik Kuasa', 'RAC', 'Both']

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { searchParams } = new URL(request.url)
  const evalType = searchParams.get('evalType')
  const field = searchParams.get('field')

  const where: any = { isActive: true }
  if (evalType) where.evalType = evalType
  if (field) where.field = field

  const rubrics = await db.rubric.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  // Parse criteria JSON
  const result = rubrics.map((r) => {
    let criteria = []
    try { criteria = r.criteria ? JSON.parse(r.criteria) : [] } catch { criteria = [] }
    return { ...r, criteria }
  })
  return apiOk(result)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    if (!['JTM_ADMIN', 'DEVOPS'].includes(user.role)) {
      return apiForbidden('Hanya JTM admin boleh mencipta rubrik.')
    }

    const body = sanitizeObject(await request.json())
    const name = body.name?.trim()
    const field = body.field
    const evalType = body.evalType
    const criteria = body.criteria
    const totalWeight = parseInt(body.totalWeight) || 100

    if (!name || !field || !evalType || !Array.isArray(criteria) || criteria.length === 0) {
      return apiError('name, field, evalType, dan criteria (array) diperlukan', 422)
    }
    if (!VALID_EVAL_TYPES.includes(evalType)) return apiError('evalType tidak sah', 422)
    if (!VALID_FIELDS.includes(field)) return apiError('field tidak sah', 422)

    // Validate criteria shape
    for (const c of criteria) {
      if (!c.key || !c.label || typeof c.maxScore !== 'number' || typeof c.weight !== 'number') {
        return apiError('Setiap kriteria mesti ada key, label, maxScore, weight', 422)
      }
    }

    const rubric = await db.rubric.create({
      data: {
        name,
        field,
        evalType,
        criteria: JSON.stringify(criteria),
        totalWeight,
        isActive: true,
        createdBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: 'CREATE_RUBRIC',
      entity: 'Rubric',
      entityId: rubric.id,
      after: { name, field, evalType, criteriaCount: criteria.length, totalWeight },
      ipAddress: getClientIp(request),
    })

    return apiOk({ ...rubric, criteria }, 'Rubrik dicipta.')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
