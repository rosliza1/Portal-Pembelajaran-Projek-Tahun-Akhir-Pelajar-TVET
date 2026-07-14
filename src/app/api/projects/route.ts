// GET /api/projects - List projects (role-filtered)
// POST /api/projects - Create new project proposal (FR-06, FR-07)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden, sanitizeInput, sanitizeObject } from '@/lib/auth'

// Compute similarity score (FR-07): simple text overlap against existing project titles
async function computeSimilarity(title: string, field: string): Promise<number> {
  const existing = await db.project.findMany({ where: { field }, select: { title: true } })
  const titleLower = title.toLowerCase()
  const words = titleLower.split(/\s+/).filter((w) => w.length > 3)
  let maxScore = 0
  for (const p of existing) {
    const pWords = p.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    const common = words.filter((w) => pWords.includes(w)).length
    const score = (common / Math.max(words.length, pWords.length)) * 100
    if (score > maxScore) maxScore = score
  }
  return Math.round(maxScore * 100) / 100
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const field = searchParams.get('field')
  const search = searchParams.get('q')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

  let where: any = {}
  // RBAC filtering (RLS-equivalent)
  if (user.role === 'STUDENT') {
    // Student sees only their own projects
    where.student = { userId: user.id }
  } else if (user.role === 'SUPERVISOR') {
    where.supervisor = { userId: user.id }
  } else if (user.role === 'INSTITUTION_ADMIN') {
    where.institutionId = user.institutionId
  } else if (user.role === 'PANEL') {
    // Panel sees projects at institutions they can evaluate (for viva)
    where.status = { in: ['APPROVED', 'COMPLETED'] }
  } else if (user.role === 'JTM_ADMIN' || user.role === 'DEVOPS') {
    // All projects
  }
  if (status) where.status = status
  if (field) where.field = field
  if (search) where.title = { contains: search }

  const projects = await db.project.findMany({
    where,
    include: {
      student: { include: { user: true } },
      supervisor: { include: { user: true } },
      institution: true,
      program: true,
      _count: { select: { documents: true, logbookEntries: true, evaluations: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return apiOk(projects)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    if (user.role !== 'STUDENT') return apiForbidden('Hanya pelajar boleh mencipta cadangan projek.')

    const body = sanitizeObject(await request.json())
    const title = body.title?.trim()
    const field = body.field
    const scope = body.scope?.trim()
    const objectives = body.objectives?.trim()
    const bomList = body.bomList || null

    if (!title || !field || !scope) {
      return apiError('Tajuk, bidang dan skop diperlukan', 422)
    }
    if (!['Elektrik Kuasa', 'RAC'].includes(field)) {
      return apiError('Bidang tidak sah', 422)
    }
    // FR-07: similarity check
    const similarity = await computeSimilarity(title, field)

    // Get student record
    const student = await db.student.findUnique({ where: { userId: user.id } })
    if (!student) return apiError('Rekod pelajar tidak dijumpai', 404)

    const project = await db.project.create({
      data: {
        title,
        field,
        scope,
        objectives: objectives || '',
        bomList: bomList ? JSON.stringify(bomList) : null,
        scheduleStart: body.scheduleStart ? new Date(body.scheduleStart) : new Date(),
        scheduleEnd: body.scheduleEnd ? new Date(body.scheduleEnd) : new Date(Date.now() + 120 * 86400000),
        studentId: student.id,
        supervisorId: student.supervisorId,
        institutionId: user.institutionId,
        programId: user.programId,
        status: 'DRAFT',
        similarityScore: similarity,
        createdById: user.id,
      },
      include: { student: { include: { user: true } }, supervisor: { include: { user: true } }, institution: true, program: true },
    })
    // Auto-create milestones
    const stages = [
      { name: 'Cadangan Projek', stage: 'PROPOSAL', offset: 0 },
      { name: 'Progress 1', stage: 'PROGRESS_1', offset: 30 },
      { name: 'Progress 2', stage: 'PROGRESS_2', offset: 60 },
      { name: 'Pembentangan Viva', stage: 'VIVA', offset: 100 },
      { name: 'Penyerahan Akhir', stage: 'FINAL_SUBMISSION', offset: 120 },
    ]
    for (const s of stages) {
      await db.milestone.create({
        data: {
          projectId: project.id,
          name: s.name,
          stage: s.stage,
          dueDate: new Date(project.createdAt.getTime() + s.offset * 86400000),
          status: 'PENDING',
        },
      })
    }
    await logAudit({ userId: user.id, action: 'CREATE_PROJECT', entity: 'Project', entityId: project.id, after: { title, field, status: 'DRAFT' }, ipAddress: getClientIp(request) })
    // Notify supervisor
    if (project.supervisorId) {
      const supervisor = await db.supervisor.findUnique({ where: { id: project.supervisorId } })
      if (supervisor) {
        await db.notification.create({
          data: {
            userId: supervisor.userId,
            title: 'Cadangan Projek Baharu',
            message: `${user.fullName} telah mencipta cadangan projek: "${title}"`,
            type: 'INFO', category: 'PROJECT', relatedId: project.id, actionUrl: '/dashboard',
          },
        })
      }
    }
    return apiOk(project, 'Cadangan projek dicipta. Sila hantar untuk kelulusan penyelia.')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
