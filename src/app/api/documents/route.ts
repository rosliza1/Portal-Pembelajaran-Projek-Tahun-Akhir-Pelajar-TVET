// GET /api/documents?projectId=X - List documents (RBAC)
// POST /api/documents - Student uploads document metadata (FR-13, FR-16)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, apiForbidden,
  sanitizeObject, sanitizeInput,
} from '@/lib/auth'

const VALID_TYPES = ['PROPOSAL', 'DRAFT_CHAPTER', 'FINAL_REPORT', 'POSTER', 'VIDEO_DEMO', 'BOM']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const type = searchParams.get('type')
  if (!projectId) return apiError('projectId diperlukan', 422)

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { student: true, supervisor: true },
  })
  if (!project) return apiError('Projek tidak dijumpai', 404)

  // RBAC
  if (user.role === 'STUDENT' && project.student?.userId !== user.id) return apiForbidden()
  if (user.role === 'SUPERVISOR' && project.supervisor?.userId !== user.id) return apiForbidden()
  if (user.role === 'INSTITUTION_ADMIN' && project.institutionId !== user.institutionId) return apiForbidden()
  // PANEL can access documents for projects they evaluate (APPROVED/COMPLETED)
  if (user.role === 'PANEL' && !['APPROVED', 'COMPLETED'].includes(project.status)) return apiForbidden()

  const where: any = { projectId }
  if (type) where.type = type

  const docs = await db.document.findMany({
    where,
    include: {
      uploadedBy: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return apiOk(docs)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    if (user.role !== 'STUDENT') return apiForbidden('Hanya pelajar boleh memuat naik dokumen.')

    const body = sanitizeObject(await request.json())
    const projectId = body.projectId
    const type = body.type
    const title = body.title?.trim()
    const fileName = body.fileName?.trim()
    const filePath = body.filePath?.trim()
    const fileSize = parseInt(body.fileSize) || 0
    const mimeType = body.mimeType?.trim() || null

    if (!projectId || !type || !title || !fileName || !filePath) {
      return apiError('projectId, type, title, fileName dan filePath diperlukan', 422)
    }
    if (!VALID_TYPES.includes(type)) {
      return apiError('type tidak sah', 422)
    }
    if (fileSize > MAX_FILE_SIZE) {
      return apiError('Saiz fail melebihi 50MB', 422)
    }

    const project = await db.project.findUnique({ where: { id: projectId }, include: { student: true } })
    if (!project) return apiError('Projek tidak dijumpai', 404)
    if (project.student?.userId !== user.id) return apiForbidden('Anda bukan pemilik projek ini.')

    // Auto-increment version if same title+type exists
    const lastVersion = await db.document.findFirst({
      where: { projectId, title, type },
      orderBy: { version: 'desc' },
      select: { version: true },
    })
    const version = (lastVersion?.version || 0) + 1

    const doc = await db.document.create({
      data: {
        projectId,
        uploadedById: user.id,
        type,
        title,
        fileName,
        filePath,
        fileSize,
        mimeType,
        version,
        status: 'UPLOADED',
      },
      include: { project: { select: { id: true, title: true } } },
    })

    await logAudit({
      userId: user.id,
      action: 'UPLOAD_DOCUMENT',
      entity: 'Document',
      entityId: doc.id,
      after: { projectId, type, title, version, fileSize },
      ipAddress: getClientIp(request),
    })

    // Notify supervisor
    if (project.supervisorId) {
      const sup = await db.supervisor.findUnique({ where: { id: project.supervisorId } })
      if (sup) {
        await db.notification.create({
          data: {
            userId: sup.userId,
            title: 'Dokumen Baharu Dimuat Naik',
            message: `${user.fullName} memuat naik ${type} v${version}: "${title}" untuk projek "${project.title}".`,
            type: 'INFO',
            category: 'DOCUMENT',
            relatedId: doc.id,
            actionUrl: '/dashboard',
          },
        })
      }
    }

    return apiOk(doc, 'Dokumen dimuat naik.')
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}
