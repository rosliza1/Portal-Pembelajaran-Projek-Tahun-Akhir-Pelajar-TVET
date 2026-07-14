// GET /api/analytics?type=X - Aggregate stats for dashboards
// Types: student-stats | supervisor-stats | institution-stats | jtm-stats
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, apiOk, apiError, apiUnauthorized, apiForbidden } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'student-stats'
  // Optional target user id for admin queries (e.g. view another user's stats)
  const targetUserId = searchParams.get('userId') || user.id

  try {
    if (type === 'student-stats') return await studentStats(user, targetUserId)
    if (type === 'supervisor-stats') return await supervisorStats(user, targetUserId)
    if (type === 'institution-stats') return await institutionStats(user)
    if (type === 'jtm-stats') return await jtmStats(user)
    return apiError('jenis analytics tidak sah', 422)
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}

// =================== STUDENT STATS ===================
async function studentStats(user: any, targetUserId: string) {
  if (user.role !== 'STUDENT' && user.role !== 'JTM_ADMIN' && user.role !== 'DEVOPS') {
    return apiForbidden('Hanya pelajar (atau admin) boleh melihat statistik pelajar.')
  }
  // Students can only view own stats
  if (user.role === 'STUDENT' && targetUserId !== user.id) {
    return apiForbidden('Anda hanya boleh melihat statistik sendiri.')
  }
  const student = await db.student.findUnique({ where: { userId: targetUserId } })
  if (!student) return apiOk({ projectsByStatus: {}, pendingActions: {}, upcomingMilestones: [], totalProjects: 0 })

  // Projects by status
  const projectsByStatusRaw = await db.project.groupBy({
    by: ['status'],
    where: { studentId: student.id },
    _count: { _all: true },
  })
  const projectsByStatus: Record<string, number> = {}
  for (const r of projectsByStatusRaw) projectsByStatus[r.status] = r._count._all

  // Pending actions
  const projectIds = (await db.project.findMany({ where: { studentId: student.id }, select: { id: true } })).map((p) => p.id)
  const pendingLogbooks = await db.logbookEntry.count({
    where: { projectId: { in: projectIds }, status: 'PENDING' },
  })
  const pendingDocuments = await db.document.count({
    where: { projectId: { in: projectIds }, status: { in: ['UPLOADED', 'UNDER_REVIEW'] } },
  })
  const pendingApprovals = await db.project.count({
    where: { studentId: student.id, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
  })

  // Upcoming milestones (next 30 days)
  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 86400000)
  const upcomingMilestones = await db.milestone.findMany({
    where: {
      project: { studentId: student.id },
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      dueDate: { gte: now, lte: in30Days },
    },
    include: { project: { select: { id: true, title: true } } },
    orderBy: { dueDate: 'asc' },
    take: 10,
  })

  return apiOk({
    projectsByStatus,
    pendingActions: { pendingLogbooks, pendingDocuments, pendingApprovals },
    upcomingMilestones,
    totalProjects: Object.values(projectsByStatus).reduce((a, b) => a + b, 0),
  })
}

