# Task 3 — full-stack-developer

## Task
Build all module API routes for Portal FYP TVET (JTM): logbook, documents, milestones, rubrics, evaluations, equipment, notifications, audit-logs, users, institutions, repository, analytics.

## Files Created
- `src/app/api/logbook/route.ts` (GET list + POST create)
- `src/app/api/logbook/[id]/route.ts` (GET single + PATCH sign-off/reject)
- `src/app/api/documents/route.ts` (GET list + POST upload with auto-versioning)
- `src/app/api/documents/[id]/route.ts` (GET single + PATCH comment/approve)
- `src/app/api/milestones/route.ts` (GET list + POST create)
- `src/app/api/milestones/[id]/route.ts` (PATCH status/completedAt/vivaSlot with FR-19 double-booking)
- `src/app/api/rubrics/route.ts` (GET list + POST create — JTM admin only)
- `src/app/api/rubrics/[id]/route.ts` (PATCH toggle/update criteria — JTM admin only)
- `src/app/api/evaluations/route.ts` (GET list + POST submit with auto totalScore)
- `src/app/api/equipment/route.ts` (GET list + POST create)
- `src/app/api/equipment/bookings/route.ts` (GET list + POST book with availability check)
- `src/app/api/equipment/bookings/[id]/route.ts` (PATCH approve/reject/return with stock adjust)
- `src/app/api/notifications/route.ts` (GET list + POST create)
- `src/app/api/notifications/read/route.ts` (POST mark-read)
- `src/app/api/audit-logs/route.ts` (GET list — admin only with pagination)
- `src/app/api/users/route.ts` (GET list + POST bulk create FR-03)
- `src/app/api/users/[id]/route.ts` (PATCH profile / role-based update)
- `src/app/api/institutions/route.ts` (GET list)
- `src/app/api/repository/route.ts` (GET search completed projects archive FR-24)
- `src/app/api/analytics/route.ts` (GET student-stats/supervisor-stats/institution-stats/jtm-stats FR-36)

## Implementation Notes
- All routes follow the pattern from `/api/auth/login/route.ts` and `/api/projects/route.ts`.
- Each route uses `getCurrentUser()`, returns `apiUnauthorized()` if no session, and enforces RBAC.
- Sanitization via `sanitizeInput`/`sanitizeObject` for all string inputs.
- Critical mutations logged via `logAudit` (SIGNOFF_LOGBOOK, UPLOAD_DOCUMENT, APPROVE_DOCUMENT, SUBMIT_EVALUATION, BOOK_EQUIPMENT, APPROVE_BOOKING, RETURN_EQUIPMENT, CREATE_USER, UPDATE_USER, CREATE_RUBRIC, UPDATE_RUBRIC, CREATE_MILESTONE, UPDATE_MILESTONE, CREATE_EQUIPMENT).
- Notifications auto-generated for relevant student/supervisor actions.
- JSON fields (criterionScores, comments, attachments, criteria) handled via `JSON.parse`/`JSON.stringify`.
- Equipment booking approval atomically decrements `availableQty` and sets equipment status to BOOKED; return increments and resets to AVAILABLE.
- Viva double-booking (FR-19) checks ±2 hour window across all milestones for projects sharing the same studentId or supervisorId.
- Document auto-versioning: queries last version by projectId+title+type and increments.
- Evaluation totalScore auto-calculated by summing criterion scores from rubric criteria definition; validates each score ≤ maxScore.
- User creation supports bulk import via array body or `{users: [...]}` shape per FR-03; default password `Portal@2026`.
- Analytics endpoint uses Prisma `groupBy` and `count` for all aggregations; jtm-stats returns national KPIs including completion rate, avg marks by field & institution, AI usage count, users by role.
- Audit-logs endpoint filters by institution for INSTITUTION_ADMIN (limited to own institution's users).

## Validation
- `bun run lint` passes cleanly.
- Smoke tested end-to-end:
  - Student creates logbook (PENDING) → Supervisor signs off (SIGNED_OFF, audit logged, student notified)
  - Document upload → auto v2 increment on same title+type → supervisor comment → approve
  - Evaluation submission auto-calculated totalScore (e.g., 85)
  - Equipment booking (PENDING) → institution admin approve → availableQty decremented, status BOOKED
  - Milestone viva slot set → second viva within 2h for same supervisor correctly rejected with 422 VIVA_CONFLICT
  - Rubric create (JTM admin) → toggle isActive
  - Bulk user creation (2 students in single POST)
  - JTM stats returns 13 active projects, 32% completion rate, usersByRole breakdown
  - Audit log query returns 51 entries with pagination
