'use client'

import { useEffect, useState } from 'react'
import { useAuth, api } from '@/lib/store'
import { GlassCard, GlassSection, StatCard, StatusBadge, FieldBadge, EmptyState, GradientButton, ProgressRing } from '@/components/glass-ui'
import { ROLE_LABELS, STATUS_LABELS, formatDate, timeAgo } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Loader2, FolderKanban, ClipboardList, CalendarClock, Award, BookOpen,
  Sparkles, Bell, FileText, TrendingUp, Users, Building2, ShieldCheck,
  CheckCircle2, AlertTriangle, ArrowRight, Activity, Bot, Layers,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import type { ViewId } from '@/components/app-shell'

const CHART_COLORS = ['#6366f1', '#14b8a6', '#0ea5e9', '#f59e0b', '#f43f5e', '#a855f7']

interface Milestone { id: string; name: string; stage: string; dueDate: string; status: string; project?: { title: string } }
interface Notif { id: string; title: string; message: string; type: string; createdAt: string; isRead: boolean }
interface Project { id: string; title: string; field: string; status: string; student?: { user: { fullName: string } }; supervisor?: { user: { fullName: string } }; _count?: { documents: number; logbookEntries: number; evaluations: number }; similarityScore?: number }

export function DashboardView({ onNavigate }: { onNavigate: (v: ViewId) => void }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [notifs, setNotifs] = useState<Notif[]>([])

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      setLoading(true)
      const statsType = user.role === 'STUDENT' ? 'student-stats'
        : user.role === 'SUPERVISOR' ? 'supervisor-stats'
        : user.role === 'PANEL' ? 'supervisor-stats' // panel shares similar view
        : user.role === 'INSTITUTION_ADMIN' ? 'institution-stats'
        : 'jtm-stats'
      const [s, p, n] = await Promise.all([
        api(`/api/analytics?type=${statsType}`),
        api<Project[]>('/api/projects?limit=10'),
        api<Notif[]>('/api/notifications?limit=5'),
      ])
      if (!active) return
      if (s.success) setStats(s.data)
      if (p.success) setProjects(p.data || [])
      if (n.success) setNotifs(n.data || [])
      setLoading(false)
    })()
    return () => { active = false }
  }, [user])

  if (!user) return null
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <GlassCard className="animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400">Selamat datang kembali,</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{user.fullName}</h1>
            <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
              {ROLE_LABELS[user.role]}
              {user.institution && <> • {user.institution.name}</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <GradientButton onClick={() => onNavigate('projects')}>
              <FolderKanban className="h-4 w-4" /> Lihat Projek
            </GradientButton>
            <GradientButton onClick={() => onNavigate('notifications')}>
              <Bell className="h-4 w-4" /> Notifikasi
            </GradientButton>
          </div>
        </div>
      </GlassCard>

      {user.role === 'STUDENT' && <StudentDashboard stats={stats} projects={projects} notifs={notifs} onNavigate={onNavigate} />}
      {user.role === 'SUPERVISOR' && <SupervisorDashboard stats={stats} projects={projects} onNavigate={onNavigate} />}
      {user.role === 'PANEL' && <PanelDashboard projects={projects} onNavigate={onNavigate} />}
      {user.role === 'INSTITUTION_ADMIN' && <InstitutionDashboard stats={stats} onNavigate={onNavigate} />}
      {user.role === 'JTM_ADMIN' && <JtmDashboard stats={stats} onNavigate={onNavigate} />}
      {user.role === 'DEVOPS' && <InstitutionDashboard stats={stats} onNavigate={onNavigate} />}
    </div>
  )
}

