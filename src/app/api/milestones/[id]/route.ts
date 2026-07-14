// PATCH /api/milestones/[id] - Update status / completedAt / vivaSlot (FR-19 double-booking)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeInput,
} from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']
const VIVA_WINDOW_HOURS = 2

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    const { id } = await ctx.params
    const ip = getClientIp(request)

    const body = await request.json()
    const milestone = await db.milestone.findUnique({
      where: { id },
      include: { project: { include: { student: { include: { supervisor: true } }, supervisor: true } } },
    })
    if (!milestone) return apiError('Milestone tidak dijumpai', 404)

    // RBAC: only supervisor / institution admin / JTM admin can update milestone
    if (!['SUPERVISOR', 'INSTITUTION_ADMIN', 'JTM_ADMIN'].includes(user.role)) {
      return apiForbidden('Anda tidak dibenarkan mengemas kini milestone.')
    }
    if (user.role === 'SUPERVISOR' && milestone.project.supervisor?.userId !== user.id) {
      return apiForbidden('Anda bukan penyelia projek ini.')
    }
    if (user.role === 'INSTITUTION_ADMIN' && milestone.project.institutionId !== user.institutionId) {
      return apiForbidden()
    }

    const before = { status: milestone.status, completedAt: milestone.completedAt, vivaSlot: milestone.vivaSlot }
    const data: any = {}
    if (body.status) {
      if (!VALID_STATUSES.includes(body.status)) return apiError('status tidak sah', 422)
      data.status = body.status
      if (body.status === 'COMPLETED' && !milestone.completedAt) {
        data.completedAt = body.completedAt ? new Date(body.completedAt) : new Date()
      }
    }
    if (body.completedAt !== undefined) data.completedAt = body.completedAt ? new Date(body.completedAt) : null
    if (body.vivaSlot !== undefined) {
      const vivaSlot = body.vivaSlot ? new Date(body.vivaSlot) : null
      if (vivaSlot) {
        // FR-19 double-booking detection: check no overlapping viva for same student/supervisor within 2 hours
        const windowStart = new Date(vivaSlot.getTime() - VIVA_WINDOW_HOURS * 3600 * 1000)
        const windowEnd = new Date(vivaSlot.getTime() + VIVA_WINDOW_HOURS * 3600 * 1000)

        // Find overlapping viva slots on other milestones for the same project's student/supervisor
        const studentId = milestone.project.studentId
        const supervisorId = milestone.project.supervisorId
        const conflictingMilestones = await db.milestone.findMany({
          where: {
            id: { not: id },
            vivaSlot: { not: null, gte: windowStart, lte: windowEnd },
            project: {
              OR: [
                studentId ? { studentId } : {},
                supervisorId ? { supervisorId } : {},
              ],
            },
          },
          include: { project: { select: { title: true } } },
        })
        if (conflictingMilestones.length > 0) {
          const c = conflictingMilestones[0]
          return apiError(
            `Konflik jadual viva dikesan dengan projek lain (${c.project.title}) dalam tempoh ${VIVA_WINDOW_HOURS} jam.`,
            422,
            'VIVA_CONFLICT',
          )
        }
      }
      data.vivaSlot = vivaSlot
    }
    if (body.notes !== undefined) data.notes = body.notes ? sanitizeInput(body.notes) : null

    const updated = await db.milestone.update({ where: { id }, data })

    await logAudit({
      userId: user.id,
      action: 'UPDATE_MILESTONE',
      entity: 'Milestone',
      entityId: id,
      before,
      after: data,
      ipAddress: ip,
    })

    // If viva slot set, notify student
    if (data.vivaSlot && milestone.project.student) {
      const student = await db.student.findUnique({ where: { id: milestone.project.studentId! }, include: { user: true } })
      if (student) {
        await db.notification.create({
          data: {
            userId: student.userId,
            title: 'Slot Viva Dijadualkan',
            message: `Viva untuk "${milestone.project.title}" dijadualkan pada ${new Date(data.vivaSlot).toLocaleString('ms-MY')}.`,
            type: 'DEADLINE',
            category: 'PROJECT',
            relatedId: milestone.projectId,
            actionUrl: '/dashboard',
          },
        })
      }
    }

    return apiOk(updated, 'Milestone dikemas kini.')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
