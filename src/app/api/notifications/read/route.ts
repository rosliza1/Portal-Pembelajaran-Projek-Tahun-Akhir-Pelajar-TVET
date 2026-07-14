// POST /api/notifications/read - Mark notifications as read
// Body: { id? } — if id provided, mark only that one; otherwise all unread
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, apiOk, apiError, apiUnauthorized } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()

    const body = await request.json().catch(() => ({}))
    const id = body.id

    if (id) {
      // Verify ownership
      const n = await db.notification.findUnique({ where: { id } })
      if (!n || n.userId !== user.id) return apiError('Notifikasi tidak dijumpai', 404)
      const updated = await db.notification.update({ where: { id }, data: { isRead: true } })
      return apiOk(updated, 'Notifikasi ditanda sebagai dibaca.')
    }

    const result = await db.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    })
    return apiOk({ updated: result.count }, `${result.count} notifikasi ditanda sebagai dibaca.`)
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
