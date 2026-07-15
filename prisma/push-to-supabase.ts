// Push seed data to Supabase via REST API (PostgREST)
// This works because RLS is disabled and HTTPS (port 443) is accessible
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'

const SUPABASE_URL = 'https://wbinwhbmkszeiguwebkl.supabase.co'
const SUPABASE_KEY = 'sb_publishable_iIEsA4hNKNURFaZps7Wl4g_EWjjL3dx'

const sqliteDb = new PrismaClient({
  datasources: { db: { url: 'file:/home/z/my-project/db/custom.db' } },
})

const BCRYPT_HASH = '$2b$10$GkTFpE8b.vkkc5dVRFeq.uNrIYxdb1S77CEYSg/xwov5M0h6jPTCC'

async function pushTable(table: string, rows: any[], batchSize = 500) {
  if (!rows.length) { console.log(`  ${table}: no data, skipping`); return }
  // Clean up existing data first (DELETE via REST)
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=neq.__placeholder__`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  })
  // Push in batches
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(batch),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error(`  ❌ ${table} batch ${i}-${i+batch.length}: HTTP ${res.status} — ${errText.substring(0, 200)}`)
      return false
    }
  }
  console.log(`  ✅ ${table}: ${rows.length} rows pushed`)
  return true
}

async function main() {
  console.log('🚀 Pushing seed data to Supabase via REST API...')
  console.log(`   Target: ${SUPABASE_URL}`)
  console.log('')

  let totalPushed = 0
  let totalFailed = 0

  // 1. Institutions
  const institutions = await sqliteDb.institution.findMany()
  // Override passwordHash for all users
  if (await pushTable('Institution', institutions)) totalPushed += institutions.length; else totalFailed++

  // 2. Programs
  const programs = await sqliteDb.program.findMany()
  if (await pushTable('Program', programs)) totalPushed += programs.length; else totalFailed++

  // 3. Users (override passwordHash)
  const users = (await sqliteDb.user.findMany()).map((u) => ({ ...u, passwordHash: BCRYPT_HASH }))
  if (await pushTable('User', users)) totalPushed += users.length; else totalFailed++

  // 4. Supervisors
  const supervisors = await sqliteDb.supervisor.findMany()
  if (await pushTable('Supervisor', supervisors)) totalPushed += supervisors.length; else totalFailed++

  // 5. Students
  const students = await sqliteDb.student.findMany()
  if (await pushTable('Student', students)) totalPushed += students.length; else totalFailed++

  // 6. Projects
  const projects = await sqliteDb.project.findMany()
  if (await pushTable('Project', projects)) totalPushed += projects.length; else totalFailed++

  // 7. Project Members
  const members = await sqliteDb.projectMember.findMany()
  if (await pushTable('ProjectMember', members)) totalPushed += members.length; else totalFailed++

  // 8. Logbook Entries
  const logbook = await sqliteDb.logbookEntry.findMany()
  if (await pushTable('LogbookEntry', logbook)) totalPushed += logbook.length; else totalFailed++

  // 9. Documents
  const documents = await sqliteDb.document.findMany()
  if (await pushTable('Document', documents)) totalPushed += documents.length; else totalFailed++

  // 10. Milestones
  const milestones = await sqliteDb.milestone.findMany()
  if (await pushTable('Milestone', milestones)) totalPushed += milestones.length; else totalFailed++

  // 11. Rubrics
  const rubrics = await sqliteDb.rubric.findMany()
  if (await pushTable('Rubric', rubrics)) totalPushed += rubrics.length; else totalFailed++

  // 12. Evaluations
  const evaluations = await sqliteDb.evaluation.findMany()
  if (await pushTable('Evaluation', evaluations)) totalPushed += evaluations.length; else totalFailed++

  // 13. Equipment
  const equipment = await sqliteDb.equipment.findMany()
  if (await pushTable('Equipment', equipment)) totalPushed += equipment.length; else totalFailed++

  // 14. Equipment Bookings
  const bookings = await sqliteDb.equipmentBooking.findMany()
  if (await pushTable('EquipmentBooking', bookings)) totalPushed += bookings.length; else totalFailed++

  // 15. AI Chat Logs
  const aiLogs = await sqliteDb.aiChatLog.findMany()
  if (await pushTable('AiChatLog', aiLogs)) totalPushed += aiLogs.length; else totalFailed++

  // 16. Notifications
  const notifications = await sqliteDb.notification.findMany()
  if (await pushTable('Notification', notifications)) totalPushed += notifications.length; else totalFailed++

  // 17. Audit Logs
  const auditLogs = await sqliteDb.auditLog.findMany()
  if (await pushTable('AuditLog', auditLogs)) totalPushed += auditLogs.length; else totalFailed++

  console.log('')
  console.log(`📊 Total: ${totalPushed} rows pushed, ${totalFailed} tables failed`)
}

main().then(() => sqliteDb.$disconnect()).catch((e) => { console.error('❌ Fatal:', e); process.exit(1) })
