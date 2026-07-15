# Portal Pembelajaran Projek Tahun Akhir Pelajar TVET (JTM)

> **Sistem digital bersepadu untuk pengurusan Projek Tahun Akhir (FYP) pelajar TVET bidang Elektrik Kuasa & RAC di bawah Jabatan Tenaga Manusia (JTM), Kementerian Sumber Manusia Malaysia.**

![Tech Stack](https://img.shields.io/badge/Stack-Next.js%2016%20%7C%20TypeScript%20%7C%20Tailwind%20%7C%20Prisma%20%7C%20Supabase-blue)
![UI](https://img.shields.io/badge/UI-Glassmorphism-purple)
![License](https://img.shields.io/badge/License-JTM%20Internal-orange)

Reference: **PRD-JTM-TVET-FYP-2026-v1.0**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [User Roles & RBAC](#user-roles--rbac)
- [Getting Started](#getting-started)
- [Database Setup (Supabase)](#database-setup-supabase)
- [Demo Credentials](#demo-credentials)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Security](#security)
- [License](#license)

---

## 🎯 Overview

Portal FYP TVET ialah platform digital bersepadu yang dibangunkan khusus untuk menyokong keseluruhan kitaran hayat Projek Tahun Akhir (FYP) bagi pelajar TVET dalam dua bidang teras:

- **Elektrik Kuasa** — sistem pendawaian, kawalan motor, PLC, pengagihan tenaga
- **Penyejukbekuan & Penyamanan Udara (RAC)** — sistem penyejukan komersial dan domestik

Sistem ini menggantikan proses manual (dokumen fizikal, emel, Excel) dengan platform bersepadu yang membolehkan pelajar, penyelia, panel penilai, dan pentadbir JTM berkolaborasi secara digital dan telus.

---

## ✨ Features

### 10 Functional Modules (FR-01 to FR-36)

| Module | Description |
|--------|-------------|
| 🔐 **Auth & User Management** | Login/register, RBAC, MFA-ready, bulk user import |
| 📝 **Project Proposals** | Multi-step proposal form, similarity check, approve/reject workflow |
| 📔 **Digital Logbook** | Weekly activity logs, supervisor sign-off, photo attachments |
| 📄 **Document Management** | Upload drafts/reports/posters/videos, version history, review comments |
| 📅 **Milestones & Viva** | Timeline tracking, deadline reminders, viva scheduling with conflict detection |
| 📊 **Rubric Evaluation** | Digital rubrics, auto-score calculation, multi-evaluator support |
| 🗄️ **Project Repository** | Searchable archive of completed projects |
| 🤖 **AI Assistant (GLM)** | Technical Q&A, draft review, feedback generation — server-side, rate-limited |
| 🔧 **Equipment Inventory** | Lab equipment booking and approval system |
| 📈 **Analytics Dashboard** | National KPIs, institutional performance, charts |

### Additional Features

- **Glassmorphism UI/UX** — frosted glass cards, gradient backgrounds, smooth animations
- **Real-time Notifications** — in-app + email triggers
- **Audit Trail** — full logging of critical actions
- **Responsive Design** — mobile-first, works on phone/tablet/desktop
- **Jotform AI Chatbot** — embedded assistant ("Maya")

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| **UI Components** | shadcn/ui (New York style), Lucide icons, Framer Motion |
| **Charts** | Recharts |
| **Backend** | Next.js API Routes (App Router) |
| **Database** | PostgreSQL (Supabase) via Prisma ORM |
| **Auth** | Custom JWT sessions (httpOnly cookies, HMAC-signed) |
| **AI** | Z.ai GLM-4.6 via z-ai-web-dev-sdk (server-side only) |
| **Deployment** | Netlify (frontend) + Supabase (backend) |

---

## 👥 User Roles & RBAC

| Role | Permissions |
|------|------------|
| **Pelajar (Student)** | Create proposals, logbook, upload documents, use AI, book equipment |
| **Penyelia (Supervisor)** | Approve/reject proposals, sign-off logbook, evaluate, AI feedback drafts |
| **Panel Penilai** | Evaluate viva presentations using rubrics |
| **Pentadbir Institusi** | Manage institution users, equipment, milestones |
| **Pentadbir JTM Pusat** | National analytics, manage rubrics, audit logs, all access |
| **DevOps** | System maintenance, full access |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Supabase project (or local PostgreSQL)

### Installation

```bash
# Clone the repository
git clone https://github.com/rosliza1/Portal-Pembelajaran-Projek-Tahun-Akhir-Pelajar-TVET.git
cd Portal-Pembelajaran-Projek-Tahun-Akhir-Pelajar-TVET

# Install dependencies
bun install
# or: npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your Supabase DATABASE_URL

# Generate Prisma client
bun run db:generate

# Push schema to database
bun run db:push

# (Optional) Seed dummy data
bun run prisma/seed.ts

# Start development server
bun run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🗄️ Database Setup (Supabase)

### Option A: Using Prisma (recommended for developers)

1. Create a Supabase project at https://supabase.com
2. Get your connection string from Project Settings → Database
3. Set `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
   ```
   *(URL-encode special characters: `@` → `%40`)*
4. Ensure `prisma/schema.prisma` has `provider = "postgresql"`
5. Run:
   ```bash
   bun run db:push      # creates 17 tables
   bun run prisma/seed.ts  # populates dummy data
   ```

### Option B: Using SQL Editor (no CLI needed)

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase-complete.sql` from this repo
3. Copy all content → paste → Run
4. All 17 tables + dummy data created instantly

See `SUPABASE-SETUP-GUIDE.md` for detailed instructions.

---

## 🔑 Demo Credentials

All accounts use password: **`Portal@2026`**

| Role | Email |
|------|-------|
| Pelajar | `pelajar1@jtm.gov.my` |
| Penyelia | `nurul.huda@jtm.gov.my` |
| Panel Penilai | `panel1@jtm.gov.my` |
| Pentadbir Institusi | `admin.bangi@jtm.gov.my` |
| Pentadbir JTM Pusat | `admin.jtm@jtm.gov.my` |

---

## 🌐 Deployment

### Deploy to Netlify

1. Push your code to GitHub (this repo)
2. Go to https://app.netlify.com → Add new site → Import from Git
3. Select this repository
4. Configure build settings:
   - **Build command**: `bun run build` (or `npm run build`)
   - **Publish directory**: `.next`
5. Set environment variables:
   - `DATABASE_URL` = your Supabase connection string
   - `SESSION_SECRET` = a random secret string
6. Deploy!

### Post-Deployment Checklist

- [ ] Database tables created in Supabase
- [ ] Environment variables set in Netlify
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic with Netlify)
- [ ] Test login with demo credentials
- [ ] Verify AI Assistant works (GLM API)

---

## 📁 Project Structure

```
├── prisma/
│   ├── schema.prisma          # Database schema (17 models)
│   └── seed.ts                # Dummy data seeder
├── src/
│   ├── app/
│   │   ├── api/               # API routes (18 endpoints)
│   │   │   ├── auth/          # login, logout, register, me
│   │   │   ├── projects/      # CRUD + approve/reject
│   │   │   ├── logbook/       # weekly entries + sign-off
│   │   │   ├── documents/     # upload + review
│   │   │   ├── milestones/    # timeline + viva scheduling
│   │   │   ├── rubrics/       # evaluation templates
│   │   │   ├── evaluations/   # scoring
│   │   │   ├── equipment/     # inventory + bookings
│   │   │   ├── ai-chat/       # GLM AI assistant
│   │   │   ├── analytics/     # dashboard stats
│   │   │   ├── users/         # user management
│   │   │   ├── audit-logs/    # audit trail
│   │   │   ├── notifications/ # in-app notifications
│   │   │   └── ...
│   │   ├── globals.css        # Glassmorphism design system
│   │   ├── layout.tsx         # Root layout + Jotform chatbot
│   │   └── page.tsx           # Main app entry
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── views/             # 15 dashboard view components
│   │   ├── app-shell.tsx      # Main layout (sidebar, topbar, footer)
│   │   ├── ai-assistant.tsx   # GLM chat panel
│   │   ├── glass-ui.tsx       # Reusable glass components
│   │   └── login-page.tsx     # Login/Register page
│   └── lib/
│       ├── auth.ts            # Auth, RBAC, security helpers
│       ├── db.ts              # Prisma client
│       ├── store.ts           # Zustand auth store
│       └── ui.ts              # UI helpers (labels, dates)
├── supabase-schema.sql        # SQL schema for Supabase
├── supabase-seed.sql          # SQL seed data for Supabase
├── supabase-complete.sql      # Combined schema + seed
└── SUPABASE-SETUP-GUIDE.md    # Detailed Supabase setup guide
```

---

## 🔒 Security

This system implements multiple layers of security per PRD §13:

- **RBAC** — Role-based access control enforced on every API route
- **Password Policy** — Minimum 8 characters, requires uppercase/lowercase/numbers
- **Rate Limiting** — Login attempts (5/15min lockout), AI chat (30/hour)
- **Session Security** — httpOnly cookies, HMAC-signed tokens, 8-hour expiry
- **Input Sanitization** — XSS prevention on all user inputs
- **Audit Trail** — All critical actions logged with user ID, IP, timestamp
- **PDPA 2010 Compliance** — Data protection per Malaysian law
- **TLS Encryption** — HTTPS in transit (via Netlify)
- **API Key Protection** — Z.ai GLM API key never exposed to client (server-side only)

---

## 📄 License

© 2026 Jabatan Tenaga Manusia (JTM), Kementerian Sumber Manusia (KESUMA).

**SULIT — Untuk Kegunaan Pembangunan Sistem Sahaja**

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## 📞 Support

For questions or support, contact the JTM Software Engineering team.

**Reference Document**: PRD-JTM-TVET-FYP-2026-v1.0
