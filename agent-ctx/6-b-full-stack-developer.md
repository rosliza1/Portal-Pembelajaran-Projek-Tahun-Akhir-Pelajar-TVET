# Task 6-b — full-stack-developer

## Task
Build admin & management view components (users, audit-logs, analytics, rubrics) for the Portal FYP TVET (JTM) system — Next.js 16 App Router + glassmorphism design system.

## Files Created
- `src/components/views/users.tsx` — User Management view (FR-03/FR-04)
- `src/components/views/audit-logs.tsx` — Audit Trail view (FR-O5)
- `src/components/views/analytics.tsx` — National Analytics Dashboard (FR-36)
- `src/components/views/rubrics.tsx` — Rubric Template Management (FR-20)

## Implementation Notes

### users.tsx
- Exports `UsersView()` for INSTITUTION_ADMIN, JTM_ADMIN, DEVOPS roles.
- Fetches `/api/users?role=X&institutionId=X` (JTM admins can filter by institution; INSTITUTION_ADMIN auto-scoped to own institution by API).
- StatCards row: total / active / students / supervisors.
- Filters: role (with escalation guard so INSTITUTION_ADMIN cannot see JTM_ADMIN/DEVOPS options), client-side search by name/email, institution filter (JTM only).
- Table columns: avatar+name/email, role badge (color-coded), institution/program, active/inactive status badge, last login (timeAgo), row actions dropdown.
- Row actions: Edit (PATCH /api/users/[id]), Activate/Deactivate (PATCH isActive), View audit trail (toast).
- "Tambah Pengguna" dialog: form with fullName, email, role, phone, institution, session — POST /api/users with default password "Portal@2026".
- "Import Pukal CSV" dialog: two modes — Borang Berbilang Baris (up to 5 dynamic rows) or Tampal CSV (parsed client-side). POST /api/users with `{users: [...]}`. Success/error counts surfaced via toast.
- Edit dialog uses the React-recommended "derived state during render" pattern (setLastTargetId + setForm) instead of useEffect, satisfying the `react-hooks/set-state-in-effect` lint rule.

### audit-logs.tsx
- Exports `AuditLogsView()` for JTM_ADMIN, INSTITUTION_ADMIN, DEVOPS.
- Fetches `/api/audit-logs?action=X&entity=X&page=X&limit=20` (paginated server-side; date range and free-text search applied client-side on the current page).
- StatCards row: today's log count, top action, top user (computed from loaded page).
- Filters: action dropdown (LOGIN, LOGOUT, APPROVE_PROPOSAL, REJECT_PROPOSAL, SIGNOFF_LOGBOOK, UPLOAD_DOCUMENT, SUBMIT_EVALUATION, CREATE_PROJECT, BOOK_EQUIPMENT, AI_CHAT, etc.), entity dropdown (User/Project/LogbookEntry/Document/Milestone/Rubric/Evaluation/Equipment/EquipmentBooking/AiChatLog/LoginAttempt), date-from / date-to inputs, free-text search.
- Table columns: timestamp, user (avatar + name + role), action badge (color-mapped by prefix), entity + entityId, IP, eye-icon button to open detail dialog.
- Detail dialog: meta grid (user, IP, action, entity) + side-by-side `<pre>` JSON diffs for `before` and `after`.
- Pagination prev/next (page size 20). "Eksport CSV" button triggers toast.

### analytics.tsx
- Exports `AnalyticsView()` for JTM_ADMIN and INSTITUTION_ADMIN.
- Fetches `/api/analytics?type=jtm-stats` or `?type=institution-stats` based on role. Also fetches `/api/institutions` for JTM filter dropdown.
- KPI StatCards row: Total Projects Active, Completion Rate %, Average Marks, AI Usage (chats), Total Students, Total Supervisors.
- Six recharts visualizations all wrapped in GlassSection with glass-friendly styling (transparent bg, slate-300 axis text, gradient fills):
  1. Projects by Institution — horizontal BarChart (gradient indigo→sky)
  2. Projects by Field — donut PieChart (Elektrik Kuasa vs RAC, custom colors)
  3. Average Marks by Institution — vertical BarChart with gradient amber→teal
  4. Project Status Distribution — donut PieChart with status-specific colors (DRAFT/SUBMITTED/UNDER_REVIEW/APPROVED/COMPLETED/REJECTED)
  5. Monthly Project Creation Trend — AreaChart (last 6 months, teal gradient)
  6. AI Usage Trend — LineChart (fuchsia line)
- Completion Rate by Institution — RadialBarChart with companion ProgressRing cards.
- All charts use ResponsiveContainer with heights 260-280, custom tooltip styles (navy/95 bg, white/15 border).
- Institution filter (JTM only), "Eksport Laporan PDF" button triggers toast.

### rubrics.tsx
- Exports `RubricsView()` for all authenticated users (read-only for non-admins).
- Fetches `/api/rubrics`.
- StatCards row: total templates / active / total criteria / average weight.
- Rubric cards (responsive grid 1/2/3 cols): name, field badge, evalType badge, criteria count, total weight (green if =100, amber otherwise), active Switch (JTM only), criteria preview (first 3), View + Edit buttons.
- View dialog: criteria table (key, label, maxScore, weight) with total weight footer.
- Create/Edit form dialog (JTM_ADMIN only): name, field (Both/Elektrik Kuasa/RAC), evalType (supervisor_progress/panel_viva/final_report), dynamic criteria rows with auto-slug key from label, maxScore, weight. "Tambah Kriteria" button adds row; trash icon removes. Live total weight indicator with warning if ≠100. Save button disabled until weight is valid.
- Toggle isActive on rubric card via PATCH /api/rubrics/[id].
- Form dialog uses `key` prop pattern (key="create" or key=`edit-${id}`) + useState initializers to avoid useEffect-for-prop-sync anti-pattern.

## Lint Compliance
- All four files pass `bunx eslint` with zero errors and zero warnings.
- Refactored all async loaders to use the `.then()` callback pattern (matching the existing login-page.tsx pattern) and removed synchronous `setLoading(true)` calls inside useEffect to satisfy the `react-hooks/set-state-in-effect` rule.
- Replaced useEffect-based prop syncing (EditUserDialog, RubricFormDialog, BulkImportDialog defaultInstCode) with the React-recommended alternatives: derived-state-during-render pattern, `key` prop forced remounts, and `useMemo` for computed values.
- Other files (ai-assistant.tsx, app-shell.tsx, evaluations.tsx, projects.tsx, repository.tsx) have pre-existing or sibling-agent lint errors that are out of scope for this task.

## Smoke Check
- dev.log shows the Next.js dev server now compiles `page.tsx` cleanly (`✓ Compiled`) and the previous Module-not-found errors for `users`, `audit-logs`, `analytics`, `rubrics` are gone.
