// GET /api/milestones?projectId=X - List milestones (RBAC)
// POST /api/milestones - Institution admin creates milestone (FR-17)
// PATCH /api/milestones/[id] - Update status / mark completed / set vivaSlot (FR-19 double-booking)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeObject, sanitizeInput,
} from '@/lib/auth'

const VALID_STAGES = ['PROPOSAL', 'PROGRESS_1', 'PROGRESS_2', 'VIVA', 'FINAL_SUBMISSION']
const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return apiError('projectId diperlukan', 422)

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { student: true, supervisor: true },
  })
  if (!project) return apiError('Projek tidak dijumpai', 404)

  // RBAC
  if (user.role === 'STUDENT' && project.student?.userId !== user.id) return apiForbidden()
  if (user.role === 'SUPERVISOR' && project.supervisor?.userId !== user.id) return apiForbidden()
  if (user.role === 'INSTITUTION_ADMIN' && project.institutionId !== user.institutionId) return apiForbidden()

  const milestones = await db.milestone.findMany({
    where: { projectId },
    orderBy: { dueDate: 'asc' },
  })
  return apiOk(milestones)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    if (!['INSTITUTION_ADMIN', 'JTM_ADMIN'].includes(user.role)) {
      return apiForbidden('Hanya admin institusi/JTM boleh mencipta milestone.')
    }

    const body = sanitizeObject(await request.json())
    const projectId = body.projectId
    const name = body.name?.trim()
    const stage = body.stage
    const dueDate = body.dueDate
    const vivaSlot = body.vivaSlot || null

    if (!projectId || !name || !stage || !dueDate) {
      return apiError('projectId, name, stage, dueDate diperlukan', 422)
    }
    if (!VALID_STAGES.includes(stage)) {
      return apiError('stage tidak sah', 422)
    }

    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) return apiError('Projek tidak dijumpai', 404)
    if (user.role === 'INSTITUTION_ADMIN' && project.institutionId !== user.institutionId) return apiForbidden()

    const milestone = await db.milestone.create({
      data: {
        projectId,
        name,
        stage,
        dueDate: new Date(dueDate),
        vivaSlot: vivaSlot ? new Date(vivaSlot) : null,
        status: 'PENDING',
      },
    })

    await logAudit({
      userId: user.id,
      action: 'CREATE_MILESTONE',
      entity: 'Milestone',
      entityId: milestone.id,
      after: { projectId, name, stage, dueDate },
      ipAddress: getClientIp(request),
    })

    return apiOk(milestone, 'Milestone dicipta.')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
