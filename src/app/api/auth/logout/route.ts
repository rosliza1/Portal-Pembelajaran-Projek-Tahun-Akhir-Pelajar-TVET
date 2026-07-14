// POST /api/auth/logout - Clear session
import { NextRequest } from 'next/server'
import { clearSession, getCurrentUser, logAudit, apiOk, apiError } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (user) {
      await logAudit({ userId: user.id, action: 'LOGOUT', entity: 'User', entityId: user.id, ipAddress: request.headers.get('x-forwarded-for') || undefined })
    }
    await clearSession()
    return apiOk(null, 'Log keluar berjaya')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
