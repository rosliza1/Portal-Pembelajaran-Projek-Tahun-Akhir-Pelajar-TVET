// GET /api/equipment?institutionId=X&category=X&status=X - List equipment (RBAC)
// POST /api/equipment - Institution admin or JTM admin only
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeObject,
} from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { searchParams } = new URL(request.url)
  const institutionId = searchParams.get('institutionId')
  const category = searchParams.get('category')
  const status = searchParams.get('status')

  const where: any = {}
  // RBAC: filter by institution for non-JTM-admin
  if (user.role !== 'JTM_ADMIN' && user.role !== 'DEVOPS') {
    where.institutionId = user.institutionId || institutionId
  } else if (institutionId) {
    where.institutionId = institutionId
  }
  if (category) where.category = category
  if (status) where.status = status

  const equipment = await db.equipment.findMany({
    where,
    include: { institution: { select: { id: true, name: true, code: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return apiOk(equipment)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    if (!['INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS'].includes(user.role)) {
      return apiForbidden('Hanya admin institusi/JTM boleh menambah peralatan.')
    }

    const body = sanitizeObject(await request.json())
    const name = body.name?.trim()
    const code = body.code?.trim()
    const category = body.category
    const specification = body.specification?.trim() || null
    const institutionId = body.institutionId || user.institutionId
    const quantity = parseInt(body.quantity) || 1

    if (!name || !code || !category) {
      return apiError('name, code, category diperlukan', 422)
    }
    if (quantity < 1) return apiError('quantity mesti ≥ 1', 422)

    if (user.role === 'INSTITUTION_ADMIN' && institutionId !== user.institutionId) {
      return apiForbidden('Anda hanya boleh menambah peralatan untuk institusi anda.')
    }

    // Unique code check
    const existing = await db.equipment.findUnique({ where: { code } })
    if (existing) return apiError('Kod peralatan sudah wujud', 422)

    const equipment = await db.equipment.create({
      data: {
        name,
        code,
        category,
        specification,
        institutionId,
        quantity,
        availableQty: quantity,
        status: 'AVAILABLE',
      },
    })

    await logAudit({
      userId: user.id,
      action: 'CREATE_EQUIPMENT',
      entity: 'Equipment',
      entityId: equipment.id,
      after: { name, code, category, institutionId, quantity },
      ipAddress: getClientIp(request),
    })

    return apiOk(equipment, 'Peralatan dicipta.')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