// =================== SUPERVISOR STATS ===================
async function supervisorStats(user: any, targetUserId: string) {
  if (user.role !== 'SUPERVISOR' && user.role !== 'JTM_ADMIN' && user.role !== 'DEVOPS') {
    return apiForbidden('Hanya penyelia (atau admin) boleh melihat statistik penyelia.')
  }
  if (user.role === 'SUPERVISOR' && targetUserId !== user.id) {
    return apiForbidden('Anda hanya boleh melihat statistik sendiri.')
  }
  const supervisor = await db.supervisor.findUnique({ where: { userId: targetUserId } })
  if (!supervisor) return apiOk({ studentsCount: 0, projectsByStatus: {}, pendingReviews: {}, averageScores: {}, totalProjects: 0 })

  // Students count
  const studentsCount = await db.student.count({ where: { supervisorId: supervisor.id } })

  // Projects by status
  const projectsByStatusRaw = await db.project.groupBy({
    by: ['status'],
    where: { supervisorId: supervisor.id },
    _count: { _all: true },
  })
  const projectsByStatus: Record<string, number> = {}
  for (const r of projectsByStatusRaw) projectsByStatus[r.status] = r._count._all

  // Pending reviews
  const projectIds = (await db.project.findMany({ where: { supervisorId: supervisor.id }, select: { id: true } })).map((p) => p.id)
  const pendingLogbooks = await db.logbookEntry.count({
    where: { projectId: { in: projectIds }, status: 'PENDING' },
  })
  const pendingDocuments = await db.document.count({
    where: { projectId: { in: projectIds }, status: { in: ['UPLOADED', 'UNDER_REVIEW'] } },
  })
  const pendingProposals = await db.project.count({
    where: { supervisorId: supervisor.id, status: 'SUBMITTED' },
  })

  // Average scores by evalType
  const evals = await db.evaluation.findMany({
    where: { projectId: { in: projectIds } },
    select: { evalType: true, totalScore: true },
  })
  const scoreSums: Record<string, { sum: number; count: number }> = {}
  for (const e of evals) {
    if (!scoreSums[e.evalType]) scoreSums[e.evalType] = { sum: 0, count: 0 }
    scoreSums[e.evalType].sum += e.totalScore
    scoreSums[e.evalType].count += 1
  }
  const averageScores: Record<string, number> = {}
  for (const [k, v] of Object.entries(scoreSums)) averageScores[k] = Math.round((v.sum / v.count) * 100) / 100

  return apiOk({
    studentsCount,
    projectsByStatus,
    pendingReviews: { pendingLogbooks, pendingDocuments, pendingProposals },
    averageScores,
    totalProjects: Object.values(projectsByStatus).reduce((a, b) => a + b, 0),
  })
}

// =================== INSTITUTION STATS ===================
async function institutionStats(user: any) {
  if (!['INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS'].includes(user.role)) {
    return apiForbidden('Hanya admin institusi (atau JTM) boleh melihat statistik institusi.')
  }
  const institutionId = user.institutionId
  if (!institutionId && user.role === 'INSTITUTION_ADMIN') return apiError('Institusi tidak ditetapkan', 422)

  // Total students/supervisors/projects
  const [totalStudents, totalSupervisors, totalProjects] = await Promise.all([
    db.user.count({ where: { institutionId, role: 'STUDENT' } }),
    db.user.count({ where: { institutionId, role: 'SUPERVISOR' } }),
    db.project.count({ where: { institutionId } }),
  ])

  // Projects by field
  const projectsByFieldRaw = await db.project.groupBy({
    by: ['field'],
    where: { institutionId },
    _count: { _all: true },
  })
  const projectsByField: Record<string, number> = {}
  for (const r of projectsByFieldRaw) projectsByField[r.field] = r._count._all

  // Projects by status
  const projectsByStatusRaw = await db.project.groupBy({
    by: ['status'],
    where: { institutionId },
    _count: { _all: true },
  })
  const projectsByStatus: Record<string, number> = {}
  for (const r of projectsByStatusRaw) projectsByStatus[r.status] = r._count._all

  // Average scores by evalType
  const projectIds = (await db.project.findMany({ where: { institutionId }, select: { id: true } })).map((p) => p.id)
  const evals = await db.evaluation.findMany({
    where: { projectId: { in: projectIds } },
    select: { evalType: true, totalScore: true },
  })
  const scoreSums: Record<string, { sum: number; count: number }> = {}
  for (const e of evals) {
    if (!scoreSums[e.evalType]) scoreSums[e.evalType] = { sum: 0, count: 0 }
    scoreSums[e.evalType].sum += e.totalScore
    scoreSums[e.evalType].count += 1
  }
  const averageScores: Record<string, number> = {}
  for (const [k, v] of Object.entries(scoreSums)) averageScores[k] = Math.round((v.sum / v.count) * 100) / 100

  // Completion rate
  const completed = projectsByStatus['COMPLETED'] || 0
  const completionRate = totalProjects > 0 ? Math.round((completed / totalProjects) * 10000) / 100 : 0

  return apiOk({
    totalStudents,
    totalSupervisors,
    totalProjects,
    projectsByField,
    projectsByStatus,
    averageScores,
    completionRate,
  })
}

