// Generate supabase-seed.sql from existing SQLite database
// Reads all tables and outputs PostgreSQL INSERT statements
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'

// Use a fresh PrismaClient connected to the ORIGINAL sqlite database
// We need to temporarily use the sqlite schema to read existing data
const sqliteDb = new PrismaClient({
  datasources: { db: { url: 'file:/home/z/my-project/db/custom.db' } },
})

const BCRYPT_HASH = '$2b$10$GkTFpE8b.vkkc5dVRFeq.uNrIYxdb1S77CEYSg/xwov5M0h6jPTCC' // Portal@2026

function sqlVal(v: any): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return String(v)
  if (v instanceof Date) return `'${v.toISOString()}'`
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`
  // string
  return `'${String(v).replace(/'/g, "''")}'`
}

function buildInsert(table: string, rows: any[]): string {
  if (!rows.length) return `-- ${table}: no data\n`
  const cols = Object.keys(rows[0])
  const lines = [`-- ${table} (${rows.length} rows)`, `DELETE FROM "${table}";`]
  for (const row of rows) {
    const vals = cols.map((c) => sqlVal(row[c])).join(', ')
    lines.push(`INSERT INTO "${table}" ("${cols.join('", "')}") VALUES (${vals});`)
  }
  return lines.join('\n') + '\n'
}

async function main() {
  console.log('Reading from SQLite database...')
  const out: string[] = []

  out.push('-- ============================================================')
  out.push('-- Portal FYP TVET (JTM) — Supabase Seed Data')
  out.push('-- Reference: PRD-JTM-TVET-FYP-2026-v1.0 §11.4')
  out.push('-- Password for ALL users: Portal@2026')
  out.push('-- Run AFTER the schema creation script in Supabase SQL Editor')
  out.push('-- ============================================================')
  out.push('')
  out.push('BEGIN;')
  out.push('')

  // 1. Institutions
  const institutions = await sqliteDb.institution.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('Institution', institutions))

  // 2. Programs
  const programs = await sqliteDb.program.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('Program', programs))

  // 3. Users — override passwordHash with consistent bcrypt hash
  const users = await sqliteDb.user.findMany({ orderBy: { id: 'asc' } })
  const usersWithHash = users.map((u) => ({ ...u, passwordHash: BCRYPT_HASH }))
  out.push(buildInsert('User', usersWithHash))

  // 4. Supervisors (before students — students reference supervisors)
  const supervisors = await sqliteDb.supervisor.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('Supervisor', supervisors))

  // 5. Students
  const students = await sqliteDb.student.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('Student', students))

  // 6. Projects
  const projects = await sqliteDb.project.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('Project', projects))

  // 7. Project Members
  const projectMembers = await sqliteDb.projectMember.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('ProjectMember', projectMembers))

  // 8. Logbook Entries
  const logbook = await sqliteDb.logbookEntry.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('LogbookEntry', logbook))

  // 9. Documents
  const documents = await sqliteDb.document.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('Document', documents))

  // 10. Milestones
  const milestones = await sqliteDb.milestone.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('Milestone', milestones))

  // 11. Rubrics
  const rubrics = await sqliteDb.rubric.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('Rubric', rubrics))

  // 12. Evaluations
  const evaluations = await sqliteDb.evaluation.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('Evaluation', evaluations))

  // 13. Equipment
  const equipment = await sqliteDb.equipment.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('Equipment', equipment))

  // 14. Equipment Bookings
  const bookings = await sqliteDb.equipmentBooking.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('EquipmentBooking', bookings))

  // 15. AI Chat Logs
  const aiLogs = await sqliteDb.aiChatLog.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('AiChatLog', aiLogs))

  // 16. Notifications
  const notifications = await sqliteDb.notification.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('Notification', notifications))

  // 17. Audit Logs
  const auditLogs = await sqliteDb.auditLog.findMany({ orderBy: { id: 'asc' } })
  out.push(buildInsert('AuditLog', auditLogs))

  // LoginAttempt — skip (empty in seed)

  out.push('COMMIT;')
  out.push('')
  out.push('-- ============================================================')
  out.push('-- Seed complete! Demo login credentials (password: Portal@2026):')
  out.push('--   Student:    pelajar1@jtm.gov.my')
  out.push('--   Supervisor: nurul.huda@jtm.gov.my')
  out.push('--   Panel:      panel1@jtm.gov.my')
  out.push('--   Inst Admin: admin.bangi@jtm.gov.my')
  out.push('--   JTM Admin:  admin.jtm@jtm.gov.my')
  out.push('-- ============================================================')

  const sql = out.join('\n')
  writeFileSync('/home/z/my-project/supabase-seed.sql', sql)
  console.log(`✅ Generated supabase-seed.sql (${sql.length} chars, ${sql.split('\n').length} lines)`)
  console.log(`   Records: ${institutions.length} institutions, ${programs.length} programs, ${users.length} users, ${projects.length} projects, ${logbook.length} logbook entries, ${evaluations.length} evaluations, ${equipment.length} equipment, ${aiLogs.length} AI logs, ${notifications.length} notifications, ${auditLogs.length} audit logs`)
}

main().then(() => sqliteDb.$disconnect()).catch((e) => { console.error(e); process.exit(1) })
