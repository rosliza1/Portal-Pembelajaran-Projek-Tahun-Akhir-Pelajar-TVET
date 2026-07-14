// GET /api/documents/[id] - Single document
// PATCH /api/documents/[id] - Supervisor review / approve (FR-15)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeInput,
} from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { id } = await ctx.params

  const doc = await db.document.findUnique({
    where: { id },
    include: {
      project: {
        include: { student: { include: { user: true } }, supervisor: { include: { user: true } } },
      },
      uploadedBy: { select: { id: true, fullName: true, email: true } },
    },
  })
  if (!doc) return apiError('Dokumen tidak dijumpai', 404)

  // RBAC
  if (user.role === 'STUDENT' && doc.project.student?.userId !== user.id) return apiForbidden()
  if (user.role === 'SUPERVISOR' && doc.project.supervisor?.userId !== user.id) return apiForbidden()
  if (user.role === 'INSTITUTION_ADMIN' && doc.project.institutionId !== user.institutionId) return apiForbidden()

  // Parse comments JSON for convenience
  const result: any = { ...doc }
  try { result.comments = doc.comments ? JSON.parse(doc.comments) : [] } catch { result.comments = [] }
  return apiOk(result)
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    const { id } = await ctx.params
    const ip = getClientIp(request)

    const body = await request.json()
    const action = body.action
    if (!['comment', 'approve'].includes(action)) {
      return apiError('action mesti "comment" atau "approve"', 422)
    }

    const doc = await db.document.findUnique({
      where: { id },
      include: { project: { include: { student: true, supervisor: true } } },
    })
    if (!doc) return apiError('Dokumen tidak dijumpai', 404)

    // Only supervisor / institution admin / JTM admin can review
    if (!['SUPERVISOR', 'INSTITUTION_ADMIN', 'JTM_ADMIN'].includes(user.role)) {
      return apiForbidden('Hanya penyelia/admin boleh menyemak dokumen.')
    }
    if (user.role === 'SUPERVISOR' && doc.project.supervisor?.userId !== user.id) {
      return apiForbidden('Anda bukan penyelia projek ini.')
    }

    const before = { status: doc.status, comments: doc.comments, reviewedAt: doc.reviewedAt }

    if (action === 'comment') {
      const comment = body.comment ? sanitizeInput(body.comment) : null
      if (!comment) return apiError('comment diperlukan', 422)
      const existing: any[] = (() => {
        try { return doc.comments ? JSON.parse(doc.comments) : [] } catch { return [] }
      })()
      existing.push({
        id: crypto.randomUUID(),
        userId: user.id,
        userName: user.fullName,
        comment,
        at: new Date().toISOString(),
      })
      const updated = await db.document.update({
        where: { id },
        data: {
          comments: JSON.stringify(existing),
          status: doc.status === 'UPLOADED' ? 'UNDER_REVIEW' : doc.status,
        },
      })
      await logAudit({
        userId: user.id,
        action: 'COMMENT_DOCUMENT',
        entity: 'Document',
        entityId: id,
        before,
        after: { status: updated.status, comments: existing.length },
        ipAddress: ip,
      })
      if (doc.project.student) {
        await db.notification.create({
          data: {
            userId: doc.project.student.userId,
            title: 'Komen Dokumen Baharu',
            message: `Penyelia menambah komen pada "${doc.title}".`,
            type: 'COMMENT',
            category: 'DOCUMENT',
            relatedId: id,
            actionUrl: '/dashboard',
          },
        })
      }
      return apiOk(updated, 'Komen ditambah.')
    }

    // approve
    const updated = await db.document.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedById: user.id,
      },
    })
    await logAudit({
      userId: user.id,
      action: 'APPROVE_DOCUMENT',
      entity: 'Document',
      entityId: id,
      before,
      after: { status: 'APPROVED', reviewedAt: updated.reviewedAt, reviewedById: user.id },
      ipAddress: ip,
    })
    if (doc.project.student) {
      await db.notification.create({
        data: {
          userId: doc.project.student.userId,
          title: 'Dokumen Diluluskan',
          message: `Dokumen "${doc.title}" (v${doc.version}) telah diluluskan.`,
          type: 'SUCCESS',
          category: 'DOCUMENT',
          relatedId: id,
          actionUrl: '/dashboard',
        },
      })
    }
    return apiOk(updated, 'Dokumen diluluskan.')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
