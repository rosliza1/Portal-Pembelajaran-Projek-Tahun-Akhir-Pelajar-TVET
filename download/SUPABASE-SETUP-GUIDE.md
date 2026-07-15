# Supabase Setup Guide — Portal FYP TVET (JTM)

This guide explains how to set up your Supabase database for the Portal FYP TVET system.

## 📋 Prerequisites

- A Supabase project (you already have: `wbinwhbmkszeiguwebkl`)
- Access to the Supabase Dashboard → SQL Editor

## 🚀 Quick Setup (Recommended)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project (`wbinwhbmkszeiguwebkl`)
3. Click **SQL Editor** in the left sidebar
4. Click **+ New query**

### Step 2: Run the Complete SQL File
1. Open the file `supabase-complete.sql` (1241 lines, 340KB)
2. Copy ALL content
3. Paste into the SQL Editor
4. Click **Run** (▶️ button)
5. Wait for execution (~5-10 seconds)
6. You should see "Success. No rows returned" message

### Step 3: Verify Tables Created
1. Go to **Table Editor** in the left sidebar
2. You should see 18 tables:
   - Institution, Program, User, Supervisor, Student
   - Project, ProjectMember, LogbookEntry, Document, Milestone
   - Rubric, Evaluation, Equipment, EquipmentBooking
   - AiChatLog, Notification, AuditLog, LoginAttempt
3. Click on any table to verify data (e.g., "User" should have 42 rows)

## 📁 Alternative: Run Files Separately

If the complete file is too large, run them in order:

1. **First**: Run `supabase-schema.sql` (creates 17 tables + indexes)
2. **Second**: Run `supabase-seed.sql` (populates all dummy data)

## 🔑 Demo Login Credentials

All accounts use password: **`Portal@2026`**

| Role | Email | Use Case |
|------|-------|----------|
| Pelajar | `pelajar1@jtm.gov.my` | Student dashboard, create projects, logbook |
| Penyelia | `nurul.huda@jtm.gov.my` | Supervisor dashboard, approve proposals, sign-off logbook |
| Panel Penilai | `panel1@jtm.gov.my` | Evaluate viva presentations using rubrics |
| Pentadbir Institusi | `admin.bangi@jtm.gov.my` | Manage institution users, equipment |
| Pentadbir JTM Pusat | `admin.jtm@jtm.gov.my` | National analytics, manage rubrics, audit logs |

## 📊 Data Summary

| Table | Records |
|-------|---------|
| Institution | 5 (ILP Bangi, ILP Kuching, IKBN Setapak, ADTEC Batu Pahat, ILP Pasir Gudang) |
| Program | 2 (Elektrik Kuasa, RAC) |
| User | 42 (25 students, 8 supervisors, 3 panels, 2 inst admins, 2 JTM admins, 2 test) |
| Supervisor | 8 |
| Student | 27 |
| Project | 25 (13 Elektrik Kuasa, 12 RAC) |
| LogbookEntry | 126 (weekly activity logs) |
| Document | 49 (proposals, drafts, reports, posters) |
| Milestone | 125 (Proposal → Progress 1 → Progress 2 → Viva → Final) |
| Rubric | 4 (evaluation templates) |
| Evaluation | 22 (progress + viva + final report scores) |
| Equipment | 15 (multimeters, PLC trainers, compressors, etc.) |
| EquipmentBooking | 12 |
| AiChatLog | 61 (GLM technical Q&A interactions) |
| Notification | 64 |
| AuditLog | 66 |

## 🔧 Connecting the App to Supabase

### For Local Development (on your machine with port 5432 access):

1. **Edit `prisma/schema.prisma`** — change the provider:
   ```prisma
   datasource db {
     provider = "postgresql"  # was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. **Edit `.env`** — set the Supabase connection string:
   ```
   DATABASE_URL=postgresql://postgres:Airul%40026jtm@db.wbinwhbmkszeiguwebkl.supabase.co:5432/postgres
   ```
   *(Note: the `@` in the password is URL-encoded as `%40`)*

3. **Generate Prisma Client**:
   ```bash
   bun run db:generate
   ```

4. **Run the app**:
   ```bash
   bun run dev
   ```

### For Netlify Deployment (Production):

1. Push your code to GitHub
2. Connect the repo to Netlify
3. Set environment variables in Netlify:
   - `DATABASE_URL` = `postgresql://postgres:Airul%40026jtm@db.wbinwhbmkszeiguwebkl.supabase.co:5432/postgres`
4. Set build command: `bun run build`
5. Set publish directory: `.next`
6. Deploy!

## ⚠️ Important Notes

1. **Password Security**: The password `Airul@026jtm` is stored in `.env` (gitignored). Consider changing it in Supabase Dashboard → Project Settings → Database → Reset password for production.

2. **RLS (Row Level Security)**: This schema does NOT enable Supabase RLS because the app enforces RBAC at the application layer (every API route checks user role). If you want defense-in-depth with native Supabase RLS policies (per PRD §11.3), you can add them as a follow-up.

3. **Connection Pooler**: For production, Supabase recommends using the connection pooler (port 6543) instead of direct connection (port 5432) to avoid exhausting connection limits. Update the URL to:
   ```
   postgresql://postgres.wbinwhbmkszeiguwebkl:Airul%40026jtm@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```

4. **Backups**: Supabase provides automatic daily backups on Pro plans. The PRD (§NFR) requires 30-day retention — verify your Supabase plan supports this.

## ✅ Verification Checklist

After running the SQL:
- [ ] 18 tables visible in Table Editor
- [ ] User table has 42 rows
- [ ] Project table has 25 rows
- [ ] Can log in with `pelajar1@jtm.gov.my` / `Portal@2026`
- [ ] Dashboard shows real data (projects, notifications, etc.)

## 🆘 Troubleshooting

**Error: "relation already exists"**
→ The DROP statements in supabase-schema.sql should handle this. If not, manually drop tables first.

**Error: "foreign key constraint"**
→ Run schema.sql first, then seed.sql. The seed uses DELETE before INSERT to avoid conflicts.

**Can't log in after setup**
→ Verify the User table has the bcrypt hash: `$2b$10$GkTFpE8b.vkkc5dVRFeq.uNrIYxdb1S77CEYSg/xwov5M0h6jPTCC`
→ This is the hash for password `Portal@2026`
