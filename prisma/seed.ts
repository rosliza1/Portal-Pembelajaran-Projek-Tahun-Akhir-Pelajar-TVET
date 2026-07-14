// Seed script for Portal FYP TVET (JTM)
// Generates dummy data per PRD §11.4
// Run: bun run prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

// Deterministic IDs for relations
const id = (prefix: string, n: number) => `${prefix}-${String(n).padStart(3, '0')}`

async function main() {
  console.log('🌱 Seeding Portal FYP TVET database...')

  // Clean existing data
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.notification.deleteMany(),
    db.aiChatLog.deleteMany(),
    db.equipmentBooking.deleteMany(),
    db.equipment.deleteMany(),
    db.evaluation.deleteMany(),
    db.rubric.deleteMany(),
    db.milestone.deleteMany(),
    db.document.deleteMany(),
    db.logbookEntry.deleteMany(),
    db.projectMember.deleteMany(),
    db.project.deleteMany(),
    db.student.deleteMany(),
    db.supervisor.deleteMany(),
    db.loginAttempt.deleteMany(),
    db.user.deleteMany(),
    db.program.deleteMany(),
    db.institution.deleteMany(),
  ])

  // ============ INSTITUTIONS (5) ============
  const institutions = [
    { id: id('inst', 1), code: 'ILP-Bangi', name: 'ILP Bangi', type: 'ILP', state: 'Selangor', address: 'Jalan 3/5, Bandar Baru Bangi, Selangor' },
    { id: id('inst', 2), code: 'ILP-Kuching', name: 'ILP Kuching', type: 'ILP', state: 'Sarawak', address: 'Jalan Semarak, Kuching, Sarawak' },
    { id: id('inst', 3), code: 'IKBN-Setapak', name: 'IKBN Setapak', type: 'IKBN', state: 'Wilayah Persekutuan Kuala Lumpur', address: 'Jalan Genting Kelang, Setapak, Kuala Lumpur' },
    { id: id('inst', 4), code: 'ADTEC-BatuPahat', name: 'ADTEC Batu Pahat', type: 'ADTEC', state: 'Johor', address: 'Kawasan Perindustrian Tongkang Pecah, Batu Pahat, Johor' },
    { id: id('inst', 5), code: 'ILP-PasirGudang', name: 'ILP Pasir Gudang', type: 'ILP', state: 'Johor', address: 'Jalan Pekeliling, Pasir Gudang, Johor' },
  ]
  for (const inst of institutions) {
    await db.institution.create({ data: inst })
  }

  // ============ PROGRAMS (2) ============
  const programs = [
    { id: id('prog', 1), code: 'EK', name: 'Diploma Kemahiran Malaysia - Elektrik Kuasa', field: 'Elektrik Kuasa', description: 'Program pengajian dalam bidang Elektrik Kuasa meliputi sistem pendawaian, kawalan motor, dan pengagihan tenaga elektrik.' },
    { id: id('prog', 2), code: 'RAC', name: 'Diploma Kemahiran Malaysia - Penyejukbekuan & Penyamanan Udara', field: 'RAC', description: 'Program pengajian dalam bidang Penyejukbekuan dan Penyamanan Udara meliputi sistem penyejukan komersial, domestik, dan industri.' },
  ]
  for (const p of programs) {
    await db.program.create({ data: p })
  }

  // ============ PASSWORD HASHING ============
  const passwordHash = await bcrypt.hash('Portal@2026', 10)

  // Helper to create user
  type UserInput = {
    id: string; email: string; fullName: string; role: string
    phone?: string; institutionId?: string; programId?: string; session?: string
  }
  const createUser = async (u: UserInput) => {
    return db.user.create({ data: { ...u, passwordHash, isActive: true } })
  }

  // ============ USERS (40 total) ============
  // 8 Supervisors
  const supervisorsData = [
    { id: id('usr', 1), email: 'nurul.huda@jtm.gov.my', fullName: 'Nurul Huda Binti Abd Rahman', role: 'SUPERVISOR', institutionId: id('inst', 1), programId: id('prog', 2), phone: '+6012-345 6781' },
    { id: id('usr', 2), email: 'mohd.fauzi@jtm.gov.my', fullName: 'Mohd Fauzi Bin Ibrahim', role: 'SUPERVISOR', institutionId: id('inst', 1), programId: id('prog', 1), phone: '+6012-345 6782' },
    { id: id('usr', 3), email: 'siti.aisyah@jtm.gov.my', fullName: 'Siti Aisyah Binti Mohamed', role: 'SUPERVISOR', institutionId: id('inst', 2), programId: id('prog', 2), phone: '+6012-345 6783' },
    { id: id('usr', 4), email: 'ahmad.zamri@jtm.gov.my', fullName: 'Ahmad Zamri Bin Yusof', role: 'SUPERVISOR', institutionId: id('inst', 3), programId: id('prog', 1), phone: '+6012-345 6784' },
    { id: id('usr', 5), email: 'roselan.idris@jtm.gov.my', fullName: 'Roselan Bin Idris', role: 'SUPERVISOR', institutionId: id('inst', 4), programId: id('prog', 1), phone: '+6012-345 6785' },
    { id: id('usr', 6), email: 'kamilia.zain@jtm.gov.my', fullName: 'Kamilia Binti Zainal Abidin', role: 'SUPERVISOR', institutionId: id('inst', 4), programId: id('prog', 2), phone: '+6012-345 6786' },
    { id: id('usr', 7), email: 'hazim.razak@jtm.gov.my', fullName: 'Hazim Bin Abdul Razak', role: 'SUPERVISOR', institutionId: id('inst', 5), programId: id('prog', 1), phone: '+6012-345 6787' },
    { id: id('usr', 8), email: 'faridah.amin@jtm.gov.my', fullName: 'Faridah Binti Aminuddin', role: 'SUPERVISOR', institutionId: id('inst', 5), programId: id('prog', 2), phone: '+6012-345 6788' },
  ]
  for (const u of supervisorsData) await createUser(u)

  // Create Supervisor records
  const supervisorRecords = [
    { id: id('sup', 1), userId: id('usr', 1), staffNo: 'SUP-2011-001', expertiseField: 'RAC', maxStudents: 15, institutionId: id('inst', 1) },
    { id: id('sup', 2), userId: id('usr', 2), staffNo: 'SUP-2010-014', expertiseField: 'Elektrik Kuasa', maxStudents: 15, institutionId: id('inst', 1) },
    { id: id('sup', 3), userId: id('usr', 3), staffNo: 'SUP-2013-022', expertiseField: 'RAC', maxStudents: 12, institutionId: id('inst', 2) },
    { id: id('sup', 4), userId: id('usr', 4), staffNo: 'SUP-2009-008', expertiseField: 'Elektrik Kuasa', maxStudents: 15, institutionId: id('inst', 3) },
    { id: id('sup', 5), userId: id('usr', 5), staffNo: 'SUP-2012-031', expertiseField: 'Elektrik Kuasa', maxStudents: 18, institutionId: id('inst', 4) },
    { id: id('sup', 6), userId: id('usr', 6), staffNo: 'SUP-2014-017', expertiseField: 'RAC', maxStudents: 12, institutionId: id('inst', 4) },
    { id: id('sup', 7), userId: id('usr', 7), staffNo: 'SUP-2011-040', expertiseField: 'Elektrik Kuasa', maxStudents: 15, institutionId: id('inst', 5) },
    { id: id('sup', 8), userId: id('usr', 8), staffNo: 'SUP-2013-045', expertiseField: 'RAC', maxStudents: 12, institutionId: id('inst', 5) },
  ]
  for (const s of supervisorRecords) await db.supervisor.create({ data: s })

  // 25 Students
  const studentNames = [
    'Ahmad Faizal Bin Osman','Nur Aina Binti Khalid','Muhammad Irfan Haikal','Siti Khadijah Binti Roslan','Tan Wei Jie',
    'Lim Mei Ling','Rajesh Kumar A/L Segar','Nor Syafiqah Binti Azmi','Muhammad Danish Bin Zaki','Lee Chong Wei',
    'Aisyah Binti Abdullah','Mohd Hafiz Bin Ramli','Priya D/O Subramaniam','Wong Kah Lok','Fatimah Binti Zahra',
    'Ahmad Luqman Bin Hakim','Nurul Izzah Binti Mansor','Arvind A/L Krishnan','Goh Sze Ying','Muhammad Amin Bin Saad',
    'Zulaikha Binti Othman','Hafizuddin Bin Jalal','Kavitha D/O Raju','Tan Boon Hui','Siti Mariam Binti Yusof',
  ]
  const fields = ['Elektrik Kuasa','RAC']
  const instIds = [id('inst',1), id('inst',2), id('inst',3), id('inst',4), id('inst',5)]
  for (let i = 0; i < 25; i++) {
    const fieldIdx = i % 2
    const instIdx = i % 5
    const supIdx = (fieldIdx === 0) ? (instIdx % 4) : (instIdx % 4) // map supervisor by field
    const supervisorId = fieldIdx === 0
      ? [id('sup',2), id('sup',4), id('sup',5), id('sup',7)][instIdx % 4]
      : [id('sup',1), id('sup',3), id('sup',6), id('sup',8)][instIdx % 4]
    const userId = id('usr', 9 + i)
    await createUser({
      id: userId,
      email: `pelajar${i + 1}@jtm.gov.my`,
      fullName: studentNames[i],
      role: 'STUDENT',
      institutionId: instIds[instIdx],
      programId: fieldIdx === 0 ? id('prog', 1) : id('prog', 2),
      phone: `+6011-2345 ${String(1000 + i).padStart(4, '0')}`,
      session: '2025/2026',
    })
    await db.student.create({
      data: {
        id: id('std', i + 1),
        userId,
        registrationNo: `DKM${2026}${String(i + 1).padStart(3, '0')}`,
        cohort: '2024/2025',
        supervisorId,
      },
    })
  }

  // 3 Panel Penilai
  const panelData = [
    { id: id('usr', 34), email: 'panel1@jtm.gov.my', fullName: 'Ir. Hj. Bakri Bin Salim', role: 'PANEL', institutionId: id('inst', 3), programId: id('prog', 1), phone: '+6019-111 2221' },
    { id: id('usr', 35), email: 'panel2@jtm.gov.my', fullName: 'Ts. Dr. Rohaya Binti Sulaiman', role: 'PANEL', institutionId: id('inst', 4), programId: id('prog', 2), phone: '+6019-111 2222' },
    { id: id('usr', 36), email: 'panel3@jtm.gov.my', fullName: 'Ir. Chandran A/L Gopal', role: 'PANEL', institutionId: id('inst', 5), programId: id('prog', 1), phone: '+6019-111 2223' },
  ]
  for (const u of panelData) await createUser(u)

  // 2 Institution Admins
  const instAdmins = [
    { id: id('usr', 37), email: 'admin.bangi@jtm.gov.my', fullName: 'Abdul Razak Bin Hassan', role: 'INSTITUTION_ADMIN', institutionId: id('inst', 1), phone: '+603-8925 1001' },
    { id: id('usr', 38), email: 'admin.adtec@jtm.gov.my', fullName: 'Zainab Binti Abas', role: 'INSTITUTION_ADMIN', institutionId: id('inst', 4), phone: '+607-433 1001' },
  ]
  for (const u of instAdmins) await createUser(u)

  // 2 JTM Central Admins
  const jtmAdmins = [
    { id: id('usr', 39), email: 'admin.jtm@jtm.gov.my', fullName: 'Mohd Shahir Bin Abdullah', role: 'JTM_ADMIN', phone: '+603-8886 2001' },
    { id: id('usr', 40), email: 'admin2.jtm@jtm.gov.my', fullName: 'Norbaiti Binti Wahab', role: 'JTM_ADMIN', phone: '+603-8886 2002' },
  ]
  for (const u of jtmAdmins) await createUser(u)

  // ============ PROJECTS (25) ============
  const projectTitlesEK = [
    'Sistem Kawalan Motor 3 Fasa Berasaskan PLC',
    'Reka Bentuk Sistem Pendawaian Automatik Bangunan Pintar',
    'Pemasangan Sistem Perlindungan Kilat untuk Bangunan Komersial',
    'Sistem Kawalan Lampu Jalan Berasaskan IoT',
    'Reka Bentuk Panel Kawalan Motor untuk Sistem Konveyor',
    'Integrasi Sistem Solar Fotovoltaik dengan Grid TNB',
    'Sistem Pemantauan Beban Elektrik Berasaskan Mikropengawal',
    'Pemasangan Sistem UPS untuk Makmal Elektrik',
    'Sistem Automasi Rumah menggunakan Arduino dan Relay',
    'Reka Bentuk Sistem Pembumian untuk Substesen 11kV',
    'Sistem Pengurusan Tenaga untuk Bangunan Pejabat',
    'Pemulihan dan Naik Taraf Panel Kawalan Motor DC',
    'Sistem Pencegahan Kebocoran Arus Menggunakan RCCB Pintar',
  ]
  const projectTitlesRAC = [
    'Reka Bentuk Sistem Penyejukan Bilik Sejuk Kapasiti Kecil',
    'Pemasangan Sistem Penyamanan Udara Pusat untuk Pejabat',
    'Sistem Pemantauan Suhu dan Kelembapan Bilik Server',
    'Pengoptimuman Sistem Penyejukbekuan Komersial menggunakan Pendingin Semula',
    'Penjimatan Tenaga pada Sistem Chiller dengan Inverter',
    'Sistem Pengesan Kebocoran Refrigeran R-410A',
    'Reka Bentuk Unit Display Pendingin untuk Kedai Runcit',
    'Sistem Kawalan Suhu Automatik untuk Rumah Hijau',
    'Penyelesaian Penyejukan Hibrid Solar-Powered untuk Kawasan Luar Bandar',
    'Naik Taraf Sistem Penyamanan Udara dengan Teknologi Pemulihan Habuk',
    'Sistem Penyejukbekuan untuk Penyimpanan Vaksin Berkapasiti Sederhana',
    'Pengimejan Terma untuk Pengesanan Kecacatan Sistem RAC',
  ]
  const statuses = ['DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','COMPLETED']
  // 13 EK + 12 RAC = 25 projects
  const allProjects = [
    ...projectTitlesEK.map((t, i) => ({ title: t, field: 'Elektrik Kuasa', idx: i })),
    ...projectTitlesRAC.map((t, i) => ({ title: t, field: 'RAC', idx: i + 13 })),
  ]

  for (let i = 0; i < 25; i++) {
    const p = allProjects[i]
    const studentIdx = i
    const student = await db.student.findUnique({ where: { id: id('std', studentIdx + 1) }, include: { user: true, supervisor: true } })
    if (!student) continue
    const status = i < 8 ? 'COMPLETED' : i < 13 ? 'APPROVED' : i < 17 ? 'UNDER_REVIEW' : i < 21 ? 'SUBMITTED' : i < 23 ? 'REJECTED' : 'DRAFT'
    const similarity = status === 'SUBMITTED' || status === 'UNDER_REVIEW' ? Math.round((Math.random() * 30 + 5) * 100) / 100 : 0
    const createdDaysAgo = 120 - i * 4
    const created = new Date(Date.now() - createdDaysAgo * 86400000)
    const approved = status === 'APPROVED' || status === 'COMPLETED' ? new Date(created.getTime() + 7 * 86400000) : null
    const completed = status === 'COMPLETED' ? new Date(created.getTime() + 100 * 86400000) : null

    await db.project.create({
      data: {
        id: id('prj', i + 1),
        title: p.title,
        field: p.field,
        scope: `Skop projek ini merangkumi reka bentuk, pembinaan, ujian dan pendokumentasian ${p.title.toLowerCase()} bagi memenuhi keperluan Diploma Kemahiran Malaysia bidang ${p.field}.`,
        objectives: `1. Merekabentuk sistem yang berfungsi mengikut spesifikasi teknikal.\n2. Membina prototaip dengan komponen yang dipilih.\n3. Menjalankan ujian prestasi dan keselamatan.\n4. Mendokumentasikan laporan teknikal lengkap.`,
        bomList: JSON.stringify([
          { item: 'Mikropengawal PLC Siemens S7-1200', qty: 1, estCost: 3500 },
          { item: 'Motor 3 Fasa 5.5kW', qty: 1, estCost: 2800 },
          { item: 'Kabel PVC 2.5mm² (50m)', qty: 1, estCost: 250 },
          { item: 'Suis MCB 32A', qty: 2, estCost: 80 },
        ]),
        scheduleStart: created,
        scheduleEnd: new Date(created.getTime() + 120 * 86400000),
        studentId: student.id,
        supervisorId: student.supervisorId,
        institutionId: student.user.institutionId!,
        programId: student.user.programId!,
        status,
        similarityScore: similarity,
        rejectionReason: status === 'REJECTED' ? 'Skop projek terlalu luas dan perlu ditumpukan kepada satu aspek teknikal yang lebih spesifik.' : null,
        approvedAt: approved,
        completedAt: completed,
        createdById: student.userId,
        createdAt: created,
        updatedAt: new Date(),
      },
    })
  }

  // ============ LOGBOOK ENTRIES (150 = 6 per project for 25 projects) ============
  const tasks = [
    'Menyediakan kajian literatur dan tinjauan teknologi sedia ada',
    'Merekabentuk litar skematik dan gambarajah blok sistem',
    'Membeli komponen dan peralatan projek dari pembekal',
    'Membina prototaip dan membuat pendawaian pada papan projek',
    'Menjalankan ujian fungsi asas dan penyelesaian masalah (troubleshooting)',
    'Merekod data ujian dan menyediakan laporan teknikal akhir',
  ]
  const issues = [
    'Tiada isu utama, kerja berjalan lancar.',
    'Bekalan komponen sedikit lewat, perlu menunggu 3 hari.',
    'Berlaku percanggahan spesifikasi motor dengan pengawal; ditukar model.',
    'Isu pemanasan berlebihan pada transistor kawalan; ditambah heatsink.',
    'Kesukaran mendapatkan refrigeran R-410A; diasingkan sementara.',
    'Litar kawalan perlu dibaiki selepas ujian voltan tinggi.',
  ]
  for (let p = 0; p < 25; p++) {
    const project = await db.project.findUnique({ where: { id: id('prj', p + 1) }, include: { student: { include: { user: true } } } })
    if (!project) continue
    const logCount = project.status === 'DRAFT' ? 2 : project.status === 'SUBMITTED' || project.status === 'REJECTED' ? 3 : 6
    for (let w = 1; w <= logCount; w++) {
      const signOff = w < logCount || project.status === 'COMPLETED' || project.status === 'APPROVED'
      await db.logbookEntry.create({
        data: {
          id: id('log', p * 6 + w),
          projectId: project.id,
          studentId: project.student!.userId,
          weekNumber: w,
          entryDate: new Date(Date.now() - (logCount - w) * 7 * 86400000),
          tasksDone: tasks[(w - 1) % tasks.length],
          hoursWorked: 6 + (w % 4),
          issuesFaced: issues[(w - 1) % issues.length],
          attachments: w === 4 ? JSON.stringify(['logbook-photo-1.jpg','logbook-photo-2.jpg']) : null,
          status: signOff ? 'SIGNED_OFF' : 'PENDING',
          signedOffAt: signOff ? new Date(Date.now() - (logCount - w) * 7 * 86400000 + 86400000) : null,
          signedOffById: signOff ? project.supervisorId : null,
          supervisorComment: signOff ? 'Kemajuan baik, teruskan usaha yang cemerlang.' : null,
          createdAt: new Date(Date.now() - (logCount - w) * 7 * 86400000),
        },
      })
    }
  }

  // ============ RUBRICS ============
  const rubrics = [
    {
      id: id('rub', 1), name: 'Rubrik Penilaian Progress (Elektrik Kuasa & RAC)', field: 'Both', evalType: 'supervisor_progress',
      criteria: JSON.stringify([
        { key: 'analisis_teknikal', label: 'Analisis Teknikal', maxScore: 20, weight: 20 },
        { key: 'reka_bentuk', label: 'Reka Bentuk Sistem', maxScore: 25, weight: 25 },
        { key: 'implementasi', label: 'Implementasi & Pembinaan', maxScore: 25, weight: 25 },
        { key: 'dokumentasi', label: 'Dokumentasi & Laporan', maxScore: 15, weight: 15 },
        { key: 'pengurusan_projek', label: 'Pengurusan Projek & Masa', maxScore: 15, weight: 15 },
      ]),
      totalWeight: 100, createdBy: id('usr', 39),
    },
    {
      id: id('rub', 2), name: 'Rubrik Penilaian Viva (Panel Penilai)', field: 'Both', evalType: 'panel_viva',
      criteria: JSON.stringify([
        { key: 'pembentangan', label: 'Pembentangan & Komunikasi', maxScore: 20, weight: 20 },
        { key: 'penguasaan_teknikal', label: 'Penguasaan Teknikal', maxScore: 30, weight: 30 },
        { key: 'soal_jawab', label: 'Sessi Soal Jawab', maxScore: 25, weight: 25 },
        { key: 'keaslian_projek', label: 'Keaslian & Inovasi Projek', maxScore: 25, weight: 25 },
      ]),
      totalWeight: 100, createdBy: id('usr', 39),
    },
    {
      id: id('rub', 3), name: 'Rubrik Laporan Akhir', field: 'Both', evalType: 'final_report',
      criteria: JSON.stringify([
        { key: 'struktur_laporan', label: 'Struktur & Format Laporan', maxScore: 15, weight: 15 },
        { key: 'kandungan_teknikal', label: 'Kandungan Teknikal', maxScore: 30, weight: 30 },
        { key: 'analisis_dan_keputusan', label: 'Analisis & Keputusan', maxScore: 25, weight: 25 },
        { key: 'rujukan_dan_petikan', label: 'Rujukan & Petikan', maxScore: 15, weight: 15 },
        { key: 'kualiti_penulisan', label: 'Kualiti Penulisan', maxScore: 15, weight: 15 },
      ]),
      totalWeight: 100, createdBy: id('usr', 39),
    },
  ]
  for (const r of rubrics) await db.rubric.create({ data: r })

  // ============ EVALUATIONS (20) ============
  const evalTypes = [
    { rubricId: id('rub', 1), evalType: 'supervisor_progress', base: 65 },
    { rubricId: id('rub', 2), evalType: 'panel_viva', base: 70 },
    { rubricId: id('rub', 3), evalType: 'final_report', base: 72 },
  ]
  let evalCounter = 0
  for (let i = 0; i < 8; i++) { // completed projects get evaluations
    const project = await db.project.findUnique({ where: { id: id('prj', i + 1) }, include: { student: { include: { user: true, supervisor: { include: { user: true } } } } } })
    if (!project) continue
    // 2 evaluations per completed project (progress + viva) + 1 final = up to 3; we'll do 2-3 per project to reach ~20
    const evalCount = i < 4 ? 3 : 2 // 4*3 + 4*2 = 12 + 8 = 20
    for (let e = 0; e < evalCount; e++) {
      const et = evalTypes[e]
      const criteriaObj = JSON.parse(et.rubricId === id('rub', 1) ? rubrics[0].criteria : et.rubricId === id('rub', 2) ? rubrics[1].criteria : rubrics[2].criteria)
      const scores: Record<string, number> = {}
      let total = 0
      for (const c of criteriaObj) {
        const s = Math.min(c.maxScore, Math.round(c.maxScore * (0.7 + Math.random() * 0.3)))
        scores[c.key] = s
        total += s
      }
      evalCounter++
      const evaluatorId = et.evalType === 'panel_viva'
        ? [id('usr', 34), id('usr', 35), id('usr', 36)][i % 3]
        : project.supervisor ? (await db.supervisor.findUnique({ where: { id: project.supervisorId! } }))!.userId : id('usr', 39)
      await db.evaluation.create({
        data: {
          id: id('eval', evalCounter),
          projectId: project.id,
          evaluatorId,
          rubricId: et.rubricId,
          criterionScores: JSON.stringify(scores),
          totalScore: total,
          evalType: et.evalType,
          comments: et.evalType === 'panel_viva' ? 'Pembentangan jelas dan penguasaan teknikal baik. Beberapa penambahbaikan pada analisis data disarankan.' : et.evalType === 'supervisor_progress' ? 'Kemajuan memuaskan, pelajar menunjukkan komitmen yang tinggi.' : 'Laporan akhir lengkap dengan dokumentasi teknikal yang baik.',
          submittedAt: new Date(Date.now() - (8 - i) * 7 * 86400000),
        },
      })
    }
  }

  // ============ EQUIPMENT INVENTORY (15) ============
  const equipment = [
    { name: 'Multimeter Digital Fluke 87V', code: 'EQP-MM-001', category: 'Elektrik Kuasa', specification: 'True RMS, 1000V AC/DC, 10A' },
    { name: 'PLC Trainer Kit Siemens S7-1200', code: 'EQP-PLC-001', category: 'Elektrik Kuasa', specification: 'CPU 1214C DC/DC/DC dengan module I/O' },
    { name: 'Osiloskop Digital 100MHz', code: 'EQP-OSC-001', category: 'Elektrik Kuasa', specification: '4 channel, 1GSa/s sampling rate' },
    { name: 'Panel Motor 3 Fasa', code: 'EQP-MTR-001', category: 'Elektrik Kuasa', specification: '5.5kW, 415V, dengan Starter DOL dan Star-Delta' },
    { name: 'Megger Insulation Tester 5kV', code: 'EQP-MEG-001', category: 'Elektrik Kuasa', specification: 'Ujian 0.01MΩ - 10TΩ' },
    { name: 'Kit Pendawaian Bangunan', code: 'EQP-WIR-001', category: 'Elektrik Kuasa', specification: 'Termasuk MCB, RCCB, soket dan suis' },
    { name: 'Clamp Meter Hioki CM4373', code: 'EQP-CLM-001', category: 'Elektrik Kuasa', specification: 'AC/DC 2000A, True RMS' },
    { name: 'Power Quality Analyzer', code: 'EQP-PQA-001', category: 'Elektrik Kuasa', specification: 'Analisis harmonik, THD, power factor' },
    { name: 'Unit Kompresor RAC 2HP', code: 'EQP-CMP-001', category: 'RAC', specification: 'R-410A, 220V, untuk split unit' },
    { name: 'Manifold Gauge Set 4-way', code: 'EQP-MNF-001', category: 'RAC', specification: 'Digital, dengan 3 hos 60 inci' },
    { name: 'Termometer Digital Inframerah', code: 'EQP-TMP-001', category: 'RAC', specification: '-50°C hingga 550°C, laser pointer' },
    { name: 'Vacuum Pump 2-stage', code: 'EQP-VAC-001', category: 'RAC', specification: '5 CFM, untuk pengosongan sistem' },
    { name: 'Refrigerant Recovery Machine', code: 'EQP-RCV-001', category: 'RAC', specification: 'Untuk R-22, R-410A, R-134a' },
    { name: 'Psychrometer Digital', code: 'EQP-PSY-001', category: 'RAC', specification: 'Suhu mentah & bebas, kelembapan relatif' },
    { name: 'Leak Detector Elektronik', code: 'EQP-LKD-001', category: 'RAC', specification: 'Pengesan kebocoran refrigeran halogen' },
  ]
  for (let i = 0; i < equipment.length; i++) {
    const e = equipment[i]
    const institutionId = instIds[i % 5]
    const isBooked = i % 4 === 0
    const isMaintenance = i % 7 === 0
    await db.equipment.create({
      data: {
        id: id('eqp', i + 1),
        ...e,
        institutionId,
        status: isMaintenance ? 'UNDER_MAINTENANCE' : isBooked ? 'BOOKED' : 'AVAILABLE',
        quantity: 3,
        availableQty: isMaintenance ? 0 : isBooked ? 1 : 3,
      },
    })
  }

  // Equipment bookings (10)
  for (let i = 0; i < 10; i++) {
    const eqp = await db.equipment.findUnique({ where: { id: id('eqp', (i % 15) + 1) } })
    const student = await db.student.findUnique({ where: { id: id('std', (i % 25) + 1) } })
    if (!eqp || !student) continue
    const start = new Date(Date.now() + (i - 5) * 86400000 * 3)
    const end = new Date(start.getTime() + 7 * 86400000)
    const status = i < 5 ? 'RETURNED' : i < 8 ? 'APPROVED' : 'PENDING'
    await db.equipmentBooking.create({
      data: {
        id: id('bk', i + 1),
        equipmentId: eqp.id,
        studentId: student.userId,
        projectId: id('prj', (i % 25) + 1),
        bookingStart: start,
        bookingEnd: end,
        purpose: `Untuk tujuan ujian dan pembinaan projek tahun akhir (${eqp.name}).`,
        status,
        approvedById: status !== 'PENDING' ? id('usr', 37) : null,
        approvedAt: status !== 'PENDING' ? new Date(start.getTime() - 86400000) : null,
        returnNotes: status === 'RETURNED' ? 'Peralatan dipulangkan dalam keadaan baik.' : null,
      },
    })
  }

  // ============ MILESTONES ============
  const milestoneStages = [
    { name: 'Cadangan Projek', stage: 'PROPOSAL', offset: 0 },
    { name: 'Progress 1', stage: 'PROGRESS_1', offset: 30 },
    { name: 'Progress 2', stage: 'PROGRESS_2', offset: 60 },
    { name: 'Pembentangan Viva', stage: 'VIVA', offset: 100 },
    { name: 'Penyerahan Akhir', stage: 'FINAL_SUBMISSION', offset: 120 },
  ]
  for (let p = 0; p < 25; p++) {
    const project = await db.project.findUnique({ where: { id: id('prj', p + 1) } })
    if (!project) continue
    for (const m of milestoneStages) {
      const due = new Date(project.createdAt.getTime() + m.offset * 86400000)
      const isCompleted = project.status === 'COMPLETED' || (project.status === 'APPROVED' && (m.stage === 'PROPOSAL' || m.stage === 'PROGRESS_1'))
      const isViva = m.stage === 'VIVA' && project.status === 'COMPLETED'
      await db.milestone.create({
        data: {
          id: id('ms', p * 5 + milestoneStages.indexOf(m) + 1),
          projectId: project.id,
          name: m.name,
          stage: m.stage,
          dueDate: due,
          completedAt: isCompleted ? new Date(due.getTime() - 86400000) : null,
          status: isCompleted ? 'COMPLETED' : due < new Date() ? 'OVERDUE' : 'PENDING',
          vivaSlot: isViva ? due : null,
        },
      })
    }
  }

  // ============ DOCUMENTS (40 sample) ============
  const docTypes = ['PROPOSAL','DRAFT_CHAPTER','FINAL_REPORT','POSTER','VIDEO_DEMO']
  for (let p = 0; p < 25; p++) {
    const project = await db.project.findUnique({ where: { id: id('prj', p + 1) }, include: { student: { include: { user: true } } } })
    if (!project) continue
    // 1-2 documents per project
    const docCount = p < 8 ? 3 : p < 13 ? 2 : 1
    for (let d = 0; d < docCount; d++) {
      const type = docTypes[Math.min(d, docTypes.length - 1)]
      await db.document.create({
        data: {
          id: id('doc', p * 3 + d + 1),
          projectId: project.id,
          uploadedById: project.student!.userId,
          type,
          title: `${type.replace('_',' ')} - ${project.title.substring(0, 30)}`,
          fileName: `${type.toLowerCase()}_${p + 1}_v${d + 1}.pdf`,
          filePath: `/uploads/projects/${project.id}/${type.toLowerCase()}_${p + 1}_v${d + 1}.pdf`,
          fileSize: 1024 * 1024 * (2 + d),
          mimeType: 'application/pdf',
          version: d + 1,
          status: project.status === 'COMPLETED' ? 'APPROVED' : 'UPLOADED',
          reviewedAt: project.status === 'COMPLETED' ? new Date(project.updatedAt) : null,
          reviewedById: project.status === 'COMPLETED' ? project.supervisorId : null,
          comments: project.status === 'COMPLETED' ? JSON.stringify([{ page: 2, comment: 'Baik, perlu tambah rujukan IEC 60364.' }]) : null,
          createdAt: new Date(project.createdAt.getTime() + d * 14 * 86400000),
        },
      })
    }
  }

  // ============ AI CHAT LOGS (60) ============
  const aiPrompts = [
    { ctx: 'technical_qa', prompt: 'Bagaimana cara mengira beban penyejukan untuk bilik 20m²?', response: 'Untuk mengira beban penyejukan bilik 20m², anda perlu mempertimbangkan: (1) Beban haba sensibel dari dinding, siling dan lantai (~100-150 W/m²), (2) Beban haba dalaman dari penghuni (~80W/orang), (3) Beban peralatan elektrik, (4) Beban solaran melalui tingkap. Anggaran kasar: 20m² × 150W/m² = 3000W ≈ 1 HP. Cadangan: gunakan BTU/hr = 20m² × 1000 BTU/hr/m² = 20,000 BTU/hr ≈ 1.7 HP. Sila rujuk ASHRAE Fundamentals untuk pengiraan terperinci.' },
    { ctx: 'technical_qa', prompt: 'Apakah perbezaan antara litar pemula DOL dan Star-Delta untuk motor 3 fasa?', response: 'Pemula DOL (Direct-On-Line) menyambung motor terus ke bekalan penuh, menghasilkan arus mula yang tinggi (6-8 kali arus nominal) tetapi tork mula penuh. Sesuai untuk motor kecil (<5HP). Pemula Star-Delta memulakan motor dalam sambungan Star (voltan dikurangkan √3 kali, arus dan tork dikurangkan 1/3) kemudian bertukar ke Delta selepas motor mencapai kelajuan. Sesuai untuk motor besar (>5HP) di mana arus mula perlu dikawal. Trade-off: Star-Delta mengurangkan tork mula, jadi tidak sesuai untuk beban yang memerlukan tork mula tinggi seperti pam.' },
    { ctx: 'technical_qa', prompt: 'Apakah piawaian keselamatan elektrik yang perlu dipatuhi di Malaysia?', response: 'Piawaian keselamatan elektrik utama di Malaysia: (1) MS IEC 60364 - Pemasangan elektrik bangunan, (2) MS IEC 60947 - Peralatan kawalan voltan rendah, (3) Akta Bekalan Elektrik 1990 & Peraturan-peraturan Elektrik 1994, (4) Garis Panduan Suruhanjaya Tenaga. Amalan utama: gunakan PPE (sarung tangan isolasi, kasut getah), pastikan pembumian baik (<5Ω), labelkan panel dengan jelas, lakukan ujian isolasi berkala, dan sentiasa kunci tag (LOTO) sekerja pada litar.' },
    { ctx: 'proposal_help', prompt: 'Bantu saya tulis objektif untuk projek sistem kawalan motor PLC', response: 'Cadangan objektif projek: 1) Merekabentuk sistem kawalan motor 3 fasa berasaskan PLC Siemens S7-1200 dengan fungsi start-stop, reverse dan perlindungan beban lebih. 2) Membina panel kawalan lengkap dengan pendawaian mengikut MS IEC 60364. 3) Membangunkan aturcara ladder logic untuk automasi operasi motor. 4) Menjalankan ujian fungsi dan prestasi sistem termasuk ujian arus mula dan tork. 5) Mendokumentasikan laporan teknikal lengkap dengan gambarajah litar, senarai BOM, dan analisis keputusan ujian.' },
    { ctx: 'logbook_review', prompt: 'Ringkaskan kemajuan pelajar saya minggu ini', response: 'Berdasarkan log mingguan terkini, pelajar telah menyiapkan pembinaan prototaip dan sedang dalam fasa ujian fungsi. Isu utama: pemanasan berlebihan pada transistor kawalan telah diselesaikan dengan penambahan heatsink. Jumlah jam kerja minggu ini: 8 jam. Status: SIGNED_OFF. Cadangan: pelajar perlu mula menyediakan dokumentasi laporan sambil menunggu keputusan ujian akhir.' },
    { ctx: 'feedback_draft', prompt: 'Jana maklum balas untuk markah rubrik: analisis_teknikal=15, reka_bentuk=20', response: 'Maklum balas (draf): Analisis teknikal (15/20) - Analisis teknikal menunjukkan pemahaman yang baik tentang prinsip asas, namun bahasan terhadap pertimbangan alternatif boleh diperkukuh. Reka bentuk sistem (20/25) - Reka bentuk sistem adalah menyeluruh dan pelaksanaan praktikal. Beberapa penambahbaikan pada pemilihan komponen untuk mengoptimumkan kos disarankan. Secara keseluruhan, kemajuan projek adalah memuaskan dengan potensi peningkatan dalam dokumentasi justifikasi reka bentuk.' },
  ]
  for (let i = 0; i < 60; i++) {
    const tpl = aiPrompts[i % aiPrompts.length]
    const userId = id('usr', 9 + (i % 25)) // students
    const project = await db.project.findUnique({ where: { id: id('prj', (i % 25) + 1) } })
    await db.aiChatLog.create({
      data: {
        id: id('ai', i + 1),
        userId,
        projectId: project?.id,
        prompt: tpl.prompt,
        response: tpl.response,
        moduleContext: tpl.ctx,
        modelVersion: 'glm-4.6',
        rating: i % 5 === 0 ? 5 : i % 3 === 0 ? 4 : null,
        tokensUsed: 150 + (i * 7) % 300,
        createdAt: new Date(Date.now() - i * 6 * 3600000),
      },
    })
  }

  // ============ NOTIFICATIONS (50) ============
  const notifTemplates = [
    { title: 'Cadangan Diluluskan', message: 'Cadangan projek anda telah diluluskan oleh penyelia. Sila mula merekod log mingguan.', type: 'SUCCESS', category: 'PROJECT' },
    { title: 'Log Menunggu Pengesahan', message: 'Log mingguan baru memerlukan pengesahan penyelia.', type: 'INFO', category: 'LOGBOOK' },
    { title: 'Tarikh Akhir Hampir Tiba', message: 'Progress 1 akan tamat dalam 7 hari. Sila siapkan dokumen.', type: 'DEADLINE', category: 'DOCUMENT' },
    { title: 'Penilaian Diterima', message: 'Keputusan penilaian viva anda telah dihantar. Sila semak markah.', type: 'SUCCESS', category: 'EVALUATION' },
    { title: 'Tempahan Peralatan Diluluskan', message: 'Tempahan multimeter anda telah diluluskan. Sila kutip di makmal.', type: 'SUCCESS', category: 'EQUIPMENT' },
    { title: 'Komen Baharu pada Dokumen', message: 'Penyelia telah menambah komen pada draf laporan anda.', type: 'COMMENT', category: 'DOCUMENT' },
    { title: 'Cadangan Ditolak', message: 'Cadangan projek telah ditolak. Sila semak catatan dan hantar semula.', type: 'WARNING', category: 'PROJECT' },
    { title: 'Log Tertunggak', message: 'Log mingguan tidak dikemas kini melebihi 7 hari. Sila kemas kini segera.', type: 'WARNING', category: 'LOGBOOK' },
    { title: 'Sesi Viva Dijadualkan', message: 'Sesi pembentangan viva anda telah dijadualkan. Sila semak kalendar.', type: 'INFO', category: 'PROJECT' },
    { title: 'Pengguna Baharu Didaftarkan', message: '5 pelajar baharu telah didaftarkan dalam institusi anda.', type: 'INFO', category: 'SYSTEM' },
  ]
  for (let i = 0; i < 50; i++) {
    const tpl = notifTemplates[i % notifTemplates.length]
    // distribute across users
    const targetUserId = i < 25 ? id('usr', 9 + i) : i < 35 ? id('usr', 1 + (i % 8)) : id('usr', 37 + (i % 4))
    await db.notification.create({
      data: {
        id: id('ntf', i + 1),
        userId: targetUserId,
        title: tpl.title,
        message: tpl.message,
        type: tpl.type,
        category: tpl.category,
        relatedId: id('prj', (i % 25) + 1),
        isRead: i % 3 === 0,
        actionUrl: '/dashboard',
        createdAt: new Date(Date.now() - i * 4 * 3600000),
      },
    })
  }

  // ============ AUDIT LOGS (30) ============
  const auditActions = [
    { action: 'LOGIN', entity: 'User' },
    { action: 'APPROVE_PROPOSAL', entity: 'Project' },
    { action: 'REJECT_PROPOSAL', entity: 'Project' },
    { action: 'SUBMIT_LOGBOOK', entity: 'LogbookEntry' },
    { action: 'SIGNOFF_LOGBOOK', entity: 'LogbookEntry' },
    { action: 'UPLOAD_DOCUMENT', entity: 'Document' },
    { action: 'SUBMIT_EVALUATION', entity: 'Evaluation' },
    { action: 'CREATE_PROJECT', entity: 'Project' },
    { action: 'BOOK_EQUIPMENT', entity: 'EquipmentBooking' },
    { action: 'APPROVE_BOOKING', entity: 'EquipmentBooking' },
  ]
  for (let i = 0; i < 30; i++) {
    const a = auditActions[i % auditActions.length]
    const userId = i % 3 === 0 ? id('usr', 9 + (i % 25)) : i % 3 === 1 ? id('usr', 1 + (i % 8)) : id('usr', 37 + (i % 4))
    await db.auditLog.create({
      data: {
        id: id('aud', i + 1),
        userId,
        action: a.action,
        entity: a.entity,
        entityId: id('prj', (i % 25) + 1),
        before: JSON.stringify({ status: 'PENDING' }),
        after: JSON.stringify({ status: 'APPROVED', at: new Date().toISOString() }),
        ipAddress: `192.168.1.${100 + i}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createdAt: new Date(Date.now() - i * 3 * 3600000),
      },
    })
  }

  console.log('✅ Seed complete!')
  console.log(`   Institutions: 5 | Programs: 2 | Users: 40 | Projects: 25`)
  console.log(`   Logbook entries: ~150 | Evaluations: 20 | Equipment: 15`)
  console.log(`   AI chat logs: 60 | Notifications: 50 | Audit logs: 30`)
  console.log(`   Rubrics: 3 | Milestones: ~125 | Documents: ~55`)
  console.log('')
  console.log('🔐 Demo login credentials (password for all): Portal@2026')
  console.log('   Student:    pelajar1@jtm.gov.my')
  console.log('   Supervisor: nurul.huda@jtm.gov.my')
  console.log('   Panel:      panel1@jtm.gov.my')
  console.log('   Inst Admin: admin.bangi@jtm.gov.my')
  console.log('   JTM Admin:  admin.jtm@jtm.gov.my')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
