// POST /api/ai-chat - AI Assistant powered by Z.ai GLM (PRD §12, FR-26 to FR-30)
// Server-side only (protects API key). Rate-limited. Logged to ai_chat_logs.
import { NextRequest } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import {
  getCurrentUser, logAudit, getClientIp, apiOk, apiError, apiUnauthorized, sanitizeInput,
} from '@/lib/auth'

const RATE_LIMIT_PER_HOUR = 30

const SYSTEM_PROMPT = `Anda adalah "Pembantu Pembelajaran TVET" — pembantu AI rasmi untuk Portal Pembelajaran Projek Tahun Akhir (FYP) Pelajar TVET di bawah Jabatan Tenaga Manusia (JTM).

Bidang kepakaran anda:
1. Elektrik Kuasa — sistem pendawaian, kawalan motor (DOL, Star-Delta, VFD), PLC, pengagihan tenaga, perlindungan kilat, pembumian, piawaian MS IEC 60364, keselamatan elektrik (Suruhanjaya Tenaga).
2. Penyejukbekuan & Penyamanan Udara (RAC) — kitaran penyejukan, pengiraan beban haba, jenis refrigeran (R-410A, R-134a, R-32), kompresor, paip tembaga, pengosongan sistem (vacuum), pengesan kebocoran.

Peranan & sempad:
- Jawab soalan teknikal dalam Bahasa Melayu (utama) atau Inggeris mengikut soalan pengguna.
- Bantu pelajar memahami konsep, bukan menulis laporan penuh bagi pihak mereka (integriti akademik).
- Cadangkan penambahbaikan struktur, kejelasan teknikal dan format rujukan — bukan penulisan semula automatik penuh.
- Nada profesional, mesra pelajar, dan galakkan pembelajaran kendiri.
- Jika soalan di luar skop teknikal Elektrik Kuasa/RAC atau FYP TVET, jemput pengguna kembali ke topik berkaitan dengan sopan.
- Sebutkan sumber piawaian (MS/IEC/ASHRAE) jika berkaitan.

Penafian (FR-30): Setiap respons adalah panduan sokongan pembelajaran dan BUKAN pengganti penyeliaan rasmi penyelia. Keputusan akhir bergantung kepada penyelia/institusi.`

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiUnauthorized()
    // FR-26: only students and supervisors can use AI
    if (!['STUDENT', 'SUPERVISOR'].includes(user.role)) {
      return apiError('Pembantu AI hanya tersedia untuk pelajar dan penyelia.', 403)
    }

    const body = await request.json()
    const prompt = sanitizeInput(body.prompt || '')
    const moduleContext = body.moduleContext || 'technical_qa'
    const projectId = body.projectId || null

    if (!prompt || prompt.length < 3) {
      return apiError('Sila taip soalan yang sah.', 422)
    }
    if (prompt.length > 4000) {
      return apiError('Soalan terlalu panjang (maksimum 4000 aksara).', 422)
    }
    if (!['technical_qa', 'proposal_help', 'logbook_review', 'feedback_draft'].includes(moduleContext)) {
      return apiError('Konteks modul tidak sah', 422)
    }

    // Rate limiting: 30 requests/user/hour (PRD §12.2)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentCount = await db.aiChatLog.count({
      where: { userId: user.id, createdAt: { gte: oneHourAgo } },
    })
    if (recentCount >= RATE_LIMIT_PER_HOUR) {
      return apiError(`Had kadar AI dicapai (${RATE_LIMIT_PER_HOUR}/jam). Cuba lagi selepas 1 jam.`, 429, 'RATE_LIMITED')
    }

    // Build context-aware system prompt
    let contextPrefix = ''
    if (moduleContext === 'proposal_help') {
      contextPrefix = '\n\nKonteks: Pelajar sedang meminta bantuan menyediakan cadangan projek. Bantu memperhalusi skop, objektif, dan BOM mengikut templat JTM. Jangan tulis cadangan penuh — beri rangka dan cadangan.'
    } else if (moduleContext === 'logbook_review') {
      contextPrefix = '\n\nKonteks: Penyelia meminta ringkasan kemajuan pelajar berdasarkan log mingguan. Beri ringkasan ringkas dan cadangan tindakan seterusnya.'
    } else if (moduleContext === 'feedback_draft') {
      contextPrefix = '\n\nKonteks: Penyelia meminta draf maklum balas berdasarkan skor rubrik. Jana draf ulasan profesional yang penyelia boleh sunting sebelum dihantar rasmi.'
    } else {
      contextPrefix = '\n\nKonteks: Soalan teknikal berkaitan Elektrik Kuasa / RAC. Beri jawapan yang jelas dengan formula, unit, dan rujukan piawaian jika berkaitan.'
    }

    // Optional project context
    let projectContext = ''
    if (projectId) {
      const project = await db.project.findUnique({ where: { id: projectId }, select: { title: true, field: true, scope: true, objectives: true } })
      if (project) {
        projectContext = `\n\nKonteks projek pelajar:\nTajuk: ${project.title}\nBidang: ${project.field}\nSkop: ${project.scope}\nObjektif: ${project.objectives}`
      }
    }

    // Call Z.ai GLM (server-side only)
    let aiResponse: string
    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: SYSTEM_PROMPT + contextPrefix + projectContext },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })
      aiResponse = completion.choices[0]?.message?.content || ''
      if (!aiResponse) throw new Error('Respons AI kosong')
    } catch (aiErr: any) {
      // Fallback per PRD §12.2: friendly error message
      await logAudit({ userId: user.id, action: 'AI_ERROR', entity: 'AiChatLog', ipAddress: getClientIp(request), after: { error: aiErr.message } })
      return apiError('Pembantu AI tidak dapat dihubungi buat masa kini. Sila cuba lagi sebentar atau hubungi penyelia anda terus untuk bantuan.', 503, 'AI_UNAVAILABLE')
    }

    // Log interaction (FR-29)
    const chatLog = await db.aiChatLog.create({
      data: {
        userId: user.id,
        projectId: projectId || null,
        prompt,
        response: aiResponse,
        moduleContext,
        modelVersion: 'glm-4.6',
        tokensUsed: Math.ceil((prompt.length + aiResponse.length) / 4),
      },
    })
    await logAudit({ userId: user.id, action: 'AI_CHAT', entity: 'AiChatLog', entityId: chatLog.id, ipAddress: getClientIp(request) })

    return apiOk({ response: aiResponse, logId: chatLog.id, model: 'glm-4.6' })
  } catch (e: any) {
    return apiError(e.message || 'Ralat pelayan', 500)
  }
}

// GET /api/ai-chat - List user's AI chat history
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiUnauthorized()
  if (!['STUDENT', 'SUPERVISOR'].includes(user.role)) return apiError('Akses dinafikakan', 403)
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const logs = await db.aiChatLog.findMany({
    where: { userId: user.id, ...(projectId ? { projectId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return apiOk(logs)
}