// =================== JTM STATS (national KPIs) ===================
async function jtmStats(user: any) {
  if (!['JTM_ADMIN', 'DEVOPS'].includes(user.role)) {
    return apiForbidden('Hanya JTM admin boleh melihat statistik kebangsaan.')
  }

  // Total projects active (non-completed/non-rejected/non-draft)
  const totalActive = await db.project.count({
    where: { status: { notIn: ['COMPLETED', 'REJECTED', 'DRAFT'] } },
  })

  const totalProjects = await db.project.count()
  const completed = await db.project.count({ where: { status: 'COMPLETED' } })
  const completionRate = totalProjects > 0 ? Math.round((completed / totalProjects) * 10000) / 100 : 0

  // Avg marks by field & by institution (final_report evals)
  const evals = await db.evaluation.findMany({
    where: { evalType: 'final_report' },
    select: {
      totalScore: true,
      project: {
        select: {
          field: true,
          institutionId: true,
          institution: { select: { name: true, code: true } },
        },
      },
    },
  })
  const byField: Record<string, { sum: number; count: number }> = {}
  const byInstitution: Record<string, { sum: number; count: number; name: string; code: string }> = {}
  for (const e of evals) {
    if (!byField[e.project.field]) byField[e.project.field] = { sum: 0, count: 0 }
    byField[e.project.field].sum += e.totalScore
    byField[e.project.field].count += 1

    const instId = e.project.institutionId || 'unknown'
    if (!byInstitution[instId]) {
      byInstitution[instId] = {
        sum: 0, count: 0,
        name: e.project.institution?.name || 'Tidak diketahui',
        code: e.project.institution?.code || 'N/A',
      }
    }
    byInstitution[instId].sum += e.totalScore
    byInstitution[instId].count += 1
  }
  const avgMarksByField: Record<string, number> = {}
  for (const [k, v] of Object.entries(byField)) avgMarksByField[k] = Math.round((v.sum / v.count) * 100) / 100
  const avgMarksByInstitution = Object.entries(byInstitution).map(([id, v]) => ({
    institutionId: id,
    name: v.name,
    code: v.code,
    avgScore: Math.round((v.sum / v.count) * 100) / 100,
    count: v.count,
  }))

  // Projects by field
  const projectsByFieldRaw = await db.project.groupBy({
    by: ['field'],
    _count: { _all: true },
  })
  const projectsByField: Record<string, number> = {}
  for (const r of projectsByFieldRaw) projectsByField[r.field] = r._count._all

  // Projects by status
  const projectsByStatusRaw = await db.project.groupBy({
    by: ['status'],
    _count: { _all: true },
  })
  const projectsByStatus: Record<string, number> = {}
  for (const r of projectsByStatusRaw) projectsByStatus[r.status] = r._count._all

  // Projects by institution
  const projectsByInstitutionRaw = await db.project.groupBy({
    by: ['institutionId'],
    _count: { _all: true },
  })
  const instIds = projectsByInstitutionRaw.map((r) => r.institutionId).filter(Boolean) as string[]
  const institutions = await db.institution.findMany({ where: { id: { in: instIds } }, select: { id: true, name: true, code: true } })
  const instMap = new Map(institutions.map((i) => [i.id, i]))
  const projectsByInstitution = projectsByInstitutionRaw.map((r) => ({
    institutionId: r.institutionId,
    name: r.institutionId ? instMap.get(r.institutionId)?.name : 'Tidak diketahui',
    code: r.institutionId ? instMap.get(r.institutionId)?.code : 'N/A',
    count: r._count._all,
  }))

  // AI usage count
  const aiUsageCount = await db.aiChatLog.count()

  // Users by role
  const usersByRoleRaw = await db.user.groupBy({
    by: ['role'],
    _count: { _all: true },
  })
  const usersByRole: Record<string, number> = {}
  for (const r of usersByRoleRaw) usersByRole[r.role] = r._count._all

  return apiOk({
    totalActive,
    totalProjects,
    completed,
    completionRate,
    projectsByField,
    projectsByStatus,
    projectsByInstitution,
    avgMarksByField,
    avgMarksByInstitution,
    aiUsageCount,
    usersByRole,
  })
}
