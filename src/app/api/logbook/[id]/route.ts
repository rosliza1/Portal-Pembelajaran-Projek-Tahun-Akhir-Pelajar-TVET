// GET /api/logbook/[id] - Single entry with project relation
// PATCH /api/logbook/[id] - Supervisor sign-off / reject (FR-11)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeInput,
} from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { id } = await ctx.params

  const entry = await db.logbookEntry.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          student: { include: { user: true } },
          supervisor: { include: { user: true } },
        },
      },
      student: { select: { id: true, fullName: true, email: true } },
    },
  })
  if (!entry) return apiError('Entri logbook tidak dijumpai', 404)

  // RBAC
  if (user.role === 'STUDENT' && entry.project.student?.userId !== user.id) return apiForbidden()
  if (user.role === 'SUPERVISOR' && entry.project.supervisor?.userId !== user.id) return apiForbidden()
  if (user.role === 'INSTITUTION_ADMIN' && entry.project.institutionId !== user.institutionId) return apiForbidden()

  return apiOk(entry)
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    const { id } = await ctx.params
    const ip = getClientIp(request)

    const body = await request.json()
    const action = body.action
    const supervisorComment = body.supervisorComment ? sanitizeInput(body.supervisorComment) : null

    if (!['signoff', 'reject'].includes(action)) {
      return apiError('action mesti "signoff" atau "reject"', 422)
    }

    const entry = await db.logbookEntry.findUnique({
      where: { id },
      include: { project: { include: { student: true, supervisor: true } } },
    })
    if (!entry) return apiError('Entri logbook tidak dijumpai', 404)

    // Only the project's assigned supervisor can sign off
    if (user.role !== 'SUPERVISOR' && user.role !== 'INSTITUTION_ADMIN' && user.role !== 'JTM_ADMIN') {
      return apiForbidden('Hanya penyelia boleh menandatangani logbook.')
    }
    if (user.role === 'SUPERVISOR' && entry.project.supervisor?.userId !== user.id) {
      return apiForbidden('Anda bukan penyelia projek ini.')
    }

    const before = { status: entry.status, signedOffAt: entry.signedOffAt, supervisorComment: entry.supervisorComment }

    if (entry.status !== 'PENDING') {
      return apiError(`Entri sudah ${entry.status === 'SIGNED_OFF' ? 'ditandatangani' : 'ditolak'}.`, 422)
    }

    const newStatus = action === 'signoff' ? 'SIGNED_OFF' : 'REJECTED'
    const updated = await db.logbookEntry.update({
      where: { id },
      data: {
        status: newStatus,
        signedOffAt: new Date(),
        signedOffById: user.id,
        supervisorComment,
      },
    })

    await logAudit({
      userId: user.id,
      action: action === 'signoff' ? 'SIGNOFF_LOGBOOK' : 'REJECT_LOGBOOK',
      entity: 'LogbookEntry',
      entityId: id,
      before,
      after: { status: newStatus, signedOffAt: updated.signedOffAt, supervisorComment },
      ipAddress: ip,
    })

    // Notify student
    if (entry.project.student) {
      await db.notification.create({
        data: {
          userId: entry.project.student.userId,
          title: action === 'signoff' ? 'Logbook Ditandatangani' : 'Logbook Ditolak',
          message: `Entri minggu ${entry.weekNumber} ${action === 'signoff' ? 'telah ditandatangani penyelia' : 'ditolak'}.${supervisorComment ? ` Catatan: ${supervisorComment}` : ''}`,
          type: action === 'signoff' ? 'SUCCESS' : 'WARNING',
          category: 'LOGBOOK',
          relatedId: id,
          actionUrl: '/dashboard',
        },
      })
    }

    return apiOk(updated, action === 'signoff' ? 'Logbook ditandatangani.' : 'Logbook ditolak.')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
