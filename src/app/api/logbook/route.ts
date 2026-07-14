// GET /api/logbook?projectId=X&weekNumber=Y - List logbook entries (RBAC)
// POST /api/logbook - Student creates weekly entry (FR-10)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeInput, sanitizeObject,
} from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const weekNumber = searchParams.get('weekNumber')
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

  const where: any = { projectId }
  if (weekNumber) where.weekNumber = parseInt(weekNumber)

  const entries = await db.logbookEntry.findMany({
    where,
    include: { student: { select: { id: true, fullName: true, email: true } } },
    orderBy: { weekNumber: 'asc' },
  })
  return apiOk(entries)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    if (user.role !== 'STUDENT') return apiForbidden('Hanya pelajar boleh mencipta entri logbook.')

    const body = sanitizeObject(await request.json())
    const projectId = body.projectId
    const weekNumber = parseInt(body.weekNumber)
    const tasksDone = body.tasksDone?.trim()
    const hoursWorked = parseFloat(body.hoursWorked) || 0
    const issuesFaced = body.issuesFaced?.trim() || null
    const attachments = body.attachments || null

    if (!projectId || !weekNumber || !tasksDone) {
      return apiError('projectId, weekNumber dan tasksDone diperlukan', 422)
    }
    if (weekNumber < 1 || weekNumber > 30) {
      return apiError('weekNumber tidak sah (1-30)', 422)
    }
    if (hoursWorked < 0 || hoursWorked > 168) {
      return apiError('hoursWorked tidak sah', 422)
    }

    const project = await db.project.findUnique({ where: { id: projectId }, include: { student: true } })
    if (!project) return apiError('Projek tidak dijumpai', 404)
    if (project.student?.userId !== user.id) return apiForbidden('Anda bukan pemilik projek ini.')

    // Unique constraint (projectId, weekNumber) — prevent duplicate
    const existing = await db.logbookEntry.findUnique({
      where: { projectId_weekNumber: { projectId, weekNumber } },
    })
    if (existing) return apiError(`Entri minggu ${weekNumber} sudah wujud. Sila kemaskini.`, 422)

    const entry = await db.logbookEntry.create({
      data: {
        projectId,
        studentId: user.id,
        weekNumber,
        tasksDone,
        hoursWorked,
        issuesFaced,
        attachments: attachments ? JSON.stringify(attachments) : null,
        status: 'PENDING',
      },
      include: { project: { select: { id: true, title: true } } },
    })

    await logAudit({
      userId: user.id,
      action: 'CREATE_LOGBOOK',
      entity: 'LogbookEntry',
      entityId: entry.id,
      after: { projectId, weekNumber, hoursWorked },
      ipAddress: getClientIp(request),
    })

    // Notify supervisor
    if (project.supervisorId) {
      const sup = await db.supervisor.findUnique({ where: { id: project.supervisorId } })
      if (sup) {
        await db.notification.create({
          data: {
            userId: sup.userId,
            title: 'Entri Logbook Baharu',
            message: `Minggu ${weekNumber} logbook untuk projek "${project.title}" memerlukan semakan.`,
            type: 'INFO',
            category: 'LOGBOOK',
            relatedId: entry.id,
            actionUrl: '/dashboard',
          },
        })
      }
    }

    return apiOk(entry, 'Entri logbook dicipta.')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
