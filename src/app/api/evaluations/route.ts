// GET /api/evaluations?projectId=X - List evaluations for a project (RBAC)
// POST /api/evaluations - Supervisor or Panel submits evaluation (FR-21, FR-22)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeObject, sanitizeInput,
} from '@/lib/auth'

const VALID_EVAL_TYPES = ['supervisor_progress', 'panel_viva', 'final_report']

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

  // RBAC: student sees own project, supervisor/panel see assigned, admin see institution
  if (user.role === 'STUDENT' && project.student?.userId !== user.id) return apiForbidden()
  if (user.role === 'SUPERVISOR' && project.supervisor?.userId !== user.id) return apiForbidden()
  if (user.role === 'INSTITUTION_ADMIN' && project.institutionId !== user.institutionId) return apiForbidden()

  const evaluations = await db.evaluation.findMany({
    where: { projectId },
    include: {
      evaluator: { select: { id: true, fullName: true, email: true, role: true } },
      rubric: true,
    },
    orderBy: { submittedAt: 'desc' },
  })
  // Parse criterionScores JSON
  const result = evaluations.map((e) => {
    let scores: any = {}
    try { scores = e.criterionScores ? JSON.parse(e.criterionScores) : {} } catch { scores = {} }
    return { ...e, criterionScores: scores }
  })
  return apiOk(result)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    if (!['SUPERVISOR', 'PANEL', 'INSTITUTION_ADMIN', 'JTM_ADMIN'].includes(user.role)) {
      return apiForbidden('Hanya penyelia/panel/admin boleh menilai.')
    }

    const body = sanitizeObject(await request.json())
    const projectId = body.projectId
    const rubricId = body.rubricId
    const criterionScores = body.criterionScores
    const evalType = body.evalType
    const comments = body.comments ? sanitizeInput(body.comments) : null

    if (!projectId || !rubricId || !criterionScores || !evalType) {
      return apiError('projectId, rubricId, criterionScores, evalType diperlukan', 422)
    }
    if (!VALID_EVAL_TYPES.includes(evalType)) return apiError('evalType tidak sah', 422)

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { student: true, supervisor: true },
    })
    if (!project) return apiError('Projek tidak dijumpai', 404)

    // Validate evaluator is assigned (supervisor of project OR panel/admin)
    const isSupervisor = project.supervisor?.userId === user.id
    const isPanel = user.role === 'PANEL'
    const isAdmin = ['INSTITUTION_ADMIN', 'JTM_ADMIN'].includes(user.role)
    if (!isSupervisor && !isPanel && !isAdmin) {
      return apiForbidden('Anda tidak ditugaskan untuk menilai projek ini.')
    }
    if (user.role === 'INSTITUTION_ADMIN' && project.institutionId !== user.institutionId) return apiForbidden()

    const rubric = await db.rubric.findUnique({ where: { id: rubricId } })
    if (!rubric) return apiError('Rubrik tidak dijumpai', 404)

    // Auto-calc totalScore by summing criterion scores
    let totalScore = 0
    let rubricCriteria: any[] = []
    try { rubricCriteria = rubric.criteria ? JSON.parse(rubric.criteria) : [] } catch { rubricCriteria = [] }
    for (const c of rubricCriteria) {
      const score = Number(criterionScores[c.key] || 0)
      if (typeof score !== 'number' || score < 0 || score > c.maxScore) {
        return apiError(`Skor untuk ${c.label} tidak sah (maks: ${c.maxScore})`, 422)
      }
      totalScore += score
    }

    const evaluation = await db.evaluation.create({
      data: {
        projectId,
        evaluatorId: user.id,
        rubricId,
        criterionScores: JSON.stringify(criterionScores),
        totalScore,
        evalType,
        comments,
      },
      include: {
        evaluator: { select: { id: true, fullName: true, email: true, role: true } },
        rubric: true,
      },
    })

    await logAudit({
      userId: user.id,
      action: 'SUBMIT_EVALUATION',
      entity: 'Evaluation',
      entityId: evaluation.id,
      after: { projectId, rubricId, evalType, totalScore },
      ipAddress: getClientIp(request),
    })

    // Notify student
    if (project.student) {
      await db.notification.create({
        data: {
          userId: project.student.userId,
          title: 'Penilaian Baharu Diterima',
          message: `Penilaian ${evalType.replace('_', ' ')} telah dihantar untuk projek "${project.title}". Skor: ${totalScore}.`,
          type: 'INFO',
          category: 'EVALUATION',
          relatedId: evaluation.id,
          actionUrl: '/dashboard',
        },
      })
    }

    let result: any = { ...evaluation }
    result.criterionScores = criterionScores
    return apiOk(result, 'Penilaian dihantar.')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