/* ============================ STUDENT ============================ */
function StudentDashboard({ stats, projects, notifs, onNavigate }: { stats: any; projects: Project[]; notifs: Notif[]; onNavigate: (v: ViewId) => void }) {
  const upcoming: Milestone[] = stats?.upcomingMilestones || []
  const pending = stats?.pendingActions || {}
  const totalProjects = stats?.totalProjects || 0
  const currentProject = projects.find((p) => ['APPROVED', 'IN_PROGRESS', 'UNDER_REVIEW', 'SUBMITTED'].includes(p.status))

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Jumlah Projek" value={totalProjects} icon={<FolderKanban className="h-6 w-6 text-indigo-300" />} gradient="from-indigo-500/40 to-purple-500/40" onClick={() => onNavigate('projects')} />
        <StatCard label="Tindakan Menunggu" value={(pending.pendingLogbooks || 0) + (pending.pendingDocuments || 0) + (pending.pendingApprovals || 0)} icon={<ClipboardList className="h-6 w-6 text-amber-300" />} gradient="from-amber-500/40 to-orange-500/40" hint={`${pending.pendingLogbooks || 0} logbook • ${pending.pendingDocuments || 0} dokumen`} />
        <StatCard label="Milestone Hadapan" value={upcoming.length} icon={<CalendarClock className="h-6 w-6 text-sky-300" />} gradient="from-sky-500/40 to-cyan-500/40" onClick={() => onNavigate('milestones')} />
        <StatCard label="Notifikasi" value={notifs.filter((n) => !n.isRead).length} icon={<Bell className="h-6 w-6 text-teal-300" />} gradient="from-teal-500/40 to-emerald-500/40" onClick={() => onNavigate('notifications')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassSection title="Projek Semasa" subtitle="Status projek aktif anda" icon={<FolderKanban className="h-5 w-5 text-indigo-300" />}
            action={<GradientButton onClick={() => onNavigate('projects')}><ArrowRight className="h-3.5 w-3.5" /></GradientButton>}>
            {currentProject ? (
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <ProgressRing value={computeProgress(currentProject)} size={88} label="kemajuan" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-white truncate">{currentProject.title}</h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <FieldBadge field={currentProject.field} />
                    <StatusBadge status={currentProject.status} label={STATUS_LABELS[currentProject.status]} />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Penyelia: {currentProject.supervisor?.user?.fullName || '-'}
                  </p>
                </div>
              </div>
            ) : (
              <EmptyState icon={<FolderKanban className="h-6 w-6 text-slate-400" />} title="Tiada projek aktif" description="Cipta cadangan projek pertama anda untuk bermula."
                action={<GradientButton onClick={() => onNavigate('projects')}><FolderKanban className="h-4 w-4" /> Cipta Projek</GradientButton>} />
            )}
          </GlassSection>

          <GlassSection title="Milestone Hadapan" subtitle="3 milestone terdekat dalam 30 hari" icon={<CalendarClock className="h-5 w-5 text-sky-300" />}
            action={<GradientButton onClick={() => onNavigate('milestones')}><ArrowRight className="h-3.5 w-3.5" /></GradientButton>}>
            {upcoming.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="h-6 w-6 text-emerald-400" />} title="Tiada milestone terdekat" description="Semua milestone diselesaikan atau tiada dalam 30 hari." />
            ) : (
              <div className="space-y-2">
                {upcoming.slice(0, 3).map((m) => {
                  const days = daysUntil(m.dueDate)
                  return (
                    <div key={m.id} className="flex items-center gap-3 glass rounded-lg p-3">
                      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0', days < 3 ? 'bg-rose-500/30' : 'bg-sky-500/20')}>
                        <CalendarClock className={cn('h-4 w-4', days < 3 ? 'text-rose-300' : 'text-sky-300')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{m.name}</p>
                        <p className="text-[11px] text-slate-400">{m.project?.title || 'Projek'} • {formatDate(m.dueDate)}</p>
                      </div>
                      <span className={cn('text-[11px] font-semibold px-2 py-1 rounded-full', days < 3 ? 'bg-rose-500/30 text-rose-200' : 'bg-white/10 text-slate-200')}>
                        {days} hari
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </GlassSection>
        </div>

        <div className="space-y-6">
          <GlassSection title="Tindakan Menunggu" subtitle="Perlu tindakan segera" icon={<ClipboardList className="h-5 w-5 text-amber-300" />}>
            <div className="space-y-2">
              <PendingRow label="Logbook menunggu sah" count={pending.pendingLogbooks || 0} icon={<BookOpen className="h-4 w-4" />} onClick={() => onNavigate('logbook')} />
              <PendingRow label="Dokumen dalam semakan" count={pending.pendingDocuments || 0} icon={<FileText className="h-4 w-4" />} onClick={() => onNavigate('documents')} />
              <PendingRow label="Cadangan menunggu lulus" count={pending.pendingApprovals || 0} icon={<ClipboardList className="h-4 w-4" />} onClick={() => onNavigate('projects')} />
            </div>
          </GlassSection>

          <GlassSection title="Notifikasi Terkini" icon={<Bell className="h-5 w-5 text-teal-300" />}
            action={<GradientButton onClick={() => onNavigate('notifications')}><ArrowRight className="h-3.5 w-3.5" /></GradientButton>}>
            {notifs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Tiada notifikasi</p>
            ) : (
              <div className="space-y-2">
                {notifs.slice(0, 4).map((n) => (
                  <div key={n.id} className="glass rounded-lg p-2.5">
                    <p className="text-xs font-medium text-white truncate">{n.title}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{n.message}</p>
                    <p className="text-[9px] text-slate-500 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </GlassSection>

          <GlassSection title="Pembantu AI" subtitle="Tanya soalan teknikal" icon={<Sparkles className="h-5 w-5 text-amber-300" />}>
            <p className="text-xs text-slate-300 mb-3">Pembantu AI tersedia di sudut kanan bawah. Klik butang untuk membuka.</p>
            <GradientButton onClick={() => onNavigate('ai-history')}><Bot className="h-4 w-4" /> Lihat Sejarah</GradientButton>
          </GlassSection>
        </div>
      </div>
    </>
  )
}

/* ============================ SUPERVISOR ============================ */
function SupervisorDashboard({ stats, projects, onNavigate }: { stats: any; projects: Project[]; onNavigate: (v: ViewId) => void }) {
  const projectsByStatus = stats?.projectsByStatus || {}
  const pending = stats?.pendingReviews || {}
  const avgScores = stats?.averageScores || {}
  const chartData = Object.entries(projectsByStatus).map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v as number, key: k }))

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pelajar Seliaan" value={stats?.studentsCount || 0} icon={<Users className="h-6 w-6 text-indigo-300" />} gradient="from-indigo-500/40 to-purple-500/40" />
        <StatCard label="Semakan Menunggu" value={(pending.pendingLogbooks || 0) + (pending.pendingDocuments || 0) + (pending.pendingProposals || 0)} icon={<ClipboardList className="h-6 w-6 text-amber-300" />} gradient="from-amber-500/40 to-orange-500/40" hint={`${pending.pendingProposals || 0} cadangan • ${pending.pendingLogbooks || 0} logbook`} />
        <StatCard label="Jumlah Projek" value={stats?.totalProjects || 0} icon={<FolderKanban className="h-6 w-6 text-sky-300" />} gradient="from-sky-500/40 to-cyan-500/40" />
        <StatCard label="Projek Selesai" value={projectsByStatus['COMPLETED'] || 0} icon={<CheckCircle2 className="h-6 w-6 text-teal-300" />} gradient="from-teal-500/40 to-emerald-500/40" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassSection title="Projek Seliaan" subtitle="Senarai projek pelajar bawah seliaan" icon={<FolderKanban className="h-5 w-5 text-indigo-300" />}
            action={<GradientButton onClick={() => onNavigate('projects')}><ArrowRight className="h-3.5 w-3.5" /></GradientButton>}>
            {projects.length === 0 ? (
              <EmptyState icon={<FolderKanban className="h-6 w-6 text-slate-400" />} title="Tiada projek seliaan" />
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {projects.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 glass rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {p.student?.user?.fullName || '-'} • {p._count?.logbookEntries || 0} log • {p._count?.documents || 0} dok
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <FieldBadge field={p.field} />
                      <StatusBadge status={p.status} label={STATUS_LABELS[p.status]} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassSection>

          <GlassSection title="Taburan Status Projek" subtitle="Pecahan status semua projek seliaan" icon={<Activity className="h-5 w-5 text-teal-300" />}>
            {chartData.length === 0 ? (
              <EmptyState icon={<TrendingUp className="h-6 w-6 text-slate-400" />} title="Tiada data" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                    <YAxis tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: '#fff' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassSection>
        </div>

        <div className="space-y-6">
          <GlassSection title="Semakan Menunggu" icon={<ClipboardList className="h-5 w-5 text-amber-300" />}>
            <div className="space-y-2">
              <PendingRow label="Logbook menunggu sah" count={pending.pendingLogbooks || 0} icon={<BookOpen className="h-4 w-4" />} onClick={() => onNavigate('logbook')} />
              <PendingRow label="Dokumen dalam semakan" count={pending.pendingDocuments || 0} icon={<FileText className="h-4 w-4" />} onClick={() => onNavigate('documents')} />
              <PendingRow label="Cadangan menunggu lulus" count={pending.pendingProposals || 0} icon={<ClipboardList className="h-4 w-4" />} onClick={() => onNavigate('projects')} />
            </div>
          </GlassSection>

          <GlassSection title="Purata Skor" subtitle="Mengikut jenis penilaian" icon={<Award className="h-5 w-5 text-emerald-300" />}>
            {Object.keys(avgScores).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Tiada penilaian</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(avgScores).map(([k, v]) => (
                  <div key={k} className="glass rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 capitalize">{k.replace('_', ' ')}</span>
                      <span className="text-sm font-bold text-white">{v as number}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassSection>
        </div>
      </div>
    </>
  )
}

/* ============================ PANEL ============================ */
function PanelDashboard({ projects, onNavigate }: { projects: Project[]; onNavigate: (v: ViewId) => void }) {
  const approved = projects.filter((p) => p.status === 'APPROVED')
  const completed = projects.filter((p) => p.status === 'COMPLETED')
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Projek Menunggu Viva" value={approved.length} icon={<ClipboardList className="h-6 w-6 text-amber-300" />} gradient="from-amber-500/40 to-orange-500/40" />
        <StatCard label="Penilaian Selesai" value={completed.length} icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />} gradient="from-teal-500/40 to-emerald-500/40" />
        <StatCard label="Jumlah Diperuntukkan" value={projects.length} icon={<FolderKanban className="h-6 w-6 text-indigo-300" />} gradient="from-indigo-500/40 to-purple-500/40" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassSection title="Projek Menunggu Viva" subtitle="Untuk penilaian panel" icon={<ClipboardList className="h-5 w-5 text-amber-300" />}
          action={<GradientButton onClick={() => onNavigate('evaluations')}><ArrowRight className="h-3.5 w-3.5" /></GradientButton>}>
          {approved.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-6 w-6 text-emerald-400" />} title="Tiada viva menunggu" />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {approved.map((p) => (
                <div key={p.id} className="glass rounded-lg p-3">
                  <p className="text-sm font-medium text-white truncate">{p.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{p.student?.user?.fullName || '-'}</p>
                  <div className="mt-1.5"><FieldBadge field={p.field} /></div>
                </div>
              ))}
            </div>
          )}
        </GlassSection>
        <GlassSection title="Viva Akan Datang" subtitle="Jadual viva anda" icon={<CalendarClock className="h-5 w-5 text-sky-300" />}
          action={<GradientButton onClick={() => onNavigate('milestones')}><ArrowRight className="h-3.5 w-3.5" /></GradientButton>}>
          <EmptyState icon={<CalendarClock className="h-6 w-6 text-slate-400" />} title="Lihat jadual viva di modul milestone" />
        </GlassSection>
      </div>
    </>
  )
}

/* ============================ INSTITUTION ADMIN ============================ */
function InstitutionDashboard({ stats, onNavigate }: { stats: any; onNavigate: (v: ViewId) => void }) {
  const byField = stats?.projectsByField || {}
  const byStatus = stats?.projectsByStatus || {}
  const fieldChart = Object.entries(byField).map(([k, v]) => ({ name: k, value: v as number }))
  const statusChart = Object.entries(byStatus).map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v as number }))

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pelajar" value={stats?.totalStudents || 0} icon={<Users className="h-6 w-6 text-indigo-300" />} gradient="from-indigo-500/40 to-purple-500/40" onClick={() => onNavigate('users')} />
        <StatCard label="Penyelia" value={stats?.totalSupervisors || 0} icon={<ShieldCheck className="h-6 w-6 text-teal-300" />} gradient="from-teal-500/40 to-emerald-500/40" onClick={() => onNavigate('users')} />
        <StatCard label="Projek Aktif" value={stats?.totalProjects || 0} icon={<FolderKanban className="h-6 w-6 text-sky-300" />} gradient="from-sky-500/40 to-cyan-500/40" onClick={() => onNavigate('projects')} />
        <StatCard label="Kadar Penyiapan" value={`${stats?.completionRate || 0}%`} icon={<TrendingUp className="h-6 w-6 text-amber-300" />} gradient="from-amber-500/40 to-orange-500/40" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassSection title="Projek Mengikut Bidang" icon={<Layers className="h-5 w-5 text-indigo-300" />}>
          {fieldChart.length === 0 ? (
            <EmptyState icon={<FolderKanban className="h-6 w-6 text-slate-400" />} title="Tiada data" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={fieldChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                    {fieldChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassSection>

        <GlassSection title="Projek Mengikut Status" icon={<Activity className="h-5 w-5 text-teal-300" />}>
          {statusChart.length === 0 ? (
            <EmptyState icon={<Activity className="h-6 w-6 text-slate-400" />} title="Tiada data" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChart} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 24 }}>
                  <XAxis type="number" tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: '#fff' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {statusChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassSection>
      </div>

      <GlassSection title="Tindakan Pantas" icon={<Sparkles className="h-5 w-5 text-amber-300" />}>
        <div className="flex flex-wrap gap-2">
          <GradientButton onClick={() => onNavigate('equipment')}><Building2 className="h-4 w-4" /> Inventori Makmal</GradientButton>
          <GradientButton onClick={() => onNavigate('users')}><Users className="h-4 w-4" /> Pengurusan Pengguna</GradientButton>
          <GradientButton onClick={() => onNavigate('audit-logs')}><ShieldCheck className="h-4 w-4" /> Jejak Audit</GradientButton>
          <GradientButton onClick={() => onNavigate('milestones')}><CalendarClock className="h-4 w-4" /> Milestone & Viva</GradientButton>
        </div>
      </GlassSection>
    </>
  )
}

/* ============================ JTM ADMIN ============================ */
function JtmDashboard({ stats, onNavigate }: { stats: any; onNavigate: (v: ViewId) => void }) {
  const byField = stats?.projectsByField || {}
  const byInstitution = stats?.projectsByInstitution || []
  const avgByInstitution = stats?.avgMarksByInstitution || []
  const fieldChart = Object.entries(byField).map(([k, v]) => ({ name: k, value: v as number }))

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Projek Aktif Kebangsaan" value={stats?.totalActive || 0} icon={<Activity className="h-6 w-6 text-indigo-300" />} gradient="from-indigo-500/40 to-purple-500/40" />
        <StatCard label="Kadar Penyiapan" value={`${stats?.completionRate || 0}%`} icon={<TrendingUp className="h-6 w-6 text-teal-300" />} gradient="from-teal-500/40 to-emerald-500/40" />
        <StatCard label="Projek Selesai" value={stats?.completed || 0} icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />} gradient="from-emerald-500/40 to-green-500/40" />
        <StatCard label="Penggunaan AI" value={stats?.aiUsageCount || 0} icon={<Bot className="h-6 w-6 text-amber-300" />} gradient="from-amber-500/40 to-orange-500/40" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassSection title="Projek Mengikut Bidang" subtitle="Pecahan kebangsaan" icon={<Layers className="h-5 w-5 text-indigo-300" />}>
          {fieldChart.length === 0 ? (
            <EmptyState icon={<Layers className="h-6 w-6 text-slate-400" />} title="Tiada data" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={fieldChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.name}: ${e.value}`}>
                    {fieldChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassSection>

        <GlassSection title="Institusi Teratas Mengikut Purata Markah" icon={<Award className="h-5 w-5 text-emerald-300" />}>
          {avgByInstitution.length === 0 ? (
            <EmptyState icon={<Award className="h-6 w-6 text-slate-400" />} title="Tiada data markah" />
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...avgByInstitution].sort((a: any, b: any) => b.avgScore - a.avgScore).slice(0, 5).map((inst: any, i: number) => (
                <div key={inst.institutionId} className="flex items-center gap-3 glass rounded-lg p-3">
                  <span className="text-sm font-bold text-amber-300">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{inst.name}</p>
                    <p className="text-[10px] text-slate-400">{inst.code} • {inst.count} penilaian</p>
                  </div>
                  <span className="text-base font-bold text-emerald-300">{inst.avgScore}</span>
                </div>
              ))}
            </div>
          )}
        </GlassSection>
      </div>

      <GlassSection title="Projek Mengikut Institusi" subtitle="Taburan kebangsaan" icon={<Building2 className="h-5 w-5 text-sky-300" />}
        action={<GradientButton onClick={() => onNavigate('analytics')}><ArrowRight className="h-3.5 w-3.5" /></GradientButton>}>
        {byInstitution.length === 0 ? (
          <EmptyState icon={<Building2 className="h-6 w-6 text-slate-400" />} title="Tiada data institusi" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-white/10">
                  <th className="py-2 pr-4">Institusi</th>
                  <th className="py-2 pr-4">Kod</th>
                  <th className="py-2 text-right">Jumlah Projek</th>
                </tr>
              </thead>
              <tbody>
                {byInstitution.map((inst: any) => (
                  <tr key={inst.institutionId} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-white">{inst.name || 'Tidak diketahui'}</td>
                    <td className="py-2 pr-4 text-slate-300">{inst.code || '-'}</td>
                    <td className="py-2 text-right font-semibold text-white">{inst.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassSection>
    </>
  )
}

/* ============================ helpers ============================ */
function PendingRow({ label, count, icon, onClick }: { label: string; count: number; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={count === 0} className={cn('w-full flex items-center gap-3 glass rounded-lg p-3 text-left transition', count > 0 ? 'hover:bg-white/10 cursor-pointer' : 'opacity-60 cursor-default')}>
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0', count > 0 ? 'bg-amber-500/30' : 'bg-white/10')}>
        {icon}
      </div>
      <span className="flex-1 text-sm text-slate-200">{label}</span>
      <span className={cn('text-sm font-bold', count > 0 ? 'text-amber-300' : 'text-slate-400')}>{count}</span>
    </button>
  )
}

function computeProgress(p: Project): number {
  if (!p._count) return 0
  // Approximate progress by logbook count
  const logs = p._count.logbookEntries || 0
  return Math.min(100, Math.round((logs / 14) * 100))
}

function daysUntil(date: string): number {
  const diff = new Date(date).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}
