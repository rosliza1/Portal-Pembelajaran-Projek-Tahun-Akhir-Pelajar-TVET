# Worklog — Portal FYP TVET (JTM)

Project: Portal Pembelajaran Projek Tahun Akhir Pelajar TVET (Bidang Elektrik Kuasa & RAC)
Sponsor: Jabatan Tenaga Manusia (JTM), KESUMA
Reference: PRD-JTM-TVET-FYP-2026-v1.0
Tech Stack (actual env): Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma (SQLite), z-ai-web-dev-sdk

---
Task ID: 0
Agent: Orchestrator (main)
Task: Initial project analysis & PRD extraction

Work Log:
- Read PRD PDF (26 pages) via pdf skill extract.text
- Parsed all functional requirements (FR-01 to FR-36) across 10 modules
- Identified 6 user roles for RBAC
- Identified 17 database tables per PRD §11.1
- Identified glassmorphism UI/UX spec (Navy #0F172A, Indigo #4338CA, Teal #0D9488, Sky #0EA5E9, backdrop-blur 16px, opacity 10-20%)
- Identified security requirements (RLS-equivalent, PDPA 2010, audit logs, password policy, TLS)
- Planned 11-task breakdown with parallelizable subagent work

Stage Summary:
- PRD fully understood; ready to build schema, APIs, and frontend
- Key constraint: only `/` route visible to user → SPA-style dashboard with role-based views

---
Task ID: 3
Agent: full-stack-developer
Task: Build all module API routes (logbook, documents, milestones, rubrics, evaluations, equipment, notifications, audit-logs, users, institutions, repository, analytics)

Work Log:
- src/app/api/logbook/route.ts — GET (list by projectId, optional weekNumber filter) + POST (student creates weekly entry, PENDING status, notify supervisor) per FR-10
- src/app/api/logbook/[id]/route.ts — GET single (with project relation) + PATCH signoff/reject (supervisor-only, sets SIGNED_OFF/REJECTED, signedOffAt, signedOffById, supervisorComment, audit SIGNOFF_LOGBOOK, notify student) per FR-11
- src/app/api/documents/route.ts — GET (RBAC: student/supervisor/admin/panel) + POST (student upload, type enum validation, 50MB cap, auto-version increment by title+type, audit UPLOAD_DOCUMENT, notify supervisor) per FR-13/FR-16
- src/app/api/documents/[id]/route.ts — GET single + PATCH comment (append to JSON comments array, status→UNDER_REVIEW) / approve (status APPROVED, reviewedAt, reviewedById) per FR-15
- src/app/api/milestones/route.ts — GET list (RBAC) + POST (institution admin creates milestone with stage enum) per FR-17
- src/app/api/milestones/[id]/route.ts — PATCH status/completedAt/vivaSlot with FR-19 double-booking detection (±2h window for same student/supervisor returns 422 VIVA_CONFLICT) per FR-19
- src/app/api/rubrics/route.ts — GET (filter by evalType/field, criteria JSON parsed) + POST (JTM admin only, criteria array validation) per FR-20
- src/app/api/rubrics/[id]/route.ts — PATCH (JTM admin only, toggle isActive / update criteria)
- src/app/api/evaluations/route.ts — GET (RBAC) + POST (supervisor/panel/admin submit, totalScore auto-calculated from rubric criteria, audit SUBMIT_EVALUATION, notify student) per FR-21/FR-22
- src/app/api/equipment/route.ts — GET (RBAC: institution filter for non-JTM) + POST (admin only, unique code check)
- src/app/api/equipment/bookings/route.ts — GET (RBAC) + POST (student books, availability check, PENDING status, audit BOOK_EQUIPMENT, notify institution admin) per FR-31
- src/app/api/equipment/bookings/[id]/route.ts — PATCH approve/reject/return (admin only; approve decrements availableQty+BOOKED, return increments+AVAILABLE, audit, notify student) per FR-32
- src/app/api/notifications/route.ts — GET (current user, optional unreadOnly) + POST (admin-only internal helper)
- src/app/api/notifications/read/route.ts — POST mark-read by id or all unread for current user
- src/app/api/audit-logs/route.ts — GET (admin only with action/entity/userId filters + pagination; INSTITUTION_ADMIN restricted to own institution users)
- src/app/api/users/route.ts — GET (RBAC: JTM all / institution admin own / others self) + POST (bulk import: array or {users:[...]}, default password Portal@2026, auto-create Student/Supervisor records) per FR-03
- src/app/api/users/[id]/route.ts — PATCH (self updates name/phone/avatarUrl; admin updates role/isActive/institutionId with escalation guards)
- src/app/api/institutions/route.ts — GET list all (authenticated) with _count aggregates
- src/app/api/repository/route.ts — GET search completed projects archive (q/field/year/institutionId filters, metadata only — no full report) per FR-24
- src/app/api/analytics/route.ts — GET student-stats / supervisor-stats / institution-stats / jtm-stats using Prisma groupBy+count; jtm-stats returns national KPIs (totalActive, completionRate, avgMarksByField, avgMarksByInstitution, aiUsageCount, usersByRole) per FR-36

Decisions / notes:
- Followed exact pattern from existing /api/auth/login and /api/projects routes (async params for [id] routes, sanitizeObject for body, apiOk/apiError responses).
- Equipment booking overlap check is approximate (single-unit conflict when availableQty≤1) — sufficient for demo; full multi-unit calendar would require a more sophisticated booking ledger.
- Viva double-booking query uses OR on studentId/supervisorId across all milestones in ±2h window.
- Document auto-versioning queries latest version by projectId+title+type and increments.
- Audit log entity field uses model name (LogbookEntry, Document, Milestone, Rubric, Evaluation, EquipmentBooking, User).
- All mutations create Notification records for affected users (student/supervisor/admin).

Stage Summary:
- 20 route files created across 12 API modules covering all functional requirements FR-03, FR-10, FR-11, FR-13, FR-15, FR-16, FR-17, FR-19, FR-20, FR-21, FR-22, FR-24, FR-31, FR-32, FR-36.
- `bun run lint` passes with zero errors.
- Smoke-tested end-to-end with seeded data: student logbook creation + supervisor sign-off (SIGNED_OFF + audit + notification), document upload with auto v2 increment + supervisor comment + approve, evaluation submission auto-calculating totalScore (85), equipment booking approval (availableQty decrement), viva double-booking correctly rejected (422 VIVA_CONFLICT) for same supervisor within 2h, rubric create/deactivate, bulk user import (2 students in one POST), JTM national stats (13 active projects, 32% completion rate, usersByRole breakdown), audit log listing with pagination.
- All routes enforce RBAC, sanitize inputs, log critical actions, and return structured JSON via apiOk/apiError.

---
Task ID: 6-b
Agent: full-stack-developer
Task: Build admin & management view components (users, audit-logs, analytics, rubrics)

Work Log:
- src/components/views/users.tsx — UsersView (FR-03/FR-04): RBAC-scoped user table with avatar+name/email, role badge, institution/program, status, last login; filters by role (with INSTITUTION_ADMIN escalation guard) + client-side search + JTM institution filter; "Tambah Pengguna" create dialog (POST /api/users, default pw Portal@2026); "Import Pukal CSV" dialog with two modes (multi-row form or pasted CSV) that POSTs {users:[...]}; row actions dropdown (Edit PATCH /api/users/[id], Activate/Deactivate PATCH isActive, View audit trail toast)
- src/components/views/audit-logs.tsx — AuditLogsView (FR-O5): admin-only audit log table with timestamp, user avatar+name+role, color-coded action badge, entity+entityId, IP; filters by action (LOGIN, APPROVE_PROPOSAL, SIGNOFF_LOGBOOK, UPLOAD_DOCUMENT, SUBMIT_EVALUATION, BOOK_EQUIPMENT, AI_CHAT, etc.), entity type, date range, free-text search; pagination prev/next (page size 20); row click opens detail dialog with side-by-side pretty-printed before/after JSON diffs; stats cards (today count, top action, top user); Eksport CSV button (toast)
- src/components/views/analytics.tsx — AnalyticsView (FR-36): JTM/Institution admin analytics dashboard; fetches /api/analytics?type=jtm-stats|institution-stats; KPI StatCards (Total Active Projects, Completion Rate %, Average Marks, AI Usage, Total Students, Total Supervisors); six recharts visualizations in GlassSections — Projects by Institution (horizontal bar), Projects by Field (donut), Avg Marks by Institution (vertical bar), Project Status Distribution (donut w/ status colors), Monthly Project Creation Trend (area), AI Usage Trend (line); Completion Rate by Institution (radial bar + ProgressRing cards); institution filter for JTM; Eksport Laporan PDF button (toast)
- src/components/views/rubrics.tsx — RubricsView (FR-20): list rubric templates as cards (name, field badge, evalType badge, criteria count, total weight w/ validation indicator, active Switch for JTM); View dialog with criteria table; Create/Edit dialog (JTM_ADMIN only) with dynamic criteria rows (auto-slug key from label, maxScore, weight), live total weight validation (must =100), POST /api/rubrics or PATCH /api/rubrics/[id]; toggle isActive; non-admins see read-only view

Stage Summary:
- 4 view files created, all glassmorphism-styled, Bahasa Melayu, mobile-responsive, RBAC-enforced.
- All four files pass `bunx eslint` with zero errors and zero warnings.
- Lint rule `react-hooks/set-state-in-effect` satisfied by using `.then()` callback pattern (matching login-page.tsx) and removing synchronous setLoading(true) in effect bodies; useEffect-for-prop-sync anti-patterns replaced with React-recommended alternatives (derived-state-during-render for EditUserDialog, `key` prop forced remount for RubricFormDialog, useMemo for computed defaultInstCode).
- Dev server now compiles / successfully (no more Module-not-found errors for the four views); other pre-existing or sibling-agent lint errors in ai-assistant.tsx, app-shell.tsx, evaluations.tsx, projects.tsx, repository.tsx remain out of scope.
- Work records written to /agent-ctx/6-b-full-stack-developer.md.

---
Task ID: 11
Agent: Orchestrator (main)
Task: Self-verification with Agent Browser

Work Log:
- Read PRD PDF (26 pages) and built complete system: Prisma schema (17 tables), seed data (40 users, 25 projects, 150 logbook entries, 20 evaluations, 15 equipment, 60 AI logs, 50 notifications, 30 audit logs), auth + security APIs (login/logout/register with password policy, rate limiting, audit logging, RBAC), 12 module API routes, AI Assistant via z-ai-web-dev-sdk (GLM-4.6, server-side, rate-limited 30/hr, logged to ai_chat_logs)
- Built glassmorphism UI: globals.css with Navy(#0F172A)/Indigo(#4338CA)/Teal(#0D9488)/Sky(#0EA5E9) palette, backdrop-blur(16px), glass-card/glass-input/glass-button components, gradient backgrounds, animations
- Built 15 view components: dashboard (role-aware), projects (CRUD + multi-step create + approve/reject), logbook (timeline + sign-off), documents (upload + review), milestones (timeline + viva scheduling), evaluations (rubric scoring with real-time total), rubrics (JTM admin CRUD), equipment (booking + approve), repository (search archive), ai-history, users (bulk import), audit-logs, analytics (7 recharts), notifications, profile
- Embedded Jotform AI Agent chatbot (Maya) via script tag in layout.tsx
- Security: httpOnly session cookies (HMAC-signed), password policy (min 8, upper/lower/number), login rate limiting (5 attempts/15min lockout), input sanitization (XSS prevention), RBAC on every API route, audit logging on all critical actions

Verification (Agent Browser):
- Login page renders with hero, demo accounts, Jotform Maya chatbot visible
- Student login (pelajar1@jtm.gov.my): dashboard shows 1 project, 4 notifications, pending actions (1 logbook, 3 documents), milestone timeline, AI assistant widget
- Projects view: real project "Sistem Kawalan Motor 3 Fasa Berasaskan PLC" (Elektrik Kuasa, Selesai) with create button + filters
- AI Assistant: sent "Apakah perbezaan pemula DOL dan Star-Delta?" → GLM responded with technical content referencing MS IEC 60947-4-1 standard ✓
- JTM Admin login (admin.jtm@jtm.gov.my): dashboard shows national KPIs (13 active projects, 32% completion, 85 avg marks, 61 AI usage), projects by field (EK:13, RAC:12), institutions table
- Analytics view: 7 charts render (2 bar, 2 donut, 2 line, 1 radial) — all glassmorphism consistent, no rendering issues
- Supervisor login (nurul.huda@jtm.gov.my): dashboard shows supervised projects, pending reviews (2 logbooks, 4 documents, 1 proposal), average scores
- Mobile (375px): sidebar collapses to hamburger menu, content stacks vertically, glassmorphism maintained, no overflow
- Footer sticky at bottom: "© 2026 JTM, KESUMA • Portal FYP TVET v1.0" + "Sistem Dilindungi RBAC • PDPA 2010 • TLS 1.3"
- VLM design rating: 8/10 (modern glassmorphism, clean layout, no visual issues)
- Lint: clean (0 errors)
- Dev log: no runtime errors, all API calls returning 200

Stage Summary:
- Portal FYP TVET (JTM) fully built and verified end-to-end
- All 10 functional modules (FR-01 to FR-36) implemented
- 6 user roles with RBAC enforced
- Glassmorphism UI/UX per PRD §10.1
- Security: RBAC, PDPA, audit trail, password policy, rate limiting, session management
- AI Assistant (GLM-4.6) working server-side with logging + rate limiting + disclaimer
- Jotform chatbot embedded as requested
- Demo credentials: all accounts use password "Portal@2026"

---
Task ID: 12
Agent: Orchestrator (main)
Task: Generate Supabase SQL files (schema + seed) for user's Supabase project

Work Log:
- Updated .env with Supabase PostgreSQL connection string (password URL-encoded: YOUR_PASSWORD)
- Changed prisma/schema.prisma provider to postgresql
- Attempted db:push — discovered sandbox blocks outbound port 5432 (only HTTPS 443 allowed)
- Generated bcrypt hash for password 'Portal@2026' (all demo accounts)
- Wrote prisma/gen-supabase-seed.ts — reads existing SQLite data, outputs PostgreSQL INSERT statements
- Generated 3 SQL files:
  • supabase-schema.sql (367 lines) — 17 table CREATE statements + indexes
  • supabase-seed.sql (874 lines) — all INSERT statements with data
  • supabase-complete.sql (1241 lines, 340KB) — combined schema + seed in one file
- Verified record counts: 5 institutions, 2 programs, 42 users, 8 supervisors, 27 students, 25 projects, 126 logbook entries, 49 documents, 125 milestones, 4 rubrics, 22 evaluations, 15 equipment, 12 bookings, 61 AI chat logs, 64 notifications, 66 audit logs
- Reverted sandbox config back to SQLite (provider + .env) so demo continues working
- Added deployment instructions in .env comments
- Verified demo app still works: login API returns 200, student login successful

Stage Summary:
- 3 SQL files ready for user to run in Supabase SQL Editor:
  1. supabase-schema.sql — run first (creates 17 tables + indexes)
  2. supabase-seed.sql — run second (populates all dummy data)
  3. supabase-complete.sql — all-in-one (schema + seed)
- Password for all users: Portal@2026 (bcrypt hashed in SQL)
- When deploying: change schema.prisma provider to "postgresql" + set DATABASE_URL to Supabase connection string
- Sandbox demo continues on local SQLite for preview

---
Task ID: 13
Agent: Orchestrator (main)
Task: Deploy project to GitHub repo (rosliza1/Portal-Pembelajaran-Projek-Tahun-Akhir-Pelajar-TVET)

Work Log:
- Added GitHub remote: https://github.com/rosliza1/Portal-Pembelajaran-Projek-Tahun-Akhir-Pelajar-TVET.git
- Configured git user identity (rosliza1)
- Updated .gitignore: added /db/, *.db, *.png, /tool-results/, /agent-ctx/, /download/, !.env.example
- Created .env.example (template with placeholder password — no real secrets)
- Created README.md (comprehensive project documentation)
- Created SUPABASE-SETUP-GUIDE.md (step-by-step Supabase setup)
- SECURITY: Removed .env (with real Supabase password) from git tracking
- SECURITY: Removed db/custom.db (SQLite with user data) from tracking
- SECURITY: Removed screenshots, agent-ctx, .zscripts from tracking
- SECURITY: Redacted all passwords from worklog.md and setup guide (redacted → YOUR_PASSWORD)
- Verified ZERO secrets in all tracked files (grep confirmed 0 matches)
- Committed all changes with descriptive commit messages
- Attempted git push — failed (sandbox has no GitHub credentials: no PAT, no SSH keys, no gh CLI)
- Created clean git archive: download/Portal-FYP-TVET.tar.gz (439KB, 189 files)
- Created zip version: download/Portal-FYP-TVET.zip (547KB) for Windows users
- Both archives verified clean: no .env, no .db, no node_modules, no secrets
- Created deploy-to-github.sh helper script with instructions

Stage Summary:
- Local repo is fully committed and ready (158 tracked files, zero secrets)
- Cannot push directly (no GitHub auth in sandbox)
- User needs to download archive and push from their machine
- Archives available in download/ folder: Portal-FYP-TVET.tar.gz and Portal-FYP-TVET.zip
- Instructions provided in deploy-to-github.sh and chat

---
Task ID: 14
Agent: Orchestrator (main)
Task: Direct push to GitHub repo with user-provided PAT

Work Log:
- User provided GitHub Personal Access Token (ghp_***)
- Configured remote URL with token authentication
- Verified remote repo was empty (no existing content to merge)
- Pushed main branch: 144 files, 5 commits
- Push succeeded: 4ccdfd8 HEAD → origin/main
- Found residual password reference in worklog.md (in a redaction description line)
- Fixed immediately: committed and pushed security fix (bf49570)
- Verified ZERO secrets across all 144 files in GitHub repo
- Removed token from git config (security)
- Token cleared from remote URL after push

Stage Summary:
- ✅ Repo live at: https://github.com/rosliza1/Portal-Pembelajaran-Projek-Tahun-Akhir-Pelajar-TVET
- ✅ 144 files pushed (all source code, schema, SQL files, README, setup guide)
- ✅ Zero secrets exposed (.env, passwords, tokens all excluded)
- ✅ Branch: main (default)
- ✅ Ready for Netlify deployment
- ⚠️ User should revoke the PAT at https://github.com/settings/tokens (no longer needed)
