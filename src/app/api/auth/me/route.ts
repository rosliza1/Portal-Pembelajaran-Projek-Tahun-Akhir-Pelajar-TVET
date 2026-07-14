// GET /api/auth/me - Get current authenticated user
import { getCurrentUser, toSafeUser, apiOk, apiUnauthorized } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  return apiOk(toSafeUser(user))
}
