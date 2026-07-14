// GET /api/repository?q=X&field=X&year=X&institutionId=X - Search completed projects archive (FR-24)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, apiOk, apiUnauthorized } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const field = searchParams.get('field')
  const year = searchParams.get('year')
  const institutionId = searchParams.get('institutionId')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

  const where: any = { status: 'COMPLETED' }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { scope: { contains: q } },
      { objectives: { contains: q } },
    ]
  }
  if (field) where.field = field
  if (institutionId) where.institutionId = institutionId
  if (year) {
    const start = new Date(`${year}-01-01`)
    const end = new Date(`${year}-12-31T23:59:59`)
    where.completedAt = { gte: start, lte: end }
  }

  const projects = await db.project.findMany({
    where,
    select: {
      id: true,
      title: true,
      field: true,
      scope: true,
      objectives: true,
      completedAt: true,
      similarityScore: true,
      institution: { select: { id: true, name: true, code: true } },
      program: { select: { id: true, name: true, field: true } },
      student: { include: { user: { select: { fullName: true, email: true } } } },
      supervisor: { include: { user: { select: { fullName: true, email: true } } } },
      // Do NOT return full report / BOM — only metadata
    },
    orderBy: { completedAt: 'desc' },
    take: limit,
  })

  // Compute aggregate average mark if available
  const projectIds = projects.map((p) => p.id)
  const evaluations = await db.evaluation.findMany({
    where: { projectId: { in: projectIds }, evalType: 'final_report' },
    select: { projectId: true, totalScore: true },
  })
  const avgByProject = new Map<string, number>()
  for (const e of evaluations) {
    const arr = avgByProject.get(e.projectId) || 0
    avgByProject.set(e.projectId, arr + e.totalScore)
  }
  // Simpler: just attach avg final score where present
  const result = projects.map((p) => ({
    ...p,
    avgFinalScore: avgByProject.get(p.id) || null,
  }))

  return apiOk(result)
}
