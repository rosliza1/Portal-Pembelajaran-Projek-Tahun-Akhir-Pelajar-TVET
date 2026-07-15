-- ============================================================
-- Portal FYP TVET (JTM) — Supabase Schema (17 Tables)
-- Reference: PRD-JTM-TVET-FYP-2026-v1.0 §11.1
-- Run this FIRST in Supabase SQL Editor, then run supabase-seed.sql
-- ============================================================

-- Drop existing tables (clean slate) — WARNING: deletes all data!
-- Comment out the DROP statements if you want to keep existing data.

DROP TABLE IF EXISTS "LoginAttempt" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "AiChatLog" CASCADE;
DROP TABLE IF EXISTS "EquipmentBooking" CASCADE;
DROP TABLE IF EXISTS "Equipment" CASCADE;
DROP TABLE IF EXISTS "Evaluation" CASCADE;
DROP TABLE IF EXISTS "Rubric" CASCADE;
DROP TABLE IF EXISTS "Milestone" CASCADE;
DROP TABLE IF EXISTS "Document" CASCADE;
DROP TABLE IF EXISTS "LogbookEntry" CASCADE;
DROP TABLE IF EXISTS "ProjectMember" CASCADE;
DROP TABLE IF EXISTS "Project" CASCADE;
DROP TABLE IF EXISTS "Student" CASCADE;
DROP TABLE IF EXISTS "Supervisor" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Program" CASCADE;
DROP TABLE IF EXISTS "Institution" CASCADE;

-- ============================================================
-- 1. INSTITUTIONS (ILP, IKBN, ADTEC under JTM)
-- ============================================================
CREATE TABLE "Institution" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================================
-- 2. PROGRAMS (Elektrik Kuasa, RAC)
-- ============================================================
CREATE TABLE "Program" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================================
-- 3. USERS (core — 6 roles: STUDENT, SUPERVISOR, PANEL, INSTITUTION_ADMIN, JTM_ADMIN, DEVOPS)
-- ============================================================
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'STUDENT',
  "phone" TEXT,
  "avatarUrl" TEXT,
  "institutionId" TEXT REFERENCES "Institution"("id"),
  "programId" TEXT REFERENCES "Program"("id"),
  "session" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "mfaEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================================
-- 4. SUPERVISORS
-- ============================================================
CREATE TABLE "Supervisor" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "staffNo" TEXT NOT NULL UNIQUE,
  "expertiseField" TEXT,
  "maxStudents" INTEGER NOT NULL DEFAULT 15,
  "institutionId" TEXT REFERENCES "Institution"("id"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================================
-- 5. STUDENTS (references Supervisor for assignment)
-- ============================================================
CREATE TABLE "Student" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "registrationNo" TEXT NOT NULL UNIQUE,
  "cohort" TEXT,
  "supervisorId" TEXT REFERENCES "Supervisor"("id"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================================
-- 6. PROJECTS (FYP records)
-- ============================================================
CREATE TABLE "Project" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "objectives" TEXT NOT NULL,
  "bomList" TEXT,
  "scheduleStart" TIMESTAMP(3),
  "scheduleEnd" TIMESTAMP(3),
  "studentId" TEXT REFERENCES "Student"("id"),
  "supervisorId" TEXT REFERENCES "Supervisor"("id"),
  "institutionId" TEXT REFERENCES "Institution"("id"),
  "programId" TEXT REFERENCES "Program"("id"),
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "similarityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rejectionReason" TEXT,
  "approvedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL REFERENCES "User"("id"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================================
-- 7. PROJECT MEMBERS (for group projects)
-- ============================================================
CREATE TABLE "ProjectMember" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("projectId", "studentId")
);

-- ============================================================
-- 8. LOGBOOK ENTRIES (weekly digital logbook — FR-10, FR-11)
-- ============================================================
CREATE TABLE "LogbookEntry" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "studentId" TEXT REFERENCES "User"("id"),
  "weekNumber" INTEGER NOT NULL,
  "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tasksDone" TEXT NOT NULL,
  "hoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "issuesFaced" TEXT,
  "attachments" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "signedOffAt" TIMESTAMP(3),
  "signedOffById" TEXT,
  "supervisorComment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE("projectId", "weekNumber")
);

-- ============================================================
-- 9. DOCUMENTS (proposals, drafts, reports, posters, videos — FR-13)
-- ============================================================
CREATE TABLE "Document" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "uploadedById" TEXT NOT NULL REFERENCES "User"("id"),
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL DEFAULT 0,
  "mimeType" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "comments" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================================
