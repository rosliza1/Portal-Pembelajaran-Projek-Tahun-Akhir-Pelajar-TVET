// GET /api/notifications?unreadOnly=true - List notifications for current user
// POST /api/notifications - Internal helper to create (admin/system)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeObject, sanitizeInput,
} from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unreadOnly') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

  const where: any = { userId: user.id }
  if (unreadOnly) where.isRead = false

  const notifications = await db.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return apiOk(notifications)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    // Internal helper — only admin/system can create notifications for other users
    if (!['INSTITUTION_ADMIN', 'JTM_ADMIN', 'DEVOPS'].includes(user.role)) {
      return apiForbidden('Hanya admin boleh mencipta notifikasi sistem.')
    }

    const body = sanitizeObject(await request.json())
    const userId = body.userId
    const title = body.title?.trim()
    const message = body.message?.trim()
    const type = body.type || 'INFO'
    const category = body.category || 'SYSTEM'
    const relatedId = body.relatedId || null
    const actionUrl = body.actionUrl || null

    if (!userId || !title || !message) {
      return apiError('userId, title, message diperlukan', 422)
    }

    const notification = await db.notification.create({
      data: { userId, title, message, type, category, relatedId, actionUrl, isRead: false },
    })
    return apiOk(notification, 'Notifikasi dicipta.')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
