// GET /api/equipment/bookings?userId=X&status=X - List bookings (RBAC)
// POST /api/equipment/bookings - Student books equipment (FR-31)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeObject, sanitizeInput,
} from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const status = searchParams.get('status')

  const where: any = {}
  // Student sees own; supervisor/admin see institution
  if (user.role === 'STUDENT') {
    where.studentId = user.id
  } else if (user.role === 'SUPERVISOR') {
    where.equipment = { institutionId: user.institutionId }
  } else if (user.role === 'INSTITUTION_ADMIN') {
    where.equipment = { institutionId: user.institutionId }
  }
  if (userId && (user.role === 'JTM_ADMIN' || user.role === 'DEVOPS' || userId === user.id)) {
    where.studentId = userId
  }
  if (status) where.status = status

  const bookings = await db.equipmentBooking.findMany({
    where,
    include: {
      equipment: { include: { institution: { select: { id: true, name: true, code: true } } } },
      student: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return apiOk(bookings)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    if (user.role !== 'STUDENT') return apiForbidden('Hanya pelajar boleh menempah peralatan.')

    const body = sanitizeObject(await request.json())
    const equipmentId = body.equipmentId
    const projectId = body.projectId || null
    const bookingStart = body.bookingStart
    const bookingEnd = body.bookingEnd
    const purpose = body.purpose?.trim()

    if (!equipmentId || !bookingStart || !bookingEnd || !purpose) {
      return apiError('equipmentId, bookingStart, bookingEnd, purpose diperlukan', 422)
    }

    const start = new Date(bookingStart)
    const end = new Date(bookingEnd)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return apiError('Tarikh mula/tamat tidak sah', 422)
    }

    const equipment = await db.equipment.findUnique({ where: { id: equipmentId } })
    if (!equipment) return apiError('Peralatan tidak dijumpai', 404)
    if (equipment.status === 'RETIRED' || equipment.status === 'UNDER_MAINTENANCE') {
      return apiError('Peralatan tidak tersedia', 422)
    }
    if (equipment.availableQty <= 0) {
      return apiError('Peralatan tiada stok tersedia', 422, 'OUT_OF_STOCK')
    }

    // Check overlapping approved booking for same equipment in the requested window
    const overlapping = await db.equipmentBooking.findFirst({
      where: {
        equipmentId,
        status: 'APPROVED',
        OR: [
          { bookingStart: { lte: start }, bookingEnd: { gt: start } },
          { bookingStart: { lt: end }, bookingEnd: { gte: end } },
          { bookingStart: { gte: start }, bookingEnd: { lte: end } },
        ],
      },
    })
    // Note: We don't strictly block if availableQty > 1; but here we approximate single-unit conflict for simplicity
    if (overlapping && equipment.availableQty <= 1) {
      return apiError('Peralatan telah ditempah dalam tempoh ini', 422, 'BOOKING_CONFLICT')
    }

    const booking = await db.equipmentBooking.create({
      data: {
        equipmentId,
        studentId: user.id,
        projectId,
        bookingStart: start,
        bookingEnd: end,
        purpose,
        status: 'PENDING',
      },
      include: { equipment: true },
    })

    await logAudit({
      userId: user.id,
      action: 'BOOK_EQUIPMENT',
      entity: 'EquipmentBooking',
      entityId: booking.id,
      after: { equipmentId, bookingStart: start, bookingEnd: end, purpose },
      ipAddress: getClientIp(request),
    })

    // Notify institution admin
    if (equipment.institutionId) {
      const admins = await db.user.findMany({
        where: { institutionId: equipment.institutionId, role: 'INSTITUTION_ADMIN', isActive: true },
        select: { id: true },
      })
      for (const a of admins) {
        await db.notification.create({
          data: {
            userId: a.id,
            title: 'Tempahan Peralatan Baharu',
            message: `${user.fullName} menempah ${equipment.name} (${equipment.code}).`,
            type: 'INFO',
            category: 'EQUIPMENT',
            relatedId: booking.id,
            actionUrl: '/dashboard',
          },
        })
      }
    }

    return apiOk(booking, 'Tempahan dihantar untuk kelulusan.')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
