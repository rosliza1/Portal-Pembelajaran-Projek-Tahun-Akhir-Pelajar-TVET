// /api/projects/[id] - GET, PATCH (update), and role-based status transitions
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden, sanitizeInput, sanitizeObject } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { id } = await ctx.params
  const project = await db.project.findUnique({
    where: { id },
    include: {
      student: { include: { user: true } },
      supervisor: { include: { user: true } },
      institution: true, program: true,
      documents: { orderBy: { createdAt: 'desc' } },
      logbookEntries: { orderBy: { weekNumber: 'asc' }, include: { student: true } },
      milestones: { orderBy: { dueDate: 'asc' } },
      evaluations: { include: { evaluator: true, rubric: true } },
      projectMembers: { include: { student: { include: { user: true } } } },
    },
  })
  if (!project) return apiError('Projek tidak dijumpai', 404)
  // RBAC
  if (user.role === 'STUDENT' && project.student?.userId !== user.id) return apiForbidden()
  if (user.role === 'SUPERVISOR' && project.supervisor?.userId !== user.id) return apiForbidden()
  if (user.role === 'INSTITUTION_ADMIN' && project.institutionId !== user.institutionId) return apiForbidden()
  return apiOk(project)
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { id } = await ctx.params
  const project = await db.project.findUnique({ where: { id }, include: { student: true, supervisor: true } })
  if (!project) return apiError('Projek tidak dijumpai', 404)

  const body = sanitizeObject(await request.json())
  const ip = getClientIp(request)

  // Status transition (FR-08, FR-09)
  if (body.action) {
    const action = body.action
    if (action === 'submit') {
      // Student submits draft → SUBMITTED
      if (user.role !== 'STUDENT' || project.student?.userId !== user.id) return apiForbidden('Hanya pemilik projek boleh menghantar.')
      if (project.status !== 'DRAFT' && project.status !== 'REJECTED') return apiError('Hanya draf atau cadangan yang ditolak boleh dihantar semula', 422)
      const updated = await db.project.update({ where: { id }, data: { status: 'SUBMITTED' } })
      await logAudit({ userId: user.id, action: 'SUBMIT_PROPOSAL', entity: 'Project', entityId: id, before: { status: project.status }, after: { status: 'SUBMITTED' }, ipAddress: ip })
      // Notify supervisor
      if (project.supervisorId) {
        const sup = await db.supervisor.findUnique({ where: { id: project.supervisorId } })
        if (sup) await db.notification.create({ data: { userId: sup.userId, title: 'Cadangan Menunggu Semakan', message: `Cadangan projek "${project.title}" memerlukan semakan.`, type: 'INFO', category: 'PROJECT', relatedId: id, actionUrl: '/dashboard' } })
      }
      return apiOk(updated, 'Cadangan dihantar kepada penyelia untuk semakan.')
    }
    if (action === 'approve') {
      // Supervisor/Inst Admin/JTM Admin approves
      if (!['SUPERVISOR', 'INSTITUTION_ADMIN', 'JTM_ADMIN'].includes(user.role)) return apiForbidden()
      if (user.role === 'SUPERVISOR' && project.supervisor?.userId !== user.id) return apiForbidden()
      const updated = await db.project.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date(), approvedById: user.id, rejectionReason: null } })
      await logAudit({ userId: user.id, action: 'APPROVE_PROPOSAL', entity: 'Project', entityId: id, before: { status: project.status }, after: { status: 'APPROVED' }, ipAddress: ip })
      // Notify student
      if (project.student) {
        await db.notification.create({ data: { userId: project.student.userId, title: 'Cadangan Diluluskan', message: `Cadangan projek "${project.title}" telah diluluskan.`, type: 'SUCCESS', category: 'PROJECT', relatedId: id, actionUrl: '/dashboard' } })
      }
      return apiOk(updated, 'Cadangan diluluskan.')
    }
    if (action === 'reject') {
      if (!['SUPERVISOR', 'INSTITUTION_ADMIN', 'JTM_ADMIN'].includes(user.role)) return apiForbidden()
      if (!body.reason) return apiError('Sebab penolakan diperlukan', 422)
      const updated = await db.project.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: body.reason } })
      await logAudit({ userId: user.id, action: 'REJECT_PROPOSAL', entity: 'Project', entityId: id, before: { status: project.status }, after: { status: 'REJECTED', reason: body.reason }, ipAddress: ip })
      if (project.student) {
        await db.notification.create({ data: { userId: project.student.userId, title: 'Cadangan Ditolak', message: `Cadangan projek "${project.title}" telah ditolak. Sebab: ${body.reason}`, type: 'WARNING', category: 'PROJECT', relatedId: id, actionUrl: '/dashboard' } })
      }
      return apiOk(updated, 'Cadangan ditolak dengan catatan.')
    }
    if (action === 'complete') {
      // Only JTM admin or institution admin can mark completed (after viva)
      if (!['INSTITUTION_ADMIN', 'JTM_ADMIN'].includes(user.role)) return apiForbidden()
      const updated = await db.project.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date() } })
      await logAudit({ userId: user.id, action: 'COMPLETE_PROJECT', entity: 'Project', entityId: id, before: { status: project.status }, after: { status: 'COMPLETED' }, ipAddress: ip })
      return apiOk(updated, 'Projek ditandakan sebagai Selesai dan diarkibkan.')
    }
  }

  // General edit (only DRAFT or REJECTED, by student owner)
  if (user.role === 'STUDENT' && project.student?.userId === user.id && (project.status === 'DRAFT' || project.status === 'REJECTED')) {
    const data: any = {}
    if (body.title) data.title = body.title
    if (body.field) data.field = body.field
    if (body.scope) data.scope = body.scope
    if (body.objectives) data.objectives = body.objectives
    if (body.bomList) data.bomList = JSON.stringify(body.bomList)
    const updated = await db.project.update({ where: { id }, data })
    await logAudit({ userId: user.id, action: 'UPDATE_PROJECT', entity: 'Project', entityId: id, after: data, ipAddress: ip })
    return apiOk(updated, 'Projek dikemas kini.')
  }
  return apiForbidden('Anda tidak dibenarkan mengubah projek ini pada status semasa.')
}