-- 10. MILESTONES (timeline: Proposal → Progress 1 → Progress 2 → Viva → Final — FR-17, FR-18)
-- ============================================================
CREATE TABLE "Milestone" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "vivaSlot" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================================
-- 11. RUBRICS (evaluation templates — FR-20, configured by JTM Pusat)
-- ============================================================
CREATE TABLE "Rubric" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "evalType" TEXT NOT NULL,
  "criteria" TEXT NOT NULL,
  "totalWeight" INTEGER NOT NULL DEFAULT 100,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================================
-- 12. EVALUATIONS (scores by supervisor/panel — FR-21, FR-22)
-- ============================================================
CREATE TABLE "Evaluation" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "evaluatorId" TEXT NOT NULL REFERENCES "User"("id"),
  "rubricId" TEXT NOT NULL REFERENCES "Rubric"("id"),
  "criterionScores" TEXT NOT NULL,
  "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "evalType" TEXT NOT NULL,
  "comments" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================================
-- 13. EQUIPMENT (lab inventory — FR-31, FR-32)
-- ============================================================
CREATE TABLE "Equipment" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "category" TEXT NOT NULL,
  "specification" TEXT,
  "institutionId" TEXT REFERENCES "Institution"("id"),
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "availableQty" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================================
-- 14. EQUIPMENT BOOKINGS
-- ============================================================
CREATE TABLE "EquipmentBooking" (
  "id" TEXT PRIMARY KEY,
  "equipmentId" TEXT NOT NULL REFERENCES "Equipment"("id"),
  "studentId" TEXT NOT NULL REFERENCES "User"("id"),
  "projectId" TEXT,
  "bookingStart" TIMESTAMP(3) NOT NULL,
  "bookingEnd" TIMESTAMP(3) NOT NULL,
  "purpose" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "returnNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================================
-- 15. AI CHAT LOGS (Pembantu AI GLM interactions — FR-29)
-- ============================================================
CREATE TABLE "AiChatLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "projectId" TEXT REFERENCES "Project"("id"),
  "prompt" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "moduleContext" TEXT NOT NULL,
  "modelVersion" TEXT NOT NULL DEFAULT 'glm-4.6',
  "rating" INTEGER,
  "tokensUsed" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 16. NOTIFICATIONS (in-app + email triggers — FR-33)
-- ============================================================
CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "relatedId" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "actionUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 17. AUDIT LOGS (full audit trail — PRD §13, FR-O5)
-- ============================================================
CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES "User"("id"),
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "before" TEXT,
  "after" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 18. LOGIN ATTEMPTS (rate limiting / brute-force protection — PRD §13)
-- ============================================================
CREATE TABLE "LoginAttempt" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES "User"("id"),
  "email" TEXT NOT NULL,
  "ipAddress" TEXT,
  "success" BOOLEAN NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES (performance)
-- ============================================================
CREATE INDEX idx_user_institution ON "User"("institutionId");
CREATE INDEX idx_user_program ON "User"("programId");
CREATE INDEX idx_user_role ON "User"("role");
CREATE INDEX idx_project_student ON "Project"("studentId");
CREATE INDEX idx_project_supervisor ON "Project"("supervisorId");
CREATE INDEX idx_project_institution ON "Project"("institutionId");
CREATE INDEX idx_project_status ON "Project"("status");
CREATE INDEX idx_project_field ON "Project"("field");
CREATE INDEX idx_logbook_project ON "LogbookEntry"("projectId");
CREATE INDEX idx_logbook_status ON "LogbookEntry"("status");
CREATE INDEX idx_document_project ON "Document"("projectId");
CREATE INDEX idx_milestone_project ON "Milestone"("projectId");
CREATE INDEX idx_evaluation_project ON "Evaluation"("projectId");
CREATE INDEX idx_evaluation_evaluator ON "Evaluation"("evaluatorId");
CREATE INDEX idx_notification_user ON "Notification"("userId");
CREATE INDEX idx_notification_read ON "Notification"("isRead");
CREATE INDEX idx_aichat_user ON "AiChatLog"("userId");
CREATE INDEX idx_aichat_created ON "AiChatLog"("createdAt");
CREATE INDEX idx_audit_user ON "AuditLog"("userId");
CREATE INDEX idx_audit_entity ON "AuditLog"("entity");
CREATE INDEX idx_audit_created ON "AuditLog"("createdAt");
CREATE INDEX idx_equipment_institution ON "Equipment"("institutionId");
CREATE INDEX idx_equipment_status ON "Equipment"("status");
CREATE INDEX idx_booking_student ON "EquipmentBooking"("studentId");
CREATE INDEX idx_booking_equipment ON "EquipmentBooking"("equipmentId");
CREATE INDEX idx_loginattempt_email ON "LoginAttempt"("email");
CREATE INDEX idx_loginattempt_created ON "LoginAttempt"("createdAt");

-- ============================================================
-- Schema creation complete!
-- Next: Run supabase-seed.sql to populate dummy data.
-- ============================================================
