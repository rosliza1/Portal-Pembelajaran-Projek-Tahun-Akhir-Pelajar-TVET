// PATCH /api/equipment/bookings/[id] - Institution admin approve/reject/return (FR-32)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeInput,
} from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    const { id } = await ctx.params
    const ip = getClientIp(request)

    if (!['INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS'].includes(user.role)) {
      return apiForbidden('Hanya admin boleh meluluskan/menolak/memulangkan tempahan.')
    }

    const body = await request.json()
    const action = body.action
    if (!['approve', 'reject', 'return'].includes(action)) {
      return apiError('action mesti "approve", "reject" atau "return"', 422)
    }
    const returnNotes = body.returnNotes ? sanitizeInput(body.returnNotes) : null

    const booking = await db.equipmentBooking.findUnique({
      where: { id },
      include: { equipment: true, student: true },
    })
    if (!booking) return apiError('Tempahan tidak dijumpai', 404)

    // RBAC: institution admin must own the equipment's institution
    if (user.role === 'INSTITUTION_ADMIN' && booking.equipment.institutionId !== user.institutionId) {
      return apiForbidden()
    }

    const before = { status: booking.status, approvedById: booking.approvedById, returnNotes: booking.returnNotes }
    const data: any = { approvedById: user.id }
    let message = ''

    if (action === 'approve') {
      if (booking.status !== 'PENDING') return apiError('Hanya tempahan PENDING boleh diluluskan', 422)
      if (booking.equipment.availableQty <= 0) return apiError('Stok tiada', 422, 'OUT_OF_STOCK')
      data.status = 'APPROVED'
      data.approvedAt = new Date()
      // Decrement availableQty
      await db.equipment.update({
        where: { id: booking.equipmentId },
        data: { availableQty: { decrement: 1 }, status: 'BOOKED' },
      })
      message = 'Tempahan diluluskan.'
    } else if (action === 'reject') {
      if (booking.status !== 'PENDING') return apiError('Hanya tempahan PENDING boleh ditolak', 422)
      data.status = 'REJECTED'
      data.approvedAt = new Date()
      message = 'Tempahan ditolak.'
    } else {
      // return
      if (booking.status !== 'APPROVED') return apiError('Hanya tempahan APPROVED boleh dipulangkan', 422)
      data.status = 'RETURNED'
      data.returnNotes = returnNotes
      // Increment availableQty
      await db.equipment.update({
        where: { id: booking.equipmentId },
        data: { availableQty: { increment: 1 }, status: 'AVAILABLE' },
      })
      message = 'Peralatan dipulangkan.'
    }

    const updated = await db.equipmentBooking.update({ where: { id }, data })

    await logAudit({
      userId: user.id,
      action: action === 'approve' ? 'APPROVE_BOOKING' : action === 'reject' ? 'REJECT_BOOKING' : 'RETURN_EQUIPMENT',
      entity: 'EquipmentBooking',
      entityId: id,
      before,
      after: { status: data.status, returnNotes: data.returnNotes || null },
      ipAddress: ip,
    })

    // Notify student
    await db.notification.create({
      data: {
        userId: booking.studentId,
        title: `Tempahan ${action === 'approve' ? 'Diluluskan' : action === 'reject' ? 'Ditolak' : 'Dipulangkan'}`,
        message: `Tempahan ${booking.equipment.name}: ${message}${returnNotes ? ` Nota: ${returnNotes}` : ''}`,
        type: action === 'reject' ? 'WARNING' : 'SUCCESS',
        category: 'EQUIPMENT',
        relatedId: id,
        actionUrl: '/dashboard',
      },
    })

    return apiOk(updated, message)
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
