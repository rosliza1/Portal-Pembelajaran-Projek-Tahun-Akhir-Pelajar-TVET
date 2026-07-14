// GET /api/institutions - List all institutions (authenticated)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, apiOk, apiUnauthorized } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // Institutions list is public (needed for registration form before login)
  const user = await getCurrentUser()
  // If authenticated, include counts; otherwise return minimal public data
  if (user) {
    const institutions = await db.institution.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true, projects: true, equipment: true } } },
    })
    return apiOk(institutions)
  }
  const institutions = await db.institution.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, code: true, name: true, type: true, state: true },
  })
  return apiOk(institutions)
}
